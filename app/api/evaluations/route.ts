import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { evaluateProposal } from '@/lib/engine/pipeline'
import { z } from 'zod'

const EvaluateSchema = z.object({
  proposalVersionId: z.string(),
})

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = EvaluateSchema.safeParse(body)

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
    return NextResponse.json({ error: 'Proposal version not found' }, { status: 404 })
  }

  // Run evaluation
  const { decisionObject, trace } = await evaluateProposal({
    mandate: {
      weights: JSON.parse(mandateVersion.weights),
      riskTolerance: mandateVersion.riskTolerance as 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE',
      nonNegotiables: JSON.parse(mandateVersion.nonNegotiables),
    },
    proposal: {
      title: proposalVersion.title,
      summary: proposalVersion.summary,
      scope: proposalVersion.scope,
      assumptions: JSON.parse(proposalVersion.assumptions),
      dependencies: JSON.parse(proposalVersion.dependencies),
    },
  })

  // Create inputs snapshot
  const inputsSnapshot = {
    mandate: {
      id: mandateVersion.id,
      version: mandateVersion.version,
      weights: JSON.parse(mandateVersion.weights),
      riskTolerance: mandateVersion.riskTolerance,
      nonNegotiables: JSON.parse(mandateVersion.nonNegotiables),
      checksum: mandateVersion.checksum,
    },
    proposal: {
      id: proposalVersion.id,
      version: proposalVersion.version,
      title: proposalVersion.title,
      summary: proposalVersion.summary,
      scope: proposalVersion.scope,
      assumptions: JSON.parse(proposalVersion.assumptions),
      dependencies: JSON.parse(proposalVersion.dependencies),
      checksum: proposalVersion.checksum,
    },
  }

  // Save evaluation
  const evaluation = await db.evaluation.create({
    data: {
      mandateVersionId: mandateVersion.id,
      proposalVersionId,
      decisionObject: JSON.stringify(decisionObject),
      inputsSnapshot: JSON.stringify(inputsSnapshot),
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
