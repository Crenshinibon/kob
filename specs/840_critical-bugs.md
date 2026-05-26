# 840 Critical Bugs from User Testing

## ~~Match Format & Win By Inputs Should Be Radio Buttons~~ [FIXED]

### Problem

- "Match Format" and "Win By" use `<select>` dropdowns
- Both only have two options, making dropdowns unnecessary
- Radio buttons would be more visible and require fewer clicks

### Location

- `src/routes/tournament/create/+page.svelte` - Tournament creation form

### Fix Applied

- Changed both fields to `<input type="radio">` with `bind:group`
- Added `.radio-text` span for proper color contrast on selected/unselected states

---

## ~~Org Override for Non-Standard Court Scoring~~ [FIXED]

### Problem

- Org needs ability to overwrite scoring mode for 3p, 5p, and 6p courts
- Currently these courts use fixed defaults (5p/6p: 1 set to 15, 3p: same as 4p)
- When courts become relevant due to player retirements, org may want different scoring

### Fix Applied

- Added `scoringOverrides` JSONB column to `tournament` table (keyed by court size string)
- Added `updateScoringOverrides` command in `tournament-actions.remote.ts` with validation
- Scoring config UI on tournament page with `<details>` per-court-type fieldsets (edit/save/cancel)
- `getEffectiveScoring()` merges base config with per-court-type overrides
- All consumers use centralized scoring functions: `getMinPointsForSet`, `isDecidingSet`, `getScoringLabel`, `getMaxSets`
- `closeRoundForm` generates correct number of set rows per court using effective scoring

---

## ~~Tournament Deletion Not Working~~ [FIXED]

### Problem

- Delete tournament form submission does not execute
- Form uses `deleteTournamentForm.enhance` but nothing happens on submit
- Tournament cannot be deleted from the UI

### Fix Applied

- Added `await form.submit()` in `enhance` callback
- Handler deletes all related records in correct FK order and redirects to `/`
- E2E tests verify both successful deletion and cancellation

---

## ~~Best-of-3 Score Entry: Set 3 Visibility, Deciding Set Rules, and Score Shifting~~ [FIXED]

### Problem

Three related issues with best-of-3 score entry:

1. **Set 3 shown prematurely**: The entry for the 3rd (deciding) set is always visible. It should only appear when each team has won one set (i.e., the match is split 1-1 after sets 1 and 2).

2. **Deciding set rules not enforced**: The 3rd set should be played to `decidingSetPoints` (default 15), but validation does not enforce this. Entering a score below 15 is accepted.

3. **Score values shift on save**: When entering points in all set fields and clicking save, the entered scores get "shifted around" — values appear in the wrong input fields after saving.

### Fix Applied

- `shouldShowSet()` hides deciding set until sets 1 & 2 are both saved and split 1-1
- `createSetScoreSchema` enforces `decidingSetPoints` as minimum for deciding set
- `saveSetScore` server-side validation uses `getMinPointsForSet` with overrides
- Score shifting fixed: keyed `{#each}` blocks, sets sorted by `setNumber`, `teamLabels` uses `Map<matchNumber, labels>` instead of array index
- `matchGroups` uses `effectiveScoring.setsToWin` (override-aware) instead of base `setsToWin`

---

## ~~Best-of-3 Score Entry Not Working~~ [FIXED]

### Problem

- It's still not possible to enter 2nd and 3rd set scores
- UI shows only one set input regardless of scoring mode
- Score validation doesn't enforce best-of-3 rules

### Fix Applied

- `matchGroups` derived function groups matches by matchNumber for best-of-3
- UI renders individual "Set 1/2/3" cards with separate score forms
- `saveSetScore` and `createSetScoreSchema` wired to UI
- Validation enforces minimum points + win-by-2 per set (no point caps)

---

## ~~Score Validation Not Enforcing Rules~~ [FIXED]

### Problem

- In a 6-player court (supposed to go to 15 points), system allowed 13 vs 11 without complaining
- Score validation doesn't enforce minimum points to win or win-by-2

### Fix Applied

- Removed point caps (beach volleyball has no caps — scores can exceed target)
- Renamed `getScoreCapForSet` to `getMinPointsForSet` to reflect reality
- Validation now enforces: minimum points + win by 2 (no upper bound)
- `scoreSchema.ts`: removed `Points difference can only be 2 with over-point games` check
- Scores like 30-28 are now valid (winner has ≥ target points + wins by 2)

