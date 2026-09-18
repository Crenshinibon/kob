# Tournament Setup and Start

## Status

**PROPOSED — DRAFT FOR REVIEW.** Part of [095_org-player-experience-index.md](./095_org-player-experience-index.md). Reverses the "no draft state" decision in [050](./050_tournament-management.md) deliberately: creation and start become two distinct events.

## Problem

Today `createTournamentForm` does everything at once: it needs ≥ 8 player names, computes courts, generates round 1 and puts the tournament into `active`. On the beach this order is wrong:

- The organizer wants to create the tournament **the day before** (name, format, rules) and paste the roster as people register.
- Registration happens at the venue (optional check-in [097](./097_player-check-in.md), or just a list). With round 1 already generated, every no-show and late arrival forces a **rebuild** of round 1, and players who already scanned a **court** QR still reach the right court (stable `court.token`) but see a different roster; players who scanned a **personal** QR see their court change.
- The 8-player minimum is a **start** condition, not a creation condition. Creating with zero players and adding them one by one, by paste, or by CSV should be normal.

## Goals

1. Tournament lifecycle: **`setup` → `active` → `completed`** (plus the existing `archived` filter on the dashboard).
2. **Create** with name + format + rules and **0–64 players**. No courts, no round 1.
3. **Start** explicitly: requires 8–64 active players; generates courts + round 1; sets `active`, `currentRound = 1`, `startedAt`.
4. Roster edits in `setup` are plain inserts/deletes — no rebuild logic.
5. Check-in ([097](./097_player-check-in.md)) is **optional** before start. "Close check-in" can lead into "Start tournament", but Start from the operations/manage start panel works with the full roster and no check-in. Players who scan a personal QR before start see "not started yet" on their player page ([098](./098_player-page.md)) and then NOW appears at start.
6. Keep the fast path: creating with ≥ 8 pasted names and starting immediately is one extra tap.

## Non-Goals

- Scheduling a start time / auto-start.
- Public registration links (players adding themselves) — possible later on top of `setup`, not here.

## Lifecycle

```
            create                   start                      close final round
 (none) ────────────► setup ─────────────────► active ────────────────────────────► completed
                        │  roster 0..64           │  rounds 1..N                        │
                        │  rules editable          │  (096 locking rules)               │  reopen last round (096)
                        │  check-in open           │  finish early (096)                │◄──── back to active
                        └── delete                 └── delete                            └── delete / auto-cleanup (1010)
```

| Status      | `currentRound` | Courts / rotations | Player page state | Dashboard section |
| ----------- | -------------- | ------------------ | ----------------- | ----------------- |
| `setup`     | 0              | none               | `not_started`     | **Setup** (new)   |
| `active`    | 1..N           | yes                | per 098           | Active            |
| `completed` | N              | yes                | `completed`       | Finished          |

`archived` stays a dashboard filter as today.

## Create (`/tournament/create`)

The existing form, with the player section made optional:

- Name, format, scoring mode, custom scoring, tie-break, preseed retirement policy, physical courts, timing — unchanged.
- **Players** textarea / CSV upload: optional. The court-layout preview, duration estimate and rounds input keep updating live from the pasted count; with 0 names they show "Add players to see the court layout". **The order of names is the seeding** when no points are entered (first name = seed 1). Omitted or tied seed points keep that list order. The same `seedRank` is the default last tie-break (`initial_order`, [094](./094_configurable-tie-breaking.md)).
- `numRounds` (random seed) is stored as entered; for preseed it is derived at **start** (depends on court count), the form shows "computed at start".
- Two submit buttons:
  - **Create** → `status = 'setup'`, players inserted with tokens (097), redirect to `/tournament/[id]` (setup view, below).
  - **Create & start** → same, then `startTournament` in the same request; only enabled when the pasted count is 8–64. Redirects to the operations view with round 1, exactly like today. Existing E2E flows switch to this button.

Max 64 is enforced at creation and at every add; min 8 only at start.

## Setup View (`/tournament/[id]` while `status = 'setup'`)

The operations view renders a **start panel** instead of court cards:

```
┌──────────────────────────────────────────────────┐
│ Beach Bash 2026                          SETUP   │
│                                                  │
│ 14 players · 9 checked in                        │
│ Courts at start: 3 × 4p + 1 × 6p  (4 courts,     │
│ 4 physical → 1 shift)                            │
│ Rounds: 4 · est. duration ~4h 30min              │
│                                                  │
│ [ Manage players & rules ]  [ Check-in (optional) ]     │
│                                                  │
│ ( ) Start with all 14 players                    │
│ (•) Start with the 9 checked-in players only     │
│     5 players will be removed from the roster    │
│                                                  │
│ [ ▶ Start tournament ]      (needs ≥ 8 players)  │
└──────────────────────────────────────────────────┘
```

