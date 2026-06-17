# Random Seed Example: 16 Players (4 Courts, 4 Rounds)

## Overview

16 players on 4 courts. `calculateRoundCount(4, 'random-seed') = 4` rounds.

```
Round 1:    [C1] [C2] [C3] [C4]     (random shuffle)
              ↓
Round 2:    [C1] [C2] [C3] [C4]     (vertical seed: flatten by rank → fill top-to-bottom)
              ↓
Round 3:    [C1] [C2] [C3] [C4]     (ladder: 1st/2nd up, 3rd/4th down)
              ↓
Round 4:    [C1] [C2] [C3] [C4]     (ladder: 1st/2nd up, 3rd/4th down) → Final
```

---

## Round 1: Random Shuffle

**Random order:** A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P

### Round 1 Courts

| Court 1 | Court 2 | Court 3 | Court 4 |
| ------- | ------- | ------- | ------- |
| A       | B       | C       | D       |
| H       | G       | F       | E       |
| I       | J       | K       | L       |
| P       | O       | N       | M       |

---

## Round 1 Results

| Court 1 | Court 2 | Court 3 | Court 4 |
| ------- | ------- | ------- | ------- |
| 1. A +24 | 1. B +20 | 1. C +18 | 1. D +16 |
| 2. H +8  | 2. J +10 | 2. F +12 | 2. E +14 |
| 3. I −12 | 3. G −6  | 3. K −4  | 3. L −8  |
| 4. P −20 | 4. O −24 | 4. N −26 | 4. M −22 |

---

## Round 1 → Round 2: Vertical Seeding

Collect all players by finish position, sort each tier by points (desc), flatten, fill courts sequentially.

### Tier assembly

```
1sts (sorted by points): A(+24), B(+20), C(+18), D(+16)
2nds (sorted by points): F(+12), E(+14), J(+10), H(+8)  → E(+14), F(+12), J(+10), H(+8)
3rds (sorted by points): K(−4), G(−6), L(−8), I(−12)
4ths (sorted by points): P(−20), M(−22), O(−24), N(−26)
```

### Flattened list

```
[A, B, C, D, E, F, J, H, K, G, L, I, P, M, O, N]
```

### Fill courts (4 per court)

With 4 courts × 4 players and exactly 4 players per tier, each tier fills exactly one court:

| Court 1 (1sts) | Court 2 (2nds) | Court 3 (3rds) | Court 4 (4ths) |
| --------------- | --------------- | --------------- | --------------- |
| A (+24)         | E (+14)         | K (−4)          | P (−20)         |
| B (+20)         | F (+12)         | G (−6)          | M (−22)         |
| C (+18)         | J (+10)         | L (−8)          | O (−24)         |
| D (+16)         | H (+8)          | I (−12)         | N (−26)         |

16p is the special case where each tier (4 players) fills exactly one court.

---

## Round 2 Results

| Court 1 | Court 2 | Court 3 | Court 4 |
| ------- | ------- | ------- | ------- |
| 1. A +20 | 1. E +16 | 1. K +6  | 1. P +4  |
| 2. B +12 | 2. F +8  | 2. G +2  | 2. M +2  |
| 3. C −4  | 3. J −2  | 3. L −6  | 3. O −6  |
| 4. D −28 | 4. H −22 | 4. I −2  | 4. N −10 |

---

## Round 2 → Round 3: Ladder Redistribution

```
Court 1 ← C1[1st+2nd] + C2[1st+2nd]  →  A, B, E, F
Court 2 ← C1[3rd+4th] + C3[1st+2nd]  →  C, D, K, G
Court 3 ← C2[3rd+4th] + C4[1st+2nd]  →  J, H, P, M
Court 4 ← C3[3rd+4th] + C4[3rd+4th]  →  L, I, O, N
```

### Round 3 Courts

| Court 1     | Court 2     | Court 3     | Court 4     |
| ----------- | ----------- | ----------- | ----------- |
| A (C1 stays) | C (C1 ↓)    | J (C2 ↓)    | L (C3 ↓)    |
| B (C1 stays) | D (C1 ↓)    | H (C2 ↓)    | I (C3 ↓)    |
| E (C2 ↑)    | K (C3 ↑)    | P (C4 ↑)    | O (C4 stays) |
| F (C2 ↑)    | G (C3 ↑)    | M (C4 ↑)    | N (C4 stays) |

