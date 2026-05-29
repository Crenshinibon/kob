# Spec 850: Fix Injury E2E Tests (Cancel & Substitute)

## Problem

65/67 E2E tests pass. Two fail:

- `report mid-round injury with Cancel & Average option` (tournament.spec.ts:817)
- `report mid-round injury with Substitute option` (tournament.spec.ts:910)

Both fail identically:

```
TimeoutError: page.waitForSelector: Timeout 20000ms exceeded.
waiting for locator('button:has-text("Close Round & Advance")') to be visible
```

## Root cause analysis

### What happens

Both tests follow this pattern:

1. Create 16-player tournament
2. Score ONE match on court 1 only
3. Report injury (cancel or substitute) for Player1
4. Wait for live query to settle (added `waitForTimeout(2000)`)
5. Score ALL remaining matches on all 4 courts
6. Navigate to tournament page to close the round:
   ```
   await page.goto('/');
   await page.click(`text=${tournamentName}`);
   await page.waitForURL(/\/tournament\/\d+/);
   await page.waitForSelector('button:has-text("Close Round & Advance")', ...);
   ```

**The error context snapshot shows the DASHBOARD page at step 6.**

This means `page.click('text=${tournamentName}')` on the dashboard does NOT navigate to the tournament detail page. The URL matches `/tournament/\d+` somehow (or `waitForURL` resolved immediately), but the page content remains the dashboard.

### Why the click doesn't navigate

The tournament detail page (`/tournament/[id]/+page.ts`) has `export const ssr = false`. Two factors might combine:

1. **Cookie notice overlay**: The dashboard has a persistent cookie-notice banner. Playwright's actionability checks might find the tournament link but the click might be intercepted or the SPA navigation might be disrupted by the notice.

2. **Dashboard page state**: After `page.goto('/')`, the dashboard renders via SSR. But multiple prior navigation steps (scoring on court pages, injury forms) might leave the SvelteKit router in a state where the click triggers an unexpected response.

### Contrast with passing tests

- **Retire between rounds** (line 697): PASSES. Difference: it closes the round BEFORE the injury, then scores round 2. The close-round path is the same (`page.goto('/')` → `page.click(text=...)` → `waitForSelector(button)`).
- **Non-standard bottom court** (line 1015): PASSES. Same pattern as retire-between-rounds.

Both passing tests have `ssr = false` on the tournament page and use the same close-round navigation pattern.

The critical difference between passing and failing tests: in the CANCEL and SUBSTITUTE tests, the injury happens **mid-round** (scores exist on some matches). The `reportInjury` handler modifies existing matches (`isCanceled = true` or `injuredPlayerIds`). After the injury, the test scores remaining matches, then tries to close the round.

In the passing tests, the injury/retirement happens between rounds (no scores in current round). The handler deletes and recreates rotations.

### Hypothesis

After scoring all remaining matches in step 5, the last `page.goto(courtUrl)` leaves the page on a court page. Then `page.goto('/')` in step 6 navigates to the dashboard. The dashboard loads, but the tournament link click doesn't navigate because:

- **Stale live-query state**: The tournament page's live query (`getTournamentDataLive`) polls every 3s. After the injury, the handler calls `reconnect()` which schedules a data refresh. When the test navigates back to the tournament page (from the dashboard link), the page is fresh (`ssr = false`, so a new live query starts). But there might be a race: the dashboard page's tournament card might be **re-rendering** from a live-query response triggered by the injury handler's `reconnect()`, causing the DOM element to detach just as the click is attempted.

- **Cookie notice intercepting click**: The dashboard shows a cookie notice at the bottom. Playwright's actionability checks ensure the element is not covered, but the cookie notice might still interfere with SPA navigation (by adding event listeners that prevent default on the body).

- **Duplicate `page.goto('/')` with the `afterEach` cleanup**: The `afterEach` cleanup also calls `page.goto('/')` for deleting test tournaments. If cleanup races with the test, the page URL might already be `/`.

## Suggested fix plan

### Option A (simple): Add cookie dismissal at test start

In `beforeEach`, dismiss the cookie notice if present. This removes a potential click interceptor.

### Option B: Increase wait before click

Add `await page.waitForTimeout(3000)` between `page.goto('/')` and `page.click(text=...)`. This ensures the dashboard is fully settled.

### Option C: Use `toHaveURL` assertion instead of `waitForURL`

Replace the `waitForURL` with an explicit assertion that the page navigated:

```typescript
await page.goto('/');
await page.waitForTimeout(2000);
await page.click(`text=${tournamentName}`);
await expect(page).toHaveURL(/\/tournament\/\d+/);
```

The `toHaveURL` assertion retries and provides a clearer error message if navigation fails.

### Option D: Navigate directly to tournament page

Instead of clicking the link from the dashboard, use `page.goto()` directly:

```typescript
// After scoring, need to know the tournament ID. Can't hardcode.
// Alternative: before scoring, capture the tournament ID from the URL.
const tournamentId = new URL(page.url()).pathname.split('/').pop();
// After scoring:
await page.goto(`/tournament/${tournamentId}`);
await page.waitForTimeout(2000); // for live query
```

But this requires knowing the tournament ID. The test currently loses track of the URL during the scoring loop.

### Option E: Debug what the page state is

Add `console.log(page.url())` and `page.screenshot()` before the close-round flow to capture the actual page state.

## Tasks

- [ ] Understand why `page.click(text=...)` on the dashboard doesn't navigate (add debug logging)
- [ ] Fix the cancel and substitute E2E tests
- [ ] Verify 67/67 E2E tests pass
- [ ] Document the fix in the test file

## Relevant files

- `e2e/tournament.spec.ts`: Lines 817-906 (cancel test), 910-1013 (substitute test)
- `src/routes/tournament/[id]/+page.ts`: Line 1 (`export const ssr = false`)
- `src/routes/tournament/[id]/tournament-actions.remote.ts`: `reportInjury` handler
- `src/routes/tournament/[id]/tournament-data.remote.ts`: `fetchTournamentData`, `canCloseRound` calculation
