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

  // Create MandateVersions
  const mandateV1Data = {
    weights: { growth: 0.4, cost: 0.2, risk: 0.3, brand: 0.1 },
    riskTolerance: 'MODERATE',
    nonNegotiables: ['No layoffs', 'Budget must not exceed $500k'],
  }

  await prisma.mandateVersion.create({
    data: {
      mandateId: mandate.id,
      version: 1,
      weights: JSON.stringify(mandateV1Data.weights),
      riskTolerance: mandateV1Data.riskTolerance,
      nonNegotiables: JSON.stringify(mandateV1Data.nonNegotiables),
      checksum: computeChecksum(mandateV1Data),
      isActive: false,
    },
  })

  const mandateV2Data = {
    weights: { growth: 0.5, cost: 0.15, risk: 0.25, brand: 0.1 },
    riskTolerance: 'MODERATE',
    nonNegotiables: ['No layoffs', 'Budget must not exceed $750k', 'Data privacy must be maintained'],
  }

  await prisma.mandateVersion.create({
    data: {
      mandateId: mandate.id,
      version: 2,
      weights: JSON.stringify(mandateV2Data.weights),
      riskTolerance: mandateV2Data.riskTolerance,
      nonNegotiables: JSON.stringify(mandateV2Data.nonNegotiables),
      checksum: computeChecksum(mandateV2Data),
      isActive: true,
    },
  })

  // Create Proposals
  // Proposal 1: APAC Expansion (should APPROVE)
  const proposal1 = await prisma.proposal.create({ data: {} })
  const p1v1Data = {
    title: 'APAC Market Expansion',
    summary: 'Expand operations to Singapore and Japan markets with phased rollout over 6 months. Initial focus on enterprise customers.',
    assumptions: [
      'Local partners available for distribution',
      'Product localization can be completed in 3 months',
      'Regulatory approval timeline is 2 months',
    ],
    scope: 'Phase 1: Singapore (Month 1-3), Phase 2: Japan (Month 4-6). Includes local hiring, partner agreements, and marketing launch.',
    dependencies: ['Legal team for contracts', 'Product team for localization', 'Finance for FX management'],
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

  // Proposal 2: Cost Cutting (should ESCALATE - violates constraint)
  const proposal2 = await prisma.proposal.create({ data: {} })
  const p2v1Data = {
    title: 'Operational Efficiency Initiative',
    summary: 'Reduce operational costs by 20% through process automation and workforce optimization including targeted layoffs.',
    assumptions: [
      'Automation tools can replace 30% of manual processes',
      'Affected employees can be retrained or transitioned',
    ],
    scope: 'Q1: Process audit, Q2: Automation implementation, Q3: Workforce restructuring with layoffs in underperforming units.',
    dependencies: ['HR for workforce planning', 'IT for automation tools', 'Legal for compliance'],
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

  // Proposal 3: Vague R&D (should ESCALATE - low confidence)
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
      version: 1,
      template: 'Risk discovery prompt template v1',
      checksum: computeChecksum({ name: 'riskDiscovery', version: 1 }),
    },
  })

  console.log('Seed completed successfully')
  console.log(`Created mandate: ${mandate.id}`)
  console.log(`Created proposals: ${proposal1.id}, ${proposal2.id}, ${proposal3.id}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
