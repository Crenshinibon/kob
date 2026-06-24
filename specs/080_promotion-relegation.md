# Promotion & Relegation

## Random Seed Format

### Round 1 → Round 2 (Vertical Seeding)

Collect all players by finish position, sort each tier by points (desc, tiebreak: diff desc, playerId asc), flatten into one list, fill courts sequentially top-to-bottom.

#### Algorithm

```
1. Group all players by finish position (1sts, 2nds, 3rds, 4ths)
2. Sort each tier by points desc → diff desc → playerId asc
3. Flatten: [1sts..., 2nds..., 3rds..., 4ths...]
4. Fill courts sequentially: top players → Court 1, next → Court 2, etc.
```

Court 1 always gets the strongest players. Court N gets the weakest.

#### 12 Players (3 Courts)

```
1sts (3 players): sorted by points → fill Court 1 slots 1-3 (4th slot goes to best 2nd)
2nds (3 players): sorted by points → continue filling Court 1, then Court 2
3rds (3 players): continue filling Court 2, then Court 3
4ths (3 players): fill Court 3

Result: Court 1 = [3 best 1sts + best 2nd], Court 2 = [remaining 2nds + 3rds], Court 3 = [worst players]
```

#### 16 Players (4 Courts)

Each tier has exactly 4 players, so each tier fills exactly one court:

```
Court 1 = All 1st place players (sorted by points)
Court 2 = All 2nd place players (sorted by points)
Court 3 = All 3rd place players (sorted by points)
Court 4 = All 4th place players (sorted by points)
```

This is a special case — when `players_per_tier == court_size`, tiers map 1:1 to courts.

#### 20 Players (5 Courts)

5 players per tier, 4 per court → tiers cross court boundaries:

```
1sts (5): top 4 → Court 1, 5th → Court 2
2nds (5): top 3 → Court 2, next 2 → Court 3
3rds (5): top 2 → Court 3, next 2 → Court 4, last → Court 5
4ths (5): top 1 → Court 4, next 3 → Court 5 (or Court 4 overflow)
```

The weakest 1st-place player lands on Court 2, not Court 1.

**Tie-breaking for seeding**: Configurable per tournament — default: round points → round diff → total points → total diff → seeding. See **[094_configurable-tie-breaking.md](./094_configurable-tie-breaking.md)**.

### Random Seed Examples

- **[084_random-example-12p.md](./084_random-example-12p.md)**: 12 players (3 courts, 4 rounds)
- **[085_random-example-16p.md](./085_random-example-16p.md)**: 16 players (4 courts, 4 rounds)
- **[086_random-example-20p.md](./086_random-example-20p.md)**: 20 players (5 courts, 4 rounds)
- **[089_random-example-17p-retirement.md](./089_random-example-17p-retirement.md)**: 17 players — retirement cascade on ladder redistribution

### Round 2+ (Ladder)

```
Court 1: Keep 1st & 2nd, add 1st & 2nd from Court 2
Court 2: Add 3rd & 4th from Court 1, add 1st & 2nd from Court 3
Court 3: Add 3rd & 4th from Court 2, add 1st & 2nd from Court 4
Court 4: Keep 3rd & 4th, add 3rd & 4th from Court 3
```

Same logic extends for any number of courts.

## Preseed Format

### Algorithm

After each round, players are grouped by finish position (1sts, then 2nds, then 3rds, then 4ths). Within each tier, they are sorted by performance (points desc, diff desc, playerId asc). Courts are split into winner and loser brackets via `splitSize()`.

1. **Winner bracket** gets the top `winnerCount × 4` players (all 1sts, then all 2nds, then best 3rds as needed)
2. **Loser bracket** gets the remaining players (worst 3rds, all 4ths)
3. Within each bracket, players are distributed across courts using origin-mixing: a 1st and 2nd place from the **same original court** must NOT land on the same new court

**Round 2+ (subsequent splits):** Each round subdivides bracket groups from the tournament tree. Within every group of N courts (power of 2), the **same algorithm** applies: rank all players by finish position globally across the group, split into `splitSize(N)` winner courts and the rest as loser courts, fill top court numbers with 1sts+2nds and bottom court numbers with 3rds+4ths, with origin mixing.

Asymmetric brackets (e.g. 5 courts → 4+1) keep the single overflow court unchanged after R2.

### 16 Players (3 Rounds, 4 Courts)

**Round 1 → Round 2:** `splitSize(4) = 2W + 2L`

