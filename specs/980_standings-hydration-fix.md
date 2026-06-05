# Standings Page Hydration Error

## Bug

Standings page throws hydration error on load:

```
hydratable_missing_but_required
Expected to find a hydratable with key `tkwzue/getStandingsDataLive/WzUzNTRd` during hydration, but did not.
```

The `query.live()` in `$derived()` produces a `LiveQuery` object that Svelte 5 can't hydrate. This breaks the page entirely — users see "Loading..." forever, even when all courts have completed games or the tournament has advanced past round 1.

## Root Cause

In `+page.svelte`:
```svelte
const liveQuery = $derived(getStandingsDataLive(data.tournamentId));
```

`query.live()` returns an object that's not JSON-serializable (it's an async generator). When placed in a `$derived`, Svelte 5 tries to hydrate it but can't — the server and client produce different keys.

**Two fixes needed:**

### Fix A: Move Live Query to Client-Only

Wrap in `browser` check so the live query only runs on the client:
```svelte
import { browser } from '$app/environment';

let liveQuery = $state<ReturnType<typeof getStandingsDataLive> | undefined>();
$effect(() => {
    if (browser) liveQuery = getStandingsDataLive(data.tournamentId);
});
```

The template already uses `{#await liveQuery}` which handles the initial undefined state by showing the loading section.

### Fix B: Show Players Without Scores

When no standings exist (before any scores), show all players at neutral ranking (same position), alphabetically or by player ID. Don't show "Loading..." — show the player list with "No scores yet" indicator:

```
Place | Pos | Player | Points | Diff | Rounds
  —   |  —  | Alice  |   0   |  0   |   0
  —   |  —  | Bob    |   0   |  0   |   0
  ...
```

This happens when `standings.length === 0` (the "empty" section currently shows placeholder text). Instead, render the table with all players at zero.

## Implementation

### Phase 1: Fix Hydration (Critical)

**File**: `src/routes/tournament/[id]/standings/+page.svelte`

- Remove `$derived(getStandingsDataLive(...))` 
- Use `$state` + `$effect` with `browser` guard
- Template already handles `{#await liveQuery}` correctly (shows loading when `liveQuery` is undefined)

### Phase 2: Show All Players Before Any Scores

**File**: `src/routes/tournament/[id]/standings/+page.svelte`

- When `standings.length === 0`, render a table with all players (from `state.players`)
- Show dashes or zeros for missing data
- Keep the `courtSizes` and `players` data available for this

Or simpler: the server always returns `standings` even if zero scores — it sorts empty stats to neutral ranking. Check if `players` is returned from the live query data.

## Acceptance Criteria

- [x] No hydration error on standings page load
- [x] Live query still polls every 3 seconds (client-side only)
- [x] Standings page shows all players even when no scores entered yet
- [x] "Loading..." only shown during initial data fetch (first 3 seconds)
