# Live Query Timeout (Vercel 300s)

## Problem

Vercel logs show `Task timed out after 300 seconds` on:

- `/_app/remote/i9cliw/getTournamentDataLive`
- `/_app/remote/tkwzue/getStandingsDataLive`

These are `query.live()` generators that poll every 3 seconds in an infinite `while(true)` loop. Vercel serverless functions have a max execution time (10s hobby, 60s pro, 300s on some plans). The live query never terminates, so it hits the timeout.

## Root Cause

`query.live()` from `$app/server` (SvelteKit remote functions) creates a long-lived server connection:

```ts
// tournament-data.remote.ts:270
export const getTournamentDataLive = query.live(v.number(), async function* (tournamentId) {
	while (true) {
		yield await fetchTournamentData(tournamentId);
		await new Promise((f) => setTimeout(f, 3000));
	}
});
```

This is a **streaming response** — the server keeps the connection open and yields new data every 3s. On Vercel serverless, this exceeds the function timeout.

Additionally, `fetchTournamentData()` is expensive:

- 1 query for tournament
- 1 query for all players
- 1 query for rotation IDs (current round)
- 1 query for all matches (current round)
- 1 query for display round rotations
- **N queries for matches per rotation** (line 156: `for (const rotation of rotations)`)
- **N queries for court access per rotation** (line 158)
- Total: ~3 + 2N queries per poll, where N = number of courts

For 8 courts: ~19 queries every 3 seconds.

## Plan

### 1. Replace `query.live()` with client-side polling

Server should not hold connections open. Instead:

- Keep `getTournamentData` (non-live) as a regular `query()`
- Client polls via `setInterval` or `query.live()` with abort after first yield
- Or use SvelteKit's built-in revalidation pattern

### 2. Batch DB queries in `fetchTournamentData()`

Replace N+1 queries with batched queries:

```ts
// Instead of per-rotation queries:
const allMatches = await db
	.select()
	.from(match)
	.where(inArray(match.courtRotationId, rotationIdList));

const allCourts = await db
	.select()
	.from(court)
	.where(
		inArray(
			court.id,
			rotationIds.map((r) => r.courtId)
		)
	);
```

Reduces ~19 queries to ~5 per request.

### 3. Same for `fetchStandingsData()`

Line 88: `for (const rotation of roundRotations)` queries matches per rotation inside a nested loop over rounds. Batch all match queries upfront.

### 4. Consider SSE or WebSocket for true live updates

If polling is too heavy, use Server-Sent Events with a timeout, or switch to a push-based model (e.g., Vercel KV pub/sub). But client-side polling at 5-10s intervals is simpler and sufficient.

## References

- `src/routes/tournament/[id]/tournament-data.remote.ts` — `getTournamentDataLive` (line 270)
- `src/routes/tournament/[id]/standings/standings-data.remote.ts` — `getStandingsDataLive` (line 189)
- `specs/980_standings-hydration-fix.md` — related `query.live()` hydration issue
- `specs/archive/860_e2e-live-query-timing.md` — live query polling timing
