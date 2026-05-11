# Incomplete Rosters: Options A, B, D, E

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

For N courts, the number of rounds is: `floor(log2(N)) + 1` for the winner bracket, plus additional rounds for any remainder > 1.

More precisely:
- Power-of-2 courts (2,4,8,16): log2(N) + 1 rounds
- Non-power-of-2: depends on the remainder after extracting the largest power of 2

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

## Option B: Mixed Court Sizes (3-Player + 4-Player Courts)

For counts where pure 4-player courts leave 1-3 leftovers, mix in 3-player courts (2v1 format).

### Possible Configurations

| Players | 4-Player Courts | 3-Player Courts | Total Courts |
|---------|----------------|-----------------|--------------|
| 31      | 7 (28 players) | 1 (3 players)   | 8            |
| 30      | 6 (24 players) | 2 (6 players)   | 8            |
| 29      | 5 (20 players) | 3 (9 players)   | 8            |
| 27      | 6 (24 players) | 1 (3 players)   | 7            |
| 26      | 5 (20 players) | 2 (6 players)   | 7            |
| 25      | 4 (16 players) | 3 (9 players)   | 7            |
| 23      | 5 (20 players) | 1 (3 players)   | 6            |
| 22      | 4 (16 players) | 2 (6 players)   | 6            |
| 21      | 3 (12 players) | 3 (9 players)   | 6            |
| 19      | 4 (16 players) | 1 (3 players)   | 5            |
| 18      | 3 (12 players) | 2 (6 players)   | 5            |
| 17      | 2 (8 players)  | 3 (9 players)   | 5            |
| 15      | 3 (12 players) | 1 (3 players)   | 4            |
| 14      | 2 (8 players)  | 2 (6 players)   | 4            |
| 13      | 2 (8 players)  | 1 (3 players)   | 3            |
| 11      | 2 (8 players)  | 1 (3 players)   | 3            |
| 10      | 1 (4 players)  | 2 (6 players)   | 3            |
| 9       | 1 (4 players)  | 1 (3 players)   | 2            |

(Extends to 64 players — e.g., 61 = 14x4p + 1x3p + 1x3p, etc.)

### 3-Player Court Format

- **3 players per court**: A, B, C.
- **Matches** (3 total):
  1. A+B vs C
  2. A+C vs B
  3. B+C vs A
- **Scoring**: Standard rally points. Team of 2 gets team score each; single player gets their score.
- **Standard volleyball rules** — no modifications. Single player simply uses all 3 team touches themselves.
- **Timing**: Still 3 matches. May run slightly faster in practice because the 1v2 team is at a significant disadvantage, so rallies tend to end sooner.

### Redistribution Strategy: Accept the Asymmetry (Strategy 3)

After Round 1, redistribute as many players as possible to 4-player courts. The incomplete courts are always the BOTTOM courts.

**How it works**:
1. Collect all finishers from all courts (both 3p and 4p)
2. Group by rank: all 1st places, all 2nd places, all 3rd places, all 4th places
3. Fill courts top-down: top courts get 4 players each, bottom court(s) get 3 (or fewer)
4. The bottom courts are always the incomplete ones

**Example: 11 players (2x4p + 1x3p)**
- After Round 1: 11 players across 3 courts
- Redistribute: Sort all by rank, then points/diff
  - C1: Top 4 players (all 1st places + best 2nd)
  - C2: Next 4 players
  - C3: Last 3 players (incomplete court)
- The incomplete court is always C3 (the bottom)

**Example: 13 players (2x4p + 1x3p)**
- After Round 1: 13 players across 3 courts
- Redistribute:
  - C1: Top 4
  - C2: Next 4
  - C3: Next 4
  - C4: Last 1 player (sit-out) — or use Option D for 5-player court

**Key principle**: The remainder follows you. After each redistribution, the bottom court(s) may be incomplete. This is acceptable — players understand "I'm on the lower court."

### Timing Impact

- **None**. 3-player courts take the same time as 4-player courts (3 matches).

### Competitive Integrity

- **Medium**. The 3-player format is inherently different (2v1). Some players may perceive it as easier or harder. The asymmetry is accepted: 1st place on any court is still 1st place for redistribution purposes.

---

## Option D: 5/6-Player Court (Parallel Games, Rotating Every Point)

For 1-2 leftover players: one full court with two parallel game tracks. The rotating player swaps after every point, and each swap feeds into a separate game score.

### How It Works

**5 players (A, B, C, D, E):**

Setup: Players A and B on one side (fixed team). Player C on the other side (fixed). Players D and E are on the same side as C, rotating in/out after every point.

The court runs **two parallel game tracks** simultaneously:

| Track | Team 1 | Team 2 | Scoring |
|-------|--------|--------|---------|
| Game A | A + B | C + D | Points scored when D is on court |
| Game B | A + B | C + E | Points scored when E is on court |

**Rotation**: After every point, D and E swap. Point 1 → D plays (feeds Game A). Point 2 → E plays (feeds Game B). Point 3 → D plays (feeds Game A). And so on.

Both games play to **15 points** each. Since they're interleaved, total play is ~30 points. This is done **twice** for a total of **4 games** per round.

**6 players (A, B, C, D, E, F):**

