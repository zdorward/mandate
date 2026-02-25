import 'dotenv/config'
import { db as prisma } from '../lib/db'
import { evaluateProposal } from '../lib/engine/pipeline'

async function main() {
  const args = process.argv.slice(2)
  const proposalIdArg = args.find(a => a.startsWith('--proposal='))
  const specificProposalId = proposalIdArg?.split('=')[1]

  console.log('='.repeat(60))
  console.log('MANDATE EVALUATION HARNESS')
  console.log('='.repeat(60))

  // Get active mandate
  const mandateVersion = await prisma.mandateVersion.findFirst({
    where: { isActive: true },
  })

  if (!mandateVersion) {
    console.error('ERROR: No active mandate version')
    process.exit(1)
  }

  // Parse outcomes (handle both new and old format)
  let outcomes: string[] = []
  if (mandateVersion.outcomes) {
    outcomes = JSON.parse(mandateVersion.outcomes)
  } else if (mandateVersion.weights) {
    const weights = JSON.parse(mandateVersion.weights)
    outcomes = Object.entries(weights)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .map(([key]) => `Prioritize ${key}`)
  }

  console.log(`Using Mandate v${mandateVersion.version}`)
  console.log(`Outcomes: ${outcomes.length}`)
  console.log('')

  // Get proposals
  const proposals = await prisma.proposal.findMany({
    where: specificProposalId ? { id: specificProposalId } : undefined,
    include: {
      versions: {
        orderBy: { version: 'desc' },
        take: 1,
      },
    },
  })

  if (proposals.length === 0) {
    console.error('ERROR: No proposals found')
    process.exit(1)
  }

  let allPassed = true

  for (const proposal of proposals) {
    const version = proposal.versions[0]
    if (!version) continue

    console.log('-'.repeat(60))
    console.log(`PROPOSAL: ${version.title}`)
    console.log('-'.repeat(60))

    try {
      const { decisionObject, trace } = await evaluateProposal({
        mandate: { outcomes },
        proposal: {
          title: version.title,
          summary: version.summary,
          scope: version.scope,
          assumptions: JSON.parse(version.assumptions),
          dependencies: JSON.parse(version.dependencies),
        },
      })

      console.log('')
      console.log(`Recommendation: ${decisionObject.recommendation}`)
      console.log(`Human Required: ${decisionObject.human_required}`)
      console.log(`Confidence: ${(decisionObject.confidence * 100).toFixed(0)}%`)

      if (decisionObject.outcomes.length > 0) {
        console.log('')
        console.log('EVALUATED AGAINST:')
        decisionObject.outcomes.forEach((o, i) => console.log(`  ${i + 1}. ${o}`))
      }

      // Check escalation triggers
      const triggers: string[] = []
      if (decisionObject.confidence < 0.4) triggers.push('low_confidence')
      if (decisionObject.unseen_risks.tail_risks?.some(r => r.severity === 'high')) {
        triggers.push('high_severity_tail_risk')
      }
      if (decisionObject.unseen_risks.implicit_assumptions?.some(r => r.severity === 'high')) {
        triggers.push('high_severity_assumption')
      }

      if (triggers.length > 0) {
        console.log('')
        console.log('ESCALATION TRIGGERS:')
        triggers.forEach(t => console.log(`  - ${t}`))
      }

      console.log('')
      console.log(`Model: ${trace.model} (${trace.latencyMs}ms)`)
      if (trace.failures.length > 0) {
        console.log('FAILURES:')
        trace.failures.forEach(f => console.log(`  - ${f.stage}: ${f.error}`))
      }

    } catch (error) {
      console.log('EVALUATION FAILED:', error)
      allPassed = false
    }

    console.log('')
  }

  console.log('='.repeat(60))
  console.log(allPassed ? 'ALL EVALUATIONS PASSED' : 'SOME EVALUATIONS FAILED')
  console.log('='.repeat(60))

  process.exit(allPassed ? 0 : 1)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
