# Incomplete Rosters: Options A, D, E

## Option A: Adjust Court Count (Clean Multiples of 4)

The simplest case. Just run N courts of 4 players each. No format changes, no sit-outs, no timing issues.

### Redistribution — Random Seed Format

- **Round 1 to Round 2 (Vertical seeding)**: Works cleanly for any court count. See examples in `610_incomplete-core.md`.

- **Round 2+ (Ladder)**:
  - Works for any court count >= 2.
  - 2 up, 2 down between adjacent courts.
  - Top court keeps top 2 + gets top 2 from court below.
  - Bottom court keeps bottom 2 + gets bottom 2 from court above.
  - Middle courts: get bottom 2 from above + top 2 from below.

### Redistribution — Preseed Format (Recursive Splitting)

Preseed works for ANY court count through recursive splitting. The algorithm:

1. After Round 1 with N courts, split into:
   - **Winner group**: The largest power-of-2 courts (top performers)
   - **Loser group**: The remaining courts (lower performers)
2. Recursively apply the same splitting to each group until all groups have 1 court.

**Key insight**: The total court count does NOT need to be a power of 2. Each sub-group independently converges to a power-of-2 through recursive splitting.

#### Examples

**3 courts (12 players)**:

```
Round 1: 3 courts play
Round 2: Split → 2 winner courts + 1 loser court
Round 3: Split winners → 1+1. Final placement.
  C1: Places 1-4 (winner of winners)
  C2: Places 5-8 (loser of winners)
  C3: Places 9-12 (loser court)
Total: 3 rounds
```

**5 courts (20 players)**:

```
Round 1: 5 courts play
Round 2: Split → 4 winner courts + 1 loser court
Round 3: Split winners → 2+2
Round 4: Split each → 1+1. Final placement.
  C1: Places 1-4
  C2: Places 5-8
  C3: Places 9-12
  C4: Places 13-16
  C5: Places 17-20
Total: 4 rounds
```

**6 courts (24 players)**:

```
Round 1: 6 courts play
Round 2: Split → 4 winner courts + 2 loser courts
Round 3: Split winners → 2+2. Split losers → 1+1.
Round 4: Split each → 1+1. Final placement.
  C1: Places 1-4
  C2: Places 5-8
  C3: Places 9-12
  C4: Places 13-16
  C5: Places 17-20
  C6: Places 21-24
Total: 4 rounds
```

**7 courts (28 players)**:

```
Round 1: 7 courts play
Round 2: Split → 4 winner courts + 3 loser courts
Round 3: Split winners → 2+2. Split losers → 2+1.
Round 4: Split each → 1+1. Final placement.
  C1: Places 1-4
  C2: Places 5-8
  C3: Places 9-12
  C4: Places 13-16
  C5: Places 17-20
  C6: Places 21-24
  C7: Places 25-28
Total: 4 rounds
```

**9 courts (36 players)**:

```
Round 1: 9 courts play
Round 2: Split → 8 winner courts + 1 loser court
Round 3: Split winners → 4+4
Round 4: Split each → 2+2
Round 5: Split each → 1+1. Final placement.
  C1-C8: Places 1-32
  C9: Places 33-36
Total: 5 rounds
```

**10 courts (40 players)**:

```
Round 1: 10 courts play
Round 2: Split → 8 winner courts + 2 loser courts
Round 3: Split winners → 4+4. Split losers → 1+1.
Round 4: Split each → 2+2
Round 5: Split each → 1+1. Final placement.
Total: 5 rounds
```

#### Round Count Formula

```
rounds(N) = floor(log2(N-1)) + 2  for N >= 2
```

| Courts | Rounds |
| ------ | ------ |
| 2      | 2      |
| 3      | 3      |
| 4      | 3      |
| 5-7    | 4      |
| 8      | 4      |
| 9-15   | 5      |
| 16     | 5      |

The winner group's depth determines the total rounds. The loser group plays along but doesn't add rounds.

#### Preseed Split Algorithm

