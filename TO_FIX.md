# To Fix

## ToDo

- [] Tournament view layout is broken, it covers whole width of the browser, instead of the previous "centralized" layout.
- [] Change the input type from <select> for "Match Format" and "Win By" to "radio", because we have only two options.
- [] We need an option for the Org, to overwrite the "scoring mode" for the 6p, 3p, and 5p courts, if they are (or become, because of retiring players) relevant for his tournament. 
- [] There should be a way to remove a player from the tournament during a round and the affected court should handle this gracefully.Adjusting the court to a different format (to 3p from 4p, to 5p from 6p, to 4p from 5p) is not an option, because we would have to deal with already played matches and how to score the other players. I guess we need to investigate here, a little bit.
- [] It's still not possible to enter 2nd and 3rd set.
- [] Investigate configuration issue for E2E tests, those were working yesterday
- [] Delete tournament still not working!
- [] There is an UI glitch: when having a court whose player name enforce a second line and there are courts that only would show one line of player names the dark background of the playernames is extended to fill the two lines.
- [] I get this warning on the tournament page:
  client.js?v=ad69a31c:3356 [svelte] await_reactivity_lossDetected reactivity loss when reading `LiveQuery.#promise`. This happens when state is read in an async function after an earlier `await`https://svelte.dev/e/await_reactivity_loss
  warn @ client.js?v=ad69a31c:3356
  await_reactivity_loss @ warnings-2hVNjS22.js?v=ad69a31c:18
  get @ runtime-CkG8d-0H.js?v=ad69a31c:5051
  (anonymous) @ query-live.svelte.js?v=ad69a31c:185
  update_reaction @ runtime-CkG8d-0H.js?v=ad69a31c:4886
  execute_derived @ runtime-CkG8d-0H.js?v=ad69a31c:3388
  update_derived @ runtime-CkG8d-0H.js?v=ad69a31c:3402
  is_dirty @ runtime-CkG8d-0H.js?v=ad69a31c:4832
  #traverse @ runtime-CkG8d-0H.js?v=ad69a31c:1936
  #process @ runtime-CkG8d-0H.js?v=ad69a31c:1869
  flush @ runtime-CkG8d-0H.js?v=ad69a31c:2041
  (anonymous) @ runtime-CkG8d-0H.js?v=ad69a31c:2180
  run_all @ runtime-CkG8d-0H.js?v=ad69a31c:40
  run_micro_tasks @ runtime-CkG8d-0H.js?v=ad69a31c:1146
  (anonymous) @ runtime-CkG8d-0H.js?v=ad69a31c:1155
  client.js?v=ad69a31c:3356 traced at
    at query-live.svelte.js?v=ad69a31c:185:16
- [] When entering points for matches the rules are not enforced correctly. In a 6 player court, that was supposed to go to 15 I could enter 13 vs 11 without the system complaining
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

