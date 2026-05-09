# Promotion & Relegation

## Random Seed Format

### Round 1 → Round 2 (Seeding)

#### 16 Players (4 Courts)

Redistribute players vertically by rank:

```
New Court 1 = All 1st place players from Round 1 courts
New Court 2 = All 2nd place players from Round 1 courts
New Court 3 = All 3rd place players from Round 1 courts
New Court 4 = All 4th place players from Round 1 courts
```

#### 32 Players (8 Courts)

Redistribute players vertically by rank, sorted by points within each rank:

```
All 1st places (8 players) → Sort by points (tie-breaker: diff → playerId)
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

**Tie-breaking for seeding**: Total points → Point differential → Player ID (deterministic)

### Round 2+ (Ladder)

```
Court 1: Keep 1st & 2nd, add 1st & 2nd from Court 2
Court 2: Add 3rd & 4th from Court 1, add 1st & 2nd from Court 3
Court 3: Add 3rd & 4th from Court 2, add 1st & 2nd from Court 4
Court 4: Keep 3rd & 4th, add 3rd & 4th from Court 3
```

Same logic extends for 32 players across 8 courts.

## Preseed Format

### 16 Players (3 Rounds, 4 Courts)

**Round 1 → Round 2:**
```
Court 1: All 1st places from Courts 1-4
Court 2: All 2nd places from Courts 1-4
Court 3: All 3rd places from Courts 1-4
Court 4: All 4th places from Courts 1-4
```

**Round 2 → Round 3:**
```
Court 1: 1st-2nd from Courts 1,2 → Places 1-4
Court 2: 3rd-4th from Courts 1,2 → Places 5-8
Court 3: 1st-2nd from Courts 3,4 → Places 9-12
Court 4: 3rd-4th from Courts 3,4 → Places 13-16
```

### 32 Players (4 Rounds, 8 Courts)

**Round 1 → Round 2:** Winner/loser split
- ALL 1st-2nd places from Courts 1-8 → Winner Courts 1-4
- ALL 3rd-4th places from Courts 1-8 → Loser Courts 5-8

**Round 2 → Round 3:** Tier consolidation within Winner and Loser groups

**Round 3 → Round 4:** Final placement
- Court 1: Places 1-4 | Court 5: Places 17-20
- Court 2: Places 5-8 | Court 6: Places 21-24
- Court 3: Places 9-12 | Court 7: Places 25-28
- Court 4: Places 13-16 | Court 8: Places 29-32

## Implementation

```typescript
function redistributePlayers(courtResults, currentRound, courtCount, isPreseed) {
	if (isPreseed) {
		return redistributePreseed(courtResults, currentRound, courtCount);
	} else {
		return redistributeLadder(courtResults, currentRound === 1, courtCount);
	}
}
```

Pure functions extracted to `src/lib/server/tournament-logic.ts` with comprehensive unit tests.

That's the complete algorithm. No complex UI needed - just happens automatically when admin clicks "Close Round".
