# Player Page

## Status

**PROPOSED — REVIEWED.** Part of [095_org-player-experience-index.md](./095_org-player-experience-index.md). Depends on `player.token` from the shared migration `0016`; optional QR codes that lead here are produced by [097_player-check-in.md](./097_player-check-in.md). The page also works if someone opens the URL without using check-in. Remaining blanks are in **Open Questions** at the end.

## Problem

Players have no personal view of the tournament. The court QR (060) is still a valid way to enter scores — one URL per court, stable across rounds — but it cannot tell a player where they go **next**. After every close round the field walks to the organizer to ask "where am I now, when do I play, with whom?". With virtual courts and shifts (660) the question is also "how long is my break?". The answer exists in the database the moment `closeRound` runs — it just has no personal screen unless the organizer hands one out.

## Goals

1. Public, mobile-first page **`/player/[token]`**. One URL per player for the whole tournament — bookmark it, add it to the home screen.
2. Always answers, as the **hero of the page**: **which court, which game is on now, who plays whom** — and lets the player **enter that score** (same validation as today's court page; **write-once** — no Edit after save).
3. Shows **upcoming games** this round under the current one, each with **compact score inputs** (play order on the sand does not matter). A player may save a match **once**; after that, corrections go through the court page / organizer.
4. Always shows **placement** as text: **current place**, **best achievable place**, and **safe place** (worst still theoretically achievable). No range bar. See [Placement](#placement).
5. Always shows a **record**: seed (if any), **ranking** totals (normalized on 5p/6p), and a **game-by-game history of every finished match** — including completed games in the current round. The hero is only the current game plus upcoming. See [Record and history](#record-and-history).
6. **Works alongside the court page (060), not instead of it.** The organizer chooses how to drive scoring: court QRs on the operations view, personal player QRs via optional check-in ([097](./097_player-check-in.md)), or both. Scores saved on either page last-write-wins and show up on the other.
7. **Updates itself** after close round, a score saved by anyone on the court (player page or court page), retirement, manual moves (096), round-1 rebuilds — via polling, no reload.
8. Covers every player state: check-in unused or open, not started, waiting (shift), current game, sit-out, court done, frozen, eliminated, retired / injured, completed, unknown token.
9. Additionally we want to show a useful information for the wait time. We should not show "minutes" but a time, when the player should be at her designated court. We can use the estimation + the point in time when the "facts" the estimation is based upon have updated. We should be conservative here, so that the players are not late, when we have a fast round.

## Non-Goals

- Push notifications / service worker.
- Showing other players' personal links.
- Replacing, hiding, or retiring `/court/[token]`. Court QRs stay on the operations view (see [Court page](#court-page)).
- Requiring check-in. An organizer who never opens `/check-in` still has a complete tournament: court QRs, score entry, close round. Player tokens exist so a personal page can be handed out later.

## States

`derivePlayerRoundState()` (pure, unit-tested) maps `(tournament, player, rotations, matches, shift)` to one of:

| State         | Condition                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| `completed`   | `tournament.status === 'completed'`                                                                    |
| `retired`     | `player.retiredAt` set and (`retiredRound < currentRound` or no rotation contains the player)          |
| `injured`     | `player.injuredAt` set and the current-round rotation still contains the player (Phase 1 of 092)       |
| `frozen`      | Player's current court is frozen (087) — bracket finished early                                        |
| `eliminated`  | Final round; player is active but not on any rotation (670 final-round elimination)                    |
| `court_done`  | Player's court has all matches complete, round not yet closed                                          |
| `waiting`     | Player on a current-round rotation whose shift is not on a physical court yet (660)                    |
| `active`      | Player on a current-round rotation, matches open, shift is playing                                     |
| `not_started` | `tournament.status === 'setup'` (or `currentRound === 0`) — [099](./099_tournament-setup-and-start.md) |

Plus two orthogonal flags: `checkInOpen` (097 banner — only when check-in has actually been used) and `movement: 'up' | 'down' | 'same' | null` (court number vs. previous round).

`injured` still shows the [Current game](#current-game) block so the substitute's court can be scored from this token; a SUBST notice sits on the matchup. Terminal states (`completed` / `retired` / `eliminated` / `frozen` with court done) have no score entry.

## Layout

Header: tournament name · **player name** · "Round 2 of 4". Language switcher (page is locale-free via QR, so the switcher matters here).

The **Placement** block is present in every playing state (see [Placement](#placement)); in terminal states it collapses to a single final place. Hidden in `not_started`.

### `active`

```
┌────────────────────────────────────────────────┐
│ ROUND 2 OF 4                                    │
│                                                 │
│   NOW · Court 3                                 │
│   Physical court: "Beach B"                     │
│   4 players · single set to 21 · win by 2       │
│   ▲ up from Court 4                             │
│                                                 │
│   YOU + Ben                                     │
│        vs                                       │
│   Carla + Dan                                   │
│                                                 │
│   [ 21 ]  :  [ 18 ]              [Save]         │
│                                                 │
│ Up next                                         │
│  3  You + Dan   vs Ben + Carla                  │
│      [___] : [___]               [Save]         │
│                                                 │
│ Court standings                                 │
│  1. Ben 21 (+3)   2. You 21 (+3)   3. Carla …   │
│                                                 │
│ Placement                                       │
│  Currently 7th of 16                            │
│  Best achievable place: 5th                     │
│  Safe place: 16th                               │
└────────────────────────────────────────────────┘
```

- **NOW** is the largest block: court number, then the matchup, then the score fields. Physical label (`court.label`) directly under the court when set. There is **no** "Open court page" link.
- Shift line when virtual > physical courts (660): "Shift 1 of 2 · playing now". Hidden when virtual = physical.
- The player's team is always on the **left** ("YOU + partner"). Scores save mapped back to stored team A/B — see [Score entry](#score-entry).
- 3p court: "YOU vs Ben + Carla" or "YOU + Ben vs Carla (solo)".
- 5p/6p sit-out as NOW: hero reads "You sit out this game"; **On court now** lists the parallel match(es) **read-only** (no score fields). Those games are scored on the court page. The sitting player has no write on a match they are not in.
- Injured with substitute (Phase 1 of 092): the row shows "SUBST" for the injured player and a notice; score fields stay enabled for matches the injured player is still rostered in.
- Canceled matches: "canceled — averaged"; no inputs.
- **Up next**: remaining this-round matches the player is **in**, in match order, with the same `ScoreEntry` control **visually smaller**, so a court that plays game 3 first can still save it. Hidden when empty. Finished games are not listed here — they live in [History](#history).
- **No Edit** after save. Once a score exists on a match, the player page shows it read-only. The organizer corrects it on the court page (060).
- Court standings: same `resolveRotationStandings` output as the court page; the player's own row is highlighted; tie-break icons reused (`TieBreakFactorIcons`).
- When the last open match the player is in is saved, the page moves to `court_done` on the next refresh (or immediately after the save returns).

### `waiting`

```
┌────────────────────────────────────────────────┐
│ ROUND 2 OF 4                                    │
│                                                 │
│   Court 5            ▼ down from Court 4        │
│   Shift 2 of 2 · Be at court at 10:15           │
│                                                 │
│ Up next this round                              │
│  1  You + Ben      vs  Carla + Dan              │
│  2  You + Carla    vs  Ben + Dan                │
│  3  You + Dan      vs  Ben + Carla              │
│                                                 │
│ Score entry opens when your shift starts.       │
│                                                 │
│ Placement …                                     │
└────────────────────────────────────────────────┘
```

No score inputs. **Wait clock** — a clock time, not a duration. See [Wait clock](#wait-clock). When the shift starts, polling flips the page to `active` without reload.

### `court_done`

```
┌────────────────────────────────────────────────┐
│ ROUND 2 OF 4 — Court 3 done                     │
│ You finished 2nd · 42 pts · +7                  │
│                                                 │
│ Waiting for other courts (4 of 6 done)          │
│ Your next court appears here automatically.     │
│                                                 │
│ Likely next: ▲ Court 2  (2nd place moves up)    │
│                                                 │
│ Placement                                       │
│  Currently 6th of 16                            │
│  Best achievable place: 5th                     │
│  Safe place: 8th                                │
└────────────────────────────────────────────────┘
```

Once the court is done the achievable range tightens (rank on the court is now known — see [Placement](#placement)). Score fields are gone (write-once already; the court page can still correct a score).

The **"Likely next"** hint **is shown** when it is rule-deterministic from the player's own rank. If the organizer later changes a tie-break, they communicate that on the sand — the hint is not hidden to avoid that conversation:

| Format      | Round transition | Hint                                                                                        |
| ----------- | ---------------- | ------------------------------------------------------------------------------------------- |
| Random seed | R1 → R2          | none (vertical seeding depends on all courts)                                               |
| Random seed | R2+ ladder       | rank 1–2 → court − 1 (Court 1 stays), rank ≥ 3 → court + 1 (bottom stays); 5p/6p: top 2 up  |
| Preseed     | any              | "winners' group" / "losers' group" of the current bracket (top half vs bottom half by rank) |

Wording is always "likely" — retirements, manual moves and tie-break resolution by the organizer can change it. Suppressed when the organizer's manual tie-break is pending on the court.

### `frozen` (preseed)

"Your bracket finished after round 3. You finished 2nd on Court 5 → **final place 18**." Uses `getPreseedBracketRange` + snapshot rank.

### `eliminated`

"Final round: 5 players for 4 places on Court 1 — you are not playing this round. **Final place 5**." (670)

### `retired` / `injured`

"You retired after round 2 (injury). **Final place 14**." History table below stays visible. If `replacedByPlayerId` is set: "Replaced by Nora Kim".

If `injured` and the current-round rotation still contains the player (Phase 1), the [Current game](#current-game) block is shown above this copy so scores can still be entered.

### `completed`

Big final place ("**3rd of 16**" with medal for top 3), "Finished early after round 2" note when `finishedEarly` (096), history, link to the standings page.

### `not_started` ([099](./099_tournament-setup-and-start.md))

```
┌────────────────────────────────────────────────┐
│ Beach Bash 2026 has not started yet             │
│ 14 players registered · You are checked in ✓    │
│ Your court and first game appear here when the  │
│ organizer starts the tournament.                │
└────────────────────────────────────────────────┘
```

The "You are checked in ✓" line is hidden if check-in was never used (all `checkedInAt` null) — then it is just "14 players registered".

Placement hidden. Polling continues so the court appears at start without reload.

### Banners (any state)

- `checkInOpen` and tournament already started: "Check-in still open — your court may change until the organizer closes check-in." (097). Hidden in `not_started`. Hidden entirely when check-in was never used (no `checkedInAt` / `checkInSource` on any player and `checkInClosedAt` is null).
- Poll failure: small "Last updated 12:04 · retry" line; the page never blanks out on a failed refresh.

### Below the main card

See [Record and history](#record-and-history) — always below placement (or below the main card in `not_started` / `completed`). Hidden only before the tournament has started and the player has no finished games.

## Current game

`splitPlayerMatches(matches, playerId, courtSize)` (pure, unit-tested) walks the current-round matches in `matchNumber` order and returns `{ current, parallel, upcoming }`. Finished matches the player was in are **not** returned here — they go to [History](#history).

**NOW** is the first incomplete match-group that involves the player **or** that the player sits out while parallel games in the same run are still open:

| Situation                                     | Hero                                                               | Score fields                                           |
| --------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------ |
| Player is in the next incomplete match        | That matchup (YOU on the left)                                     | That match, if it has no score yet                     |
| Player sits out this run; parallel games open | "You sit out this game" + **On court now** (the parallel matchups) | **none** — parallel games are scored on the court page |
| Player is in one of two parallel games        | The player's own matchup; the other game under **Also on court**   | The player's game only (the other is read-only)        |
| All of the player's matches complete          | — (state is `court_done`)                                          | none                                                   |
| Shift not playing                             | — (state is `waiting`; upcoming list only)                         | none                                                   |
| Match canceled                                | "canceled — averaged"; skip to the next group                      | none on that group                                     |

"Incomplete" means at least one required set has no saved score (same `isMatchComplete` as 060 / 930). Best-of-3 deciding set appears only when sets 1 and 2 are saved and split, same as the court page.

When NOW's match is saved, NOW advances to the next incomplete group the player is in on the same response — no wait for poll — and the saved game appears in History.

## Wait clock

Waiting players see **when to be at their court**, not "in N minutes".

```
beAtCourtAt = factsUpdatedAt + conservativeRemaining
```

- **`factsUpdatedAt`**: the latest timestamp the remaining estimate is based on — `max(shiftStartedAt, lastActivityAt of any playing-shift court)`. If no scores have landed yet this shift, that is when the shift (or round) became the playing shift.
- **`conservativeRemaining`**: remaining duration of the **current playing shift** from [650](./650_game-rules-and-duration.md) / [660](./660_virtual-court-scheduling.md) (unscored matches × estimated match duration + configured transition), then scaled by a **fast-round factor** so a quicker-than-average shift does not leave players late. Proposed factor: **0.75** (Open Question 1).
- Display `beAtCourtAt` as a **clock time in the viewing device's local timezone** (e.g. "Be at court at 10:15"). Never show a duration ("~45 min"). Never show a time in the past — if `beAtCourtAt` ≤ now, the line is **"Be at the court now"**.
- The clock time does **not** slide later just because wall time passed without new scores. It only moves when facts change (a score is saved, a court completes, the shift starts). It may jump **earlier** as courts finish faster than the mean — that is intended.
- When the playing shift is complete: "Your shift is next — be at the court now."
- Hidden when virtual = physical (no wait).

## Score entry

This page is a scoring surface **in parallel with** `/court/[token]`. Rules, validation, and last-write-wins are **the same as [060](./060_court-operations.md)**. The UI is extracted into `ScoreEntry.svelte` and reused on the court page so the two cannot drift. A score saved here appears on the court page (and vice versa) on the next poll.

- **Single set**: one score pair + Save.
- **Best-of-3**: Set 1, Set 2, Set 3 (Deciding) cards; deciding set only when 1–1; each set has its own save/edit/cancel.
- Validation via `getEffectiveScoring()` / `isValidFinalScore()` (target, win-by, 5p/6p 15, no cap). Blowout / deuce rules from 870.
- On save: "Saved" confirmation; `lastActivityAt` bumped; other players on the court see the score on their next poll.
- **Write-once on this page.** After a score exists on a set/match (saved by this player, a teammate, or the court page), the player page shows it read-only. There is no Edit. To change it, talk to the organizer — they use the **court page**, which still allows edit / clear (095 Open Question 1: whether that court-page edit stays anonymous).
- Canceled matches: no form.
- Last write wins **on the court page**. Two phones submitting the same empty match from **player pages** is expected (the first save wins; the second gets `err_score_already_saved`).
- Inputs while focused pause polling so a refresh cannot wipe digits being typed (court page today only pauses while a save is in flight — this is stricter, and the court page should do the same).

### Who can save

`savePlayerScore` / `savePlayerSetScore` take the **player token**, not the court token.

1. Resolve `player` by token; 404 if unknown.
2. Load the `match` and its current-round `court_rotation`.
3. The player must be **in that match** (one of the named players on a team). Sit-out / watching a parallel game is **not** enough — those scores are entered on the court page.
4. The target set/match must have **no score yet**. If any score exists → `err_score_already_saved`.
5. Same round-active / not-canceled / deciding-set guards as `saveScore` (060).
6. Map the submitted left/right scores through `youOnTeam: 'a' | 'b'` onto `teamAScore` / `teamBScore`.
7. Write the row, bump `lastActivityAt`, refresh `getPlayerData` and `getCourtData` so the court page updates.

A player token cannot save another court's match, a sit-out parallel game, or overwrite a saved score. The organizer's session is not required. Shared validation lives in `$lib/server/save-score.ts` so court-token saves and player-token saves cannot diverge on rules; they diverge only on **who / when** (player = first write of own matches; court = any match on that court, including edits).

## Record and history

The point of this block is that a player can answer, without asking the organizer: **what did I score, with whom, and why did I change courts?**

### Record strip

Always visible once the tournament has started (`status = 'active'` or `completed`), including `retired` / `frozen` / `eliminated`.

```
┌────────────────────────────────────────────────┐
│ Record                                          │
│ Seed 4 of 16 · 1250 pts          (preseed)      │
│ Points 126 · Diff +18 · 6 matches               │
└────────────────────────────────────────────────┘
```

| Field       | Source                                                                                                                                                                                                                                                                                  | Notes                                                                                                                                                                                                                                                                                              |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Seed**    | `player.seedRank` + `seedPoints`                                                                                                                                                                                                                                                        | Preseed: Rank 1 = highest seed (points, then **name-list order** — first name = seed 1 when no points; same order as round-1 snake). Hidden for random seed; instead: "Random seed · started on Court k" once round 1 exists. Random-seed still stores `seedRank` for the Seeding tie-break (094). |
| **Points**  | Ranking total used for standings: sum of per-round **total_points** contributions (094). Standard 4p rounds add raw points; each 5p/6p round adds `roundRawPoints / 3`. Unplayed / canceled matches do not add. Injured-with-substitute matches add **0** for the injured player (092). |
| **Diff**    | Ranking differential: same per-round rule as `total_diff` / average diff per game on 5p/6p (094).                                                                                                                                                                                       |
| **Matches** | Count of completed, non-canceled matches the player actually played (not sit-outs).                                                                                                                                                                                                     |

These are the numbers that dictate court rank and the next court — not the raw rally totals. Per-game rows in History still show the actual scores (21–18). If any round was 5p/6p or had canceled matches, a one-line note under the strip: "5-player / 6-player rounds use averages to rank — totals here match ranking." Do **not** also show a raw-points line.

`not_started`: record strip hidden (no games yet). Seed may still be shown for preseed: "Seed 4 of 16 · 1250 pts · tournament not started."

### History

One **round card** per round that has at least one **finished** match for this player, **newest first**. **Every finished game is in History**, including completed matches in the **current** round. The hero is only the current game (if there is one) plus upcoming games.

After a save, that match leaves NOW / Up next and appears on the current-round history card. After `closeRound`, that card gains the snapshot rank / movement / why line. Closed rounds use `standingsSnapshot` (094) for rank/points/diff so they do not move on reload; match rows come from the `match` table (historical scores are immutable unless the organizer reopens the round — 096). The current-round card uses live scores until close.

```
┌────────────────────────────────────────────────┐
│ Round 2 · Court 3 (Beach B) · 4p                │
│ You finished 2nd · 42 pts · +7                  │
│ ▲ from Court 4  →  Court 2 next                 │
│ Promoted: rank 1–2 move up one court            │
│ (ladder, 2 up / 2 down)                         │
│                                                 │
│ You + Ben     vs  Carla + Dan    21–18   +3     │
│ You + Carla   vs  Ben + Dan      21–19   +2     │
│ You + Dan     vs  Ben + Carla    21–16   +5     │
├────────────────────────────────────────────────┤
│ Round 1 · Court 4 · 4p                          │
│ You finished 1st · 63 pts · +12                 │
│ Started here  →  Court 3                        │
│ Vertical seeding: 1st-place tier fills Court 1, │
│ then Court 2, … — you went to Court 3 because   │
│ two other 1sts ranked above you on points.      │
│                                                 │
│ You + Eva     vs  Finn + Gita    21–15   +6     │
│ …                                               │
└────────────────────────────────────────────────┘
```

#### Per-round header

| Field                                           | Meaning                                                                                                               |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Round, court number, physical label, court size | From `court_rotation` / `court.label`                                                                                 |
| Rank on court, round points, round diff         | Snapshot for closed rounds; live ranking totals for the current round once the court is done, else omitted until then |
| Movement                                        | Previous court → next court. Same `up` / `down` / `same` arrows as the main card. Shown after `closeRound`.           |
| **Why**                                         | One sentence from the format + this rank — see [Movement copy](#movement-copy). After `closeRound` only.              |

#### Per-game rows

One row per **match** the player was in (`matchNumber` group). 5p/6p sit-outs are listed as "You sat out" with no score. 3p solo: partner is "— (solo)".

| Column    | Content                                                                                                                                                                                                                      |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Partners  | "You + {partner}" (or solo)                                                                                                                                                                                                  |
| Opponents | "{a} + {b}" (one name on 3p 2v1 when the player is in the pair and the opponent is solo: "vs {name} (solo)")                                                                                                                 |
| Result    | Single set: `21–18`. Best-of-3: `21–19, 15–21, 15–13` (sets in order; unplayed deciding set omitted). Player's team score is always on the left. Canceled: "canceled". Substitute: player's name still, notice "sub played". |
| Diff      | Player's team points − opponents' points for that match. Single set: `21−18 = +3`. Best-of-3: sum of set diffs (same as how `buildPlayerRoundStats` adds set rows).                                                          |

Rows in match order (1, 2, 3 / 4).

#### Movement copy

Short, format-specific, derived from the same rules as `reachableFinalPlaceRange` / 080. No extra simulation.

| Format                 | Rank on this court | Copy                                                                                                                                               |
| ---------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Random seed, round 1   | any                | "Vertical seeding: finishers of the same rank are ordered by points, then fill courts from the top. You were in the {nth}-place tier → Court {k}." |
| Random seed, round ≥ 2 | 1 or 2             | "Ladder: ranks 1 and 2 move up one court." Court 1 rank 1–2: "You stay on Court 1."                                                                |
| Random seed, round ≥ 2 | ≥ 3                | "Ladder: ranks 3 and below move down one court." Bottom court: "You stay on the bottom court."                                                     |
| Preseed                | 1 or 2             | "Winners of this group play in the {winners' role} next (places {min}–{max})."                                                                     |
| Preseed                | ≥ 3                | "This group splits: ranks 3–4 go to the {losers' role} (places {min}–{max})."                                                                      |
| Frozen (087)           | —                  | "This court is finished — your place in this bracket is final."                                                                                    |
| Manual move (096)      | —                  | "The organizer moved you onto this court." (if `manualAdjustedAt` is set on the rotation you arrived on)                                           |
| Late joiner (096)      | —                  | "You joined in round {n} (entered at the bottom court)."                                                                                           |

A collapsible **How courts change** under the first history card explains the tournament's format in three lines (random: R1 vertical, then 2 up / 2 down; preseed: group split by rank). No diagrams. Link to `/docs` if that page already covers it.

### Edge cases

| Case                           | History                                                                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Best-of-3                      | One row per match, all played sets, diff = sum of set diffs                                                                                                   |
| 5p/6p sit-out                  | Row with no score: "You sat out (parallel games)"                                                                                                             |
| Canceled (injury B)            | Row: "canceled — not counted"                                                                                                                                 |
| Substitute (injury A)          | Row with score; injured player 0 pts; tag "sub"                                                                                                               |
| Reopened round (096)           | That round's card stays; scores remain until the organizer edits them on the court page. Player-page rows stay read-only. Hero shows remaining empty matches. |
| Current round, some games done | Top history card is this round (no movement/why yet); finished games listed; NOW + Up next are the rest                                                       |
| `not_started`                  | No history                                                                                                                                                    |
| Player sat a whole shift       | Still a round card after the round closes; wait/shift was on the main card                                                                                    |

## Placement

Every state except `not_started` shows three numbers as **text** (no bar, no gradient): **current place**, **best achievable place**, **safe place**.

- **Current place is live and includes the current round.** It uses the same ordering as the standings page (070 / 090 / 094): court position of the **current** round first (from live court standings, including partial scores), then the configured tie-break factors. Unplayed matches count as 0 so far. Label: "Currently 7th of 16" where 16 = active players (retirees are excluded from `total` but keep their fixed final place). This is **not** "after the last closed round".
- **Achievable range follows the projected next court** from that live court rank: if the player would promote or relegate _if the round closed now_, the first redistribution step is treated as already decided, then remaining rounds are free movement around that court. See [Reachable court range](#reachable-court-range).
- The range is recomputed on every poll **and after every score save**, so a saved score that changes the player's rank on their court immediately moves the range (and the "Currently" number).
- **No range bar.** Copy is two lines under current place:
  - `Best achievable place: {best}`
  - `Safe place: {worst}` — the worst final place still theoretically reachable given current position. (Confirm wording in Open Question 2.)
- **Not shown on the standings page.** Placement range is player-page only.
- **Terminal states** (`completed`, `retired`, `eliminated`, `frozen` with court done): best = worst = final place; the block reads "**Final place 5**".
- A one-line hint when the court is not done: "Remaining matches can still change this."
- `not_started`: placement block hidden.

Round 1 vertical seeding with **partial** scores on other courts can make `nextCourt` jump as those courts report. **That jumping is a feature** — it keeps players interested in other courts.

### Place numbering

Places are derived from **final-round court position**, exactly as the standings page does it (910 / 090): the player who finishes rank _r_ on court _k_ in the final round gets place

```
place(k, r) = Σ courtSizes[1..k−1] + r
```

With the canonical layout (only the bottom court non-standard) this is `4·(k−1) + r`; using cumulative sizes also covers manual layouts from 096. `courtSizes` is the layout of the round in question; for future rounds the current layout is assumed.

`bestPlace(k) = place(k, 1)`, `worstPlace(k) = place(k, courtSizes[k])`.

### Reachable court range

The core is a pure function that returns the set of courts the player can still be on in the **final round**, `[minCourt, maxCourt]`, then maps to `{ best: bestPlace(minCourt), worst: worstPlace(maxCourt) }`.

```typescript
reachableFinalPlaceRange(ctx: {
	formatType: FormatType;
	currentRound: number; // r
	numRounds: number; // N
	courtNumber: number; // k, player's current court
	courtSizes: readonly number[];
	projectedRank: number | null; // live rank on this court when it has ≥ 1 score; else null
	liveRoundResults: CourtResult[] | null; // live standings of every current-round court (partial scores ok)
	frozenCourtNumbers: ReadonlySet<number>;
}): { best: number; worst: number; minCourt: number; maxCourt: number; nextCourt: number | null };
```

Let `t = N − r` be the number of redistributions still to come. When `t = 0` (final round) the range is the current court: `[k, k]`, tightened to the exact live rank once `projectedRank` is known.

**Projected next court.** Whenever the player's court has at least one saved (or canceled) score, `projectedRank` is their live rank from `calculateCourtStandings` (same numbers as the court page). If the round closed _now_, they would promote or relegate according to that rank. Compute `nextCourt` by running the **real** redistribution on `liveRoundResults`:

| Format / round         | Function                                        | `nextCourt`                                                          |
| ---------------------- | ----------------------------------------------- | -------------------------------------------------------------------- |
| Random seed, round 1   | `verticalSeeding(liveRoundResults, …)`          | the court the player is assigned to                                  |
| Random seed, round ≥ 2 | `ladderRedistribute(liveRoundResults, …)`       | the court the player is assigned to (rank 1–2 up, ≥ 3 down, clamped) |
| Preseed                | `processPreseedTransition(liveRoundResults, …)` | the court after this group's split                                   |

Then `t − 1` remaining redistributions fan out around `nextCourt` (ladder: ± `(t−1)` courts; preseed: the **next** bracket group that contains `nextCourt`).

Other courts' live standings are included even if incomplete (0 points so far, ordered by the configured tie-break). That is what "based on current position" means tournament-wide, not only on this court.

When the player's court has **no scores yet**, `projectedRank` is null: do not pretend a 0–0 ranking is a result. Use the unconstrained bound from the current court (below).

#### Random seed (080, `ladderRedistribute` / `verticalSeeding`)

| Situation                                 | Rule                                                                                                                                                                                                |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No scores on this court yet               | `t` free ladder steps from `k`: `[max(1, k − t), min(C, k + t)]`. Round 1 with no scores: `[1, C]` (vertical seeding can send anyone anywhere).                                                     |
| Live rank ρ (any number of matches saved) | First step = `nextCourt` from the table above. Then `t − 1` free steps around it. Ladder: ρ ≤ 2 → up (Court 1 stays); ρ ≥ 3 → down (bottom stays, including ranks 3..size on a 5p/6p bottom court). |
| Court fully done                          | Same as live rank — the projection is now stable for this court (other courts may still move `nextCourt` in round 1 vertical seeding until they finish).                                            |

The worst unconstrained case matches the retirement formula already in 670 (`worstCourt = min(currentCourt + remainingRounds, totalCourts)`); the best case is its mirror image.

**Example — 16 players, 4 courts, 4 rounds:**

| Round | Court | Live rank on court   | `nextCourt`    | Reachable courts | Best – Safe   |
| ----- | ----- | -------------------- | -------------- | ---------------- | ------------- |
| 1     | 3     | none (0–0)           | —              | 1–4              | 1st – 16th    |
| 1     | 3     | 1st (1 of 3 matches) | Court 1        | 1–3 (then ±2)    | 1st – 12th    |
| 2     | 3     | none                 | —              | 1–4 (t = 2)      | 1st – 16th    |
| 2     | 3     | 2nd (partial)        | Court 2 (up)   | 1–3 (then ±1)    | 1st – 12th    |
| 2     | 3     | 3rd (partial)        | Court 4 (down) | 3–4 (then ±1)    | 9th – 16th    |
| 3     | 3     | 2nd                  | Court 2, t−1=0 | 2                | 5th – 8th     |
| 4     | 2     | none                 | —              | 2                | 5th – 8th     |
| 4     | 2     | 3rd                  | exact          | 2                | Final place 7 |

A score that flips the player from 2nd to 3rd on Court 3 in round 2 moves Best/Safe from 1st–12th to 9th–16th on the next poll.

#### Preseed (080 / 087 / 091, `getBracketGroups`, `processPreseedTransition`)

A player's future is bounded by their **bracket group**: `getBracketGroups(C, r − 1)`; the group containing `k` spans courts `[g_lo, g_hi]`.

| Situation                         | Rule                                                                                                                                                                                                                                         |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No scores on this court yet       | `[g_lo, g_hi]` — the group's full place range (same range 670 uses for retirees).                                                                                                                                                            |
| Live rank ρ, group not fully done | Project the split from **this court's live rank**: on a standard 4p court ρ ≤ 2 → winners' sub-group, ρ ≥ 3 → losers' sub-group. Range = that sub-group's place span. Origin mixing on other courts cannot move the player out of that half. |
| Group fully done                  | Simulate with real `processPreseedTransition` on completed results (dice persisted → stable). `nextCourt` known; recurse with `getBracketGroups(C, r)`.                                                                                      |
| Court frozen (087)                | `[k, k]`; exact once the court has a live rank.                                                                                                                                                                                              |

**Example — 16 players, 4 courts, 3 rounds (082):**

| Round | Court | Live rank / group | Reachable courts    | Best – Safe   |
| ----- | ----- | ----------------- | ------------------- | ------------- |
| 1     | 3     | none              | 1–4                 | 1st – 16th    |
| 1     | 3     | 2nd (partial)     | 1–2 (winners' half) | 1st – 8th     |
| 1     | 3     | 3rd (partial)     | 3–4 (losers' half)  | 9th – 16th    |
| 2     | 2     | none              | 1–2                 | 1st – 8th     |
| 2     | 2     | 3rd               | 2 (L(W))            | 5th – 8th     |
| 3     | 2     | 2nd               | exact               | Final place 6 |

**Example — 20 players (083), Court 5 frozen after round 2:** a player on Court 5 in round 2 shows 17th – 20th while playing and the exact place once the court is done; nothing changes for them in rounds 3–4.

### Special cases

| Case                                             | Placement block                                                                                                                  |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Retired / injured (past round)                   | `finalStanding` from `computeRetirementFinalStanding` — fixed. "Final place 14".                                                 |
| Injured this round with substitute (092 Phase 1) | Ranks last on the court this round; range computed with `projectedRank = courtSize`; forward retirement makes it final on close. |
| Eliminated in final round (670)                  | Fixed place from `getFinalRoundCourtConfig` ordering.                                                                            |
| Late joiner (096)                                | Same rules from the round they joined; `total` counts them.                                                                      |
| Roster shrinks (retirement elsewhere)            | `total` and court sizes change; range recomputed on next poll. Ranges may _widen_ slightly (e.g. a 5p bottom court becoming 4p). |
| `numRounds` changed by organizer (096)           | `t` changes; range recomputed.                                                                                                   |
| Tournament finished early (096)                  | Exact final place.                                                                                                               |

### Why not simulate every future result?

The **first** redistribution is projected from live standings (real `ladderRedistribute` / `verticalSeeding` / `processPreseedTransition`). Remaining rounds still have unknown results, so the ladder ±`(t−1)` bound and the next preseed bracket group are the tight envelope around that projected court. The range is honest given current position and can still move if remaining matches change the rank (the hint says so).

## Live Updates

- `getPlayerData({ token })` **query** + client `setInterval(refresh, 5_000)` while `active` / `waiting` / `injured` (scoreboard-speed; a teammate may save from another phone) and `!document.hidden`; **10_000** in `court_done` and terminal states; immediate refresh on `visibilitychange` / `focus`; manual **Refresh** button.
- **Pause polling** while any score input is focused, while a save is in flight, or `document.hidden` (app backgrounded, lock screen, another tab). Resume and refresh on blur / save completion / visibility.
- Change detection on the client: when `roundNumber` or `courtNumber` differs from the previous result → highlight animation on the NOW card, `document.title = "Court 2 · Beach Bash"`, `navigator.vibrate?.(200)`. When `current.matchNumber` advances after someone else saves, the hero swaps without a full-page flash.
- `ssr = false` like the court page (980 hydration lesson); `+page.server.ts` still resolves the token (404) and performs the self check-in write (097).

## Data Layer

### `src/lib/server/player-page-data.ts`

```typescript
export async function fetchPlayerPageData(token: string): Promise<PlayerPageData>;

type OrientedMatch = {
  matchNumber: number;
  matchIds: number[]; // per set, for savePlayerScore
  youOnTeam: "a" | "b" | null; // null on sit-out
  partnerName: string | null;
  opponentNames: string[];
  sets: { id: number; a: number | null; b: number | null }[]; // already oriented: a = left = YOU
  isCanceled: boolean;
  hasSubstitute: boolean;
  sitOut: boolean;
  run: number | null;
};

type PlayerPageData = {
  tournament: {
    id;
    name;
    status;
    currentRound;
    numRounds;
    formatType;
    checkInOpen: boolean;
    finishedEarly: boolean;
    physicalCourtCount;
  };
  player: {
    id;
    name;
    joinedRound;
    finalStanding;
    seedRank: number | null;
    seedPoints: number | null;
    retired: { round; reason; injured: boolean; replacedByName: string | null } | null;
  };
  state: PlayerRoundState; // see States
  movement: "up" | "down" | "same" | null;
  now: {
    court: {
      courtNumber;
      label;
      courtSize;
      rotationId;
      courtToken; // same stable token as the court QR (060); not linked from this page
      shift;
      totalShifts;
      wait: {
        beAtCourtAt: string | null; // ISO; null → "be at the court now"
        factsUpdatedAt: string; // ISO
      } | null;
      scoringLabel;
      isComplete;
      frozenAfterRound: number | null;
    } | null;
    current: OrientedMatch | null;
    parallel: OrientedMatch[]; // 5p/6p other game(s) in the current run — read-only on this page
    upcoming: OrientedMatch[];
    courtStandings: { rank; name; points; diff; isYou; tiedFactors; decidingFactor }[];
    roundProgress: { courtsDone: number; courtsTotal: number };
    nextHint: {
      courtNumber: number | null;
      group: "winners" | "losers" | null;
      direction: "up" | "down" | "same";
    } | null;
  };
  history: {
    round: number;
    closed: boolean;
    courtNumber: number;
    label: string | null;
    courtSize: number;
    rank: number | null;
    points: number | null; // ranking totals; null while the current-round court is still in progress
    diff: number | null;
    fromCourt: number | null;
    toCourt: number | null;
    movement: "up" | "down" | "same" | null;
    whyKey: string | null; // i18n key id for Movement copy; null until closeRound
    whyParams: Record<string, string | number> | null;
    manualAdjusted: boolean;
    matches: {
      matchNumber: number;
      partnerName: string | null;
      opponentNames: string[];
      solo: boolean;
      sitOut: boolean;
      sets: { a: number | null; b: number | null }[];
      diff: number | null;
      isCanceled: boolean;
      hasSubstitute: boolean;
    }[];
  }[];
  record: {
    seedRank: number | null;
    seedPoints: number | null;
    startedCourt: number | null;
    totalPoints: number; // ranking total (094 total_points contributions)
    totalDiff: number; // ranking diff
    matchesPlayed: number;
    usedAverages: boolean; // any 5p/6p or canceled round
  };
  placement: {
    current: number | null; // live overall position including current round (null only in `not_started`)
    total: number; // active players
    best: number;
    worst: number;
    isFinal: boolean;
    nextCourt: number | null; // projected from live rank
    minCourt: number | null;
    maxCourt: number | null;
    rankCanStillChange: boolean;
  };
};
```

Queries per request: player by token → tournament → all rotations of the tournament (needed for history, movement, progress) → matches of the current round (all courts — needed for live standings, `liveRoundResults`, round progress) → players of the tournament (names) → standings. `court.token` is read from the `court` table via `rotation.courtId` so a player-page save can refresh `getCourtData`.

`placement.current` comes from the shared standings computation (`standings-service.ts`, 095) **including the current round's live court standings**. `placement.best/worst/nextCourt` come from `reachableFinalPlaceRange` with `projectedRank` and `liveRoundResults`. `record` uses ranking totals (094). `history` is derived from the same rotations + matches already loaded (`playerMatchesView` per round that has finished games for this player, including the current round). No extra round-trip.

### `src/routes/player/[token]/player-data.remote.ts`

- `getPlayerData = query(v.object({ token }), fetchPlayerPageData)`.
- `savePlayerScore` / `savePlayerSetScore` = `form(...)` wrapping `$lib/server/save-score.ts` with the player-token roster check. Dice-roll persistence stays on the **court / close-round** path only — a player save must never roll dice; it reads `rotation.diceRolls` as-is and passes `useSnapshot` for closed rounds.

### Performance

64 players polling every 5 s ≈ 13 requests/s at peak, plus score writes. The **current place** requires the live standings computation, which loads every rotation and match of the tournament — that is the expensive part, and it is identical for every player of the same tournament. Therefore:

1. **Ship without the standings cache first** and measure. Not every player will keep the page open; polling pauses when backgrounded.
2. `fetchPlayerPageData` computes the tournament-wide pieces (standings, per-court completeness, current-round matches) once per request and derives the player-specific view from them — no per-player queries beyond the token lookup.
3. If Neon load is a problem after measuring, add a server-side in-memory cache of the tournament-wide pieces keyed by `(tournamentId, lastActivityAt)`. `lastActivityAt` is already bumped on every score save (`save-score.ts`) and every mutation in `tournament-actions.remote.ts`; 096/097 commands must do the same. The key changes exactly when the data changes, so there is no invalidation logic. Cache lives per serverless instance (Vercel) — cold instances just recompute.
4. Poll at 5 s while scoring, 10 s otherwise, paused while hidden or while a score field is focused.

Do **not** fall back to closed-round-only current place — live including this round is required.

## Security / Privacy

- Token: 128-bit random hex; same threat model as court tokens (060). Unknown token → 404 with a friendly message.
- Exposes: name, court, scores, standing — all already visible on the public standings page.
- Writes: (1) idempotent self check-in (097), organizer-reversible; (2) **first write only** of scores for **matches this player is in** on the current-round rotation. Sit-out / parallel games are court-page only. "Regenerate link" on the manage page (096) invalidates a leaked token and cuts off both reads and saves.
- Possessing a player token can save **unsaved matches this player is in**. Possessing a court token can save and **edit** every match on that court. Last write on the court page wins. That is the same threat model as today's court QR for the court surface, plus an optional per-player URL that cannot overwrite.

## Court page

`/court/[token]` remains a **player-facing** scoring URL. The organizer may print or show court QRs from the operations view exactly as today (060). Check-in and the player page are an optional second path, not a replacement.

- Operations view: **keep** `CourtQRCode` on court cards (stable `court.token`, 1045) plus the existing "Open court page" link.
- Player page: no link to `/court/...` (the personal page already has score entry). A player who only has a court QR never needs a player token.
- Check-in print sheet / QR modal (097), when used: personal URL. Court QRs stay on the operations view for organizers who prefer that flow.
- Closed-round copy on the court page: "This round is closed. Check with the organizer for your next court — or open your personal player page if you have one."
- Score UI becomes `ScoreEntry.svelte`; court-token `saveScore` / `saveSetScore` keep working and share `$lib/server/save-score.ts` with the player forms.
- Pause-on-focus polling (above) is applied here too. Pause while `document.hidden` as well.
- Court page **keeps Edit / Clear** after save (correction path for write-once player-page scores). 095 Open Question 1: anonymous vs organizer-only.
- Existing E2E that scores via `/court/[token]` stays the court-QR path; new player-page E2E covers the optional personal path. A mixed test saves on one surface and asserts the other updates (player save → court shows it; court edit → player shows it read-only).

## i18n Keys (new)

`player_title`, `player_round_of`, `player_now`, `player_court_now`, `player_physical_court`, `player_players_scoring` (`{size} players · {scoring}`), `player_shift_now`, `player_shift_wait` (`Be at court at {time}`), `player_shift_wait_now` (`Be at the court now`), `player_shift_next_now` (`Your shift is next — be at the court now`), `player_you`, `player_vs`, `player_sit_out`, `player_sit_out_now`, `player_on_court_now`, `player_also_on_court`, `player_up_next`, `player_waiting_scores_locked`, `player_canceled`, `player_substitute_note`, `player_court_standings`, `player_court_done`, `player_finished_rank`, `player_waiting_courts` (`{done} of {total}`), `player_next_appears`, `player_next_hint_up`, `player_next_hint_down`, `player_next_hint_same`, `player_next_hint_winners`, `player_next_hint_losers`, `player_frozen`, `player_eliminated`, `player_retired`, `player_retired_injury`, `player_replaced_by`, `player_final_place`, `player_finished_early`, `player_placement_heading`, `player_placement_current` (`Currently {place} of {total}`), `player_placement_best` (`Best achievable place: {place}`), `player_placement_safe` (`Safe place: {place}`), `player_placement_final`, `player_placement_can_still_change`, `player_not_started`, `player_not_started_registered`, `player_history`, `player_record`, `player_record_seed` (`Seed {rank} of {total}`), `player_record_seed_points`, `player_record_random` (`Random seed · started on Court {court}`), `player_record_totals` (`Points {points} · Diff {diff} · {matches} matches`), `player_record_averages_note`, `player_history_finished_rank`, `player_history_from_to`, `player_history_why_ladder_up`, `player_history_why_ladder_down`, `player_history_why_ladder_stay_top`, `player_history_why_ladder_stay_bottom`, `player_history_why_vertical`, `player_history_why_preseed_winners`, `player_history_why_preseed_losers`, `player_history_why_frozen`, `player_history_why_manual`, `player_history_why_joined`, `player_history_how_heading`, `player_history_how_random`, `player_history_how_preseed`, `player_history_sit_out`, `player_history_solo`, `player_history_canceled`, `player_history_sub`, `player_checkin_open_note`, `player_movement_up`, `player_movement_down`, `player_movement_same`, `player_last_updated`, `player_refresh`, `player_not_found`, `player_score_read_only_hint`, `err_score_already_saved`, `court_closed_see_organizer_or_player_page` (extends the current closed-round hint). Reuse existing `court_save_score` / validation keys inside `ScoreEntry.svelte` (court page keeps `court_update_score` for edits).

## Testing

### Unit (`src/lib/server/tournament-logic.test.ts`)

- `derivePlayerRoundState` — one case per state, including: injured-with-substitute in current round → `injured`, injured in a past round → `retired`; frozen court; eliminated in final; completed overrides everything; shift 2 not yet on a physical court → `waiting`.
- `movementFor(prevCourt, currentCourt)` → up/down/same/null.
- `nextHintFor(format, round, rank, courtNumber, courtCount, courtSize)` — ladder table above; Court 1 rank 1 → same; bottom court rank 4 → same; R1 random → null; preseed → winners/losers.
- `playerMatchesView(matches, playerId, courtSize)` — partner/opponents/sit-out extraction for 3p/4p/5p/6p; per-match diff with player's team on the left; best-of-3 sums set diffs; canceled → `diff: null`.
- `splitPlayerMatches` — 4p: match 1 complete → current is match 2, upcoming = [3], completed match is not in the return (history); 5p sit-out run → current.sitOut, parallel = open games of that run (no score fields); all of the player's matches complete → current null.
- `orientMatchForPlayer(match, playerId)` — you on team B → left/right swapped; sit-out → `youOnTeam: null`.
- `waitClock(factsUpdatedAt, remainingMs, now, factor)` — returns ISO clock; past → null ("now"); factor 0.75 shortens remaining.
- `movementWhy(format, round, rank, courtNumber, courtCount, …)` — one key per row of the Movement copy table.
- `placeForCourtRank(courtSizes, k, r)` — canonical `[4,4,4,4]`, non-standard bottom `[4,4,4,5]` (Court 4 rank 5 → 17), manual layout `[4,3,5,4]`.
- `reachableFinalPlaceRange` — every row of both example tables above, plus:
  - live rank 2 vs 3 on Court 3 in round 2 of 16p: up → 1st–12th, down → 9th–16th.
  - random seed R1 with live rank 1 (partial scores) → nextCourt 1, then ±(t−1).
  - random seed 5p bottom court live rank 5 → stays on bottom court.
  - random seed Court 1 live rank 1 with `t = 3` → `[1, 3]`; bottom court rank 4 with `t = 1` → bottom only.
  - preseed live rank 2 on Court 3 in R1 → winners' half (1st–8th) even before other courts finish.
  - preseed 20p (083): Court 5 frozen → `[5, 5]`.
  - `t = 0` + live rank → `best === worst ===` that place.
  - no scores on player's court → unconstrained bound, `nextCourt === null`.
  - `numRounds` reduced → range shrinks accordingly.

### Unit (`src/lib/server/save-score.test.ts`)

- Player token on the rotation can save a match **they are in** when it has no score; token of a player on another court is rejected; unknown token 404.
- Sit-out player on a 5p rotation **cannot** save a parallel match.
- Second save of the same match via player token → `err_score_already_saved`; court token can still overwrite.
- Left/right mapping: you on team B, submitted 21–18 stores `teamAScore=18, teamBScore=21`.
- Closed round / canceled match / deciding set too early — same errors as court `saveScore`.

### E2E (`e2e/player-page.spec.ts`)

1. Create 16p → open a player's URL anonymously → hero shows "NOW · Court X", the first matchup with score inputs, and **Up next** for the other two games (compact inputs). No "Open court page" control. Placement reads "Currently ?th of 16", "Best achievable place: 1st", "Safe place: 16th". No range bar.
2. Save the first match from the player page → "Saved"; History lists that game; NOW is match 2; no Edit on the saved row; standings page row matches; Best/Safe may narrow; hint "Remaining matches can still change this." Saving the same match again is rejected.
3. Open a second player on the same court (anonymous) → they see the saved score within one poll (or Refresh), read-only. Saving match 2 from the second phone updates the first phone's History.
4. Score all matches on that court from player pages → state `court_done`; inputs gone; range uses the now-stable rank; **Likely next** shown.
5. Score all courts, close round → within one poll interval (use the Refresh button in the test) the page shows the new court as NOW and a movement arrow; history Round 1 card has three game rows (partner names, scores, diffs) plus why/movement; record strip ranking totals match; "Currently" matches the player's row on the standings page.
   5b. In the final round with the court done → placement shows a single "Final place N" equal to the standings page.
6. Set a court label on the manage page → label appears on the player page.
7. Swap this player with another (096) → court number / matchup change without reload.
8. Retire the player → `retired` state with final place.
9. Complete the tournament → final place shown; standings link works.
10. Unknown token → 404 page, no stack trace.
11. Check-in banner visible before close check-in, gone after (097).
12. Save a score on `/court/[token]` (court QR path) → the player page picks it up read-only. Save from the player page → the court page picks it up. Operations view still shows the court QR. Edit on the court page after a player save updates the player page; the player still cannot edit.
13. 5p sit-out: sitting player's page has no score fields for the parallel game; court page can save it.
14. Waiting shift: page shows a clock time ("Be at court at …"), not a minute count. Polling stops while the tab is hidden and resumes on focus.

## Decisions (from review)

1. **Player page writes only matches the player is in.** Sit-out / parallel games are scored on the court page (which can enter every game on that court).
2. **Poll** 5 s while the court is active / waiting / injured, 10 s when the court is done or the state is terminal. Start and stop with page visibility (`document.hidden`).
3. **"Likely next" is shown.** If the organizer changes a tie-break mid-tournament, they communicate that; the hint is not hidden to avoid arguments.
4. **Ship live current place without the standings cache first**; add `(tournamentId, lastActivityAt)` if measured load requires it.
5. **History = every finished game**, including the current round. Hero = current game + upcoming. Second person ("You finished 2nd").
6. **No range bar.** Text only: current place, **Best achievable place**, **Safe place**. Not shown on the standings page.
7. **Jumping `nextCourt` from incomplete other courts is a feature.**
8. **Record strip shows ranking totals** (5p/6p averages / ÷3), not raw rally sums. Per-game history rows still show actual scores.
9. **Compact score inputs on upcoming matches.** Play-out-of-order is supported.
10. **Write-once.** Players cannot edit after a score exists; they talk to the organizer, who uses the court page.
11. **Wait clock** is a conservative clock time ("Be at court at 10:15"), not a minute count. See Open Question 1.

## Open Questions

1. **Wait-clock conservatism.** Proposed: `beAtCourtAt = factsUpdatedAt + 0.75 × remainingEstimate`, displayed in the **device's local timezone**, never in the past. Alternatives: a fixed buffer (subtract 5 minutes), or remaining of the fastest still-playing court. Is 0.75 / local timezone OK?

Answer: Yes I guess, that sounds good. We have to collect experience with this formula and adjust/refine in a later version.

2. **"Safe place" wording.** Proposed label for the worst still-reachable final place (the review note said "save place"). OK, or "Worst still possible" / "Guaranteed no worse than"?

Answer: Exactly, it should be clear what each means. For the lower end, it's the place that the player is getting regardless of, if he basically stops playing and gets no more points. The upper bound is the place he might reach if he is promoted the current and every following round and then the highest place on the last round. If we are on the last round, we can dial in closer. For the first game of a round he can reach the top place of that court/bracket and the lowest place. After having played one game, two games, there might be places that are theoretically not achievable anymore even if the player wins 21:0.

3. **Current-round history card.** Proposed: finished games of this round sit in a top history card (rank/movement/why filled in after close). Alternative: a flat list of games under History with no per-round header until close.

Answer: We don't need a current round history card, just move the games after inserting results to the overall history. Which always has the latest games on top. Keep a label for the group and also the round each game belonged to. You might want to highlight past games of the current round, but only subtle.

## Related Specs

- [095_org-player-experience-index.md](./095_org-player-experience-index.md)
- [097_player-check-in.md](./097_player-check-in.md) — optional personal QRs, self check-in, banner
- [096_tournament-management-page.md](./096_tournament-management-page.md) — moves, late joins, reopen; pre-play remove/swap/move; court QRs stay on operations
- [099_tournament-setup-and-start.md](./099_tournament-setup-and-start.md) — `not_started` state; start does not require check-in
- [060_court-operations.md](./060_court-operations.md) — court page and court QRs remain; `ScoreEntry` extract shared with this page
- [660_virtual-court-scheduling.md](./660_virtual-court-scheduling.md) — shift and wait model
- [087_preseed-frozen-courts.md](./087_preseed-frozen-courts.md), [670_player-retirement.md](./670_player-retirement.md) — frozen / eliminated / retired placement rules
- [070_scoring-and-standings.md](./070_scoring-and-standings.md), [080_promotion-relegation.md](./080_promotion-relegation.md) — points, diff, and the movement copy
- [094_configurable-tie-breaking.md](./094_configurable-tie-breaking.md) — snapshots used for closed-round headers
- [1020_live-query-timeout.md](./archive/1020_live-query-timeout.md) — polling pattern

## Implementation Files

- `src/routes/player/[token]/+page.svelte`, `+page.server.ts` (404 + self check-in), `+page.ts` (`ssr = false`), `player-data.remote.ts`
- `src/lib/server/player-page-data.ts`
- `src/lib/server/save-score.ts` — shared write + validation for court-token and player-token saves
- `src/lib/server/standings-service.ts` (extracted from `standings/standings-data.remote.ts`, 095)
- `src/lib/tournament-logic.ts` — `derivePlayerRoundState`, `movementFor`, `nextHintFor`, `playerMatchesView`, `splitPlayerMatches`, `orientMatchForPlayer`, `movementWhy`, `placeForCourtRank`, `reachableFinalPlaceRange`, `waitClock`
- `src/lib/components/player/PlacementCard.svelte` (current / best / safe text; no bar)
- `src/lib/components/player/RecordStrip.svelte`, `HistoryList.svelte`, `NowCard.svelte`
- `src/lib/components/ScoreEntry.svelte` — extracted from `src/routes/court/[token]/+page.svelte`
- `src/routes/court/[token]/+page.svelte` — uses `ScoreEntry`; closed-round hint; pause-on-focus
- `src/routes/tournament/[id]/+page.svelte` — keep `CourtQRCode`; add Check-in / Manage links (095)
- `src/routes/court/[token]/scores.remote.ts` — thin wrapper around `save-score.ts`
- `messages/*.json`, `e2e/player-page.spec.ts`
