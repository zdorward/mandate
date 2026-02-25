# Mandate Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an AI-native decision governance system where AI owns risk discovery and humans retain accountability.

**Architecture:** Functional pipeline with pure functions for each evaluation step. Next.js App Router with Prisma/SQLite. OpenAI SDK with provider abstraction and demo mode.

**Tech Stack:** Next.js 14, TypeScript, Tailwind, shadcn/ui, Prisma, SQLite, Zod, OpenAI SDK

---

## Phase 1: Project Setup

### Task 1: Initialize Next.js Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts`

**Step 1: Create Next.js app with TypeScript and Tailwind**

Run:
```bash
cd /Users/zackdorward/dev/mandate
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-pnpm
```

Select: Yes to all defaults

**Step 2: Verify installation**

Run: `pnpm dev`
Expected: Server starts on localhost:3000

**Step 3: Stop server and commit**

```bash
git add -A
git commit -m "feat: initialize Next.js 14 project with TypeScript and Tailwind"
```

---

### Task 2: Add Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install core dependencies**

```bash
pnpm add prisma @prisma/client zod openai
pnpm add -D @types/node tsx
```

**Step 2: Install shadcn/ui**

```bash
pnpm dlx shadcn@latest init
```

Select: Default style, Slate base color, CSS variables: yes

**Step 3: Add shadcn components**

```bash
pnpm dlx shadcn@latest add button card input label textarea select badge tabs table dialog alert separator collapsible tooltip
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Prisma, Zod, OpenAI, and shadcn/ui dependencies"
```

---

### Task 3: Setup Prisma Schema

**Files:**
- Create: `prisma/schema.prisma`

**Step 1: Initialize Prisma**

```bash
pnpm prisma init --datasource-provider sqlite
```

**Step 2: Write schema**

Replace `prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Mandate {
  id        String           @id @default(cuid())
  name      String
  createdAt DateTime         @default(now())
  versions  MandateVersion[]
}

model MandateVersion {
  id             String       @id @default(cuid())
  mandateId      String
  mandate        Mandate      @relation(fields: [mandateId], references: [id])
  version        Int
  weights        String       // JSON string
  riskTolerance  String       // CONSERVATIVE | MODERATE | AGGRESSIVE
  nonNegotiables String       // JSON string array
  createdAt      DateTime     @default(now())
  checksum       String
  isActive       Boolean      @default(false)
  evaluations    Evaluation[]

  @@unique([mandateId, version])
}

model Proposal {
  id        String            @id @default(cuid())
  createdAt DateTime          @default(now())
  versions  ProposalVersion[]
}

model ProposalVersion {
  id           String       @id @default(cuid())
  proposalId   String
  proposal     Proposal     @relation(fields: [proposalId], references: [id])
  version      Int
  title        String
  summary      String
  assumptions  String       // JSON string array
  scope        String
  dependencies String       // JSON string array
  createdAt    DateTime     @default(now())
  checksum     String
  evaluations  Evaluation[]

  @@unique([proposalId, version])
}

model PromptVersion {
  id        String   @id @default(cuid())
  name      String
  version   Int
  template  String
  createdAt DateTime @default(now())
  checksum  String

  @@unique([name, version])
}

model Evaluation {
  id                String             @id @default(cuid())
  mandateVersionId  String
  mandateVersion    MandateVersion     @relation(fields: [mandateVersionId], references: [id])
  proposalVersionId String
  proposalVersion   ProposalVersion    @relation(fields: [proposalVersionId], references: [id])
  decisionObject    String             // JSON
  inputsSnapshot    String             // JSON
  modelTrace        String             // JSON
  createdAt         DateTime           @default(now())
  overrides         OverrideDecision[]
}

model OverrideDecision {
  id           String     @id @default(cuid())
  evaluationId String
  evaluation   Evaluation @relation(fields: [evaluationId], references: [id])
  actor        String
  decision     String     // APPROVE | REJECT | ESCALATE
  rationale    String
  createdAt    DateTime   @default(now())
}

model AuditLog {
  id         String   @id @default(cuid())
  actor      String
  action     String
  entityType String
  entityId   String
  before     String?  // JSON
  after      String?  // JSON
  rationale  String?
  createdAt  DateTime @default(now())

  @@index([entityType, entityId])
  @@index([createdAt])
}
```

**Step 3: Run migration**

```bash
pnpm prisma migrate dev --name init
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Prisma schema with all entities"
```

---

### Task 4: Create Database Client and Utils

**Files:**
- Create: `lib/db/index.ts`
- Create: `lib/utils/checksum.ts`

**Step 1: Create Prisma client**

Create `lib/db/index.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

**Step 2: Create checksum utility**

Create `lib/utils/checksum.ts`:

```typescript
import { createHash } from 'crypto'

export function computeChecksum(data: unknown): string {
  const normalized = JSON.stringify(data, Object.keys(data as object).sort())
  return createHash('sha256').update(normalized).digest('hex').slice(0, 16)
}
```

**Step 3: Commit**

```bash
git add lib/db/index.ts lib/utils/checksum.ts
git commit -m "feat: add database client and checksum utility"
```

---

## Phase 2: Core Engine

### Task 5: Zod Schemas

**Files:**
- Create: `lib/ai/schemas.ts`

**Step 1: Create schemas**

Create `lib/ai/schemas.ts`:

```typescript
import { z } from 'zod'

export const RiskItemSchema = z.object({
  risk: z.string().max(200),
  severity: z.enum(['low', 'med', 'high']),
  evidence_needed: z.string().max(200),
})

export const RiskDiscoverySchema = z.object({
  implicit_assumptions: z.array(RiskItemSchema).max(5).default([]),
  second_order_effects: z.array(RiskItemSchema).max(5).default([]),
  tail_risks: z.array(RiskItemSchema).max(5).default([]),
  metric_gaming_vectors: z.array(RiskItemSchema).max(5).default([]),
  cross_functional_impacts: z.array(RiskItemSchema).max(5).default([]),
  top_3_unseen_risks: z.array(z.string().max(200)).max(3).default([]),
  data_to_collect_next: z.array(z.string().max(200)).max(5).default([]),
})

export type RiskItem = z.infer<typeof RiskItemSchema>
export type RiskDiscoveryOutput = z.infer<typeof RiskDiscoverySchema>

export const ImpactEstimateSchema = z.object({
  growth: z.string(),
  cost: z.string(),
  risk: z.string(),
  brand: z.string(),
})

export const DecisionObjectSchema = z.object({
  summary: z.string().max(240),
  impact_estimate: ImpactEstimateSchema,
  tradeoff_score: z.number().min(0).max(1),
  conflicts: z.array(z.string()),
  constraint_violations: z.array(z.string()),
  unseen_risks: RiskDiscoverySchema,
  confidence: z.number().min(0).max(1),
  confidence_reasons: z.array(z.string()),
  required_next_evidence: z.array(z.string()),
  recommendation: z.enum(['APPROVE', 'REVISE', 'ESCALATE']),
  human_required: z.boolean(),
})

export type DecisionObject = z.infer<typeof DecisionObjectSchema>

export const WeightsSchema = z.object({
  growth: z.number().min(0).max(1),
  cost: z.number().min(0).max(1),
  risk: z.number().min(0).max(1),
  brand: z.number().min(0).max(1),
})

export type Weights = z.infer<typeof WeightsSchema>

export const RiskToleranceSchema = z.enum(['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE'])
export type RiskTolerance = z.infer<typeof RiskToleranceSchema>
```

**Step 2: Commit**

```bash
git add lib/ai/schemas.ts
git commit -m "feat: add Zod schemas for risk discovery and decision objects"
```

---

### Task 6: Feature Builder

**Files:**
- Create: `lib/engine/featureBuilder.ts`

**Step 1: Create feature builder**

Create `lib/engine/featureBuilder.ts`:

```typescript
export interface Features {
  missingFieldsCount: number
  complexityScore: number
  dependencyCount: number
  assumptionCount: number
  scopeLength: number
  hasAssumptions: boolean
  hasDependencies: boolean
}

export interface ProposalInput {
  title: string
  summary: string
  assumptions: string[]
  scope: string
  dependencies: string[]
}

export function buildFeatures(proposal: ProposalInput): Features {
  const assumptions = proposal.assumptions || []
  const dependencies = proposal.dependencies || []

  let missingFieldsCount = 0
  if (!proposal.title?.trim()) missingFieldsCount++
  if (!proposal.summary?.trim()) missingFieldsCount++
  if (!proposal.scope?.trim()) missingFieldsCount++
  if (assumptions.length === 0) missingFieldsCount++
  if (dependencies.length === 0) missingFieldsCount++

  const scopeLength = proposal.scope?.length || 0
  const complexityScore = Math.min(1, (
    (scopeLength / 500) * 0.4 +
    (dependencies.length / 5) * 0.3 +
    (assumptions.length / 5) * 0.3
  ))

  return {
    missingFieldsCount,
    complexityScore,
    dependencyCount: dependencies.length,
    assumptionCount: assumptions.length,
    scopeLength,
    hasAssumptions: assumptions.length > 0,
    hasDependencies: dependencies.length > 0,
  }
}
```

**Step 2: Commit**

```bash
git add lib/engine/featureBuilder.ts
git commit -m "feat: add feature builder for proposal analysis"
```

---

### Task 7: Deterministic Scorer

**Files:**
- Create: `lib/engine/deterministicScorer.ts`

**Step 1: Create scorer**

Create `lib/engine/deterministicScorer.ts`:

```typescript
import type { Features, ProposalInput } from './featureBuilder'
import type { Weights, RiskTolerance } from '@/lib/ai/schemas'

export interface ImpactEstimate {
  growth: string
  cost: string
  risk: string
  brand: string
}

export interface Scores {
  impactEstimate: ImpactEstimate
  tradeoffScore: number
  conflicts: string[]
  constraintViolations: string[]
}

export interface MandateInput {
  weights: Weights
  riskTolerance: RiskTolerance
  nonNegotiables: string[]
}

export function scoreProposal(
  mandate: MandateInput,
  proposal: ProposalInput,
  features: Features
): Scores {
  // Estimate impacts based on complexity and scope
  const impactEstimate = estimateImpact(proposal, features)

  // Calculate tradeoff score against mandate weights
  const tradeoffScore = calculateTradeoffScore(mandate.weights, impactEstimate, features)

  // Detect conflicts within the proposal
  const conflicts = detectConflicts(proposal, features)

  // Check non-negotiables
  const constraintViolations = checkConstraints(mandate.nonNegotiables, proposal)

  return {
    impactEstimate,
    tradeoffScore,
    conflicts,
    constraintViolations,
  }
}