---

## Player Removal During Tournament (Partially Implemented)

### Problem

- No way to remove a player from tournament **during an active round**
- Between rounds, the `retirePlayer` server action exists and works
- Mid-round injury handling (`reportInjury` action) exists but needs more testing
- Adjusting court format (e.g., 4p to 3p) mid-round is not viable due to already-played matches

### What's Implemented

- `retirePlayer` command in `tournament-actions.remote.ts`: works between rounds, recalculates court config, redistributes, reconnects live query
- `reportInjury` command in `tournament-actions.remote.ts`: marks match as canceled, injured player IDs tracked, reconnects live query
- Retirement UI: collapsible form on tournament page, between rounds only
- Injury reporting UI: collapsible form on tournament page, during active rounds
- `calculateRetiredStanding()`: computes final standing for retired players
- `recalculateCourtConfigAfterRetirement()`: adjusts court sizes after removal
- Standings handle canceled matches using average points per completed match

### What's Not Implemented

- Mid-round player removal (changing court size while matches are in progress)
- Physical substitute flow for injured players (Option A from `670_player-retirement.md`)
- Solo play option for injured players (Option C from `670_player-retirement.md`)
- UI for selecting injury handling option (substitute vs cancel vs solo)

### Location

- Tournament view (`src/routes/tournament/[id]/+page.svelte`)
- Server actions (`src/routes/tournament/[id]/tournament-actions.remote.ts`)

### Spec Reference

See `670_player-retirement.md` for full retirement/injury spec.

---

## ~~UI Glitch: Player Name Background Overflow~~ [FIXED]

### Problem

- When a court has player names that wrap to a second line, the dark background of player names extends to fill two lines

### Fix Applied

- Added `align-self: flex-start` to `.player` CSS class

---

## ~~Reactivity Warning: await_reactivity_loss~~ [FIXED]

### Problem

- Warning on tournament page: `await_reactivity_loss` - Detected reactivity loss when reading `LiveQuery.#promise`

### Fix Applied

- Wrapped live query call in `$derived`: `const liveQuery = $derived(getTournamentDataLive(data.tournamentId))`
- Set `ssr = false` in `+page.ts` to avoid hydration mismatch on direct page loads

---

## ~~E2E Test Configuration Issue~~ [FIXED]

### Problem

- E2E tests fail with: `Error: Cannot find package '$env' imported from /home/dirk/Dev/kob/src/lib/server/db/index.ts`

### Fix Applied

- Created `e2e/db.ts` with `dotenv` to load environment variables in Node context
- Created `e2e/global-setup.ts` for test cleanup

---

## ~~Auto-Cleanup Jobs Needed~~ [FIXED]

### Problem

- No automated cleanup of old tournaments
- Database will accumulate stale data over time

### Fix Applied

- Created `scripts/cleanup-old-tournaments.ts` (`npm run db:cleanup`)
- Deletes completed tournaments older than 14 days
- Deletes any tournaments older than 31 days (inactive/stale)
- Fixed `scripts/wipe-tournaments.ts` to use `dotenv` instead of broken `$env` import
- Shared `scripts/db.ts` utility for database access outside SvelteKit

---

## ~~Scoring Mode Tests Need Enhancement~~ [FIXED]

### Problem

- Integration tests in `tournament.spec.ts` "scoring modes" only check UI elements
- Don't verify that scores must be entered as dictated by selected mode
- Best-of-3 should require set-by-set score entry in tests

### Fix Applied

- Best-of-3 per-set validation tests pass
- Single-set min points validation tests pass
- 5p min points validation tests pass
- Score entry reflects game mode correctly

---

## ~~Stale Court Links After Retirement~~ [FIXED]

### Problem

- When a player retired between rounds, new `courtAccess` records were created with new tokens
- QR codes, bookmarked links, and shared URLs became stale after retirement
- Players scanning old QR codes got 404 errors

### Fix Applied

- Replaced `courtAccess` table with `court` table — tokens are created once at tournament creation and never change
- `courtRotation.courtId` links round-specific rotations to their stable court entity
- `retirePlayer` and `reportInjury` delete/recreate rotations but reuse existing court records (tokens unchanged)
- `closeRoundForm` deactivates all courts then reactivates those in next round
- Court page resolves token→court→current round's rotation; shows "closed" when no rotation exists
- Migration: `drizzle/0009_stable_court_tokens.sql` migrates data from `courtAccess` to `court`

