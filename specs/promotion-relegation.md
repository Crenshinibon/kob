# Promotion & Relegation

## Round 1 → Round 2 (Seeding)

Redistribute players vertically by rank:

```
New Court 1 = All 1st place players from Round 1 courts
New Court 2 = All 2nd place players from Round 1 courts
New Court 3 = All 3rd place players from Round 1 courts
New Court 4 = All 4th place players from Round 1 courts
```

## Round 2+ (Ladder)

```
Court 1: Keep 1st & 2nd, add 1st & 2nd from Court 2
Court 2: Add 3rd & 4th from Court 1, add 1st & 2nd from Court 3
Court 3: Add 3rd & 4th from Court 2, add 1st & 2nd from Court 4
Court 4: Keep 3rd & 4th, add 3rd & 4th from Court 3
```

## Implementation

```typescript
function redistributePlayers(courtResults, isFirstRound) {
	if (isFirstRound) {
		// Group by rank
		const byRank = { 1: [], 2: [], 3: [], 4: [] };
		for (const court of courtResults) {
			for (const standing of court.standings) {
				byRank[standing.rank].push(standing.playerId);
			}
		}
		return [
			{ court: 1, players: byRank[1] },
			{ court: 2, players: byRank[2] },
			{ court: 3, players: byRank[3] },
			{ court: 4, players: byRank[4] }
		];
	} else {
		// Ladder
		const courts = courtResults.sort((a, b) => a.courtNumber - b.courtNumber);
		return [
			{
				court: 1,
				players: [
					...courts[0].standings.slice(0, 2).map((s) => s.playerId),
					...courts[1].standings.slice(0, 2).map((s) => s.playerId)
				]
			},
			{
				court: 2,
				players: [
					...courts[0].standings.slice(2, 4).map((s) => s.playerId),
					...courts[2].standings.slice(0, 2).map((s) => s.playerId)
				]
			},
			{
				court: 3,
				players: [
					...courts[1].standings.slice(2, 4).map((s) => s.playerId),
					...courts[3].standings.slice(0, 2).map((s) => s.playerId)
				]
			},
			{
				court: 4,
				players: [
					...courts[2].standings.slice(2, 4).map((s) => s.playerId),
					...courts[3].standings.slice(2, 4).map((s) => s.playerId)
				]
			}
		];
	}
}
```

That's the complete algorithm. No complex UI needed - just happens automatically when admin clicks "Close Round".
