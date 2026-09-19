# Organizer & Player Experience — Index

## Status

**IMPLEMENTED.** Index for the organizer back-office and player-facing pages. 096 / 097 / 098 / 099 have no remaining open questions.

## Motivation

Two things were missing on the beach:

1. **The organizer has no back office.** Everything lives on `/tournament/[id]` (~2,300 lines): court cards, QR codes, close round, scoring overrides, tie-break editor, retire, injury, delete. Things that came up and are not possible today: remove a no-show, add a late arrival, fix a typo in a name, move two players apart, change the number of rounds after seeing how long round 1 took, finish early when the light goes, **reopen a round closed too soon**, **create the tournament the day before without starting it**.
2. **Players have no personal view.** A court QR code shows one court for one round and is a solid scoring surface — it stays. After every close round, players who only have that QR queue at the organizer's table to ask "where do I play next?". They also want to know **where they stand right now** (including this round) and **best achievable / safe place**. An optional personal page (check-in QR) answers that: current game, who vs whom, write-once score entry, upcoming games. The organizer picks court QRs, personal pages, or both.

## Sub-specs

| Spec                                                                         | Scope                                                                                                                                                                                                                         | Audience  |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| **[096_tournament-management-page.md](./096_tournament-management-page.md)** | `/tournament/[id]/manage` — roster (add / remove / rename / re-seed / retire / injury), court assignments (swap / move), rules & config edits, finish early, **reopen last closed round**, delete. Slims the operations view. | Organizer |
| **[097_player-check-in.md](./097_player-check-in.md)**                       | `/tournament/[id]/check-in` — **optional**. Per-player token + QR, check-in list, print sheet, self check-in, close check-in → start (099) or remove no-shows. Does **not** replace court QRs.                                | Organizer |
| **[098_player-page.md](./098_player-page.md)**                               | `/player/[token]` — **NOW** + write-once score entry for matches the player is in, compact upcoming inputs, live place + best/safe text, wait clock, history of finished games. Parallel to `/court/[token]`.             | Player    |
| **[099_tournament-setup-and-start.md](./099_tournament-setup-and-start.md)** | Create ≠ start. `setup` status with 0–64 players; explicit start at ≥ **4** generates round 1. No "Create & start". Dashboard Setup section. Reverses the "no draft" decision in 050.                                          | Organizer |

## Shared Decisions

These apply across all four sub-specs so they are not repeated.

### Vocabulary

| Term                | Meaning                                                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Operations view** | The existing `/tournament/[id]` page — round stepper, court cards **with court QRs**, close round. Used on the organizer's phone/tablet during play. |
| **Manage page**     | New `/tournament/[id]/manage` — back office for one tournament. Sections: Players, Courts, Rules, Tournament.                                        |
| **Check-in page**   | New `/tournament/[id]/check-in` — registration-desk screen + print sheet.                                                                            |
| **Player page**     | New public `/player/[token]`.                                                                                                                        |
| **Round lock**      | A round is _locked_ once **any** score is saved in it (whole-round, not per-court). Locks gate roster and assignment edits (see 096).               |

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

`040_database-schema.md` is updated to match migration `0016`.

### Shared code to extract first

Both the manage page and the existing retire/undo/close-round commands rebuild the current round in the same way (delete matches → write rotations → insert matches). That block is currently copy-pasted three times in `tournament-actions.remote.ts`. Before adding a fourth copy:

| Extract                                                   | From                                                            | Used by                                                                              |
| --------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `rebuildCurrentRound(...)`                                | `retirePlayer`, `undoRetirement`, `closeRoundForm`              | 096 add/remove/re-seed/reshuffle/reset; 099 start (round 1)                          |
| `ensureCourtsExist(tournamentId, courtCount)`             | (new — today `closeRoundForm` 500s if a `court` row is missing) | 096 add player; 099 start                                                            |
| `startTournament()`                                       | second half of today's `createTournamentForm`                   | 099 `startTournamentForm` only (create is always two steps)                          |
| `QrCode.svelte` (generic `url` prop)                      | `CourtQRCode.svelte`                                            | court QR on operations (existing) **and** player QR modal + print sheet (097)        |
| `ScoreEntry.svelte`                                       | `src/routes/court/[token]/+page.svelte`                         | player page score fields (098) and court page (060)                                  |
| `saveMatchScore(...)` in `$lib/server/save-score.ts`      | `scores.remote.ts`                                              | court-token and player-token writes share validation                                 |
| `fetchStandingsData` → `$lib/server/standings-service.ts` | `standings/standings-data.remote.ts`                            | player page overall position (098)                                                   |
| `derivePlayerRoundState(...)` (pure)                      | new in `$lib/tournament-logic.ts`                               | player page state machine (098); unit-tested                                         |
| `reachableFinalPlaceRange(...)` (pure)                    | new in `$lib/tournament-logic.ts`                               | best/safe from **projected** promote/relegate on live current-round standings (098) |
| `waitClock(...)` (pure)                                   | new in `$lib/tournament-logic.ts`                               | conservative "be at court at {time}" for waiting shifts (098)                       |

### Two scoring surfaces (organizer chooses)

Both URLs stay player-facing. There is no tournament setting that hides one of them.

| Surface         | URL               | QR lives on                                | Who typically uses it                                                        |
| --------------- | ----------------- | ------------------------------------------ | ---------------------------------------------------------------------------- |
| **Court page**  | `/court/[token]`  | Operations view court cards (060)          | Org prints/shows one QR per court; anyone on that court enters scores        |
| **Player page** | `/player/[token]` | Optional check-in page + print sheet (097) | Org hands each player a personal QR; that player sees NOW and can **first-write** matches they play |