- Winner Courts 1-2: all 1st and 2nd places from Courts 1-4, mixed across courts with origin separation
- Loser Courts 3-4: all 3rd and 4th places from Courts 1-4, mixed across courts

**Round 2 → Round 3:** Recursively subdivide by court pairs (`splitSize(4)=2`).

- **Pair (C1,C2) — Winners bracket:** 1sts+2nds from both → Court 1 (Gold), 3rds+4ths from both → Court 2 (Silver)
- **Pair (C3,C4) — Losers bracket:** 1sts+2nds from both → Court 3 (Bronze), 3rds+4ths from both → Court 4 (Iron)

A player who finished 3rd on Court 1 drops to Court 2 (Silver), not to the Losers bracket (Courts 3–4).

### 32 Players (4 Rounds, 8 Courts)

**Round 1 → Round 2:** `splitSize(8) = 4W + 4L`

- Winner Courts 1-4: all 1st and 2nd places from Courts 1-8, mixed with origin separation
- Loser Courts 5-8: all 3rd and 4th places from Courts 1-8, mixed

**Round 2 → Round 3:** Same algorithm on each half of 8 courts (`splitSize(8)=4`).

- **Winner half (courts 1–8):** global tiers → courts 1–4 (1sts+2nds), courts 5–8 (3rds+4ths)
- **Loser half (courts 9–16):** same algorithm independently

**Round 3 → Round 4:** Same algorithm on each quarter of 4 courts (`splitSize(4)=2`).

- Top 2 court numbers get 1sts+2nds, bottom 2 get 3rds+4ths
- All 32 players play R4

### 64 Players (5 Rounds, 16 Courts)

**Every transition uses the same split algorithm** at the appropriate bracket group size (16→8, 8→4, 4→2, 2→1 winner/loser courts per group).

See **[088_preseed-example-64p.md](./088_preseed-example-64p.md)** for a full walkthrough with court-by-court start/end listings for all 5 rounds.

## Preseed walkthrough specs

- **[082_preseed-example-16p.md](./082_preseed-example-16p.md)** — 16 players, 3 rounds
- **[083_preseed-example-20p.md](./083_preseed-example-20p.md)** — 20 players, 4 rounds (asymmetric)
- **[088_preseed-example-64p.md](./088_preseed-example-64p.md)** — 64 players, 5 rounds (court-by-court walkthrough)

## Implementation

See `src/lib/tournament-logic.ts`:

- **`verticalSeeding(results, courtCount, courtSizes)`** — Random Seed R1→R2: groups by finish position, sorts each tier by points desc (tiebreak: diff desc, playerId asc), flattens, fills courts top-to-bottom. Strongest players on Court 1.
- **`redistributeLadder(results, isFirstRound, courtCount, courtSizes)`** — Random Seed entry point: calls `verticalSeeding` for R1→R2, `ladderRedistribute` for R2+.
- **`ladderRedistribute(results, courtCount, courtSizes)`** — Random Seed R2+: 2-up/2-down between adjacent courts.
- **`processPreseedTransition(results, sizes, roundsCompleted, totalCourts?)`** — Preseed redistribution.
  - `roundsCompleted=0` (R1→R2): applies tier split to all courts
  - `roundsCompleted≥1`: same tier split applied to each bracket group from the tree
- **`getBracketGroups(totalCourts, roundsCompleted)`** — Returns which court groups subdivide together.
- **`redistributePreseedRecursive(results, sizes)`** — Preseed tier split: global finish-position tiers, `splitSize(N)` winner/loser courts, origin mixing.
- **`distributeGroup(players, courtSizes)`** — Preseed: origin-mixing distribution (1st+2nd from same origin never on same new court).
- **`splitSize(N)`** — Preseed: largest power of 2 ≤ N.

**Note**: `verticalSeeding` is ONLY used by the random-seed format. Preseed uses `processPreseedTransition` exclusively. Do NOT share redistribution logic between formats.

**Extended support**: All redistribution algorithms work for 8-64 players (2-16 courts). Vertical seeding flattens by rank and fills courts sequentially. Ladder (2-up/2-down) works for any court count >= 2. Preseed supports any court count through bracket splitting — players grouped by finish tier, sorted by performance, then distributed within winner/loser brackets with origin mixing (avoiding 1st+2nd from the same original court on the same new court).

**Non-standard bottom court**: When `playerCount % 4 !== 0`, the bottom court is non-standard (3p/5p/6p). Redistribution places the lowest-ranked players on this court after filling standard courts from the top.

That's the complete algorithm. No complex UI needed - just happens automatically when admin clicks "Close Round".