function estimateImpact(proposal: ProposalInput, features: Features): ImpactEstimate {
  const summary = proposal.summary.toLowerCase()
  const scope = proposal.scope.toLowerCase()
  const text = `${summary} ${scope}`

  // Simple keyword-based estimation
  let growth = 'Neutral'
  if (text.includes('expand') || text.includes('growth') || text.includes('new market')) {
    growth = features.complexityScore > 0.5 ? 'High (+15-25%)' : 'Medium (+5-15%)'
  } else if (text.includes('optimize') || text.includes('improve')) {
    growth = 'Low (+2-5%)'
  }

  let cost = 'Unknown'
  const costMatch = text.match(/\$[\d,]+k?/i)
  if (costMatch) {
    cost = costMatch[0]
  } else if (features.complexityScore > 0.7) {
    cost = 'High (>$500k est.)'
  } else if (features.complexityScore > 0.4) {
    cost = 'Medium ($100-500k est.)'
  } else {
    cost = 'Low (<$100k est.)'
  }

  let risk = 'Medium'
  if (features.dependencyCount > 3 || features.complexityScore > 0.7) {
    risk = 'High'
  } else if (features.dependencyCount <= 1 && features.complexityScore < 0.3) {
    risk = 'Low'
  }

  let brand = 'Neutral'
  if (text.includes('customer') || text.includes('user experience') || text.includes('brand')) {
    brand = 'Positive'
  } else if (text.includes('cost cut') || text.includes('layoff') || text.includes('reduce')) {
    brand = 'Risk of negative'
  }

  return { growth, cost, risk, brand }
}

function calculateTradeoffScore(
  weights: Weights,
  impact: ImpactEstimate,
  features: Features
): number {
  // Convert impacts to scores (0-1)
  const growthScore = impact.growth.includes('High') ? 0.9 :
                      impact.growth.includes('Medium') ? 0.6 :
                      impact.growth.includes('Low') ? 0.3 : 0.5

  const costScore = impact.cost.includes('Low') ? 0.9 :
                    impact.cost.includes('Medium') ? 0.6 :
                    impact.cost.includes('High') ? 0.3 : 0.5

  const riskScore = impact.risk === 'Low' ? 0.9 :
                    impact.risk === 'Medium' ? 0.6 : 0.3

  const brandScore = impact.brand === 'Positive' ? 0.9 :
                     impact.brand === 'Neutral' ? 0.6 : 0.3

  // Weighted average
  const total = weights.growth + weights.cost + weights.risk + weights.brand
  if (total === 0) return 0.5

  const score = (
    (weights.growth * growthScore) +
    (weights.cost * costScore) +
    (weights.risk * riskScore) +
    (weights.brand * brandScore)
  ) / total

  // Penalize for missing fields
  const penalty = features.missingFieldsCount * 0.05

  return Math.max(0, Math.min(1, score - penalty))
}

function detectConflicts(proposal: ProposalInput, features: Features): string[] {
  const conflicts: string[] = []
  const text = `${proposal.summary} ${proposal.scope}`.toLowerCase()

  if (text.includes('reduce cost') && text.includes('expand')) {
    conflicts.push('Proposal aims to both reduce costs and expand - potential resource conflict')
  }

  if (text.includes('fast') && text.includes('thorough')) {
    conflicts.push('Speed and thoroughness goals may conflict')
  }

  if (features.dependencyCount > 3 && text.includes('quick')) {
    conflicts.push('Many dependencies may conflict with quick timeline')
  }

  return conflicts
}

function checkConstraints(nonNegotiables: string[], proposal: ProposalInput): string[] {
  const violations: string[] = []
  const text = `${proposal.title} ${proposal.summary} ${proposal.scope}`.toLowerCase()

  for (const constraint of nonNegotiables) {
    const constraintLower = constraint.toLowerCase()

    // Check for budget constraints
    if (constraintLower.includes('budget') || constraintLower.includes('$')) {
      const budgetMatch = constraintLower.match(/\$?([\d,]+)k?/i)
      if (budgetMatch) {
        const limit = parseInt(budgetMatch[1].replace(/,/g, ''))
        const proposalCostMatch = text.match(/\$?([\d,]+)k/i)
        if (proposalCostMatch) {
          const proposalCost = parseInt(proposalCostMatch[1].replace(/,/g, ''))
          if (proposalCost > limit) {
            violations.push(`Budget constraint violated: ${constraint}`)
          }
        }
      }
    }

    // Check for explicit mentions that violate constraints
    if (constraintLower.includes('no layoff') && text.includes('layoff')) {
      violations.push(`Constraint violated: ${constraint}`)
    }

    if (constraintLower.includes('data privacy') &&
        (text.includes('share data') || text.includes('third party'))) {
      violations.push(`Potential data privacy constraint violation: ${constraint}`)
    }
  }

  return violations
}
```

**Step 2: Commit**

```bash
git add lib/engine/deterministicScorer.ts
git commit -m "feat: add deterministic scorer for tradeoff analysis"
```

---

### Task 8: Escalation Policy

**Files:**
- Create: `lib/engine/escalationPolicy.ts`

**Step 1: Create escalation policy**

Create `lib/engine/escalationPolicy.ts`:

```typescript
import type { RiskTolerance, RiskDiscoveryOutput } from '@/lib/ai/schemas'
import type { Scores } from './deterministicScorer'

export interface EscalationResult {
  recommendation: 'APPROVE' | 'REVISE' | 'ESCALATE'
  humanRequired: boolean
  reasons: string[]
}

export function applyEscalation(
  riskTolerance: RiskTolerance,
  scores: Scores,
  risks: RiskDiscoveryOutput,
  confidence: number
): EscalationResult {
  const reasons: string[] = []

  // Always escalate if constraints violated
  if (scores.constraintViolations.length > 0) {
    reasons.push('Non-negotiable constraints violated')
    return { recommendation: 'ESCALATE', humanRequired: true, reasons }
  }

  // Always escalate if confidence too low
  if (confidence < 0.4) {
    reasons.push(`Confidence too low (${(confidence * 100).toFixed(0)}%)`)
    return { recommendation: 'ESCALATE', humanRequired: true, reasons }
  }

  // High-severity tail risks require escalation
  const hasCriticalTailRisk = risks.tail_risks?.some(r => r.severity === 'high')
  if (hasCriticalTailRisk) {
    reasons.push('High-severity tail risk identified')
    return { recommendation: 'ESCALATE', humanRequired: true, reasons }
  }

  // Count total high-severity risks
  const allRisks = [
    ...(risks.implicit_assumptions || []),
    ...(risks.second_order_effects || []),
    ...(risks.tail_risks || []),
    ...(risks.metric_gaming_vectors || []),
    ...(risks.cross_functional_impacts || []),
  ]
  const highSeverityCount = allRisks.filter(r => r.severity === 'high').length

  if (highSeverityCount >= 3) {
    reasons.push(`Multiple high-severity risks (${highSeverityCount})`)
    return { recommendation: 'ESCALATE', humanRequired: true, reasons }
  }

  // Recommend based on tradeoff score + risk tolerance
  if (scores.tradeoffScore >= 0.7) {
    if (riskTolerance === 'CONSERVATIVE') {
      reasons.push('Strong alignment but conservative risk tolerance requires review')
      return { recommendation: 'APPROVE', humanRequired: true, reasons }
    }
    reasons.push('Strong alignment with mandate')
    return { recommendation: 'APPROVE', humanRequired: false, reasons }
  }

  if (scores.tradeoffScore >= 0.5) {
    reasons.push('Moderate alignment - human review recommended')
    return { recommendation: 'APPROVE', humanRequired: true, reasons }
  }

  if (scores.tradeoffScore >= 0.3) {
    reasons.push('Weak alignment with mandate - revision recommended')
    return { recommendation: 'REVISE', humanRequired: false, reasons }
  }

  reasons.push('Poor alignment with mandate')
  return { recommendation: 'REVISE', humanRequired: true, reasons }
}
```

**Step 2: Commit**

```bash
git add lib/engine/escalationPolicy.ts
git commit -m "feat: add deterministic escalation policy"
```

---

### Task 9: AI Client and JSON Guard

**Files:**
- Create: `lib/ai/client.ts`
- Create: `lib/ai/jsonGuard.ts`

**Step 1: Create AI client**

Create `lib/ai/client.ts`:

```typescript
import OpenAI from 'openai'

export function isDemo(): boolean {
  return !process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'demo'
}

export function getClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'demo',
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  })
}

export function getModel(): string {
  return process.env.OPENAI_MODEL || 'gpt-4o'
}
```

**Step 2: Create JSON guard**

Create `lib/ai/jsonGuard.ts`:

```typescript
import { z } from 'zod'

export function extractAndValidateJson<T>(
  raw: string,
  schema: z.ZodSchema<T>
): T {
  // Try direct parse first
  let parsed: unknown

  try {
    parsed = JSON.parse(raw)
  } catch {
    // Try to extract from markdown code block
    const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      try {
        parsed = JSON.parse(codeBlockMatch[1].trim())
      } catch {
        throw new Error('Failed to parse JSON from code block')
      }
    } else {
      // Try to find JSON object in the text
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0])
        } catch {
          throw new Error('Failed to parse extracted JSON')
        }
      } else {
        throw new Error('No JSON found in response')
      }
    }
  }

  // Validate against schema
  const result = schema.safeParse(parsed)
  if (!result.success) {
    throw new Error(`Schema validation failed: ${result.error.message}`)
  }

  return result.data
}
```

**Step 3: Commit**

```bash
git add lib/ai/client.ts lib/ai/jsonGuard.ts
git commit -m "feat: add AI client wrapper and JSON guard"
```

---

### Task 10: Prompts and Mock Risks

**Files:**
- Create: `lib/ai/prompts.ts`
- Create: `lib/ai/mock.ts`

**Step 1: Create prompts**

Create `lib/ai/prompts.ts`:

```typescript
import type { Weights, RiskTolerance } from './schemas'

export interface PromptContext {
  mandateWeights: Weights
  riskTolerance: RiskTolerance
  nonNegotiables: string[]
  proposalTitle: string
  proposalSummary: string
  proposalScope: string
  proposalAssumptions: string[]
  proposalDependencies: string[]
}

