# Mandate Page Redesign

**Date:** 2026-02-25
**Status:** Approved

## Problem

The current mandate page is confusing:
- Abstract weights (Growth: 0.4, Cost: 0.2) have no clear meaning
- Too many concepts: weights, risk tolerance, non-negotiables
- Technical UI feels like a developer tool, not an executive tool

## Solution

Replace weights/non-negotiables/risk-tolerance with a simple **ranked list of outcomes**.

Users define what outcomes they want (e.g., "Increase revenue growth", "Protect brand reputation"). The order implies priority. AI evaluates proposals against these outcomes and uses judgment on severity.

## Design

### Page Layout

```
┌─────────────────────────────────────────────────────┐
│  Mandate                                            │
│  Define the outcomes you want. AI will evaluate     │
│  proposals against these priorities.                │
├─────────────────────────────────────────────────────┤
│                                                     │
│  YOUR PRIORITIES (drag to reorder)                  │
│  ┌─────────────────────────────────────────────┐   │
│  │ ≡  1. Increase revenue growth               ✕ │   │
│  ├─────────────────────────────────────────────┤   │
│  │ ≡  2. Protect brand reputation              ✕ │   │
│  ├─────────────────────────────────────────────┤   │
│  │ ≡  3. Keep operational costs flat           ✕ │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  [ + Add Outcome ]                                  │
│                                                     │
│  [ Save as New Version ]  (appears when changed)    │
│                                                     │
├─────────────────────────────────────────────────────┤
│  ▸ Version History (2 versions)                     │
└─────────────────────────────────────────────────────┘
```

### Interactions

**Drag to reorder:** Grab handle (≡) to change priority order

**Add outcome:** Click "+ Add Outcome", inline text input appears at bottom, Enter or "Add" to confirm

**Delete outcome:** Click ✕ on any outcome

**Save:** "Save as New Version" button appears when list differs from saved version

**Version history:** Collapsed by default, shows version number, date, outcome count. "Restore" on inactive versions creates new version with those outcomes.

## Data Model Changes

### Before
```typescript
MandateVersion {
  weights: string        // JSON: {growth: 0.4, cost: 0.2, risk: 0.3, brand: 0.1}
  riskTolerance: string  // CONSERVATIVE | MODERATE | AGGRESSIVE
  nonNegotiables: string // JSON array of strings
}
```

### After
```typescript
MandateVersion {
  outcomes: string  // JSON array of strings in ranked order
}
```

## Pipeline Changes

### Before
- `deterministicScorer.ts`: Numeric scoring against mandate weights
- `escalationPolicy.ts`: Rules based on risk tolerance and constraint violations

### After
- AI evaluates proposal alignment with ranked outcomes
- AI determines severity based on which outcomes (especially top-ranked) are impacted
- Simplified escalation — AI judgment replaces deterministic rules

## Migration

1. Existing mandate versions keep working (backwards compatible)
2. New versions use outcomes-only model
3. Seed data updated with example outcomes
