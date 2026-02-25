'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface RiskItem {
  risk: string
  severity: 'low' | 'med' | 'high'
  evidence_needed: string
}

interface DecisionObject {
  summary: string
  impact_estimate: { growth: string; cost: string; risk: string; brand: string }
  tradeoff_score: number
  conflicts: string[]
  constraint_violations: string[]
  unseen_risks: {
    implicit_assumptions: RiskItem[]
    second_order_effects: RiskItem[]
    tail_risks: RiskItem[]
    metric_gaming_vectors: RiskItem[]
    cross_functional_impacts: RiskItem[]
    top_3_unseen_risks: string[]
    data_to_collect_next: string[]
  }
  confidence: number
  confidence_reasons: string[]
  required_next_evidence: string[]
  recommendation: 'APPROVE' | 'REVISE' | 'ESCALATE'
  human_required: boolean
}

interface Override {
  id: string
  actor: string
  decision: string
  rationale: string
  createdAt: string
}

interface AuditLog {
  id: string
  actor: string
  action: string
  rationale?: string
  createdAt: string
}

interface Evaluation {
  id: string
  decisionObject: DecisionObject
  proposalVersion: { title: string; version: number }
  mandateVersion: { version: number }
  overrides: Override[]
  auditLogs: AuditLog[]
  createdAt: string
}

