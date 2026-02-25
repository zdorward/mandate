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
