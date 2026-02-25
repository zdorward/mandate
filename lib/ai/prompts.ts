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
