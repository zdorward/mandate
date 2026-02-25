# Mandate Page Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace weights/non-negotiables/risk-tolerance with a ranked list of outcomes that users can drag to reorder.

**Architecture:** Add `outcomes` field to MandateVersion, update UI with drag-and-drop using @dnd-kit, simplify AI prompt to use ranked outcomes instead of numeric weights.

**Tech Stack:** Next.js, @dnd-kit/core + @dnd-kit/sortable, Prisma, Zod

---

## Task 1: Add dnd-kit Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install dnd-kit**

```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Step 2: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat: add dnd-kit for drag-and-drop"
```

---

## Task 2: Update Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add outcomes field to MandateVersion**

In `prisma/schema.prisma`, update the MandateVersion model:

```prisma
model MandateVersion {
  id             String       @id @default(cuid())
  mandateId      String
  mandate        Mandate      @relation(fields: [mandateId], references: [id])
  version        Int
  weights        String?      // JSON string (deprecated, nullable for new versions)
  riskTolerance  String?      // CONSERVATIVE | MODERATE | AGGRESSIVE (deprecated)
  nonNegotiables String?      // JSON string array (deprecated)
  outcomes       String?      // JSON string array - ranked list of outcomes
  createdAt      DateTime     @default(now())
  checksum       String
  isActive       Boolean      @default(false)
  evaluations    Evaluation[]

  @@unique([mandateId, version])
}
```

**Step 2: Run migration**

```bash
pnpm prisma migrate dev --name add-outcomes-field
```

**Step 3: Commit**

```bash
git add prisma/
git commit -m "feat: add outcomes field to MandateVersion schema"
```

---

## Task 3: Update Zod Schemas

**Files:**
- Modify: `lib/ai/schemas.ts`

**Step 1: Add outcomes schema**

Add to `lib/ai/schemas.ts`:

```typescript
export const OutcomesSchema = z.array(z.string().min(1).max(200)).min(1).max(10)
export type Outcomes = z.infer<typeof OutcomesSchema>
```

**Step 2: Commit**

```bash
git add lib/ai/schemas.ts
git commit -m "feat: add Outcomes zod schema"
```

---

## Task 4: Update Mandate API

**Files:**
- Modify: `app/api/mandate/route.ts`

**Step 1: Update POST handler to accept outcomes**

Replace the CreateMandateVersionSchema and POST handler:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { computeChecksum } from '@/lib/utils/checksum'
import { OutcomesSchema } from '@/lib/ai/schemas'
import { z } from 'zod'

const CreateMandateVersionSchema = z.object({
  mandateId: z.string(),
  outcomes: OutcomesSchema,
})