export function buildRiskDiscoveryPrompt(ctx: PromptContext): string {
  return `You are a senior risk analyst. Analyze this business proposal for hidden risks.

## MANDATE CONTEXT
Priorities (weights): Growth=${ctx.mandateWeights.growth}, Cost=${ctx.mandateWeights.cost}, Risk=${ctx.mandateWeights.risk}, Brand=${ctx.mandateWeights.brand}
Risk Tolerance: ${ctx.riskTolerance}
Non-Negotiables: ${ctx.nonNegotiables.join(', ') || 'None specified'}

## PROPOSAL
Title: ${ctx.proposalTitle}
Summary: ${ctx.proposalSummary}
Scope: ${ctx.proposalScope}
Assumptions: ${ctx.proposalAssumptions.join('; ') || 'None stated'}
Dependencies: ${ctx.proposalDependencies.join('; ') || 'None stated'}

## YOUR TASK
Identify risks across 5 categories. Be concrete and plausible. No fluff.

Return ONLY valid JSON matching this structure:
{
  "implicit_assumptions": [{"risk": "...", "severity": "low|med|high", "evidence_needed": "..."}],
  "second_order_effects": [...],
  "tail_risks": [...],
  "metric_gaming_vectors": [...],
  "cross_functional_impacts": [...],
  "top_3_unseen_risks": ["...", "...", "..."],
  "data_to_collect_next": ["...", "..."]
}

Constraints:
- Max 5 items per category
- Each field max 200 chars
- Be specific and actionable
- Focus on what could go wrong that isn't obvious`
}

export const RISK_DISCOVERY_PROMPT_VERSION = 1
```

**Step 2: Create mock risks**

Create `lib/ai/mock.ts`:

```typescript
import type { RiskDiscoveryOutput } from './schemas'

export function getMockRisks(proposalTitle: string, proposalSummary: string): RiskDiscoveryOutput {
  const text = `${proposalTitle} ${proposalSummary}`.toLowerCase()

  // Return contextually relevant mock risks based on keywords
  if (text.includes('expansion') || text.includes('market') || text.includes('apac') || text.includes('region')) {
    return getExpansionRisks()
  }

  if (text.includes('cost') || text.includes('cut') || text.includes('reduce') || text.includes('efficiency')) {
    return getCostCuttingRisks()
  }

  if (text.includes('tech') || text.includes('infrastructure') || text.includes('platform')) {
    return getTechRisks()
  }

  return getGenericRisks()
}

function getExpansionRisks(): RiskDiscoveryOutput {
  return {
    implicit_assumptions: [
      { risk: 'Assumes local market dynamics mirror domestic patterns', severity: 'high', evidence_needed: 'Market research from target region' },
      { risk: 'Assumes existing supply chain can scale to new regions', severity: 'med', evidence_needed: 'Logistics feasibility study' },
    ],
    second_order_effects: [
      { risk: 'May trigger competitive response from regional incumbents', severity: 'high', evidence_needed: 'Competitive landscape analysis' },
      { risk: 'Could strain existing customer support capacity', severity: 'med', evidence_needed: 'Support ticket volume projections' },
    ],
    tail_risks: [
      { risk: 'Regulatory changes in target region could block market entry', severity: 'high', evidence_needed: 'Regulatory risk assessment' },
      { risk: 'Currency fluctuations could erode margins by 20%+', severity: 'med', evidence_needed: 'FX sensitivity analysis' },
    ],
    metric_gaming_vectors: [
      { risk: 'Teams may count soft launches as expansion wins', severity: 'low', evidence_needed: 'Clear success metric definitions' },
    ],
    cross_functional_impacts: [
      { risk: 'Legal team capacity for international contracts', severity: 'med', evidence_needed: 'Legal team capacity assessment' },
      { risk: 'HR may lack international hiring expertise', severity: 'med', evidence_needed: 'HR international readiness check' },
    ],
    top_3_unseen_risks: [
      'Regional competitors may respond with aggressive pricing war',
      'Supply chain partners may lack required regional certifications',
      'Cultural differences could affect product-market fit',
    ],
    data_to_collect_next: [
      'Validate partner certifications in target region',
      'Get treasury sign-off on FX exposure limits',
      'Survey existing customers about regional expansion interest',
    ],
  }
}

function getCostCuttingRisks(): RiskDiscoveryOutput {
  return {
    implicit_assumptions: [
      { risk: 'Assumes cost cuts won\'t impact service quality', severity: 'high', evidence_needed: 'Quality baseline metrics' },
      { risk: 'Assumes affected teams will maintain productivity', severity: 'med', evidence_needed: 'Change management assessment' },
    ],
    second_order_effects: [
      { risk: 'Key talent may leave proactively', severity: 'high', evidence_needed: 'Retention risk assessment' },
      { risk: 'Vendor relationships may deteriorate', severity: 'med', evidence_needed: 'Vendor dependency mapping' },
    ],
    tail_risks: [
      { risk: 'Morale collapse could cascade across organization', severity: 'high', evidence_needed: 'Employee sentiment data' },
      { risk: 'Critical institutional knowledge may be lost', severity: 'med', evidence_needed: 'Knowledge transfer audit' },
    ],
    metric_gaming_vectors: [
      { risk: 'Short-term savings may hide long-term capability loss', severity: 'high', evidence_needed: 'Capability impact assessment' },
    ],
    cross_functional_impacts: [
      { risk: 'PR/communications burden during restructuring', severity: 'med', evidence_needed: 'Communications plan' },
      { risk: 'Legal review needed for any workforce changes', severity: 'med', evidence_needed: 'Legal compliance checklist' },
    ],
    top_3_unseen_risks: [
      'Competitors may poach talent during transition',
      'Customer perception of instability could affect renewals',
      'Hidden dependencies on roles being eliminated',
    ],
    data_to_collect_next: [
      'Map critical dependencies for each affected role',
      'Assess competitor hiring activity',
      'Survey customer sentiment baseline',
    ],
  }
}

function getTechRisks(): RiskDiscoveryOutput {
  return {
    implicit_assumptions: [
      { risk: 'Assumes current team has required technical skills', severity: 'med', evidence_needed: 'Skills gap analysis' },
      { risk: 'Assumes integration with existing systems is straightforward', severity: 'high', evidence_needed: 'Technical architecture review' },
    ],
    second_order_effects: [
      { risk: 'New tech may require retraining across organization', severity: 'med', evidence_needed: 'Training needs assessment' },
      { risk: 'Legacy system deprecation timeline may be unrealistic', severity: 'med', evidence_needed: 'Migration complexity analysis' },
    ],
    tail_risks: [
      { risk: 'Vendor lock-in could limit future flexibility', severity: 'med', evidence_needed: 'Vendor exit strategy' },
      { risk: 'Security vulnerabilities in new stack unknown', severity: 'high', evidence_needed: 'Security audit plan' },
    ],
    metric_gaming_vectors: [
      { risk: 'Performance benchmarks may not reflect production load', severity: 'med', evidence_needed: 'Realistic load testing plan' },
    ],
    cross_functional_impacts: [
      { risk: 'Operations team needs new monitoring capabilities', severity: 'med', evidence_needed: 'Ops readiness checklist' },
      { risk: 'Compliance requirements for new data flows', severity: 'med', evidence_needed: 'Compliance review' },
    ],
    top_3_unseen_risks: [
      'Integration complexity often 3x initial estimates',
      'Key technical staff may resist change',
      'Hidden data migration costs',
    ],
    data_to_collect_next: [
      'Conduct proof-of-concept with production-like data',
      'Map all integration points with existing systems',
      'Assess team technical readiness',
    ],
  }
}

function getGenericRisks(): RiskDiscoveryOutput {
  return {
    implicit_assumptions: [
      { risk: 'Timeline assumes no competing priorities emerge', severity: 'med', evidence_needed: 'Resource allocation confirmation' },
      { risk: 'Budget estimates may not include hidden costs', severity: 'med', evidence_needed: 'Detailed cost breakdown' },
    ],
    second_order_effects: [
      { risk: 'Success may create expectations for similar initiatives', severity: 'low', evidence_needed: 'Capacity planning' },
      { risk: 'Failure could affect team credibility for future proposals', severity: 'med', evidence_needed: 'Risk mitigation plan' },
    ],
    tail_risks: [
      { risk: 'External market conditions could invalidate assumptions', severity: 'med', evidence_needed: 'Market monitoring plan' },
    ],
    metric_gaming_vectors: [
      { risk: 'Success metrics may be cherry-picked post-hoc', severity: 'low', evidence_needed: 'Pre-registered success criteria' },
    ],
    cross_functional_impacts: [
      { risk: 'Other teams may have unstated dependencies', severity: 'med', evidence_needed: 'Cross-team dependency mapping' },
    ],
    top_3_unseen_risks: [
      'Stakeholder alignment may be shallower than assumed',
      'Resource availability may shift mid-project',
      'Scope creep risk not explicitly managed',
    ],
    data_to_collect_next: [
      'Confirm stakeholder commitment in writing',
      'Validate resource availability with managers',
      'Define explicit scope boundaries',
    ],
  }
}

export function getMockTrace() {
  return {
    provider: 'mock',
    model: 'demo-mode',
    promptVersionId: 'mock-v1',
    latencyMs: 50,
    failures: [],
  }
}
```

**Step 3: Commit**

```bash
git add lib/ai/prompts.ts lib/ai/mock.ts
git commit -m "feat: add prompt templates and mock risk responses"
```

---

### Task 11: Risk Discovery

**Files:**
- Create: `lib/ai/riskDiscovery.ts`

**Step 1: Create risk discovery**

Create `lib/ai/riskDiscovery.ts`:

```typescript
import { getClient, getModel, isDemo } from './client'
import { RiskDiscoverySchema, type RiskDiscoveryOutput } from './schemas'
import { buildRiskDiscoveryPrompt, RISK_DISCOVERY_PROMPT_VERSION, type PromptContext } from './prompts'
import { getMockRisks, getMockTrace } from './mock'
import { extractAndValidateJson } from './jsonGuard'

export interface ModelTrace {
  provider: string
  model: string
  promptVersionId: string
  latencyMs: number
  failures: Array<{ stage: string; error: string }>
}

export interface RiskDiscoveryResult {
  risks: RiskDiscoveryOutput
  trace: ModelTrace
}

function emptyRisks(): RiskDiscoveryOutput {
  return {
    implicit_assumptions: [],
    second_order_effects: [],
    tail_risks: [],
    metric_gaming_vectors: [],
    cross_functional_impacts: [],
    top_3_unseen_risks: [],
    data_to_collect_next: [],
  }
}