Setup: Players A and B on one side (fixed team). Players C+D are one pair, E+F are another pair. They rotate after every point.

| Track | Team 1 | Team 2 | Scoring |
|-------|--------|--------|---------|
| Game A | A + B | C + D | Points scored when C+D are on court |
| Game B | A + B | E + F | Points scored when E+F are on court |

**Rotation**: After every point, the pair swaps. Point 1 → C+D play (feeds Game A). Point 2 → E+F play (feeds Game B). And so on.

Both games play to **15 points** each. Done **twice** = **4 games** per round.

### Pairing Randomization

Since we cannot play all possible team combinations, the initial pairing is **randomized** before each round. The system randomly assigns:
- Which 2 players are the fixed team (A+B)
- Which player is the fixed opponent (C) for 5p
- Which pairs rotate (C+D vs E+F) for 6p

This ensures fairness across rounds — different players get the fixed/rotating roles.

### Scoring

Each player gets points equal to their team's score in the game tracks they participated in. Example for 5 players:

| Player | Game A (with D) | Game B (with E) | Total |
|--------|-----------------|-----------------|-------|
| A | 15 | 12 | 27 |
| B | 15 | 12 | 27 |
| C | 13 | 10 | 23 |
| D | 13 | — | 13 |
| E | — | 10 | 10 |

Players D and E only contribute to one game track each. Their total reflects only their track's score.

### When to Use

Option D is the automatic result when there are 1-2 leftover players:
- 1 leftover → 5-player court
- 2 leftover → 6-player court

No organizer decision needed — it's determined by `playerCount % 4`.

### Timing Impact

- **Same as standard** (~45-60 min).
- 4 games x 15 points ≈ 3 games x 21 points in duration.
- One full court, continuous play, just alternating players.

### Competitive Integrity

- **Medium-High**. Everyone plays. Timing matches standard courts.
- **Asymmetry**: Players on the rotating side (D/E or E/F) only contribute to one game track. This is offset by the randomization of roles across rounds.
- **Ranking**: Players are ranked 1st through 5th (or 6th) on their court by total points, then diff, then playerId — same formula as 4-player courts.

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

| Approach | 20p Rounds | 24p Rounds | 28p Rounds | 36p Rounds |
|----------|-----------|-----------|-----------|-----------|
| Old: Cut to 16 | 4 | 4 | 4 | N/A |
| New: Recursive | 4 | 4 | 4 | 5 |

The recursive approach produces the same result for 20/24/28 players but generalizes to any court count.

---

## Timing Comparison Summary

| Approach | Round Time | Setup Complexity | Player Satisfaction |
|----------|-----------|------------------|---------------------|
| Adjust court count (any N) | ~45-60 min | Low | High |
| Mixed 4p + 3p courts | ~45-60 min | Medium | Medium-High |
| 5/6p parallel games | ~45-60 min | Medium | Medium-High |

---

## Recommendations by Player Count

### Preseed Format (Now Works for ALL Court Counts)

| Players | Courts | Rounds | Method |
|---------|--------|--------|--------|
| 8       | 2      | 2      | Recursive: 2→1+1 |
| 12      | 3      | 3      | Recursive: 3→2+1, 2→1+1 |
| 16      | 4      | 3      | Recursive: 4→2+2, 2→1+1 |
| 20      | 5      | 4      | Recursive: 5→4+1, 4→2+2, 2→1+1 |
| 24      | 6      | 4      | Recursive: 6→4+2, 4→2+2, 2→1+1 |
| 28      | 7      | 4      | Recursive: 7→4+3, 4→2+2, 3→2+1 |
| 32      | 8      | 4      | Recursive: 8→4+4, 4→2+2, 2→1+1 |
| 36      | 9      | 5      | Recursive: 9→8+1, 8→4+4, 4→2+2, 2→1+1 |
| 40      | 10     | 5      | Recursive: 10→8+2, ... |
| 44      | 11     | 5      | Recursive: 11→8+3, ... |
| 48      | 12     | 5      | Recursive: 12→8+4, ... |
| 52      | 13     | 5      | Recursive: 13→8+5, ... |
| 56      | 14     | 5      | Recursive: 14→8+6, ... |
| 60      | 15     | 5      | Recursive: 15→8+7, ... |
| 64      | 16     | 5      | Recursive: 16→8+8, 8→4+4, 4→2+2, 2→1+1 |

### Random Seed Format

Random seed is flexible because vertical seeding and the ladder system work for any court count. For any player count 8-64:
- Clean multiples of 4: standard courts, ladder redistribution
- With leftovers: use Option B (mixed) or Option D (parallel) for the remainder

### Decision Tree

```
How many players registered?
│
├─ < 8 → CANCEL TOURNAMENT
│
├─ 8-64 (multiple of 4) → Standard N-court tournament
│   ├─ Random Seed: N rounds configurable
│   └─ Preseed: Recursive splitting, rounds = log2(N)+1 (approx)
│
├─ 8-64 (not multiple of 4) → Handle leftovers
│   ├─ Default strategy: Option B (mixed) or Option D (parallel)
│   ├─ Per-round override available
│   ├─ Random Seed: Vertical seeding + ladder
│   └─ Preseed: Recursive splitting (incomplete courts are always bottom)
│
└─ > 64 → Too many players, split into multiple tournaments
```
