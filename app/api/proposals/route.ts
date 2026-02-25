import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { computeChecksum } from '@/lib/utils/checksum'
import { z } from 'zod'

const CreateProposalSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  scope: z.string().min(1),
  assumptions: z.array(z.string()),
  dependencies: z.array(z.string()),
})

export async function GET() {
  const proposals = await db.proposal.findMany({
    include: {
      versions: {
        orderBy: { version: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(proposals)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = CreateProposalSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  const { title, summary, scope, assumptions, dependencies } = parsed.data

  const proposal = await db.proposal.create({ data: {} })

  const versionData = { title, summary, scope, assumptions, dependencies }

  const version = await db.proposalVersion.create({
    data: {
      proposalId: proposal.id,
      version: 1,
      title,
      summary,
      scope,
      assumptions: JSON.stringify(assumptions),
      dependencies: JSON.stringify(dependencies),
      checksum: computeChecksum(versionData),
    },
  })

  await db.auditLog.create({
    data: {
      actor: 'system',
      action: 'CREATE',
      entityType: 'Proposal',
      entityId: proposal.id,
      after: JSON.stringify(versionData),
    },
  })

  return NextResponse.json({ proposal, version })
}
