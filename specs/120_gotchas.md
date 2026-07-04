# Development Gotchas

This document captures issues, workarounds, and lessons learned during development and testing.

## Authentication

### Better Auth Route Conflicts

**Problem**: Better Auth's `svelteKitHandler` intercepts all `/auth/*` routes for its API endpoints. This caused 404 errors when accessing custom SvelteKit pages at `/auth/signup` or `/auth/login` directly.

**Solution**: Move auth pages to root level (`/login`, `/signup`) instead of `/auth/login`, `/auth/signup`. The Better Auth API endpoints remain at `/auth/*`.

**Code**: See `src/hooks.server.ts` and `src/routes/login/+page.svelte`.

### E2E Test Auth Strategy

**Problem**: Tests were getting 422 errors when trying to sign up a user that already exists, causing flakiness.

**Solution**: In E2E tests, try login first (most common case), then fall back to signup only if login fails. This avoids the expected 422 duplicate user error.

```typescript
// Try logging in first (most common case)
await page.goto('/login');
await page.fill('input[type="email"]', 'test@example.com');
await page.fill('input[type="password"]', 'password123');
await page.click('button[type="submit"]');

try {
	await page.waitForURL('/', { timeout: 3000 });
} catch {
	// Login failed, try signing up
	await page.goto('/signup');
	// ... signup flow
}
```

## E2E Testing

### Stale Element References with Court Links

**Problem**: Tests were failing with timeout errors when trying to access court links after navigating away from the tournament page. The locators became stale.

**Solution**: Resolve all court URLs to strings BEFORE entering the loop, then navigate using the resolved URLs.

```typescript
// Get all court URLs first
const courtLinksSel = await page.locator('.qr-link a').all();
const courtLinks: string[] = [];
for (const cl of courtLinksSel) {
	const url = await cl.getAttribute('href');
	if (url) courtLinks.push(url);
}
expect(courtLinks.length).toBe(4);

// Then navigate using resolved URLs
for (const courtUrl of courtLinks) {
	await page.goto(courtUrl);
	// ... enter scores
}
```

### Multiple Elements Matching Locator

**Problem**: Tests failed with "strict mode violation" when multiple tournaments with the same name existed from previous test runs.

**Solution**:

1. Use unique tournament names with timestamps: `Tournament ${Date.now()}`
2. Add `.first()` to locators when only one match is expected: `page.locator('.status.completed').first()`
3. Implement cleanup logic in `afterEach` hooks

### Score Saving Timing

**Problem**: Tests clicking "Close Round" before all scores were fully processed by the server, resulting in 422 errors.

**Solution**:

1. Wait for save confirmation after each score: `await page.waitForSelector('.saved')`
2. Wait for network idle after all saves: `await page.waitForLoadState('networkidle')`
3. Add small delay before closing round to ensure server state consistency

### Clipboard Paste Testing

**Problem**: The "smart paste" feature (converting commas/semicolons to newlines) requires actual paste events, not just `fill()`.

**Solution**: Grant clipboard permissions and use real paste:

```typescript
await context.grantPermissions(['clipboard-read', 'clipboard-write']);
await page.evaluate((text) => navigator.clipboard.writeText(text), 'Alice, Bob, Carol');
await page.locator('textarea').focus();
await page.keyboard.press('ControlOrMeta+V');
```

## Database & Migrations

### Vercel Deployment with Drizzle

**Problem**: Database migrations need to run automatically during Vercel deployment.

**Solution**: Add migration command to build step in `vercel.json`:

```json
{
	"buildCommand": "drizzle-kit migrate && vite build"
}
```

Or modify package.json:

```json
"build": "npm run db:migrate && vite build"
```

**Important**: Set `DATABASE_URL` environment variable in Vercel dashboard.

### Better Auth ORIGIN Mismatch

**Problem**: Better Auth rejects requests when the `ORIGIN` environment variable doesn't match the actual request origin. This causes 404 errors on auth endpoints during E2E tests.

**Solution**: Set `ORIGIN` to match the test server port in `playwright.config.ts`:

```typescript
webServer: {
  command: 'npm run build && ORIGIN=http://localhost:4173 npm run preview',
  port: 4173
}
```

## UI Components

### Match Form Test IDs

**Problem**: E2E tests couldn't reliably target specific match forms when multiple matches were on the same court.

