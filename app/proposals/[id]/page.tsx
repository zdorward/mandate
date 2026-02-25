'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface ProposalVersion {
  id: string
  version: number
  title: string
  summary: string
  scope: string
  assumptions: string
  dependencies: string
  createdAt: string
  evaluations: Array<{ id: string }>
}

interface Proposal {
  id: string
  versions: ProposalVersion[]
}

export default function ProposalPage() {
  const params = useParams()
  const router = useRouter()
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [loading, setLoading] = useState(true)
  const [evaluating, setEvaluating] = useState(false)

  useEffect(() => {
    fetchProposal()
  }, [params.id])

  async function fetchProposal() {
    const res = await fetch(`/api/proposals/${params.id}`)
    const data = await res.json()
    setProposal(data)
    setLoading(false)
  }

  async function evaluate(versionId: string) {
    setEvaluating(true)
    const res = await fetch('/api/evaluations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposalVersionId: versionId }),
    })
    const data = await res.json()
    setEvaluating(false)
    router.push(`/evaluations/${data.evaluation.id}`)
  }

  if (loading) return <div>Loading...</div>
  if (!proposal) return <div>Not found</div>

  const latest = proposal.versions[0]
  const assumptions = JSON.parse(latest.assumptions || '[]')
  const dependencies = JSON.parse(latest.dependencies || '[]')

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{latest.title}</h1>
          <p className="text-muted-foreground mt-2">
            Version {latest.version} | Created {new Date(latest.createdAt).toLocaleDateString()}
          </p>
        </div>
        <Button onClick={() => evaluate(latest.id)} disabled={evaluating} size="lg">
          {evaluating ? 'Evaluating...' : 'Evaluate Against Mandate'}
        </Button>
      </div>

      <Tabs defaultValue="current">
        <TabsList>
          <TabsTrigger value="current">Current Version</TabsTrigger>
          <TabsTrigger value="history">Version History</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{latest.summary}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Scope</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{latest.scope}</p>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Assumptions</CardTitle>
                <CardDescription>{assumptions.length} stated</CardDescription>
              </CardHeader>
              <CardContent>
                {assumptions.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1">
                    {assumptions.map((a: string, i: number) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">None stated</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dependencies</CardTitle>
                <CardDescription>{dependencies.length} identified</CardDescription>
              </CardHeader>
              <CardContent>
                {dependencies.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1">
                    {dependencies.map((d: string, i: number) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">None identified</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Evaluations</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proposal.versions.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>v{v.version}</TableCell>
                      <TableCell>{v.title}</TableCell>
                      <TableCell>{new Date(v.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {v.evaluations.length > 0 ? (
                          <Badge variant="secondary">{v.evaluations.length}</Badge>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => evaluate(v.id)}
                          disabled={evaluating}
                        >
                          Evaluate
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
