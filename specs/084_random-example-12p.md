# Random Seed Example: 12 Players (3 Courts, 4 Rounds)

## Overview

12 players on 3 courts. `calculateRoundCount(3, 'random-seed') = 4` rounds.

```
Round 1:    [C1] [C2] [C3]        (random shuffle)
              ↓
Round 2:    [C1] [C2] [C3]        (vertical seed: flatten by rank → fill top-to-bottom)
              ↓
Round 3:    [C1] [C2] [C3]        (ladder: 1st/2nd up, 3rd/4th down)
              ↓
Round 4:    [C1] [C2] [C3]        (ladder: 1st/2nd up, 3rd/4th down) → Final
```

No bracket splitting. All courts active every round.

---

## Round 1: Random Shuffle

Players assigned randomly. Seed points irrelevant for random format.

### Round 1 Courts

| Court 1 | Court 2 | Court 3 |
| ------- | ------- | ------- |
| A       | B       | C       |
| F       | E       | D       |
| G       | H       | I       |
| L       | K       | J       |

---

## Round 1 Results

| Court 1  | Court 2  | Court 3  |
| -------- | -------- | -------- |
| 1. A +24 | 1. B +18 | 1. D +16 |
| 2. F +8  | 2. E +14 | 2. C +12 |
| 3. G −6  | 3. H −2  | 3. I +4  |
| 4. L −26 | 4. K −22 | 4. J −8  |

---

## Round 1 → Round 2: Vertical Seeding

Collect all players by finish position, sort each tier by points (desc), flatten into one list, fill courts top-to-bottom.

### Tier assembly

```
1sts (sorted by points): A(+24), B(+18), D(+16)
2nds (sorted by points): E(+14), C(+12), F(+8)
3rds (sorted by points): I(+4), H(−2), G(−6)
4ths (sorted by points): J(−8), K(−22), L(−26)
```

### Flattened list

```
[A, B, D, E, C, F, I, H, G, J, K, L]
```

### Fill courts sequentially (4 per court)

| Court 1 (top) | Court 2 (mid) | Court 3 (bottom) |
| ------------- | ------------- | ---------------- |
| A (1st)       | C (2nd)       | G (3rd)          |
| B (1st)       | F (2nd)       | J (4th)          |
| D (1st)       | I (3rd)       | K (4th)          |
| E (2nd)       | H (3rd)       | L (4th)          |

Court 1 gets the 3 winners plus the best 2nd-place player. Court 3 gets the 3 worst players plus the best 3rd-place.

---

## Round 2 Results

| Court 1  | Court 2  | Court 3 |
| -------- | -------- | ------- |
| 1. A +20 | 1. I +16 | 1. H +8 |
| 2. B +10 | 2. C +4  | 2. K +2 |
| 3. D −8  | 3. F −2  | 3. G −6 |
| 4. E −22 | 4. J −18 | 4. L −4 |

---

## Round 2 → Round 3: Ladder Redistribution

1st and 2nd move up (or stay on top court), 3rd and 4th move down (or stay on bottom court).

```
Court 1 ← C1[1st+2nd] + C2[1st+2nd]  →  A, B, I, C
Court 2 ← C1[3rd+4th] + C3[1st+2nd]  →  D, E, H, K
Court 3 ← C2[3rd+4th] + C3[3rd+4th]  →  F, J, G, L
```

### Round 3 Courts

| Court 1      | Court 2  | Court 3      |
| ------------ | -------- | ------------ |
| A (C1 stays) | D (C1 ↓) | F (C2 ↓)     |
| B (C1 stays) | E (C1 ↓) | J (C2 ↓)     |
| I (C2 ↑)     | H (C3 ↑) | G (C3 stays) |
| C (C2 ↑)     | K (C3 ↑) | L (C3 stays) |

---

## Round 3 Results

| Court 1  | Court 2  | Court 3 |
| -------- | -------- | ------- |
| 1. A +22 | 1. H +14 | 1. K +6 |
| 2. I +12 | 2. D +4  | 2. F +2 |
| 3. C +2  | 3. E −6  | 3. G −4 |
| 4. B −36 | 4. J −12 | 4. L −4 |

---

## Round 3 → Round 4: Ladder Redistribution

```
Court 1 ← C1[1st+2nd] + C2[1st+2nd]  →  A, I, H, D
Court 2 ← C1[3rd+4th] + C3[1st+2nd]  →  C, B, K, F
Court 3 ← C2[3rd+4th] + C3[3rd+4th]  →  E, J, G, L
```

### Round 4 Courts (Final Round)

| Court 1      | Court 2  | Court 3      |
| ------------ | -------- | ------------ |
| A (C1 stays) | C (C1 ↓) | E (C2 ↓)     |
| I (C1 stays) | B (C1 ↓) | J (C2 ↓)     |
| H (C2 ↑)     | K (C3 ↑) | G (C3 stays) |
| D (C2 ↑)     | F (C3 ↑) | L (C3 stays) |

---

## Round 4 Results (Final Standings)

| Court 1  | Court 2  | Court 3 |
| -------- | -------- | ------- |
| 1. A +18 | 1. K +10 | 1. G +6 |
| 2. H +14 | 2. D +8  | 2. F +2 |
| 3. I +4  | 3. C +0  | 3. E −8 |
| 4. B −36 | 4. J −18 | 4. L −4 |

---

## Final Standings

Champion determined by final court position:

| Rank | Player | Final Court | Position |
| ---- | ------ | ----------- | -------- |
| 1st  | **A**  | Court 1     | 1st      |
| 2nd  | H      | Court 1     | 2nd      |
| 3rd  | I      | Court 1     | 3rd      |
| 4th  | B      | Court 1     | 4th      |
| 5th  | K      | Court 2     | 1st      |
| 6th  | D      | Court 2     | 2nd      |
| 7th  | C      | Court 2     | 3rd      |
| 8th  | J      | Court 2     | 4th      |
| 9th  | G      | Court 3     | 1st      |
| 10th | F      | Court 3     | 2nd      |
| 11th | E      | Court 3     | 3rd      |
| 12th | L      | Court 3     | 4th      |

---

## Key Observations

1. **Vertical seeding is a flatten-fill**: All players ranked by finish position (1sts first, then 2nds, etc.), sorted by points within each tier, then courts filled top-to-bottom. Court 1 gets the strongest players.

2. **3-court vertical seeding has cross-tier mixing**: With 3 courts of 4, Court 1 gets 3 winners + the best 2nd, Court 3 gets 3 worst + best 3rd. Not pure tier separation like 16p.

3. **Ladder is simple**: 1st/2nd move up, 3rd/4th move down. Court 1 keeps its top 2, Court 3 keeps its bottom 2.

4. **Always 4 rounds**: Regardless of court count.

5. **Champion = final Court 1 position**, not aggregate points.
