# Random Seed Example: 20 Players (5 Courts, 4 Rounds)

## Overview

20 players on 5 courts. `calculateRoundCount(5, 'random-seed') = 4` rounds.

```
Round 1:    [C1] [C2] [C3] [C4] [C5]     (random shuffle)
              ↓
Round 2:    [C1] [C2] [C3] [C4] [C5]     (vertical seed: flatten by rank → fill top-to-bottom)
              ↓
Round 3:    [C1] [C2] [C3] [C4] [C5]     (ladder: 1st/2nd up, 3rd/4th down)
              ↓
Round 4:    [C1] [C2] [C3] [C4] [C5]     (ladder: 1st/2nd up, 3rd/4th down) → Final
```

---

## Round 1: Random Shuffle

**Random order:** A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T

### Round 1 Courts

| Court 1 | Court 2 | Court 3 | Court 4 | Court 5 |
| ------- | ------- | ------- | ------- | ------- |
| A       | B       | C       | D       | E       |
| J       | I       | H       | G       | F       |
| K       | L       | M       | N       | O       |
| T       | S       | R       | Q       | P       |

---

## Round 1 Results

| Court 1 | Court 2 | Court 3 | Court 4 | Court 5 |
| ------- | ------- | ------- | ------- | ------- |
| 1. A +28 | 1. B +22 | 1. C +20 | 1. D +18 | 1. E +16 |
| 2. J +10 | 2. I +14 | 2. H +12 | 2. G +8  | 2. F +6  |
| 3. K −8  | 3. L −4  | 3. M −2  | 3. N −6  | 3. O −10 |
| 4. T −30 | 4. S −32 | 4. R −30 | 4. Q −20 | 4. P −12 |

---

## Round 1 → Round 2: Vertical Seeding

Collect all players by finish position, sort each tier by points (desc), flatten, fill courts sequentially.

### Tier assembly

```
1sts (sorted by points): A(+28), B(+22), C(+20), D(+18), E(+16)
2nds (sorted by points): I(+14), H(+12), J(+10), G(+8), F(+6)
3rds (sorted by points): M(−2), L(−4), N(−6), K(−8), O(−10)
4ths (sorted by points): P(−12), Q(−20), R(−30), T(−30), S(−32)
```

### Flattened list

```
[A, B, C, D, E, I, H, J, G, F, M, L, N, K, O, P, Q, R, T, S]
```

### Fill courts sequentially (4 per court)

| Court 1 (top)  | Court 2        | Court 3      | Court 4      | Court 5 (bottom) |
| --------------- | --------------- | ------------ | ------------ | ----------------- |
| A (1st, +28)    | E (1st, +16)    | G (2nd, +8)  | N (3rd, −6)  | P (4th, −12)      |
| B (1st, +22)    | I (2nd, +14)    | F (2nd, +6)  | K (3rd, −8)  | Q (4th, −20)      |
| C (1st, +20)    | H (2nd, +12)    | M (3rd, −2)  | O (3rd, −10) | R (4th, −30)      |
| D (1st, +18)    | J (2nd, +10)    | L (3rd, −4)  | ...          | ...               |

Wait — let me fill exactly from the flattened list:

Row 1 (positions 0-3): A, B, C, D → Court 1
Row 2 (positions 4-7): E, I, H, J → Court 2
Row 3 (positions 8-11): G, F, M, L → Court 3
Row 4 (positions 12-15): N, K, O, P → Court 4
Row 5 (positions 16-19): Q, R, T, S → Court 5

| Court 1 | Court 2 | Court 3 | Court 4 | Court 5 |
| ------- | ------- | ------- | ------- | ------- |
| A (1st) | E (1st) | G (2nd) | N (3rd) | Q (4th) |
| B (1st) | I (2nd) | F (2nd) | K (3rd) | R (4th) |
| C (1st) | H (2nd) | M (3rd) | O (3rd) | T (4th) |
| D (1st) | J (2nd) | L (3rd) | P (4th) | S (4th) |

Court 1 gets 4 of 5 winners (the strongest). E (the weakest winner) starts on Court 2. The 4 weakest players end up on Court 5.

---

## Round 2 Results

| Court 1 | Court 2 | Court 3 | Court 4 | Court 5 |
| ------- | ------- | ------- | ------- | ------- |
| 1. A +24 | 1. E +20 | 1. G +10 | 1. P +8  | 1. Q +6  |
| 2. B +18 | 2. I +12 | 2. F +4  | 2. N +4  | 2. R +2  |
| 3. C −6  | 3. H −2  | 3. M −4  | 3. K −8  | 3. T −4  |
| 4. D −36 | 4. J −30 | 4. L −10 | 4. O −4  | 4. S −4  |

---

## Round 2 → Round 3: Ladder Redistribution

```
Court 1 ← C1[1st+2nd] + C2[1st+2nd]  →  A, B, E, I
Court 2 ← C1[3rd+4th] + C3[1st+2nd]  →  C, D, G, F
Court 3 ← C2[3rd+4th] + C4[1st+2nd]  →  H, J, P, N
Court 4 ← C3[3rd+4th] + C5[1st+2nd]  →  M, L, Q, R
Court 5 ← C4[3rd+4th] + C5[3rd+4th]  →  K, O, T, S
```

### Round 3 Courts

