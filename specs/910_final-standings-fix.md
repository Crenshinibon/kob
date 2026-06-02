# Final Standings & Round Closing Fix

## Overview

Two critical bugs in the tournament lifecycle:

1. **Final round results are never saved** to the database
2. **Final standings sorted by total points** instead of final court position
3. Spec 090 contradicts specs 070 and 010 on winner determination

All stem from the same root: `closeRoundForm` has an early-exit that skips saving when `currentRound >= numRounds`, and the standings page sorts by total points instead of court position.

---

## Bug 1: Final Round Results Not Saved

### Location
`src/routes/tournament/[id]/tournament-actions.remote.ts:55-64`

### Root Cause

```typescript
if (currentRound >= tourney.numRounds) {
    // Immediately marks as completed, DOES NOT save round results
    await db.update(tournament).set({ status: 'completed' }).where(...);
    redirect(303, `/tournament/${tournamentId}/standings`);
}
```

When the tournament is in its final round and the user clicks "Close Round & Advance" (or "Finalize Tournament"), this early exit fires. The current round's match results are never persisted. The `closeRound()` function (which saves results to `completedRounds` in the state and computes next assignments) is never called.

### Trace (16p random-seed, 4 rounds)

| Event | `currentRound` | `numRounds` | Check `>=` | Action |
|-------|---------------|-------------|------------|--------|
| Create | 0 | 4 | — | — |
| Start R1 | 1 | 4 | 1 >= 4? No | — |
| Close R1 | 1→2 | 4 | 1 >= 4? No | Saves R1, generates R2 |
| Close R2 | 2→3 | 4 | 2 >= 4? No | Saves R2, generates R3 |
| Close R3 | 3→4 | 4 | 3 >= 4? No | Saves R3, generates R4 |
| **Close R4** | **4** | **4** | **4 >= 4? Yes** | **Skips save, marks completed** |

Round 4 scores are lost. Standings show only rounds 1-3.

### Fix

Remove the early exit check. Always call `closeRound()` to save results. Use `closedState.isComplete` (from `closeRound()` itself) to determine if tournament is finished:

```typescript
const closedState = closeRound({...}, courtSizes);

if (closedState.isComplete) {
    // Save final standings for active players (see Bug 2)
    // Mark tournament completed
} else {
    // Generate next round assignments
}
```

The check `currentRound >= numRounds` is fundamentally wrong because it evaluates BEFORE saving — the final round still needs its results persisted.

---

## Bug 2: Final Standings Sorted by Total Points

### Location
`src/routes/tournament/[id]/standings/+page.server.ts:130-149`

### Current Behavior

```typescript
const standings = Object.values(playerStats)
    .filter((s) => s.roundsPlayed > 0)
    .sort((a, b) => {
        // Round 1 only: court position
        if (tourney.currentRound === 1) { /* ... */ }
        // Default: TOTAL POINTS descending (WRONG)
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        if (b.totalDiff !== a.totalDiff) return b.totalDiff - a.totalDiff;
        return a.playerId - b.playerId;
    })
```

This sorts by aggregate points across all rounds. For a completed 4-round tournament, the player with the most total points is shown as winner — regardless of who finished 1st on Court 1 in the final round.

### Expected Behavior (per spec 070:98-109, 010:134)

> "Winner is determined by final court position (not total points)"

```
1st:  1st place Court 1 (final round)
2nd:  2nd place Court 1
3rd:  3rd place Court 1
4th:  4th place Court 1
5th:  1st place Court 2
6th:  2nd place Court 2
...
```

Players are ranked by: final round court number (lower = better) → rank on that court. Total points and point differential from earlier rounds do NOT affect the final ranking.

### Sort Logic (Correct)

Standings for every round (active or completed) are always sorted by the **current round's court position**:

```
rank = (courtNumber - 1) * 4 + rankOnCourt
```

Where:
- `courtNumber` = which court the player was on in the final round
- `rankOnCourt` = their position on that court (1=best)
- A 1st place on Court 2 is overall 5th, not 3rd just because they had high total points

For **mid-tournament standings** (status = 'active'), use the same logic.

---

## Bug 3: Spec 090 Contradicts 070/010

### Spec 090 line 68-74 says:

```
Sort Order:
1. Total Points (descending)
2. Point Differential (descending)
...
```

### Spec 070 line 98-109 says:

```
## Final Standings
Winner is determined by final court position (not total points):
1st: 1st place Court 1 (final round)
2nd: 2nd place Court 1
```

### Spec 010 line 134 says:

```
When the Org closes the Final Round, the tournament winner is
determined by their Final Court Position, not their total aggregate points.
```

