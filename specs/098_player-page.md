# Player Page

## Status

**PROPOSED — DRAFT FOR REVIEW.** Part of [095_org-player-experience-index.md](./095_org-player-experience-index.md). Depends on `player.token` from the shared migration `0016`; the QR codes that lead here are produced by [097_player-check-in.md](./097_player-check-in.md).

## Problem

Players have no personal view of the tournament. The court QR (060) is per court and per round: after every close round the whole field walks to the organizer to ask "where am I now, when do I play, with whom?". With virtual courts and shifts (660) the question is also "how long is my break?". The answer exists in the database the moment `closeRound` runs — it just has no screen.

## Goals

1. Public, mobile-first page **`/player/[token]`**. One URL per player for the whole tournament — bookmark it, add it to the home screen.
2. Always answers: **Which court? Which physical court? When (shift / wait)? With and against whom? How am I doing?**
3. Always shows **placement**: where the player is currently placed overall, and the **best and worst final place still theoretically achievable** — see [Placement](#placement).
4. **Updates itself** after close round, retirement, manual moves (096), round-1 rebuilds — via polling, no reload.
5. Links to the court page for score entry. Scoring stays on the court page (060); the player page never writes scores.
6. Covers every player state: check-in open, active, court done / waiting, frozen bracket, eliminated in final, retired / injured, completed, unknown token.

## Non-Goals

- Score entry on the player page (Open Question 1).
- Push notifications / service worker.
- Showing other players' personal links.

## States

`derivePlayerRoundState()` (pure, unit-tested) maps `(tournament, player, rotations, matches)` to one of:

| State         | Condition                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------ |
| `completed`   | `tournament.status === 'completed'`                                                              |
| `retired`     | `player.retiredAt` set and (`retiredRound < currentRound` or no rotation contains the player)    |
| `injured`     | `player.injuredAt` set and the current-round rotation still contains the player (Phase 1 of 092) |
| `frozen`      | Player's current court is frozen (087) — bracket finished early                                  |
| `eliminated`  | Final round; player is active but not on any rotation (670 final-round elimination)              |
| `court_done`  | Player's court has all matches complete, round not yet closed                                    |
| `active`      | Player on a current-round rotation, matches open                                                 |
| `not_started` | `currentRound === 0` (defensive; not produced by today's creation flow)                          |

Plus two orthogonal flags: `checkInOpen` (097 banner) and `movement: 'up' | 'down' | 'same' | null` (court number vs. previous round).

## Layout

Header: tournament name · **player name** · "Round 2 of 4". Language switcher (page is locale-free via QR, so the switcher matters here).

### `active`

```
┌────────────────────────────────────────────────┐
│ ROUND 2 OF 4                                    │
│                                                 │
│   Court 3            ▲ up from Court 4          │
│   Physical court: "Beach B"                     │
│   4 players · single set to 21 · win by 2       │
│   Shift 1 of 2 · playing now                    │
│                                                 │
│ Your matches                                    │
│  1  You + Ben      vs  Carla + Dan      21 : 18 │
│  2  You + Carla    vs  Ben + Dan          – : – │
│  3  You + Dan      vs  Ben + Carla        – : – │
│                                                 │
│ Court standings                                 │
│  1. Ben 21 (+3)   2. You 21 (+3)   3. Carla …   │
│                                                 │
│ Placement                                       │
│  Currently 7th of 16                            │
│  Still possible: 5th – 16th                     │
│  1 ├────▓▓▓▓▓▓●▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓┤ 16              │
│                                                 │
│ [ Open court page → enter scores ]              │
└────────────────────────────────────────────────┘
```

The **Placement** block is present in every state (see [Placement](#placement)); in terminal states it collapses to a single final place.

- Court number is the largest element on the page; physical label (`court.label`) directly under it when set.
- Shift 2+: "Shift 2 of 2 · est. wait ~45 min" using `getShiftForCourt` and the wait estimate from `tournament-data.remote.ts` (660). Hidden when virtual = physical courts.
- 3p court: solo matches labelled "You vs Ben + Carla". 5p/6p: only the player's own games listed, plus "You sit out game 3" rows; run grouping shown as in the court page.
- Injured with substitute (Phase 1 of 092): the row shows "SUBST" for the injured player and a notice.
- Canceled matches: "canceled — averaged".
- Court standings: same `resolveRotationStandings` output as the court page; the player's own row is highlighted; tie-break icons reused (`TieBreakFactorIcons`).
- **Open court page**: link to `/court/[court.token]` (stable court token, not the rotation token — 1045).

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
│  Currently 6th of 16 · Still possible: 5th – 8th│
└────────────────────────────────────────────────┘
```

Once the court is done the achievable range tightens (rank on the court is now known — see [Placement](#placement)).

The **"Likely next"** hint is shown only when it is rule-deterministic from the player's own rank (Open Question 3):

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

### `completed`

Big final place ("**3rd of 16**" with medal for top 3), "Finished early after round 2" note when `finishedEarly` (096), history, link to the standings page.

### Banners (any state)

- `checkInOpen`: "Check-in still open — your court may change until the organizer closes check-in." (097)
- Poll failure: small "Last updated 12:04 · retry" line; the page never blanks out on a failed refresh.

### Below the main card

- **History**: one row per closed round — round, court (+label), court size, rank, points, diff — from `standingsSnapshot` (094).

## Placement

Every state shows three numbers: **current place**, **best achievable final place**, **worst achievable final place**. The range is what a player can still reach _by results alone_ from now until the final round closes, given the format's movement rules. It is recomputed on every poll, so retirements, manual moves (096) or a changed round count (096) are reflected automatically rather than predicted.

```
Placement
 Currently 7th of 16
 Still possible: 5th – 16th
 1 ├────▓▓▓▓▓▓●▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓┤ 16
```

- **Current place**: the player's position in the live overall standings — the same ordering as the standings page (court position of the current round first, then the configured tie-break factors; 070 / 090 / 094). Label: "Currently 7th of 16" where 16 = active players (retirees are excluded from `total` but keep their fixed final place).
- **Range bar**: one segment per place; reachable range filled, current place marked. Purely visual, no interaction.
- **Terminal states** (`completed`, `retired`, `eliminated`, `frozen` with court done): best = worst = final place; the block reads "**Final place 5**" and the bar is a single marker.
- Copy always says "still possible", never "will finish".

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
	courtSizes: readonly number[]; // current layout
	courtRankIfDone: number | null; // rank on current court once all its matches are complete
	groupResultsIfDone: CourtResult[] | null; // preseed: results of the whole bracket group once complete
	frozenCourtNumbers: ReadonlySet<number>;
}): { best: number; worst: number; minCourt: number; maxCourt: number };
```

Let `t = N − r` be the number of redistributions still to come. When `t = 0` (final round) the range is the current court: `[k, k]`, tightened to the exact place once `courtRankIfDone` is known.

#### Random seed (080, `ladderRedistribute` / `verticalSeeding`)

| Situation                         | Rule                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Round ≥ 2, court not done         | Each ladder step moves at most one court: `[max(1, k − t), min(C, k + t)]`.                                                                                                                                                                                                                                                                                                                                                    |
| Round ≥ 2, court done with rank ρ | First step is determined by `ladderRedistribute`: ρ ≤ 2 → `k − 1` (Court 1 stays); ρ ≥ 3 → `k + 1` (bottom court stays, incl. ranks 3..size on a 5p/6p bottom court). Then `t − 1` free steps around that court.                                                                                                                                                                                                               |
| Round 1, court not done           | Vertical seeding can send anyone anywhere: `[1, C]`.                                                                                                                                                                                                                                                                                                                                                                           |
| Round 1, court done with rank ρ   | Vertical seeding places the rank-ρ **tier** into flattened slots `(S_{ρ−1}, S_ρ]` where `S_ρ` = number of players with rank ≤ ρ across all courts (all courts contribute to ranks 1–4 except a 3p court; only a 5p/6p bottom court contributes ranks 5–6). Map the first and last slot to courts via cumulative `courtSizes` → `[k_lo, k_hi]`, then `t − 1` free ladder steps: `[max(1, k_lo − (t−1)), min(C, k_hi + (t−1))]`. |

The worst case matches the retirement formula already in 670 (`worstCourt = min(currentCourt + remainingRounds, totalCourts)`); the best case is its mirror image.

**Example — 16 players, 4 courts, 4 rounds:**

| Round | Court | Court done? | Reachable courts                            | Still possible |
| ----- | ----- | ----------- | ------------------------------------------- | -------------- |
| 1     | 3     | no          | 1–4                                         | 1st – 16th     |
| 1     | 3     | rank 1      | tier 1 = slots 1–4 → Court 1; then ±2 → 1–3 | 1st – 12th     |
| 2     | 3     | no          | 1–4 (t = 2)                                 | 1st – 16th     |
| 3     | 3     | no          | 2–4 (t = 1)                                 | 5th – 16th     |
| 3     | 3     | rank 2      | Court 2, t − 1 = 0 → 2                      | 5th – 8th      |
| 4     | 2     | no          | 2                                           | 5th – 8th      |
| 4     | 2     | rank 3      | 2, exact                                    | Final place 7  |

#### Preseed (080 / 087 / 091, `getBracketGroups`, `processPreseedTransition`)

A player's future is bounded by their **bracket group**: the set of courts that still get mixed together. `getBracketGroups(C, r − 1)` returns those groups for the current round; the group containing `k` spans courts `[g_lo, g_hi]`.

| Situation                                                            | Rule                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Court not frozen, group not fully done                               | `[g_lo, g_hi]` — the group's full place range (this is the same range 670 uses for retirees' worst place).                                                                                                                                                                                                                              |
| Group fully done (every court in the group has all matches complete) | Simulate the group's split with the real `processPreseedTransition` on the completed results (dice rolls are persisted per rotation, so the result is stable). The player's next court `k'` is now known; recurse with `getBracketGroups(C, r)` and `k'` to get the next group's range. In the final round this yields the exact place. |
| Court done but group not done                                        | No refinement beyond the group range (which sub-group a player lands in depends on other courts' results through origin mixing). _Optional (OQ 7):_ for balanced groups of 4p courts, rank ≤ 2 ⇒ winners' sub-group and rank ≥ 3 ⇒ losers' sub-group is deterministic and could be used.                                                |
| Court frozen (087)                                                   | `[k, k]`; exact once the court is done.                                                                                                                                                                                                                                                                                                 |

**Example — 16 players, 4 courts, 3 rounds (082):**

| Round | Court | Group state                         | Reachable courts     | Still possible |
| ----- | ----- | ----------------------------------- | -------------------- | -------------- |
| 1     | 3     | running                             | 1–4                  | 1st – 16th     |
| 1     | 3     | all 4 courts done, player → Court 2 | 1–2 (winners' group) | 1st – 8th      |
| 2     | 2     | running                             | 1–2                  | 1st – 8th      |
| 2     | 2     | both courts done, player → Court 2  | 2 (L(W))             | 5th – 8th      |
| 3     | 2     | running                             | 2                    | 5th – 8th      |
| 3     | 2     | done, rank 2                        | exact                | Final place 6  |

**Example — 20 players (083), Court 5 frozen after round 2:** a player on Court 5 in round 2 shows 17th – 20th while playing and the exact place once the court is done; nothing changes for them in rounds 3–4.

### Special cases

| Case                                             | Placement block                                                                                                                    |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Retired / injured (past round)                   | `finalStanding` from `computeRetirementFinalStanding` — fixed. "Final place 14".                                                   |
| Injured this round with substitute (092 Phase 1) | Ranks last on the court this round; range computed with `courtRankIfDone = courtSize`; forward retirement makes it final on close. |
| Eliminated in final round (670)                  | Fixed place from `getFinalRoundCourtConfig` ordering.                                                                              |
| Late joiner (096)                                | Same rules from the round they joined; `total` counts them.                                                                        |
| Roster shrinks (retirement elsewhere)            | `total` and court sizes change; range recomputed on next poll. Ranges may _widen_ slightly (e.g. a 5p bottom court becoming 4p).   |
| `numRounds` changed by organizer (096)           | `t` changes; range recomputed.                                                                                                     |
| Tournament finished early (096)                  | Exact final place.                                                                                                                 |

### Why not simulate everything?

A full enumeration over all possible results of all courts is unnecessary: in the ladder the per-step movement bound is exact, and in preseed the bracket group _is_ the reachable set by construction. Both bounds are tight for the "by results alone" definition — every place in the range is attainable by some sequence of results — so the numbers players see are honest.

## Live Updates

- `getPlayerData({ token })` **query** + client `setInterval(refresh, 10_000)` while the tournament is active and `!document.hidden`; immediate refresh on `visibilitychange` / `focus`; manual **Refresh** button.
- Change detection on the client: when `roundNumber` or `courtNumber` differs from the previous result → highlight animation on the court card, `document.title = "Court 2 · Beach Bash"`, `navigator.vibrate?.(200)`.
- `ssr = false` like the court page (980 hydration lesson); `+page.server.ts` still resolves the token (404) and performs the self check-in write (097).

## Data Layer

### `src/lib/server/player-page-data.ts`

```typescript
export async function fetchPlayerPageData(token: string): Promise<PlayerPageData>;

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
		retired: { round; reason; injured: boolean; replacedByName: string | null } | null;
	};
	state: PlayerRoundState; // see States
	movement: 'up' | 'down' | 'same' | null;
	now: {
		court: {
			courtNumber;
			label;
			courtSize;
			courtToken; // stable court.token for the link
			shift;
			totalShifts;
			waitMinutes;
			waitLabel;
			scoringLabel;
			isComplete;
			frozenAfterRound: number | null;
		} | null;
		matches: {
			matchNumber;
			partnerName: string | null;
			opponentNames: string[];
			sets: { a: number | null; b: number | null }[];
			isCanceled;
			hasSubstitute;
			sitOut: boolean;
			run: number | null;
		}[];
		courtStandings: { rank; name; points; diff; isYou; tiedFactors; decidingFactor }[];
		roundProgress: { courtsDone: number; courtsTotal: number };
		nextHint: {
			courtNumber: number | null;
			group: 'winners' | 'losers' | null;
			direction: 'up' | 'down' | 'same';
		} | null;
	};
	history: { round; courtNumber; label; courtSize; rank; points; diff }[];
	placement: {
		current: number | null; // live overall position (null only in `not_started`)
		total: number; // active players
		best: number; // best achievable final place
		worst: number; // worst achievable final place
		isFinal: boolean; // best === worst and nothing can change it
		minCourt: number | null; // for debugging / tests
		maxCourt: number | null;
	};
};
```

Queries per request: player by token → tournament → all rotations of the tournament (needed for history, movement, progress, bracket-group completeness) → matches of the current round (all courts — needed for `groupResultsIfDone` and round progress) → players of the tournament (names) → standings (see below). `court.token` is read from the `court` table via `rotation.courtId`.

`placement.current` comes from the shared standings computation (`standings-service.ts`, 095); `placement.best/worst` from `reachableFinalPlaceRange` fed with the current round's rotations, matches and frozen courts.

### `src/routes/player/[token]/player-data.remote.ts`

`getPlayerData = query(v.object({ token }), fetchPlayerPageData)`. Read-only; no dice-roll persistence (unlike the court page — the player page must never mutate standings state, so it passes `useSnapshot` for closed rounds and reads `rotation.diceRolls` as-is for the current one).

### Performance

64 players polling every 10 s ≈ 6–7 requests/s at peak. The **current place** requires the live standings computation, which loads every rotation and match of the tournament — that is the expensive part, and it is identical for every player of the same tournament. Therefore:

1. `fetchPlayerPageData` computes the tournament-wide pieces (standings, per-court completeness, current-round matches) once per request and derives the player-specific view from them — no per-player queries beyond the token lookup.
2. Server-side in-memory cache of the tournament-wide pieces keyed by `(tournamentId, lastActivityAt)`. `lastActivityAt` is already bumped on every score save (`scores.remote.ts`) and every mutation in `tournament-actions.remote.ts`; 096/097 commands must do the same. The key changes exactly when the data changes, so there is no invalidation logic. Cache lives per serverless instance (Vercel) — cold instances just recompute.
3. Poll at 10 s, paused while hidden.

If Neon load is still a concern after measuring, fall back to computing `placement.current` from closed rounds' snapshots only (label "after round N−1") — but the requirement is live, so this is a last resort, not the default.

## Security / Privacy

- Token: 128-bit random hex; same threat model as court tokens (060). Unknown token → 404 with a friendly message.
- Exposes: name, court, scores, standing — all already visible on the public standings page.
- The only write is the self check-in (097), idempotent and organizer-reversible. "Regenerate link" on the manage page (096) invalidates a shared token.

## Court Page Tweak (060)

The closed-round text "Check with organizer for your next court." becomes "Your next court is on your personal player page — or ask the organizer." No token exchange between the pages (the court page cannot know who is looking at it).

## i18n Keys (new)

`player_title`, `player_round_of`, `player_court_now`, `player_physical_court`, `player_players_scoring` (`{size} players · {scoring}`), `player_shift_now`, `player_shift_wait`, `player_your_matches`, `player_you`, `player_vs`, `player_sit_out`, `player_canceled`, `player_substitute_note`, `player_court_standings`, `player_open_court`, `player_court_done`, `player_finished_rank`, `player_waiting_courts` (`{done} of {total}`), `player_next_appears`, `player_next_hint_up`, `player_next_hint_down`, `player_next_hint_same`, `player_next_hint_winners`, `player_next_hint_losers`, `player_frozen`, `player_eliminated`, `player_retired`, `player_retired_injury`, `player_replaced_by`, `player_final_place`, `player_finished_early`, `player_placement_heading`, `player_placement_current` (`Currently {place} of {total}`), `player_placement_range` (`Still possible: {best} – {worst}`), `player_placement_final`, `player_placement_bar_label` (a11y), `player_history`, `player_checkin_open_note`, `player_movement_up`, `player_movement_down`, `player_movement_same`, `player_last_updated`, `player_refresh`, `player_not_found`, `court_closed_see_player_page` (replaces the current closed-round hint).

## Testing

### Unit (`src/lib/server/tournament-logic.test.ts`)

- `derivePlayerRoundState` — one case per state, including: injured-with-substitute in current round → `injured`, injured in a past round → `retired`; frozen court; eliminated in final; completed overrides everything.
- `movementFor(prevCourt, currentCourt)` → up/down/same/null.
- `nextHintFor(format, round, rank, courtNumber, courtCount, courtSize)` — ladder table above; Court 1 rank 1 → same; bottom court rank 4 → same; R1 random → null; preseed → winners/losers.
- `playerMatchesView(matches, playerId, courtSize)` — partner/opponents/sit-out extraction for 3p/4p/5p/6p.
- `placeForCourtRank(courtSizes, k, r)` — canonical `[4,4,4,4]`, non-standard bottom `[4,4,4,5]` (Court 4 rank 5 → 17), manual layout `[4,3,5,4]`.
- `reachableFinalPlaceRange` — every row of both example tables above, plus:
  - random seed R1 court done rank 4 on 17 players `[4,4,4,5]`: tier 4 = slots 13–16 → Court 4; then ±(t−1).
  - random seed 5p bottom court rank 5 → stays on bottom court.
  - random seed Court 1 rank 1 with `t = 3` → `[1, 3]`; bottom court rank 4 with `t = 1` → bottom only.
  - preseed 20p (083): Court 5 frozen → `[5, 5]`; player on Court 2 in R3 → winners' sub-group range from `getBracketGroups(5, 2)`.
  - preseed group fully done → simulated split equals the actual `closeRound` assignment (property test against `processPreseedTransition` with fixed dice).
  - `t = 0` + court done → `best === worst === finalStanding` that `computeFinalStandingMap` produces (consistency test).
  - `numRounds` reduced → range shrinks accordingly.
- Tightness spot-check: for 16p random seed R3 Court 3, enumerate all rank combinations of the remaining rounds and assert the attained places equal the computed range.

### E2E (`e2e/player-page.spec.ts`)

1. Create 16p → open a player's URL anonymously → shows "Round 1 of N", Court X, "Open court page" links to the stable court token URL; placement reads "Currently ?th of 16 · Still possible: 1st – 16th".
2. Score all matches on that court → state `court_done`, "Waiting for other courts (1 of 4 done)"; placement range narrows (rank known).
3. Score all courts, close round → within one poll interval (use the Refresh button in the test) the page shows the new court and a movement arrow; history has one row; "Currently" matches the player's row on the standings page.
   3b. In the final round with the court done → placement shows a single "Final place N" equal to the standings page.
4. Set a court label on the manage page → label appears on the player page.
5. Swap this player with another (096) → court number changes without reload.
6. Retire the player → `retired` state with final place.
7. Complete the tournament → final place shown; standings link works.
8. Unknown token → 404 page, no stack trace.
9. Check-in banner visible before close check-in, gone after (097).

## Open Questions

1. **Score entry from the player page?** Proposed: no — one scoring surface (court page), one link away. Revisit if players ask for it.
2. **Poll interval**: 10 s (proposed) vs. 5 s like the court/tournament pages. 10 s halves the load for the largest page population.
3. **"Likely next" hint**: include (proposed, rule-based only) or drop to avoid arguments when the organizer's tie-break changes it?
4. **Current place is live** (required) — the `(tournamentId, lastActivityAt)` cache is the proposed way to make that cheap. OK to ship without the cache first and measure?
5. **History detail**: rank/points/diff per round (proposed) vs. also listing each match result.
6. **Tone**: second person ("You finished 2nd") — proposed; the standings page is third person. Fine for a personal page?
7. **Preseed refinement when only the player's court is done**: skip (proposed — always correct, sometimes wider than necessary) or add the balanced-group shortcut (rank ≤ 2 ⇒ winners' sub-group)?
8. **Range bar**: keep the visual bar (proposed) or text only? On 64-player tournaments the bar has 64 segments — still readable at phone width as a plain gradient, but worth a look.
9. Should the range also be shown on the **standings page** per row (organizer/spectator view)? Cheap once the function exists; proposed as a follow-up, not part of this spec.

## Related Specs

- [095_org-player-experience-index.md](./095_org-player-experience-index.md)
- [097_player-check-in.md](./097_player-check-in.md) — QR codes, self check-in, banner
- [096_tournament-management-page.md](./096_tournament-management-page.md) — moves and late joins reflected here
- [060_court-operations.md](./060_court-operations.md) — court page the player links to; closed-round hint text
- [660_virtual-court-scheduling.md](./660_virtual-court-scheduling.md) — shift and wait model
- [087_preseed-frozen-courts.md](./087_preseed-frozen-courts.md), [670_player-retirement.md](./670_player-retirement.md) — frozen / eliminated / retired placement rules
- [094_configurable-tie-breaking.md](./094_configurable-tie-breaking.md) — snapshots used for history
- [1020_live-query-timeout.md](./archive/1020_live-query-timeout.md) — polling pattern

## Implementation Files

- `src/routes/player/[token]/+page.svelte`, `+page.server.ts` (404 + self check-in), `+page.ts` (`ssr = false`), `player-data.remote.ts`
- `src/lib/server/player-page-data.ts`
- `src/lib/server/standings-service.ts` (extracted from `standings/standings-data.remote.ts`, 095)
- `src/lib/tournament-logic.ts` — `derivePlayerRoundState`, `movementFor`, `nextHintFor`, `playerMatchesView`, `placeForCourtRank`, `reachableFinalPlaceRange`
- `src/lib/components/player/PlacementCard.svelte` (numbers + range bar)
- `src/lib/components/player/NowCard.svelte`, `MatchList.svelte`, `HistoryTable.svelte`
- `src/routes/court/[token]/+page.svelte` — closed-round hint text
- `messages/*.json`, `e2e/player-page.spec.ts`
