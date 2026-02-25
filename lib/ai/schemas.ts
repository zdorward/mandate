import { z } from 'zod'

export const RiskItemSchema = z.object({
  risk: z.string().max(200),
  severity: z.enum(['low', 'med', 'high']),
  evidence_needed: z.string().max(200),
})

export const RiskDiscoverySchema = z.object({
  implicit_assumptions: z.array(RiskItemSchema).max(5).default([]),
  second_order_effects: z.array(RiskItemSchema).max(5).default([]),
  tail_risks: z.array(RiskItemSchema).max(5).default([]),
  metric_gaming_vectors: z.array(RiskItemSchema).max(5).default([]),
  cross_functional_impacts: z.array(RiskItemSchema).max(5).default([]),
  top_3_unseen_risks: z.array(z.string().max(200)).max(3).default([]),
  data_to_collect_next: z.array(z.string().max(200)).max(5).default([]),
})

export type RiskItem = z.infer<typeof RiskItemSchema>
export type RiskDiscoveryOutput = z.infer<typeof RiskDiscoverySchema>

export const ImpactEstimateSchema = z.object({
  growth: z.string(),
  cost: z.string(),
  risk: z.string(),
  brand: z.string(),
})

export const DecisionObjectSchema = z.object({
  summary: z.string().max(240),
  impact_estimate: ImpactEstimateSchema,
  tradeoff_score: z.number().min(0).max(1),
  conflicts: z.array(z.string()),
  constraint_violations: z.array(z.string()),
  unseen_risks: RiskDiscoverySchema,
  confidence: z.number().min(0).max(1),
  confidence_reasons: z.array(z.string()),
  required_next_evidence: z.array(z.string()),
  recommendation: z.enum(['APPROVE', 'REVISE', 'ESCALATE']),
  human_required: z.boolean(),
})

export type DecisionObject = z.infer<typeof DecisionObjectSchema>

export const WeightsSchema = z.object({
  growth: z.number().min(0).max(1),
  cost: z.number().min(0).max(1),
  risk: z.number().min(0).max(1),
  brand: z.number().min(0).max(1),
})

export type Weights = z.infer<typeof WeightsSchema>

export const RiskToleranceSchema = z.enum(['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE'])
export type RiskTolerance = z.infer<typeof RiskToleranceSchema>

export const OutcomesSchema = z.array(z.string().min(1).max(200)).min(1).max(10)
export type Outcomes = z.infer<typeof OutcomesSchema>