---

## ~~5p/6p Courts Inaccessible After Stable Token Refactor~~ [FIXED]

### Problem

- After migrating from `courtAccess` to `court` table, `isActive` was set based on physical court count (`courtNum < physicalCourtCount`)
- Virtual courts (5p/6p in shift 2) were marked inactive, making them inaccessible
- Court page showed "This court is closed" instead of match forms
- Score saving blocked by `if (!courtRecord.isActive)` check in `scores.remote.ts`

### Fix Applied

- `create.remote.ts`: Set `isActive: true` for all courts at creation (they're all in round 1)
- `closeRoundForm`: Activate ALL courts that have rotations in the next round (not just `physicalCourtCount`)
- `isActive` now means "this court is part of the current round", not "this is a physical court"

---

## ~~canCloseRound Double-Counting Canceled+Scored Matches~~ [FIXED]

### Problem

- After reporting a mid-round injury with "cancel" option, matches on the injured player's court are marked `isCanceled: true`
- If a match was both canceled AND had scores entered, it was counted in both `scoredMatchCount` and `canceledMatchCount`
- `canCloseRound` check (`scoredMatchCount + canceledMatchCount === expectedMatchCount`) would never equal `expectedMatchCount` because the total exceeded it
- Round could never be closed after injury

### Fix Applied

- Changed `canCloseRound` logic to count matches where `teamAScore !== null || isCanceled` (either scored OR canceled, no double-counting)
- Court page shows "Canceled — scores will be averaged" notice for canceled matches instead of score entry forms
- Server blocks scoring of canceled matches in `scores.remote.ts`

---

## Files Affected

- `src/routes/tournament/[id]/+page.svelte` - Delete form, reactivity warning, UI glitch, layout fix, retirement UI, injury UI
- `src/routes/tournament/[id]/+page.ts` - SSR disabled for hydration fix
- `src/routes/tournament/[id]/tournament-actions.remote.ts` - Delete handler, closeRound, scoring overrides, retirePlayer, reportInjury
- `src/routes/tournament/[id]/+page.server.ts` - Load-only (no more actions)
- `src/routes/tournament/create/create.remote.ts` - Create tournament form
- `src/routes/tournament/create/+page.svelte` - Radio buttons for format/win-by, player count validation, duration estimation
- `src/routes/court/[token]/+page.svelte` - Score entry UI (best-of-3), 3p/5p/6p format explanations
- `src/routes/court/[token]/scores.remote.ts` - Score validation (no caps, min points + win-by-2)
- `src/routes/court/[token]/scoreSchema.ts` - Client-side score validation
- `src/routes/court/[token]/+page.server.ts` - Load-only (legacy saveScore action removed)
- `src/lib/server/tournament-logic.ts` - State machine, redistribution, scoring, retirement, duration
- `e2e/db.ts` - Database connection for E2E tests
- `e2e/global-setup.ts` - Test cleanup
- `e2e/tournament.spec.ts` - Scoring mode tests, tournament deletion tests
- `e2e/standings.spec.ts` - Score validation tests (no caps)
- `e2e/format.spec.ts` - Court link navigation fixes
- `scripts/cleanup-old-tournaments.ts` - Auto-cleanup
- `scripts/wipe-tournaments.ts` - Manual wipe

## Known Issues (Not Yet Fixed)

1. **E2E tests fail due to live query polling delay** (rare): Tests wait for "Finalize Tournament" / "Close Round & Advance" button but it's not rendered until the 3-second live query poll refreshes `canCloseRound`. Largely mitigated by waiting for `saved-` indicators after score saves — saves complete before navigating, so `canCloseRound` is usually true on first live query yield. See `specs/860_e2e-live-query-timing.md`.
2. **winBy hardcoding**: Score validation always requires win-by-2 regardless of tournament's `winBy` config
3. **Dead schema tables**: `match_3_player`, `match_5_player`, `match_6_player` exist but are never used
4. **Draft status unused**: Tournaments created as active, never use draft status
5. **Broken `/tournament/[id]/players` link**: Dashboard links to this route but it doesn't exist
