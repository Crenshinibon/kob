# To Fix

## ToDo



## Done

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
