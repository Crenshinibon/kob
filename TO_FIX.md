# To Fix

## ToDo

- [ ] Mid-round player removal: There should be a way to remove a player during an active round and handle it gracefully. Adjusting the court format mid-round is not viable (already-played matches), so Options A (substitute) and C (solo play) from `670_player-retirement.md` need implementation. The cancel & average (Option B) is implemented in scoring logic but lacks UI.
- [ ] Add E2E tests for 5p / 6p court redistribution
- [ ] We need a banner (for v1) to show that the data will be wiped

## Known Issues

- [ ] **E2E tests fail due to live query polling delay** — Tests wait for "Finalize Tournament" or "Close Round & Advance" button but it's not in the DOM until the 3-second live query poll refreshes `canCloseRound`. The disabled state renders as a completely different button ("⏳ Waiting for all scores..."). Two tests affected: `promotion.spec.ts:275` and `tournament.spec.ts:810`. See `specs/860_e2e-live-query-timing.md`.
- [ ] `winBy` validation hardcoded to 2 — Score validation in `scoreSchema.ts` and `scores.remote.ts` always requires win-by-2, ignoring tournament's `winBy` config (e.g., `winBy: 1`)
- [ ] Remove dead schema tables — `match_3_player`, `match_5_player`, `match_6_player` exist but are never used. All 3p/5p/6p matches go through the main `match` table with nullable player columns. Separate tables were the original plan for strong typing, but the current approach works and migrating would be high-risk for no user-visible benefit. Remove the dead tables and their Drizzle definitions.
- [ ] No live query reconnect after `retirePlayer` / `reportInjury` — The live query on the tournament page doesn't auto-update after these server actions
- [ ] Duplicate `saveScore` — Both a legacy server action in `+page.server.ts` AND a remote form in `scores.remote.ts`. The server action is dead code.
- [ ] Draft status unused — Tournaments skip draft status and go straight to active on creation. The `status: 'draft'` default in schema is misleading.
- [ ] Broken `/tournament/[id]/players` link — Dashboard links to this route but it doesn't exist. Player management is now on the creation form.
- [ ] `retirePlayer` and `reportInjury` are still legacy server actions, not remote functions
- [ ] `create` tournament action is still a legacy server action, not a remote function
- [ ] `matchGroups()` and other derived functions return functions instead of values (unusual Svelte 5 pattern)

## Done

- [x] Use Bun's built-in capabilities for scripts instead of npx/tsx/npm (Fixed: db:wipe, db:cleanup use `bun`, auth:schema uses `bunx`, removed `dotenv` dependency, updated AGENTS.md with Bun-first policy)
- [x] Integration tests (in tournament.spec.ts) "scoring modes" should go a step further and test that the scores must be entered as dictated by the selected mode. (Fixed: best-of-3 per-set validation, single-set min points, 5p min points E2E tests all pass)
- [x] add job to delete tournaments that are closed and older then 14 days
- [x] add script to wipe all tournaments from the database (`bun run db:wipe`)
- [x] add job to delete tournaments that are not updated for 31 days
- [x] For Best-Of-3 matches the entry for the third set should only be visible when each team one a set. Also the rules 3rd set to 15 are not enforced. Entering the scores is weird also, when I enter points in all fields and then click save. The entered scores "are shifted around". (Fixed: deciding set shown only when split 1-1, min points enforced per set, score shifting fixed with keyed {#each}, sorted sets, correct team labels lookup)
- [x] Tournament view layout is broken, it covers whole width of the browser, instead of the previous "centralized" layout.
- [x] We need an option for the Org, to overwrite the "scoring mode" for the 6p, 3p, and 5p courts, if they are (or become, because of retiring players) relevant for his tournament. (Fixed: scoringOverrides JSONB column on tournament, per-court-type scoring config UI)
- [x] Change the input type from <select> for "Match Format" and "Win By" to "radio", because we have only two options.
- [x] It's still not possible to enter 2nd and 3rd set.
- [x] Delete tournament still not working!
- [x] There is an UI glitch: when having a court whose player name enforce a second line and there are courts that only would show one line of player names the dark background of the playernames is extended to fill the two lines.
- [x] await_reactivity_loss warning on the tournament page - fixed by wrapping live query call in $derived
- [x] Score validation not enforced correctly (6p court accepted 13 vs 11) - removed point caps, now enforces minimum points + win by 2 only
- [x] E2E test configuration - global-setup.ts and db.ts properly configured with dotenv
- [x] 3p court in the matchups, the single player is shown twice
- [x] 5p court in the matchups, it should be clearer which matches "belong together", are executed simultaneously. And don't duplicate the match up in the top row. (Fixed: parallel games now share fixed team, UI shows run details)
- [x] 6p court in the matchups, it should be clearer which matches "belong together" (parallel games) and there is a bug. The first team in the first game should be the same as the first team in the second match, otherwise parallel games are not possible. (Fixed: parallel games now share fixed team per spec)
- [x] also for non-standard games we need an explanation of the format and how it should work
- [x] when we enter more than 64 names the system should raise a warning/error, that only max 64 are supported and that at least one player must be removed to proceed
- [x] add auto cleanup after test runs
- [x] QR codes in round overview are sometimes not loaded fast enough and don't update, when ready
- [x] Round overview live query is not working also?
- [x] closeRound errors hard: requested(...) can only be called in the context of a command/form remote function
- [x] Standings after round 1 in random seed are wrong. The players should be ranked by their current round court position and the reason why the earned the spot, court rank and then points from first round. Also never rank on points first. It's always court position first.
- [x] In "tournament.spec.ts/Tournament Integration Tests/complete 2-round tournament with score entry" I see quite some "Failed to fetch" errors in the browser console. (Partially addressed with live query reconnect button)
- [x] extend Non-Standard court Standings tests to actually enter points and see if the players are ranked correctly
- [x] calculateTournamentDuration is duplicated, in tournament/create/+page.svelte and tournament-logic.ts - check for even more duplicated code!
- [x] The notion of a tournament-draft is overhead. We create a tournament and that also starts it. We need the option to edit the settings of the current "running" tournament and recalculate the seeding/first courts (but only when no results are entered yet)
- [x] tournament/[id]/players not needed
- [x] Don't use server actions, but RemoteFunctions command or form
- [x] Use proper live() query from RemoteFunctions (https://svelte.dev/docs/kit/remote-functions#query.live) with server-side polling or realtime queries from db
- [x] Update database schema with set_number column for best-of-3 support (match, match_3_player, match_5_player, match_6_player tables)
- [x] score entry doesn't reflect game mode. When we have best of 3 mode we should allow to enter the scores for 3 sets.