- Court layout, rounds and duration come from the existing pure functions (`getCourtConfiguration`, `calculateRoundCount`, `estimateTournamentDuration`) on the current roster count.
- "Checked-in only" option appears **only** when check-in has at least one check-in and at least one player is not checked in. It **removes** the unchecked players (hard delete, same as 096 Remove) before starting. If check-in was never used, Start uses the full roster. Open Question 3.
- The Start button is disabled below 8 (or below 8 checked-in when that option is selected) with the reason shown.
- Round stepper and close round are hidden in `setup`. Court QRs appear after start on the operations view. Personal QRs live on the optional check-in page (097).

## Start

`startTournamentForm({ tournamentId, checkedInOnly })` — organizer only, `status = 'setup'`.

1. Optional: delete players not checked in (`checkedInOnly`).
2. Validate 8 ≤ active players ≤ 64 → else `err_min_players` / `err_max_players` (existing keys).
3. `courtSizes = calculateCourtSizes(count)`; `assignSeedRanks` on the roster in insertion order (`ORDER BY player.id`): higher `seedPoints` first; omitted or tied points keep that **name-list order** (first name = seed 1). Persist `seedRank` for **both** formats (random-seed still shuffles round 1; `seedRank` is the `initial_order` tie-break). Preseed: `numRounds = calculateRoundCount(courtCount, 'preseed')`. Random seed: `numRounds` as stored (1–10).
4. `ensureCourtsExist` (095) creates the stable `court` rows with tokens.
5. Round 1 assignments (`createInitialState` → `addPlayers` → `startRound`) and match rows via `rebuildCurrentRound` (095) for round 1.
6. `UPDATE tournament SET status = 'active', currentRound = 1, numRounds, courtSizes, playerCount, startedAt = now(), lastActivityAt = now() WHERE id = ? AND status = 'setup'` — the conditional update is the double-submit guard.
7. Refresh queries; redirect to the operations view.

This is the second half of today's `createTournamentForm`, extracted into `startTournament()` in `tournament-orchestration.ts` and called from both `startTournamentForm` and "Create & start".

## Effects on Other Pages and Specs

| Area                                                         | Change                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Dashboard** (`/`)                                          | New **Setup** section listing `status = 'setup'` tournaments with player count and "Start" hint. (Replaces the empty "Draft" section that was removed earlier.)                                                                                                                                                                            |
| **Manage page** ([096](./096_tournament-management-page.md)) | New `setup` row in the locking matrix: add / remove / rename / re-seed / paste list / CSV import are plain roster edits (no rebuild); Courts tab shows "Tournament not started"; Rules fully editable including scoring mode and rounds; Tournament tab offers Start (same panel) and Delete. Retire/injury/swap/move/finish-early hidden. |
| **Check-in** ([097](./097_player-check-in.md))               | **Optional.** When used before start, "Close check-in" can offer **Start tournament** (with the checked-in-only option). Start from this panel never requires check-in. The reshuffle banner on the player page only appears if check-in was opened and is still open after start. |
| **Player page** ([098](./098_player-page.md))                | `not_started` becomes a real state: "Tournament has not started yet · 14 players registered · You are checked in ✓" (checked-in line hidden if check-in unused). Placement and score entry hidden. Polling continues so NOW appears at start without reload. |
| **Court pages**                                              | No `court` rows exist in `setup` — court URLs 404. After start, court QRs on the operations view work as today. Players may score there **or** on `/player/[token]` (098). |
| **Cleanup cron** ([1010](./archive/1010_cleanup-cronjob.md)) | Stale rule (no activity for 31 days) already covers `setup` tournaments that were never started; no change.                                                                                                                                                                                                                                |
| **050 / 030**                                                | "No draft state" note and the dashboard description are updated when this lands.                                                                                                                                                                                                                                                           |

## Data Layer

Schema (shared migration `0016`, see 095):

```typescript
// tournament
status: text('status').notNull().default('setup'); // 'setup' | 'active' | 'completed'
startedAt: timestamp('started_at');
```

Existing rows are all `active` or `completed` — no backfill needed. Any code path that checks `status !== 'active'` to reject mutations keeps working; paths that assume `currentRound ≥ 1` implies a running tournament must treat `setup` explicitly (dashboard, operations view, player page, court page 404 path).

Remote functions:

