# 870 Score Entry Validation

## Problem

Two distinct issues with score validation in `scores.remote.ts` and `scoreSchema.ts`:

### Bug 1: `invalid()` doesn't abort the handler (CRITICAL)

In `scores.remote.ts`, both `saveScore` and `saveSetScore` call `invalid()` when validation fails but **never return** — execution continues to the database write, saving invalid scores.

```ts
// Line 97-103: minPoints check doesn't abort
if (maxScore < minPoints) {
	invalid(issue.teamAScore(`Winner must have at least ${minPoints} points`));
}
// Line 105-119: winBy check doesn't abort
if (maxScore - minScore < effective.winBy) {
	invalid(issue.teamAScore(`Winner must win by at least...`));
}
// Line 121: invalid score saved anyway!
await db.update(match).set({ teamAScore, teamBScore }).where(eq(match.id, matchId));
```

Same pattern in `saveSetScore` (lines 157-173 vs line 187-199).

Also affects the null/error guard at lines 73-74 (would crash on `ctx!` at line 76, but the null case is caught first).

### Bug 2: Validation rule allows blowout scores

The current rules check:
1. Winner has at least `minPoints` (e.g., 21)
2. Winner leads by at least `winBy` (e.g., 2)

This allows `25-11` for a 21-point set: winner has 25 >= 21 ✓, lead is 14 >= 2 ✓.

**Correct beach volleyball rule**: The game ends when the winner reaches `minPoints` with the required lead. If the loser is NOT within striking distance (`minPoints - winBy + 1`), the winner must have exactly `minPoints`. If the loser IS within striking distance (deuce), the winner must have exactly `loser_score + winBy`.

Examples for `minPoints=21, winBy=2`:

| Scores  | Current | Correct | Reason                                       |
| ------- | ------- | ------- | -------------------------------------------- |
| 21-19   | valid   | valid   | Winner at 21, lead by 2 at target            |
| 21-11   | valid   | valid   | Winner at 21, lead by 10, game ended at 21   |
| 25-11   | valid   | **invalid** | Should have ended at 21-11               |
| 22-20   | valid   | valid   | Deuce: loser at 20 >= 20, winner = 20 + 2    |
| 23-21   | valid   | valid   | Deuce: loser at 21 >= 20, winner = 21 + 2    |
| 30-28   | valid   | valid   | Extended deuce, correct                      |

For `minPoints=21, winBy=1`:

| Scores  | Current | Correct | Reason                                       |
| ------- | ------- | ------- | -------------------------------------------- |
| 21-20   | valid   | valid   | Winner at 21, lead by 1, game ended          |
| 22-21   | valid   | **invalid** | Should have ended at 21-20               |
| 25-11   | valid   | **invalid** | Should have ended at 21-11               |

### Bug 1b: Same issue in client-side schema

`scoreSchema.ts` has the same permissive `minPoints` + `winBy` checks that allow `25-11` on the client side. Must be fixed in parallel with the server side.

## Location

- `scores.remote.ts` — `saveScore` (line 67) and `saveSetScore` (line 126): missing `return` before `invalid()`, and permissive validation rule
- `scoreSchema.ts` — `createScoreSchema` and `createSetScoreSchema`: permissive validation rule (same fix needed, client-side)
- `scores.remote.ts` line 42-65 `getMatchContext`: guard clauses need `return invalid()` pattern

## Validation Rule

Implement a helper function shared between client and server:

```ts
function isValidFinalScore(winnerScore: number, loserScore: number, minPoints: number, winBy: number): boolean {
	if (winnerScore < minPoints) return false;
	if (winnerScore - loserScore < winBy) return false;
	// If loser not within striking distance, winner must be exactly minPoints
	if (loserScore < minPoints - winBy + 1) {
		return winnerScore === minPoints;
	}
	// Deuce: winner must have exactly loser_score + winBy
	return winnerScore === loserScore + winBy;
}
```

## Changes Required

### `scores.remote.ts`
1. Add `return` before every `invalid()` call in both `saveScore` and `saveSetScore`
2. Add the deuce-aware validation rule (shared helper or inline)
3. Fix null/error guard to `return invalid(...)` or early return

### `scoreSchema.ts`
1. Add the deuce-aware validation rule to both `createScoreSchema` and `createSetScoreSchema`
2. Consider extracting to a shared validation helper in `$lib/tournament-logic.ts`

### Shared validation helper
Move the `isValidFinalScore` function to `$lib/tournament-logic.ts` (or a new `$lib/score-validation.ts`) so both `scores.remote.ts` and `scoreSchema.ts` use the same logic.

## Considerations

- **Deciding sets**: The deciding set (e.g., 3rd set to 15) uses `decidingSetPoints` as `minPoints`, not the regular `pointsToWin`. The `createSetScoreSchema` already handles this via `isDecidingSet()`.
- **Scoring overrides**: Server-side uses `getEffectiveScoring()` which already resolves per-court-type overrides. The client receives effective values from the server load function.
- **Existing E2E tests**: Need to verify that no existing test enters scores like `25-11` that would now be rejected. If such tests exist, fix them to use valid scores.
