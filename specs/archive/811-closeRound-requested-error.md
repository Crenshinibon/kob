# 811 closeRound requested() Error

## Issue

When closing a round, the following error occurs:

```
[500] POST /tournament/292
Error: requested(...) can only be called in the context of a command/form remote function
at requested (node_modules/@sveltejs/kit/src/runtime/app/server/remote/requested.js:127:9)
at closeRound (src/routes/tournament/[id]/+page.server.ts:389:11)
```

## Root Cause

The `requested()` function from `$app/server` is being called outside the context of a remote function handler. This is likely leftover code from a previous implementation that used server actions instead of RemoteFunctions.

## Fix

- Remove any `requested()` calls from `+page.server.ts` actions
- If refresh logic is needed, it should be in the `tournament-actions.remote.ts` form handler
- Use `getTournamentDataLive(tournamentId).reconnect()` for live query reconnection instead

## Files Affected

- `src/routes/tournament/[id]/+page.server.ts` - Remove requested() calls
- `src/routes/tournament/[id]/tournament-actions.remote.ts` - Ensure proper reconnection