export async function discoverRisks(ctx: PromptContext): Promise<RiskDiscoveryResult> {
  if (isDemo()) {
    return {
      risks: getMockRisks(ctx.proposalTitle, ctx.proposalSummary),
      trace: getMockTrace(),
    }
  }

  const client = getClient()
  const model = getModel()
  const prompt = buildRiskDiscoveryPrompt(ctx)
  const startTime = Date.now()

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    })

    const raw = response.choices[0]?.message?.content || '{}'
    const parsed = extractAndValidateJson(raw, RiskDiscoverySchema)

    return {
      risks: parsed,
      trace: {
        provider: 'openai',
        model: response.model,
        promptVersionId: `riskDiscovery-v${RISK_DISCOVERY_PROMPT_VERSION}`,
        latencyMs: Date.now() - startTime,
        failures: [],
      },
    }
  } catch (error) {
    // Fail-closed: return empty risks, log failure
    return {
      risks: emptyRisks(),
      trace: {
        provider: 'openai',
        model,
        promptVersionId: `riskDiscovery-v${RISK_DISCOVERY_PROMPT_VERSION}`,
        latencyMs: Date.now() - startTime,
        failures: [{ stage: 'riskDiscovery', error: String(error) }],
      },
    }
  }
}
```

**Step 2: Commit**

```bash
git add lib/ai/riskDiscovery.ts
git commit -m "feat: add risk discovery with LLM integration"
```

---

### Task 12: Confidence Computation

**Files:**
- Create: `lib/engine/confidenceComputation.ts`

**Step 1: Create confidence computation**

Create `lib/engine/confidenceComputation.ts`:

```typescript
import type { Features } from './featureBuilder'
import type { Scores } from './deterministicScorer'
import type { RiskDiscoveryOutput } from '@/lib/ai/schemas'
import type { ModelTrace } from '@/lib/ai/riskDiscovery'

export interface ConfidenceResult {
  confidence: number
  reasons: string[]
}

export function computeConfidence(
  features: Features,
  scores: Scores,
  risks: RiskDiscoveryOutput,
  trace: ModelTrace
): ConfidenceResult {
  let confidence = 0.8 // Base confidence
  const reasons: string[] = []

  // Penalty for missing proposal fields
  if (features.missingFieldsCount > 0) {
    const penalty = features.missingFieldsCount * 0.1
    confidence -= penalty
    reasons.push(`Missing ${features.missingFieldsCount} proposal field(s) (-${(penalty * 100).toFixed(0)}%)`)
  }

  // Penalty for LLM failures
  if (trace.failures.length > 0) {
    confidence -= 0.3
    reasons.push('AI risk analysis failed (-30%)')
  }

  // Penalty for no assumptions stated
  if (!features.hasAssumptions) {
    confidence -= 0.1
    reasons.push('No assumptions stated (-10%)')
  }

  // Penalty for no dependencies stated
  if (!features.hasDependencies) {
    confidence -= 0.05
    reasons.push('No dependencies stated (-5%)')
  }

  // Penalty for high number of identified risks
  const totalRisks =
    (risks.implicit_assumptions?.length || 0) +
    (risks.second_order_effects?.length || 0) +
    (risks.tail_risks?.length || 0) +
    (risks.metric_gaming_vectors?.length || 0) +
    (risks.cross_functional_impacts?.length || 0)

  if (totalRisks > 10) {
    confidence -= 0.1
    reasons.push(`High risk count (${totalRisks}) (-10%)`)
  }

  // Penalty for conflicts
  if (scores.conflicts.length > 0) {
    const penalty = scores.conflicts.length * 0.05
    confidence -= penalty
    reasons.push(`${scores.conflicts.length} conflict(s) detected (-${(penalty * 100).toFixed(0)}%)`)
  }

  // Boost for well-documented proposal
  if (features.hasAssumptions && features.hasDependencies && features.missingFieldsCount === 0) {
    confidence += 0.1
    reasons.push('Well-documented proposal (+10%)')
  }

  // Ensure bounds
  confidence = Math.max(0, Math.min(1, confidence))

  if (reasons.length === 0) {
    reasons.push('Standard confidence assessment')
  }

  return { confidence, reasons }
}
```

**Step 2: Commit**

```bash
git add lib/engine/confidenceComputation.ts
git commit -m "feat: add confidence computation logic"
```

---

### Task 13: Pipeline Orchestrator

**Files:**
- Create: `lib/engine/pipeline.ts`

**Step 1: Create pipeline**

Create `lib/engine/pipeline.ts`:

```typescript
import { buildFeatures, type ProposalInput } from './featureBuilder'
import { scoreProposal, type MandateInput } from './deterministicScorer'
import { applyEscalation } from './escalationPolicy'
import { computeConfidence } from './confidenceComputation'
import { discoverRisks, type ModelTrace } from '@/lib/ai/riskDiscovery'
import type { DecisionObject, Weights, RiskTolerance } from '@/lib/ai/schemas'

export interface EvaluationInput {
  mandate: {
    weights: Weights
    riskTolerance: RiskTolerance
    nonNegotiables: string[]
  }
  proposal: {
    title: string
    summary: string
    scope: string
    assumptions: string[]
    dependencies: string[]
  }
}

export interface EvaluationOutput {
  decisionObject: DecisionObject
  trace: ModelTrace
}

export async function evaluateProposal(input: EvaluationInput): Promise<EvaluationOutput> {
  const { mandate, proposal } = input

  // 1. Build features (deterministic)
  const features = buildFeatures(proposal)

  // 2. Deterministic scoring
  const scores = scoreProposal(mandate, proposal, features)

  // 3. Risk discovery (LLM or mock)
  const { risks, trace } = await discoverRisks({
    mandateWeights: mandate.weights,
    riskTolerance: mandate.riskTolerance,
    nonNegotiables: mandate.nonNegotiables,
    proposalTitle: proposal.title,
    proposalSummary: proposal.summary,
    proposalScope: proposal.scope,
    proposalAssumptions: proposal.assumptions,
    proposalDependencies: proposal.dependencies,
  })

  // 4. Confidence computation (deterministic)
  const { confidence, reasons: confidenceReasons } = computeConfidence(
    features,
    scores,
    risks,
    trace
  )

  // 5. Escalation policy (deterministic)
  const escalation = applyEscalation(
    mandate.riskTolerance,
    scores,
    risks,
    confidence
  )

  // 6. Assemble decision object
  const summary = generateSummary(proposal, scores, escalation.recommendation)
  const requiredEvidence = risks.data_to_collect_next || []

  const decisionObject: DecisionObject = {
    summary,
    impact_estimate: scores.impactEstimate,
    tradeoff_score: scores.tradeoffScore,
    conflicts: scores.conflicts,
    constraint_violations: scores.constraintViolations,
    unseen_risks: risks,
    confidence,
    confidence_reasons: confidenceReasons,
    required_next_evidence: requiredEvidence,
    recommendation: escalation.recommendation,
    human_required: escalation.humanRequired,
  }

  return { decisionObject, trace }
}

function generateSummary(
  proposal: ProposalInput,
  scores: ReturnType<typeof scoreProposal>,
  recommendation: string
): string {
  const action = recommendation === 'APPROVE' ? 'Proceed with' :
                 recommendation === 'REVISE' ? 'Revise' : 'Escalate'

  let summary = `${action}: ${proposal.title}. `

  if (scores.constraintViolations.length > 0) {
    summary += `${scores.constraintViolations.length} constraint violation(s). `
  }

  if (scores.conflicts.length > 0) {
    summary += `${scores.conflicts.length} conflict(s) detected. `
  }

  summary += `Tradeoff score: ${(scores.tradeoffScore * 100).toFixed(0)}%.`

  // Trim to 240 chars
  return summary.slice(0, 240)
}
```

**Step 2: Commit**

```bash
git add lib/engine/pipeline.ts
git commit -m "feat: add evaluation pipeline orchestrator"
```

---

## Phase 3: Database Seed

### Task 14: Seed Data

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json`

**Step 1: Create seed file**

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client'
import { computeChecksum } from '../lib/utils/checksum'

const prisma = new PrismaClient()

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

  // Create MandateVersions
  const mandateV1Data = {
    weights: { growth: 0.4, cost: 0.2, risk: 0.3, brand: 0.1 },
    riskTolerance: 'MODERATE',
    nonNegotiables: ['No layoffs', 'Budget must not exceed $500k'],
  }

  await prisma.mandateVersion.create({
    data: {
      mandateId: mandate.id,
      version: 1,
      weights: JSON.stringify(mandateV1Data.weights),
      riskTolerance: mandateV1Data.riskTolerance,
      nonNegotiables: JSON.stringify(mandateV1Data.nonNegotiables),
      checksum: computeChecksum(mandateV1Data),
      isActive: false,
    },
  })

  const mandateV2Data = {
    weights: { growth: 0.5, cost: 0.15, risk: 0.25, brand: 0.1 },
    riskTolerance: 'MODERATE',
    nonNegotiables: ['No layoffs', 'Budget must not exceed $750k', 'Data privacy must be maintained'],
  }

  await prisma.mandateVersion.create({
    data: {
      mandateId: mandate.id,
      version: 2,
      weights: JSON.stringify(mandateV2Data.weights),
      riskTolerance: mandateV2Data.riskTolerance,
      nonNegotiables: JSON.stringify(mandateV2Data.nonNegotiables),
      checksum: computeChecksum(mandateV2Data),
      isActive: true,
    },
  })

  // Create Proposals
  // Proposal 1: APAC Expansion (should APPROVE)
  const proposal1 = await prisma.proposal.create({ data: {} })
  const p1v1Data = {
    title: 'APAC Market Expansion',
    summary: 'Expand operations to Singapore and Japan markets with phased rollout over 6 months. Initial focus on enterprise customers.',
    assumptions: [
      'Local partners available for distribution',
      'Product localization can be completed in 3 months',
      'Regulatory approval timeline is 2 months',
    ],
    scope: 'Phase 1: Singapore (Month 1-3), Phase 2: Japan (Month 4-6). Includes local hiring, partner agreements, and marketing launch.',
    dependencies: ['Legal team for contracts', 'Product team for localization', 'Finance for FX management'],
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

  // Proposal 2: Cost Cutting (should ESCALATE - violates constraint)
  const proposal2 = await prisma.proposal.create({ data: {} })
  const p2v1Data = {
    title: 'Operational Efficiency Initiative',
    summary: 'Reduce operational costs by 20% through process automation and workforce optimization including targeted layoffs.',
    assumptions: [
      'Automation tools can replace 30% of manual processes',
      'Affected employees can be retrained or transitioned',
    ],
    scope: 'Q1: Process audit, Q2: Automation implementation, Q3: Workforce restructuring with layoffs in underperforming units.',
    dependencies: ['HR for workforce planning', 'IT for automation tools', 'Legal for compliance'],
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

  // Proposal 3: Vague R&D (should ESCALATE - low confidence)
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
      version: 1,
      template: 'Risk discovery prompt template v1',
      checksum: computeChecksum({ name: 'riskDiscovery', version: 1 }),
    },
  })

  console.log('Seed completed successfully')
  console.log(`Created mandate: ${mandate.id}`)
  console.log(`Created proposals: ${proposal1.id}, ${proposal2.id}, ${proposal3.id}`)
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

