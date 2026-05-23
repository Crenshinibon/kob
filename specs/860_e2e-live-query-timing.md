# 860 E2E Live Query Timing

## Problem

Two E2E tests fail because they wait for buttons that don't exist in the DOM until the live query refreshes:

1. **`promotion.spec.ts:275`** — `final round completion marks tournament as completed`
   - Waits for `button:has-text("Finalize Tournament"):not(:disabled)`
   - Times out after 10 seconds

2. **`tournament.spec.ts:810`** — `report mid-round injury with Cancel & Average option`
   - Waits for `button:has-text("Close Round & Advance"):not(:disabled)`
   - Times out after 15 seconds

## Root Cause

The tournament page uses a **live query** (`getTournamentDataLive`) that polls every **3 seconds**. The `canCloseRound` flag — which determines whether the close-round button is rendered — is computed server-side during each poll.

The button rendering uses `{#if canCloseRound}` which switches between two **completely different DOM elements**:

| `canCloseRound` | Rendered Element |
|---|---|
| `true` | `<button type="submit">Finalize Tournament</button>` (or "Close Round & Advance") |
| `false` | `<button disabled>⏳ Waiting for all scores...</button>` |

The test selector `button:has-text("Finalize Tournament")` will **never match** while the "Waiting" button is rendered, because it's a different element entirely. The test needs to wait for the live query to refresh (up to 3 seconds) before the correct button appears.

This is a **timing issue**, not a logic bug. The close-round logic correctly handles canceled matches (`scoredMatchCount + canceledMatchCount === expectedMatchCount`).

## Fix Options

### Option A: Increase Test Timeout + Use Resilient Selectors

- Use `waitForSelector` with a longer timeout (e.g., 20-30 seconds) to account for the 3-second polling cycle
- First wait for the tournament page to load, then wait for the enabled button
- Playwright's `waitForSelector` already retries — the issue is just insufficient timeout

```typescript
// Before (fails):
await page.waitForSelector('button:has-text("Finalize Tournament"):not(:disabled)', {
    timeout: 10000
});

// After (works):
await page.waitForSelector('button:has-text("Finalize Tournament")', {
    timeout: 20000
});
```

### Option B: Add `data-testid` Attributes to Distinguish Button States

- Add `data-testid="close-round-btn"` to the enabled button
- Add `data-testid="waiting-for-scores-btn"` to the disabled button
- Tests can wait for the specific testid instead of relying on button text

### Option C: Reduce Polling Interval for Tests

- In E2E test environment, reduce the live query polling interval from 3s to 500ms
- This makes tests faster and less flaky without changing production behavior
- Could be done via an environment variable or test-specific configuration

### Option D: Force Refresh After Score Entry

- After all scores are entered, call `liveQuery.reconnect()` or trigger a re-fetch
- This would update `canCloseRound` immediately instead of waiting for the next poll
- This is the cleanest fix but requires a way to trigger the refresh from the test

## Recommendation

**Option A** (increase timeout) is the quickest fix. **Option C** (reduce polling in tests) is a good follow-up to make the whole test suite faster. **Option D** would be ideal long-term but requires more implementation work.

## Affected Tests

| Test File | Line | Button Text | Current Timeout |
|---|---|---|---|
| `e2e/promotion.spec.ts` | 335 | "Finalize Tournament" | 10s |
| `e2e/tournament.spec.ts` | 897 | "Close Round & Advance" | 15s |

## Related Issues

- Live query doesn't reconnect after `retirePlayer` / `reportInjury` server actions
- The disabled state being a different DOM element (not the same button with `disabled` attribute) makes CSS selectors like `:not(:disabled)` misleading
