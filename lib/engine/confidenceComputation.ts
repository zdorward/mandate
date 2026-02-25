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
