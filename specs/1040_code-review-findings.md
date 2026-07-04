# Code Review Findings — Server Orchestration Bugs & Hardening

Full-repository review (2026-07-03). The pure tournament logic in `src/lib/tournament-logic.ts`
is solid and well covered (369 unit tests, all passing). All findings below live in the
**server orchestration layer** — the remote functions and data queries that glue the tested
logic to the database — which currently has **zero test coverage**.

Findings 1 and 2 were reproduced with targeted scripts against the actual logic functions.
Findings 3–9 were verified by code reading.

## Priority Order

| #   | Finding                                                                  | Severity            | Effort  |
| --- | ------------------------------------------------------------------------ | ------------------- | ------- |
| 1   | Round-1 retirement crashes and destroys the round                        | **Critical**        | Small   |
| 2   | Tournament below 8 active players can never advance                      | **Critical**        | Small   |
| 3   | Score endpoints unauthenticated; `getTournamentData` leaks court tokens  | **High (security)** | Medium  |
| 4   | Round closure not enforced server-side; no double-submit guard           | High                | Small   |
| 5   | Retirement redistribution ignores tie-break config / snapshots           | Medium              | Medium  |
| 6   | Standings page drops rounds after court-size changes; ignores tie-breaks | Medium              | Small   |
| 7   | Second injury on same court erases first injury marker                   | Medium              | Small   |
| 8   | `finalStanding` gaps: frozen courts, eliminated players, retirees        | Low-Medium          | Medium  |
| 9   | Destructive ops ordered before validation (no atomicity)                 | Medium              | Medium  |
| 10  | Test coverage gaps for the orchestration layer                           | —                   | Ongoing |

## Implementation Progress (2026-07-03)

