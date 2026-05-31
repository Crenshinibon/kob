# 870 Score Entry Validation [FIXED]

## Problem

Two distinct issues with score validation in `scores.remote.ts` and `scoreSchema.ts`:

### Bug 1: `invalid()` doesn't abort the handler (CRITICAL)

In `scores.remote.ts`, both `saveScore` and `saveSetScore` call `invalid()` when validation fails but **never return** — execution continues to the database write, saving invalid scores.

Same pattern in `saveSetScore`.

Also affects the null/error guard (would crash on `ctx!` at access).

### Bug 2: Validation rule allows blowout scores

The current rules check:

1. Winner has at least `minPoints` (e.g., 21)
2. Winner leads by at least `winBy` (e.g., 2)

This allows `25-11` for a 21-point set: winner has 25 >= 21 ✓, lead is 14 >= 2 ✓.

**Correct beach volleyball rule**: The game ends when the winner reaches `minPoints` with the required lead. If the loser is NOT within striking distance (`minPoints - winBy + 1`), the winner must have exactly `minPoints`. If the loser IS within striking distance (deuce), the winner must have exactly `loser_score + winBy`.

## Fix

### 1. `isValidFinalScore()` shared helper

Added to `src/lib/tournament-logic.ts`:

```ts
export function isValidFinalScore(
	winnerScore: number,
	loserScore: number,
	minPoints: number,
	winBy: number
): boolean {
	if (winnerScore < minPoints) return false;
	if (winnerScore - loserScore < winBy) return false;
	// winBy=1: no deuce possible, game always ends at exactly minPoints
	if (winBy === 1) return winnerScore === minPoints;
	// If loser is not within striking distance, winner must be exactly minPoints
	if (loserScore < minPoints - winBy + 1) {
		return winnerScore === minPoints;
	}
	// Deuce: winner must have exactly loser_score + winBy
	return winnerScore === loserScore + winBy;
}
```

### 2. `scores.remote.ts` — add returns + use helper

- Added `return` before every `invalid()` call in both `saveScore` and `saveSetScore`
- Replaced manual `minPoints`/`winBy` checks with `isValidFinalScore()`
- Fixed null/error guard to return early instead of falling through

### 3. `scoreSchema.ts` — use shared helper

- Both `createScoreSchema` and `createSetScoreSchema` now use `isValidFinalScore()` instead of independent min/winBy checks

## Testing

### Unit tests (28 new tests in `tournament-logic.test.ts`)

| Scenario                             | minPoints | winBy | Test Cases                                                             |
| ------------------------------------ | --------- | ----- | ---------------------------------------------------------------------- |
| Valid standard scores                | 21        | 2     | 21-19, 22-20 (deuce), 23-21, 30-28                                     |
| Valid blowout (game ended at target) | 21        | 2     | 21-11, 21-0                                                            |
| Rejected blowout (overshoot)         | 21        | 2     | 25-11, 22-11, 30-11                                                    |
| Rejected violations                  | 21        | 2     | 21-20 (win by 1), 20-18 (below min), 21-21 (tie)                       |
| winBy=1 (no deuce)                   | 21        | 1     | 21-20 (valid), 20-19 (below min), 22-21 (overshoot), 25-11 (overshoot) |
| Deciding set to 15                   | 15        | 2     | 15-13, 16-14, 17-11 (overshoot), 15-14 (win by 1), 13-11 (below min)   |
| Custom 10pt target                   | 10        | 2     | 10-8, 11-9, 12-6 (overshoot)                                           |
| Edge cases                           | —         | —     | Below min, negative, tie                                               |

### E2E test

- **`e2e/tournament.spec.ts`**: `rejects blowout scores (deuce-aware validation)`
  - `25-11` → rejected (error mentions deuce)
  - `22-11` → rejected (error mentions deuce)
  - `22-20` → accepted (valid deuce)
  - `30-28` → accepted (extended deuce on 2nd match)
  - `21-19` → accepted (standard valid on 3rd match)
  - Verifies both client-side (Valibot) and server-side (remote function) validation
  - Verifies existing tests not affected (all blowout patterns were reviewed: none existed)
