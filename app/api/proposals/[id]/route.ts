import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { computeChecksum } from '@/lib/utils/checksum'
import { z } from 'zod'

const CreateVersionSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  scope: z.string().min(1),
  assumptions: z.array(z.string()),
  dependencies: z.array(z.string()),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const proposal = await db.proposal.findUnique({
    where: { id },
    include: {
      versions: {
        orderBy: { version: 'desc' },
        include: {
          evaluations: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      },
    },
  })

  if (!proposal) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(proposal)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const parsed = CreateVersionSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  const { title, summary, scope, assumptions, dependencies } = parsed.data

  const lastVersion = await db.proposalVersion.findFirst({
    where: { proposalId: id },
    orderBy: { version: 'desc' },
  })

  const nextVersion = (lastVersion?.version || 0) + 1
  const versionData = { title, summary, scope, assumptions, dependencies }

  const version = await db.proposalVersion.create({
    data: {
      proposalId: id,
      version: nextVersion,
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
      entityType: 'ProposalVersion',
      entityId: version.id,
      after: JSON.stringify(versionData),
    },
  })

  return NextResponse.json(version)
}
