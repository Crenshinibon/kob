# Tournament Management Page

## Status

**PROPOSED — DRAFT FOR REVIEW.** Part of [095_org-player-experience-index.md](./095_org-player-experience-index.md). Schema additions are in the shared migration `0016` described there.

## Problem

The operations view (`/tournament/[id]`) mixes running the round with configuring and re-rostering the tournament. After a live tournament, the following organizer needs were not possible or awkward:

| Situation on the beach                                                      | Today                                                                |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Player on the list never showed up                                          | Only _retire_ — they get a final standing and appear in standings    |
| Player arrives 10 minutes late, tournament already created                  | Only as _replacement_ for a retiree                                  |
| Two club mates / a couple landed on the same round-1 court                  | No way to move anyone                                                |
| Organizer disagrees with one computed assignment (or a player begs to swap) | No way to move anyone                                                |
| Typo in a name, wrong seed points pasted                                    | Delete tournament and recreate                                       |
| Round 1 took 75 minutes, 4 rounds will not fit → want 3 rounds              | `numRounds` is fixed after creation                                  |
| Switch to single set after seeing best-of-3 is too slow                     | Only per-court-type overrides                                        |
| Rain / darkness after round 2 → need final standings now                    | Nothing; tournament stays `active` and is auto-deleted after 31 days |
| Closed a round too early / a score was wrong after close                    | Past rounds are read-only (093); no way back                         |

## Goals

1. New organizer-only page **`/tournament/[id]/manage`** with four sections: **Players**, **Courts**, **Rules**, **Tournament**.
2. Roster: add, remove (no-show), rename, edit seed points, retire, report injury, undo, replacement — in one place.
3. Court assignments for the **current round**: swap two players, move one player, reset to computed, reshuffle round 1.
4. Rules editable after creation with explicit **locking rules**.
5. **Finish tournament early** with correct final standings.
6. **Reopen the last closed round** — scores become editable again; the next round (if any) is discarded. Also undoes finish-early / accidental finalize.
7. Slim the operations view down to running the round.

## Non-Goals

- Editing scores of a closed round **without** reopening it (093 still holds for the stepper: browsing history is read-only).
- Reopening more than one round at a time (re-close, then reopen again).
- Co-organizers / permissions (030 stays single admin).
- Audit log table (095 cross-cutting OQ 3).

## Page Structure

Protected route; same guard as the operations view (`tournament.orgId === user.id`).

```
┌────────────────────────────────────────────────────────┐
│ ← Beach Bash 2026                 Round 2 of 4 · active │
│ 🔓 No scores in round 2 yet — assignments editable       │
│ [Players] [Courts] [Rules] [Tournament]                 │
└────────────────────────────────────────────────────────┘
```

- Segmented tab bar, horizontally scrollable on narrow screens, sticky under the header.
- Deep links via hash: `/manage#players`, `#courts`, `#rules`, `#tournament`. The operations view and the check-in page link into specific tabs.
- **Lock indicator** in the header explains what is currently editable:
  - `🔓 No scores in round N yet — assignments editable`
  - `🔒 Round N · 5 of 12 matches scored — assignments locked (courts 3, 4 still open)`
  - `🏁 Completed` — only rename and delete remain.
- Header links: Operations view · Check-in (097) · Standings.

Data comes from a single `getManageData` query (no interval polling — refresh after each mutation and on `visibilitychange`). Every mutation re-validates the lock server-side (see Concurrency).

---

## Tab: Players

Roster list. Default sort: current court number, then position; toggle to alphabetical. Search box filters by name (needed at 32–64 players).

```
┌──────────────────────────────────────────────────┐
│ [Search players…                               ] │
│ [+ Add player]      [Remove all not checked in (2)] │
│                                                  │
│ Anna Müller                     Court 3 · ✓ 09:41 │
│ seed 1250 (#4)                                   │
│ [Rename] [Move…] [Retire…] [⋯]                   │
│ ─────────────────────────────────────────────── │
│ Ben Otto                        Court 1 · ○       │
│ [Rename] [Move…] [Retire…] [⋯]                   │
│ ─────────────────────────────────────────────── │
│ Carla Ruiz            retired after R1 · injury  │
│ final standing 16 · [Undo (3:12)]                │
└──────────────────────────────────────────────────┘
```

