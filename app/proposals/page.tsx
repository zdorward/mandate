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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center pt-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Proposals</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Submit and evaluate business proposals
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-foreground hover:bg-foreground/90 text-background rounded-xl h-12 px-6 cursor-pointer">
              New Proposal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl bg-white border-border">
            <DialogHeader>
              <DialogTitle className="text-xl">Create Proposal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  className="rounded-xl bg-secondary border-border h-12"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="APAC Market Expansion"
                />
              </div>
              <div className="space-y-2">
                <Label>Summary</Label>
                <textarea
                  className="w-full min-h-[80px] rounded-xl border border-border bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
                  placeholder="Brief description of the proposal..."
                />
              </div>
              <div className="space-y-2">
                <Label>Scope</Label>
                <textarea
                  className="w-full min-h-[80px] rounded-xl border border-border bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={form.scope}
                  onChange={(e) => setForm({ ...form, scope: e.target.value })}
                  placeholder="Detailed scope of work..."
                />
              </div>
              <div className="space-y-2">
                <Label>Assumptions (one per line)</Label>
                <textarea
                  className="w-full min-h-[60px] rounded-xl border border-border bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={form.assumptions}
                  onChange={(e) => setForm({ ...form, assumptions: e.target.value })}
                  placeholder="Market demand exists&#10;Resources available"
                />
              </div>
              <div className="space-y-2">
                <Label>Dependencies (one per line)</Label>
                <textarea
                  className="w-full min-h-[60px] rounded-xl border border-border bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={form.dependencies}
                  onChange={(e) => setForm({ ...form, dependencies: e.target.value })}
                  placeholder="Legal team&#10;Finance approval"
                />
              </div>
              <Button
                onClick={createProposal}
                disabled={creating}
                className="w-full bg-foreground hover:bg-foreground/90 text-background rounded-xl h-12 cursor-pointer"
              >
                {creating ? 'Creating...' : 'Create Proposal'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {proposals.map((p) => {
          const latest = p.versions[0]
          return (
            <Link key={p.id} href={`/proposals/${p.id}`} className="block">
              <Card className="bg-white border-border hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold">{latest?.title || 'Untitled'}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">{latest?.summary || 'No summary'}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Version</div>
                        <div className="font-medium">v{latest?.version || 1}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Created</div>
                        <div className="font-medium">{new Date(p.createdAt).toLocaleDateString()}</div>
                      </div>
                      <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
        {proposals.length === 0 && (
          <Card className="bg-white border-border">
            <CardContent className="p-12 text-center">
              <div className="text-muted-foreground">No proposals yet. Create your first one.</div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
