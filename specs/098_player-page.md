# Player Page

## Status

**PROPOSED — DRAFT FOR REVIEW.** Part of [095_org-player-experience-index.md](./095_org-player-experience-index.md). Depends on `player.token` from the shared migration `0016`; the QR codes that lead here are produced by [097_player-check-in.md](./097_player-check-in.md).

## Problem

Players have no personal view of the tournament. The court QR (060) is per court and per round: after every close round the whole field walks to the organizer to ask "where am I now, when do I play, with whom?". With virtual courts and shifts (660) the question is also "how long is my break?". The answer exists in the database the moment `closeRound` runs — it just has no screen.

## Goals

1. Public, mobile-first page **`/player/[token]`**. One URL per player for the whole tournament — bookmark it, add it to the home screen.
2. Always answers: **Which court? Which physical court? When (shift / wait)? With and against whom? How am I doing?**
3. **Updates itself** after close round, retirement, manual moves (096), round-1 rebuilds — via polling, no reload.
4. Links to the court page for score entry. Scoring stays on the court page (060); the player page never writes scores.
5. Covers every player state: check-in open, active, court done / waiting, frozen bracket, eliminated in final, retired / injured, completed, unknown token.

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
│ [ Open court page → enter scores ]              │
└────────────────────────────────────────────────┘
```

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
└────────────────────────────────────────────────┘
```

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
- **Overall**: "Currently 7th of 16" from the standings computation (`standings-service.ts`, 095). See Performance.

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
	overall: { position: number; total: number } | null;
};
```

Queries per request: player by token → tournament → all rotations of the tournament (needed for history, movement, progress) → matches of the current rotation → players of the tournament (names) → standings (see below). `court.token` is read from the `court` table via `rotation.courtId`.

### `src/routes/player/[token]/player-data.remote.ts`

`getPlayerData = query(v.object({ token }), fetchPlayerPageData)`. Read-only; no dice-roll persistence (unlike the court page — the player page must never mutate standings state, so it passes `useSnapshot` for closed rounds and reads `rotation.diceRolls` as-is for the current one).

### Performance

64 players polling every 10 s ≈ 6–7 requests/s at peak, each doing ~6 queries. Acceptable on Neon serverless for v1, but the **overall position** reuses the standings computation, which loads every rotation and match. Mitigation, in order of preference:

1. Compute `overall` only from **closed rounds' snapshots** (cheap) and label it "after round N−1" — proposed default.
2. If live overall is wanted (Open Question 4): server-side in-memory cache keyed by `(tournamentId, lastActivityAt)` — `lastActivityAt` is bumped on every score save and mutation, so it is a correct cache key with zero invalidation logic.

## Security / Privacy

- Token: 128-bit random hex; same threat model as court tokens (060). Unknown token → 404 with a friendly message.
- Exposes: name, court, scores, standing — all already visible on the public standings page.
- The only write is the self check-in (097), idempotent and organizer-reversible. "Regenerate link" on the manage page (096) invalidates a shared token.

## Court Page Tweak (060)

The closed-round text "Check with organizer for your next court." becomes "Your next court is on your personal player page — or ask the organizer." No token exchange between the pages (the court page cannot know who is looking at it).

## i18n Keys (new)

`player_title`, `player_round_of`, `player_court_now`, `player_physical_court`, `player_players_scoring` (`{size} players · {scoring}`), `player_shift_now`, `player_shift_wait`, `player_your_matches`, `player_you`, `player_vs`, `player_sit_out`, `player_canceled`, `player_substitute_note`, `player_court_standings`, `player_open_court`, `player_court_done`, `player_finished_rank`, `player_waiting_courts` (`{done} of {total}`), `player_next_appears`, `player_next_hint_up`, `player_next_hint_down`, `player_next_hint_same`, `player_next_hint_winners`, `player_next_hint_losers`, `player_frozen`, `player_eliminated`, `player_retired`, `player_retired_injury`, `player_replaced_by`, `player_final_place`, `player_finished_early`, `player_overall_position`, `player_overall_after_round`, `player_history`, `player_checkin_open_note`, `player_movement_up`, `player_movement_down`, `player_movement_same`, `player_last_updated`, `player_refresh`, `player_not_found`, `court_closed_see_player_page` (replaces the current closed-round hint).

## Testing

### Unit (`src/lib/server/tournament-logic.test.ts`)

- `derivePlayerRoundState` — one case per state, including: injured-with-substitute in current round → `injured`, injured in a past round → `retired`; frozen court; eliminated in final; completed overrides everything.
- `movementFor(prevCourt, currentCourt)` → up/down/same/null.
- `nextHintFor(format, round, rank, courtNumber, courtCount, courtSize)` — ladder table above; Court 1 rank 1 → same; bottom court rank 4 → same; R1 random → null; preseed → winners/losers.
- `playerMatchesView(matches, playerId, courtSize)` — partner/opponents/sit-out extraction for 3p/4p/5p/6p.

### E2E (`e2e/player-page.spec.ts`)

1. Create 16p → open a player's URL anonymously → shows "Round 1 of N", Court X, "Open court page" links to the stable court token URL.
2. Score all matches on that court → state `court_done`, "Waiting for other courts (1 of 4 done)".
3. Score all courts, close round → within one poll interval (use the Refresh button in the test) the page shows the new court and a movement arrow; history has one row.
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
4. **Overall position**: after closed rounds only (proposed) vs. live including the current round (needs the cache).
5. **History detail**: rank/points/diff per round (proposed) vs. also listing each match result.
6. **Tone**: second person ("You finished 2nd") — proposed; the standings page is third person. Fine for a personal page?

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
- `src/lib/tournament-logic.ts` — `derivePlayerRoundState`, `movementFor`, `nextHintFor`, `playerMatchesView`
- `src/lib/components/player/NowCard.svelte`, `MatchList.svelte`, `HistoryTable.svelte`
- `src/routes/court/[token]/+page.svelte` — closed-round hint text
- `messages/*.json`, `e2e/player-page.spec.ts`
