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

### Algorithm

After each round, players are grouped by finish position (1sts, then 2nds, then 3rds, then 4ths). Within each tier, they are sorted by performance (points desc, diff desc, playerId asc). Courts are split into winner and loser brackets via `splitSize()`.

1. **Winner bracket** gets the top `winnerCount × 4` players (all 1sts, then all 2nds, then best 3rds as needed)
2. **Loser bracket** gets the remaining players (worst 3rds, all 4ths)
3. Within each bracket, players are distributed across courts using origin-mixing: a 1st and 2nd place from the **same original court** must NOT land on the same new court

### 16 Players (3 Rounds, 4 Courts)

**Round 1 → Round 2:** `splitSize(4) = 2W + 2L`

- Winner Courts 1-2: all 1st and 2nd places from Courts 1-4, mixed across courts with origin separation
- Loser Courts 3-4: all 3rd and 4th places from Courts 1-4, mixed across courts

**Round 2 → Round 3:** `splitSize(2) = 1W + 1L` per bracket

- Winners split: Court 1 (winner-of-winners): top 4 from Courts 1-2. Court 2 (loser-of-winners): bottom 4 from Courts 1-2.
- Losers split: Court 3 (winner-of-losers): top 4 from Courts 3-4. Court 4 (loser-of-losers): bottom 4 from Courts 3-4.

### 32 Players (4 Rounds, 8 Courts)

**Round 1 → Round 2:** `splitSize(8) = 4W + 4L`

- Winner Courts 1-4: all 1st and 2nd places from Courts 1-8, mixed with origin separation
- Loser Courts 5-8: all 3rd and 4th places from Courts 1-8, mixed

**Round 2 → Round 3:** `splitSize(4) = 2W + 2L` per bracket

- Winners: Courts 1-2 (top), Courts 3-4 (bottom of winners)
- Losers: Courts 5-6 (top), Courts 7-8 (bottom of losers)

**Round 3 → Round 4:** `splitSize(2) = 1W + 1L` per bracket — final placement

- Court 1: Places 1-4 | Court 5: Places 17-20
- Court 2: Places 5-8 | Court 6: Places 21-24
- Court 3: Places 9-12 | Court 7: Places 25-28
- Court 4: Places 13-16 | Court 8: Places 29-32

## Implementation

```typescript
function redistributePlayers(courtResults, courtSizes, isPreseed) {
	if (isPreseed) {
		return redistributePreseedRecursive(courtResults, courtSizes);
	} else {
		return redistributeLadder(courtResults, courtSizes);
	}
}
```

Pure functions extracted to `src/lib/server/tournament-logic.ts` with comprehensive unit tests.

**Extended support**: All redistribution algorithms work for 8-64 players (2-16 courts). Vertical seeding uses a cascade pattern that works for any court count. Ladder (2-up/2-down) works for any court count >= 2. Preseed supports any court count through bracket splitting — players grouped by finish tier, sorted by performance, then distributed within winner/loser brackets with origin mixing (avoiding 1st+2nd from the same original court on the same new court).

**Non-standard bottom court**: When `playerCount % 4 !== 0`, the bottom court is non-standard (3p/5p/6p). Redistribution places the lowest-ranked players on this court after filling standard courts from the top.

That's the complete algorithm. No complex UI needed - just happens automatically when admin clicks "Close Round".
