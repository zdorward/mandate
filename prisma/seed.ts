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

  // Create MandateVersion with task and outcomes
  const mandateV1Data = {
    task: 'Reduce account takeover (ATO) fraud losses by 60% in Q1 2026 without increasing false positive rate above 2% or degrading legitimate user login experience.',
    outcomes: [
      'Reduce ATO fraud losses from $120K/month to under $50K/month',
      'Block 95%+ of credential stuffing attempts at login',
      'Keep false positive rate under 2% (legitimate users incorrectly blocked)',
      'Maintain login success rate above 98% for legitimate users',
      'Ship new device fingerprinting system by Feb 15',
    ],
  }

  await prisma.mandateVersion.create({
    data: {
      mandateId: mandate.id,
      version: 1,
      task: mandateV1Data.task,
      outcomes: JSON.stringify(mandateV1Data.outcomes),
      checksum: computeChecksum(mandateV1Data),
      isActive: true,
    },
  })

  // Create Proposals aligned with fraud prevention mandate
  const proposal1 = await prisma.proposal.create({ data: {} })
  const p1v1Data = {
    title: 'Device Fingerprinting Integration',
    summary: 'Integrate FingerprintJS Pro to create persistent device identifiers across sessions. Expected to block 80% of credential stuffing by identifying known bad devices before login attempt completes.',
    assumptions: [
      'FingerprintJS Pro API latency stays under 100ms p99',
      'Device fingerprint stability is 95%+ across browser updates',
      'We can build the integration with 2 engineers in 3 weeks',
    ],
    scope: 'Week 1-2: SDK integration and device ID storage. Week 3: Risk scoring integration. Week 4: Shadow mode testing. Week 5: Gradual rollout.',
    dependencies: ['Platform team for SDK integration', 'Data team for fingerprint storage', 'Security review for PII implications'],
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
    title: 'Adaptive MFA Step-Up',
    summary: 'Implement risk-based MFA that only triggers step-up authentication for suspicious logins. Reduces friction for 95% of legitimate users while adding a hard block for high-risk attempts.',
    assumptions: [
      'Risk model can achieve 90% precision on high-risk classification',
      'SMS OTP delivery rate stays above 98%',
      'Users will tolerate step-up if it feels justified (new device, unusual location)',
    ],
    scope: 'Phase 1: Risk scoring model (2 weeks). Phase 2: Step-up flow UI/UX (2 weeks). Phase 3: Gradual rollout with 1%/10%/50%/100% ramp.',
    dependencies: ['ML team for risk model', 'Mobile team for push notification fallback', 'Twilio for SMS capacity'],
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
    title: 'Credential Stuffing Rate Limiter',
    summary: 'Deploy IP-based and account-based rate limiting at the edge (Cloudflare) to block brute force attempts. Aggressive limits: 5 failed attempts per IP per minute, 10 per account per hour.',
    assumptions: [
      'Cloudflare Workers can handle rate limit logic at edge without latency impact',
      'Shared IP (corporate NAT) users represent less than 3% of logins',
      'Attack patterns show 100+ attempts per minute from single IPs',
    ],
    scope: 'Week 1: Cloudflare Worker implementation. Week 2: Shadow mode logging. Week 3: Production deployment with bypass for allowlisted IPs.',
    dependencies: ['Infrastructure team for Cloudflare config', 'Support team for false positive escalation path'],
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
