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
