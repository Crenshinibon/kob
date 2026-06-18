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

**Tie-breaking for seeding**: Total points → Point differential → Player ID (deterministic)

### Random Seed Examples

- **[084_random-example-12p.md](./084_random-example-12p.md)**: 12 players (3 courts, 4 rounds)
- **[085_random-example-16p.md](./085_random-example-16p.md)**: 16 players (4 courts, 4 rounds)
- **[086_random-example-20p.md](./086_random-example-20p.md)**: 20 players (5 courts, 4 rounds)

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

**Round 2+ (subsequent splits):** Each round subdivides bracket groups from the tournament tree. Within a **peer pair** (two courts at the same competitive level), 1sts+2nds from both courts → top court (stay in gold race), 3rds+4ths → bottom court (drop out of gold race permanently). Once a player finishes 3rd or 4th on a court, they never return to the gold bracket.

Subdivision modes:
- **peer** (2 courts, first split of that pair): combine 1sts+2nds from both → top, 3rds+4ths → bottom
- **one-level** (4+ courts): split into winner/loser halves, then peer-split each half
- **winner-only** (2 courts, second+ split of that pair): only the top court from the previous split continues; the bottom court is settled and its players do not play the next round

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

**Round 2 → Round 3:** Recursive pair subdivision within each half (`splitSize(8)=4`).

- **Winner half (courts 1–4):** pair (C1,C2) → C1/C2; pair (C3,C4) → C3/C4
- **Loser half (courts 5–8):** pair (C5,C6) → C5/C6; pair (C7,C8) → C7/C8
- Within each pair: 1sts+2nds → top court, 3rds+4ths → bottom court

**Round 3 → Round 4:** Winner-only pair subdivision on each active pair.

- **Pair (C1,C2):** Court 1 (WW) continues to Gold Final; Court 2 (WL) is settled — places 5–8 determined by R3 results
- **Pair (C3,C4):** Court 3 (LW) continues to Bronze Final; Court 4 (LL) is settled — places 13–16 determined by R3 results
- Only 16 of 32 players play R4; the other 16 were placed when their bracket froze after R3

## Implementation

See `src/lib/tournament-logic.ts`:

- **`verticalSeeding(results, courtCount, courtSizes)`** — Random Seed R1→R2: groups by finish position, sorts each tier by points desc (tiebreak: diff desc, playerId asc), flattens, fills courts top-to-bottom. Strongest players on Court 1.
- **`redistributeLadder(results, isFirstRound, courtCount, courtSizes)`** — Random Seed entry point: calls `verticalSeeding` for R1→R2, `ladderRedistribute` for R2+.
- **`ladderRedistribute(results, courtCount, courtSizes)`** — Random Seed R2+: 2-up/2-down between adjacent courts.
- **`processPreseedTransition(results, sizes, roundsCompleted, totalCourts?)`** — Preseed redistribution.
  - `roundsCompleted=0` (R1→R2): flat tiers + slot-based winner/loser split + origin mixing via `distributeGroup`
  - `roundsCompleted≥1`: bracket-tree subdivision via `getSubdivisionPlan` (peer / one-level / winner-only)
  - Subsequent rounds: recursive court-pair subdivision via `subdividePreseedBracket`; at each 2-court leaf, finish-position split (1sts+2nds → top, 3rds+4ths → bottom)
- **`subdividePreseedBracket(results, sizes)`** — Preseed: recursive court-number subdivision with finish-position split at 2-court leaves.
- **`distributeByFinishPosition(results, sizes)`** — Preseed: within a 2-court pair, splits by finish position and distributes with origin mixing.
- **`redistributePreseedRecursive(results, sizes)`** — Preseed: flat tier-based redistribution for R1→R2 only.
- **`distributeGroup(players, courtCount)`** — Preseed: origin-mixing distribution (1st+2nd from same origin never on same new court).
- **`splitSize(N)`** — Preseed: largest power of 2 ≤ N.

**Note**: `verticalSeeding` is ONLY used by the random-seed format. Preseed uses `processPreseedTransition` exclusively. Do NOT share redistribution logic between formats.

**Extended support**: All redistribution algorithms work for 8-64 players (2-16 courts). Vertical seeding flattens by rank and fills courts sequentially. Ladder (2-up/2-down) works for any court count >= 2. Preseed supports any court count through bracket splitting — players grouped by finish tier, sorted by performance, then distributed within winner/loser brackets with origin mixing (avoiding 1st+2nd from the same original court on the same new court).

**Non-standard bottom court**: When `playerCount % 4 !== 0`, the bottom court is non-standard (3p/5p/6p). Redistribution places the lowest-ranked players on this court after filling standard courts from the top.

That's the complete algorithm. No complex UI needed - just happens automatically when admin clicks "Close Round".