---

## Round 3 Results

| Court 1 | Court 2 | Court 3 | Court 4 |
| ------- | ------- | ------- | ------- |
| 1. A +22 | 1. K +10 | 1. P +8  | 1. O +4  |
| 2. E +14 | 2. C +6  | 2. J +4  | 2. I +2  |
| 3. B +2  | 3. G −4  | 3. M −2  | 3. N −6  |
| 4. F −38 | 4. D −12 | 4. H −10 | 4. L −10 |

---

## Round 3 → Round 4: Ladder Redistribution

```
Court 1 ← C1[1st+2nd] + C2[1st+2nd]  →  A, E, K, C
Court 2 ← C1[3rd+4th] + C3[1st+2nd]  →  B, F, P, J
Court 3 ← C2[3rd+4th] + C4[1st+2nd]  →  G, D, O, I
Court 4 ← C3[3rd+4th] + C4[3rd+4th]  →  M, H, N, L
```

### Round 4 Courts (Final Round)

| Court 1     | Court 2     | Court 3     | Court 4     |
| ----------- | ----------- | ----------- | ----------- |
| A (C1 stays) | B (C1 ↓)    | G (C2 ↓)    | M (C3 ↓)    |
| E (C1 stays) | F (C1 ↓)    | D (C2 ↓)    | H (C3 ↓)    |
| K (C2 ↑)    | P (C3 ↑)    | O (C4 ↑)    | N (C4 stays) |
| C (C2 ↑)    | J (C3 ↑)    | I (C4 ↑)    | L (C4 stays) |

---

## Round 4 Results (Final Standings)

| Court 1 | Court 2 | Court 3 | Court 4 |
| ------- | ------- | ------- | ------- |
| 1. A +18 | 1. P +10 | 1. O +8  | 1. N +4  |
| 2. E +12 | 2. B +6  | 2. I +4  | 2. H +2  |
| 3. K +4  | 3. J −2  | 3. G −6  | 3. M −6  |
| 4. C −34 | 4. F −14 | 4. D −6  | 4. L −8  |

---

## Final Standings

| Rank | Player | Final Court | Position |
| ---- | ------ | ----------- | -------- |
| 1st  | **A**  | Court 1     | 1st      |
| 2nd  | E      | Court 1     | 2nd      |
| 3rd  | K      | Court 1     | 3rd      |
| 4th  | C      | Court 1     | 4th      |
| 5th  | P      | Court 2     | 1st      |
| 6th  | B      | Court 2     | 2nd      |
| 7th  | J      | Court 2     | 3rd      |
| 8th  | F      | Court 2     | 4th      |
| 9th  | O      | Court 3     | 1st      |
| 10th | I      | Court 3     | 2nd      |
| 11th | G      | Court 3     | 3rd      |
| 12th | D      | Court 3     | 4th      |
| 13th | N      | Court 4     | 1st      |
| 14th | H      | Court 4     | 2nd      |
| 15th | M      | Court 4     | 3rd      |
| 16th | L      | Court 4     | 4th      |

---

## Key Observations

1. **16p vertical seeding = perfect tier separation**: Each tier has exactly 4 players, so 1sts→C1, 2nds→C2, 3rds→C3, 4ths→C4. This is a special case — other player counts mix tiers across courts.

2. **Ladder is linear**: With 4 courts, each court only exchanges with its immediate neighbor. The top 2 go up one court, the bottom 2 go down one court.

3. **P's climb**: P went from 4th on C1 in Round 1 → 1st on C4 in Round 2 → C3 in Round 3 → C2 in Round 4. Each round, the top of a lower court climbs one step.

4. **Court 1 is self-reinforcing**: Keeps its own top 2 + pulls top 2 from C2. Once you're on C1 and finish top 2, you stay.

5. **Champion = final Court 1 position**, not aggregate points.