Branch: `cursor/review-findings-spec-b2d0` (PR #22). All findings 1–9 implemented; **382 unit tests**
passing; `bun run check` clean. E2E coverage added in `e2e/code-review-findings.spec.ts` (8 tests) —
requires Neon + Chromium locally.

| #   | Status | Key files changed |
| --- | ------ | ----------------- |
| 1   | Done   | `tournament-logic.ts` (`generateRound1Assignments`), `retirePlayer`, `undoRetirement` |
| 2   | Done   | `MIN_TOURNAMENT_PLAYERS`, `createInitialState` courtSizes override, `bracketCourtSizes`, `err_retire_min_players` |
| 3   | Done   | `scores.remote.ts`, `scoreSchema.ts`, `court/[token]/+page.svelte`, `tournament-data.remote.ts` |
| 4   | Done   | `isRoundReadyToClose`, optimistic claim + conditional `currentRound` update, close button disabled while submitting |
| 5   | Done   | `getCompletedRoundCourtResults` in `retirePlayer` / `undoRetirement` |
| 6   | Done   | `standings-data.remote.ts` — rotation `courtSize`, snapshots, normalized totals |
| 7   | Done   | Multi-injury append/filter in `reportInjury` / `undoInjury`; logic helpers already fixed |
| 8   | Done   | `computeFinalStandingMap` in `closeRoundForm` completion path |
| 9   | Done   | Compute-then-write + `buildMatchInsertRows` batch inserts; documented in `specs/120_gotchas.md` |
| 10  | Done   | Unit tests for findings 1,2,4,7,8 (382 total); E2E in `e2e/code-review-findings.spec.ts` |

### E2E Stabilization Progress (2026-07-04)

Follow-up in PRs #24–#26 and spec [1045](./1045_e2e-flaky-fixes-and-dynamic-closeRound.md).

**Infrastructure fixes (done):**

- Dynamic `closeRoundViaFetch` hash; `closeRoundOrFetch` with Finalize fallback
- Shared helpers: `extractMatchIds`, `scoreAllCourts`, `configureTieBreakFinal` (evaluate-based)
- Pause live-query poll during retire/injury/tie-break submit; refresh after injury
- `await getTournamentData().refresh()` after score saves in `scores.remote.ts`

**E2E status in `e2e/code-review-findings.spec.ts` (8 tests):**

| Test | Status | Notes |
| ---- | ------ | ----- |
| Round-1 retirement 17→16 | Pass | Uses `waitForCourtCardCount`; no post-retire court URL navigation |
| Wrong court token rejected | Pass | |
| Close round while incomplete rejected | Pass | |
| 8p mid-round injury → completion | **Fail** | Court page / score-save; see 1045 |
| Replacement player roster size | **Fail** | R1 close button never appears; likely silent court skip |
| Standings after mid-tournament retirement | **Fail** | Same close-round / court-link pattern |
| Manual tie-break flow | Unverified in last partial run | Fix applied (evaluate-based config) |
| Dice tie-break flow | Unverified in last partial run | Fix applied (evaluate-based config) |

**Blocking issue for remaining E2E:** tournament QR links expose `rotation.token`, but `retirePlayer` regenerates rotation tokens on rebuild. Stale URLs 404 on the court page (`ssr = false`, no match forms). Spec says stable `court.token` URLs (050/060). Server fix: expose `court.token` in `tournament-data.remote.ts` or stop rotating rotation tokens.

---

## 1. Round-1 retirement crashes and destroys the round

### Bug

Retiring a player during round 1 (before any scores — the classic no-show) crashes the server
with `Expected 4 players, got 3` / `Expected 5 players, got 4` whenever the remaining active
count is **not a multiple of 4**. Because the crash happens _after_ the current round's
rotations and matches were already deleted, the tournament page shows no courts and the player
is marked retired. Examples: 16→15, 18→17, 21 players → retire 1 → crash.

### Root Cause

`retirePlayer` (the `prevRound === 0` branch, ~lines 905–939) and `undoRetirement`
(~lines 1395–1428) in `src/routes/tournament/[id]/tournament-actions.remote.ts` contain a
**hand-rolled snake distribution** that, unlike the real `snakeDistribute()` in
`tournament-logic.ts`, ignores per-court capacities:

```typescript
let idx = 0;
for (let pos = 0; pos < 4; pos++) {
	// ← hardcoded 4 rows, no capacity check
	const fwd = pos % 2 === 0;
	for (let c = 0; c < newCourtSizes.length; c++) {
		const courtIdx = fwd ? c : newCourtSizes.length - 1 - c;
		if (idx < allActivePlayerIds.length) {
			courts[courtIdx].playerIds.push(allActivePlayerIds[idx]);
			idx++;
		}
	}
}
```

Simulation results (declared size vs. players actually assigned):

- 15 active, sizes `[4,4,4,3]` → court 1 gets **3** players (declared 4), court 4 gets **4** (declared 3)
- 17 active, sizes `[4,4,4,5]` → only **16 of 17** players assigned; 5p court gets 4 players
- 18 active, sizes `[4,4,4,6]` → only **16 of 18** assigned
- 21 active, sizes `[4,4,4,4,5]` → only **20 of 21** assigned

`generateAllMatchesForAssignment()` then throws because the player count doesn't match the
declared court size — after the old rotations were already deleted (finding 9 makes this worse).

### Fix

1. Export a reusable round-1 assignment builder from `src/lib/tournament-logic.ts`:

   ```typescript
   export function generateRound1Assignments(
   	playerIds: readonly number[], // already shuffled (random) or seed-sorted (preseed)
   	courtSizes: readonly number[]
   ): CourtAssignment[] {
   	return snakeDistribute([...playerIds], courtSizes);
   }
   ```

   `snakeDistribute()` already handles capacities and non-standard bottom courts correctly —
   it is what `startRound()` uses for round 1.

2. In `retirePlayer` and `undoRetirement`, replace **both** inline snake blocks with a call to
   this helper. Keep the existing shuffle (random-seed) / seed-points sort (preseed) that
   precedes the block — or better, also extract those into the helper so `create.remote.ts`,
   `retirePlayer`, and `undoRetirement` all share one code path.

3. Delete the duplicated inline code entirely. There must be exactly one snake implementation.

### Tests

- Unit: `generateRound1Assignments` for 15, 17, 18, 21, 23 players — every court's
  `playerIds.length` equals its declared size; union of assigned IDs equals input IDs.
- Unit (regression): for each count above, feed the resulting assignments through
  `generateAllMatchesForAssignment` — must not throw.
- E2E: create a 16p tournament, retire one player before any scores in round 1 → page shows
  4 courts (4/4/4/3), all matches enterable, tournament completes normally.

### Acceptance Criteria

- [x] Retiring during round 1 works for every player count 8–64, including counts that leave
      a 3p/5p/6p bottom court
- [x] No player is ever silently dropped from the round
- [x] Undo retirement during round 1 also works for all counts
- [x] The inline snake blocks are removed from `tournament-actions.remote.ts`

---

## 2. Tournament below 8 active players can never advance

### Bug

`retirePlayer` has no minimum-player floor. In an 8-player tournament, one retirement leaves
7 active players. The next "Close Round & Advance" then 500s **forever**:
`closeRoundForm` calls `createInitialState({ playerCount: activePlayerCount })`, which throws
`Player count must be 8-64, got 7`. `calculateCourtSizes(7)` throws the same way. Mid-round
injuries also set `retiredAt`, so an injury in an 8p tournament triggers the same dead end —
and injuries cannot simply be forbidden.

### Fix

Two parts, both needed:

1. **Floor on voluntary retirement.** In `retirePlayer` (and only there — not `reportInjury`),
   reject when `activePlayers.length` (post-retirement) would drop below **8** with a new i18n
   error message (e.g. `err_retire_min_players`). Rationale: pre-round retirement is
   discretionary; the org can instead let the short court play (spec 670 covers formats down
   to 3p, but the round-count math and preseed brackets assume ≥ 2 courts).

2. **Make the close-round path tolerant anyway** (injuries can still push below 8):
   - In `closeRoundForm`, stop deriving state via `createInitialState` +
     `calculateCourtSizes(activePlayerCount)`. Build the `TournamentState` shell directly, or
     add a `courtSizes` override parameter to `createInitialState` and pass
     `recalculateCourtConfigAfterRetirement(activePlayerCount).courtSizes` — that helper
     already supports any count ≥ 1.
   - Audit every `calculateCourtSizes(tourney.playerCount)` call in
     `tournament-actions.remote.ts` (frozen-court computation at ~lines 165, 287, 318, 787,
     989, 1308…). `tourney.playerCount` is written down after retirements, so each of these
     throws below 8. Replace with `recalculateCourtConfigAfterRetirement(...)` or guard with
     the original creation-time count where the _original_ bracket shape is intended
     (frozen-court simulation wants the original court count, not the shrunken one — verify
     against spec 087 while touching this).

### Tests

- Unit: state construction and next-round generation for 7, 6, 5, 4 active players
  (random-seed; preseed with shrink and cascade).
- E2E: 8p tournament → report a mid-round injury (cancel option) → close round → next round
  loads with a 4p + 3p configuration; tournament completes.
- E2E: 8p tournament → attempt pre-round retirement → friendly error, player not retired.

### Acceptance Criteria

- [x] `closeRoundForm` never throws for any active player count that retirement/injury can produce
- [x] Voluntary retirement below 8 active players is rejected with a localized message
- [x] Injury below 8 active players still works end-to-end

---

## 3. Score endpoints unauthenticated; `getTournamentData` leaks court tokens

### Bug

Three related holes:

1. `saveScore` / `saveSetScore` (`src/routes/court/[token]/scores.remote.ts`) accept a bare
   `matchId` — a **sequential serial integer** — and never verify the court token. The court
   _page_ is token-gated, but remote functions are public HTTP endpoints. Anyone can overwrite
   scores in any active tournament by counting match IDs upward.
2. `getTournamentData` (`src/routes/tournament/[id]/tournament-data.remote.ts`) has **no auth
   check** and returns `rotation.token` for every court. Tournament IDs are sequential, so the
   "unguessable token" protection is void: enumerate IDs → collect tokens and player names.
   (The `+page.server.ts` load checks `orgId`, but the query endpoint bypasses it.)
3. `saveSetScore` doesn't bound `setNumber`. A crafted request with `setNumber: 7` **inserts a
   new match row**, and `buildPlayerRoundStats` sums every scored row — phantom sets pollute
   standings.

### Fix

1. **Bind score submission to the token.** Add a `token` field to both score form schemas.
   The court page already has it (`params.token`); include it as a hidden input. In
   `getMatchContext`, resolve the rotation **by token** (fall back to stable `court.token` →
   current round's rotation, mirroring `+page.server.ts`), then verify
   `matchRecord.courtRotationId === rotation.id`. Reject otherwise. Remove trust in raw
   `matchId` lookups.
2. **Auth on `getTournamentData`.** The only consumer is the org-only tournament page. Add the
   same guard as the page load: `getRequestEvent().locals.user` must exist and
   `tournament.orgId === user.id`, else `error(401/404)`. (`getStandingsData` is intentionally
   public and does not return tokens — leave it, but double-check it never gains token fields.)
3. **Validate `setNumber`.** In `saveSetScore`: compute
   `getMaxSets(effective.setsToWin)` and reject `setNumber < 1 || setNumber > maxSets`.
   Additionally reject scoring a deciding set when the first sets are not split 1-1
   (mirror the client-side gating; use `isDecidingSet`).

### Tests

- E2E: submitting a score with a wrong/absent token → rejected; with the correct court token →
  accepted (existing score-entry tests should be updated to pass the token).
- E2E (or integration): unauthenticated fetch of `getTournamentData` → 401; as a different
  logged-in user → 404.
- Unit/integration: `saveSetScore` with `setNumber: 7` on a best-of-3 court → rejected;
  deciding set before 1-1 split → rejected.

### Acceptance Criteria

- [x] Score writes require the court (or rotation) token; match ID alone is insufficient
- [x] `getTournamentData` requires the owning organizer's session
- [x] `setNumber` is bounded by the effective scoring config; no phantom set rows possible

---

## 4. Round closure not enforced server-side; no double-submit guard

### Bug

Only the UI (`canCloseRound` from the polled query) prevents closing an incomplete round.
`closeRound()` in `tournament-logic.ts` merely requires **one** scored match. A stale tab
(3–5 s polling lag is a known issue, see archived spec 860/1020), a double-click, or a direct
POST advances the round with partial scores — irreversibly. Two concurrent submissions can
also interleave: both pass the "delete existing next-round rotations" step before either
inserts, producing duplicate rotations/matches.

### Fix

1. **Completeness check.** At the top of `closeRoundForm`, after loading `currentRotations`
   and their matches, recompute exactly what `fetchTournamentData` computes:
   `expectedMatchCountForRotations(rotations, courtSizes)` vs. the count of match groups
   (grouped by `courtRotationId` + `matchNumber`) where `isMatchComplete(group)` is true.
   If incomplete → `error(400, m.err_round_incomplete())` (new i18n key). Both helpers are
   already exported from `tournament-logic.ts` — this is a copy of the existing read-path
   logic, not new logic.
2. **Optimistic concurrency guard.** Before any writes, "claim" the close:

   ```typescript
   const claimed = await db
   	.update(tournament)
   	.set({ lastActivityAt: new Date() })
   	.where(
   		and(
   			eq(tournament.id, tournamentId),
   			eq(tournament.currentRound, currentRound),
   			eq(tournament.status, 'active')
   		)
   	)
   	.returning({ id: tournament.id });
   if (claimed.length === 0) error(409, m.err_round_already_closed());
   ```

   This alone doesn't serialize concurrent requests (both may still match), so **also** make
   the final `currentRound` update conditional on `currentRound === currentRound(old)` and
   verify a row was affected; if not, roll forward gracefully (the other request won).
   Combined with the existing delete-before-insert of next-round data, this reduces the
   double-submit window from "whole function" to milliseconds. Perfect serialization would
   need `SELECT … FOR UPDATE`, which the neon-http driver can't do — document this residual
   risk in spec 120 (gotchas).

3. Disable the submit button while the form is in-flight on
   `src/routes/tournament/[id]/+page.svelte` (check; add if missing).

### Acceptance Criteria

- [x] Closing a round with any incomplete (unscored, non-canceled) match returns 400
- [x] Double-clicking "Close Round & Advance" never produces duplicate rotations or skips a round
- [x] Canceled-match rounds still close (isMatchComplete already treats canceled as complete)

---

## 5. Retirement redistribution ignores tie-break config / snapshots

### Bug

When `retirePlayer` / `undoRetirement` rebuild the current round from previous-round results
(`prevRound > 0` branches), they recompute standings with **no options**:

```typescript
standings: calculateCourtStandings(cr.matchData, pIds); // ~line 968 and ~line 1459
```

No `tieBreakConfig`, no `manualRankOrder`, no `diceRolls`, no `completedRounds`, and the
persisted `standingsSnapshot` (written by `snapshotClosedRoundRotations` at round close) is
ignored. If a configured tie-break order, a dice roll, or a manual ranking decided court
positions when the round was closed, the post-retirement redistribution can re-rank those
players differently and place them on **different courts** than the official standings dictate
— for players completely unrelated to the retirement.

### Fix

Replace the ad-hoc recomputation in both commands with the existing service:

1. Call `buildCompletedRoundsBefore(tournamentId, currentRound, courtSizes, players,
tieBreakConfig)` from `court-standings-service.ts`. It already prefers
   `standingsSnapshot` per rotation and falls back to a full-option recomputation
   (`tieBreakConfigSnapshot`, `manualRankOrder`, `diceRolls`).
2. Use its **last element** as `prevResults` for `resolvePreseedRetirement` /
   `buildRedistributionFromResults`, and pass the full array as `completedRounds` /
   `TieBreakSortOptions` where those functions accept tie-break context.
3. Delete the local `resolved` / `results` mapping blocks.

### Tests

- Unit: extract the "previous round results for redistribution" resolution into a testable
  function; verify snapshot is preferred and manual/dice orders are honored.
- Unit (regression): court with a manual tie-break order → retire a player on a _different_
  court → the manually-ordered court's redistribution is unchanged.

### Acceptance Criteria

- [x] Post-retirement redistribution uses the identical ranking the round-close snapshot recorded
- [x] Dice rolls are not re-rolled and manual orders are not discarded by a retirement
- [x] Same for undo retirement

---

## 6. Standings page drops rounds after court-size changes; ignores tie-breaks

### Bug

In `src/routes/tournament/[id]/standings/standings-data.remote.ts`:

1. Historical-round completeness uses the **current** tournament `courtSizes`
   (`matchCountPerCourt[courtIdx]`, ~line 121) instead of the rotation's own `courtSize`
   column. After a retirement changes court sizes (e.g. court 4 was 4p in round 1, is 5p now),
   round 1 retroactively "requires" 4 matches, has 3, and is **silently excluded** from every
   affected player's totals and round history (`if (!allMatchesComplete) continue;`).
2. Rankings are recomputed with `calculateCourtStandings(matches, playerIds)` (~line 146) —
   default tie-break config, no snapshot, no manual/dice context — so the public standings
   page can disagree with the official per-court ranking shown on the tournament page.
3. Total points mix scales: 5p/6p courts contribute _averages_ while 4p courts contribute
   _raw totals_ (`stats.totalPoints += standing.points`).

### Fix

1. `const requiredMatches = matchCountForCourtSize(rotation.courtSize ?? courtSizes[courtIdx] ?? 4)`.
2. For closed rounds, prefer `rotation.standingsSnapshot`
   (`hasStandingsSnapshot` + `snapshotToCourtStandings` from `court-standings-service.ts`);
   for the current round, pass the full options (tie-break config, `manualRankOrder`,
   `diceRolls`, `completedRounds`) exactly like `tournament-data.remote.ts` does via
   `resolveRotationStandings`.
3. For cross-round totals, accumulate via `buildPlayerTotalStats` /
   `roundPointsContribution` semantics (raw points, with 5p/6p normalized by
   `STANDARD_GAMES_PER_ROUND`) instead of summing display values. Keep the _displayed_
   per-round points as-is (they intentionally show averages for 5p/6p per spec 070).

### Tests

- Unit: extract the per-player aggregation into a pure function; test with a court whose size
  changed between rounds — all completed rounds counted.
- E2E: 17p tournament → complete round 1 → retire a player (courts become all-4p) → standings
  page still shows round 1 in every player's history.

### Acceptance Criteria

- [x] Historical rounds are never dropped after court-size changes
- [x] Standings-page court ranking matches the tournament page / snapshots for closed rounds
- [x] Totals use a consistent scale across 3p/4p/5p/6p courts

---

## 7. Second injury on same court erases first injury marker

### Bug

`reportInjury` with `option: 'substitute'` writes `.set({ injuredPlayerIds: [playerId] })`
(~line 1197) — **overwriting** any existing array. If two players on the same court are
injured in the same round (unit tests explicitly cover multi-injured standings, so the logic
layer expects it), the second report erases the first player's marker and they are credited
points they didn't earn. Conversely `undoInjury` writes `injuredPlayerIds: []` (~line 1692),
clearing _all_ markers including other injured players'.

### Fix

Update per-match instead of bulk:

- `reportInjury` (substitute): select the affected matches, then per match write
  `injuredPlayerIds: [...new Set([...(m.injuredPlayerIds ?? []), playerId])]`.
- `undoInjury`: per match write
  `injuredPlayerIds: (m.injuredPlayerIds ?? []).filter((id) => id !== playerId)`.
- The pure helpers `applyInjuryToUnscoredMatch` / `revertInjuryOnMatch` in
  `tournament-logic.ts` have the same single-player assumption
  (`injuredPlayerIds: [playerId]` / `injuredPlayerIds: []`) — fix them the same way and reuse
  them from the commands so DB writes and logic stay in sync.

### Tests

- Unit: two sequential `applyInjuryToUnscoredMatch` calls for different players → both IDs
  present; `revertInjuryOnMatch` for one → the other remains.
- E2E: report two substitute injuries on one court, enter scores, verify both players get 0
  points in affected games and standings match.

### Acceptance Criteria

- [x] Multiple injuries on one court are all tracked; undo affects only the chosen player

---

## 8. `finalStanding` gaps: frozen courts, eliminated players, retirees

### Bug

On tournament completion (`closeRoundForm`, ~lines 237–263):

1. Players on **frozen preseed courts** are not in the final round's rotations, so they never
   receive a `finalStanding` (stays `NULL`), and the `position` counter only walks active courts.
2. Players trimmed by `getFinalRoundCourtConfig` elimination (5/6-player endgames) are neither
   retired nor in the final rotations → `NULL`.
3. All retirees without a standing get the **identical** value `activePlayerCount` instead of
   distinct places (and `computeRetirementFinalStanding` already computed a better value at
   retirement time — only pre-existing `NULL`s hit this fallback).

### Fix

Build the complete placement list at completion time, in this order:

1. Active final-round courts, ascending court number, snapshot standings order (current behavior).
2. **Frozen courts**, ascending court number, each court's last-played-round
   `standingsSnapshot` order. Look up rotations via `getFrozenCourts(...)`'s
   `freezeAfterRound` (the standings page already does this lookup at
   `standings-data.remote.ts` ~lines 57–77 — extract and share it).
3. Eliminated players (from `getFinalRoundCourtConfig(...).eliminatedPlayerIds`), placed
   directly after their bracket per spec 670.
4. Retirees keep the `finalStanding` written at retirement; for any remaining `NULL`s assign
   descending distinct places at the bottom (last retiree = last place), ordered by
   `retiredRound` then `retiredCourt`.

Verify against spec 087 (frozen courts) and 091 (bracket-range placement) — frozen-court
placements must respect bracket ranges, not raw court order, if they differ.

### Acceptance Criteria

- [x] After completion, **every** player row has a non-NULL, unique-per-tournament `finalStanding`
- [x] Frozen-court players are placed per their bracket, below all active-court finishers of
      higher brackets
- [x] Unit test: 12p preseed (3 courts, C3 freezes) and 20p preseed (C5 freezes) — full
      1..N placement produced

---

## 9. Destructive ops ordered before validation (no atomicity)

### Bug

The neon-http driver has no interactive transactions, and every multi-step flow
(`closeRoundForm`, `retirePlayer`, `undoRetirement`, `deleteTournamentForm`, cron cleanup)
runs dozens of sequential writes. Worst offenders delete the current round's rotations/matches
**before** computing and validating the replacement (finding 1 demonstrated the blast radius:
crash → tournament with no courts).

### Fix

Not full transactionality — just ordering and batching:

1. **Compute-then-write.** In `retirePlayer` and `undoRetirement`: compute `finalAssignments`
   _and_ run `generateAllMatchesForAssignment` for every court (the throwing operation)
   **before** the first `db.delete(...)`. Only start mutating once all new rows are known.
   Same pattern in `closeRoundForm` (its match generation currently runs inside the insert loop).
2. **Batch inserts.** Replace per-row `db.insert(match).values({...})` loops with a single
   `db.insert(match).values([...])` per rotation (or per round). Cuts the failure window and
   round-trip count dramatically (a 16-court close currently issues ~150 sequential HTTP inserts).
3. Player-retirement flag updates (`retiredAt`, etc.) should happen **after** the rebuild
   succeeds, so a failed rebuild leaves the player active.
4. Document the residual non-atomicity in `specs/120_gotchas.md`.

### Acceptance Criteria

- [x] A thrown error anywhere in retire/undo/close leaves the previous round data intact
- [x] Match inserts are batched; close-round round-trips drop by an order of magnitude

---

## 10. Test coverage gaps (orchestration layer)

The pure logic is excellently covered. Everything above escaped because the glue layer is not:

### Unit test additions

- [x] Extract and test: round-1 assignment regeneration (finding 1), previous-round-results
      resolution (finding 5), standings aggregation (finding 6), completion placement builder
      (finding 8). Rule of thumb: **any logic currently inlined in a remote function gets
      extracted into `tournament-logic.ts` or a service module and unit tested.**
- [x] Regression tests for each finding, as listed per section (except 12p/20p preseed placement).

### E2E test additions (in priority order)

- [x] Round-1 retirement, 16→15 and 17→16 (finding 1) — **passing**
- [ ] 8p tournament + injury → close round → completion (finding 2) — **failing**; see 1045
- [x] Score submission with wrong token rejected (finding 3) — **passing**
- [x] Close-round rejected while a court is incomplete (finding 4) — **passing**
- [ ] Replacement-player flow (`useReplacement`) — **failing**; see 1045
- [ ] Tie-break configuration end-to-end: dice and manual rank flows — fix applied; re-verify full suite
- [ ] Standings page after mid-tournament court-size change (finding 6) — **failing**; see 1045

### Notes

- E2E requires `DATABASE_URL` (Neon) and Chromium at `/usr/bin/chromium`
  (`playwright.config.ts`); neither is available in cloud-agent environments by default.
- `bun run test:unit` and `bun run check` are the fast local gates; keep both green per finding.

---

## Suggested Implementation Order

Each finding is an independent, separately committable fix. Recommended sequence:
**1 → 2 → 4 → 3 → 7 → 5 → 6 → 9 → 8**, adding the tests listed in each section alongside the
fix (finding 10 is absorbed into the others). Findings 1+2 share the "stop duplicating logic
inline" refactor and are best done together.
