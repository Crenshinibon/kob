# Testing Gaps & Pre-Launch Issues

This document tracks untested areas, missing tests, and bugs identified before going live with the new 32-player and preseed format features.

## Resolved Issues ✅

### 1. `redistributePreseed32()` Implementation - FIXED

**Location**: `src/lib/server/tournament-logic.ts`

The redistribution logic has been corrected to properly handle each round transition:

- **Round 1 → Round 2**: Winner/loser split - ALL 1st/2nd places to Courts 1-4, ALL 3rd/4th places to Courts 5-8
- **Round 2 → Round 3**: Tier consolidation - Top/bottom 2 from each court pair
- **Round 3 → Round 4**: Final placement determination

### 2. Non-Deterministic Tiebreaker - FIXED

**Location**: `src/lib/server/tournament-logic.ts`, `src/routes/tournament/[id]/standings/+page.server.ts`, `src/routes/court/[token]/+page.server.ts`

The `Math.random() - 0.5` tiebreaker has been replaced with a deterministic approach using player ID comparison:

```typescript
return a.playerId - b.playerId;
```

This ensures consistent results across runs and prevents flaky tests.

### 3. Delete Tournament Action - FIXED

**Location**: `src/routes/tournament/[id]/+page.server.ts`

Added `deleteTournament` server action that:

- Verifies user authorization
- Cascades deletion through all related tables (match, courtAccess, courtRotation, player)
- Removes the tournament record

### 4. Unit Tests Added

**Location**: `src/lib/server/tournament-logic.test.ts`

Added comprehensive unit tests for:

- `calculateCourtStandings()` - Points calculation and ranking
- `redistributePreseed16()` - 16-player preseed redistribution
- `redistributePreseed32()` - 32-player preseed redistribution (all rounds)
- `redistributeLadder()` - Random-seed ladder redistribution (16 and 32 players)
- `getTop2()`, `getBottom2()` - Helper functions

Run with: `npm run test:unit`

## Remaining E2E Test Gaps

### 32-Player Tournament

- **No test completes a full 32-player tournament** through all rounds
- Need test verifying 8 courts are created
- Need test verifying redistribution works correctly for 32 players

### Preseed Format

- **Preseed redistribution is not tested in E2E tests**
- Need E2E test for preseed format (16 and 32 players)
- Round 1→2 redistribution (winner/loser split)
- Round 2→3 redistribution (tier consolidation)
- Round 3→4 redistribution (final placement)
- Verify seeded initial placement matches spec (snake pattern)

### Standings Page

- `/tournament/[id]/standings` is never visited in E2E tests
- Podium display not tested
- Round-by-round breakdown not tested
- Achievement categories not tested

## Missing Features

### Preseed Points Validation

When starting a preseed tournament, the system should validate:

- All players have `seedPoints` (not null)
- Points are reasonable numbers (positive integers?)

**Current**: `parsePreseedInput()` catches missing points during input, but database could have null values.

## Pre-Launch Checklist

### Completed ✅

- [x] Add `deleteTournament` server action
- [x] Fix `redistributePreseed32()` to match spec for all round transitions
- [x] Add unit tests for redistribution algorithms
- [x] Replace `Math.random()` tiebreaker with deterministic approach
- [x] Add unit tests for scoring/standings calculations

### Should Fix

- [ ] Add E2E test for 32-player tournament completing all rounds
- [ ] Add E2E test for preseed format (16 and 32 players)
- [ ] Add E2E test for standings page
- [ ] Add validation for preseed points at tournament start

### Nice to Have

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

src/lib/server/
└── tournament-logic.test.ts  # Unit tests for redistribution and scoring
```

**Missing**: No `redistribution.spec.ts` for 32-player or preseed E2E tests.

## New Files Added

- `src/lib/server/tournament-logic.ts` - Extracted pure functions for tournament logic
- `src/lib/server/tournament-logic.test.ts` - Unit tests for tournament logic
- `vitest.config.ts` - Vitest configuration for unit tests
