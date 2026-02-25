import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { computeChecksum } from '@/lib/utils/checksum'
import { OutcomesSchema } from '@/lib/ai/schemas'
import { z } from 'zod'

const CreateMandateVersionSchema = z.object({
  mandateId: z.string(),
  outcomes: OutcomesSchema,
})

export async function GET() {
  const mandates = await db.mandate.findMany({
    include: {
      versions: {
        orderBy: { version: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(mandates)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = CreateMandateVersionSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  const { mandateId, outcomes } = parsed.data

  // Get next version number
  const lastVersion = await db.mandateVersion.findFirst({
    where: { mandateId },
    orderBy: { version: 'desc' },
  })

  const nextVersion = (lastVersion?.version || 0) + 1

  const versionData = { outcomes }

  // Deactivate current active version
  await db.mandateVersion.updateMany({
    where: { mandateId, isActive: true },
    data: { isActive: false },
  })

  const newVersion = await db.mandateVersion.create({
    data: {
      mandateId,
      version: nextVersion,
      outcomes: JSON.stringify(outcomes),
      checksum: computeChecksum(versionData),
      isActive: true, // New version is immediately active
    },
  })

  await db.auditLog.create({
    data: {
      actor: 'system',
      action: 'CREATE',
      entityType: 'MandateVersion',
      entityId: newVersion.id,
      after: JSON.stringify(versionData),
    },
  })

  return NextResponse.json(newVersion)
}

export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { versionId, activate } = body

  if (activate) {
    const version = await db.mandateVersion.findUnique({
      where: { id: versionId },
    })

    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    }

    await db.mandateVersion.updateMany({
      where: { mandateId: version.mandateId },
      data: { isActive: false },
    })

    await db.mandateVersion.update({
      where: { id: versionId },
      data: { isActive: true },
    })

    await db.auditLog.create({
      data: {
        actor: 'system',
        action: 'ACTIVATE',
        entityType: 'MandateVersion',
        entityId: versionId,
      },
    })

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid operation' }, { status: 400 })
}