**Step 2: Add seed script to package.json**

Add to `package.json` in the `prisma` section:

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

**Step 3: Run seed**

```bash
pnpm prisma db seed
```

**Step 4: Commit**

```bash
git add prisma/seed.ts package.json
git commit -m "feat: add database seed with sample data"
```

---

## Phase 4: API Routes

### Task 15: Mandate API

**Files:**
- Create: `app/api/mandate/route.ts`

**Step 1: Create mandate API**

Create `app/api/mandate/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { computeChecksum } from '@/lib/utils/checksum'
import { WeightsSchema, RiskToleranceSchema } from '@/lib/ai/schemas'
import { z } from 'zod'

const CreateMandateVersionSchema = z.object({
  mandateId: z.string(),
  weights: WeightsSchema,
  riskTolerance: RiskToleranceSchema,
  nonNegotiables: z.array(z.string()),
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

  const { mandateId, weights, riskTolerance, nonNegotiables } = parsed.data

  // Get next version number
  const lastVersion = await db.mandateVersion.findFirst({
    where: { mandateId },
    orderBy: { version: 'desc' },
  })

  const nextVersion = (lastVersion?.version || 0) + 1

  const versionData = { weights, riskTolerance, nonNegotiables }

  const newVersion = await db.mandateVersion.create({
    data: {
      mandateId,
      version: nextVersion,
      weights: JSON.stringify(weights),
      riskTolerance,
      nonNegotiables: JSON.stringify(nonNegotiables),
      checksum: computeChecksum(versionData),
      isActive: false,
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
    // Deactivate all versions for this mandate first
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
git commit -m "feat: add mandate API routes"
```

---

### Task 16: Proposals API

**Files:**
- Create: `app/api/proposals/route.ts`
- Create: `app/api/proposals/[id]/route.ts`

**Step 1: Create proposals list API**

Create `app/api/proposals/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { computeChecksum } from '@/lib/utils/checksum'
import { z } from 'zod'

const CreateProposalSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  scope: z.string().min(1),
  assumptions: z.array(z.string()),
  dependencies: z.array(z.string()),
})

export async function GET() {
  const proposals = await db.proposal.findMany({
    include: {
      versions: {
        orderBy: { version: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(proposals)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = CreateProposalSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  const { title, summary, scope, assumptions, dependencies } = parsed.data

  const proposal = await db.proposal.create({ data: {} })

  const versionData = { title, summary, scope, assumptions, dependencies }

  const version = await db.proposalVersion.create({
    data: {
      proposalId: proposal.id,
      version: 1,
      title,
      summary,
      scope,
      assumptions: JSON.stringify(assumptions),
      dependencies: JSON.stringify(dependencies),
      checksum: computeChecksum(versionData),
    },
  })

  await db.auditLog.create({
    data: {
      actor: 'system',
      action: 'CREATE',
      entityType: 'Proposal',
      entityId: proposal.id,
      after: JSON.stringify(versionData),
    },
  })

  return NextResponse.json({ proposal, version })
}
```

**Step 2: Create single proposal API**

Create `app/api/proposals/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { computeChecksum } from '@/lib/utils/checksum'
import { z } from 'zod'

const CreateVersionSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  scope: z.string().min(1),
  assumptions: z.array(z.string()),
  dependencies: z.array(z.string()),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const proposal = await db.proposal.findUnique({
    where: { id },
    include: {
      versions: {
        orderBy: { version: 'desc' },
        include: {
          evaluations: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      },
    },
  })

  if (!proposal) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(proposal)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const parsed = CreateVersionSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  const { title, summary, scope, assumptions, dependencies } = parsed.data

  const lastVersion = await db.proposalVersion.findFirst({
    where: { proposalId: id },
    orderBy: { version: 'desc' },
  })

  const nextVersion = (lastVersion?.version || 0) + 1
  const versionData = { title, summary, scope, assumptions, dependencies }

  const version = await db.proposalVersion.create({
    data: {
      proposalId: id,
      version: nextVersion,
      title,
      summary,
      scope,
      assumptions: JSON.stringify(assumptions),
      dependencies: JSON.stringify(dependencies),
      checksum: computeChecksum(versionData),
    },
  })

  await db.auditLog.create({
    data: {
      actor: 'system',
      action: 'CREATE',
      entityType: 'ProposalVersion',
      entityId: version.id,
      after: JSON.stringify(versionData),
    },
  })

  return NextResponse.json(version)
}
```

**Step 3: Commit**

```bash
git add app/api/proposals/route.ts app/api/proposals/\[id\]/route.ts
git commit -m "feat: add proposals API routes"
```

---

### Task 17: Evaluations API

**Files:**
- Create: `app/api/evaluations/route.ts`
- Create: `app/api/evaluations/[id]/route.ts`

**Step 1: Create evaluations API**

Create `app/api/evaluations/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { evaluateProposal } from '@/lib/engine/pipeline'
import { z } from 'zod'

const EvaluateSchema = z.object({
  proposalVersionId: z.string(),
})

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = EvaluateSchema.safeParse(body)

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
    return NextResponse.json({ error: 'Proposal version not found' }, { status: 404 })
  }

  // Run evaluation
  const { decisionObject, trace } = await evaluateProposal({
    mandate: {
      weights: JSON.parse(mandateVersion.weights),
      riskTolerance: mandateVersion.riskTolerance as 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE',
      nonNegotiables: JSON.parse(mandateVersion.nonNegotiables),
    },
    proposal: {
      title: proposalVersion.title,
      summary: proposalVersion.summary,
      scope: proposalVersion.scope,
      assumptions: JSON.parse(proposalVersion.assumptions),
      dependencies: JSON.parse(proposalVersion.dependencies),
    },
  })

  // Create inputs snapshot
  const inputsSnapshot = {
    mandate: {
      id: mandateVersion.id,
      version: mandateVersion.version,
      weights: JSON.parse(mandateVersion.weights),
      riskTolerance: mandateVersion.riskTolerance,
      nonNegotiables: JSON.parse(mandateVersion.nonNegotiables),
      checksum: mandateVersion.checksum,
    },
    proposal: {
      id: proposalVersion.id,
      version: proposalVersion.version,
      title: proposalVersion.title,
      summary: proposalVersion.summary,
      scope: proposalVersion.scope,
      assumptions: JSON.parse(proposalVersion.assumptions),
      dependencies: JSON.parse(proposalVersion.dependencies),
      checksum: proposalVersion.checksum,
    },
  }

  // Save evaluation
  const evaluation = await db.evaluation.create({
    data: {
      mandateVersionId: mandateVersion.id,
      proposalVersionId,
      decisionObject: JSON.stringify(decisionObject),
      inputsSnapshot: JSON.stringify(inputsSnapshot),
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

**Step 2: Create single evaluation API**

Create `app/api/evaluations/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const evaluation = await db.evaluation.findUnique({
    where: { id },
    include: {
      mandateVersion: {
        include: { mandate: true },
      },
      proposalVersion: {
        include: { proposal: true },
      },
      overrides: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!evaluation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Get audit logs for this evaluation
  const auditLogs = await db.auditLog.findMany({
    where: {
      OR: [
        { entityType: 'Evaluation', entityId: id },
        { entityType: 'OverrideDecision', entityId: { in: evaluation.overrides.map(o => o.id) } },
      ],
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({
    ...evaluation,
    decisionObject: JSON.parse(evaluation.decisionObject),
    inputsSnapshot: JSON.parse(evaluation.inputsSnapshot),
    modelTrace: JSON.parse(evaluation.modelTrace),
    auditLogs,
  })
}
```

**Step 3: Commit**

```bash
git add app/api/evaluations/route.ts app/api/evaluations/\[id\]/route.ts
git commit -m "feat: add evaluations API routes"
```

---

### Task 18: Override API

**Files:**
- Create: `app/api/override/route.ts`

**Step 1: Create override API**

Create `app/api/override/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const OverrideSchema = z.object({
  evaluationId: z.string(),
  actor: z.string().min(1),
  decision: z.enum(['APPROVE', 'REJECT', 'ESCALATE']),
  rationale: z.string().min(20, 'Rationale must be at least 20 characters'),
})

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = OverrideSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  const { evaluationId, actor, decision, rationale } = parsed.data

  const evaluation = await db.evaluation.findUnique({
    where: { id: evaluationId },
  })

  if (!evaluation) {
    return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 })
  }

  const before = JSON.parse(evaluation.decisionObject)

  const override = await db.overrideDecision.create({
    data: {
      evaluationId,
      actor,
      decision,
      rationale,
    },
  })

  await db.auditLog.create({
    data: {
      actor,
      action: 'OVERRIDE',
      entityType: 'OverrideDecision',
      entityId: override.id,
      before: JSON.stringify({ recommendation: before.recommendation }),
      after: JSON.stringify({ decision }),
      rationale,
    },
  })

  return NextResponse.json(override)
}
```

**Step 2: Commit**

```bash
git add app/api/override/route.ts
git commit -m "feat: add override API route"
```

---

## Phase 5: UI Pages

### Task 19: Layout and Home Page

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`
- Create: `components/nav.tsx`

**Step 1: Create navigation component**

Create `components/nav.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/mandate', label: 'Mandate' },
  { href: '/proposals', label: 'Proposals' },
]

export function Nav() {
  const pathname = usePathname()

  return (
    <nav className="border-b bg-background">
      <div className="container flex h-14 items-center">
        <div className="mr-8 font-semibold">Mandate</div>
        <div className="flex gap-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'text-sm font-medium transition-colors hover:text-primary',
                pathname === item.href
                  ? 'text-foreground'
                  : 'text-muted-foreground'
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
```

**Step 2: Update layout**

Replace `app/layout.tsx`:

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Nav } from '@/components/nav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Mandate',
  description: 'AI-native decision governance system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Nav />
        <main className="container py-6">{children}</main>
      </body>
    </html>
  )
}
```

**Step 3: Update home page**

Replace `app/page.tsx`:

```typescript
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Decision Governance</h1>
        <p className="text-muted-foreground mt-2">
          AI-native system for structured decision-making with human accountability.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Mandate</CardTitle>
            <CardDescription>
              Define priorities, risk tolerance, and non-negotiables
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/mandate">
              <Button variant="outline" className="w-full">
                Configure Mandate
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Proposals</CardTitle>
            <CardDescription>
              Submit and evaluate business proposals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/proposals">
              <Button variant="outline" className="w-full">
                View Proposals
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
            <CardDescription>
              AI discovers risks, humans make final calls
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ol className="list-decimal list-inside space-y-1">
              <li>Set your mandate (priorities + constraints)</li>
              <li>Submit proposals for evaluation</li>
              <li>AI analyzes risks and tradeoffs</li>
              <li>Human reviews and decides</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add components/nav.tsx app/layout.tsx app/page.tsx