### Resolution

Spec 090's sort order is wrong. Standings are always sorted by current round court position (lower court number first, then rank on that court). This applies to both mid-tournament (active) and final (completed) views. Total points and point differential are only used as secondary sort within the same court position. Update spec 090 to match.

---

## Bug 4: Standalone DB `finalStanding` Missing for Active Players

### Location
`src/routes/tournament/[id]/tournament-actions.remote.ts:153-165`

### Current Behavior

When tournament completes, `finalStanding` is only set for retired players:

```typescript
const retiredWithoutStanding = dbPlayers.filter(
    (p) => p.retiredAt && p.finalStanding === null
);
// Sets finalStanding for retired players only
```

Active players who finished the tournament never get a `finalStanding` value in the database. Their final standing is computed on-the-fly (incorrectly) in the standings page.

### Fix

At tournament completion, compute final standings by court position (from Bug 2's correct algorithm) and write `finalStanding` to the `player` table for ALL players (both active and retired).

---

## Bug 5: numRounds Mismatch Between State and DB

### Root Cause

Two different round-count sources:

**State** (`createInitialState` in `src/lib/tournament-logic.ts:191`):
```typescript
totalRounds: calculateRoundCount(courtSizes.length, formatType)
```
Returns 4 for 4-court random-seed, variable for preseed.

**DB** (stored `tournament.numRounds`):
For random-seed, uses the slider value from the create form (defaults to 3 from `$state(3)` in `create/+page.svelte:23`).

For preseed, uses `calculateRoundCount` from `create.remote.ts`.

The state's `totalRounds` and the DB's `numRounds` can disagree for random-seed tournaments.

### Where It Matters

- `closeRound()` uses `state.totalRounds` (from `calculateRoundCount`)
- `closeRoundForm` uses `tourney.numRounds` (from DB)
- `tournament-data.remote.ts` uses `tourney.numRounds` (from DB)

This means `closeRound()` might think there are 4 rounds, but the UI shows 3 rounds (or vice versa).

### Fix

1. When creating a tournament, sync the DB `numRounds` with the `calculateRoundCount` result, OR always use the submitted value in `createInitialState` too.
2. Remove the hardcoded 4-return from `calculateRoundCount` for random-seed — let the organizer choose. In `createInitialState`, accept a `numRounds` parameter from the DB value.

---

## Implementation Plan

### Phase 1: Fix closeRoundForm (Bug 1)

**File**: `src/routes/tournament/[id]/tournament-actions.remote.ts`

- Remove lines 55-64 (early exit)
- Always call `closeRound(state, courtSizes)` 
- Branch on `closedState.isComplete`:
  - If complete: save `finalStanding` for all players, mark tournament completed
  - If not complete: generate next round (existing code)

### Phase 2: Fix Standings Sort (Bug 2)

**File**: `src/routes/tournament/[id]/standings/+page.server.ts`

- Replace total-points sort with current round court position sort: `courtNumber` ascending, then `rankOnCourt` ascending
- Total points and diff become secondary tiebreakers within same court position only

### Phase 3: Store finalStanding for All Players (Bug 4)

**File**: `src/routes/tournament/[id]/tournament-actions.remote.ts`

- When `closedState.isComplete`, compute final standings for all active players by court position
- Write `finalStanding` to `player` table for all players

### Phase 4: Fix numRounds Mismatch (Bug 5)

**File**: `src/routes/tournament/create/create.remote.ts`

- Pass `numRounds` (the submitted DB value) into `createInitialState()` instead of hardcoding `calculateRoundCount`

### Phase 5: Update Spec 090 (Bug 3)

**File**: `specs/090_total-standings.md`

- Replace total-points sort order with court position sort order

---

## Acceptance Criteria

- [ ] Closing the final round saves all match results to the database
- [ ] Tournament marked as completed only AFTER final round results are saved
- [ ] All standings (mid-tournament and final) show ranking by current round court position
- [ ] Court 1 1st place = tournament winner, Court 1 2nd place = runner-up, etc.
- [ ] Total points and diff are tiebreakers within same court position only
- [ ] `finalStanding` stored in DB for all players at tournament completion
- [ ] `numRounds` consistent between DB and tournament state
- [ ] Spec 090 updated to not contradict spec 070

## Verification

- Unit tests: `calculateCourtStandings` already correct (ranks within a court)
- New unit test: Final standings sort by court position for completed tournaments
- E2E test: Complete a 4-round tournament, verify final standings order and persistence
- E2E test: Verify round 4 scores are visible in standings after completion
