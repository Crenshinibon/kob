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

### Phase 1: Tournament Logic (Pure Functions) ✅ COMPLETE
**Actual effort**: 2 days

All redistribution algorithms implemented as pure functions with immutable state. State machine: `createInitialState` → `addPlayers` → `startRound` → `closeRound` → repeat.

**Files modified**: `src/lib/server/tournament-logic.ts`, `src/lib/server/tournament-logic.test.ts`

**Functions implemented**:
1. `getCourtConfiguration(playerCount)` — deterministic court config for 8-64 players
2. `calculateCourtSizes(playerCount)` — returns array of court sizes (e.g., `[4,4,4,4,5]` for 25)
3. `calculateRoundCount(courtCount, formatType)` — round count calculator (preseed: `floor(log2(courts-1))+2`)
4. `redistributePreseedRecursive(courtResults)` — recursive splitting for any court count
5. `verticalSeeding(courtResults, targetCourtCount)` — round 1→2 distribution for any court count
6. `ladderRedistribute(courtResults, targetCourtCount)` — 2-up/2-down for any court count
7. `redistributeLadder(courtResults, isFirstRound, courtCount)` — combines vertical + ladder
8. `calculateCourtStandings(matches, playerIds)` — handles 3p/4p/5p/6p with proper tiebreakers
9. `generate3pMatches(playerIds)` — 3-player round-robin (each player gets a solo turn)
10. `generate4pMatches(playerIds)` — standard 4-player round-robin
11. `generateAllMatchesForAssignment(assignment, courtSizes)` — all matches for 3p/4p/5p/6p courts
12. `matchCountForCourtSize(size)` — 3p→3, 4p→3, 5p/6p→4

**Key design decisions**:
- `splitSize(n)` instead of `largestPowerOf2(n)` — splits in half for exact powers of 2, preventing infinite recursion
- Bottom court strategy: 1 leftover → 5p, 2 leftovers → 6p, 3 leftovers → 3p
- `nextAssignments` field in state — separates pre-computation from activation
- Snake distribution handles non-standard bottom courts correctly

**Tests**: 82 passing, 0 failing (was 76 passing, 6 failing before fixes)

### Phase 2: Database Schema ✅ COMPLETE
**Actual effort**: 0.5 day

**Files modified**: `src/lib/server/db/schema.ts`

**Changes**:
- `tournament` table: added `scheduling_mode` (text, default 'batch'), `court_sizes` (text, JSON array)
- `courtRotation` table: added `player5Id` (integer, nullable), `player6Id` (integer, nullable)
- Removed assumption that all courts are 4-player
- Drizzle migration generated and pushed (`0002_cheerful_meltdown.sql`)

**Decision notes**: Chose nullable extra player columns over separate match tables — simpler queries, backward-compatible, handles 5p/6p inline with the existing schema.

### Phase 3: Player Input & Tournament Creation ✅ COMPLETE
**Actual effort**: 1 day

**Files modified**:
- `src/routes/tournament/create/+page.server.ts` — accepts 8-64 players, auto-calculates court sizes and round counts
- `src/routes/tournament/[id]/players/+page.server.ts` — uses `createInitialState` → `addPlayers` → `startRound` pipeline; generates all matches for 3p/4p/5p/6p

**Changes**:
- Removed hard-coded 16/32 player restriction — now accepts 8-64
- Auto-calculates `numRounds` from `calculateRoundCount()` instead of manual input
- Stores `courtSizes` as JSON in the tournament record
- Preseed mode auto-calculates seed ranks and distributes via snake
- Random seed mode shuffles and distributes via snake
- All match types (3p/4p/5p/6p) generated on tournament start

### Phase 4: Match Generation for Variable Courts ✅ COMPLETE
**Actual effort**: 1 day (done as part of Phase 3)

**Files modified**:
- `src/lib/server/tournament-logic.ts` — `generateAllMatchesForAssignment()` function
- `src/routes/tournament/[id]/players/+page.server.ts` — uses new function

**Match formats**:
- 3p: 3 matches (each player takes a solo turn vs the pair)
- 4p: 3 matches (standard rotation)
- 5p/6p: 4 matches (parallel game format)

### Phase 5: Redistribution Integration ✅ COMPLETE
**Actual effort**: 1 day

**Files modified**:
- `src/routes/tournament/[id]/+page.server.ts` — complete rewrite using new state machine

**Changes**:
- `closeRound` saves results AND pre-computes next round's assignments via `closeRound()`
- `startRound` activates pre-computed assignments and generates empty match data
- Handles non-standard bottom court (3p/5p/6p) in redistribution
- Supports recursive preseed splitting for any court count
- Physical court activation: batch mode (all active) or rolling mode (4 at a time)
- `inArray` used for efficient DB round loading

### Phase 6: UI Updates ❌ NOT STARTED
**Estimated effort**: 2-3 days remaining

**Files to modify**:
- `src/routes/tournament/[id]/+page.svelte` — variable court cards, virtual court mapping
- `src/routes/court/[token]/+page.svelte` — 3p, 5p, 6p court layouts
- `src/routes/tournament/[id]/standings/+page.svelte` — variable court placements
- `src/routes/tournament/[id]/standings/+page.server.ts` — placement calculation

### Phase 7: Physical/Virtual Courts ⏳ PARTIALLY IMPLEMENTED
**Estimated effort**: 0.5-1 day remaining

**What's done**:
- `schedulingMode` field on tournament (`batch` / `rolling`)
- `courtSizes` stored and loaded from tournament record
- Server-side physical court activation logic (batch: all, rolling: first 4)

**What's remaining**:
- Tournament creation UI: physical court count input
- Court display: physical court mapping in UI
- Round view: active vs waiting player indication
- Waiting rotation logic for rolling mode

## Total Estimated Remaining Effort: 3-6 days

### Revised Timeline
- ~~Phase 1: Tournament Logic~~ ✅
- ~~Phase 2: Database Schema~~ ✅
- ~~Phase 3: Player Input & Creation~~ ✅
- ~~Phase 4: Variable Court Match Generation~~ ✅
- ~~Phase 5: Redistribution Integration~~ ✅
- Phase 6: UI Updates — 2-3 days
- Phase 7: Physical/Virtual Court UI — 0.5-1 day

## Risks & Dependencies

1. **Phase 1 validated by 82 tests** — redistribution logic is solid
2. **Schema migration needed on production** — `player5Id`, `player6Id`, `schedulingMode`, `court_sizes` columns added
3. **DB column used instead of separate tables** — `player5Id`/`player6Id` nullable on `courtRotation` keeps schema simple
4. **Physical court mapping needs venue-specific UI** — waiting for design input

## What We're NOT Doing (Out of Scope)

- Ghost players (organizers filling spots)
- Multi-venue support (only physical/virtual courts at one venue)
- Tournament merging / splitting for >64 players
- Custom match formats beyond 2v2
- Option C (rotating sit-outs) — removed per spec update