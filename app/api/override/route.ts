import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const OverrideSchema = z.object({
  evaluationId: z.string(),
  actor: z.string().min(1),
  decision: z.enum(['APPROVE', 'REJECT', 'ESCALATE']),
  rationale: z.string().min(20, 'Rationale must be at least 20 characters'),
})

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = OverrideSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  const { evaluationId, actor, decision, rationale } = parsed.data

  const evaluation = await db.evaluation.findUnique({
    where: { id: evaluationId },
  })

  if (!evaluation) {
    return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 })
  }

  const before = JSON.parse(evaluation.decisionObject)

  const override = await db.overrideDecision.create({
    data: {
      evaluationId,
      actor,
      decision,
      rationale,
    },
  })

  await db.auditLog.create({
    data: {
      actor,
      action: 'OVERRIDE',
      entityType: 'OverrideDecision',
      entityId: override.id,
      before: JSON.stringify({ recommendation: before.recommendation }),
      after: JSON.stringify({ decision }),
      rationale,
    },
  })

  return NextResponse.json(override)
}