**Solution**: Add `data-testid` attributes with match IDs:

```svelte
<form data-testid="match-form-{match.id}">
	<input data-testid="team-a-score-{match.id}" />
	<input data-testid="team-b-score-{match.id}" />
	<button data-testid="save-score-{match.id}">Save Score</button>
</form>
```

### Stable Court Token vs Rotation Token (E2E + production)

**Problem**: After between-round retirement or round-1 retirement rebuild, E2E tests navigate to court URLs that no longer load match forms. Playwright hangs on `[data-testid^="match-form-"]` or silently skips scoring when `extractMatchIds()` times out and returns `[]`.

**Root cause**: Specs 050/060 require **stable** QR URLs via `court.token`. The tournament page exposes `rotation.token` in `.qr-link` hrefs (`tournament-data.remote.ts`). `retirePlayer` and `closeRoundForm` delete old rotations and insert new ones with **new** rotation tokens. Old rotation URLs 404 in `court/[token]/+page.server.ts` because:

1. Lookup by `courtRotation.token` fails (row deleted).
2. Fallback lookup by `court.token` fails (URL contains rotation token, not court token).

`reportInjury` does not rebuild rotations — injury-only flows should keep the same rotation token unless tests cache links from before a prior retirement.

**Symptoms**:

- Court page loads with no match forms (`ssr = false`, empty `matches` array).
- Score helpers skip courts; `canCloseRound` stays false; "Close Round & Advance" never appears.
- Occasional navigation to `/` during score-save waits (404 / redirect side-effect).

**Fix options**:

1. **Preferred:** Expose `court.token` (stable) in tournament QR links instead of `rotation.token`.
2. Re-fetch `.qr-link` hrefs after every rotation rebuild; poll until URLs change.
3. Make `extractMatchIds` throw (not return `[]`) when an active court should have forms.

See [spec 1045](./1045_e2e-flaky-fixes-and-dynamic-closeRound.md).

## Performance

### Network Overload in Parallel Tests

**Problem**: "Failed to fetch" errors when running many tests in parallel.

**Solution**: Reduce parallel workers in `playwright.config.ts`:

```typescript
workers: 2, // or 1 for serial execution
```

## Score Validation

### Beach Volleyball Rules

**Problem**: Invalid scores (e.g., winner with insufficient points, win by only 1 point, tied scores) were being accepted.

**Solution**: Server-side validation uses centralized scoring functions:

```typescript
// Scores are validated against the tournament's effective scoring config
const effectiveScoring = getEffectiveScoring(tournament, courtSize);
const minPoints = getMinPointsForSet(effectiveScoring, setNumber, isDecidingSet);

// Validation rules:
// - Scores between 0-50
// - No ties
// - Winner must have >= minPoints (21 for 4p, 15 for 5p/6p, configurable)
// - Winner must win by at least winBy points (default 2)
// - No point caps — scores like 30-28 are valid (winner has enough points + wins by 2)
```

**Known issue**: The `winBy` validation is hardcoded to 2 in `scoreSchema.ts` and `scores.remote.ts`. If a tournament is configured with `winBy: 1`, the validation still requires win by 2.

## Database Writes (Neon HTTP)

The app uses the Neon HTTP driver, which does **not** support interactive transactions (`SELECT … FOR UPDATE`). Multi-step flows (`closeRoundForm`, `retirePlayer`, `undoRetirement`) therefore run as sequential writes.

Mitigations (spec 1040):

- **Compute-then-write**: validate assignments and pre-generate match rows before deleting rotations.
- **Optimistic concurrency**: `closeRoundForm` claims the close via a conditional `currentRound` update; concurrent double-submits return 409 instead of duplicating data.
- **Batch inserts**: match rows are inserted in one statement per rotation.

Residual risk: two concurrent requests can still interleave in the narrow window before the conditional update. Perfect serialization would require a transactional driver or advisory locks.

## Summary

Key principles learned:

1. **Resolve early**: Get all locator values before navigation loops
2. **Unique data**: Use timestamps for test data to avoid collisions
3. **Wait properly**: Don't assume operations complete immediately
4. **Clean up**: Always delete test data in `afterEach` hooks
5. **Test like a user**: Use real events (paste, keyboard) not just `fill()`
