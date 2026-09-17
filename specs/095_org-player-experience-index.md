# Organizer & Player Experience — Index

## Status

**PROPOSED — DRAFT FOR REVIEW.** Drafted from feedback after a live King of the Beach tournament (September 2026). Nothing in this group is implemented yet. Every sub-spec ends with **Open Questions** — those are the blanks to confirm or change before implementation starts.

## Motivation

Two things were missing on the beach:

1. **The organizer has no back office.** Everything lives on `/tournament/[id]` (~2,300 lines): court cards, QR codes, close round, scoring overrides, tie-break editor, retire, injury, delete. Things that came up and are not possible today: remove a no-show, add a late arrival, fix a typo in a name, move two players apart, change the number of rounds after seeing how long round 1 took, finish early when the light goes, **reopen a round closed too soon**, **create the tournament the day before without starting it**.
2. **Players have no personal view.** A court QR code shows one court for one round. After every close round, players queue at the organizer's table to ask "where do I play next?". With 32–64 players and shifts, that is the single biggest time sink between rounds. They also want to know **where they stand right now** (including this round) and **best/worst place they can still reach**.

## Sub-specs

| Spec                                                                         | Scope                                                                                                                                                                                                                         | Audience  |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| **[096_tournament-management-page.md](./096_tournament-management-page.md)** | `/tournament/[id]/manage` — roster (add / remove / rename / re-seed / retire / injury), court assignments (swap / move), rules & config edits, finish early, **reopen last closed round**, delete. Slims the operations view. | Organizer |
| **[097_player-check-in.md](./097_player-check-in.md)**                       | `/tournament/[id]/check-in` — per-player token + QR, check-in list with search, full-screen QR, print sheet, self check-in on scan, close check-in → start (099) or remove no-shows.                                          | Organizer |
| **[098_player-page.md](./098_player-page.md)**                               | `/player/[token]` — current court, placement (live + best/worst), **game-by-game history** (partner, result, diff), seed, total points/diff, projected promote/relegate.                                                      | Player    |
| **[099_tournament-setup-and-start.md](./099_tournament-setup-and-start.md)** | Create ≠ start. `setup` status with 0–64 players; explicit start at ≥ 8 generates round 1. Dashboard Setup section. Reverses the "no draft" decision in 050.                                                                  | Organizer |

## Shared Decisions

These apply across all four sub-specs so they are not repeated.

### Vocabulary

| Term                | Meaning                                                                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Operations view** | The existing `/tournament/[id]` page — round stepper, court cards with QR codes, close round. Used on the organizer's phone/tablet during play. |
| **Manage page**     | New `/tournament/[id]/manage` — back office for one tournament. Sections: Players, Courts, Rules, Tournament.                                   |
| **Check-in page**   | New `/tournament/[id]/check-in` — registration-desk screen + print sheet.                                                                       |
| **Player page**     | New public `/player/[token]`.                                                                                                                   |
| **Round lock**      | A round (or a single court within it) is _locked_ once any score is saved on it. Locks gate roster and assignment edits (see 096).              |

### One migration for the whole group

All schema additions ship in a single migration so the four features can be implemented in any order without migration conflicts.

`drizzle/0016_org_player_experience.sql`:

```typescript
// player
token: text('token').notNull().unique(),          // 32-hex, personal page URL (097/098). Backfilled for existing rows.
checkedInAt: timestamp('checked_in_at'),          // 097
checkInSource: text('check_in_source'),           // 'scan' | 'org' | null (097)
joinedRound: integer('joined_round'),             // null = original roster; N = added before round N (096)

// court_rotation
manualAdjustedAt: timestamp('manual_adjusted_at'), // set by swap/move (096)

// tournament
status: text('status').notNull().default('setup'), // 'setup' | 'active' | 'completed' (099)
startedAt: timestamp('started_at'),               // 099
checkInClosedAt: timestamp('check_in_closed_at'), // 097
completedAt: timestamp('completed_at'),           // set on normal completion and finish-early (096)
finishedEarly: boolean('finished_early').notNull().default(false) // 096
```

Existing tournaments stay `active` / `completed` — no status backfill. New rows default to `setup`.

Backfill for `player.token`: add nullable → `UPDATE player SET token = encode(gen_random_bytes(16), 'hex')` (pgcrypto is available on Neon; fallback `md5(random()::text || id::text)`) → `SET NOT NULL` + unique index. New rows get `crypto.randomBytes(16).toString('hex')` at insert, same as `court.token`.

`040_database-schema.md` is updated when the migration lands, not before.

### Shared code to extract first

Both the manage page and the existing retire/undo/close-round commands rebuild the current round in the same way (delete matches → write rotations → insert matches). That block is currently copy-pasted three times in `tournament-actions.remote.ts`. Before adding a fourth copy:

