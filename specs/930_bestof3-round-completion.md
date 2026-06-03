# Best-of-3 Round Completion Fix

## Overview

When the scoring mode is best-of-3, matches that end 2-0 (no deciding set needed) leave unscores set-3 rows in the database. The round completion check fails because it compares match count against set row count — apples vs oranges. This prevents the round from ever being closed.

## Bug: Completion Check Mismatch

### Location

`src/routes/tournament/[id]/tournament-data.remote.ts:114-122`

### Root Cause

```typescript
const expectedMatchCount = courtSizes.reduce(
    (sum, size) => sum + matchCountForCourtSize(size), 0  // returns 3 (matches, not sets)
);
const completedMatchCount = allMatches.filter(
    (m) => (m.teamAScore !== null && m.teamBScore !== null) || m.isCanceled
).length;  // counts individual set rows (9 rows for best-of-3)
canCloseRound =
    allMatches.length >= expectedMatchCount && completedMatchCount === expectedMatchCount;
```

`matchCountForCourtSize(4)` = 3 (number of matches per 4-player court). But the DB has 3 matches × 3 sets = 9 rows for best-of-3. `completedMatchCount` counts scored set rows, not completed matches.

When a match ends 2-0:
- Set 1 rows: scored ✓
- Set 2 rows: scored ✓  
- Set 3 rows: unscores (match already decided)

Total: 7 out of 9 rows scored (2 matches 2-0, 1 match 2-1). But `expectedMatchCount` = 3, making comparison invalid.

### Other Affected Checks

1. **Per-court `isComplete`** (`tournament-data.remote.ts:173-175`): Checks all set rows have scores. Unscores 3rd set rows make court appear incomplete.

2. **Standings `allMatchesComplete`** (`standings/+page.server.ts:85-87`): Skips courts where not all set rows have scores.

### Fix

Change `expectedMatchCount` to count set rows, not matches. Each match generates `maxSets` rows (1 for single-set, 3 for best-of-3). Instead of relying on raw row count, determine if each MATCH is complete:

```typescript
// Group set rows by match number, check each match is complete
const setByMatch = new Map<string, Array<typeof allMatches[0]>>();
for (const m of allMatches) {
    const key = `${m.courtRotationId}-${m.matchNumber}`;
    if (!setByMatch.has(key)) setByMatch.set(key, []);
    setByMatch.get(key)!.push(m);
}
const completedMatches = [...setByMatch.values()].filter(sets => isMatchComplete(sets));
canCloseRound = completedMatches.length === expectedMatchCount;
```

`isMatchComplete` logic:
- Single-set: 1 set row with both scores filled → done
- Best-of-3: first 2 sets scored, same team won both → done (no 3rd set needed). OR 3 sets scored → done.
- Canceled: match is complete

### Alternative (Simpler)

Count expected set rows based on the effective scoring config, accounting for `setsToWin`:

```typescript
const effective = getEffectiveScoring(size, ...);
const maxSets = getMaxSets(effective.setsToWin);
const expectedRowCount = courtSizes.reduce(
    (sum, size) => sum + matchCountForCourtSize(size) * maxSets, 0
);
```

But this still fails when matches end 2-0 because 3rd set rows are unscores.

Better: count completed MATCHES, not rows. Find the max `matchNumber` per rotation and check each match has a winner:

```typescript
function isMatchComplete(sets: SetRow[]): boolean {
    if (sets.every(s => s.isCanceled)) return true;
    
    const scored = sets.filter(s => s.teamAScore !== null && s.teamBScore !== null);
    if (scored.length === 0) return false;
    
    // Single-set: 1 set decides
    if (sets.length === 1) return scored.length === 1;
    
    // Best-of-3: check if one team won 2 sets
    let teamAWins = 0, teamBWins = 0;
    for (const s of scored) {
        if (s.teamAScore! > s.teamBScore!) teamAWins++;
        else teamBWins++;
    }
    const setsToWin = Math.ceil(sets.length / 2); // 2 for best-of-3
    return teamAWins >= setsToWin || teamBWins >= setsToWin;
}
```

---

## Best-of-3 E2E Test Requirement

No existing E2E test verifies round transitions with best-of-3 scoring. Need a test that:

1. Creates a tournament with best-of-3 scoring
2. Enters scores where at least one match ends 2-0 (no deciding set)
3. Verifies the round can be closed (court shows complete, canCloseRound is true)
4. Verifies the tournament advances to next round
5. Enters scores in next round with similar pattern
6. Verifies finalize works

---

## Implementation Plan

### Phase 1: Fix Completion Checks

**File**: `src/routes/tournament/[id]/tournament-data.remote.ts`

- Replace row-counting completion logic with match-level completion checks
- Add `isMatchComplete` helper that handles best-of-3 2-0 finishes
- Also fix per-court `isComplete` to use the same logic

### Phase 2: Fix Standings Check

**File**: `src/routes/tournament/[id]/standings/+page.server.ts`

- Replace `allMatchesComplete` check with match-level logic

### Phase 3: E2E Test

**File**: `e2e/bestof3-round-transition.spec.ts` (new)

- Test round transitions with best-of-3 scoring
- Include matches ending 2-0

---

## Acceptance Criteria

- [ ] Round can be closed when best-of-3 matches end 2-0 (no deciding set needed)
- [ ] Per-court completeness correctly detected for best-of-3 2-0 finishes
- [ ] Standings correctly include courts where best-of-3 matches ended 2-0
- [ ] E2E test verifies best-of-3 round transition with 2-0 finishes
- [ ] Single-set and best-of-3 full-3-set still work correctly

## Verification

- Unit test: `isMatchComplete` for single-set, best-of-3 2-0, best-of-3 2-1
- E2E test: best-of-3 tournament round completion
