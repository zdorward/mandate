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
