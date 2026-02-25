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
