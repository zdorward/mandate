# Mandate: AI-Native Decision Governance System

**Date:** 2026-02-24
**Status:** Approved

## Overview

Mandate is an AI-native system that redesigns legacy decision workflows from first principles. It separates cognitive work (risk discovery, tradeoff analysis) from human accountability (values, irreversible decisions, overrides).

**Core loop:**
1. Human sets priorities (Mandate) + risk appetite + hard constraints
2. User submits a versioned Proposal
3. System produces a structured Decision Object with tradeoffs, risks, confidence, and recommendation
4. Any override requires written justification and is audited
5. Every evaluation is reproducible via version checksums

## Architecture

### Approach: Functional Pipeline

Each evaluation step is a pure function, enabling trivial testing and reproducibility:

```
evaluateProposal(mandateVersion, proposalVersion) → DecisionObject
  ├── buildFeatures()      → Features (deterministic)
  ├── scoreProposal()      → Scores + Conflicts + Violations (deterministic)
  ├── discoverRisks()      → AIRisks (LLM or mock)
  ├── computeConfidence()  → number + reasons (deterministic)
  └── applyEscalation()    → recommendation + human_required (deterministic)
```

### Tech Stack

- Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui
- Prisma + SQLite
- Zod schemas
- OpenAI SDK with baseURL override (provider-agnostic)
- Demo mode with realistic mock risks when no API key

## Project Structure

```
mandate/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Dashboard
│   ├── mandate/page.tsx            # Mandate editor + versions
│   ├── proposals/
│   │   ├── page.tsx                # List + create
│   │   └── [id]/page.tsx           # Versions + evaluate
│   ├── evaluations/[id]/page.tsx   # Executive decision view
│   ├── dev/harness/page.tsx        # Testing harness UI
│   └── api/
│       ├── mandate/route.ts
│       ├── proposals/route.ts
│       ├── evaluations/route.ts
│       └── override/route.ts
├── lib/
│   ├── engine/
│   │   ├── featureBuilder.ts
│   │   ├── deterministicScorer.ts
│   │   ├── escalationPolicy.ts
│   │   └── pipeline.ts
│   ├── ai/
│   │   ├── client.ts
│   │   ├── schemas.ts
│   │   ├── riskDiscovery.ts
│   │   ├── prompts.ts
│   │   ├── jsonGuard.ts
│   │   └── mock.ts
│   ├── db/index.ts
│   └── utils/checksum.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── scripts/harness.ts
└── components/ui/
```

## Data Model

### Entities

**Mandate** → **MandateVersion**
- Weights (JSON: growth, cost, risk, brand)
- Risk tolerance (CONSERVATIVE | MODERATE | AGGRESSIVE)
- Non-negotiables (string[])
- Checksum for reproducibility
- isActive flag (one active per mandate)

**Proposal** → **ProposalVersion**
- Title, summary, scope
- Assumptions, dependencies (JSON arrays)
- Checksum for reproducibility

**PromptVersion**
- Name (e.g., "riskDiscovery"), version, template
- Checksum for reproducibility

**Evaluation**
- Links to MandateVersion + ProposalVersion
- decisionObject (JSON)
- inputsSnapshot (frozen inputs at eval time)
- modelTrace (provider, model, promptVersionId, latency, failures)

**OverrideDecision**
- Links to Evaluation
- Actor, decision (APPROVE | REJECT | ESCALATE), rationale

**AuditLog** (append-only)
- Actor, action, entityType, entityId
- Before/after JSON, rationale

## Evaluation Pipeline

### Feature Builder
Derives deterministic features from proposal:
- missingFieldsCount
- complexityScore (based on scope length, dependency count)
- dependencyCount
- assumptionCount

### Deterministic Scorer
Computes against mandate:
- impactEstimate: { growth, cost, risk, brand }
- tradeoffScore: weighted alignment with mandate
- conflicts: detected internal contradictions
- constraintViolations: non-negotiables violated

### Risk Discovery (LLM)
Returns structured JSON validated by Zod:
- implicit_assumptions (max 5)
- second_order_effects (max 5)
- tail_risks (max 5)
- metric_gaming_vectors (max 5)
- cross_functional_impacts (max 5)
- top_3_unseen_risks
- data_to_collect_next

Each risk item: { risk, severity, evidence_needed }

### Confidence Computation
Base confidence (0.8) minus penalties:
- Missing proposal fields: -0.1 per critical field
- LLM failure: -0.3
- High risk count: -0.1 if >10 risks
- Invalid LLM output: -0.2

### Escalation Policy
Deterministic rules:
1. Constraint violations → ESCALATE, human_required=true
2. Confidence < 0.4 → ESCALATE, human_required=true
3. High-severity tail risk → ESCALATE, human_required=true
4. Tradeoff score >= 0.7 (non-conservative) → APPROVE, human_required=false
5. Tradeoff score >= 0.5 → APPROVE, human_required=true
6. Else → REVISE, human_required=false

## Decision Object

```typescript
{
  summary: string,              // <= 240 chars
  impact_estimate: { growth, cost, risk, brand },
  tradeoff_score: number,
  conflicts: string[],
  constraint_violations: string[],
  unseen_risks: RiskDiscoveryOutput,
  confidence: number,
  confidence_reasons: string[],
  required_next_evidence: string[],
  recommendation: "APPROVE" | "REVISE" | "ESCALATE",
  human_required: boolean
}
```

## UI Design

### /evaluations/[id] (Executive View)
- Large recommendation banner (APPROVE/REVISE/ESCALATE)
- Human review warning if required
- Constraint violations (red banner)
- Summary + confidence bar with tooltip reasons
- Impact estimate cards
- Top 3 unseen risks (always visible)
- Collapsible risk categories
- Required next evidence list
- Override form (decision dropdown, rationale textarea)
- Audit log timeline

### Other Pages
- /mandate: Edit weights/tolerance/non-negotiables, version history, activate version
- /proposals: List, create new
- /proposals/[id]: Version history, create version, evaluate button
- /dev/harness: Select proposal, run evaluation, view JSON output

## Error Handling (Fail-Closed)

| Failure | Behavior |
|---------|----------|
| LLM timeout/error | Empty risks, log failure, confidence -0.3 |
| Invalid JSON from LLM | Same as above |
| Zod validation fails | Discard partial data, same as above |
| Database error | Return 500, no partial state |

## Testing

### CLI Harness
```bash
pnpm harness              # Run all seeded proposals
pnpm harness --proposal 1 # Run specific
```

### Dev Page (/dev/harness)
Visual interface for same functionality.

### Seed Data
- 1 Mandate, 2 versions (1 active)
- 3 Proposals: APAC Expansion (APPROVE), Cost Cutting (ESCALATE - violates constraint), Vague R&D (ESCALATE - low confidence)
- 1 PromptVersion for riskDiscovery

## Demo Mode

When `OPENAI_API_KEY` is unset or "demo":
- Returns realistic mock risks based on proposal keywords
- Risks vary by proposal type (pricing, infrastructure, etc.)
- Full pipeline runs, just with mock LLM output

## Scale Limitations

| Limitation | Production Fix |
|------------|----------------|
| SQLite | PostgreSQL |
| No background jobs | Redis + BullMQ |
| Single prompt version | Prompt management system |
| No auth | NextAuth + RBAC |
| Sync evaluation | Background job + SSE |
| No rate limiting | Token budget per evaluation |

## Reproducibility

- inputsSnapshot freezes mandate + proposal at evaluation time
- modelTrace.promptVersionId links to exact prompt used
- Checksums on all versioned entities
- Re-running with same versions → same deterministic outputs (LLM may vary)
