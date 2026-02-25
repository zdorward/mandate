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

  // Create Proposals aligned with mandate outcomes
  const proposal1 = await prisma.proposal.create({ data: {} })
  const p1v1Data = {
    title: 'Premium Enterprise Tier Launch',
    summary: 'Launch a premium enterprise tier priced at 3x current pricing, targeting Fortune 500 companies. Projected to drive 25% revenue increase with minimal additional operational cost.',
    assumptions: [
      'Enterprise customers will pay premium for dedicated support and SLAs',
      'Existing infrastructure can handle enterprise workloads',
      'Sales team can close 10 enterprise deals in Q1',
    ],
    scope: 'Month 1: Product packaging and pricing. Month 2: Sales enablement and marketing. Month 3-6: Enterprise sales push.',
    dependencies: ['Product team for enterprise features', 'Legal for enterprise contracts', 'Support team for SLA commitments'],
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
    title: 'APAC Market Expansion',
    summary: 'Expand into Singapore and Japan markets to capture $50M addressable market. Partner-led model keeps operational costs flat while projecting 15% revenue growth contribution.',
    assumptions: [
      'Local distribution partners available in both markets',
      'Product localization achievable within existing engineering budget',
      'Customer satisfaction standards can be maintained via partner training',
    ],
    scope: 'Phase 1: Singapore launch (Month 1-3). Phase 2: Japan launch (Month 4-6). Partner support model maintains 90%+ CSAT.',
    dependencies: ['Legal team for partner contracts', 'Product team for localization', 'Customer success for partner training'],
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
    title: 'Customer Success Platform Investment',
    summary: 'Build proactive customer health monitoring to improve retention and drive CSAT from 88% to 95%. Reduces churn-related revenue loss by $2M annually.',
    assumptions: [
      'Churn is primarily driven by lack of proactive engagement',
      'Health scoring model can predict at-risk accounts 30 days early',
      'Platform can be built with existing team (no new headcount)',
    ],
    scope: 'Q1: Health scoring MVP. Q2: Automated intervention workflows. Ongoing: Measure impact on CSAT and retention.',
    dependencies: ['Data team for health scoring model', 'Engineering for platform build', 'Customer success for workflow design'],
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