| Function                        | Where                            | Notes                                                                      |
| ------------------------------- | -------------------------------- | -------------------------------------------------------------------------- |
| `createTournamentForm`          | `create.remote.ts`               | players optional; `startNow` flag for "Create & start"                     |
| `startTournamentForm`           | `tournament-actions.remote.ts`   | `{ tournamentId, checkedInOnly }`                                          |
| `addPlayers` (bulk paste / CSV) | `manage-actions.remote.ts` (096) | setup only: parse with `parsePlayerLine`, insert with tokens, dedupe names |
| `startTournament()`             | `tournament-orchestration.ts`    | shared by both forms                                                       |

## i18n Keys (new)

`status_setup`, `dashboard_setup_heading`, `create_players_optional_hint`, `create_and_start`, `create_rounds_computed_at_start`, `setup_title`, `setup_player_count`, `setup_checked_in_count`, `setup_courts_at_start`, `setup_rounds_duration`, `setup_start_all`, `setup_start_checked_in_only`, `setup_start_removes_note`, `setup_start_button`, `setup_start_needs_players`, `setup_not_started_court_hint`, `player_not_started`, `player_not_started_registered`, `err_tournament_not_in_setup`, `err_tournament_already_started`.

## Testing

### Unit

- `assignSeedRanks` — no points → list order (first = seed 1); points desc then list order among ties; null and 0 treated equal.
- `orderPlayerIdsForRound1('preseed')` uses persisted `seedRank` when present, otherwise `assignSeedRanks`.
- `startTournament()` with 8, 17, 64 players → court sizes, `numRounds` (preseed derived, random as stored), `seedRank` (points then name-list order; first name = seed 1 when no points), `court` rows + round-1 rotations + match rows, `status/currentRound/startedAt`.
- `startTournament()` with 7 → `err_min_players`; with `checkedInOnly` and 9 of 14 checked in → 5 deleted, 9 assigned.
- Double start (second call after status flipped) → 409.

### E2E (`e2e/setup-start.spec.ts`)

1. Create with 0 players → dashboard Setup section; operations view shows the start panel with Start disabled.
2. Paste 16 names on the manage page (no check-in) → panel shows `4 × 4p`, Start enabled → Start → round 1; stepper visible; **court QRs** on operations; player pages show NOW if opened.
3. Create with 16 names via **Create & start** → round 1 immediately (existing flows).
4. Check-in 12 of 16 in `setup` → Close check-in → Start with checked-in only → 12 players, `[4,4,4]`, removed players' tokens 404.
5. Player page opened in `setup` → "not started" → after Start, page shows court + first matchup + score inputs within one poll.
6. Preseed: rounds shown as "computed at start"; after start `numRounds` matches `calculateRoundCount`.
7. Rules (scoring mode, rounds) editable in `setup` without any lock message.
8. After start, no scores: swap two players on Manage → both court pages and both player pages show the new roster. Court QR URLs unchanged.

## Open Questions

1. **Status name**: `setup` (proposed) vs. the historical `draft`.
2. **"Create & start" button** kept for the fast path (proposed) vs. always two steps.
3. **Checked-in-only start**: remove unchecked players (proposed, simplest) vs. keep them on the roster as "not playing" and let 096 add them later without retyping.
4. Should the **creation form** drop the player textarea entirely and push all roster entry to the manage page? Proposed: keep it — pasting a list at creation is the common case for pre-registered events.
5. Should a tournament in `setup` be **visible to players** at all (player page says "not started")? Proposed: yes — it makes optional pre-start personal-QR scanning meaningful. Court URLs 404 until start.

## Related Specs

- [095_org-player-experience-index.md](./095_org-player-experience-index.md)
- [050_tournament-management.md](./050_tournament-management.md) — current create-and-start flow (to be updated)
- [030_auth-and-users.md](./030_auth-and-users.md) — dashboard sections
- [096](./096_tournament-management-page.md) — setup row in the locking matrix
- [097](./097_player-check-in.md) — optional check-in; start does not require it
- [098](./098_player-page.md) — `not_started` state
- [880_creation-page-ux.md](./archive/880_creation-page-ux.md) — creation form history

## Implementation Files

- `src/routes/tournament/create/+page.svelte`, `create.remote.ts` — optional players, two buttons
- `src/lib/server/tournament-orchestration.ts` — `startTournament()`
- `src/routes/tournament/[id]/tournament-actions.remote.ts` — `startTournamentForm`
- `src/routes/tournament/[id]/+page.svelte` — start panel in `setup`
- `src/routes/+page.server.ts`, `+page.svelte` — Setup section
- `src/lib/server/player-page-data.ts` — `not_started`
- `src/lib/server/db/schema.ts` — status default, `startedAt`
- `messages/*.json`, `e2e/setup-start.spec.ts`
