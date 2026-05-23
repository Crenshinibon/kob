# Scoring & Standings

## Point System

Each player gets points equal to their team's score each match.

Example match: Alice & Bob 21 vs Carol & David 19

- Alice: +21
- Bob: +21
- Carol: +19
- David: +19

## Standings Calculation

### Standard Courts (3p, 4p)

For each player sum points from all matches.

Tiebreaker order:

1. Total points (higher wins)
2. Point differential (higher wins)
3. Player ID (deterministic - ensures consistent results across runs)

### Non-Standard Courts (5p, 6p)

Players play different numbers of games per round (3-4 for 5p, 2-3 for 6p). Use **average points per round** for ranking:

```
Player ranking = totalPoints / gamesPlayed
```

Tiebreaker: if averages are equal, use total points (more games = more data), then diff, then playerId.

### Canceled Matches (Injury Handling)

When a match is canceled (`isCanceled = true`), standings are calculated using average points per completed match instead of total points. Injured players receive 0 points for canceled matches.

## Code

```typescript
function calculateStandings(matches, playerIds, courtSize) {
	const stats = {};

	for (const match of matches) {
		if (match.isCanceled) {
			// Use average-based ranking when matches are canceled
			// Injured players get 0 for canceled matches
		}
		// Standard point accumulation for non-canceled matches
	}

	const sorted = Object.values(stats)
		.map((s) => ({ ...s, diff: s.for - s.against }))
		.sort((a, b) => {
			if (courtSize === 5 || courtSize === 6) {
				// Average points per game for 5p/6p courts
				const avgA = a.points / a.gamesPlayed;
				const avgB = b.points / b.gamesPlayed;
				if (avgB !== avgA) return avgB - avgA;
			} else {
				if (b.points !== a.points) return b.points - a.points;
			}
			if (b.diff !== a.diff) return b.diff - a.diff;
			return a.playerId - b.playerId;
		})
		.map((s, i) => ({ ...s, rank: i + 1 }));

	return sorted;
}
```

## Scoring Modes

### Single Set (Default)

- 1 set per match, first to `pointsToWin` (default 21), win by 2
- No point caps — scores like 30-28 are valid

### Best of 3

- Up to 3 sets per match. First to win 2 sets wins.
- Regular sets: first to `pointsToWin` (default 21), win by 2
- Deciding set (3rd): first to `decidingSetPoints` (default 15), win by 2
- Deciding set only played if sets are split 1-1 after first two
- Stored as multiple `match` rows with different `setNumber` values

### Custom

- Organizer configures: `pointsToWin` (9-21), `decidingSetPoints` (9-21), `winBy` (1-2), `setsToWin` (1-2)
- Per-court-type overrides via `scoringOverrides` JSONB on tournament

### Effective Scoring

`getEffectiveScoring(tournament, courtSize)` merges base config with per-court-type overrides. All score validation and UI uses this centralized function.

## Final Standings

Winner is determined by final court position (not total points):

```
1st: 1st place Court 1 (final round)
2nd: 2nd place Court 1
3rd: 3rd place Court 1
4th: 4th place Court 1
5th: 1st place Court 2
...
```

### Retirement and Final Standing

- Preseed: Retired player gets worst place in their current bracket
- Random seed: Retired player gets worst possible place if relegated every remaining round
- Final round: Top court must always have exactly 4 players; extra players eliminated

## Total Standings Page

`/tournament/[id]/standings` provides:

- **Podium view** with medals for top 3 finishers
- **Complete rankings table** with total points, point differential, and round-by-round breakdown
- **Achievement categories** (for completed tournaments):
  - Most Improved: Biggest point jump from Round 1 to final
  - Consistent Performer: Lowest variance in court rankings
  - Court Champion: Player who spent most rounds on Court 1
- **Retired players section** with retirement round and reason

## Display

Court view shows standings table:

```
#  Player   Points  Diff
1  Alice    64      +1
2  Bob      65      +3
3  Carol    65      +3
4  David    60      -7
```

For 5p/6p courts, shows average points per game instead of total.

No statistics tracking, no detailed analytics, no export.