| Court 1     | Court 2     | Court 3     | Court 4     | Court 5     |
| ----------- | ----------- | ----------- | ----------- | ----------- |
| A (C1 stays) | C (C1 ↓)    | H (C2 ↓)    | M (C3 ↓)    | K (C4 ↓)    |
| B (C1 stays) | D (C1 ↓)    | J (C2 ↓)    | L (C3 ↓)    | O (C4 ↓)    |
| E (C2 ↑)    | G (C3 ↑)    | P (C4 ↑)    | Q (C5 ↑)    | T (C5 stays) |
| I (C2 ↑)    | F (C3 ↑)    | N (C4 ↑)    | R (C5 ↑)    | S (C5 stays) |

---

## Round 3 Results

| Court 1 | Court 2 | Court 3 | Court 4 | Court 5 |
| ------- | ------- | ------- | ------- | ------- |
| 1. A +26 | 1. G +14 | 1. P +10 | 1. Q +8  | 1. T +6  |
| 2. E +16 | 2. C +8  | 2. N +4  | 2. R +4  | 2. K +2  |
| 3. B +4  | 3. F −2  | 3. H −8  | 3. M −4  | 3. O −8  |
| 4. I −46 | 4. D −20 | 4. J −6  | 4. L −8  | 4. S −10 |

---

## Round 3 → Round 4: Ladder Redistribution

```
Court 1 ← C1[1st+2nd] + C2[1st+2nd]  →  A, E, G, C
Court 2 ← C1[3rd+4th] + C3[1st+2nd]  →  B, I, P, N
Court 3 ← C2[3rd+4th] + C4[1st+2nd]  →  F, D, Q, R
Court 4 ← C3[3rd+4th] + C5[1st+2nd]  →  H, J, T, K
Court 5 ← C4[3rd+4th] + C5[3rd+4th]  →  M, L, O, S
```

### Round 4 Courts (Final Round)

| Court 1     | Court 2     | Court 3     | Court 4     | Court 5     |
| ----------- | ----------- | ----------- | ----------- | ----------- |
| A (C1 stays) | B (C1 ↓)    | F (C2 ↓)    | H (C3 ↓)    | M (C4 ↓)    |
| E (C1 stays) | I (C1 ↓)    | D (C2 ↓)    | J (C3 ↓)    | L (C4 ↓)    |
| G (C2 ↑)    | P (C3 ↑)    | Q (C4 ↑)    | T (C5 ↑)    | O (C5 stays) |
| C (C2 ↑)    | N (C3 ↑)    | R (C4 ↑)    | K (C5 ↑)    | S (C5 stays) |

---

## Round 4 Results (Final Standings)

| Court 1 | Court 2 | Court 3 | Court 4 | Court 5 |
| ------- | ------- | ------- | ------- | ------- |
| 1. A +22 | 1. G +16 | 1. Q +10 | 1. T +8  | 1. O +6  |
| 2. E +14 | 2. P +8  | 2. R +4  | 2. H +4  | 2. K +2  |
| 3. C +2  | 3. N −4  | 3. F −6  | 3. J −4  | 3. M −8  |
| 4. B −38 | 4. I −20 | 4. D −8  | 4. L −8  | 4. S −10 |

---

## Final Standings

| Rank | Player | Final Court | Position |
| ---- | ------ | ----------- | -------- |
| 1st  | **A**  | Court 1     | 1st      |
| 2nd  | E      | Court 1     | 2nd      |
| 3rd  | C      | Court 1     | 3rd      |
| 4th  | B      | Court 1     | 4th      |
| 5th  | G      | Court 2     | 1st      |
| 6th  | P      | Court 2     | 2nd      |
| 7th  | N      | Court 2     | 3rd      |
| 8th  | I      | Court 2     | 4th      |
| 9th  | Q      | Court 3     | 1st      |
| 10th | R      | Court 3     | 2nd      |
| 11th | F      | Court 3     | 3rd      |
| 12th | D      | Court 3     | 4th      |
| 13th | T      | Court 4     | 1st      |
| 14th | H      | Court 4     | 2nd      |
| 15th | J      | Court 4     | 3rd      |
| 16th | L      | Court 4     | 4th      |
| 17th | O      | Court 5     | 1st      |
| 18th | K      | Court 5     | 2nd      |
| 19th | M      | Court 5     | 3rd      |
| 20th | S      | Court 5     | 4th      |

---

## Key Observations

1. **5-court vertical seeding cross-mixes tiers**: With 5 winners and 4 slots per court, the 5th winner (E, weakest) starts on Court 2, not Court 1. Similarly, some 2nd-place players land on Court 3. Tier boundaries don't align with court boundaries.

2. **E's trajectory**: Weakest winner → C2 in R2 → climbs to C1 in R3 after winning C2. Shows that even the "worst 1st" can reach the top court within 2 rounds via ladder.

3. **P's climb through ladder**: 4th place on C4 in R1 → 1st on C4 in R2 → C3 in R3 → C2 in R4. The ladder lets strong players rise one court per round.

4. **5-court ladder is wide**: A player starting on C5 needs 4 strong rounds (with good timing) to reach C1. Realistically, C5 players in R2 cap out around C3 by the final.

5. **Always 4 rounds**: Same as 12p and 16p. Round count is format-dependent, not court-count-dependent.

6. **Champion = final Court 1 position**, not aggregate points.