git commit -m "feat: add navigation and home page"
```

---

## Phase 5: UI Pages (continued)

### Task 20: Mandate Page

**Files:**
- Create: `app/mandate/page.tsx`

**Step 1: Create mandate page**

Create `app/mandate/page.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface MandateVersion {
  id: string
  version: number
  weights: string
  riskTolerance: string
  nonNegotiables: string
  isActive: boolean
  createdAt: string
}

interface Mandate {
  id: string
  name: string
  versions: MandateVersion[]
}

export default function MandatePage() {
  const [mandates, setMandates] = useState<Mandate[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    growth: 0.4,
    cost: 0.2,
    risk: 0.3,
    brand: 0.1,
    riskTolerance: 'MODERATE',
    nonNegotiables: '',
  })

  useEffect(() => {
    fetchMandates()
  }, [])

  async function fetchMandates() {
    const res = await fetch('/api/mandate')
    const data = await res.json()
    setMandates(data)
    setLoading(false)
  }

  async function createVersion() {
    const mandate = mandates[0]
    if (!mandate) return

    setCreating(true)
    await fetch('/api/mandate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mandateId: mandate.id,
        weights: {
          growth: form.growth,
          cost: form.cost,
          risk: form.risk,
          brand: form.brand,
        },
        riskTolerance: form.riskTolerance,
        nonNegotiables: form.nonNegotiables.split('\n').filter(Boolean),
      }),
    })
    await fetchMandates()
    setCreating(false)
  }

  async function activateVersion(versionId: string) {
    await fetch('/api/mandate', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ versionId, activate: true }),
    })
    await fetchMandates()
  }

  if (loading) return <div>Loading...</div>

  const mandate = mandates[0]
  const activeVersion = mandate?.versions.find(v => v.isActive)
  const activeWeights = activeVersion ? JSON.parse(activeVersion.weights) : null
  const activeNonNeg = activeVersion ? JSON.parse(activeVersion.nonNegotiables) : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mandate</h1>
        <p className="text-muted-foreground mt-2">
          Define organizational priorities and constraints
        </p>
      </div>

      {activeVersion && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Active Mandate
              <Badge>v{activeVersion.version}</Badge>
            </CardTitle>
            <CardDescription>
              Risk Tolerance: {activeVersion.riskTolerance}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">Weights</Label>
              <div className="grid grid-cols-4 gap-4 mt-2">
                {activeWeights && Object.entries(activeWeights).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <div className="text-sm font-medium capitalize">{key}</div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${(value as number) * 100}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">{((value as number) * 100).toFixed(0)}%</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Non-Negotiables</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {activeNonNeg.map((item: string, i: number) => (
                  <Badge key={i} variant="destructive">{item}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Create New Version</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {['growth', 'cost', 'risk', 'brand'].map((key) => (
              <div key={key} className="space-y-2">
                <Label className="capitalize">{key}</Label>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [key]: parseFloat(e.target.value) })}
                />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Label>Risk Tolerance</Label>
            <Select value={form.riskTolerance} onValueChange={(v) => setForm({ ...form, riskTolerance: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CONSERVATIVE">Conservative</SelectItem>
                <SelectItem value="MODERATE">Moderate</SelectItem>
                <SelectItem value="AGGRESSIVE">Aggressive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Non-Negotiables (one per line)</Label>
            <textarea
              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.nonNegotiables}
              onChange={(e) => setForm({ ...form, nonNegotiables: e.target.value })}
              placeholder="No layoffs&#10;Budget must not exceed $500k"
            />
          </div>
          <Button onClick={createVersion} disabled={creating}>
            {creating ? 'Creating...' : 'Create Version'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Version History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Risk Tolerance</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mandate?.versions.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>v{v.version}</TableCell>
                  <TableCell>{v.riskTolerance}</TableCell>
                  <TableCell>{new Date(v.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {v.isActive ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                  </TableCell>
                  <TableCell>
                    {!v.isActive && (
                      <Button variant="outline" size="sm" onClick={() => activateVersion(v.id)}>
                        Activate
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add app/mandate/page.tsx
git commit -m "feat: add mandate page with version management"
```

---

### Task 21: Proposals List Page

**Files:**
- Create: `app/proposals/page.tsx`

**Step 1: Create proposals page**

Create `app/proposals/page.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

interface Proposal {
  id: string
  createdAt: string
  versions: Array<{
    id: string
    version: number
    title: string
    summary: string
  }>
}

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    title: '',
    summary: '',
    scope: '',
    assumptions: '',
    dependencies: '',
  })

  useEffect(() => {
    fetchProposals()
  }, [])

  async function fetchProposals() {
    const res = await fetch('/api/proposals')
    const data = await res.json()
    setProposals(data)
    setLoading(false)
  }

  async function createProposal() {
    setCreating(true)
    await fetch('/api/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        summary: form.summary,
        scope: form.scope,
        assumptions: form.assumptions.split('\n').filter(Boolean),
        dependencies: form.dependencies.split('\n').filter(Boolean),
      }),
    })
    setForm({ title: '', summary: '', scope: '', assumptions: '', dependencies: '' })
    setOpen(false)
    await fetchProposals()
    setCreating(false)
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Proposals</h1>
          <p className="text-muted-foreground mt-2">
            Submit and evaluate business proposals
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>New Proposal</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Proposal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="APAC Market Expansion"
                />
              </div>
              <div className="space-y-2">
                <Label>Summary</Label>
                <textarea
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
                  placeholder="Brief description of the proposal..."
                />
              </div>
              <div className="space-y-2">
                <Label>Scope</Label>
                <textarea
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.scope}
                  onChange={(e) => setForm({ ...form, scope: e.target.value })}
                  placeholder="Detailed scope of work..."
                />
              </div>
              <div className="space-y-2">
                <Label>Assumptions (one per line)</Label>
                <textarea
                  className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.assumptions}
                  onChange={(e) => setForm({ ...form, assumptions: e.target.value })}
                  placeholder="Market demand exists&#10;Resources available"
                />
              </div>
              <div className="space-y-2">
                <Label>Dependencies (one per line)</Label>
                <textarea
                  className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.dependencies}
                  onChange={(e) => setForm({ ...form, dependencies: e.target.value })}
                  placeholder="Legal team&#10;Finance approval"
                />
              </div>
              <Button onClick={createProposal} disabled={creating} className="w-full">
                {creating ? 'Creating...' : 'Create Proposal'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Proposals</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Latest Version</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proposals.map((p) => {
                const latest = p.versions[0]
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{latest?.title || 'Untitled'}</TableCell>
                    <TableCell>v{latest?.version || 1}</TableCell>
                    <TableCell>{new Date(p.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Link href={`/proposals/${p.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })}
              {proposals.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No proposals yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add app/proposals/page.tsx
git commit -m "feat: add proposals list page"
```

---

### Task 22: Proposal Detail Page

**Files:**
- Create: `app/proposals/[id]/page.tsx`

**Step 1: Create proposal detail page**

Create `app/proposals/[id]/page.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface ProposalVersion {
  id: string
  version: number
  title: string
  summary: string
  scope: string
  assumptions: string
  dependencies: string
  createdAt: string
  evaluations: Array<{ id: string }>
}

interface Proposal {
  id: string
  versions: ProposalVersion[]
}

export default function ProposalPage() {
  const params = useParams()
  const router = useRouter()
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [loading, setLoading] = useState(true)
  const [evaluating, setEvaluating] = useState(false)

  useEffect(() => {
    fetchProposal()
  }, [params.id])

  async function fetchProposal() {
    const res = await fetch(`/api/proposals/${params.id}`)
    const data = await res.json()
    setProposal(data)
    setLoading(false)
  }

  async function evaluate(versionId: string) {
    setEvaluating(true)
    const res = await fetch('/api/evaluations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposalVersionId: versionId }),
    })
    const data = await res.json()
    setEvaluating(false)
    router.push(`/evaluations/${data.evaluation.id}`)
  }

  if (loading) return <div>Loading...</div>
  if (!proposal) return <div>Not found</div>

  const latest = proposal.versions[0]
  const assumptions = JSON.parse(latest.assumptions || '[]')
  const dependencies = JSON.parse(latest.dependencies || '[]')

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{latest.title}</h1>
          <p className="text-muted-foreground mt-2">
            Version {latest.version} | Created {new Date(latest.createdAt).toLocaleDateString()}
          </p>
        </div>
        <Button onClick={() => evaluate(latest.id)} disabled={evaluating} size="lg">
          {evaluating ? 'Evaluating...' : 'Evaluate Against Mandate'}
        </Button>
      </div>

      <Tabs defaultValue="current">
        <TabsList>
          <TabsTrigger value="current">Current Version</TabsTrigger>
          <TabsTrigger value="history">Version History</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{latest.summary}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Scope</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{latest.scope}</p>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Assumptions</CardTitle>
                <CardDescription>{assumptions.length} stated</CardDescription>
              </CardHeader>
              <CardContent>
                {assumptions.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1">
                    {assumptions.map((a: string, i: number) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">None stated</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dependencies</CardTitle>
                <CardDescription>{dependencies.length} identified</CardDescription>
              </CardHeader>
              <CardContent>
                {dependencies.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1">
                    {dependencies.map((d: string, i: number) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">None identified</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Evaluations</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proposal.versions.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>v{v.version}</TableCell>
                      <TableCell>{v.title}</TableCell>
                      <TableCell>{new Date(v.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {v.evaluations.length > 0 ? (
                          <Badge variant="secondary">{v.evaluations.length}</Badge>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => evaluate(v.id)}
                          disabled={evaluating}
                        >
                          Evaluate
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add app/proposals/\[id\]/page.tsx
git commit -m "feat: add proposal detail page with evaluation trigger"
```

---

### Task 23: Evaluation Page (Executive View)

**Files:**
- Create: `app/evaluations/[id]/page.tsx`

**Step 1: Create evaluation page**

Create `app/evaluations/[id]/page.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface RiskItem {
  risk: string
  severity: 'low' | 'med' | 'high'
  evidence_needed: string
}

interface DecisionObject {
  summary: string
  impact_estimate: { growth: string; cost: string; risk: string; brand: string }
  tradeoff_score: number
  conflicts: string[]
  constraint_violations: string[]
  unseen_risks: {
    implicit_assumptions: RiskItem[]
    second_order_effects: RiskItem[]
    tail_risks: RiskItem[]
    metric_gaming_vectors: RiskItem[]
    cross_functional_impacts: RiskItem[]
    top_3_unseen_risks: string[]
    data_to_collect_next: string[]
  }
  confidence: number
  confidence_reasons: string[]
  required_next_evidence: string[]
  recommendation: 'APPROVE' | 'REVISE' | 'ESCALATE'
  human_required: boolean
}

interface Override {
  id: string
  actor: string
  decision: string
  rationale: string
  createdAt: string
}

interface AuditLog {
  id: string
  actor: string
  action: string
  rationale?: string
  createdAt: string
}

interface Evaluation {
  id: string
  decisionObject: DecisionObject
  proposalVersion: { title: string; version: number }
  mandateVersion: { version: number }
  overrides: Override[]
  auditLogs: AuditLog[]
  createdAt: string
}

export default function EvaluationPage() {
  const params = useParams()
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [loading, setLoading] = useState(true)
  const [overrideForm, setOverrideForm] = useState({ decision: '', rationale: '', actor: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchEvaluation()
  }, [params.id])

  async function fetchEvaluation() {
    const res = await fetch(`/api/evaluations/${params.id}`)
    const data = await res.json()
    setEvaluation(data)
    setLoading(false)
  }

  async function submitOverride() {
    if (!overrideForm.decision || !overrideForm.rationale || !overrideForm.actor) return
    setSubmitting(true)
    await fetch('/api/override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evaluationId: params.id,
        ...overrideForm,
      }),
    })
    setOverrideForm({ decision: '', rationale: '', actor: '' })
    await fetchEvaluation()
    setSubmitting(false)
  }

  if (loading) return <div>Loading...</div>
  if (!evaluation) return <div>Not found</div>

  const d = evaluation.decisionObject

  const recColor = d.recommendation === 'APPROVE' ? 'bg-green-500' :
                   d.recommendation === 'ESCALATE' ? 'bg-red-500' : 'bg-yellow-500'

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Recommendation Banner */}
        <div className={`${recColor} text-white p-6 rounded-lg`}>
          <div className="text-4xl font-bold">{d.recommendation}</div>
          {d.human_required && (
            <div className="mt-2 text-sm opacity-90">Human review required</div>
          )}
        </div>

        {/* Constraint Violations */}
        {d.constraint_violations.length > 0 && (
          <Alert variant="destructive">
            <AlertTitle>Constraint Violations</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside mt-2">
                {d.constraint_violations.map((v, i) => (
                  <li key={i}>{v}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle>{evaluation.proposalVersion.title}</CardTitle>
            <CardDescription>
              Proposal v{evaluation.proposalVersion.version} evaluated against Mandate v{evaluation.mandateVersion.version}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>{d.summary}</p>

            <div className="flex items-center gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Confidence:</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 cursor-help">
                      <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${d.confidence * 100}%` }} />
                      </div>
                      <span className="font-medium">{(d.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <ul className="text-sm">
                      {d.confidence_reasons.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <span className="text-sm text-muted-foreground">Tradeoff Score:</span>
                <span className="ml-2 font-medium">{(d.tradeoff_score * 100).toFixed(0)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Impact Estimate */}
        <Card>
          <CardHeader>
            <CardTitle>Impact Estimate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(d.impact_estimate).map(([key, value]) => (
                <div key={key} className="text-center p-4 bg-secondary rounded-lg">
                  <div className="text-sm text-muted-foreground capitalize">{key}</div>
                  <div className="font-medium mt-1">{value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top 3 Unseen Risks */}
        <Card>
          <CardHeader>
            <CardTitle>Top 3 Unseen Risks</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2">
              {d.unseen_risks.top_3_unseen_risks.map((r, i) => (
                <li key={i} className="text-sm">{r}</li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* Risk Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { key: 'implicit_assumptions', label: 'Implicit Assumptions' },
              { key: 'second_order_effects', label: 'Second-Order Effects' },
              { key: 'tail_risks', label: 'Tail Risks' },
              { key: 'metric_gaming_vectors', label: 'Metric Gaming Vectors' },
              { key: 'cross_functional_impacts', label: 'Cross-Functional Impacts' },
            ].map(({ key, label }) => {
              const items = d.unseen_risks[key as keyof typeof d.unseen_risks] as RiskItem[]
              return (
                <Collapsible key={key}>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 hover:bg-secondary rounded">
                    <span>{label}</span>
                    <Badge variant="secondary">{items?.length || 0}</Badge>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-4 pt-2">
                    {items?.map((item, i) => (
                      <div key={i} className="py-2 border-b last:border-0">
                        <div className="flex items-center gap-2">
                          <Badge variant={item.severity === 'high' ? 'destructive' : item.severity === 'med' ? 'default' : 'secondary'}>
                            {item.severity}
                          </Badge>
                          <span className="text-sm">{item.risk}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Evidence needed: {item.evidence_needed}
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )
            })}
          </CardContent>
        </Card>

        {/* Required Evidence */}
        <Card>
          <CardHeader>
            <CardTitle>Required Next Evidence</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1">
              {d.required_next_evidence.map((e, i) => (
                <li key={i} className="text-sm">{e}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Override Form */}
        <Card>
          <CardHeader>
            <CardTitle>Override Decision</CardTitle>
            <CardDescription>
              Provide justification to override the system recommendation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Name</label>
              <input
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={overrideForm.actor}
                onChange={(e) => setOverrideForm({ ...overrideForm, actor: e.target.value })}
                placeholder="jane@company.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Decision</label>
              <Select value={overrideForm.decision} onValueChange={(v) => setOverrideForm({ ...overrideForm, decision: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select decision" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="APPROVE">Approve</SelectItem>
                  <SelectItem value="REJECT">Reject</SelectItem>
                  <SelectItem value="ESCALATE">Escalate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Rationale (min 20 characters)</label>
              <textarea
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={overrideForm.rationale}
                onChange={(e) => setOverrideForm({ ...overrideForm, rationale: e.target.value })}
                placeholder="Explain why you are overriding the recommendation..."
              />
            </div>
            <Button
              onClick={submitOverride}
              disabled={submitting || overrideForm.rationale.length < 20}
            >
              {submitting ? 'Submitting...' : 'Submit Override'}
            </Button>
          </CardContent>
        </Card>

        {/* Audit Log */}
        <Card>
          <CardHeader>
            <CardTitle>Audit Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {evaluation.overrides.map((o) => (
                <div key={o.id} className="border-l-2 border-primary pl-4 py-2">
                  <div className="text-sm text-muted-foreground">
                    {new Date(o.createdAt).toLocaleString()}
                  </div>
                  <div className="font-medium">
                    Override: {o.decision} by {o.actor}
                  </div>
                  <div className="text-sm mt-1">
                    Rationale: {o.rationale}
                  </div>
                </div>
              ))}
              <div className="border-l-2 border-secondary pl-4 py-2">
                <div className="text-sm text-muted-foreground">
                  {new Date(evaluation.createdAt).toLocaleString()}
                </div>
                <div className="font-medium">Evaluation created (system)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}
```

**Step 2: Commit**

```bash
git add app/evaluations/\[id\]/page.tsx
git commit -m "feat: add evaluation page with executive view"
```

---

## Phase 6: Testing Harness

### Task 24: Dev Harness Page

**Files:**
- Create: `app/dev/harness/page.tsx`

**Step 1: Create harness page**

Create `app/dev/harness/page.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

interface Proposal {
  id: string
  versions: Array<{ id: string; version: number; title: string }>
}

interface EvaluationResult {
  valid: boolean
  errors: string[]
  recommendation: string
  humanRequired: boolean
  confidence: number
  constraintViolations: string[]
  escalationTriggers: string[]
  raw: unknown
}

export default function HarnessPage() {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [selectedProposalId, setSelectedProposalId] = useState('')
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<EvaluationResult | null>(null)

  useEffect(() => {
    fetchProposals()
  }, [])

  async function fetchProposals() {
    const res = await fetch('/api/proposals')
    const data = await res.json()
    setProposals(data)
    setLoading(false)
  }

  async function runEvaluation() {
    const proposal = proposals.find(p => p.id === selectedProposalId)
    if (!proposal || !proposal.versions[0]) return

    setRunning(true)
    setResult(null)

    try {
      const res = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalVersionId: proposal.versions[0].id }),
      })

      const data = await res.json()

      if (!res.ok) {
        setResult({
          valid: false,
          errors: [data.error || 'Unknown error'],
          recommendation: '',
          humanRequired: false,
          confidence: 0,
          constraintViolations: [],
          escalationTriggers: [],
          raw: data,
        })
      } else {
        const d = data.decisionObject
        const escalationTriggers: string[] = []

        if (d.constraint_violations.length > 0) {
          escalationTriggers.push('Constraint violations')
        }
        if (d.confidence < 0.4) {
          escalationTriggers.push('Low confidence')
        }
        if (d.unseen_risks.tail_risks?.some((r: { severity: string }) => r.severity === 'high')) {
          escalationTriggers.push('High-severity tail risk')
        }

        setResult({
          valid: true,
          errors: [],
          recommendation: d.recommendation,
          humanRequired: d.human_required,
          confidence: d.confidence,
          constraintViolations: d.constraint_violations,
          escalationTriggers,
          raw: d,
        })
      }
    } catch (e) {
      setResult({
        valid: false,
        errors: [String(e)],
        recommendation: '',
        humanRequired: false,
        confidence: 0,
        constraintViolations: [],
        escalationTriggers: [],
        raw: null,
      })
    }

    setRunning(false)
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Evaluation Harness</h1>
        <p className="text-muted-foreground mt-2">
          Test evaluation pipeline on seeded proposals
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Run Evaluation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Select value={selectedProposalId} onValueChange={setSelectedProposalId}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select proposal" />
              </SelectTrigger>
              <SelectContent>
                {proposals.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.versions[0]?.title || 'Untitled'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={runEvaluation} disabled={!selectedProposalId || running}>
              {running ? 'Running...' : 'Run Evaluation'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Result
              {result.valid ? (
                <Badge variant="default">Valid</Badge>
              ) : (
                <Badge variant="destructive">Invalid</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.errors.length > 0 && (
              <div className="text-destructive">
                <strong>Errors:</strong>
                <ul className="list-disc list-inside">
                  {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}

            {result.valid && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Recommendation</span>
                    <div className="font-bold text-lg">{result.recommendation}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Human Required</span>
                    <div className="font-bold text-lg">{result.humanRequired ? 'Yes' : 'No'}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Confidence</span>
                    <div className="font-bold text-lg">{(result.confidence * 100).toFixed(0)}%</div>
                  </div>
                </div>

                {result.constraintViolations.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">Constraint Violations</span>
                    <ul className="list-disc list-inside text-destructive">
                      {result.constraintViolations.map((v, i) => <li key={i}>{v}</li>)}
                    </ul>
                  </div>
                )}

                {result.escalationTriggers.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">Escalation Triggers</span>
                    <div className="flex gap-2 mt-1">
                      {result.escalationTriggers.map((t, i) => (
                        <Badge key={i} variant="secondary">{t}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-sm text-muted-foreground">Raw Output</span>
                  <pre className="mt-2 p-4 bg-secondary rounded text-xs overflow-auto max-h-[400px]">
                    {JSON.stringify(result.raw, null, 2)}
                  </pre>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add app/dev/harness/page.tsx
git commit -m "feat: add dev harness page for testing"
```

---

### Task 25: CLI Harness Script

**Files:**
- Create: `scripts/harness.ts`

**Step 1: Create CLI harness**

Create `scripts/harness.ts`:

```typescript
import { PrismaClient } from '@prisma/client'
import { evaluateProposal } from '../lib/engine/pipeline'
import { DecisionObjectSchema } from '../lib/ai/schemas'

const prisma = new PrismaClient()

async function main() {
  const args = process.argv.slice(2)
  const proposalIdArg = args.find(a => a.startsWith('--proposal='))
  const specificProposalId = proposalIdArg?.split('=')[1]

  console.log('='.repeat(60))
  console.log('MANDATE EVALUATION HARNESS')
  console.log('='.repeat(60))

  // Get active mandate
  const mandateVersion = await prisma.mandateVersion.findFirst({
    where: { isActive: true },
  })

  if (!mandateVersion) {
    console.error('ERROR: No active mandate version')
    process.exit(1)
  }

  console.log(`Using Mandate v${mandateVersion.version}`)
  console.log('')

  // Get proposals
  const proposals = await prisma.proposal.findMany({
    where: specificProposalId ? { id: specificProposalId } : undefined,
    include: {
      versions: {
        orderBy: { version: 'desc' },
        take: 1,
      },
    },
  })

  if (proposals.length === 0) {
    console.error('ERROR: No proposals found')
    process.exit(1)
  }

  let allPassed = true

  for (const proposal of proposals) {
    const version = proposal.versions[0]
    if (!version) continue

    console.log('-'.repeat(60))
    console.log(`PROPOSAL: ${version.title}`)
    console.log('-'.repeat(60))

    try {
      const { decisionObject, trace } = await evaluateProposal({
        mandate: {
          weights: JSON.parse(mandateVersion.weights),
          riskTolerance: mandateVersion.riskTolerance as 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE',
          nonNegotiables: JSON.parse(mandateVersion.nonNegotiables),
        },
        proposal: {
          title: version.title,
          summary: version.summary,
          scope: version.scope,
          assumptions: JSON.parse(version.assumptions),
          dependencies: JSON.parse(version.dependencies),
        },
      })

      // Validate schema
      const validation = DecisionObjectSchema.safeParse(decisionObject)

      if (!validation.success) {
        console.log('SCHEMA VALIDATION: FAIL')
        console.log(validation.error.message)
        allPassed = false
      } else {
        console.log('SCHEMA VALIDATION: PASS')
      }

      console.log('')
      console.log(`Recommendation: ${decisionObject.recommendation}`)
      console.log(`Human Required: ${decisionObject.human_required}`)
      console.log(`Confidence: ${(decisionObject.confidence * 100).toFixed(0)}%`)
      console.log(`Tradeoff Score: ${(decisionObject.tradeoff_score * 100).toFixed(0)}%`)

      if (decisionObject.constraint_violations.length > 0) {
        console.log('')
        console.log('CONSTRAINT VIOLATIONS:')
        decisionObject.constraint_violations.forEach(v => console.log(`  - ${v}`))
      }

      // Check escalation triggers
      const triggers: string[] = []
      if (decisionObject.constraint_violations.length > 0) triggers.push('constraint_violation')
      if (decisionObject.confidence < 0.4) triggers.push('low_confidence')
      if (decisionObject.unseen_risks.tail_risks?.some(r => r.severity === 'high')) {
        triggers.push('high_severity_tail_risk')
      }

      if (triggers.length > 0) {
        console.log('')
        console.log('ESCALATION TRIGGERS:')
        triggers.forEach(t => console.log(`  - ${t}`))
      }

      console.log('')
      console.log(`Model: ${trace.model} (${trace.latencyMs}ms)`)
      if (trace.failures.length > 0) {
        console.log('FAILURES:')
        trace.failures.forEach(f => console.log(`  - ${f.stage}: ${f.error}`))
      }

    } catch (error) {
      console.log('EVALUATION FAILED:', error)
      allPassed = false
    }

    console.log('')
  }

  console.log('='.repeat(60))
  console.log(allPassed ? 'ALL EVALUATIONS PASSED' : 'SOME EVALUATIONS FAILED')
  console.log('='.repeat(60))

  process.exit(allPassed ? 0 : 1)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

**Step 2: Add script to package.json**

Add to `package.json` scripts:

```json
{
  "scripts": {
    "harness": "tsx scripts/harness.ts"
  }
}
```

**Step 3: Commit**

```bash
git add scripts/harness.ts package.json
git commit -m "feat: add CLI evaluation harness"
```

---

## Phase 7: Documentation

### Task 26: README

**Files:**
- Create: `README.md`

**Step 1: Create README**

Create `README.md`:

```markdown
# Mandate

AI-native decision governance system. AI owns risk discovery and tradeoff analysis. Humans retain accountability for values, priorities, and irreversible decisions.

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up database
pnpm prisma migrate dev

# Seed demo data
pnpm prisma db seed

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Create `.env`:

```env
DATABASE_URL="file:./dev.db"

# Optional: For real AI risk discovery (falls back to realistic mocks)
OPENAI_API_KEY=your-key-here
OPENAI_BASE_URL=https://api.openai.com/v1  # Or compatible endpoint
OPENAI_MODEL=gpt-4o
```

## Demo Script (2-3 min)

### 1. Show the Mandate (30s)
- Navigate to `/mandate`
- Point out: priorities (growth, cost, risk, brand weights), risk tolerance, non-negotiables
- "This is what the organization has decided matters. AI can't change this."

### 2. Evaluate a Good Proposal (45s)
- Go to `/proposals` → click "APAC Market Expansion"
- Click "Evaluate Against Mandate"
- Walk through the Decision Object:
  - Recommendation banner (APPROVE)
  - Impact estimates
  - Top 3 unseen risks (AI-discovered)
  - Confidence score with reasons
- "AI found risks humans might miss. But the recommendation is advisory."

### 3. Trigger Escalation (45s)
- Go back to `/proposals` → click "Operational Efficiency Initiative"
- Evaluate it
- Show: ESCALATE recommendation, constraint violation (mentions layoffs), human_required=true
- "The system detected a non-negotiable violation. It refuses to approve."

### 4. Override Flow (30s)
- Still on evaluation page, scroll to Override section
- Enter your name, select APPROVE, type rationale (20+ chars)
- Submit
- Show audit log at bottom
- "Human can override, but must justify. Everything is logged."

### 5. Low Confidence Case (30s)
- Evaluate "Innovation Lab Setup"
- Show: ESCALATE due to low confidence
- Point out missing assumptions, vague scope
- "AI knows when it doesn't have enough information."

## Human Boundaries

**AI Owns:**
- Risk discovery (implicit assumptions, second-order effects, tail risks)
- Tradeoff scoring against mandate weights
- Confidence computation
- Escalation triggers

**Human Owns:**
- Setting the mandate (priorities, risk tolerance, non-negotiables)
- Final approval/rejection decisions
- Override authority with justification
- Defining what "non-negotiable" means

## Reproducibility

Every evaluation captures:
- `inputsSnapshot`: Frozen mandate + proposal at evaluation time
- `modelTrace`: Provider, model, prompt version, latency
- Checksums on all versioned entities

Re-running with the same inputs and prompt version produces identical deterministic scores. LLM output may vary but is captured in trace.

## Testing

```bash
# Run CLI harness on all seeded proposals
pnpm harness

# Run on specific proposal
pnpm harness --proposal=<proposal-id>

# Or use the UI at /dev/harness
```

## What Breaks at Scale

| Limitation | Production Fix |
|------------|----------------|
| SQLite (single-writer) | PostgreSQL with connection pooling |
| Sync evaluation (blocks 5-10s) | Background jobs + SSE/polling |
| No authentication | NextAuth + RBAC |
| No rate limiting | Token budgets per evaluation |
| Single prompt version | Prompt management + A/B testing |
| In-memory only | Redis for caching + job queue |

## Architecture

```
lib/engine/           # Deterministic evaluation logic
  ├── featureBuilder    # Extract proposal features
  ├── deterministicScorer # Impact/tradeoff scoring
  ├── escalationPolicy  # Human-required rules
  ├── confidenceComputation
  └── pipeline          # Orchestrates flow

lib/ai/               # AI integration
  ├── client           # OpenAI SDK wrapper
  ├── riskDiscovery    # LLM risk analysis
  ├── prompts          # Prompt templates
  ├── mock             # Demo mode responses
  └── jsonGuard        # Strict JSON validation

app/api/              # Next.js Route Handlers
app/                  # React pages
prisma/               # Database schema + seed
```

## License

MIT
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with setup and demo script"
```

---

## Summary

**Total Tasks:** 26

**Phases:**
1. Project Setup (Tasks 1-4)
2. Core Engine (Tasks 5-13)
3. Database Seed (Task 14)
4. API Routes (Tasks 15-18)
5. UI Pages (Tasks 19-23)
6. Testing Harness (Tasks 24-25)
7. Documentation (Task 26)

---

Plan complete and saved to `docs/plans/2026-02-24-mandate-implementation.md`.

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**