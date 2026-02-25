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

  if (loading) return <div>Loading...</div>
  if (!evaluation) return <div>Not found</div>

  const d = evaluation.decisionObject

  const recColor = d.recommendation === 'APPROVE' ? 'bg-green-500' :
                   d.recommendation === 'ESCALATE' ? 'bg-red-500' : 'bg-yellow-500'

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Recommendation Banner */}
        <div className={`${recColor} text-white p-6 rounded-lg`}>
          <div className="text-4xl font-bold">{d.recommendation}</div>
          {d.human_required && (
            <div className="mt-2 text-sm opacity-90">Human review required</div>
          )}
        </div>

        {/* Constraint Violations */}
        {d.constraint_violations.length > 0 && (
          <Alert variant="destructive">
            <AlertTitle>Constraint Violations</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside mt-2">
                {d.constraint_violations.map((v, i) => (
                  <li key={i}>{v}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle>{evaluation.proposalVersion.title}</CardTitle>
            <CardDescription>
              Proposal v{evaluation.proposalVersion.version} evaluated against Mandate v{evaluation.mandateVersion.version}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>{d.summary}</p>

            <div className="flex items-center gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Confidence:</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 cursor-help">
                      <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${d.confidence * 100}%` }} />
                      </div>
                      <span className="font-medium">{(d.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <ul className="text-sm">
                      {d.confidence_reasons.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <span className="text-sm text-muted-foreground">Tradeoff Score:</span>
                <span className="ml-2 font-medium">{(d.tradeoff_score * 100).toFixed(0)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Impact Estimate */}
        <Card>
          <CardHeader>
            <CardTitle>Impact Estimate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(d.impact_estimate).map(([key, value]) => (
                <div key={key} className="text-center p-4 bg-secondary rounded-lg">
                  <div className="text-sm text-muted-foreground capitalize">{key}</div>
                  <div className="font-medium mt-1">{value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top 3 Unseen Risks */}
        <Card>
          <CardHeader>
            <CardTitle>Top 3 Unseen Risks</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2">
              {d.unseen_risks.top_3_unseen_risks.map((r, i) => (
                <li key={i} className="text-sm">{r}</li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* Risk Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { key: 'implicit_assumptions', label: 'Implicit Assumptions' },
              { key: 'second_order_effects', label: 'Second-Order Effects' },
              { key: 'tail_risks', label: 'Tail Risks' },
              { key: 'metric_gaming_vectors', label: 'Metric Gaming Vectors' },
              { key: 'cross_functional_impacts', label: 'Cross-Functional Impacts' },
            ].map(({ key, label }) => {
              const items = d.unseen_risks[key as keyof typeof d.unseen_risks] as RiskItem[]
              return (
                <Collapsible key={key}>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 hover:bg-secondary rounded">
                    <span>{label}</span>
                    <Badge variant="secondary">{items?.length || 0}</Badge>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-4 pt-2">
                    {items?.map((item, i) => (
                      <div key={i} className="py-2 border-b last:border-0">
                        <div className="flex items-center gap-2">
                          <Badge variant={item.severity === 'high' ? 'destructive' : item.severity === 'med' ? 'default' : 'secondary'}>
                            {item.severity}
                          </Badge>
                          <span className="text-sm">{item.risk}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Evidence needed: {item.evidence_needed}
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )
            })}
          </CardContent>
        </Card>

        {/* Required Evidence */}
        <Card>
          <CardHeader>
            <CardTitle>Required Next Evidence</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1">
              {d.required_next_evidence.map((e, i) => (
                <li key={i} className="text-sm">{e}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Override Form */}
        <Card>
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
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={overrideForm.actor}
                onChange={(e) => setOverrideForm({ ...overrideForm, actor: e.target.value })}
                placeholder="jane@company.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Decision</label>
              <Select value={overrideForm.decision} onValueChange={(v) => setOverrideForm({ ...overrideForm, decision: v })}>
                <SelectTrigger>
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
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={overrideForm.rationale}
                onChange={(e) => setOverrideForm({ ...overrideForm, rationale: e.target.value })}
                placeholder="Explain why you are overriding the recommendation..."
              />
            </div>
            <Button
              onClick={submitOverride}
              disabled={submitting || overrideForm.rationale.length < 20}
            >
              {submitting ? 'Submitting...' : 'Submit Override'}
            </Button>
          </CardContent>
        </Card>

        {/* Audit Log */}
        <Card>
          <CardHeader>
            <CardTitle>Audit Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {evaluation.overrides.map((o) => (
                <div key={o.id} className="border-l-2 border-primary pl-4 py-2">
                  <div className="text-sm text-muted-foreground">
                    {new Date(o.createdAt).toLocaleString()}
                  </div>
                  <div className="font-medium">
                    Override: {o.decision} by {o.actor}
                  </div>
                  <div className="text-sm mt-1">
                    Rationale: {o.rationale}
                  </div>
                </div>
              ))}
              <div className="border-l-2 border-secondary pl-4 py-2">
                <div className="text-sm text-muted-foreground">
                  {new Date(evaluation.createdAt).toLocaleString()}
                </div>
                <div className="font-medium">Evaluation created (system)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}
