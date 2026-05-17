# 800_e2e-fixes-and-improvements.md

## Problem Statement

E2E tests were failing due to several issues:

1. **Intermediate players page**: After creating a tournament, users were redirected to `/tournament/[id]/players` which just showed the player list. Tests expected to find "Add Players" button but players were already entered on the create page.

2. **Broken tournament details page**: After entering all information, users were forwarded to a broken tournament details page that showed draft state and required additional steps.

3. **Round completion detection**: After entering all results from a round, the app didn't recognize this and didn't allow the Org to proceed to the next round.

4. **No auto-refresh**: Tournament view didn't update when scores were submitted by players.

## Solution: Single-Step Tournament Creation

The user requested a simplified flow:
1. Create tournament form (name, format, players, etc.) → Submit → Immediately go to courts overview page (first round)
2. No intermediate players page
3. No draft tournament details page

## Implementation

### 1. Single-Step Tournament Creation ✅

**Files modified:**
- `src/routes/tournament/create/+page.server.ts` - Completely rewritten to:
  - Create tournament with `status: 'active'` and `currentRound: 1`
  - Add players immediately
  - Generate Round 1 matches and court rotations
  - Redirect to `/tournament/${id}` (courts overview)

- `src/routes/tournament/[id]/+page.svelte` - Simplified to only show:
  - Courts overview with QR codes
  - Match status per court
  - Close round button (when all matches scored)
  - Delete tournament button
  - Retire player section (when active)
  - Removed all draft state handling and player entry forms

- `src/routes/tournament/[id]/+page.server.ts` - Simplified to:
  - Removed `addPlayers` and `start` actions (no longer needed)
  - Removed draft state handling from load function
  - Only handles active/completed tournaments
  - Kept `closeRound`, `deleteTournament`, and `retirePlayer` actions

### 2. Auto-Refresh with `query.live` ✅

**New file:**
- `src/routes/tournament/[id]/tournament-data.remote.ts` - Contains `getTournamentDataLive` query that polls every 3 seconds

**Files modified:**
- `src/routes/tournament/[id]/+page.svelte` - Uses `getTournamentDataLive` for active tournaments
- Uses `effectiveData` derived value that merges live data with initial data
- Only activates when tournament status is 'active' and running in browser

### 3. Round Completion Detection Fix ✅

**Root cause:** The rotation query wasn't filtering by `tournamentId`, causing it to return matches from other tournaments.

**Files modified:**
- `src/routes/tournament/[id]/tournament-data.remote.ts` - Fixed rotation query to filter by `tournamentId`
- `src/routes/tournament/[id]/+page.server.ts` - Fixed rotation query to filter by `tournamentId`

### 4. Rounds Input Default Value ✅

**Changed:** `numRounds` default from `4` to `3`

**Files modified:**
- `src/routes/tournament/create/+page.svelte`

### 5. E2E Test Updates ✅

**Files modified:**
- `e2e/format.spec.ts` - Rewritten to match new flow
- `e2e/promotion.spec.ts` - Removed all "Add Players" and "Start Tournament" steps
- `e2e/standings.spec.ts` - Removed all "Add Players" and "Start Tournament" steps
- `e2e/tournament.spec.ts` - Updated to match new flow, simplified dashboard test

## Execution Order (Completed)

1. ✅ Simplify tournament creation to single step
2. ✅ Remove intermediate players page
3. ✅ Simplify tournament details page to courts overview only
4. ✅ Implement auto-refresh with query.live
5. ✅ Fix round completion detection (tournamentId filter)
6. ✅ Fix rounds input default value
7. ✅ Update all E2E tests for new flow
8. ⏳ Run E2E tests to verify (user will run manually)
