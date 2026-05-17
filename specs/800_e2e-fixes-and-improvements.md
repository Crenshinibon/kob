# 800_e2e-fixes-and-improvements.md

## Problem Statement

E2E tests are failing (32/51) due to several issues:

1. **Intermediate players page**: After creating a tournament, users are redirected to `/tournament/[id]/players` which just shows the player list and does nothing else. Tests expect to find "Add Players" button but players are already entered on the create page.

2. **Round completion detection**: After entering all results from a round, the app doesn't recognize this and doesn't allow the Org to proceed to the next round.

3. **No auto-refresh**: Tournament view doesn't update when scores are submitted by players.

## Implementation Plan

### 1. Remove intermediate players page, redirect to tournament details ✅

**Files modified:**
- `src/routes/tournament/create/+page.server.ts` - Changed redirect from `/tournament/${id}/players` to `/tournament/${id}`
- `src/routes/tournament/[id]/+page.svelte` - Added player entry form for draft tournaments (moved from players page)
- `src/routes/tournament/[id]/+page.server.ts` - Added `addPlayers` and `start` actions (moved from players page)
- `src/routes/tournament/[id]/+page.svelte` - Updated to use `effectiveData` for live updates

**E2E test updates:**
- All tests: Changed `waitForURL(/\/tournament\/\d+\/players/)` to `waitForURL(/\/tournament\/\d+/)`
- Removed `page.click('button:has-text("Add Players")')` lines since players are entered on create page
- Tests that enter players on create page now work directly

### 2. Fix round completion detection ✅

**Root cause:** The page was not being refreshed after scores were submitted, so the `canCloseRound` value was not being updated.

**Solution:** Implemented auto-refresh using `query.live` which polls the database every 3 seconds and updates the UI automatically.

**Files modified:**
- `src/routes/tournament/[id]/tournament-data.remote.ts` - Created live query for tournament data
- `src/routes/tournament/[id]/+page.svelte` - Uses live query for auto-refreshing tournament state when active

### 3. Implement auto-refresh using `query.live` ✅

**New file:**
- `src/routes/tournament/[id]/tournament-data.remote.ts` - Contains `getTournamentDataLive` query that polls every 3 seconds

**Files modified:**
- `src/routes/tournament/[id]/+page.svelte` - Uses `getTournamentDataLive` for active tournaments, falls back to initial data for draft/completed

**Approach:**
- Created `query.live` async generator that yields updated tournament data every 3 seconds
- Component uses `$derived` with `await` to get live data
- Only activates when tournament status is 'active' and running in browser
- Uses `effectiveData` derived value that switches between live and initial data

### 4. Fix rounds input default value ✅

**Changed:** `numRounds` default from `4` to `3`

**Files modified:**
- `src/routes/tournament/create/+page.svelte` - Changed `let numRounds = $state(4)` to `let numRounds = $state(3)`

## Execution Order (Completed)

1. ✅ Fix rounds input default (quick win)
2. ✅ Remove intermediate players page + redirect
3. ✅ Update all E2E tests for new flow
4. ✅ Fix round completion detection (via auto-refresh)
5. ✅ Implement auto-refresh with query.live
6. ⏳ Run E2E tests to verify (user will run manually)