export default function EvaluationPage() {
  const params = useParams()
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [loading, setLoading] = useState(true)
  const [overrideForm, setOverrideForm] = useState({ decision: '', rationale: '', actor: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchEvaluation()
  }, [params.id])

  async function fetchEvaluation() {
    const res = await fetch(`/api/evaluations/${params.id}`)
    const data = await res.json()
    setEvaluation(data)
    setLoading(false)
  }

  async function submitOverride() {
    if (!overrideForm.decision || !overrideForm.rationale || !overrideForm.actor) return
    setSubmitting(true)
    await fetch('/api/override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evaluationId: params.id,
        ...overrideForm,
      }),
    })
    setOverrideForm({ decision: '', rationale: '', actor: '' })
    await fetchEvaluation()
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }
  if (!evaluation) return <div>Not found</div>

  const d = evaluation.decisionObject

  const recStyles = {
    APPROVE: 'bg-emerald-50 border-emerald-300 text-emerald-700',
    ESCALATE: 'bg-red-50 border-red-300 text-red-700',
    REVISE: 'bg-amber-50 border-amber-300 text-amber-700',
  }

  return (
    <TooltipProvider>
      <div className="space-y-8 pb-12">
        {/* Recommendation Banner */}
        <div className={`border-2 p-8 rounded-xl ${recStyles[d.recommendation]}`}>
          <div className="text-sm font-medium uppercase tracking-wider opacity-70 mb-2">System Recommendation</div>
          <div className="text-5xl font-bold tracking-tight">{d.recommendation}</div>
          {d.human_required && (
            <div className="mt-3 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-current"></span>
              </span>
              <span className="text-sm font-medium">Human review required</span>
            </div>
          )}
        </div>

        {/* Constraint Violations */}
        {d.constraint_violations.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-center gap-2 text-red-700 font-semibold mb-3">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Constraint Violations
            </div>
            <ul className="space-y-2">
              {d.constraint_violations.map((v, i) => (
                <li key={i} className="text-red-600 text-sm flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  {v}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Summary Card */}
        <Card className="bg-white border-border">
          <CardHeader>
            <CardTitle className="text-2xl">{evaluation.proposalVersion.title}</CardTitle>
            <CardDescription>
              Proposal v{evaluation.proposalVersion.version} • Mandate v{evaluation.mandateVersion.version}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground leading-relaxed">{d.summary}</p>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">Confidence</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${d.confidence * 100}%` }}
                          />
                        </div>
                        <span className="font-semibold text-lg">{(d.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <ul className="text-sm space-y-1">
                      {d.confidence_reasons.map((r, i) => <li key={i}>• {r}</li>)}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">Tradeoff Score</span>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${d.tradeoff_score * 100}%` }}
                    />
                  </div>
                  <span className="font-semibold text-lg">{(d.tradeoff_score * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Impact Estimate */}
        <Card className="bg-white border-border">
          <CardHeader>
            <CardTitle>Impact Estimate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(d.impact_estimate).map(([key, value]) => (
                <div key={key} className="text-center p-5 bg-secondary rounded-xl border border-border">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{key}</div>
                  <div className="font-semibold text-lg">{value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top 3 Unseen Risks */}
        <Card className="bg-amber-50/50 border-amber-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <CardTitle>Top 3 Unseen Risks</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {d.unseen_risks.top_3_unseen_risks.map((r, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">{i + 1}</span>
                  <span className="text-sm leading-relaxed text-foreground">{r}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* Risk Categories */}
        <Card className="bg-white border-border">
          <CardHeader>
            <CardTitle>Risk Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {[
              { key: 'implicit_assumptions', label: 'Implicit Assumptions' },
              { key: 'second_order_effects', label: 'Second-Order Effects' },
              { key: 'tail_risks', label: 'Tail Risks' },
              { key: 'metric_gaming_vectors', label: 'Metric Gaming Vectors' },
              { key: 'cross_functional_impacts', label: 'Cross-Functional Impacts' },
            ].map(({ key, label }) => {
              const items = d.unseen_risks[key as keyof typeof d.unseen_risks] as RiskItem[]
              const hasHighSeverity = items?.some(i => i.severity === 'high')
              return (
                <Collapsible key={key}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-secondary rounded-lg transition-colors cursor-pointer">
                    <span className="font-medium">{label}</span>
                    <div className="flex items-center gap-2">
                      {hasHighSeverity && (
                        <span className="h-2 w-2 rounded-full bg-red-500"></span>
                      )}
                      <Badge variant="secondary" className="bg-muted">{items?.length || 0}</Badge>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-3 pb-3">
                    <div className="space-y-3 pt-2">
                      {items?.map((item, i) => (
                        <div key={i} className="bg-muted/30 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <Badge
                              className={
                                item.severity === 'high' ? 'bg-red-100 text-red-700 border-red-200' :
                                item.severity === 'med' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                'bg-muted text-muted-foreground'
                              }
                            >
                              {item.severity}
                            </Badge>
                            <span className="text-sm">{item.risk}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-2 pl-1">
                            <span className="text-muted-foreground/70">Evidence needed:</span> {item.evidence_needed}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )
            })}
          </CardContent>
        </Card>

        {/* Required Evidence */}
        <Card className="bg-white border-border">
          <CardHeader>
            <CardTitle>Required Next Evidence</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {d.required_next_evidence.map((e, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-1">→</span>
                  <span className="text-muted-foreground">{e}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Override Form */}
        <Card className="bg-white border-border">
          <CardHeader>
            <CardTitle>Override Decision</CardTitle>
            <CardDescription>
              Provide justification to override the system recommendation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Name</label>
              <input
                className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                value={overrideForm.actor}
                onChange={(e) => setOverrideForm({ ...overrideForm, actor: e.target.value })}
                placeholder="jane@company.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Decision</label>
              <Select value={overrideForm.decision} onValueChange={(v) => setOverrideForm({ ...overrideForm, decision: v })}>
                <SelectTrigger className="rounded-xl bg-secondary border-border h-12 cursor-pointer">
                  <SelectValue placeholder="Select decision" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="APPROVE">Approve</SelectItem>
                  <SelectItem value="REJECT">Reject</SelectItem>
                  <SelectItem value="ESCALATE">Escalate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Rationale (min 20 characters)</label>
              <textarea
                className="w-full min-h-[120px] rounded-xl border border-border bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors resize-none"
                value={overrideForm.rationale}
                onChange={(e) => setOverrideForm({ ...overrideForm, rationale: e.target.value })}
                placeholder="Explain why you are overriding the recommendation..."
              />
            </div>
            <Button
              onClick={submitOverride}
              disabled={submitting || overrideForm.rationale.length < 20}
              className="bg-foreground hover:bg-foreground/90 text-background rounded-xl h-12 px-6 cursor-pointer"
            >
              {submitting ? 'Submitting...' : 'Submit Override'}
            </Button>
          </CardContent>
        </Card>

        {/* Audit Log */}
        <Card className="bg-white border-border">
          <CardHeader>
            <CardTitle>Audit Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {evaluation.overrides.map((o) => (
                <div key={o.id} className="border-l-2 border-primary pl-4 py-3 bg-primary/5 rounded-r-lg">
                  <div className="text-xs text-muted-foreground">
                    {new Date(o.createdAt).toLocaleString()}
                  </div>
                  <div className="font-medium mt-1">
                    Override: <span className="text-primary">{o.decision}</span> by {o.actor}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {o.rationale}
                  </div>
                </div>
              ))}
              <div className="border-l-2 border-muted pl-4 py-3">
                <div className="text-xs text-muted-foreground">
                  {new Date(evaluation.createdAt).toLocaleString()}
                </div>
                <div className="font-medium mt-1 text-muted-foreground">Evaluation created</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}
