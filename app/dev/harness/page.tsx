'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

interface Proposal {
  id: string
  versions: Array<{ id: string; version: number; title: string }>
}

interface EvaluationResult {
  valid: boolean
  errors: string[]
  recommendation: string
  humanRequired: boolean
  confidence: number
  constraintViolations: string[]
  escalationTriggers: string[]
  raw: unknown
}

export default function HarnessPage() {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [selectedProposalId, setSelectedProposalId] = useState('')
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<EvaluationResult | null>(null)

  useEffect(() => {
    fetchProposals()
  }, [])

  async function fetchProposals() {
    const res = await fetch('/api/proposals')
    const data = await res.json()
    setProposals(data)
    setLoading(false)
  }

  async function runEvaluation() {
    const proposal = proposals.find(p => p.id === selectedProposalId)
    if (!proposal || !proposal.versions[0]) return

    setRunning(true)
    setResult(null)

    try {
      const res = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalVersionId: proposal.versions[0].id }),
      })

      const data = await res.json()

      if (!res.ok) {
        setResult({
          valid: false,
          errors: [data.error || 'Unknown error'],
          recommendation: '',
          humanRequired: false,
          confidence: 0,
          constraintViolations: [],
          escalationTriggers: [],
          raw: data,
        })
      } else {
        const d = data.decisionObject
        const escalationTriggers: string[] = []

        if (d.constraint_violations.length > 0) {
          escalationTriggers.push('Constraint violations')
        }
        if (d.confidence < 0.4) {
          escalationTriggers.push('Low confidence')
        }
        if (d.unseen_risks.tail_risks?.some((r: { severity: string }) => r.severity === 'high')) {
          escalationTriggers.push('High-severity tail risk')
        }

        setResult({
          valid: true,
          errors: [],
          recommendation: d.recommendation,
          humanRequired: d.human_required,
          confidence: d.confidence,
          constraintViolations: d.constraint_violations,
          escalationTriggers,
          raw: d,
        })
      }
    } catch (e) {
      setResult({
        valid: false,
        errors: [String(e)],
        recommendation: '',
        humanRequired: false,
        confidence: 0,
        constraintViolations: [],
        escalationTriggers: [],
        raw: null,
      })
    }

    setRunning(false)
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Evaluation Harness</h1>
        <p className="text-muted-foreground mt-2">
          Test evaluation pipeline on seeded proposals
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Run Evaluation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Select value={selectedProposalId} onValueChange={setSelectedProposalId}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select proposal" />
              </SelectTrigger>
              <SelectContent>
                {proposals.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.versions[0]?.title || 'Untitled'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={runEvaluation} disabled={!selectedProposalId || running}>
              {running ? 'Running...' : 'Run Evaluation'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Result
              {result.valid ? (
                <Badge variant="default">Valid</Badge>
              ) : (
                <Badge variant="destructive">Invalid</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.errors.length > 0 && (
              <div className="text-destructive">
                <strong>Errors:</strong>
                <ul className="list-disc list-inside">
                  {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}

            {result.valid && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Recommendation</span>
                    <div className="font-bold text-lg">{result.recommendation}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Human Required</span>
                    <div className="font-bold text-lg">{result.humanRequired ? 'Yes' : 'No'}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Confidence</span>
                    <div className="font-bold text-lg">{(result.confidence * 100).toFixed(0)}%</div>
                  </div>
                </div>

                {result.constraintViolations.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">Constraint Violations</span>
                    <ul className="list-disc list-inside text-destructive">
                      {result.constraintViolations.map((v, i) => <li key={i}>{v}</li>)}
                    </ul>
                  </div>
                )}

                {result.escalationTriggers.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">Escalation Triggers</span>
                    <div className="flex gap-2 mt-1">
                      {result.escalationTriggers.map((t, i) => (
                        <Badge key={i} variant="secondary">{t}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-sm text-muted-foreground">Raw Output</span>
                  <pre className="mt-2 p-4 bg-secondary rounded text-xs overflow-auto max-h-[400px]">
                    {JSON.stringify(result.raw, null, 2)}
                  </pre>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
