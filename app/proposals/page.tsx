'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

interface Proposal {
  id: string
  createdAt: string
  versions: Array<{
    id: string
    version: number
    title: string
    summary: string
  }>
}

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    title: '',
    summary: '',
    scope: '',
    assumptions: '',
    dependencies: '',
  })

  useEffect(() => {
    fetchProposals()
  }, [])

  async function fetchProposals() {
    const res = await fetch('/api/proposals')
    const data = await res.json()
    setProposals(data)
    setLoading(false)
  }

  async function createProposal() {
    setCreating(true)
    await fetch('/api/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        summary: form.summary,
        scope: form.scope,
        assumptions: form.assumptions.split('\n').filter(Boolean),
        dependencies: form.dependencies.split('\n').filter(Boolean),
      }),
    })
    setForm({ title: '', summary: '', scope: '', assumptions: '', dependencies: '' })
    setOpen(false)
    await fetchProposals()
    setCreating(false)
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Proposals</h1>
          <p className="text-muted-foreground mt-2">
            Submit and evaluate business proposals
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>New Proposal</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Proposal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="APAC Market Expansion"
                />
              </div>
              <div className="space-y-2">
                <Label>Summary</Label>
                <textarea
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
                  placeholder="Brief description of the proposal..."
                />
              </div>
              <div className="space-y-2">
                <Label>Scope</Label>
                <textarea
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.scope}
                  onChange={(e) => setForm({ ...form, scope: e.target.value })}
                  placeholder="Detailed scope of work..."
                />
              </div>
              <div className="space-y-2">
                <Label>Assumptions (one per line)</Label>
                <textarea
                  className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.assumptions}
                  onChange={(e) => setForm({ ...form, assumptions: e.target.value })}
                  placeholder="Market demand exists&#10;Resources available"
                />
              </div>
              <div className="space-y-2">
                <Label>Dependencies (one per line)</Label>
                <textarea
                  className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.dependencies}
                  onChange={(e) => setForm({ ...form, dependencies: e.target.value })}
                  placeholder="Legal team&#10;Finance approval"
                />
              </div>
              <Button onClick={createProposal} disabled={creating} className="w-full">
                {creating ? 'Creating...' : 'Create Proposal'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Proposals</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Latest Version</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proposals.map((p) => {
                const latest = p.versions[0]
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{latest?.title || 'Untitled'}</TableCell>
                    <TableCell>v{latest?.version || 1}</TableCell>
                    <TableCell>{new Date(p.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Link href={`/proposals/${p.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })}
              {proposals.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No proposals yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
