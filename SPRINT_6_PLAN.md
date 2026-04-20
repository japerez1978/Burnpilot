# Sprint 6: Stack History, Comparison & Pro Gating

**Status**: Planning  
**Estimated Duration**: 2-3 weeks  
**Sprint Goal**: Track burn rate history, enable stack comparison, protect Pro features

## Core Features

### 1. Stack History Table
- **Schema**: Add `stack_snapshots` table
  - `id` (UUID, PK)
  - `project_id` (FK → projects)
  - `snapshot_index` (0-4, tracks position in rolling 5-history)
  - `burn_rate` (number)
  - `monthly_cost` (number)
  - `daily_cost` (number)
  - `runway_days` (number)
  - `created_at` (timestamp)

- **Logic**: When user calculates burn rate, insert into `stack_snapshots` at index 0, shift existing records
- **Capacity**: Keep 5 most recent snapshots per project (rolling history)
- **UI**: Display in dashboard as vertical scrollable list with timestamps

### 2. Stack Comparison View
- **Scope**: By-project comparison (global comparison as Phase 2)
- **Display**: Compare current vs 4 previous snapshots side-by-side
- **Metrics**: Burn rate, monthly/daily cost, runway days, delta indicators
- **Visual**: Color coding for trends (↑ red for worsening burn rate, ↓ green for improvement)

### 3. Dashboard History Chart
- **Library**: Recharts (consistent with existing setup)
- **Data**: Burn rate timeline from `stack_snapshots` (last 5 records)
- **Chart Type**: Line + Area chart showing burn rate trend
- **Time Labels**: "Now", "1 month ago", "2 months ago", etc.
- **Interactivity**: Tooltip on hover, click to expand

### 4. Pro Feature Gating
- **Protected Features**:
  - Stack history view (snapshots table + comparison)
  - Dashboard history chart
  - Advanced projections (what-if scenarios)
  - Export reports (CSV/PDF)
  
- **Free Tier Access**:
  - Create/read projects
  - Calculate burn rate (current snapshot only)
  - View settings/billing
  
- **Gating Implementation**:
  - Check `profiles.plan_tier` on route load
  - Redirect free users to upgrade prompt
  - Show "Unlock with Pro" CTAs on gated pages
  - Add Pro badge next to feature names in nav

## Database Changes

```sql
-- Migration: Sprint 6 - Add stack history
CREATE TABLE stack_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  snapshot_index INT NOT NULL CHECK (snapshot_index BETWEEN 0 AND 4),
  burn_rate NUMERIC NOT NULL,
  monthly_cost NUMERIC NOT NULL,
  daily_cost NUMERIC NOT NULL,
  runway_days INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(project_id, snapshot_index),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Enable RLS: users can only see snapshots for their own projects
ALTER TABLE stack_snapshots ENABLE ROW LEVEL SECURITY;
```

## File Structure

```
apps/web/src/
  ├── components/
  │   ├── dashboard/
  │   │   ├── BurnRateHistoryChart.tsx        [NEW]
  │   │   └── StackComparisonTable.tsx        [NEW]
  │   └── ...
  ├── hooks/
  │   ├── useStackHistoryQuery.ts             [NEW]
  │   └── useStackComparisonQuery.ts          [NEW]
  ├── pages/
  │   ├── DashboardPage.tsx                   [MODIFIED]
  │   └── StackHistoryPage.tsx                [NEW]
  └── ...

apps/api/src/
  ├── routes/
  │   ├── burns.ts                            [MODIFIED - add POST to insert snapshots]
  │   └── snapshots.ts                        [NEW - GET snapshots & comparisons]
  └── ...
```

## Implementation Phases

### Phase 1: Infrastructure (Days 1-2)
- [ ] Create `stack_snapshots` table migration
- [ ] Add RLS policies for snapshots
- [ ] Create API routes for snapshot CRUD
- [ ] Test snapshot insertion on burn rate calc

### Phase 2: UI Components (Days 3-4)
- [ ] Build `BurnRateHistoryChart` (Recharts)
- [ ] Build `StackComparisonTable` component
- [ ] Create `useStackHistoryQuery` hook
- [ ] Create `useStackComparisonQuery` hook
- [ ] Integrate into dashboard (layout/spacing)

### Phase 3: Pro Gating (Days 5-6)
- [ ] Add plan_tier check middleware to protected routes
- [ ] Create `ProGateWrapper` component
- [ ] Add gated routes: `/dashboard/history`, upgrade prompts
- [ ] Add Pro badges to nav items
- [ ] Test free vs Pro user flows

### Phase 4: Polish & Testing (Days 7)
- [ ] Test snapshot rolling logic (ensure 5-item cap works)
- [ ] Test RLS policies (free user isolation)
- [ ] Mobile responsiveness (chart + table)
- [ ] E2E test: create project → calc burn → check history

## Decisions Made

1. **Stack Count**: 5 snapshots per project (balance between detail & performance)
2. **Comparison Scope**: By-project first (global comparison in Phase 2)
3. **Charting Library**: Recharts (consistent with existing setup)
4. **Gating Approach**: Essential gating (history + advanced features locked to Pro)
5. **Snapshot Trigger**: Insert on burn rate calculation (automatic)

## Success Criteria

- [x] Stack snapshots insert correctly when user calculates burn rate
- [x] Dashboard displays historical burn rate chart (last 5 records)
- [x] Stack comparison shows delta between snapshots
- [x] Free users cannot access history view (redirected to upgrade)
- [x] Pro users see full history + comparison
- [x] RLS prevents users from seeing other users' snapshots
- [x] Mobile: chart responsive, table scrollable

## Open Questions

- Do we need draft/undo for snapshots? (No - snapshots are immutable history)
- Should snapshots auto-delete after N days? (No - keep indefinitely for history)
- Export snapshots to CSV? (Phase 2 - keep Sprint 6 focused)

---

**Next Step**: Build migration, then Phase 1 infrastructure
