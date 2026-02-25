import { buildRiskDiscoveryPrompt, type PromptContext } from './prompts'
import { RiskDiscoverySchema, type RiskDiscoveryOutput } from './schemas'
import { getClient, getModel, isDemo } from './client'
import { extractAndValidateJson } from './jsonGuard'
import { getMockRisks } from './mock'

export interface ModelTrace {
  provider: string
  model: string
  latencyMs: number
  failures: Array<{ stage: string; error: string }>
}

export interface RiskDiscoveryInput {
  outcomes: string[]
  proposalTitle: string
  proposalSummary: string
  proposalScope: string
  proposalAssumptions: string[]
  proposalDependencies: string[]
}

export async function discoverRisks(input: RiskDiscoveryInput): Promise<{
  risks: RiskDiscoveryOutput
  trace: ModelTrace
}> {
  const startTime = Date.now()
  const failures: Array<{ stage: string; error: string }> = []

  if (isDemo()) {
    return {
      risks: getMockRisks(input.proposalTitle, input.proposalSummary),
      trace: {
        provider: 'mock',
        model: 'demo',
        latencyMs: Date.now() - startTime,
        failures: [],
      },
    }
  }

  const client = getClient()
  const model = getModel()

  const promptCtx: PromptContext = {
    outcomes: input.outcomes,
    proposalTitle: input.proposalTitle,
    proposalSummary: input.proposalSummary,
    proposalScope: input.proposalScope,
    proposalAssumptions: input.proposalAssumptions,
    proposalDependencies: input.proposalDependencies,
  }

  const prompt = buildRiskDiscoveryPrompt(promptCtx)

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    })

    const content = response.choices[0]?.message?.content || ''
    const risks = extractAndValidateJson(content, RiskDiscoverySchema)

    return {
      risks,
      trace: {
        provider: 'openai',
        model,
        latencyMs: Date.now() - startTime,
        failures,
      },
    }
  } catch (error) {
    failures.push({ stage: 'llm', error: String(error) })
    return {
      risks: getMockRisks(input.proposalTitle, input.proposalSummary),
      trace: {
        provider: 'openai',
        model,
        latencyMs: Date.now() - startTime,
        failures,
      },
    }
  }
}
