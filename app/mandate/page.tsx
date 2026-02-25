'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface MandateVersion {
  id: string
  version: number
  weights: string
  riskTolerance: string
  nonNegotiables: string
  isActive: boolean
  createdAt: string
}

interface Mandate {
  id: string
  name: string
  versions: MandateVersion[]
}

export default function MandatePage() {
  const [mandates, setMandates] = useState<Mandate[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    growth: 0.4,
    cost: 0.2,
    risk: 0.3,
    brand: 0.1,
    riskTolerance: 'MODERATE',
    nonNegotiables: '',
  })

  useEffect(() => {
    fetchMandates()
  }, [])

  async function fetchMandates() {
    const res = await fetch('/api/mandate')
    const data = await res.json()
    setMandates(data)
    setLoading(false)
  }

  async function createVersion() {
    const mandate = mandates[0]
    if (!mandate) return

    setCreating(true)
    await fetch('/api/mandate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mandateId: mandate.id,
        weights: {
          growth: form.growth,
          cost: form.cost,
          risk: form.risk,
          brand: form.brand,
        },
        riskTolerance: form.riskTolerance,
        nonNegotiables: form.nonNegotiables.split('\n').filter(Boolean),
      }),
    })
    await fetchMandates()
    setCreating(false)
  }

  async function activateVersion(versionId: string) {
    await fetch('/api/mandate', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ versionId, activate: true }),
    })
    await fetchMandates()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  const mandate = mandates[0]
  const activeVersion = mandate?.versions.find(v => v.isActive)
  const activeWeights = activeVersion ? JSON.parse(activeVersion.weights) : null
  const activeNonNeg = activeVersion ? JSON.parse(activeVersion.nonNegotiables) : []

  return (
    <div className="space-y-8">
      <div className="pt-4">
        <h1 className="text-4xl font-bold tracking-tight">Mandate</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Define organizational priorities and constraints
        </p>
      </div>

      {activeVersion && (
        <Card className="bg-white border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Active Mandate
              <Badge>v{activeVersion.version}</Badge>
            </CardTitle>
            <CardDescription>
              Risk Tolerance: {activeVersion.riskTolerance}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">Weights</Label>
              <div className="grid grid-cols-4 gap-4 mt-2">
                {activeWeights && Object.entries(activeWeights).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <div className="text-sm font-medium capitalize">{key}</div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${(value as number) * 100}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">{((value as number) * 100).toFixed(0)}%</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Non-Negotiables</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {activeNonNeg.map((item: string, i: number) => (
                  <Badge key={i} variant="destructive">{item}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-white border-border">
        <CardHeader>
          <CardTitle>Create New Version</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {['growth', 'cost', 'risk', 'brand'].map((key) => (
              <div key={key} className="space-y-2">
                <Label className="capitalize">{key}</Label>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [key]: parseFloat(e.target.value) })}
                  className="bg-secondary border-border"
                />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Label>Risk Tolerance</Label>
            <Select value={form.riskTolerance} onValueChange={(v) => setForm({ ...form, riskTolerance: v })}>
              <SelectTrigger className="bg-secondary border-border cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CONSERVATIVE">Conservative</SelectItem>
                <SelectItem value="MODERATE">Moderate</SelectItem>
                <SelectItem value="AGGRESSIVE">Aggressive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Non-Negotiables (one per line)</Label>
            <textarea
              className="w-full min-h-[100px] rounded-xl border border-border bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              value={form.nonNegotiables}
              onChange={(e) => setForm({ ...form, nonNegotiables: e.target.value })}
              placeholder="No layoffs&#10;Budget must not exceed $500k"
            />
          </div>
          <Button onClick={createVersion} disabled={creating} className="bg-foreground hover:bg-foreground/90 text-background cursor-pointer">
            {creating ? 'Creating...' : 'Create Version'}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-white border-border">
        <CardHeader>
          <CardTitle>Version History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Risk Tolerance</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mandate?.versions.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>v{v.version}</TableCell>
                  <TableCell>{v.riskTolerance}</TableCell>
                  <TableCell>{new Date(v.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {v.isActive ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                  </TableCell>
                  <TableCell>
                    {!v.isActive && (
                      <Button variant="outline" size="sm" onClick={() => activateVersion(v.id)} className="cursor-pointer">
                        Activate
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