```
function splitCourts(courts):
    N = courts.length
    if N == 1: return (no more splits needed)

    winnerCount = largestPowerOf2(N)  // e.g., 7→4, 5→4, 3→2, 6→4
    loserCount = N - winnerCount

    // Sort all players by court finish (1st places first, then 2nd, etc.)
    // Winner group gets the top performers
    // Loser group gets the rest

    // Recursively split each group
    splitCourts(winnerGroup)
    splitCourts(loserGroup)
```

### Timing Impact

- **None**. Still 4-player courts, 3 matches per court, ~45-60 min per round.

### Competitive Integrity

- **High**. Everyone plays every round. Standard redistribution applies.

---

## Non-Standard Bottom Court (Leftovers)

When `playerCount % 4` is not 0, the lowest court gets the leftover players. This is always ONE court at the bottom — no mixed court configurations across multiple courts.

| Leftovers | Bottom Court        | Format                                |
| --------- | ------------------- | ------------------------------------- |
| 0         | None (all standard) | All 4-player courts                   |
| 1         | 5-player court      | Parallel games (rotating every point) |
| 2         | 6-player court      | Parallel games (rotating every point) |
| 3         | 3-player court      | 2v1 format (3 matches)                |

### Redistribution with Non-Standard Bottom Court

After each round, redistribute using the standard logic (vertical seeding or ladder). The bottom court always gets the remaining players:

**Example: 11 players (2x4p + 1x3p)**

- After Round 1: 11 players across 3 courts
- Redistribute: Sort all by rank, then points/diff
  - C1: Top 4 players (1st places + best 2nd)
  - C2: Next 4 players
  - C3: Last 3 players (3-player court)
- The non-standard court is always C3 (the bottom)

**Example: 25 players (6x4p + 1x5p)**

- After Round 1: 25 players across 7 courts
- Redistribute: vertical seeding cascade
  - C1-C6: Top 24 players (4 each)
  - C7: Last 1 player stays on 5-player court, gets the worst 4 players from the other courts as new partners

**Key principle**: The remainder follows you. After each redistribution, the bottom court is non-standard. Players on the bottom court play by different rules but still compete for ranking.

### 3-Player Court Format (3 Leftovers)

- **3 players per court**: A, B, C.
- **Matches** (3 total):
  1. A+B vs C
  2. A+C vs B
  3. B+C vs A
- **Scoring**: Standard rally points. Team of 2 gets team score each; single player gets their score.
- **Standard volleyball rules** — no modifications. Single player simply uses all 3 team touches themselves.
- **Timing**: 3 matches, same as standard. May run slightly faster (2v1 advantage).
- **Ranking**: Total points → diff → playerId (same as 4-player courts).

### 5/6-Player Court Format (1-2 Leftovers)

See detailed description below.

---

## 5/6-Player Court (Parallel Games, Rotating Every Point)

For 1-2 leftover players: one full court with two parallel game tracks running simultaneously. The rotating player swaps after every point, and each swap feeds into a separate game score. Roles rotate between the two runs within each round. **Serving rotation**: The rotating player maintains correct serving order relative to the fixed players — the same standard volleyball serve-rotation rules apply as in regular 2v2 games.

### How It Works

**5 players (A, B, C, D, E):**

The round consists of **2 runs × 2 parallel games = 4 games** total.

**Run 1**: One team is fixed on side X, one player fixed on side Y, two players rotate.

- Side X: A+B (fixed team)
- Side Y: C (fixed), D and E alternate every point
- Game 1: A+B vs C+D (scored when D is on court)
- Game 2: A+B vs C+E (scored when E is on court)

**Run 2**: Different team fixed on side X, different player fixed on side Y, different players rotate.

- Side X: D+E (fixed team)
- Side Y: B (fixed), A and C alternate every point
- Game 3: D+E vs B+A (scored when A is on court)
- Game 4: D+E vs B+C (scored when C is on court)

**Game count per player:**
| Player | Run 1 | Run 2 | Total |
|--------|-------|-------|-------|
| A | 2 | 1 | 3 |
| B | 2 | 2 | 4 |
| C | 2 | 1 | 3 |
| D | 1 | 2 | 3 |
| E | 1 | 2 | 3 |

One player plays 4 games, everyone else plays 3. Across tournament rounds, the "4 games" role rotates (via randomization).

**6 players (A, B, C, D, E, F):**

