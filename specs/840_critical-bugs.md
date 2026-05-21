# 840 Critical Bugs from User Testing

## Match Format & Win By Inputs Should Be Radio Buttons

### Problem
- "Match Format" and "Win By" use `<select>` dropdowns
- Both only have two options, making dropdowns unnecessary
- Radio buttons would be more visible and require fewer clicks

### Location
- `src/routes/tournament/create/+page.svelte` - Tournament creation form

### Expected Behavior
- **Match Format**: Radio buttons for "Single Set" vs "Best of 3" (or "Custom")
- **Win By**: Radio buttons for "1" vs "2"
- Selected option should be clearly visible
- Custom scoring section still appears when "Custom" is selected

### Notes
- Minor UX improvement, low priority
- Should also check if any other `<select>` elements have only 2 options

---

## Org Override for Non-Standard Court Scoring

### Problem
- Org needs ability to overwrite scoring mode for 3p, 5p, and 6p courts
- Currently these courts use fixed defaults (5p/6p: 1 set to 15, 3p: same as 4p)
- When courts become relevant due to player retirements, org may want different scoring

### Location
- Tournament settings UI (`src/routes/tournament/[id]/+page.svelte`)
- Court page UI (`src/routes/court/[token]/+page.svelte`)
- Score validation logic (`src/routes/court/[token]/scores.remote.ts`)

### Expected Behavior
- Org can configure per-court-type scoring overrides when tournament needs non-standard courts
- Override options: points to win, win-by margin, sets to win
- UI should show which court types are active (3p, 5p, 6p)
- Overrides apply to all courts of that type in the tournament
- Default values shown but editable

### Notes
- Related to player retirement feature (courts may change type mid-tournament)
- Should be accessible from tournament settings or court management view

---

## Tournament Deletion Not Working

### Problem
- Delete tournament form submission does not execute
- Form uses `deleteTournamentForm.enhance` but nothing happens on submit
- Tournament cannot be deleted from the UI

### Location
- `src/routes/tournament/[id]/+page.svelte` - Delete form
- `src/routes/tournament/[id]/tournament-actions.remote.ts` - Delete handler

### Expected Behavior
- Clicking Delete button shows confirmation dialog
- On confirm, tournament is deleted and user redirected to dashboard
- Tournament no longer appears in dashboard list

### Notes
- E2E test added in `e2e/tournament.spec.ts` under 'Tournament Deletion' describe block
- Test verifies both successful deletion and cancellation

---

## Best-of-3 Score Entry Not Working

### Problem
- It's still not possible to enter 2nd and 3rd set scores
- UI shows only one set input regardless of scoring mode
- Score validation doesn't enforce best-of-3 rules

### Location
- `src/routes/court/[token]/+page.svelte` - Score entry UI
- `src/routes/court/[token]/scores.remote.ts` - Score saving logic

### Expected Behavior
- Best-of-3 matches should show set-by-set score entry
- Set 1 and 2: points to `pointsToWin` (default 21)
- Set 3 (if needed): points to `decidingSetPoints` (default 15)
- Match ends when a team wins `setsToWin` sets
- Validation should enforce win-by-2 rule per set

### Related
- Database schema already has `setNumber` column in all match tables
- `createSetScoreSchema` and `saveSetScore` implemented but not wired to UI

---

## Score Validation Not Enforcing Rules

### Problem
- In a 6-player court (supposed to go to 15 points), system allowed 13 vs 11 without complaining
- Score validation doesn't enforce:
  - Minimum points to win
  - Win-by-2 rule
  - Correct point target for court type (15 for 5p/6p, 21 for 4p/3p)

### Location
- `src/routes/court/[token]/scores.remote.ts` - Score validation
- `src/lib/tournament-logic.ts` - Validation helpers

### Expected Behavior
- 4p/3p courts: First to 21, win by 2
- 5p/6p courts: First to 15, win by 2
- Custom mode: Use configured `pointsToWin` and `winBy`
- Error message shown when invalid score entered

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

## UI Glitch: Player Name Background Overflow

### Problem
- When a court has player names that wrap to a second line, the dark background of player names extends to fill two lines
- Courts with single-line player names don't have this issue
- Inconsistent visual appearance across court cards

### Location
- `src/routes/tournament/[id]/+page.svelte` - Court card styles
- Court card CSS in component `<style>` block

### Expected Behavior
- Player name background should only cover the text area, not extend to full height
- Consistent appearance regardless of name length
- Mobile-first: names should truncate or wrap cleanly

---

## Reactivity Warning: await_reactivity_loss

### Problem
- Warning on tournament page: `await_reactivity_loss` - Detected reactivity loss when reading `LiveQuery.#promise`
- Happens when state is read in an async function after an earlier `await`
- Stack trace points to `query-live.svelte.js` and derived state

### Location
- `src/routes/tournament/[id]/+page.svelte` - Live query usage
- Svelte 5 reactivity system

### Expected Behavior
- No reactivity warnings in console
- Live query updates should trigger UI updates correctly
- Derived state should not lose reactivity across awaits

### Notes
- Related to how `getTournamentDataLive` is called and awaited
- May need to restructure how live query is consumed in component

---

## E2E Test Configuration Issue

### Problem
- E2E tests fail with: `Error: Cannot find package '$env' imported from /home/dirk/Dev/kob/src/lib/server/db/index.ts`
- Tests were working previously
- Likely related to build/preview configuration

### Location
- `playwright.config.ts` - Web server configuration
- `src/lib/server/db/index.ts` - `$env` import

### Expected Behavior
- E2E tests should run successfully
- `$env/dynamic/private` should be available in test context
- Build and preview server should have access to environment variables

### Notes
- `npm run build` succeeds
- Issue occurs when Playwright tries to import server modules directly
- May need to adjust how tests interact with server code

---

## Auto-Cleanup Jobs Needed

### Problem
- No automated cleanup of old tournaments
- Database will accumulate stale data over time

### Requirements
1. Delete tournaments that are closed and older than 14 days
2. Delete tournaments that are not updated for 31 days

### Location
- New scheduled job or cron task
- Database cleanup utility

### Expected Behavior
- Job runs daily (or on server startup)
- Deletes tournaments matching criteria
- Logs deleted tournament count

### Notes
- Manual cleanup script exists: `scripts/wipe-tournaments.ts`
- V1 banner should warn users about data wipe policy

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
- `src/routes/tournament/[id]/+page.svelte` - Delete form, reactivity warning, UI glitch
- `src/routes/tournament/[id]/tournament-actions.remote.ts` - Delete handler
- `src/routes/court/[token]/+page.svelte` - Score entry UI
- `src/routes/court/[token]/scores.remote.ts` - Score validation
- `playwright.config.ts` - E2E test configuration
- `e2e/tournament.spec.ts` - Scoring mode tests
- New scheduled job file for auto-cleanup
