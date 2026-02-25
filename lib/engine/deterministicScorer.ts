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
  const impactEstimate = estimateImpact(proposal, features)
  const tradeoffScore = calculateTradeoffScore(mandate.weights, impactEstimate, features)
  const conflicts = detectConflicts(proposal, features)
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

  const total = weights.growth + weights.cost + weights.risk + weights.brand
  if (total === 0) return 0.5

  const score = (
    (weights.growth * growthScore) +
    (weights.cost * costScore) +
    (weights.risk * riskScore) +
    (weights.brand * brandScore)
  ) / total

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