Scores share `$lib/server/save-score.ts` and `lastActivityAt`. Court-page writes are last-write-wins (including edits). Player-page writes are first-write of matches that player is in. An organizer who never opens check-in runs the tournament exactly as today (court QRs only). An organizer who only prints player QRs never needs the court QR. Mixing both on the same tournament is supported.

Check-in is **optional**. Start, score entry, close round, and manage-page roster edits do not depend on it.

### Pre-play roster (096, not gated on check-in)

Before anyone scores:

- In `setup`: add / remove / rename players (no courts yet).
- After start, round 1, no scores: **remove** no-shows, **swap** / **move** players between courts, reshuffle round 1. That is the window to fix assignments before the first whistle.

None of this requires check-in. "Remove all not checked in" is a shortcut that only appears if check-in was used.

### Auth model (unchanged from 030)

- Manage page and check-in page: organizer only (`event.locals.user` + `tournament.orgId`).
- Player page: anonymous via unguessable token. Writes: idempotent self check-in (097, no-op if the organizer never uses check-in) and **first write** of scores for **matches the player is in** on the current-round rotation (098). Sit-out / parallel games are scored on the court page.
- Court page `/court/[token]`: anonymous via court token, same as today — still a first-class scoring URL; can enter **every** game on that court. This is how the organizer corrects a score after a player has saved (players cannot edit on their page).

### Polling model (unchanged from 1020)

`query()` + client-side `setInterval(refresh)`; no `query.live()`. Intervals per page are stated in each sub-spec. All pages **start and stop polling with page visibility**: pause while `document.hidden` (app backgrounded, lock screen, another tab) and refresh immediately on `visibilitychange`. The player page and the court page also pause while a score field is focused (098).

### i18n

Every new user-facing string gets a Paraglide key in all four locales (`messages/{en,de,fr,es}.json`). Key prefixes: `manage_*`, `checkin_*`, `player_*`, plus `err_*` for server errors. QR-encoded URLs stay locale-free so the scanning device picks its language (see `TO_FIX.md`, court links decision).

## Suggested Implementation Order

Ordered by player-facing value per unit of risk; each step is independently shippable.

| Step | Work                                                                                                                                                                   | Spec |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 0    | Migration `0016`; extract `rebuildCurrentRound`, `ensureCourtsExist`, `startTournament`, `QrCode.svelte`, `standings-service.ts`, `ScoreEntry.svelte`, `save-score.ts` | this |
| 1    | Player page: NOW + write-once score entry + upcoming + wait clock + history of finished games + live placement (best/safe text)                                    | 098  |
| 2    | `setup` status, optional players on create, start panel (no Create & start), dashboard Setup section, `MIN_TOURNAMENT_PLAYERS = 4`                                     | 099  |
| 3    | Check-in page + full-screen QR + print sheet + self check-in — **optional**; court QRs stay                                                                            | 097  |
| 4    | Manage page shell + **Players** tab (rename, remove no-show, add in setup/R1, retire/injury/undo moved here)                                                            | 096  |
| 5    | **Courts** tab (drag-and-drop, refill, reset/reshuffle) + `manualAdjustedAt` badge on operations view                                                                   | 096  |
| 6    | **Rules** + **Tournament** tabs (scoring mode, rounds, finish early, **reopen last round**, delete)                                                                    | 096  |

Steps 1–3 do not touch the redistribution engine except `startTournament`. Steps 4–6 do, and rely on the extracted `rebuildCurrentRound`. Court QRs on the operations view are unchanged throughout.

## Decisions (from review)

1. **Two pages.** Operations view stays the during-play screen (court QRs, close round). Manage is the back office. Retirement, injury, scoring mode, tie-break, rounds, finish early, delete live on Manage — not on operations (a short "Report injury → Manage" link is enough).
2. **Create always goes to `setup`.** Redirect is `/tournament/[id]` with the start panel. Links: Manage (roster) and optional Check-in. **No "Create & start"** — always two steps (099).
3. **No audit log** for v1. `manualAdjustedAt`, `joinedRound`, `finishedEarly`, `startedAt` cover the visible cases.
4. **No PWA / "Add to home screen" prompt.** Bookmarking the player URL is enough; a manifest would clutter phones.
5. **Court QRs stay visible** even when check-in is used. No per-tournament scoring-mode flag.
6. **Start minimum is 4 players** (one 4p court, one round). Same floor after removing no-shows. See 099 / 096.
7. **Late joiners after round 1 are out of v1.**
8. **Player-page scores are write-once** for matches the player is in. Corrections go through the court page / organizer.
9. **Whole-round assignment lock** includes unstarted shifts: any score in the round locks every court (096).
10. **Court-page score correction stays anonymous in v1** (court token, same as today). Organizer-session-only is a later option if leaked court QRs become a problem.

## Open Questions

None on this index.

## Related Specs

- [050_tournament-management.md](./050_tournament-management.md) — current pages and remote functions (create vs start split per 099)
- [060_court-operations.md](./060_court-operations.md) — score rules; court page and court QRs remain first-class
- [093_round-history-stepper.md](./093_round-history-stepper.md) — read-only past rounds; reopen (096) is the way to edit them again
- [094_configurable-tie-breaking.md](./094_configurable-tie-breaking.md) — editors that move to the manage page
- [660_virtual-court-scheduling.md](./660_virtual-court-scheduling.md) — shift / wait model reused on the player page
- [670_player-retirement.md](./670_player-retirement.md), [091](./091_preseed-retirement-bracket-policy.md), [092](./092_mid-round-injury-forward-retirement.md) — retirement/injury commands reused as-is
- [1045_e2e-flaky-fixes-and-dynamic-closeRound.md](./1045_e2e-flaky-fixes-and-dynamic-closeRound.md) — why manage-page edits update rotations **in place** instead of recreating them
