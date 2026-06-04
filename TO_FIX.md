# To Fix

## ToDo

- [] On "create tournament" page, the top end (16) of the physical courts slider is not at the right most position, but rather right behind the label displaying the current selected number of courts.
- [] On "standings" page. When there are no entries for the first round, it shows just "Loading...". Same with one court (or even all courts) having completed all games. Even after advancing to the 2nd round. Maybe more situations. The standings page should show all players with no current information about at the same place, after players, that already have points. Also there is an error in the browser console: 

  client.js?v=9c92af44:403 Uncaught (in promise) Svelte error: hydratable_missing_but_required
  Expected to find a hydratable with key `tkwzue/getStandingsDataLive/WzUzNTRd` during hydration, but did not.
  https://svelte.dev/e/hydratable_missing_but_required

    in <unknown>
    in +page.svelte
    in +layout.svelte
    in root.svelte
    in undefined

      at hydratable_missing_but_required (runtime-D3V00VyR.js?v=9c92af44:446:33)
      at Module.hydratable (index-client-CGdGfIZo.js?v=9c92af44:4057:3)
      at unfriendly_hydratable (shared.js?v=9c92af44:320:16)
      at new LiveQuery (instance.svelte.js?v=9c92af44:99:22)
      at proxy.js?v=9c92af44:32:61
      at cache.svelte.js?v=9c92af44:62:18
      at update_reaction (runtime-D3V00VyR.js?v=9c92af44:4880:16)
      at update_effect (runtime-D3V00VyR.js?v=9c92af44:4980:18)
      at create_effect (runtime-D3V00VyR.js?v=9c92af44:4304:4)
      at Module.effect_root (runtime-D3V00VyR.js?v=9c92af44:4380:17)
  hydratable_missing_but_required @ runtime-D3V00VyR.js?v=9c92af44:446
  hydratable @ index-client-CGdGfIZo.js?v=9c92af44:4057
  unfriendly_hydratable @ shared.js?v=9c92af44:320
  LiveQuery @ instance.svelte.js?v=9c92af44:99
  (anonymous) @ proxy.js?v=9c92af44:32
  (anonymous) @ cache.svelte.js?v=9c92af44:62
  update_reaction @ runtime-D3V00VyR.js?v=9c92af44:4880
  update_effect @ runtime-D3V00VyR.js?v=9c92af44:4980
  create_effect @ runtime-D3V00VyR.js?v=9c92af44:4304
  effect_root @ runtime-D3V00VyR.js?v=9c92af44:4380
  ensure_entry @ cache.svelte.js?v=9c92af44:61
  LiveQueryProxy @ proxy.js?v=9c92af44:32
  wrapper @ index.js?v=9c92af44:26
  (anonymous) @ +page.svelte:10
  update_reaction @ runtime-D3V00VyR.js?v=9c92af44:4880
  execute_derived @ runtime-D3V00VyR.js?v=9c92af44:3375
  update_derived @ runtime-D3V00VyR.js?v=9c92af44:3389
  get @ runtime-D3V00VyR.js?v=9c92af44:5077
  (anonymous) @ +page.svelte:73
  (anonymous) @ index-client-CGdGfIZo.js?v=9c92af44:605
  update_reaction @ runtime-D3V00VyR.js?v=9c92af44:4880
  update_effect @ runtime-D3V00VyR.js?v=9c92af44:4980
  create_effect @ runtime-D3V00VyR.js?v=9c92af44:4304
  block @ runtime-D3V00VyR.js?v=9c92af44:4496
  await_block @ index-client-CGdGfIZo.js?v=9c92af44:603
  (anonymous) @ +page.svelte:73
  add_svelte_meta @ runtime-D3V00VyR.js?v=9c92af44:979
  _page @ +page.svelte:73
  (anonymous) @ index-client-CGdGfIZo.js?v=9c92af44:249
  update_reaction @ runtime-D3V00VyR.js?v=9c92af44:4880
  update_effect @ runtime-D3V00VyR.js?v=9c92af44:4980
  create_effect @ runtime-D3V00VyR.js?v=9c92af44:4304
  branch @ runtime-D3V00VyR.js?v=9c92af44:4513
  (anonymous) @ index-client-CGdGfIZo.js?v=9c92af44:246
  update_reaction @ runtime-D3V00VyR.js?v=9c92af44:4880
  update_effect @ runtime-D3V00VyR.js?v=9c92af44:4980
  create_effect @ runtime-D3V00VyR.js?v=9c92af44:4304
  block @ runtime-D3V00VyR.js?v=9c92af44:4496
  wrapper @ index-client-CGdGfIZo.js?v=9c92af44:240
  (anonymous) @ root.svelte:52
  (anonymous) @ index-client-CGdGfIZo.js?v=9c92af44:1426
  (anonymous) @ index-client-CGdGfIZo.js?v=9c92af44:563
  update_reaction @ runtime-D3V00VyR.js?v=9c92af44:4880
  update_effect @ runtime-D3V00VyR.js?v=9c92af44:4980
  create_effect @ runtime-D3V00VyR.js?v=9c92af44:4304
  branch @ runtime-D3V00VyR.js?v=9c92af44:4513
  ensure @ index-client-CGdGfIZo.js?v=9c92af44:563
  (anonymous) @ index-client-CGdGfIZo.js?v=9c92af44:1426
  update_reaction @ runtime-D3V00VyR.js?v=9c92af44:4880
  update_effect @ runtime-D3V00VyR.js?v=9c92af44:4980
  create_effect @ runtime-D3V00VyR.js?v=9c92af44:4304
  block @ runtime-D3V00VyR.js?v=9c92af44:4496
  component @ index-client-CGdGfIZo.js?v=9c92af44:1413
  (anonymous) @ root.svelte:50
  add_svelte_meta @ runtime-D3V00VyR.js?v=9c92af44:979
  (anonymous) @ root.svelte:50
  snippet @ index-client-CGdGfIZo.js?v=9c92af44:1359
  (anonymous) @ index-client-CGdGfIZo.js?v=9c92af44:1345
  (anonymous) @ index-client-CGdGfIZo.js?v=9c92af44:563
  update_reaction @ runtime-D3V00VyR.js?v=9c92af44:4880
  update_effect @ runtime-D3V00VyR.js?v=9c92af44:4980
  create_effect @ runtime-D3V00VyR.js?v=9c92af44:4304
  branch @ runtime-D3V00VyR.js?v=9c92af44:4513
  ensure @ index-client-CGdGfIZo.js?v=9c92af44:563
  (anonymous) @ index-client-CGdGfIZo.js?v=9c92af44:1345
  update_reaction @ runtime-D3V00VyR.js?v=9c92af44:4880
  update_effect @ runtime-D3V00VyR.js?v=9c92af44:4980
  create_effect @ runtime-D3V00VyR.js?v=9c92af44:4304
  block @ runtime-D3V00VyR.js?v=9c92af44:4496
  snippet @ index-client-CGdGfIZo.js?v=9c92af44:1342
  (anonymous) @ +layout.svelte:36
  add_svelte_meta @ runtime-D3V00VyR.js?v=9c92af44:979
  _layout @ +layout.svelte:36
  (anonymous) @ index-client-CGdGfIZo.js?v=9c92af44:249
  update_reaction @ runtime-D3V00VyR.js?v=9c92af44:4880
  update_effect @ runtime-D3V00VyR.js?v=9c92af44:4980
  create_effect @ runtime-D3V00VyR.js?v=9c92af44:4304
  branch @ runtime-D3V00VyR.js?v=9c92af44:4513
  (anonymous) @ index-client-CGdGfIZo.js?v=9c92af44:246
  update_reaction @ runtime-D3V00VyR.js?v=9c92af44:4880
  update_effect @ runtime-D3V00VyR.js?v=9c92af44:4980
  create_effect @ runtime-D3V00VyR.js?v=9c92af44:4304
  block @ runtime-D3V00VyR.js?v=9c92af44:4496
  wrapper @ index-client-CGdGfIZo.js?v=9c92af44:240
  (anonymous) @ root.svelte:50
  (anonymous) @ index-client-CGdGfIZo.js?v=9c92af44:1426
  (anonymous) @ index-client-CGdGfIZo.js?v=9c92af44:563
  update_reaction @ runtime-D3V00VyR.js?v=9c92af44:4880
  update_effect @ runtime-D3V00VyR.js?v=9c92af44:4980
  create_effect @ runtime-D3V00VyR.js?v=9c92af44:4304
  branch @ runtime-D3V00VyR.js?v=9c92af44:4513
  ensure @ index-client-CGdGfIZo.js?v=9c92af44:563
  (anonymous) @ index-client-CGdGfIZo.js?v=9c92af44:1426
  update_reaction @ runtime-D3V00VyR.js?v=9c92af44:4880
  update_effect @ runtime-D3V00VyR.js?v=9c92af44:4980
  create_effect @ runtime-D3V00VyR.js?v=9c92af44:4304
  block @ runtime-D3V00VyR.js?v=9c92af44:4496
  component @ index-client-CGdGfIZo.js?v=9c92af44:1413
  (anonymous) @ root.svelte:48
  add_svelte_meta @ runtime-D3V00VyR.js?v=9c92af44:979
  (anonymous) @ root.svelte:48
  (anonymous) @ index-client-CGdGfIZo.js?v=9c92af44:563
  update_reaction @ runtime-D3V00VyR.js?v=9c92af44:4880
  update_effect @ runtime-D3V00VyR.js?v=9c92af44:4980
  create_effect @ runtime-D3V00VyR.js?v=9c92af44:4304
  branch @ runtime-D3V00VyR.js?v=9c92af44:4513
  ensure @ index-client-CGdGfIZo.js?v=9c92af44:563
  update_branch @ index-client-CGdGfIZo.js?v=9c92af44:695
  (anonymous) @ index-client-CGdGfIZo.js?v=9c92af44:701
  (anonymous) @ root.svelte:47
  (anonymous) @ index-client-CGdGfIZo.js?v=9c92af44:699
  update_reaction @ runtime-D3V00VyR.js?v=9c92af44:4880
  update_effect @ runtime-D3V00VyR.js?v=9c92af44:4980
  create_effect @ runtime-D3V00VyR.js?v=9c92af44:4304
  block @ runtime-D3V00VyR.js?v=9c92af44:4496
  if_block @ index-client-CGdGfIZo.js?v=9c92af44:697
  (anonymous) @ root.svelte:58
  add_svelte_meta @ runtime-D3V00VyR.js?v=9c92af44:979
  (anonymous) @ root.svelte:58
  (anonymous) @ index-client-CGdGfIZo.js?v=9c92af44:249
  update_reaction @ runtime-D3V00VyR.js?v=9c92af44:4880
  update_effect @ runtime-D3V00VyR.js?v=9c92af44:4980
  create_effect @ runtime-D3V00VyR.js?v=9c92af44:4304
  branch @ runtime-D3V00VyR.js?v=9c92af44:4513
  (anonymous) @ index-client-CGdGfIZo.js?v=9c92af44:246
  update_reaction @ runtime-D3V00VyR.js?v=9c92af44:4880
  update_effect @ runtime-D3V00VyR.js?v=9c92af44:4980
  create_effect @ runtime-D3V00VyR.js?v=9c92af44:4304
  block @ runtime-D3V00VyR.js?v=9c92af44:4496
  wrapper @ index-client-CGdGfIZo.js?v=9c92af44:240
  (anonymous) @ legacy-client-0YmydX9j.js?v=9c92af44:565
  Boundary.#children @ runtime-D3V00VyR.js?v=9c92af44:2676
  (anonymous) @ runtime-D3V00VyR.js?v=9c92af44:2696
  update_reaction @ runtime-D3V00VyR.js?v=9c92af44:4880
  update_effect @ runtime-D3V00VyR.js?v=9c92af44:4980
  create_effect @ runtime-D3V00VyR.js?v=9c92af44:4304
  branch @ runtime-D3V00VyR.js?v=9c92af44:4513
