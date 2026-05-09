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

## Performance

### Network Overload in Parallel Tests

**Problem**: "Failed to fetch" errors when running many tests in parallel.

**Solution**: Reduce parallel workers in `playwright.config.ts`:

```typescript
workers: 2, // or 1 for serial execution
```

## Score Validation

### Beach Volleyball Rules

**Problem**: Invalid scores (e.g., winner with < 21 points, win by only 1 point, tied scores) were being accepted.

**Solution**: Server-side validation in `src/routes/court/[token]/+page.server.ts`:

```typescript
if (teamAScore < 1 || teamAScore > 50 || teamBScore < 1 || teamBScore > 50) {
	return { error: 'Scores must be between 1 and 50' };
}
if (teamAScore === teamBScore) {
	return { error: 'Scores cannot be tied' };
}
if (maxScore < 21) {
	return { error: 'Winner must have at least 21 points' };
}
if (maxScore - minScore < 2) {
	return { error: 'Winner must win by at least 2 points' };
}
```

## Summary

Key principles learned:

1. **Resolve early**: Get all locator values before navigation loops
2. **Unique data**: Use timestamps for test data to avoid collisions
3. **Wait properly**: Don't assume operations complete immediately
4. **Clean up**: Always delete test data in `afterEach` hooks
5. **Test like a user**: Use real events (paste, keyboard) not just `fill()`
