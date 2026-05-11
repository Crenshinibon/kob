# Development Plan: Incomplete Rosters & Extended Player Counts

## Summary

Extend KoB Tracker to support 8-64 players (currently only 16/32). Implement recursive preseed splitting, non-standard bottom court for leftovers, parallel game courts, and physical/virtual court mapping.

## What Changed in the Spec

| Old Spec | New Spec |
|----------|----------|
| Player count: 16 or 32 only | Player count: 8-64 |
| Preseed: power-of-2 only (2, 4, 8 courts) | Preseed: any court count via recursive splitting |
| Option C: Rotating sit-outs | **Removed** — one non-standard bottom court for leftovers |
| Option E: Single cut to top 16 | Generalized to recursive splitting for any court count |
| No physical/virtual court distinction | Physical vs virtual courts with UI support |
| No per-round strategy override | Include/exclude leftovers before starting tournament |
| Preseed "not possible" for 3, 5, 6, 7 courts | Preseed works for all via recursive splitting |

## Implementation Phases

### Phase 1: Tournament Logic (Pure Functions)
**Estimated effort**: 2-3 days

Write all redistribution algorithms as pure functions with comprehensive unit tests. This is the foundation — everything else depends on these functions being correct.

**Files to modify**: `src/lib/server/tournament-logic.ts`, `src/lib/server/tournament-logic.test.ts`

**Functions to implement**:
1. `redistributePreseedRecursive(courtResults, currentRound, totalRounds)` — recursive splitting
2. `calculateRoundCount(courtCount, format)` — round count calculator
3. `getCourtConfiguration(playerCount)` — court configuration calculator (deterministic)
4. Extend `redistributeLadder` for any court count (2-16)
5. Extend `calculateCourtStandings` for 3p, 5p, 6p courts

**Tests**: ~40-50 test cases covering all edge cases (see `630_incomplete-implementation.md`)

### Phase 2: Database Schema
**Estimated effort**: 0.5 days

**Files to modify**: `src/lib/server/db/schema.ts`

**Changes**:
- `tournament` table: remove playerCount constraint, add `physicalCourtCount`
- `courtRotation` table: add `courtSize`, `isWaiting`
- New tables: `match3Player`, `match5Player`, `match6Player` (see `630` for schemas)
- Generate and run Drizzle migration

### Phase 3: Player Input & Tournament Creation
**Estimated effort**: 1-2 days

**Files to modify**:
- `src/routes/tournament/create/+page.server.ts` — remove 16/32 restriction
- `src/routes/tournament/create/+page.svelte` — add physical courts input, show court configuration preview
- `src/routes/tournament/[id]/players/+page.server.ts` — flexible player count validation
- `src/routes/tournament/[id]/players/+page.svelte` — update UI for flexible count

### Phase 4: Match Generation for Variable Courts
**Estimated effort**: 2-3 days

**Files to modify**:
- `src/routes/tournament/[id]/players/+page.server.ts` — match generation for 3p, 4p, 5p, 6p
- `src/routes/tournament/[id]/+page.server.ts` — closeRound with variable court sizes
- `src/lib/server/tournament-logic.ts` — match rotation helpers

**Design decisions needed**:
- Exact 5-player and 6-player match rotations
- How to store waiting players in match table
- Score validation for 15-point games

### Phase 5: Redistribution Integration
**Estimated effort**: 1-2 days

**Files to modify**:
- `src/routes/tournament/[id]/+page.server.ts` — use new redistribution functions
- Wire up recursive preseed for all court counts
- Handle non-standard bottom court redistribution (3p/5p/6p)

### Phase 6: UI Updates
**Estimated effort**: 2-3 days

**Files to modify**:
- `src/routes/tournament/[id]/+page.svelte` — variable court cards, virtual court mapping
- `src/routes/court/[token]/+page.svelte` — 3p, 5p, 6p court layouts
- `src/routes/tournament/[id]/standings/+page.svelte` — variable court placements
- `src/routes/tournament/[id]/standings/+page.server.ts` — placement calculation

### Phase 7: Physical/Virtual Courts
**Estimated effort**: 1-2 days

**Files to modify**:
- Tournament creation: physical court input
- Court display: physical court mapping
- Round view: active vs waiting indication
- Waiting rotation logic

## Total Estimated Effort: 10-16 days

## Risks & Dependencies

1. **Phase 1 is critical path** — all other phases depend on correct redistribution logic
2. **Separate match tables** per court type (3p/5p/6p) — more code but cleaner separation
3. **Database cleanup** — existing tournaments deleted on scheduled dates with notification
4. **Per-shift physical court mapping** — needs flexible UI for shift assignments

## What We're NOT Doing (Out of Scope)

- Ghost players (organizers filling spots)
- Multi-venue support (only physical/virtual courts at one venue)
- Tournament merging / splitting for >64 players
- Custom match formats beyond 2v2
