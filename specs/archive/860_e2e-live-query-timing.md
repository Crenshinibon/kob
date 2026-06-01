# 860 E2E Live Query Timing

## Problem

E2E tests can fail when they wait for "Close Round" / "Finalize Tournament" buttons that don't appear until the live query refreshes `canCloseRound`.

## Root Cause

The tournament page uses a **live query** (`getTournamentDataLive`) that polls every **3 seconds**. The `canCloseRound` flag — which determines whether the close-round button is rendered — is computed server-side during each poll.

The button rendering uses `{#if canCloseRound}` which switches between two **completely different DOM elements**:

| `canCloseRound` | Rendered Element                                                                  |
| --------------- | --------------------------------------------------------------------------------- |
| `true`          | `<button type="submit">Finalize Tournament</button>` (or "Close Round & Advance") |
| `false`         | `<button disabled>⏳ Waiting for all scores...</button>`                          |

## Primary Fix: Wait for Save Completion

The main cause of failures was tests navigating away from court pages **before score saves completed**. The HTTP request would be aborted, the DB write never happened, and `canCloseRound` remained `false`. Fixed by adding `waitForSelector('[data-testid="saved-..."]')` after each score save:

```typescript
await page.click(`[data-testid="save-score-${matchId}"]`);
await page.waitForSelector(`[data-testid="saved-${matchId}"]`);
```

When saves complete before navigation, `canCloseRound` is already `true` when the tournament page loads, so the button appears on the first live query yield.

## Secondary Fix: Increase Test Timeout

For cases where the live query still needs a poll cycle, tests use `waitForSelector` with a 20-second timeout to account for the 3-second polling cycle:

```typescript
await page.waitForSelector('button:has-text("Close Round & Advance")', {
	timeout: 20000
});
```

## Related Fixes

- **`canCloseRound` double-counting bug** — Matches that were both canceled AND scored were counted twice, preventing round closure after injury. Fixed to count `teamAScore !== null || isCanceled` (no double-counting).
- **`isActive` regression** — Virtual courts (5p/6p) were marked inactive after the stable token refactor, blocking score saves and making `canCloseRound` impossible to reach.

## Remaining Risk

Rare timing issues can still occur if:

- A score save completes on the server but the live query hasn't polled yet when the test navigates to the tournament page
- Network latency causes the first live query yield to return stale data

These are mitigated by the 20-second timeout but could still cause intermittent failures.
