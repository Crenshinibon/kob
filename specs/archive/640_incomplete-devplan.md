# Development Plan: Incomplete Rosters & Extended Player Counts

## Summary

Extend KoB Tracker to support 8-64 players (currently only 16/32). Implement recursive preseed splitting, non-standard bottom court for leftovers, parallel game courts, and physical/virtual court mapping.

## What Changed in the Spec

| Old Spec                                     | New Spec                                                          | Spec |
| -------------------------------------------- | ----------------------------------------------------------------- | ---- |
| Player count: 16 or 32 only                  | Player count: 8-64                                                | 610  |
| Preseed: power-of-2 only (2, 4, 8 courts)    | Preseed: any court count via recursive splitting                  | 620  |
| Option C: Rotating sit-outs                  | **Removed** — one non-standard bottom court for leftovers         | 620  |
| Option E: Single cut to top 16               | Generalized to recursive splitting for any court count            | 620  |
| No physical/virtual court distinction        | Physical vs virtual courts with UI support                        | 610  |
| No per-round strategy override               | Include/exclude leftovers before starting tournament              | 610  |
| Preseed "not possible" for 3, 5, 6, 7 courts | Preseed works for all via recursive splitting                     | 620  |
| No scoring mode selection                    | Scoring modes (single-21, best-of-3, custom), configurable params | 650  |
| No duration estimation                       | Court/round/tournament duration estimation, configurable timing   | 650  |
| No wait time forecasting for players         | Batch shift wait time per virtual court                           | 660  |
| No player retirement handling                | Retirement flow, redistribution after, final round elimination    | 670  |

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

- ~~Waiting player view with estimated wait time countdown~~ → Moved to Phase 10
- Real-time court completion notification (requires WebSocket/polling)

---

### Phase 8: Game Rules & Scoring Modes (spec 650) ✅ COMPLETE

**Actual effort**: 1 day

**Files modified**:

- `src/lib/server/db/schema.ts` — added `scoring_mode`, `points_to_win`, `win_by`, `sets_to_win`, `deciding_set_points` columns
- `src/lib/server/tournament-logic.ts` — extended `TournamentConfig` with scoring fields, added `getScoreCap()` and `getScoringLabel()` helpers
- `src/routes/tournament/create/+page.server.ts` — accepts scoring mode and params from form
- `src/routes/tournament/create/+page.svelte` — scoring mode radio (single-21 / best-of-3-15), optional param overrides (Advanced section)
- `src/routes/court/[token]/scoreSchema.ts` — **FIXED**: removed hardcoded `maxScore >= 21`, uses tournament-level score cap via `createScoreSchema()`
- `src/routes/court/[token]/scores.remote.ts` — updated to use base schema without score cap
- `src/routes/court/[token]/+page.server.ts` — reads `scoreCap` and `scoringLabel` from tournament config instead of hardcoded `courtSize >= 5 ? 15 : 21`
- `src/routes/court/[token]/+page.svelte` — dynamic "to X" display via `data.court.scoringLabel`

**Database migration**: `0002_sad_loners.sql` — 5 scoring columns added

---

### Phase 9: Duration Estimation (spec 650) ✅ COMPLETE

**Actual effort**: 0.5 day

**Files modified**:

- `src/lib/server/db/schema.ts` — added `setup_time_minutes`, `transition_time_minutes`, `avg_rally_duration_seconds`, `time_between_rallies_seconds`, `time_between_matches_minutes` columns
- `src/lib/server/tournament-logic.ts` — added `estimateCourtDurationMinutes()`, `estimateRoundDurationMinutes()`, `estimateTournamentDuration()`, `DurationConfig` type
- `src/routes/tournament/create/+page.svelte` — live duration estimate display with breakdown, updates on settings change

**Database migration**: `0003_legal_khan.sql` — 5 timing columns added

---

### Phase 10: Wait Time Forecasting (spec 660) ✅ COMPLETE

**Actual effort**: 0.5 day

**Files modified**:

- `src/lib/server/tournament-logic.ts` — added `getBatchShifts()`, `getShiftForCourt()`, `estimateWaitTimeMinutes()`, `formatDuration()` functions
- `src/routes/tournament/[id]/+page.server.ts` — computes shift assignments and wait estimates per court, returns `shifts` and `roundDuration`
- `src/routes/tournament/[id]/+page.svelte` — shift schedule display with active/waiting badges, per-court wait time labels

