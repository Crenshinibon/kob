# Promotion & Relegation

## Round 1 → Round 2 (Seeding)

### 16 Players (4 Courts)

Redistribute players vertically by rank:

```
New Court 1 = All 1st place players from Round 1 courts
New Court 2 = All 2nd place players from Round 1 courts
New Court 3 = All 3rd place players from Round 1 courts
New Court 4 = All 4th place players from Round 1 courts
```

### 32 Players (8 Courts)

Redistribute players vertically by rank, sorted by points within each rank:

```
All 1st places (8 players) → Sort by points (tie-breaker: diff → random)
  Top 4 → Court 1
  Bottom 4 → Court 2

All 2nd places (8 players) → Sort by points
  Top 4 → Court 3
  Bottom 4 → Court 4

All 3rd places (8 players) → Sort by points
  Top 4 → Court 5
  Bottom 4 → Court 6

All 4th places (8 players) → Sort by points
  Top 4 → Court 7
  Bottom 4 → Court 8
```

**Tie-breaking for seeding**: Total points → Point differential → Random

## Round 2+ (Ladder)

```
Court 1: Keep 1st & 2nd, add 1st & 2nd from Court 2
Court 2: Add 3rd & 4th from Court 1, add 1st & 2nd from Court 3
Court 3: Add 3rd & 4th from Court 2, add 1st & 2nd from Court 4
Court 4: Keep 3rd & 4th, add 3rd & 4th from Court 3
```

## Implementation

```typescript
function redistributePlayers(courtResults, isFirstRound, courtCount) {
	if (isFirstRound) {
		// Group by rank with points/diff for tie-breaking
		const byRank = { 1: [], 2: [], 3: [], 4: [] };
		for (const court of courtResults) {
			for (const standing of court.standings) {
				byRank[standing.rank].push({
					playerId: standing.playerId,
					points: standing.points,
					diff: standing.diff
				});
			}
		}

		if (courtCount === 4) {
			// 16 players: simple vertical seeding
			return [
				{ court: 1, players: byRank[1].map((s) => s.playerId) },
				{ court: 2, players: byRank[2].map((s) => s.playerId) },
				{ court: 3, players: byRank[3].map((s) => s.playerId) },
				{ court: 4, players: byRank[4].map((s) => s.playerId) }
			];
		}

		// 32 players: sort by points within each rank
		for (let rank = 1; rank <= 4; rank++) {
			byRank[rank].sort((a, b) => {
				if (b.points !== a.points) return b.points - a.points;
				if (b.diff !== a.diff) return b.diff - a.diff;
				return Math.random() - 0.5;
			});
		}

		return [
			{ court: 1, players: byRank[1].slice(0, 4).map((s) => s.playerId) },
			{ court: 2, players: byRank[1].slice(4, 8).map((s) => s.playerId) },
			{ court: 3, players: byRank[2].slice(0, 4).map((s) => s.playerId) },
			{ court: 4, players: byRank[2].slice(4, 8).map((s) => s.playerId) },
			{ court: 5, players: byRank[3].slice(0, 4).map((s) => s.playerId) },
			{ court: 6, players: byRank[3].slice(4, 8).map((s) => s.playerId) },
			{ court: 7, players: byRank[4].slice(0, 4).map((s) => s.playerId) },
			{ court: 8, players: byRank[4].slice(4, 8).map((s) => s.playerId) }
		];
	} else {
		// Ladder (same for both 16 and 32 players)
		const courts = courtResults.sort((a, b) => a.courtNumber - b.courtNumber);
		return courts.map((court, idx) => {
			if (idx === 0) {
				return {
					court: idx + 1,
					players: [
						...court.standings.slice(0, 2).map((s) => s.playerId),
						...courts[1].standings.slice(0, 2).map((s) => s.playerId)
					]
				};
			} else if (idx === courtCount - 1) {
				return {
					court: idx + 1,
					players: [
						...courts[idx - 1].standings.slice(2, 4).map((s) => s.playerId),
						...court.standings.slice(2, 4).map((s) => s.playerId)
					]
				};
			} else {
				return {
					court: idx + 1,
					players: [
						...courts[idx - 1].standings.slice(2, 4).map((s) => s.playerId),
						...courts[idx + 1].standings.slice(0, 2).map((s) => s.playerId)
					]
				};
			}
		});
	}
}
```

That's the complete algorithm. No complex UI needed - just happens automatically when admin clicks "Close Round".