#hydrate_resolved_content @ runtime-D3V00VyR.js?v=9c92af44:2696
  (anonymous) @ runtime-D3V00VyR.js?v=9c92af44:2689
  update_reaction @ runtime-D3V00VyR.js?v=9c92af44:4880
  update_effect @ runtime-D3V00VyR.js?v=9c92af44:4980
  create_effect @ runtime-D3V00VyR.js?v=9c92af44:4304
  block @ runtime-D3V00VyR.js?v=9c92af44:4496
  Boundary @ runtime-D3V00VyR.js?v=9c92af44:2680
  boundary @ runtime-D3V00VyR.js?v=9c92af44:2611
  (anonymous) @ legacy-client-0YmydX9j.js?v=9c92af44:557
  update_reaction @ runtime-D3V00VyR.js?v=9c92af44:4880
  update_effect @ runtime-D3V00VyR.js?v=9c92af44:4980
  create_effect @ runtime-D3V00VyR.js?v=9c92af44:4304
  component_root @ runtime-D3V00VyR.js?v=9c92af44:4392
  _mount @ legacy-client-0YmydX9j.js?v=9c92af44:555
  hydrate @ legacy-client-0YmydX9j.js?v=9c92af44:524
  Svelte4Component @ legacy-client-0YmydX9j.js?v=9c92af44:836
  (anonymous) @ legacy-client-0YmydX9j.js?v=9c92af44:787
  initialize @ client.js?v=9c92af44:687
  _hydrate @ client.js?v=9c92af44:3039
  await in _hydrate
  start @ client.js?v=9c92af44:391
  await in start
  (anonymous) @ standings:464
  Promise.then
  (anonymous) @ standings:463

