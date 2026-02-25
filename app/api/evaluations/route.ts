import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { evaluateProposal } from '@/lib/engine/pipeline'
import { z } from 'zod'

const CreateEvaluationSchema = z.object({
  proposalVersionId: z.string(),
})

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = CreateEvaluationSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  const { proposalVersionId } = parsed.data

  // Get active mandate version
  const mandateVersion = await db.mandateVersion.findFirst({
    where: { isActive: true },
  })

  if (!mandateVersion) {
    return NextResponse.json({ error: 'No active mandate' }, { status: 400 })
  }

  // Get proposal version
  const proposalVersion = await db.proposalVersion.findUnique({
    where: { id: proposalVersionId },
  })

  if (!proposalVersion) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
  }

  // Parse mandate outcomes (handle both old and new format)
  let outcomes: string[] = []
  if (mandateVersion.outcomes) {
    outcomes = JSON.parse(mandateVersion.outcomes)
  } else if (mandateVersion.weights) {
    // Backwards compatibility: convert old weights to outcomes
    const weights = JSON.parse(mandateVersion.weights)
    outcomes = Object.entries(weights)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .map(([key]) => `Prioritize ${key}`)
  }

  // Run evaluation
  const { decisionObject, trace } = await evaluateProposal({
    mandate: { outcomes },
    proposal: {
      title: proposalVersion.title,
      summary: proposalVersion.summary,
      scope: proposalVersion.scope,
      assumptions: JSON.parse(proposalVersion.assumptions),
      dependencies: JSON.parse(proposalVersion.dependencies),
    },
  })

  // Save evaluation
  const evaluation = await db.evaluation.create({
    data: {
      mandateVersionId: mandateVersion.id,
      proposalVersionId,
      decisionObject: JSON.stringify(decisionObject),
      inputsSnapshot: JSON.stringify({
        mandate: { outcomes },
        proposal: {
          title: proposalVersion.title,
          summary: proposalVersion.summary,
        },
      }),
      modelTrace: JSON.stringify(trace),
    },
  })

  await db.auditLog.create({
    data: {
      actor: 'system',
      action: 'EVALUATE',
      entityType: 'Evaluation',
      entityId: evaluation.id,
    },
  })

  return NextResponse.json({ evaluation, decisionObject })
}
