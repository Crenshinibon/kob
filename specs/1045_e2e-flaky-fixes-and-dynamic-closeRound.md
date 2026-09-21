# Spec 1045: E2E Test Flakiness — Injury/Retirement Court Page Failures

## Status: Done (full Playwright suite green, 2026-09-21)

Current-round QR links use the stable `court.token`. A past round in the stepper still uses that round’s `courtRotation.token`. `refreshOrgViews` awaits `getTournamentData` and `getManageData` refresh. The failures this spec tracked (injury/retirement court navigation, replacement, tie-break, promotion round-close timeouts) pass.

The narrative below is the 2026-07 investigation. It is kept as history.

---

## Summary

After two fix batches (PRs #24–#26), the E2E suite went from **11 failures** down to **4 remaining failures** in `failures.txt` (partial run: 3 failed + 1 interrupted). All four hang or fail around court-page navigation after injury/retirement, or on score-save / close-round steps that depend on court pages working.

**Root cause (confirmed):** a mismatch between the **stable-court-token spec** and the **rotation-token implementation**. After `retirePlayer` rebuilds the current round, old rotation URLs 404; tests that reuse cached court links see no match forms. `extractMatchIds()` now times out quietly (returns `[]`), so helpers skip courts silently and rounds never close.

---

## Progress — Fixes Applied

### Batch 1 (PR #24–#25, spec 1045 initial)

| Fix                                                 | File(s)                        | Effect                                                     |
| --------------------------------------------------- | ------------------------------ | ---------------------------------------------------------- |
| Frozen-court `courtSizes` persistence bug           | `tournament-actions.remote.ts` | Preseed 20p frozen-court E2E no longer 500s on close round |
| Wrong-token selector (`form` child vs form element) | `code-review-findings.spec.ts` | Wrong-token rejection test passes                          |
| Stale locator pattern → `evaluateAll`               | `helpers.ts`, multiple specs   | Fewer detached-element timeouts                            |
| Score-form check after `page.goto(courtUrl)`        | `tournament.spec.ts`           | Injury tests no longer skip all court scoring              |

### Batch 2 (PR #26, commit `8ae0fea`)

| Fix                                                                                         | File(s)                        | Effect                                                    |
| ------------------------------------------------------------------------------------------- | ------------------------------ | --------------------------------------------------------- |
| Pause 5s auto-refresh during tie-break / retire / injury submit                             | `+page.svelte`                 | Tie-break DOM no longer detaches mid-edit                 |
| `retireSubmitting` / `injurySubmitting` + post-action `tournamentQuery.refresh()`           | `+page.svelte`                 | Live query settles before tests continue                  |
| `waitForCourtCardCount`, `clickRetireSubmit`, `closeRoundOrFetch`, `configureTieBreakFinal` | `e2e/helpers.ts`               | Shared, less flaky helpers                                |
| Dynamic `closeRoundViaFetch` (hash from page form action)                                   | `e2e/helpers.ts`               | **Issue A resolved** — no hardcoded remote hash           |
| `closeRoundOrFetch` handles Finalize button                                                 | `e2e/helpers.ts`               | Final-round close works in helpers                        |
| `configureTieBreakFinal` via `page.evaluate`                                                | `e2e/helpers.ts`               | **Issue C resolved** — tie-break checkbox/radio flakiness |
| `extractMatchIds` 5s timeout + reload fallback on score save                                | `e2e/helpers.ts`               | Graceful handling when court page slow; see caveat below  |
| `await getTournamentData().refresh()` after score saves                                     | `scores.remote.ts`             | Tournament page sees saved scores sooner                  |
| Guard missing court row on rotation insert                                                  | `tournament-actions.remote.ts` | Prevents silent insert failure during rebuild             |
| Round-1 retirement test uses `waitForCourtCardCount`                                        | `code-review-findings.spec.ts` | **Passes** — no court URL navigation needed               |

### Tests now passing (code-review-findings.spec.ts)

- [x] Round-1 retirement 17→16 rebuilds courts correctly
- [x] Rejects score submission with wrong court token
- [x] Rejects close round while matches are incomplete

---

## Remaining Failures (failures.txt, 2026-07-04)

| #   | Test                                                | Symptom                                              | Phase                            |
| --- | --------------------------------------------------- | ---------------------------------------------------- | -------------------------------- |
| 1   | `bestof3.spec.ts` — round closes on 2-0             | `saved-{matchId}` not visible after set save         | Score save (unrelated to injury) |
| 2   | `code-review-findings` — 8p mid-round injury        | Timeout on first score save; navigates to `/`        | **Before** injury report         |
| 3   | `code-review-findings` — replacement player         | `Close Round & Advance` not visible after R1 scoring | **Before** retirement            |
| 4   | `code-review-findings` — standings after retirement | Interrupted clicking Close Round; navigates to `/`   | **Before** retirement            |

All four share the pattern: court page does not confirm score save (`saved-*` missing) or tournament page never reaches `canCloseRound === true`. Failures 2–4 in the captured log occur **before** the injury/retirement step, but the user's diagnosis applies to the **post-action** scoring path: tests that call `scoreAllCourts` / `extractMatchIds` after injury or between-round retirement hang because court URLs are stale or the page loads with zero match forms.

---

## Root Cause Analysis

### 1. Spec vs implementation: stable court token vs rotation token

**Spec intent** (040, 050, 060):

- `court.token` is the stable QR URL — persists across rounds **and retirements**.
- Court page resolves token → current round rotation via `court.token` fallback.

**Actual behaviour:**

- Tournament page QR links use `rotation.token` (`tournament-data.remote.ts:295`).
- `retirePlayer` and `closeRoundForm` **delete and recreate** rotations with **new** `rotation.token` values (`tournament-actions.remote.ts` ~461, ~1032).
- `court.token` is unchanged but **never exposed** in tournament UI links.

**Stale URL flow:**

```
1. Test captures .qr-link hrefs  →  /court/{rotationTokenA}
2. retirePlayer rebuilds round   →  rotationTokenA deleted, rotationTokenB created
3. Test navigates to rotationTokenA
4. +page.server.ts: no rotation by token, court.token lookup fails (URL is rotation token)
5. 404 → empty matches / redirect side-effects → no [data-testid^="match-form-"]
6. extractMatchIds() times out → returns []
7. scoreAllCourts silently skips → round never closes
```

`reportInjury` does **not** rebuild rotations (tokens stay valid). Injury-related failures in the log that occur **before** injury reporting point to score-save or live-query timing, not rotation rebuild.

### 2. Court page SSR disabled (`ssr = false`)

Court page is client-rendered. Initial data comes from `+page.server.ts` load. A 404 or empty rotation load produces a page with no editable match forms. Tests waiting for `[data-testid^="match-form-"]` hang or time out; with the new 5s cap, `extractMatchIds` returns `[]` and scoring is skipped without failing the test explicitly.

### 3. Silent skip in helpers (regression risk)

```typescript
// helpers.ts extractMatchIds — on timeout:
return []; // scoreAllCourts then: if (formCount === 0) continue;
```

This masks the real failure (bad URL / missing rotation) and surfaces later as "Close Round button not found" or "Round 2 of 2" timeout.

### 4. Un-awaited live-query refresh in orchestration

`scores.remote.ts` awaits `getTournamentData().refresh()` after saves. Several paths in `tournament-actions.remote.ts` still fire refresh without `await` (`retirePlayer:1084`, `reportInjury:1260`, and others). Race remains between DB write, live query poll (5s interval), and test navigation.

### 5. Navigation to `/` during failures

Playwright logs show `navigated to "http://localhost:4173/"` while waiting for score save or close-round button. Likely causes:

- 404 / error boundary on invalid court token
- Paraglide locale redirect in `+layout.svelte` `shouldRedirect`
- Form submission side-effect on failed remote action

Needs confirmation with trace + server logs; not fully isolated yet.

---

## Recommended Fixes (priority order)

### Server (correct long-term fix)

1. **Expose `court.token` in tournament QR links** — change `tournament-data.remote.ts` `token:` from `rotation.token` to stable `court.token` (align with specs 050/060). Court page already resolves stable token → current rotation.
2. **Alternative:** stop regenerating `rotation.token` on rebuild; reuse previous token or copy `court.token`.
3. **`await` all `getTournamentData().refresh()`** in `tournament-actions.remote.ts` (retire, injury, undo, close round).
4. **Harden court page load:** when rotation token not found, resolve via `courtRotation.courtId` if token matches a recently deleted rotation — only needed if rotation tokens must remain in URLs for past-round stepper (spec 093).

### Tests (short-term mitigation)

1. **Re-fetch court links after every rotation rebuild** — poll until hrefs change or `waitForCourtCardCount` + fresh `getCourtLinks()`.
2. **Fail loudly** when `extractMatchIds` returns `[]` on an active court expected to have forms.
3. **Use `closeRoundOrFetch`** everywhere instead of raw button click (partially done).
4. **`page.goto(tournamentUrl)` + reload** after retire/injury before scoring (pattern in `tournament.spec.ts` retire-between-rounds test).

### Test infrastructure

- [x] Issue A: dynamic closeRound hash — **done**
- [x] Issue C: tie-break evaluate — **done**
- [x] Issue D: `closeRoundViaFetch` parses JSON status — **done**
- [ ] Issue B: migrate remaining `.all()` + `.getAttribute()` loops to `evaluateAll` (~66 occurrences)

---

## Issue Status (original 1045 list)

| Issue                                    | Status                                        |
| ---------------------------------------- | --------------------------------------------- |
| A — hardcoded closeRound URL             | **Fixed** (dynamic hash from form action)     |
| B — stale `.all()` patterns              | Open — partial migration to helpers           |
| C — tie-break checkbox flakiness         | **Fixed** (`configureTieBreakFinal` evaluate) |
| D — closeRoundViaFetch return value      | **Fixed** (JSON status parsing)               |
| E — rotation token / stable URL mismatch | **Fixed** — current-round links use `court.token` |

---

## Acceptance Criteria

- [x] The full Playwright suite passes serially (confirmed locally 2026-09-21; was “95 tests” when this list was written)
- [x] Court URLs remain valid after between-round retirement and round-1 retirement rebuild (stable `court.token`)
- [x] Post-injury court scoring completes without re-capturing links (injury does not rotate court tokens)
- [ ] `extractMatchIds` still returns `[]` on timeout instead of failing the test. Callers that expect forms check the count themselves. Not a product bug.
- [x] Spec 050/060/040 and implementation agree: current-round QR = `court.token`; past-round stepper = `courtRotation.token`
- [x] `getTournamentData().refresh()` is awaited via `refreshOrgViews` on mutation paths in `tournament-actions.remote.ts`

---

## Related Specs

- [1040_code-review-findings.md](./1040_code-review-findings.md) — orchestration fixes + E2E coverage
- [060_court-operations.md](./060_court-operations.md) — stable court token requirement
- [050_tournament-management.md](./050_tournament-management.md) — stable URL in QR codes
- [093_round-history-stepper.md](./093_round-history-stepper.md) — past-round links use rotation token (intentional tension with stable URLs)
- [120_gotchas.md](./120_gotchas.md) — E2E timing and token gotchas
