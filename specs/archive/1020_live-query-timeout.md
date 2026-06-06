# Live Query Timeout (Vercel 300s)

## Problem

Vercel logs show `Task timed out after 300 seconds` on:

- `/_app/remote/i9cliw/getTournamentDataLive`
- `/_app/remote/tkwzue/getStandingsDataLive`

`query.live()` generators run infinite `while(true)` loops. Vercel serverless functions have max execution time limits. The live query never terminates, so it hits the timeout.

## Fix (IMPLEMENTED)

Replaced `query.live()` with standard `query()` + client-side polling via `.refresh()`:

### Server-side

- Removed `getTournamentDataLive` and `getStandingsDataLive` (the `query.live()` generators)
- Kept `getTournamentData` and `getStandingsData` as regular `query()` functions
- Replaced all `.reconnect()` calls in mutation handlers with `.refresh()` (single-flight mutations)

### Client-side

- Tournament page: `getTournamentData(id)` + `setInterval` polling every 5s with `.refresh().catch(() => {})`
- Standings page: `getStandingsData(id)` + `setInterval` polling every 5s
- Removed reconnect button (not needed with polling)
- Removed `ssr = false` from standings page (no longer needed without `query.live()`)

### Files changed

- `src/routes/tournament/[id]/tournament-data.remote.ts` — removed `getTournamentDataLive`
- `src/routes/tournament/[id]/standings/standings-data.remote.ts` — removed `getStandingsDataLive`, cleaned unused imports
- `src/routes/tournament/[id]/+page.svelte` — replaced live query with polling
- `src/routes/tournament/[id]/standings/+page.svelte` — replaced live query with polling
- `src/routes/tournament/[id]/standings/+page.ts` — removed (was `ssr = false`)
- `src/routes/tournament/[id]/tournament-actions.remote.ts` — `.reconnect()` → `.refresh()`

## Deferred

- **Batch DB queries** in `fetchTournamentData()` and `fetchStandingsData()` — N+1 query problem still exists but is fast enough for now. Can optimize later if needed.
