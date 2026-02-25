import { getClient, getModel, isDemo } from './client'
import { RiskDiscoverySchema, type RiskDiscoveryOutput } from './schemas'
import { buildRiskDiscoveryPrompt, RISK_DISCOVERY_PROMPT_VERSION, type PromptContext } from './prompts'
import { getMockRisks, getMockTrace } from './mock'
import { extractAndValidateJson } from './jsonGuard'

export interface ModelTrace {
  provider: string
  model: string
  promptVersionId: string
  latencyMs: number
  failures: Array<{ stage: string; error: string }>
}

export interface RiskDiscoveryResult {
  risks: RiskDiscoveryOutput
  trace: ModelTrace
}

function emptyRisks(): RiskDiscoveryOutput {
  return {
    implicit_assumptions: [],
    second_order_effects: [],
    tail_risks: [],
    metric_gaming_vectors: [],
    cross_functional_impacts: [],
    top_3_unseen_risks: [],
    data_to_collect_next: [],
  }
}

export async function discoverRisks(ctx: PromptContext): Promise<RiskDiscoveryResult> {
  if (isDemo()) {
    return {
      risks: getMockRisks(ctx.proposalTitle, ctx.proposalSummary),
      trace: getMockTrace(),
    }
  }

  const client = getClient()
  const model = getModel()
  const prompt = buildRiskDiscoveryPrompt(ctx)
  const startTime = Date.now()

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    })

    const raw = response.choices[0]?.message?.content || '{}'
    const parsed = extractAndValidateJson(raw, RiskDiscoverySchema)

    return {
      risks: parsed,
      trace: {
        provider: 'openai',
        model: response.model,
        promptVersionId: `riskDiscovery-v${RISK_DISCOVERY_PROMPT_VERSION}`,
        latencyMs: Date.now() - startTime,
        failures: [],
      },
    }
  } catch (error) {
    // Fail-closed: return empty risks, log failure
    return {
      risks: emptyRisks(),
      trace: {
        provider: 'openai',
        model,
        promptVersionId: `riskDiscovery-v${RISK_DISCOVERY_PROMPT_VERSION}`,
        latencyMs: Date.now() - startTime,
        failures: [{ stage: 'riskDiscovery', error: String(error) }],
      },
    }
  }
}
