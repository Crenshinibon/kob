# Retirement Crash on 5p Preseed Court

## Bug

Retiring a player from a 5p court **before any games are entered** in the second round of a preseed tournament crashes the server. The tournament page shows no courts after retirement. Reload doesn't fix it.

```
TypeError: Cannot read properties of undefined (reading 'playerIds')
    at distributeGroup (src/lib/tournament-logic.ts:432:15)
    at redistributePreseedRecursive (src/lib/tournament-logic.ts:386:13)
    at processPreseedTransition (src/lib/tournament-logic.ts:462:10)
```

## Root Cause

When a player retires pre-round (no scores entered), the retirement handler must:
1. Recalculate court sizes (5p → 4p or different config)
2. Delete current round's rotations (no scores were entered, safe to regenerate)
3. Redistribute remaining players

For preseed redistribution, `processPreseedTransition` is called with the ROUND 1 court results (from `completedRounds`). These come from the previous round's DB rotations. But when rebuilding the state for redistribution, the code may create an incomplete or undefined `courtResults` array — the 5p court that lost a player may not have a valid entry, or the court result indexing is off.

Specifically, `redistributePreseedRecursive` calls `distributeGroup` at line 386 which accesses `.playerIds` on court assignments. If the court results contain gaps (undefined entries) due to retirement recalculation, it crashes.

## Investigation Needed

Look at `tournament-logic.ts:432` in `distributeGroup`:
```typescript
const players = results.flatMap(r => r.standings.map(s => ({...})));
```

If `results` contains undefined entries or entries without `standings`, it crashes.

Also check the retirement flow in `tournament-actions.remote.ts` — how does it rebuild the state after retirement? Does it regenerate court results from the DB correctly for 5p courts after a player is removed?

## Acceptance Criteria

- [ ] Retiring a player from a 5p preseed court doesn't crash the server
- [ ] Tournament page shows correct redistributed courts after retirement
- [ ] Standings reflect the retirement correctly
- [ ] Works for both random-seed and preseed formats
- [ ] Works for 6p courts too (if affected)
