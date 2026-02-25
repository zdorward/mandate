import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const evaluation = await db.evaluation.findUnique({
    where: { id },
    include: {
      mandateVersion: {
        include: { mandate: true },
      },
      proposalVersion: {
        include: { proposal: true },
      },
      overrides: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!evaluation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Get audit logs for this evaluation
  const auditLogs = await db.auditLog.findMany({
    where: {
      OR: [
        { entityType: 'Evaluation', entityId: id },
        { entityType: 'OverrideDecision', entityId: { in: evaluation.overrides.map(o => o.id) } },
      ],
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({
    ...evaluation,
    decisionObject: JSON.parse(evaluation.decisionObject),
    inputsSnapshot: JSON.parse(evaluation.inputsSnapshot),
    modelTrace: JSON.parse(evaluation.modelTrace),
    auditLogs,
  })
}
