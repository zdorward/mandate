import 'dotenv/config'
import { db as prisma } from '../lib/db'
import { computeChecksum } from '../lib/utils/checksum'

async function main() {
  // Clear existing data
  await prisma.auditLog.deleteMany()
  await prisma.overrideDecision.deleteMany()
  await prisma.evaluation.deleteMany()
  await prisma.proposalVersion.deleteMany()
  await prisma.proposal.deleteMany()
  await prisma.mandateVersion.deleteMany()
  await prisma.mandate.deleteMany()
  await prisma.promptVersion.deleteMany()

  // Create Mandate
  const mandate = await prisma.mandate.create({
    data: {
      name: 'Q1 2026 Strategic Mandate',
    },
  })

  // Create MandateVersion with outcomes
  const mandateV1Data = {
    outcomes: [
      'Increase revenue growth by 20%',
      'Expand into new markets',
      'Maintain customer satisfaction above 90%',
      'Keep operational costs flat',
    ],
  }

  await prisma.mandateVersion.create({
    data: {
      mandateId: mandate.id,
      version: 1,
      outcomes: JSON.stringify(mandateV1Data.outcomes),
      checksum: computeChecksum(mandateV1Data),
      isActive: true,
    },
  })

  // Create Proposals (keep the same)
  const proposal1 = await prisma.proposal.create({ data: {} })
  const p1v1Data = {
    title: 'APAC Market Expansion',
    summary: 'Expand operations to Singapore and Japan markets with phased rollout over 6 months.',
    assumptions: [
      'Local partners available for distribution',
      'Product localization can be completed in 3 months',
    ],
    scope: 'Phase 1: Singapore (Month 1-3), Phase 2: Japan (Month 4-6).',
    dependencies: ['Legal team for contracts', 'Product team for localization'],
  }

  await prisma.proposalVersion.create({
    data: {
      proposalId: proposal1.id,
      version: 1,
      title: p1v1Data.title,
      summary: p1v1Data.summary,
      assumptions: JSON.stringify(p1v1Data.assumptions),
      scope: p1v1Data.scope,
      dependencies: JSON.stringify(p1v1Data.dependencies),
      checksum: computeChecksum(p1v1Data),
    },
  })

  const proposal2 = await prisma.proposal.create({ data: {} })
  const p2v1Data = {
    title: 'Operational Efficiency Initiative',
    summary: 'Reduce operational costs by 20% through process automation.',
    assumptions: ['Automation tools can replace 30% of manual processes'],
    scope: 'Q1: Process audit, Q2: Automation implementation.',
    dependencies: ['IT for automation tools'],
  }

  await prisma.proposalVersion.create({
    data: {
      proposalId: proposal2.id,
      version: 1,
      title: p2v1Data.title,
      summary: p2v1Data.summary,
      assumptions: JSON.stringify(p2v1Data.assumptions),
      scope: p2v1Data.scope,
      dependencies: JSON.stringify(p2v1Data.dependencies),
      checksum: computeChecksum(p2v1Data),
    },
  })

  const proposal3 = await prisma.proposal.create({ data: {} })
  const p3v1Data = {
    title: 'Innovation Lab Setup',
    summary: 'Create an innovation lab to explore emerging technologies.',
    assumptions: [],
    scope: 'TBD',
    dependencies: [],
  }

  await prisma.proposalVersion.create({
    data: {
      proposalId: proposal3.id,
      version: 1,
      title: p3v1Data.title,
      summary: p3v1Data.summary,
      assumptions: JSON.stringify(p3v1Data.assumptions),
      scope: p3v1Data.scope,
      dependencies: JSON.stringify(p3v1Data.dependencies),
      checksum: computeChecksum(p3v1Data),
    },
  })

  // Create PromptVersion
  await prisma.promptVersion.create({
    data: {
      name: 'riskDiscovery',
      version: 2,
      template: 'Risk discovery prompt template v2 - outcomes based',
      checksum: computeChecksum({ name: 'riskDiscovery', version: 2 }),
    },
  })

  console.log('Seed completed successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
