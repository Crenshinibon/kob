# 814 Fetch Errors in Browser Console

## Issue

In `tournament.spec.ts` test "complete 2-round tournament with score entry", there are multiple "Failed to fetch" errors in the browser console.

## Root Cause

Likely caused by:
- Live query streaming connections being interrupted
- Form submissions conflicting with live query connections
- Navigation happening before fetch completes

## Investigation Needed

- Check if live query connections are properly managed
- Verify form submission doesn't interfere with streaming
- Ensure proper cleanup of connections on navigation

## Files Affected
- `src/routes/tournament/[id]/+page.svelte` - Live query usage
- `src/routes/tournament/[id]/tournament-actions.remote.ts` - Form handling