---

### Phase 11: Player Retirement (spec 670) ✅ COMPLETE

**Actual effort**: 1 day

**Files modified**:

- `src/lib/server/db/schema.ts` — added `retired_at`, `retired_round`, `retirement_reason`, `final_standing` columns to `player` table
- `src/lib/server/tournament-logic.ts` — added `recalculateCourtConfigAfterRetirement()`, `calculateRetiredStanding()`, `getFinalRoundCourtConfig()`
- `src/routes/tournament/[id]/+page.server.ts` — added `retirePlayer` action with redistribution after retirement, recalculates court config and regenerates assignments
- `src/routes/tournament/[id]/+page.svelte` — collapsible retire player form with player selector and reason dropdown
- `src/routes/tournament/[id]/standings/+page.server.ts` — returns `retiredPlayers` list
- `src/routes/tournament/[id]/standings/+page.svelte` — retired players section in standings view

**Database migration**: `0004_safe_kate_bishop.sql` — 4 retirement columns added to player table

---

## Total Estimated Remaining Effort: 0 (all phases complete)

### Revised Timeline

- ~~Phase 1: Tournament Logic~~ ✅
- ~~Phase 2: Database Schema~~ ✅
- ~~Phase 3: Player Input & Creation~~ ✅
- ~~Phase 4: Variable Court Match Generation~~ ✅
- ~~Phase 5: Redistribution Integration~~ ✅
- ~~Phase 6: UI Updates~~ ✅
- ~~Phase 7: Physical/Virtual Court UI~~ ✅
- ~~Phase 8: Game Rules & Scoring Modes~~ ✅
- ~~Phase 9: Duration Estimation~~ ✅
- ~~Phase 10: Wait Time Forecasting~~ ✅
- ~~Phase 11: Player Retirement~~ ✅

## Known Issues (All Resolved)

All previously identified issues have been fixed in the course of development:

1. ~~**Dead schema tables**: `match_3_player`, `match_5_player`, `match_6_player`~~ → FIXED: Removed from schema via migration `0010_drop_dead_match_tables.sql`.
2. ~~**Hardcoded winBy**: Score validation always required win-by-2~~ → FIXED: All paths use `getEffectiveScoring()` from tournament config.
3. ~~**Draft status unused**: Tournaments skip draft status~~ → FIXED: Draft section removed, schema defaults to `'active'`.
4. ~~**No `/tournament/[id]/players` route**~~ → FIXED: Dashboard links to `/tournament/{id}`.
5. ~~**Legacy server actions**: `retirePlayer`, `reportInjury`, `create`~~ → FIXED: All migrated to remote functions (`command()`).
6. ~~**Duplicate `saveScore`**: Both legacy action and remote form~~ → FIXED: Legacy action removed; `scores.remote.ts` handles all score saves.
7. ~~**Live query gaps**: `retirePlayer`/`reportInjury` didn't reconnect~~ → FIXED: Both call `getTournamentDataLive().reconnect()`. See `specs/840_critical-bugs.md` for details.

## Risks & Dependencies

1. **Phase 1 validated by 82 tests** — redistribution logic is solid
2. **Schema migration needed on production** — multiple migrations for new columns
3. **DB column used instead of separate tables** — `player5Id`/`player6Id` nullable on `courtRotation` keeps schema simple
4. **Dead schema tables**: Remove `match_3_player`, `match_5_player`, `match_6_player` — decided to stick with single `match` table
5. **Hardcoded winBy** — needs to use tournament config for proper validation

## What We're NOT Doing (Out of Scope)

- Ghost players (organizers filling spots)
- Multi-venue support (only physical/virtual courts at one venue)
- Tournament merging / splitting for >64 players
- Custom match formats beyond 2v2
- Option C (rotating sit-outs) — removed per spec update
- Separate match tables per court type — using main `match` table with nullable columns
- Live countdown timers for wait time — estimates are static per page load
- Push notifications for court completion or shift start
- Draft tournament state — tournaments start immediately on creation
- Editing tournament settings after creation
