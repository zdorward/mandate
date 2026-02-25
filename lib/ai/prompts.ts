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
