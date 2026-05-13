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

### Phase 6: UI Updates ✅ COMPLETE
**Actual effort**: 1 day

**Files modified**:
- `src/routes/tournament/[id]/+page.svelte` — shift badges, scheduling info display
- `src/routes/tournament/[id]/+page.server.ts` — physical court count, shift scheduling exports
- `src/routes/court/[token]/+page.svelte` — variable court size player layouts, 3p/5p/6p labels
- `src/routes/court/[token]/+page.server.ts` — null safety fix, MatchData typing
- `src/routes/tournament/[id]/standings/+page.svelte` — dynamic court size badges per round
- `src/routes/tournament/[id]/standings/+page.server.ts` — courtSizes in return data
- `src/routes/tournament/[id]/players/+page.svelte` — court config preview before starting
- `src/routes/tournament/[id]/players/+page.server.ts` — court preview data from server

**Changes**:
- Tournament detail shows batch shift schedule with shift badges per court
- Court page shows player count label (3p/5p/6p) and format notes
- Standings page shows per-round court + size badges (e.g., "C1 4p", "C5 5p")
- Players page previews court configuration (number of courts, sizes, physical courts)
- Physical court count input added to tournament creation

### Phase 7: Physical/Virtual Courts ✅ COMPLETE
**Actual effort**: 1 day

**Files modified**:
- `src/lib/server/db/schema.ts` — added `physicalCourtCount` column
- `src/lib/server/tournament-logic.ts` — added `physicalCourtCount` config, `getShiftAssignments()`, `estimateWaitTime()`, `getBatchShifts()`, `waitTimeForVirtualCourt()`, `getShiftForCourt()`
- `src/routes/tournament/create/+page.svelte` — physical court count slider (1-16)
- `src/routes/tournament/create/+page.server.ts` — saves physicalCourtCount to DB
- `src/routes/tournament/[id]/+page.server.ts` — uses tournament's physicalCourtCount, shift-aware activation
- `src/routes/tournament/[id]/+page.svelte` — scheduling info display, shift badges

**What's implemented**:
- `physicalCourtCount` stored on tournament (default 4, max 16)
- Batch mode: bottom virtual courts scheduled first, filling physical courts in parallel shifts
- Tournament creation with physical court slider
- Court detail shows shift number badge
- Activation logic respects physical court limit

**What's remaining** (future enhancement):
- Waiting player view with estimated wait time countdown
- Real-time court completion notification (requires WebSocket/polling)

## Total Estimated Remaining Effort: 0 (all phases complete)

### Revised Timeline
- ~~Phase 1: Tournament Logic~~ ✅
- ~~Phase 2: Database Schema~~ ✅
- ~~Phase 3: Player Input & Creation~~ ✅
- ~~Phase 4: Variable Court Match Generation~~ ✅
- ~~Phase 5: Redistribution Integration~~ ✅
- ~~Phase 6: UI Updates~~ ✅
- ~~Phase 7: Physical/Virtual Court UI~~ ✅

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