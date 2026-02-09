# Scoring & Standings (Simple)

## Point System

Each player gets points equal to their team's score each match.

Example match: Alice & Bob 21 vs Carol & David 19

- Alice: +21
- Bob: +21
- Carol: +19
- David: +19

## Standings Calculation

For each player sum points from 3 matches.

Tiebreaker order:

1. Total points (higher wins)
2. Point differential (higher wins)
3. Random (if still tied)

## Code

```typescript
function calculateStandings(matches) {
	const stats = {};

	// Initialize all 4 players
	for (const match of matches) {
		[
			match.teamAPlayer1Id,
			match.teamAPlayer2Id,
			match.teamBPlayer1Id,
			match.teamBPlayer2Id
		].forEach((id) => {
			if (!stats[id])
				stats[id] = {
					playerId: id,
					points: 0,
					for: 0,
					against: 0
				};
		});

		if (!match.teamAScore) continue;

		// Team A
		stats[match.teamAPlayer1Id].points += match.teamAScore;
		stats[match.teamAPlayer2Id].points += match.teamAScore;
		stats[match.teamAPlayer1Id].for += match.teamAScore;
		stats[match.teamAPlayer2Id].for += match.teamAScore;
		stats[match.teamAPlayer1Id].against += match.teamBScore;
		stats[match.teamAPlayer2Id].against += match.teamBScore;

		// Team B
		stats[match.teamBPlayer1Id].points += match.teamBScore;
		stats[match.teamBPlayer2Id].points += match.teamBScore;
		stats[match.teamBPlayer1Id].for += match.teamBScore;
		stats[match.teamBPlayer2Id].for += match.teamBScore;
		stats[match.teamBPlayer1Id].against += match.teamAScore;
		stats[match.teamBPlayer2Id].against += match.teamAScore;
	}

	return Object.values(stats)
		.map((s) => ({ ...s, diff: s.for - s.against }))
		.sort((a, b) => {
			if (b.points !== a.points) return b.points - a.points;
			if (b.diff !== a.diff) return b.diff - a.diff;
			return Math.random() - 0.5;
		})
		.map((s, i) => ({ ...s, rank: i + 1 }));
}
```

## Final Standings

Winner is determined by final court position (not total points):

```
1st: 1st place Court 1 (final round)
2nd: 2nd place Court 1
3rd: 3rd place Court 1
4th: 4th place Court 1
5th: 1st place Court 2
...
16th: 4th place Court 4
```

## Display

Court view shows simple standings table:

```
#  Player   Points  Diff
1  Alice    64      +1
2  Bob      65      +3
3  Carol    65      +3
4  David    60      -7
```

No statistics tracking, no detailed analytics, no export.
