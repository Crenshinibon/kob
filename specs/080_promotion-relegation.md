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

**Round 2+ (subsequent splits):** For power-of-2 court groups, redistribute by finish position across **all courts in the group** — all 1sts+2nds → top half of courts, all 3rds+4ths → bottom half, with origin mixing. Asymmetric brackets (e.g. 5 courts → 4+1) keep the single overflow court unchanged.

### 16 Players (3 Rounds, 4 Courts)

**Round 1 → Round 2:** `splitSize(4) = 2W + 2L`

- Winner Courts 1-2: all 1st and 2nd places from Courts 1-4, mixed across courts with origin separation
- Loser Courts 3-4: all 3rd and 4th places from Courts 1-4, mixed across courts

**Round 2 → Round 3:** All 4 courts redistribute together (`splitSize(4)=2` → 2 top + 2 bottom courts).

- Courts 1–2: all 1st and 2nd places from Courts 1–4, mixed with origin separation
- Courts 3–4: all 3rd and 4th places from Courts 1–4, mixed with origin separation

### 32 Players (4 Rounds, 8 Courts)

**Round 1 → Round 2:** `splitSize(8) = 4W + 4L`

- Winner Courts 1-4: all 1st and 2nd places from Courts 1-8, mixed with origin separation
- Loser Courts 5-8: all 3rd and 4th places from Courts 1-8, mixed

**Round 2 → Round 3:** All 8 courts redistribute together (`splitSize(8)=4` → 4 top + 4 bottom courts).

- Courts 1–4: all 1st and 2nd places from Courts 1–8
- Courts 5–8: all 3rd and 4th places from Courts 1–8

**Round 3 → Round 4:** Each 4-court group redistributes by finish position (`splitSize(4)=2`).

- Court 1: Places 1-4 | Court 5: Places 17-20
- Court 2: Places 5-8 | Court 6: Places 21-24
- Court 3: Places 9-12 | Court 7: Places 25-28
- Court 4: Places 13-16 | Court 8: Places 29-32

## Implementation

See `src/lib/tournament-logic.ts`:

- **`verticalSeeding(results, courtCount, courtSizes)`** — Random Seed R1→R2: groups by finish position, sorts each tier by points desc (tiebreak: diff desc, playerId asc), flattens, fills courts top-to-bottom. Strongest players on Court 1.
- **`redistributeLadder(results, isFirstRound, courtCount, courtSizes)`** — Random Seed entry point: calls `verticalSeeding` for R1→R2, `ladderRedistribute` for R2+.
- **`ladderRedistribute(results, courtCount, courtSizes)`** — Random Seed R2+: 2-up/2-down between adjacent courts.
- **`processPreseedTransition(results, sizes, isFirstSplit)`** — Preseed redistribution.
  - R1→R2 uses `isFirstSplit=true` (flat tiers + slot-based winner/loser split + origin mixing via `distributeGroup`)
  - Subsequent rounds: finish-position split across all courts in each bracket group (1sts+2nds → top half, 3rds+4ths → bottom half), with asymmetric overflow courts unchanged
- **`distributeByFinishPosition(results, sizes)`** — Preseed: within a bracket group, splits by finish position and distributes with origin mixing.
- **`redistributePreseedRecursive(results, sizes)`** — Preseed: flat tier-based redistribution for R1→R2 only.
- **`distributeGroup(players, courtCount)`** — Preseed: origin-mixing distribution (1st+2nd from same origin never on same new court).
- **`splitSize(N)`** — Preseed: largest power of 2 ≤ N.

**Note**: `verticalSeeding` is ONLY used by the random-seed format. Preseed uses `processPreseedTransition` exclusively. Do NOT share redistribution logic between formats.

**Extended support**: All redistribution algorithms work for 8-64 players (2-16 courts). Vertical seeding flattens by rank and fills courts sequentially. Ladder (2-up/2-down) works for any court count >= 2. Preseed supports any court count through bracket splitting — players grouped by finish tier, sorted by performance, then distributed within winner/loser brackets with origin mixing (avoiding 1st+2nd from the same original court on the same new court).

**Non-standard bottom court**: When `playerCount % 4 !== 0`, the bottom court is non-standard (3p/5p/6p). Redistribution places the lowest-ranked players on this court after filling standard courts from the top.

That's the complete algorithm. No complex UI needed - just happens automatically when admin clicks "Close Round".