| Extract                                                   | From                                                            | Used by                                                                              |
| --------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `rebuildCurrentRound(...)`                                | `retirePlayer`, `undoRetirement`, `closeRoundForm`              | 096 add/remove/re-seed/reshuffle/reset; 099 start (round 1)                          |
| `ensureCourtsExist(tournamentId, courtCount)`             | (new — today `closeRoundForm` 500s if a `court` row is missing) | 096 add player; 099 start                                                            |
| `startTournament()`                                       | second half of today's `createTournamentForm`                   | 099 `startTournamentForm` and "Create & start"                                       |
| `QrCode.svelte` (generic `url` prop)                      | `CourtQRCode.svelte`                                            | court QR (existing), player QR modal + print sheet (097)                             |
| `fetchStandingsData` → `$lib/server/standings-service.ts` | `standings/standings-data.remote.ts`                            | player page overall position (098)                                                   |
| `derivePlayerRoundState(...)` (pure)                      | new in `$lib/tournament-logic.ts`                               | player page state machine (098); unit-tested                                         |
| `reachableFinalPlaceRange(...)` (pure)                    | new in `$lib/tournament-logic.ts`                               | best/worst from **projected** promote/relegate on live current-round standings (098) |

### Auth model (unchanged from 030)

- Manage page and check-in page: organizer only (`event.locals.user` + `tournament.orgId`).
- Player page: anonymous via unguessable token, like the court page. The only write it performs is the idempotent self check-in (097).

### Polling model (unchanged from 1020)

`query()` + client-side `setInterval(refresh)`; no `query.live()`. Intervals per page are stated in each sub-spec. All pages pause polling while `document.hidden` and refresh immediately on `visibilitychange`.

### i18n

Every new user-facing string gets a Paraglide key in all four locales (`messages/{en,de,fr,es}.json`). Key prefixes: `manage_*`, `checkin_*`, `player_*`, plus `err_*` for server errors. QR-encoded URLs stay locale-free so the scanning device picks its language (see `TO_FIX.md`, court links decision).

## Suggested Implementation Order

Ordered by player-facing value per unit of risk; each step is independently shippable.

| Step | Work                                                                                                                             | Spec |
| ---- | -------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 0    | Migration `0016`; extract `rebuildCurrentRound`, `ensureCourtsExist`, `startTournament`, `QrCode.svelte`, `standings-service.ts` | this |
| 1    | Player page, read-only, all states, polling, live placement + projected range                                                    | 098  |
| 2    | `setup` status, optional players on create, start panel, dashboard Setup section                                                 | 099  |
| 3    | Check-in page + full-screen QR + print sheet + self check-in (before start)                                                      | 097  |
| 4    | Manage page shell + **Players** tab (rename, remove no-show, add late, retire/injury/undo moved here)                            | 096  |
| 5    | **Courts** tab (swap, move, reset/reshuffle) + `manualAdjustedAt` badge on operations view                                       | 096  |
| 6    | **Rules** + **Tournament** tabs (scoring mode, rounds, finish early, **reopen last round**, delete)                              | 096  |

Steps 1–3 do not touch the redistribution engine except `startTournament`. Steps 4–6 do, and rely on the extracted `rebuildCurrentRound`.

## Cross-cutting Open Questions

1. **Two pages or one?** Proposed: keep the operations view as the "during play" screen and add the manage page as the back office. Alternative: merge everything into one tabbed page. See 096 OQ 5.
2. **Where does creation redirect?** `/tournament/[id]` in `setup` (099) — the start panel links to check-in. "Create & start" still lands on the operations view with round 1 (existing E2E).
3. **Audit trail?** Proposed: none for v1 — `manualAdjustedAt`, `joinedRound`, `finishedEarly`, `startedAt` cover the visible cases. Revisit if co-organizers are ever added.
4. **PWA manifest** ("Add to home screen" for the player page) — cheap, out of scope here; candidate for a small follow-up spec.

## Related Specs

- [050_tournament-management.md](./050_tournament-management.md) — current pages and remote functions (create-and-start to be split per 099)
- [060_court-operations.md](./060_court-operations.md) — court page (player page links to it)
- [093_round-history-stepper.md](./093_round-history-stepper.md) — read-only past rounds; reopen (096) is the way to edit them again
- [094_configurable-tie-breaking.md](./094_configurable-tie-breaking.md) — editors that move to the manage page
- [660_virtual-court-scheduling.md](./660_virtual-court-scheduling.md) — shift / wait model reused on the player page
- [670_player-retirement.md](./670_player-retirement.md), [091](./091_preseed-retirement-bracket-policy.md), [092](./092_mid-round-injury-forward-retirement.md) — retirement/injury commands reused as-is
- [1045_e2e-flaky-fixes-and-dynamic-closeRound.md](./1045_e2e-flaky-fixes-and-dynamic-closeRound.md) — why manage-page edits update rotations **in place** instead of recreating them
