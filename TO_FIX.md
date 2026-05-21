# To Fix

## ToDo

- [] add job to delete tournaments that are closed and older then 14 days
- [] add job to delete tournaments that are not updated for 31 days
- [] add tests for 5p / 6p court redistribution
- [] we need a banner (for v1) to show that the data will be wiped
- [] Integration tests (in tournament.spec.ts) "scoring modes"" should go a step further and test that the scores must be entered as dictated by the selected mode.


## Done

- [x] 3p court in the matchups, the single player is shown twice
- [x] 5p court in the matchups, it should be clearer which matches "belong together", are executed simultaneously. And don't duplicate the match up in the top row. (Fixed: parallel games now share fixed team, UI shows run details)
- [x] 6p court in the matchups, it should be clearer which matches "belong together" (parallel games) and there is a bug. The first team in the first game should be the same as the first team in the second match, otherwise parallel games are not possible. (Fixed: parallel games now share fixed team per spec)
- [x] also for non-standard games we need an explanation of the format and how it should work
- [x] when we enter more than 64 names the system should raise a warning/error, that only max 64 are supported and that at least one player must be removed to proceed
- [x] add auto cleanup after test runs
- [x] add script to wipe all tournaments from the database (`npm run db:wipe`)
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

