# Spec 1045: E2E Test Flakiness — Remaining Issues After Failures.txt Fix

## Status: Investigation

## Problem

Failures.txt showed 11 failed E2E tests. Fixes applied for priority issues, but some
underlying root causes remain across the test suite:

## Fixes Applied (in this batch)

1. **Frozen courts bug** (`tournament-actions.remote.ts:392`): Don't persist
   frozen-filtered `courtSizes` in DB. Was `[4,4,4,4]` (sum=16) with
   `playerCount=20`, causing `createInitialState` 500 error.
   Fix: removed `nextCourtSizes = nextAssignments.map(...)` in frozen filter block.

2. **Wrong court token test** (`code-review-findings.spec.ts:75`): Selector
   `[data-testid="match-form-${mid}"] form` looked for `<form>` child of testid
   element, but in Svelte 5 the testid IS on the `<form>` element.
   Fix: `querySelector('[data-testid="match-form-${mid}"]')`.

3. **Stale element references** (`helpers.ts`): `locator.all()` + sequential
   `getAttribute()` creates lazy locators. If Svelte 5 reactivity re-renders
   the DOM between calls, locators point to detached elements → timeout.
   Fix: use `evaluateAll()` to extract match IDs synchronously.

4. **Mid-round injury scoring skip** (`tournament.spec.ts`): `hasMatchForms`
   check ran on tournament page (no match forms), so all court scoring was
   skipped after injury → round never closed → timeout on "Round 2 of 2".
   Fix: check match form count AFTER `page.goto(url)`, not before.

## Remaining Issues

### Issue A: Hardcoded closeRound fetch URL

`helpers.ts:90` and `tournament.spec.ts:1050,1173` hardcode
`/court/[token]/scores.remote.ts` hash `1vtu491` for the `closeRoundForm` fallback.

SvelteKit remote actions use a build-specific hash. If the build changes, this URL
becomes invalid. The fallback silently fails (no error thrown on 404), leaving the
round unclosed.

**Possible solutions:**
- Derive the hash from the imported `closeRoundForm` symbol at runtime
- Add a server endpoint that proxies the close round action
- Remove the fallback and fix `canCloseRound` to always be true when matches are complete

### Issue B: Widespread stale element patterns in test files

66 occurrences of `.all()` + `.getAttribute()` loop across 8 test files.
While many pass currently, they are all prone to the same stale-reference
timeout under dynamic DOM updates.

**Possible solutions:**
- Create a shared helper `extractTestIds(page, selector)` using `evaluateAll`
- Refactor all test files to use the helper

### Issue C: Tie-break checkbox iteration may still be flaky

The tie-break tests (`code-review-findings.spec.ts:249,290`) iterate over
checkboxes using `locator.isChecked()`. Even with added `waitForTimeout(500)`,
the 5-second live query refresh cycle can detach elements mid-check.

**Possible solutions:**
- Use `evaluateAll` to read/uncheck checkboxes in a single synchronous pass
- Suppress the live query refresh interval during tests via env var

### Issue D: `closeRoundViaFetch` return value

`helpers.ts:86` returns `Promise<Response>` from `page.evaluate`, but the
fetch result isn't useful inside an evaluate context (can't read body).
The callers check `result.ok` which may be `true` even on 404 (SvelteKit
redirect responses have ok=true).

## Recommended Next Steps

1. Fix Issue A: Make closeRound fallback URL dynamic or replace with button-first approach
2. Fix Issue D: Properly propagate close round result
3. Run full E2E suite and track remaining failures
4. If tie-break tests still fail, apply Issue C fix
5. Audit remaining `.all()` patterns across test files