export async function GET() {
  const mandates = await db.mandate.findMany({
    include: {
      versions: {
        orderBy: { version: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(mandates)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = CreateMandateVersionSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  const { mandateId, outcomes } = parsed.data

  // Get next version number
  const lastVersion = await db.mandateVersion.findFirst({
    where: { mandateId },
    orderBy: { version: 'desc' },
  })

  const nextVersion = (lastVersion?.version || 0) + 1

  const versionData = { outcomes }

  // Deactivate current active version
  await db.mandateVersion.updateMany({
    where: { mandateId, isActive: true },
    data: { isActive: false },
  })

  const newVersion = await db.mandateVersion.create({
    data: {
      mandateId,
      version: nextVersion,
      outcomes: JSON.stringify(outcomes),
      checksum: computeChecksum(versionData),
      isActive: true, // New version is immediately active
    },
  })

  await db.auditLog.create({
    data: {
      actor: 'system',
      action: 'CREATE',
      entityType: 'MandateVersion',
      entityId: newVersion.id,
      after: JSON.stringify(versionData),
    },
  })

  return NextResponse.json(newVersion)
}

export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { versionId, activate } = body

  if (activate) {
    const version = await db.mandateVersion.findUnique({
      where: { id: versionId },
    })

    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    }

    await db.mandateVersion.updateMany({
      where: { mandateId: version.mandateId },
      data: { isActive: false },
    })

    await db.mandateVersion.update({
      where: { id: versionId },
      data: { isActive: true },
    })

    await db.auditLog.create({
      data: {
        actor: 'system',
        action: 'ACTIVATE',
        entityType: 'MandateVersion',
        entityId: versionId,
      },
    })

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid operation' }, { status: 400 })
}
```

**Step 2: Commit**

```bash
git add app/api/mandate/route.ts
git commit -m "feat: update mandate API for outcomes"
```

---

## Task 5: Rewrite Mandate Page UI

**Files:**
- Modify: `app/mandate/page.tsx`

**Step 1: Rewrite with drag-and-drop outcomes list**

Replace entire file with:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface MandateVersion {
  id: string
  version: number
  outcomes: string | null
  weights: string | null
  isActive: boolean
  createdAt: string
}

interface Mandate {
  id: string
  name: string
  versions: MandateVersion[]
}

function SortableOutcome({
  id,
  outcome,
  index,
  onDelete,
}: {
  id: string
  outcome: string
  index: number
  onDelete: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-4 bg-white border border-border rounded-xl group"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </button>
      <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-white text-xs font-bold">
        {index + 1}
      </span>
      <span className="flex-1">{outcome}</span>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export default function MandatePage() {
  const [mandate, setMandate] = useState<Mandate | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [outcomes, setOutcomes] = useState<string[]>([])
  const [savedOutcomes, setSavedOutcomes] = useState<string[]>([])
  const [newOutcome, setNewOutcome] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchMandate()
  }, [])

  async function fetchMandate() {
    const res = await fetch('/api/mandate')
    const data = await res.json()
    const m = data[0]
    setMandate(m)

    if (m) {
      const activeVersion = m.versions.find((v: MandateVersion) => v.isActive)
      if (activeVersion?.outcomes) {
        const parsed = JSON.parse(activeVersion.outcomes)
        setOutcomes(parsed)
        setSavedOutcomes(parsed)
      }
    }
    setLoading(false)
  }

  async function saveVersion() {
    if (!mandate || outcomes.length === 0) return

    setSaving(true)
    await fetch('/api/mandate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mandateId: mandate.id,
        outcomes,
      }),
    })
    setSavedOutcomes([...outcomes])
    await fetchMandate()
    setSaving(false)
  }

  async function restoreVersion(versionId: string) {
    await fetch('/api/mandate', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ versionId, activate: true }),
    })
    await fetchMandate()
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = outcomes.indexOf(active.id as string)
      const newIndex = outcomes.indexOf(over.id as string)
      setOutcomes(arrayMove(outcomes, oldIndex, newIndex))
    }
  }

  function addOutcome() {
    if (newOutcome.trim()) {
      setOutcomes([...outcomes, newOutcome.trim()])
      setNewOutcome('')
      setIsAdding(false)
    }
  }

  function deleteOutcome(index: number) {
    setOutcomes(outcomes.filter((_, i) => i !== index))
  }

  const hasChanges = JSON.stringify(outcomes) !== JSON.stringify(savedOutcomes)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="pt-4">
        <h1 className="text-4xl font-bold tracking-tight">Mandate</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Define the outcomes you want. AI will evaluate proposals against these priorities.
        </p>
      </div>

      <Card className="bg-white border-border">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-muted-foreground">
            YOUR PRIORITIES
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {outcomes.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={outcomes} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {outcomes.map((outcome, index) => (
                    <SortableOutcome
                      key={outcome}
                      id={outcome}
                      outcome={outcome}
                      index={index}
                      onDelete={() => deleteOutcome(index)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No outcomes defined yet. Add your first priority.
            </div>
          )}

          {isAdding ? (
            <div className="p-4 bg-secondary rounded-xl space-y-3">
              <input
                type="text"
                className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="What outcome do you want?"
                value={newOutcome}
                onChange={(e) => setNewOutcome(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addOutcome()}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAdding(false)
                    setNewOutcome('')
                  }}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onClick={addOutcome}
                  disabled={!newOutcome.trim()}
                  className="bg-foreground hover:bg-foreground/90 text-background cursor-pointer"
                >
                  Add
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => setIsAdding(true)}
              className="w-full cursor-pointer"
            >
              + Add Outcome
            </Button>
          )}

          {hasChanges && (
            <Button
              onClick={saveVersion}
              disabled={saving || outcomes.length === 0}
              className="w-full bg-foreground hover:bg-foreground/90 text-background cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save as New Version'}
            </Button>
          )}
        </CardContent>
      </Card>

      <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
        <Card className="bg-white border-border">
          <CollapsibleTrigger className="w-full cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">
                Version History ({mandate?.versions.length || 0} versions)
              </CardTitle>
              <svg
                className={`h-5 w-5 text-muted-foreground transition-transform ${historyOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-3 pt-0">
              {mandate?.versions.map((v) => {
                const vOutcomes = v.outcomes ? JSON.parse(v.outcomes) : []
                return (
                  <div
                    key={v.id}
                    className="flex items-center justify-between p-4 bg-secondary rounded-xl"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">v{v.version}</span>
                        {v.isActive && <Badge>Active</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {vOutcomes.length || '?'} outcomes • {new Date(v.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    {!v.isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => restoreVersion(v.id)}
                        className="cursor-pointer"
                      >
                        Restore
                      </Button>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add app/mandate/page.tsx
git commit -m "feat: rewrite mandate page with drag-and-drop outcomes"
```

---

## Task 6: Update AI Prompt

**Files:**
- Modify: `lib/ai/prompts.ts`

**Step 1: Update prompt to use outcomes**

Replace `lib/ai/prompts.ts`:

```typescript
export interface PromptContext {
  outcomes: string[]
  proposalTitle: string
  proposalSummary: string
  proposalScope: string
  proposalAssumptions: string[]
  proposalDependencies: string[]
}

export function buildRiskDiscoveryPrompt(ctx: PromptContext): string {
  const rankedOutcomes = ctx.outcomes
    .map((o, i) => `${i + 1}. ${o}`)
    .join('\n')

  return `You are a senior risk analyst. Analyze this business proposal for hidden risks.

## ORGANIZATIONAL PRIORITIES (in order of importance)
${rankedOutcomes}

## PROPOSAL
Title: ${ctx.proposalTitle}
Summary: ${ctx.proposalSummary}
Scope: ${ctx.proposalScope}
Assumptions: ${ctx.proposalAssumptions.join('; ') || 'None stated'}
Dependencies: ${ctx.proposalDependencies.join('; ') || 'None stated'}

## YOUR TASK
1. Identify risks across 5 categories. Be concrete and plausible.
2. Consider how this proposal aligns with or threatens the ranked priorities above.
3. Flag any conflicts with top priorities (1-3) as high severity.

Return ONLY valid JSON matching this structure:
{
  "implicit_assumptions": [{"risk": "...", "severity": "low|med|high", "evidence_needed": "..."}],
  "second_order_effects": [...],
  "tail_risks": [...],
  "metric_gaming_vectors": [...],
  "cross_functional_impacts": [...],
  "top_3_unseen_risks": ["...", "...", "..."],
  "data_to_collect_next": ["...", "..."],
  "alignment_summary": "Brief assessment of how proposal aligns with top priorities"
}

Constraints:
- Max 5 items per category
- Each field max 200 chars
- Be specific and actionable
- Focus on what could go wrong that isn't obvious
- Higher severity for risks that threaten top-ranked priorities`
}

export const RISK_DISCOVERY_PROMPT_VERSION = 2
```

**Step 2: Commit**

```bash
git add lib/ai/prompts.ts
git commit -m "feat: update AI prompt for outcome-based priorities"
```

---

## Task 7: Update Risk Discovery

**Files:**
- Modify: `lib/ai/riskDiscovery.ts`

**Step 1: Update interface and function**

Update the `discoverRisks` function to accept outcomes instead of weights:

```typescript
import { buildRiskDiscoveryPrompt, type PromptContext } from './prompts'
import { RiskDiscoverySchema, type RiskDiscoveryOutput } from './schemas'
import { getClient, getModel, isDemo } from './client'
import { extractAndValidateJson } from './jsonGuard'
import { getMockRisks } from './mock'

export interface ModelTrace {
  provider: string
  model: string
  latencyMs: number
  failures: Array<{ stage: string; error: string }>
}

export interface RiskDiscoveryInput {
  outcomes: string[]
  proposalTitle: string
  proposalSummary: string
  proposalScope: string
  proposalAssumptions: string[]
  proposalDependencies: string[]
}

export async function discoverRisks(input: RiskDiscoveryInput): Promise<{
  risks: RiskDiscoveryOutput
  trace: ModelTrace
}> {
  const startTime = Date.now()
  const failures: Array<{ stage: string; error: string }> = []

  if (isDemo()) {
    return {
      risks: getMockRisks(input.proposalTitle, input.proposalSummary),
      trace: {
        provider: 'mock',
        model: 'demo',
        latencyMs: Date.now() - startTime,
        failures: [],
      },
    }
  }

  const client = getClient()
  const model = getModel()

  const promptCtx: PromptContext = {
    outcomes: input.outcomes,
    proposalTitle: input.proposalTitle,
    proposalSummary: input.proposalSummary,
    proposalScope: input.proposalScope,
    proposalAssumptions: input.proposalAssumptions,
    proposalDependencies: input.proposalDependencies,
  }

  const prompt = buildRiskDiscoveryPrompt(promptCtx)

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    })

    const content = response.choices[0]?.message?.content || ''
    const risks = extractAndValidateJson(content, RiskDiscoverySchema)

    return {
      risks,
      trace: {
        provider: 'openai',
        model,
        latencyMs: Date.now() - startTime,
        failures,
      },
    }
  } catch (error) {
    failures.push({ stage: 'llm', error: String(error) })
    return {
      risks: getMockRisks(input.proposalTitle, input.proposalSummary),
      trace: {
        provider: 'openai',
        model,
        latencyMs: Date.now() - startTime,
        failures,
      },
    }
  }
}
```

**Step 2: Commit**

```bash
git add lib/ai/riskDiscovery.ts
git commit -m "feat: update risk discovery for outcomes"
```

---

## Task 8: Update Pipeline

**Files:**
- Modify: `lib/engine/pipeline.ts`

**Step 1: Simplify pipeline for outcomes**

```typescript
import { buildFeatures, type ProposalInput } from './featureBuilder'
import { discoverRisks, type ModelTrace } from '@/lib/ai/riskDiscovery'
import type { RiskDiscoveryOutput } from '@/lib/ai/schemas'

export interface EvaluationInput {
  mandate: {
    outcomes: string[]
  }
  proposal: {
    title: string
    summary: string
    scope: string
    assumptions: string[]
    dependencies: string[]
  }
}

export interface DecisionObject {
  summary: string
  outcomes: string[]
  unseen_risks: RiskDiscoveryOutput
  confidence: number
  confidence_reasons: string[]
  required_next_evidence: string[]
  recommendation: 'APPROVE' | 'REVISE' | 'ESCALATE'
  human_required: boolean
}

export interface EvaluationOutput {
  decisionObject: DecisionObject
  trace: ModelTrace
}

export async function evaluateProposal(input: EvaluationInput): Promise<EvaluationOutput> {
  const { mandate, proposal } = input

  // 1. Build features (deterministic)
  const features = buildFeatures(proposal)

  // 2. Risk discovery (LLM or mock)
  const { risks, trace } = await discoverRisks({
    outcomes: mandate.outcomes,
    proposalTitle: proposal.title,
    proposalSummary: proposal.summary,
    proposalScope: proposal.scope,
    proposalAssumptions: proposal.assumptions,
    proposalDependencies: proposal.dependencies,
  })

  // 3. Compute confidence based on proposal quality
  const { confidence, reasons: confidenceReasons } = computeSimpleConfidence(features, trace)

  // 4. Determine recommendation based on risks
  const { recommendation, humanRequired } = determineRecommendation(risks, confidence)

  // 5. Assemble decision object
  const summary = generateSummary(proposal.title, recommendation, risks)
  const requiredEvidence = risks.data_to_collect_next || []

  const decisionObject: DecisionObject = {
    summary,
    outcomes: mandate.outcomes,
    unseen_risks: risks,
    confidence,
    confidence_reasons: confidenceReasons,
    required_next_evidence: requiredEvidence,
    recommendation,
    human_required: humanRequired,
  }

  return { decisionObject, trace }
}

function computeSimpleConfidence(
  features: ReturnType<typeof buildFeatures>,
  trace: ModelTrace
): { confidence: number; reasons: string[] } {
  let confidence = 0.8
  const reasons: string[] = []

  if (features.missingFieldsCount > 0) {
    confidence -= features.missingFieldsCount * 0.1
    reasons.push(`Missing ${features.missingFieldsCount} proposal field(s)`)
  }

  if (features.assumptionCount === 0) {
    confidence -= 0.1
    reasons.push('No assumptions stated')
  }

  if (trace.failures.length > 0) {
    confidence -= 0.2
    reasons.push('AI analysis had failures')
  }

  if (reasons.length === 0) {
    reasons.push('Proposal well-formed')
  }

  return { confidence: Math.max(0.1, confidence), reasons }
}

function determineRecommendation(
  risks: RiskDiscoveryOutput,
  confidence: number
): { recommendation: 'APPROVE' | 'REVISE' | 'ESCALATE'; humanRequired: boolean } {
  const hasHighSeverityRisk = [
    ...(risks.tail_risks || []),
    ...(risks.implicit_assumptions || []),
    ...(risks.second_order_effects || []),
  ].some(r => r.severity === 'high')

  if (confidence < 0.4) {
    return { recommendation: 'ESCALATE', humanRequired: true }
  }

  if (hasHighSeverityRisk) {
    return { recommendation: 'ESCALATE', humanRequired: true }
  }

  if (confidence >= 0.7) {
    return { recommendation: 'APPROVE', humanRequired: false }
  }

  return { recommendation: 'REVISE', humanRequired: true }
}

function generateSummary(
  title: string,
  recommendation: string,
  risks: RiskDiscoveryOutput
): string {
  const action = recommendation === 'APPROVE' ? 'Proceed with' :
                 recommendation === 'REVISE' ? 'Revise' : 'Escalate'

  const riskCount = (risks.top_3_unseen_risks || []).length

  return `${action}: ${title}. ${riskCount} key risks identified.`.slice(0, 240)
}
```

**Step 2: Commit**

```bash
git add lib/engine/pipeline.ts
git commit -m "feat: simplify pipeline for outcomes-based evaluation"
```

---

## Task 9: Update Evaluations API

**Files:**
- Modify: `app/api/evaluations/route.ts`

**Step 1: Update to use outcomes**

Update the POST handler to read outcomes from mandate:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { evaluateProposal } from '@/lib/engine/pipeline'
import { z } from 'zod'

const CreateEvaluationSchema = z.object({
  proposalVersionId: z.string(),
})

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = CreateEvaluationSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  const { proposalVersionId } = parsed.data

  // Get active mandate version
  const mandateVersion = await db.mandateVersion.findFirst({
    where: { isActive: true },
  })

  if (!mandateVersion) {
    return NextResponse.json({ error: 'No active mandate' }, { status: 400 })
  }

  // Get proposal version
  const proposalVersion = await db.proposalVersion.findUnique({
    where: { id: proposalVersionId },
  })

  if (!proposalVersion) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
  }

  // Parse mandate outcomes (handle both old and new format)
  let outcomes: string[] = []
  if (mandateVersion.outcomes) {
    outcomes = JSON.parse(mandateVersion.outcomes)
  } else if (mandateVersion.weights) {
    // Backwards compatibility: convert old weights to outcomes
    const weights = JSON.parse(mandateVersion.weights)
    outcomes = Object.entries(weights)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .map(([key]) => `Prioritize ${key}`)
  }

  // Run evaluation
  const { decisionObject, trace } = await evaluateProposal({
    mandate: { outcomes },
    proposal: {
      title: proposalVersion.title,
      summary: proposalVersion.summary,
      scope: proposalVersion.scope,
      assumptions: JSON.parse(proposalVersion.assumptions),
      dependencies: JSON.parse(proposalVersion.dependencies),
    },
  })

  // Save evaluation
  const evaluation = await db.evaluation.create({
    data: {
      mandateVersionId: mandateVersion.id,
      proposalVersionId,
      decisionObject: JSON.stringify(decisionObject),
      inputsSnapshot: JSON.stringify({
        mandate: { outcomes },
        proposal: {
          title: proposalVersion.title,
          summary: proposalVersion.summary,
        },
      }),
      modelTrace: JSON.stringify(trace),
    },
  })

  await db.auditLog.create({
    data: {
      actor: 'system',
      action: 'EVALUATE',
      entityType: 'Evaluation',
      entityId: evaluation.id,
    },
  })

  return NextResponse.json({ evaluation, decisionObject })
}
```

**Step 2: Commit**

```bash
git add app/api/evaluations/route.ts
git commit -m "feat: update evaluations API for outcomes"
```

---

## Task 10: Update Evaluation Page

**Files:**
- Modify: `app/evaluations/[id]/page.tsx`

**Step 1: Update to show outcomes instead of impact estimate**

Find and replace the Impact Estimate card with an Outcomes card. Update the DecisionObject interface and remove references to `impact_estimate`, `tradeoff_score`, `conflicts`, `constraint_violations`. The updated page should show:

- Recommendation banner (keep as-is)
- Summary card (simplified)
- Outcomes (the priorities this was evaluated against)
- Top 3 Unseen Risks (keep as-is)
- Risk Analysis collapsibles (keep as-is)
- Required Evidence (keep as-is)
- Override form (keep as-is)
- Audit log (keep as-is)

This is a larger change - update the interface and remove the old weight-based sections.

**Step 2: Commit**

```bash
git add "app/evaluations/[id]/page.tsx"
git commit -m "feat: update evaluation page for outcomes"
```

---

## Task 11: Update Seed Data

**Files:**
- Modify: `prisma/seed.ts`

**Step 1: Update seed to use outcomes**

Update the mandate version creation to use outcomes instead of weights:

```typescript
import 'dotenv/config'
import { db as prisma } from '../lib/db'
import { computeChecksum } from '../lib/utils/checksum'

async function main() {
  // Clear existing data
  await prisma.auditLog.deleteMany()
  await prisma.overrideDecision.deleteMany()
  await prisma.evaluation.deleteMany()
  await prisma.proposalVersion.deleteMany()
  await prisma.proposal.deleteMany()
  await prisma.mandateVersion.deleteMany()
  await prisma.mandate.deleteMany()
  await prisma.promptVersion.deleteMany()

  // Create Mandate
  const mandate = await prisma.mandate.create({
    data: {
      name: 'Q1 2026 Strategic Mandate',
    },
  })

  // Create MandateVersion with outcomes
  const mandateV1Data = {
    outcomes: [
      'Increase revenue growth by 20%',
      'Expand into new markets',
      'Maintain customer satisfaction above 90%',
      'Keep operational costs flat',
    ],
  }

  await prisma.mandateVersion.create({
    data: {
      mandateId: mandate.id,
      version: 1,
      outcomes: JSON.stringify(mandateV1Data.outcomes),
      checksum: computeChecksum(mandateV1Data),
      isActive: true,
    },
  })

  // Create Proposals (keep the same)
  const proposal1 = await prisma.proposal.create({ data: {} })
  const p1v1Data = {
    title: 'APAC Market Expansion',
    summary: 'Expand operations to Singapore and Japan markets with phased rollout over 6 months.',
    assumptions: [
      'Local partners available for distribution',
      'Product localization can be completed in 3 months',
    ],
    scope: 'Phase 1: Singapore (Month 1-3), Phase 2: Japan (Month 4-6).',
    dependencies: ['Legal team for contracts', 'Product team for localization'],
  }

  await prisma.proposalVersion.create({
    data: {
      proposalId: proposal1.id,
      version: 1,
      title: p1v1Data.title,
      summary: p1v1Data.summary,
      assumptions: JSON.stringify(p1v1Data.assumptions),
      scope: p1v1Data.scope,
      dependencies: JSON.stringify(p1v1Data.dependencies),
      checksum: computeChecksum(p1v1Data),
    },
  })

  const proposal2 = await prisma.proposal.create({ data: {} })
  const p2v1Data = {
    title: 'Operational Efficiency Initiative',
    summary: 'Reduce operational costs by 20% through process automation.',
    assumptions: ['Automation tools can replace 30% of manual processes'],
    scope: 'Q1: Process audit, Q2: Automation implementation.',
    dependencies: ['IT for automation tools'],
  }

  await prisma.proposalVersion.create({
    data: {
      proposalId: proposal2.id,
      version: 1,
      title: p2v1Data.title,
      summary: p2v1Data.summary,
      assumptions: JSON.stringify(p2v1Data.assumptions),
      scope: p2v1Data.scope,
      dependencies: JSON.stringify(p2v1Data.dependencies),
      checksum: computeChecksum(p2v1Data),
    },
  })

  const proposal3 = await prisma.proposal.create({ data: {} })
  const p3v1Data = {
    title: 'Innovation Lab Setup',
    summary: 'Create an innovation lab to explore emerging technologies.',
    assumptions: [],
    scope: 'TBD',
    dependencies: [],
  }

  await prisma.proposalVersion.create({
    data: {
      proposalId: proposal3.id,
      version: 1,
      title: p3v1Data.title,
      summary: p3v1Data.summary,
      assumptions: JSON.stringify(p3v1Data.assumptions),
      scope: p3v1Data.scope,
      dependencies: JSON.stringify(p3v1Data.dependencies),
      checksum: computeChecksum(p3v1Data),
    },
  })

  // Create PromptVersion
  await prisma.promptVersion.create({
    data: {
      name: 'riskDiscovery',
      version: 2,
      template: 'Risk discovery prompt template v2 - outcomes based',
      checksum: computeChecksum({ name: 'riskDiscovery', version: 2 }),
    },
  })

  console.log('Seed completed successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

**Step 2: Run seed**

```bash
pnpm prisma db seed
```

**Step 3: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: update seed data for outcomes"
```

---

## Summary

**Total Tasks:** 11

1. Add dnd-kit dependencies
2. Update Prisma schema
3. Update Zod schemas
4. Update Mandate API
5. Rewrite Mandate page UI
6. Update AI prompt
7. Update Risk Discovery
8. Update Pipeline
9. Update Evaluations API
10. Update Evaluation page
11. Update Seed data

---

Plan complete and saved to `docs/plans/2026-02-25-mandate-page-implementation.md`.

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
