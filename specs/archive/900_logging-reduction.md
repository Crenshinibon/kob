# 900 Logging Reduction

## Status: PRACTICALLY ALREADY DONE

The codebase is exceptionally clean — only **one** `console.log` statement exists in the entire `src/` directory.

## The One Offender

**`src/routes/tournament/[id]/tournament-data.remote.ts` line 117**:

```ts
console.log('canCloseRound debug:', {
	tournamentId,
	currentRound,
	allMatchesLength: allMatches.length,
	expectedMatchCount,
	completedMatchCount,
	canCloseRound,
	matchDetails: allMatches.map((m) => ({
		id: m.id,
		courtRotationId: m.courtRotationId,
		matchNumber: m.matchNumber,
		isCanceled: m.isCanceled,
		teamAScore: m.teamAScore,
		teamBScore: m.teamBScore
	}))
});
```

This is a leftover debug statement used during development of the `canCloseRound` computation.

## Fix

Just remove the `console.log` call and its surrounding block.

## Future-Proofing

If debug logging is needed in the future, use one of these approaches:

1. **`console.debug()`**: Standard practice; can be hidden in production browsers by default
2. **Environment-gated logging**: Check `import { dev } from '$app/environment'` to only log in development mode
3. **No logging framework needed**: The codebase is small enough that a simple `if (dev) console.debug(...)` suffices

## Files Changed

- `src/routes/tournament/[id]/tournament-data.remote.ts` — remove lines 117-132 (the `console.log` block)