Same structure: 2 runs × 2 parallel games = 4 games.

**Run 1**:

- Side X: A+B (fixed team)
- Side Y: C+D and E+F rotate every point (no fixed player)
- Game 1: A+B vs C+D (scored when C+D is on court)
- Game 2: A+B vs E+F (scored when E+F is on court)

**Run 2**:

- Side X: C+D (fixed team) — different players
- Side Y: A+B and E+F rotate every point (no fixed player)
- Game 3: C+D vs A+B (scored when A+B is on court)
- Game 4: C+D vs E+F (scored when E+F is on court)

**Game count per player:**
| Player | Run 1 | Run 2 | Total |
|--------|-------|-------|-------|
| A | 2 | 1 | 3 |
| B | 2 | 1 | 3 |
| C | 1 | 2 | 3 |
| D | 1 | 2 | 3 |
| E | 1 | 1 | 2 |
| F | 1 | 1 | 2 |

A-D play 3 games each, E-F play 2 each. Within each rotating pair (C+D, E+F, A+B), both players play the same number of games. Across rounds, roles rotate.

### Role Assignment Randomization

Before each round, the system randomly assigns roles using a seeded PRNG (based on tournament ID + round number for reproducibility):

**5 players:**

- Which player is fixed on side Y in both runs (plays 4 games)
- Which pair is fixed on side X in Run 1
- Which pair is fixed on side X in Run 2

**6 players:**

- Which pair is fixed on side X in Run 1 (plays 3 games)
- Which pair is fixed on side X in Run 2 (plays 3 games)
- The remaining pair rotates in both runs (plays 2 games)

**Algorithm**: Shuffle the player list using the seeded PRNG, then assign roles in order. This ensures:

- Reproducibility (same tournament + same round = same assignment)
- Fairness across rounds (different seed each round)
- No player is stuck with fewer games over the tournament

### Scoring

Since players play different numbers of games, use **average points per round** for ranking:

```
Player ranking = totalPoints / gamesPlayed
```

Example for 5 players:
| Player | Games | Total Points | Avg/Game | Rank |
|--------|-------|--------------|----------|------|
| A | 3 | 39 | 13.0 | 1 |
| B | 4 | 48 | 12.0 | 3 |
| C | 3 | 36 | 12.0 | 3 |
| D | 3 | 33 | 11.0 | 5 |
| E | 3 | 36 | 12.0 | 3 |

Tiebreaker: if averages are equal, use total points (more games = more data), then diff, then playerId.

### Timing Impact

- **Same as standard** (~45-60 min).
- 4 games x 15 points ≈ 3 games x 21 points in duration.
- One full court, continuous play, alternating players every point.

### Competitive Integrity

- **Medium-High**. Everyone plays. Timing matches standard courts.
- **5 players**: One player plays 4 games, others play 3. Mitigated by role randomization across rounds and average-per-round ranking.
- **6 players**: Some players play 3 games, others play 2. Mitigated by role randomization across rounds and average-per-round ranking.
- **Ranking**: By average points per round (normalized), then total points (tiebreaker), then diff, then playerId.

---

## Option E: Recursive Preseed (Generalized from Single Cut)

Option E is now generalized. Instead of only cutting to top 16, the recursive splitting approach (described in Option A) handles ALL court counts. The "single cut to top 16" is just a special case of the recursive algorithm.

### How It Works (Generalized)

For any N courts after Round 1:

1. Determine winner group size: largest power-of-2 <= N
2. Top performers go to winner group
3. Remainder goes to loser group
4. Recursively apply to each group

### Examples

**12 players (3 courts)**:

- Round 1: 3 courts
- Round 2: Split → 2 winner + 1 loser
- Round 3: Split winners → 1+1. Final.
- C1: Places 1-4, C2: Places 5-8, C3: Places 9-12

**20 players (5 courts)**:

- Round 1: 5 courts
- Round 2: Split → 4 winner + 1 loser
- Round 3: Split winners → 2+2
- Round 4: Split each → 1+1. Final.
- C1-C4: Places 1-16, C5: Places 17-20

**24 players (6 courts)**:

- Round 1: 6 courts
- Round 2: Split → 4 winner + 2 loser
- Round 3: Split winners → 2+2. Split losers → 1+1.
- Round 4: Split each → 1+1. Final.
- C1-C4: Places 1-16, C5-C6: Places 17-24

**28 players (7 courts)**:

- Round 1: 7 courts
- Round 2: Split → 4 winner + 3 loser
- Round 3: Split winners → 2+2. Split losers → 2+1.
- Round 4: Split each → 1+1. Final.
- C1-C4: Places 1-16, C5-C6: Places 17-24, C7: Places 25-28

**36 players (9 courts)**:

- Round 1: 9 courts
- Round 2: Split → 8 winner + 1 loser
- Round 3: Split winners → 4+4
- Round 4: Split each → 2+2
- Round 5: Split each → 1+1. Final.
- C1-C8: Places 1-32, C9: Places 33-36

### Comparison with Old "Single Cut" Approach

| Approach       | 20p Rounds | 24p Rounds | 28p Rounds | 36p Rounds |
| -------------- | ---------- | ---------- | ---------- | ---------- |
| Old: Cut to 16 | 4          | 4          | 4          | N/A        |
| New: Recursive | 4          | 4          | 4          | 5          |

The recursive approach produces the same result for 20/24/28 players but generalizes to any court count.

---

## Timing Comparison Summary

| Approach                             | Round Time | Setup Complexity | Player Satisfaction |
| ------------------------------------ | ---------- | ---------------- | ------------------- |
| Standard 4p courts                   | ~45-60 min | Low              | High                |
| Non-standard bottom court (3p/5p/6p) | ~45-60 min | Low              | Medium-High         |

---

## Recommendations by Player Count

### Preseed Format (Now Works for ALL Court Counts)

| Players | Courts | Rounds | Method                                 |
| ------- | ------ | ------ | -------------------------------------- |
| 8       | 2      | 2      | Recursive: 2→1+1                       |
| 12      | 3      | 3      | Recursive: 3→2+1, 2→1+1                |
| 16      | 4      | 3      | Recursive: 4→2+2, 2→1+1                |
| 20      | 5      | 4      | Recursive: 5→4+1, 4→2+2, 2→1+1         |
| 24      | 6      | 4      | Recursive: 6→4+2, 4→2+2, 2→1+1         |
| 28      | 7      | 4      | Recursive: 7→4+3, 4→2+2, 3→2+1         |
| 32      | 8      | 4      | Recursive: 8→4+4, 4→2+2, 2→1+1         |
| 36      | 9      | 5      | Recursive: 9→8+1, 8→4+4, 4→2+2, 2→1+1  |
| 40      | 10     | 5      | Recursive: 10→8+2, ...                 |
| 44      | 11     | 5      | Recursive: 11→8+3, ...                 |
| 48      | 12     | 5      | Recursive: 12→8+4, ...                 |
| 52      | 13     | 5      | Recursive: 13→8+5, ...                 |
| 56      | 14     | 5      | Recursive: 14→8+6, ...                 |
| 60      | 15     | 5      | Recursive: 15→8+7, ...                 |
| 64      | 16     | 5      | Recursive: 16→8+8, 8→4+4, 4→2+2, 2→1+1 |

### Random Seed Format

Random seed is flexible because vertical seeding and the ladder system work for any court count. For any player count 8-64:

- Clean multiples of 4: standard courts, ladder redistribution
- With leftovers: bottom court is non-standard (3p/5p/6p)

### Decision Tree

```
How many players registered?
│
├─ < 8 → CANCEL TOURNAMENT
│
├─ 8-64 (multiple of 4) → Standard N-court tournament
│   ├─ Random Seed: N rounds configurable
│   └─ Preseed: Recursive splitting, rounds = floor(log2(N-1)) + 2
│
├─ 8-64 (not multiple of 4) → One non-standard bottom court
│   ├─ 1 leftover → 5-player court (parallel games)
│   ├─ 2 leftovers → 6-player court (parallel games)
│   ├─ 3 leftovers → 3-player court (2v1 format)
│   ├─ Random Seed: Vertical seeding + ladder
│   └─ Preseed: Recursive splitting (bottom court is non-standard)
│
└─ > 64 → Too many players, split into multiple tournaments
```