Badges: `active` (no badge), `✓ checked in` / `○ not checked in` (097), `retired R2`, `injured R2 · substitute` / `· canceled`, `replacement for X`, `joined R3`, `eliminated (final round)`, `frozen court`.

### Per-player actions

| Action                         | Effect                                                                                                                                                                                                                          | Allowed when                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| **Rename**                     | `player.name` update. Case-insensitive uniqueness among non-retired players.                                                                                                                                                    | Always (also completed tournaments)           |
| **Edit seed points** (preseed) | Update `seedPoints`, recompute `seedRank` for the whole roster, rebuild round 1 from seed order.                                                                                                                                | Round 1, no scores anywhere                   |
| **Move…**                      | Jumps to the Courts tab with this player pre-selected.                                                                                                                                                                          | See Courts tab                                |
| **Retire…**                    | Existing `retirePlayer` (reason, optional replacement, shrink/cascade preview — 670/091). Form moves here from the operations view.                                                                                             | Existing rules (player's court has no scores) |
| **Report injury…**             | Existing `reportInjury` (substitute / cancel & average, optional replacement — 670/092). Form moves here; operations view keeps a shortcut.                                                                                     | Existing rules (player's court has scores)    |
| **Undo retirement / injury**   | Existing commands, 5-minute window, countdown shown.                                                                                                                                                                            | Existing rules                                |
| **Remove (no-show)**           | **Hard delete** of the player row. In `setup`: no rebuild. After start (round 1, no scores): `playerCount--`, court sizes recalculated, round 1 rebuilt. Unlike retire: no final standing, never shown in standings or history. | `setup`, or round 1 with no scores            |
| **⋯ → Regenerate player link** | New `player.token` (invalidates a leaked/shared QR). See 097.                                                                                                                                                                   | Always while `setup` or `active`              |

**Remove all not checked in (N)** — bulk variant of Remove with a confirm dialog listing the names. Also reachable from the check-in page's "Close check-in" dialog (097). Same lock as Remove.

Minimum roster after removals: in `setup` the roster may be 0. After start, removal is allowed down to **6** (two 3p courts) with a warning; creation/start still requires `MIN_TOURNAMENT_PLAYERS = 8`. Below 6 after start → error suggesting finish early or delete. (Open Question 3.)

### Add player

```
Add player
Name:        [__________________]
Seed points: [____]   (preseed only)

Joins: Court 4 — 17 players → 4 × 4p + 1 × 5p. Round 1 will be reshuffled.
[Add]
```

| Phase                                                   | Behaviour                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `setup` ([099](./099_tournament-setup-and-start.md))    | Insert player with token. No courts yet — no rebuild. Max 64. Bulk paste / CSV on this tab.                                                                                                                                                                                                                                               |
| Round 1, no scores                                      | Insert player (`joinedRound = null` — counts as original roster), `playerCount++`, `courtSizes = calculateCourtSizes(count)`, **rebuild round 1** (random: fresh shuffle; preseed: recompute `seedRank`, seed order). `ensureCourtsExist` adds a `court` row if the court count grows. Max 64.                                            |
| Round ≥ 2, current round has no scores, **random seed** | Insert with `joinedRound = currentRound`. Rebuild the current round from the previous round's results with the new player appended as the **lowest-ranked** entrant (enters at the bottom court). Court sizes recalculated for `active + 1`. Ladder upper courts keep their computed players; only bottom-court composition/size changes. |
| Round ≥ 2, **preseed**                                  | **Rejected** — a late entrant has no bracket. Error text points to "replacement" on a retiree as the supported path (091).                                                                                                                                                                                                                |
| Any round with scores                                   | Rejected. Hint: "Close the round first, then add before scores are entered."                                                                                                                                                                                                                                                              |
| Final round                                             | Rejected (top court must be 4p; no remaining rounds to earn a place).                                                                                                                                                                                                                                                                     |

New players always get a `player.token` (097). Standings: rounds not played contribute 0 points / 0 diff; ranking is court-position-first (070/090) so a late joiner lands where they finish. Achievement categories ("Most Improved", "Consistent Performer") exclude players with `joinedRound !== null` (Open Question 2).

---

## Tab: Courts

Compact cards for the **current round only** (no QR codes — player QRs live on check-in, 097). Each card: court number, label, size badge, lock state (🔓/🔒 per court), player list.

Two operations, both driven by a tap flow (drag-and-drop is a desktop-only progressive enhancement, not required for v1):

### Swap (preferred — court sizes unchanged)

```
Swap players
A: [Anna Müller — Court 3 ▼]
B: [Ben Otto   — Court 1 ▼]

Court 1: Ben → Anna        Court 3: Anna → Ben
[Swap]
```

### Move (one player — two court sizes change)

```
Move Anna Müller  from Court 3 (4p)  to [Court 4 (3p) ▼]

Result: Court 3 → 3p · Court 4 → 4p
⚠ Court 3 becomes a 3-player court in the middle of the ladder
[Move]
```

### Validation (server-side, blocking)

1. Tournament `active`; operation targets the current round.
2. **Per-court lock**: neither affected court has a saved score. Courts in a later shift stay editable while shift-1 courts are already playing — this is the main reason for per-court instead of whole-round locking (Open Question 1).
3. Neither court is frozen (087).
4. Source court keeps ≥ 3 players; target court stays ≤ 6.
5. Final round: Court 1 must have exactly 4 players afterwards (670 final-round rule).
6. Both players active; a player already marked injured this round cannot be moved.

### Warnings (non-blocking, shown in the preview)

- More than one non-standard court after the move (610 "one non-standard court" goal).
- Preseed: the move crosses bracket groups (`getBracketGroups()`), i.e. the player is now playing for a different place range. Show the bracket role labels.
- Random seed: the player moves 2+ courts away from the computed court.

### Effect

- Update `court_rotation.player{1..6}Id` and `courtSize` **in place** — rotation ids and `rotation.token` are preserved, so no court URL goes stale (the failure class documented in 1045).
- Delete and regenerate `match` rows for the affected rotations only (`buildMatchInsertRows`).
- Set `court_rotation.manualAdjustedAt = now()` on affected rotations. The operations view shows a small **adjusted** badge on those court cards; the player page (098) does not distinguish.
- `tournament.courtSizes` is **not** touched by swap/move. It stays the canonical layout for `playerCount`; the per-rotation `courtSize` is the source of truth for the current round. `isRoundReadyToClose` and standings already prefer `rotation.courtSize`. `closeRoundForm` must derive the **next** round's sizes from the active player count, never from the current round's possibly manual layout — checklist item below.

### Reset / reshuffle

- **Reset to computed assignment** (round ≥ 2): recompute the current round from the previous round's results (`buildRedistributionFromResults`, retirements applied), rebuild, clear `manualAdjustedAt`. Allowed only when the whole round has no scores (it touches every court).
- **Reshuffle round 1** (random seed, round 1, no scores): fresh random assignment. For preseed, "reset" re-applies seed order.

---

## Tab: Rules

Collapsible groups, same `<details>` pattern as today. Editors for scoring overrides and tie-break **move here** from the operations view (which keeps a one-line read-only summary and an "Edit rules" link).

| Group                               | Fields                                                                                                                           | Editable when                                                                                                            | Effect                                                                                                                                                                                                  |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Scoring mode**                    | `scoringMode`, `pointsToWin`, `winBy`, `setsToWin`, `decidingSetPoints`                                                          | Current round has no scores                                                                                              | Regenerate current round's `match` rows (set-row count follows `setsToWin`); applies to all future rounds. Closed rounds keep their snapshots.                                                          |
| **Court-type overrides** (3p/5p/6p) | `scoringOverrides`                                                                                                               | Any time (existing `updateScoringOverrides`)                                                                             | Unscored sets only                                                                                                                                                                                      |
| **Tie-break**                       | `tieBreakConfig`                                                                                                                 | Any time (existing `updateTieBreakConfig`)                                                                               | Current + future ranking; closed rounds use `tieBreakConfigSnapshot`                                                                                                                                    |
| **Retirement policy** (preseed)     | `preseedRetirementPolicy`                                                                                                        | Any time                                                                                                                 | Next retirement (091)                                                                                                                                                                                   |
| **Rounds** (random seed)            | `numRounds`                                                                                                                      | Any time while active. Minimum = `currentRound` if the current round has no scores, else `currentRound + 1`. Maximum 10. | If `numRounds === currentRound`, the current round becomes the final: allowed only if Court 1 has exactly 4 players, otherwise error suggests `+1`. Preseed: read-only (derived from court count, 087). |
| **Physical courts & labels**        | `physicalCourtCount`, `court.label` per court (existing `setCourtLabel`)                                                         | Any time                                                                                                                 | Shift/wait estimates (660); labels on court + player pages                                                                                                                                              |
| **Timing**                          | `setupTimeMinutes`, `transitionTimeMinutes`, `avgRallyDurationSeconds`, `timeBetweenRalliesSeconds`, `timeBetweenMatchesMinutes` | Any time                                                                                                                 | Duration estimates only (650)                                                                                                                                                                           |

---

## Tab: Tournament

- **Rename** tournament.
- **Finish tournament early** — enabled once at least one round is closed.

  ```
  Finish tournament now?
  Round 2 has 7 of 12 matches scored.

  (•) Use round 2 as the final round — unscored matches are canceled,
      courts are ranked by average points (like an injury cancel).
  ( ) Discard round 2 — final standings from round 1.

  Final standings will be computed and the tournament marked completed.
  Reopen last round (below) undoes this.
  [Finish tournament]  [Cancel]
  ```

  - Current round has **no scores** → only the "discard" option: delete the current round's rotations/matches, `numRounds = currentRound − 1`, standings from the last closed round's snapshots.
  - Current round has scores → default "use as final": mark unscored matches `isCanceled = true` on every court, run the normal close-round path with `isFinalRound` forced (`computeFinalStandingMap`), `numRounds = currentRound`.
  - Both: `status = 'completed'`, `completedAt = now()`, `finishedEarly = true`. Standings page shows "Finished early after round N". The stepper (093) shows only rounds ≤ `numRounds`.
  - Same 409 protection as `closeRoundForm` (`WHERE currentRound = ? AND status = 'active'`).

- **Reopen last closed round** — also on the operations view, next to Close Round / Finalize. No time window.

  **Variant A — tournament `active`, `currentRound = r ≥ 2`** (just closed round `r − 1`):

  ```
  Reopen round 1?
  Round 2 has no scores and will be discarded.
  Court pages for round 1 will accept scores again.

  Also undoes after the close:
    · Retired: Eva Lang
    · Added: Finn Berg

  [Reopen round 1]  [Cancel]
  ```

  Preconditions (blocking):

  1. `status = 'active'` and `currentRound ≥ 2`.
  2. Round `r` has **no scores**. If it does → `err_reopen_has_scores` ("Round 2 already has scores — cannot reopen round 1"). Organizer can still finish early / wait.

  Effect:

  1. List in the confirm dialog, then reverse, any **between-round** roster change after round `r − 1` closed: retirements with `retiredAt` after that close and `injuredAt` null (same restore as `undoRetirement`, no 5-minute window), replacements and late joiners with `joinedRound = r` (deleted). Injuries reported **during** round `r − 1` stay.
  2. Delete round `r` rotations and matches.
  3. Clear `roundClosedAt`, `standingsSnapshot`, `tieBreakConfigSnapshot` on round `r − 1` rotations. Keep `diceRolls` so standings do not reshuffle on reload.
  4. `currentRound = r − 1`. Courts that froze after round `r − 1` (087) become active again; earlier frozen courts stay frozen.
  5. Conditional update `WHERE currentRound = r AND status = 'active'` (same 409 claim as close).

  **Variant B — tournament `completed`:**

  ```
  Reopen round 4?
  Final standings will be cleared. Scores stay; you can edit them and close the round again.
  [Reopen round 4]  [Cancel]
  ```

  Effect: clear snapshots on the last round's rotations (scores stay); clear `finalStanding` on players who are **not** retired (retiree standings from `computeRetirementFinalStanding` stay); `status = 'active'`, `completedAt = null`, `finishedEarly = false`. Close Round / Finalize reappears.

  One round at a time: to undo two closes, reopen, re-close, reopen again.

- **Delete tournament** — existing `deleteTournamentForm`, moved here into a "Danger zone" block. Removed from the operations view.

---

## Locking Rules (summary)

| Tournament state                                   | Rename, labels, timing, tie-break, overrides, policy | Add / remove / re-seed / reshuffle R1 | Swap / move (per court) | Scoring mode | `numRounds` (random) | Retire | Injury | Finish early | Reopen last round |
| -------------------------------------------------- | ---------------------------------------------------- | ------------------------------------- | ----------------------- | ------------ | -------------------- | ------ | ------ | ------------ | ----------------- |
| Setup ([099](./099_tournament-setup-and-start.md)) | ✓ (all rules)                                        | ✓ (plain roster, no rebuild)          | – (not started)         | ✓            | ✓                    | –      | –      | –            | –                 |
| Round 1, no scores                                 | ✓                                                    | ✓                                     | ✓                       | ✓            | ✓ (≥ 1)              | ✓\*    | –      | –            | –                 |
| Round ≥ 2, no scores in round                      | ✓                                                    | add only, random seed only            | ✓                       | ✓            | ✓ (≥ current)        | ✓      | –      | ✓            | ✓                 |
| Scores exist in round                              | ✓                                                    | –                                     | courts without scores   | –            | ✓ (≥ current + 1)    | –      | ✓      | ✓            | –                 |
| Completed                                          | rename only                                          | –                                     | –                       | –            | –                    | –      | –      | –            | ✓ (variant B)     |

\* Retire works in round 1 but **Remove** is the right tool for a no-show; the UI says so.

### Concurrency

Every mutation re-reads the lock inside the request and writes with a conditional update on `tournament.currentRound` (the claim pattern already used by `closeRoundForm`). If a score landed in between → `409 err_state_changed`; the client shows the message and refreshes `getManageData`.

---

## Data Layer

### `src/routes/tournament/[id]/manage/manage-data.remote.ts`

```typescript
getManageData({ tournamentId }): {
	tournament: { id, name, status, currentRound, numRounds, formatType, playerCount, ...rules };
	lock: { roundHasScores: boolean; lockedCourts: number[]; openCourts: number[]; isFinalRound: boolean };
	players: {
		id; name; token; seedPoints; seedRank;
		courtNumber: number | null; position: number | null;   // current round
		status: 'active' | 'retired' | 'injured' | 'eliminated';
		retiredRound; retirementReason; injuredAt; retiredAt;   // for undo countdown
		replacesPlayerId; replacedByPlayerId; joinedRound;
		checkedInAt; checkInSource;                              // 097
		canUndoUntil: Date | null;
	}[];
	courts: { courtNumber; label; courtId; rotationId; courtSize; hasScores; isFrozen; bracketRole: string | null;
	          manualAdjustedAt; playerIds: number[] }[];
	canonicalCourtSizes: number[];    // tournament.courtSizes
	minRounds: number;                // for numRounds input
}
```

### `src/routes/tournament/[id]/manage/manage-actions.remote.ts` (commands)

| Command                    | Input                                                            | Notes                                                             |
| -------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------- |
| `renamePlayer`             | `playerId, name`                                                 |                                                                   |
| `updatePlayerSeed`         | `playerId, seedPoints`                                           | preseed, R1 pre-scores; recompute ranks; rebuild R1               |
| `addPlayer`                | `name, seedPoints?`                                              | phase table above; `ensureCourtsExist`                            |
| `removePlayer`             | `playerId`                                                       | R1 pre-scores; hard delete; rebuild R1; drop surplus `court` rows |
| `removeUncheckedPlayers`   | `tournamentId`                                                   | 097; same rules as `removePlayer`                                 |
| `regeneratePlayerToken`    | `playerId`                                                       | 097                                                               |
| `swapPlayers`              | `playerAId, playerBId`                                           | in-place rotation update                                          |
| `movePlayer`               | `playerId, targetCourtNumber`                                    | in-place rotation update                                          |
| `previewAssignmentChange`  | `{ kind: 'swap' \| 'move', ... }`                                | **query**, returns `{ errors[], warnings[], resultingCourts }`    |
| `resetRoundAssignments`    | `tournamentId`                                                   | recompute current round; whole-round lock                         |
| `reshuffleRound1`          | `tournamentId`                                                   | random seed only                                                  |
| `updateTournamentSettings` | `name?, physicalCourtCount?, timing…?, preseedRetirementPolicy?` |                                                                   |
| `updateScoringRules`       | `scoringMode, pointsToWin, winBy, setsToWin, decidingSetPoints`  | regenerates current round match rows                              |
| `updateRoundCount`         | `numRounds`                                                      | random seed                                                       |
| `finishTournamentEarly`    | `mode: 'use_current' \| 'discard_current'`                       |                                                                   |
| `reopenLastRound`          | `tournamentId`                                                   | variant A or B from status; 409 claim                             |

Reused unchanged from `tournament-actions.remote.ts`: `retirePlayer`, `reportInjury`, `undoRetirement`, `undoInjury`, `updateScoringOverrides`, `updateTieBreakConfig`, `setCourtLabel`, `deleteTournamentForm`.

### Pure logic (`src/lib/tournament-logic.ts`, unit-tested)

| Function                                                      | Purpose                                                                                                                                                                        |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `swapPlayersInAssignments(assignments, a, b)`                 | returns new assignments                                                                                                                                                        |
| `movePlayerInAssignments(assignments, playerId, targetCourt)` | returns new assignments                                                                                                                                                        |
| `validateManualAssignment(before, after, ctx)`                | `{ errors: ManualAssignmentError[]; warnings: ManualAssignmentWarning[] }` — sizes 3..6, frozen, final-round court 1, second non-standard court, bracket crossing, ladder jump |
| `appendLateJoiner(prevResults, newPlayerId, courtSizes)`      | new player ranked last → bottom court                                                                                                                                          |
| `minRoundCount(currentRound, roundHasScores)`                 | for `numRounds` validation                                                                                                                                                     |
| `deriveLockState(rotations, matches)`                         | `{ roundHasScores, lockedCourts, openCourts }`                                                                                                                                 |

### Orchestration (`src/lib/server/tournament-orchestration.ts`)

`rebuildCurrentRound` and `ensureCourtsExist` per 095. `retirePlayer`, `undoRetirement` and `closeRoundForm` are refactored onto `rebuildCurrentRound` in the same change (behaviour-preserving; existing E2E suite is the regression net).

### `closeRoundForm` checklist

- [ ] Next-round `courtSizes` computed from **active player count**, not from `parseCourtSizes(tourney)` when the current round has `manualAdjustedAt` rotations.
- [ ] Completion check keeps using `rotation.courtSize` (already the case).
- [ ] Late joiners with `joinedRound === currentRound` are ranked from their court result like anyone else — no special case needed, verify with a test.

---

## Operations View Changes (`/tournament/[id]`)

Removed from `+page.svelte`: scoring overrides editor, tie-break editor, retire form, injury form, delete button, **player-facing `CourtQRCode`**. Added: **Manage** button in the header, **Check-in** button (097) while check-in is open, compact rules summary line ("Single set to 21 · win by 2 · tie-break: points → diff → …") linking to `/manage#rules`, **Report injury** shortcut linking to `/manage#players` while the round has scores, **adjusted** badge on court cards with `manualAdjustedAt`.

Kept: round stepper, court cards with labels and an organizer **Open court page** link (stable `court.token`, 1045) — **no** player-facing court QR. Manual tie-break dialog (it belongs to closing a round), close round / finalize, **Reopen last round** (visible when variant A or B applies). Expected size after the split: roughly half of the current 2,300 lines.

In `setup` ([099](./099_tournament-setup-and-start.md)) this page shows the start panel instead of court cards.

---

## i18n Keys (new)

`manage_title`, `manage_tab_players`, `manage_tab_courts`, `manage_tab_rules`, `manage_tab_tournament`, `manage_lock_open`, `manage_lock_partial`, `manage_lock_completed`, `manage_search_players`, `manage_add_player`, `manage_add_joins`, `manage_add_reshuffle_note`, `manage_remove_player`, `manage_remove_confirm`, `manage_remove_unchecked`, `manage_remove_unchecked_confirm`, `manage_rename`, `manage_seed_points`, `manage_regenerate_link`, `manage_badge_joined`, `manage_badge_replacement_for`, `manage_badge_eliminated`, `manage_swap`, `manage_move`, `manage_move_to`, `manage_preview_result`, `manage_reset_assignments`, `manage_reshuffle_round1`, `manage_adjusted_badge`, `manage_warn_two_nonstandard`, `manage_warn_bracket_cross`, `manage_warn_ladder_jump`, `manage_rules_scoring_locked`, `manage_rounds_min_hint`, `manage_rounds_preseed_fixed`, `manage_finish_early`, `manage_finish_early_use_current`, `manage_finish_early_discard`, `manage_finish_early_confirm`, `manage_finished_early_note`, `manage_reopen_round`, `manage_reopen_confirm`, `manage_reopen_discards_next`, `manage_reopen_undoes_roster`, `manage_reopen_completed`, `manage_danger_zone`, `err_state_changed`, `err_reopen_has_scores`, `err_reopen_round1`, `err_court_too_small`, `err_court_too_large`, `err_final_court_must_be_4`, `err_court_frozen`, `err_court_locked`, `err_add_player_phase`, `err_add_player_preseed`, `err_remove_after_scores`, `err_roster_min_after_remove`, `err_rounds_below_current`, `err_rounds_final_court_size`, `err_name_taken`.

## Testing

### Unit (`src/lib/server/tournament-logic.test.ts`)

- `swapPlayersInAssignments` keeps all sizes; players end up on each other's courts.
- `movePlayerInAssignments` + `validateManualAssignment`: source < 3 → error; target > 6 → error; frozen → error; final round Court 1 ≠ 4 → error; second non-standard court → warning; preseed bracket crossing → warning; ladder jump ≥ 2 → warning.
- `appendLateJoiner`: 16 → 17 puts the new player on the (now 5p) bottom court; 22 → 23 splits bottom 6p into 4p + 3p correctly.
- `minRoundCount`: `(2, false) → 2`, `(2, true) → 3`.
- `deriveLockState` per-court results.

### E2E (`e2e/manage.spec.ts`)

1. Rename → new name visible on court page and player page.
2. Remove no-show in R1 (16 → 15) → courts become `[4,4,4,3]`, removed player absent from standings.
3. Add late player in R1 (16 → 17) → still 4 courts, bottom court 5p (`[4,4,4,5]`); new player has a token. Add in R1 (20 → 21) → 5 courts, bottom 5p; a fifth `court` row was created.
4. Swap two players pre-scores → both **player pages** show swapped names; organizer court fallback URLs still work (stable `court.token`).
5. Save a score on Court 1 → swap involving Court 1 rejected (`err_court_locked`); swap between Courts 3 and 4 still works.
6. Move creates a 3p court → warning shown; round closes correctly using rotation sizes; next round sizes canonical.
7. `numRounds` 4 → 2 while in round 2 (no scores) → "Finalize Tournament" button appears; 4 → 1 rejected.
8. Finish early after round 2 with partial scores → standings page shows finished-early note; player page shows final standing.
9. Preseed: add player in round 2 rejected with `err_add_player_preseed`.
10. Existing retire / injury / undo E2E tests re-pointed at `/manage#players` and still pass.
11. Close round 1 → reopen → round 1 scores editable on player pages, round 2 gone, Close Round shown again; organizer court tokens of round 1 still work.
12. Enter a score in round 2 → reopen blocked (`err_reopen_has_scores`).
13. Retire between rounds, then reopen → retiree restored, replacement gone if any.
14. Finalize tournament → reopen last round → `status = active`, standings no longer final, scores editable.

## Open Questions

1. **Per-court lock for swap/move** (proposed) vs. whole-round lock (simpler, but blocks shift-2 courts while shift 1 plays)?
2. **Late joiner in random seed between rounds** enters at the bottom court (proposed). Alternative: organizer picks the court in the Add dialog (then it is a move with the same validation).
3. **Roster minimum after removing no-shows**: allow down to 6 with warning (proposed), or keep the hard 8? In `setup` ([099](./099_tournament-setup-and-start.md)) the roster can be 0; the 8-player floor is a **start** condition.
4. **Achievements** on the standings page for late joiners: exclude (proposed) or include with fewer rounds?
5. **One page or two?** Proposed: operations view + manage page. Alternative: fold the operations view into the manage page as a fifth "Round" tab.
6. **Finish early with partial scores**: "use as final with cancel & average" default (proposed) vs. "discard" default.
7. Should **scoring mode** changes be allowed mid-round for **unscored courts** only (per-court like swap/move)? Proposed: no — one rule set per round.
8. Reopen while round `r` has scores: block (proposed) vs. also discard those scores after a second confirm?

## Related Specs

- [095_org-player-experience-index.md](./095_org-player-experience-index.md) — shared migration, extraction list, implementation order
- [050_tournament-management.md](./050_tournament-management.md) — current pages; update when implemented
- [097_player-check-in.md](./097_player-check-in.md) — check-in badge, remove no-shows
- [098_player-page.md](./098_player-page.md) — reflects moves/adds automatically; primary scoring surface
- [099_tournament-setup-and-start.md](./099_tournament-setup-and-start.md) — `setup` status, start panel
- [093_round-history-stepper.md](./093_round-history-stepper.md) — browsing closed rounds stays read-only; reopen is the only way to edit them again
- [670](./670_player-retirement.md), [091](./091_preseed-retirement-bracket-policy.md), [092](./092_mid-round-injury-forward-retirement.md) — reused retirement/injury commands
- [087_preseed-frozen-courts.md](./087_preseed-frozen-courts.md) — frozen courts excluded from edits
- [610_incomplete-core.md](./610_incomplete-core.md) — one non-standard court goal (warnings)

## Implementation Files

- `src/routes/tournament/[id]/manage/+page.svelte`, `+page.server.ts`, `+page.ts`
- `src/routes/tournament/[id]/manage/manage-data.remote.ts`, `manage-actions.remote.ts`
- `src/lib/components/manage/PlayersTab.svelte`, `CourtsTab.svelte`, `RulesTab.svelte`, `TournamentTab.svelte`, `LockIndicator.svelte`
- `src/lib/tournament-logic.ts` — pure functions above
- `src/lib/server/tournament-orchestration.ts` — `rebuildCurrentRound`, `ensureCourtsExist`
- `src/routes/tournament/[id]/tournament-actions.remote.ts` — refactor onto `rebuildCurrentRound`; `closeRoundForm` checklist; `reopenLastRound`
- `src/routes/tournament/[id]/+page.svelte` — remove editors/forms, add links and badge
- `messages/*.json`, `e2e/manage.spec.ts`
