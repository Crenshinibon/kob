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

## Player Removal During Tournament

### Problem

- No way to remove a player from tournament during a round
- Affected court should handle this gracefully
- Adjusting court format (e.g., 6p to 5p) is not viable due to already-played matches

### Location

- Tournament logic (`src/lib/tournament-logic.ts`)
- Court page UI (`src/routes/court/[token]/+page.svelte`)
- Tournament view (`src/routes/tournament/[id]/+page.svelte`)

### Expected Behavior

- Org can retire/remove player mid-tournament (see `670_player-retirement.md`)
- System recalculates court configuration
- Affected matches handled (auto-forfeit 0-21 or redistribution)
- Remaining players continue with adjusted court setup

### Notes

- Spec already exists in `670_player-retirement.md` but not implemented
- Need to investigate edge cases for mid-round removal

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

## Scoring Mode Tests Need Enhancement

### Problem

- Integration tests in `tournament.spec.ts` "scoring modes" only check UI elements
- Don't verify that scores must be entered as dictated by selected mode
- Best-of-3 should require set-by-set score entry in tests

### Location

- `e2e/tournament.spec.ts` - Scoring Modes test describe block

### Expected Behavior

- Tests create tournaments with different scoring modes
- Verify score entry UI matches mode (single set vs best-of-3)
- Verify validation enforces mode rules
- Verify match completion requires correct number of sets

---

## Files Affected

- `src/routes/tournament/[id]/+page.svelte` - Delete form, reactivity warning, UI glitch, layout fix
- `src/routes/tournament/[id]/+page.ts` - SSR disabled for hydration fix
- `src/routes/tournament/[id]/tournament-actions.remote.ts` - Delete handler
- `src/routes/tournament/create/+page.svelte` - Radio buttons for format/win-by
- `src/routes/court/[token]/+page.svelte` - Score entry UI (best-of-3)
- `src/routes/court/[token]/scores.remote.ts` - Score validation (no caps, min points + win-by-2)
- `src/routes/court/[token]/scoreSchema.ts` - Removed point cap validation
- `src/routes/court/[token]/+page.server.ts` - Renamed scoreCap to minPoints
- `e2e/db.ts` - Database connection for E2E tests
- `e2e/global-setup.ts` - Test cleanup
- `e2e/tournament.spec.ts` - Scoring mode tests
- `e2e/standings.spec.ts` - Score validation tests (no caps)
- `e2e/format.spec.ts` - Court link navigation fixes
- New scheduled job file for auto-cleanup (pending)