- [] When we have a 5p court (6p might also be affected) and I select the "Court Scoring Configuration" the court defaults to Points to Win == 21, despite the info text in the bottom showing "1 set to 15"
- [] Court standings for 5p court (6p might also be affected) the points and diff are not rounded, when using average points. We should at most show 2 decimals. The same is true for standings page. We need to round there as well.
- [] "SAVE SCORE" sometimes doesn't seem to react on first click, when there is an input error. The first score for a court page always seems to behave this way.
- [] Retiring a player from a 5p court in round 2 of a tournament, showed no courts after the retirement form returned. Reloading the page didn't fix it either. But the standings do work now?! The server is logging this:

[500] POST /tournament/5354
TypeError: Cannot read properties of undefined (reading 'playerIds')
    at distributeGroup (src/lib/tournament-logic.ts:432:15)
    at redistributePreseedRecursive (src/lib/tournament-logic.ts:386:13)
    at processPreseedTransition (src/lib/tournament-logic.ts:462:10)
    at /home/dirk/Dev/kob/src/routes/tournament/[id]/tournament-actions.remote.ts:640:23
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async handle_remote_call_internal (node_modules/@sveltejs/kit/src/runtime/server/remote.js?v=8c637a4f:139:17)
    at async resolve (node_modules/@sveltejs/kit/src/runtime/server/respond.js?v=8c637a4f:600:12)
    at async fn (file:/home/dirk/Dev/kob/node_modules/@sveltejs/kit/src/exports/hooks/sequence.js:102:13)
    at async paraglideMiddleware (src/lib/paraglide/server.js:150:22)

