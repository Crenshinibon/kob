# Testing Gaps & Pre-Launch Issues

This document tracks untested areas, missing tests, and bugs identified before going live with the new 32-player and preseed format features.

## Critical: Missing Unit Tests

All core business logic lacks unit test coverage. These functions should have dedicated unit tests:

### Redistribution Algorithms

- `redistributePlayers()` - Main dispatcher
- `redistributePreseed32()` - 32-player preseed redistribution
- `redistributePreseed16()` - 16-player preseed redistribution
- `redistributeLadder()` - Random-seed ladder system (16 and 32 players)
- `getTop2()`, `getBottom2()` - Helper functions

### Scoring & Standings

- `calculateCourtStandings()` - Points calculation and ranking
- Score validation rules (min 21, win by 2, no ties)

### Tournament Setup

- `snakeDistribute()` - Preseed court assignment
- `parsePreseedInput()` - Name + points parsing

## E2E Test Gaps

### 32-Player Tournament

- **No test completes a full 32-player tournament** through all rounds
- Need test verifying 8 courts are created
- Need test verifying redistribution works correctly for 32 players

### Preseed Format

- **Preseed redistribution is not tested at all**
- Round 1→2 redistribution (winner/loser split)
- Round 2→3 redistribution (tier consolidation)
- Round 3→4 redistribution (final placement)
- Verify seeded initial placement matches spec (snake pattern)

### Standings Page

- `/tournament/[id]/standings` is never visited in E2E tests
- Podium display not tested
- Round-by-round breakdown not tested
- Achievement categories not tested

### Delete Tournament

- E2E tests attempt to delete tournaments via `button:has-text("Delete")`
- **No `deleteTournament` action exists** in `+page.server.ts`
- Tests silently fail cleanup

## Potential Bugs

### 1. `redistributePreseed32()` Incomplete Implementation

**Location**: `src/routes/tournament/[id]/+page.server.ts:325-349`

The Round 2 case (line 325-338) and the fallback case (line 340-349) return identical logic:

```typescript
// Round 2 case
if (isRound2) {
	return [
		{ courtNumber: 1, playerIds: [...getTop2(sorted[0]), ...getTop2(sorted[1])] }
		// ... same pattern
	];
}

// Fallback - IDENTICAL to above
return [
	{ courtNumber: 1, playerIds: [...getTop2(sorted[0]), ...getTop2(sorted[1])] }
	// ... same pattern
];
```

But per `kob-32.md` spec, each round transition has different rules:

- Round 2→3: Different grouping pattern
- Round 3→4: Final placement to determine ranks 1-32

**Action**: Verify against spec and implement correct logic for each transition.

### 2. Non-Deterministic Tiebreaker

**Location**: Multiple files use `Math.random() - 0.5` for tiebreaking

```typescript
return Math.random() - 0.5;
```

**Issues**:

- Results change between runs
- Flaky E2E tests
- Unfair if same players tie repeatedly

**Fix**: Use deterministic tiebreaker:

```typescript
// Option 1: Player ID comparison
return a.playerId - b.playerId;

// Option 2: Seeded random based on player IDs
const seed = a.playerId + b.playerId;
// Use seeded PRNG
```

### 3. Final Standings Logic Mismatch

**Location**: `src/routes/tournament/[id]/standings/+page.server.ts`

Current implementation ranks by current round court + points. But per `requirements.md`:

> Final Standings are determined by **Final Court Position**, not total aggregate points.
>
> - 1st Place: Winner of Court 1
> - 2nd Place: 2nd Place of Court 1
> - ...
> - 16th Place: 4th Place of Court 4

**Action**: Verify this matches expected behavior for completed tournaments.

## Missing Features

### 1. Delete Tournament Action

Tests reference a delete button that doesn't exist:

```typescript
// E2E test attempts this:
const deleteButton = page.locator('button:has-text("Delete")');
await deleteButton.click();
```

**Action**: Add `deleteTournament` action to tournament page, or remove delete expectations from tests.

### 2. Preseed Points Validation

When starting a preseed tournament, the system should validate:

- All players have `seedPoints` (not null)
- Points are reasonable numbers (positive integers?)

**Current**: `parsePreseedInput()` catches missing points during input, but database could have null values.

## Pre-Launch Checklist

### Must Fix

- [ ] Add `deleteTournament` server action or update tests
- [ ] Verify `redistributePreseed32()` matches spec for all round transitions
- [ ] Add unit tests for redistribution algorithms
- [ ] Replace `Math.random()` tiebreaker with deterministic approach

### Should Fix

- [ ] Add E2E test for 32-player tournament completing all rounds
- [ ] Add E2E test for preseed format (16 and 32 players)
- [ ] Add E2E test for standings page
- [ ] Add unit tests for scoring/standings calculations

### Nice to Have

- [ ] Add validation for preseed points at tournament start
- [ ] Add integration tests for full tournament flows
- [ ] Add performance tests for 32-player tournaments

## Test File Locations

```
e2e/
├── demo.test.ts         # Basic smoke test only
├── format.spec.ts       # Format selection tests
├── promotion.spec.ts    # 16-player redistribution only
├── standings.spec.ts    # Court-level standings only
└── tournament.spec.ts   # 16-player integration tests
```

**Missing**: No `redistribution.spec.ts` for 32-player or preseed formats.
