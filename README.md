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