[500] GET /tournament/5354
TypeError [ERR_INVALID_STATE]: Invalid state: Controller is already closed
    at ReadableStreamDefaultController.close (node:internal/webstreams/readablestream:1068:13)
    at Object.pull (/home/dirk/Dev/kob/node_modules/@sveltejs/kit/src/runtime/server/remote.js?v=8c637a4f:204:21)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)

[500] GET /tournament/5354
TypeError [ERR_INVALID_STATE]: Invalid state: Controller is already closed
    at ReadableStreamDefaultController.close (node:internal/webstreams/readablestream:1068:13)
    at Object.pull (/home/dirk/Dev/kob/node_modules/@sveltejs/kit/src/runtime/server/remote.js?v=8c637a4f:204:21)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)



## Done

- [x] in the standings view. To make it easier to visually "understand" the placing it's necessary to make the court-grouping more obvious. Either we could use different colors per court, a color gradient from top court to bottom court. starting with bright yellow at the top to brownish red at the bottom. Also the placing on each court needs to be bigger more visible as well.
- [x] Also, I wonder if we could change the ranking for pressed tournaments, so that we rank by bracket not necessarily by court. Investigate.
- [x] Yet another good addition for the Org in the tournaments page would be a text field for virtual courts, where the Org can enter the physical court "name" (free text, since some venues might use numbers, other letters). So that the players can see which physical court the need to play on.
- [x] Another question regarding the standings page: does this live update with incoming results and pre calculated standings? This way the players could view their current placement and chances to proceed in the global tournament context not only on their court.
- [x] the language switcher should be available on the landing page, when the user is not logged in. Currently it's only available after login. (Fixed: moved LanguageSwitcher outside auth check in +layout.svelte. Spec 920.)
- [x] When switching languages already made input in the create tournament form is lost. (Fixed: removed `data-sveltekit-reload` from LanguageSwitcher links. Paraglide reroute maps to same route ID, SvelteKit reuses component, `$state` survives natively. Added `$effect` syncing `document.documentElement.lang`. Spec 920.)
- [x] When switched to German, there is still this English text below the player input: One name per line, optionally with seed points: Name 1250 (Fixed: replaced hardcoded text with Paraglide messages in all 4 locales. Spec 920.)
- [x] WVV CSV Import: dort ist es nicht "Meldungen" sondern "Setzliste" (Fixed: updated `create_wvv_tip` and `create_wvv_summary` in all 4 locale files. Spec 920.)
- [x] The hint about tab separated columns is superfluous. Just list the supported methods. Like: Name and Points separated by comma, semicolon, tab or space are supported. (Fixed: simplified CSV help text in all 4 locales. Spec 920.)
- [x] Also for randomseed we dont need and want the points. So we should make that clear in the description, maybe show different descriptions help text based on the the selected format. (Fixed: format-specific help text — random seed shows "One name per line", preseed shows "One name per line, with seed points:". Spec 920.)
- [x] The tournament was closed prematurely?! There is still the "Close Round & Advance" button, beside being obviously in the final round. Also looking at the "Final Standings" it lists 4 out of 5 rounds? Something is off, I'm not sure how many rounds I selected at first, but I think there might be an off-by-one bug. (Fixed: removed early exit in closeRoundForm that skipped saving final round. numRounds synced between DB and tournament state. Spec 910.)
- [x] Also the final standing is wrong, if I interprete this right. I chose a randomseed tournament (but it should be the same with a preseed tournament). In the final round the ordering is based on the total points collected and not the final standing on the top court for that last round. The placing and points in the previous rounds don't matter. The winner on the top court is the tournament winner, the second placed in the top court the second, and so on. (Fixed: standings now sorted by current round court position, not total points. Total points/diff are tiebreakers within same court position only. finalStanding computed for all players at tournament completion. Spec 910.)

