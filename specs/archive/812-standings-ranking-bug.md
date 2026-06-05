# 812 Standings Ranking Bug

## Issue

Standings after round 1 in random seed format are wrong. Players should be ranked by:

1. Current round court position (primary)
2. Court rank within that position
3. Points earned (tertiary)

Currently ranking by points first, which is incorrect.

## Expected Behavior

For random seed format after Round 1:

- Players are redistributed based on their court finish position, not total points
- The standings should reflect this: court position is the primary ranking criterion
- Points are only used as a tiebreaker within the same court position

## Files Affected

- `src/lib/server/tournament-logic.ts` - Standings calculation
- `src/routes/tournament/[id]/standings/+page.svelte` - Standings display
- `src/routes/court/[token]/+page.svelte` - Court-level standings
