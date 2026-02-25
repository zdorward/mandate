import type { RiskDiscoveryOutput } from './schemas'

export function getMockRisks(proposalTitle: string, proposalSummary: string): RiskDiscoveryOutput {
  const text = `${proposalTitle} ${proposalSummary}`.toLowerCase()

  if (text.includes('expansion') || text.includes('market') || text.includes('apac') || text.includes('region')) {
    return getExpansionRisks()
  }

  if (text.includes('cost') || text.includes('cut') || text.includes('reduce') || text.includes('efficiency')) {
    return getCostCuttingRisks()
  }

  if (text.includes('tech') || text.includes('infrastructure') || text.includes('platform')) {
    return getTechRisks()
  }

  return getGenericRisks()
}

function getExpansionRisks(): RiskDiscoveryOutput {
  return {
    implicit_assumptions: [
      { risk: 'Assumes local market dynamics mirror domestic patterns', severity: 'high', evidence_needed: 'Market research from target region' },
      { risk: 'Assumes existing supply chain can scale to new regions', severity: 'med', evidence_needed: 'Logistics feasibility study' },
    ],
    second_order_effects: [
      { risk: 'May trigger competitive response from regional incumbents', severity: 'high', evidence_needed: 'Competitive landscape analysis' },
      { risk: 'Could strain existing customer support capacity', severity: 'med', evidence_needed: 'Support ticket volume projections' },
    ],
    tail_risks: [
      { risk: 'Regulatory changes in target region could block market entry', severity: 'high', evidence_needed: 'Regulatory risk assessment' },
      { risk: 'Currency fluctuations could erode margins by 20%+', severity: 'med', evidence_needed: 'FX sensitivity analysis' },
    ],
    metric_gaming_vectors: [
      { risk: 'Teams may count soft launches as expansion wins', severity: 'low', evidence_needed: 'Clear success metric definitions' },
    ],
    cross_functional_impacts: [
      { risk: 'Legal team capacity for international contracts', severity: 'med', evidence_needed: 'Legal team capacity assessment' },
      { risk: 'HR may lack international hiring expertise', severity: 'med', evidence_needed: 'HR international readiness check' },
    ],
    top_3_unseen_risks: [
      'Regional competitors may respond with aggressive pricing war',
      'Supply chain partners may lack required regional certifications',
      'Cultural differences could affect product-market fit',
    ],
    data_to_collect_next: [
      'Validate partner certifications in target region',
      'Get treasury sign-off on FX exposure limits',
      'Survey existing customers about regional expansion interest',
    ],
  }
}

function getCostCuttingRisks(): RiskDiscoveryOutput {
  return {
    implicit_assumptions: [
      { risk: "Assumes cost cuts won't impact service quality", severity: 'high', evidence_needed: 'Quality baseline metrics' },
      { risk: 'Assumes affected teams will maintain productivity', severity: 'med', evidence_needed: 'Change management assessment' },
    ],
    second_order_effects: [
      { risk: 'Key talent may leave proactively', severity: 'high', evidence_needed: 'Retention risk assessment' },
      { risk: 'Vendor relationships may deteriorate', severity: 'med', evidence_needed: 'Vendor dependency mapping' },
    ],
    tail_risks: [
      { risk: 'Morale collapse could cascade across organization', severity: 'high', evidence_needed: 'Employee sentiment data' },
      { risk: 'Critical institutional knowledge may be lost', severity: 'med', evidence_needed: 'Knowledge transfer audit' },
    ],
    metric_gaming_vectors: [
      { risk: 'Short-term savings may hide long-term capability loss', severity: 'high', evidence_needed: 'Capability impact assessment' },
    ],
    cross_functional_impacts: [
      { risk: 'PR/communications burden during restructuring', severity: 'med', evidence_needed: 'Communications plan' },
      { risk: 'Legal review needed for any workforce changes', severity: 'med', evidence_needed: 'Legal compliance checklist' },
    ],
    top_3_unseen_risks: [
      'Competitors may poach talent during transition',
      'Customer perception of instability could affect renewals',
      'Hidden dependencies on roles being eliminated',
    ],
    data_to_collect_next: [
      'Map critical dependencies for each affected role',
      'Assess competitor hiring activity',
      'Survey customer sentiment baseline',
    ],
  }
}

function getTechRisks(): RiskDiscoveryOutput {
  return {
    implicit_assumptions: [
      { risk: 'Assumes current team has required technical skills', severity: 'med', evidence_needed: 'Skills gap analysis' },
      { risk: 'Assumes integration with existing systems is straightforward', severity: 'high', evidence_needed: 'Technical architecture review' },
    ],
    second_order_effects: [
      { risk: 'New tech may require retraining across organization', severity: 'med', evidence_needed: 'Training needs assessment' },
      { risk: 'Legacy system deprecation timeline may be unrealistic', severity: 'med', evidence_needed: 'Migration complexity analysis' },
    ],
    tail_risks: [
      { risk: 'Vendor lock-in could limit future flexibility', severity: 'med', evidence_needed: 'Vendor exit strategy' },
      { risk: 'Security vulnerabilities in new stack unknown', severity: 'high', evidence_needed: 'Security audit plan' },
    ],
    metric_gaming_vectors: [
      { risk: 'Performance benchmarks may not reflect production load', severity: 'med', evidence_needed: 'Realistic load testing plan' },
    ],
    cross_functional_impacts: [
      { risk: 'Operations team needs new monitoring capabilities', severity: 'med', evidence_needed: 'Ops readiness checklist' },
      { risk: 'Compliance requirements for new data flows', severity: 'med', evidence_needed: 'Compliance review' },
    ],
    top_3_unseen_risks: [
      'Integration complexity often 3x initial estimates',
      'Key technical staff may resist change',
      'Hidden data migration costs',
    ],
    data_to_collect_next: [
      'Conduct proof-of-concept with production-like data',
      'Map all integration points with existing systems',
      'Assess team technical readiness',
    ],
  }
}

function getGenericRisks(): RiskDiscoveryOutput {
  return {
    implicit_assumptions: [
      { risk: 'Timeline assumes no competing priorities emerge', severity: 'med', evidence_needed: 'Resource allocation confirmation' },
      { risk: 'Budget estimates may not include hidden costs', severity: 'med', evidence_needed: 'Detailed cost breakdown' },
    ],
    second_order_effects: [
      { risk: 'Success may create expectations for similar initiatives', severity: 'low', evidence_needed: 'Capacity planning' },
      { risk: 'Failure could affect team credibility for future proposals', severity: 'med', evidence_needed: 'Risk mitigation plan' },
    ],
    tail_risks: [
      { risk: 'External market conditions could invalidate assumptions', severity: 'med', evidence_needed: 'Market monitoring plan' },
    ],
    metric_gaming_vectors: [
      { risk: 'Success metrics may be cherry-picked post-hoc', severity: 'low', evidence_needed: 'Pre-registered success criteria' },
    ],
    cross_functional_impacts: [
      { risk: 'Other teams may have unstated dependencies', severity: 'med', evidence_needed: 'Cross-team dependency mapping' },
    ],
    top_3_unseen_risks: [
      'Stakeholder alignment may be shallower than assumed',
      'Resource availability may shift mid-project',
      'Scope creep risk not explicitly managed',
    ],
    data_to_collect_next: [
      'Confirm stakeholder commitment in writing',
      'Validate resource availability with managers',
      'Define explicit scope boundaries',
    ],
  }
}

export function getMockTrace() {
  return {
    provider: 'mock',
    model: 'demo-mode',
    promptVersionId: 'mock-v1',
    latencyMs: 50,
    failures: [],
  }
}