- [x] deprecation warnings in project.inlang settings.json
- [x] "win by" explainer — added tooltip: "Points difference required to win a set" and radio labels "2 points (deuce possible)" / "1 point (first to N wins)"
- [x] WVV CSV import help — collapsible tip explaining CSV from "Meldungen", copy "spieler 1" and "wvv" columns
- [x] Retire/injury explainer — retire section explains reshuffling ALL courts; injury section explains only affects current court for current round
- [x] Court-count slider knob alignment — CSS grid layout aligns "1" and "16" labels with slider at extremes. Spec 880.
- [x] Auto-calculated rounds display — plain `<span class="info-text">`, no border/background. Spec 880.
- [x] Reduce log output — no `console.log` in `src/`, Drizzle has no debug logger. Spec 900.
- [x] Deuce-aware blowout score validation — `isValidFinalScore()` blocks overshoot scores (25-11, 22-11 rejected; 21-19, 22-20, 30-28 accepted). 28 unit tests + E2E test `rejects blowout scores`. Spec 870.
- [x] Report Injury should be disabled when all results are entered for every round. Added `isComplete` per court + `allCourtsComplete` flag shows hint instead of form when all courts done.
- [x] Undo "Injury - Report / Retirement". Added undo retirement and undo injury buttons with 5-minute window. Undo cleared when any new scores entered on affected court. E2E tests for all three undo flows.
- [x] Solo play (Option C from `670_player-retirement.md`): Allow a 2v1 format when a player is injured mid-round and no substitute is available. Needs server-side validation schema update, UI radio option, and scoring logic.
- [x] **E2E tests fail due to live query polling delay** — Tests wait for "Finalize Tournament" or "Close Round & Advance" button but it's not in the DOM until the 3-second live query poll refreshes `canCloseRound`. The disabled state renders as a completely different button ("⏳ Waiting for all scores..."). See `specs/860_e2e-live-query-timing.md`. (Previously two tests affected; now rare after save-wait fixes — tests that wait for `saved-` indicators complete saves before navigating, so `canCloseRound` is usually true on first live query yield.)
- [x] **Retire/Report Injury conditional visibility** — "Retire a Player" only visible when no scores entered yet (pre-round); "Report Injury" only visible when scores exist (mid-round). Added `hasScores` to live query data. Added descriptive notes to each section.
- [x] **Substitute indicator on court page** — When `injuredPlayerIds` is set on matches, the court page shows an injury banner, marks the injured player card with a warning border and "Injured" tag.
- [x] **E2E tests for 5p/6p court redistribution** — Added `5p court redistributes correctly after round` (21 players) and `6p court redistributes correctly after round` (22 players) tests in `promotion.spec.ts`.
- [x] **v1 data wipe banner** — Added yellow banner in layout for authenticated users: "Beta: Tournament data may be wiped. Closed tournaments are auto-deleted after 14 days."
- [x] **Retire player button hidden during active round** — Retire section now conditional on `!hasScores`; server already rejected mid-round retirement with 400 error.
- [x] **4p court advertised as 6p court** — Fixed `closeRoundForm` to use `finalConfig.courtSizes` for final round elimination, updating tournament's `courtSizes` in DB. Fixed court page server to prefer `rotation.courtSize` over tournament-level array. Fixed `generateAllMatchesForAssignment` fallback to use `assignment.playerIds.length`.
- [x] **`winBy` validation hardcoded to 2** — Was already fixed; all paths use `getEffectiveScoring()` from tournament config. Marked as resolved.
- [x] **Dead schema tables** — `match_3_player`, `match_5_player`, `match_6_player` removed from Drizzle schema. Migration `0010_drop_dead_match_tables.sql` drops them from the database.
- [x] **Draft status unused** — Removed draft section from dashboard UI and server. Schema default changed from `'draft'` to `'active'`. No code ever creates draft tournaments.
- [x] **Broken `/tournament/[id]/players` link** — Fixed dashboard link to point to `/tournament/{id}` instead of the non-existent `/tournament/{id}/players` route.
- [x] **`matchGroups()` returns functions** — Changed 5 instances of `$derived(() => ...)` to `$derived.by(() => ...)` in court page and create page. Removed all `()` call syntax from usage sites.
- [x] Migrated `retirePlayer` and `reportInjury` to remote commands in `tournament-actions.remote.ts` with live query reconnect
- [x] Migrated `create` tournament action to remote form in `create.remote.ts`
- [x] Removed duplicate `saveScore` legacy server action from `court/[token]/+page.server.ts` (dead code — `scores.remote.ts` handles it)
- [x] Removed all legacy server actions — no more `export const actions` in any `+page.server.ts`
- [x] Fixed E2E test timeouts for "Close Round" / "Finalize Tournament" buttons (removed `:not(:disabled)` selectors, added `{ timeout: 20000 }`)
- [x] **Stable court tokens refactor**: Replaced `courtAccess` table with `court` table. Tokens created once at tournament creation, persist across rounds and player retirements. QR codes/bookmarked links remain valid throughout the tournament. `courtRotation.courtId` links rotations to their stable court. Court page resolves token→court→current round's rotation; shows "closed" when no rotation exists for current round.
- [x] **Fixed `isActive` regression from stable tokens** — `court.isActive` was being set based on physical court count (`courtNum < physicalCourtCount`), making virtual courts (5p/6p in shift 2) inaccessible. Now all courts with rotations are active; `closeRoundForm` activates all courts that have rotations in the next round.
- [x] **Fixed `canCloseRound` double-counting** — Matches that were both canceled AND scored were counted in both `scoredMatchCount` and `canceledMatchCount`, preventing round closure after injury. Fixed to count matches where `teamAScore !== null || isCanceled`.
- [x] **Canceled match handling on court page** — Matches with `isCanceled: true` now show "Canceled — scores will be averaged" notice instead of score entry forms. Server blocks scoring of canceled matches in `scores.remote.ts`.
- [x] **Fixed E2E tests not waiting for saves** — Tests that navigated away from court pages before save requests completed caused HTTP aborts and lost scores. Added `waitForSelector('[data-testid="saved-..."]')` after each save in `promotion.spec.ts`.
- [x] **Fixed 3p standings test scores** — Test entered `20-18`, `19-17` which fail the 21-point minimum preflight check. Fixed to always use `21` for team A score.

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
