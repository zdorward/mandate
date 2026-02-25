'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface MandateVersion {
  id: string
  version: number
  outcomes: string | null
  weights: string | null
  isActive: boolean
  createdAt: string
}

interface Mandate {
  id: string
  name: string
  versions: MandateVersion[]
}

function SortableOutcome({
  id,
  outcome,
  index,
  onDelete,
}: {
  id: string
  outcome: string
  index: number
  onDelete: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-4 bg-white border border-border rounded-xl group"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </button>
      <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-white text-xs font-bold">
        {index + 1}
      </span>
      <span className="flex-1">{outcome}</span>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity cursor-pointer"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export default function MandatePage() {
  const [mandate, setMandate] = useState<Mandate | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [outcomes, setOutcomes] = useState<string[]>([])
  const [savedOutcomes, setSavedOutcomes] = useState<string[]>([])
  const [newOutcome, setNewOutcome] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchMandate()
  }, [])

  async function fetchMandate() {
    const res = await fetch('/api/mandate')
    const data = await res.json()
    const m = data[0]
    setMandate(m)

    if (m) {
      const activeVersion = m.versions.find((v: MandateVersion) => v.isActive)
      if (activeVersion?.outcomes) {
        const parsed = JSON.parse(activeVersion.outcomes)
        setOutcomes(parsed)
        setSavedOutcomes(parsed)
      }
    }
    setLoading(false)
  }

  async function saveVersion() {
    if (!mandate || outcomes.length === 0) return

    setSaving(true)
    await fetch('/api/mandate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mandateId: mandate.id,
        outcomes,
      }),
    })
    setSavedOutcomes([...outcomes])
    await fetchMandate()
    setSaving(false)
  }

  async function restoreVersion(versionId: string) {
    await fetch('/api/mandate', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ versionId, activate: true }),
    })
    await fetchMandate()
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = outcomes.indexOf(active.id as string)
      const newIndex = outcomes.indexOf(over.id as string)
      setOutcomes(arrayMove(outcomes, oldIndex, newIndex))
    }
  }

  function addOutcome() {
    if (newOutcome.trim()) {
      setOutcomes([...outcomes, newOutcome.trim()])
      setNewOutcome('')
      setIsAdding(false)
    }
  }

  function deleteOutcome(index: number) {
    setOutcomes(outcomes.filter((_, i) => i !== index))
  }

  const hasChanges = JSON.stringify(outcomes) !== JSON.stringify(savedOutcomes)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="pt-4">
        <h1 className="text-4xl font-bold tracking-tight">Mandate</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Define the outcomes you want. AI will evaluate proposals against these priorities.
        </p>
      </div>

      <Card className="bg-white border-border">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-muted-foreground">
            YOUR PRIORITIES
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {outcomes.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={outcomes} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {outcomes.map((outcome, index) => (
                    <SortableOutcome
                      key={outcome}
                      id={outcome}
                      outcome={outcome}
                      index={index}
                      onDelete={() => deleteOutcome(index)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No outcomes defined yet. Add your first priority.
            </div>
          )}

          {isAdding ? (
            <div className="p-4 bg-secondary rounded-xl space-y-3">
              <input
                type="text"
                className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="What outcome do you want?"
                value={newOutcome}
                onChange={(e) => setNewOutcome(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addOutcome()}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAdding(false)
                    setNewOutcome('')
                  }}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onClick={addOutcome}
                  disabled={!newOutcome.trim()}
                  className="bg-foreground hover:bg-foreground/90 text-background cursor-pointer"
                >
                  Add
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => setIsAdding(true)}
              className="w-full cursor-pointer"
            >
              + Add Outcome
            </Button>
          )}

          {hasChanges && (
            <Button
              onClick={saveVersion}
              disabled={saving || outcomes.length === 0}
              className="w-full bg-foreground hover:bg-foreground/90 text-background cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save as New Version'}
            </Button>
          )}
        </CardContent>
      </Card>

      <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
        <Card className="bg-white border-border">
          <CollapsibleTrigger className="w-full cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">
                Version History ({mandate?.versions.length || 0} versions)
              </CardTitle>
              <svg
                className={`h-5 w-5 text-muted-foreground transition-transform ${historyOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-3 pt-0">
              {mandate?.versions.map((v) => {
                const vOutcomes = v.outcomes ? JSON.parse(v.outcomes) : []
                return (
                  <div
                    key={v.id}
                    className="flex items-center justify-between p-4 bg-secondary rounded-xl"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">v{v.version}</span>
                        {v.isActive && <Badge>Active</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {vOutcomes.length || '?'} outcomes • {new Date(v.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    {!v.isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => restoreVersion(v.id)}
                        className="cursor-pointer"
                      >
                        Restore
                      </Button>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  )
}
