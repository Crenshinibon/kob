# Preseed Example: 16 Players (4 Courts, 3 Rounds)

## Overview

16 players on 4 courts. `calculateRoundCount(4, 'preseed') = floor(log2(4-1)) + 2 = 3` rounds.

The bracket tree:

```
Round 1:    [C1] [C2] [C3] [C4]     (all equal, snake seeding)
              ↓
Round 2:    [W1] [W2] | [L1] [L2]  (splitSize(4)=2 → 2W+2L, origin mixing)
              ↓          ↓
Round 3:  [F] [L(W)] | [TL] [BL]   (each bracket halves: 2→1F+1L(W), 2→1TL+1BL)
```

Each 2-court bracket in R2 halves to 1+1 in R3. The winner bracket produces the final court (F) and a loser-of-winners court (L(W)). The loser bracket produces a top-consolation (TL) and bottom-consolation (BL) court.

---

## Round 1: Snake Seeding

Seed order: A(1600), B(1500), C(1400), D(1300), E(1200), F(1100), G(1000), H(900), I(800), J(700), K(600), L(500), M(400), N(300), O(200), P(100)

| Position             | Direction | Court 1 | Court 2 | Court 3 | Court 4 |
| -------------------- | --------- | ------- | ------- | ------- | ------- |
| pos 0 (top seeds)    | fwd       | A(1600) | B(1500) | C(1400) | D(1300) |
| pos 1 (second seeds) | rev       | H(900)  | G(1000) | F(1100) | E(1200) |
| pos 2 (third seeds)  | fwd       | I(800)  | J(700)  | K(600)  | L(500)  |
| pos 3 (bottom seeds) | rev       | P(100)  | O(200)  | N(300)  | M(400)  |

### Round 1 Courts

| Court 1 | Court 2 | Court 3 | Court 4 |
| ------- | ------- | ------- | ------- |
| A(1600) | B(1500) | C(1400) | D(1300) |
| H(900)  | G(1000) | F(1100) | E(1200) |
| I(800)  | J(700)  | K(600)  | L(500)  |
| P(100)  | O(200)  | N(300)  | M(400)  |

---

## Round 1 Results

| Court 1  | Court 2  | Court 3  | Court 4  |
| -------- | -------- | -------- | -------- |
| 1. A +24 | 1. B +20 | 1. C +18 | 1. E +16 |
| 2. H +8  | 2. J +10 | 2. F +12 | 2. D +14 |
| 3. I −12 | 3. G −6  | 3. N −10 | 3. L −8  |
| 4. P −20 | 4. O −24 | 4. K −20 | 4. M −22 |

---

## Round 1 → Round 2: First Split (isFirstSplit=true)

Flat redistribution: build global tiers, `splitSize(4)=2`, origin mixing.

### Tiers

**1sts:** A(C1,+24), B(C2,+20), C(C3,+18), E(C4,+16) → **A, B, C, E**
**2nds:** D(C4,+14), F(C3,+12), J(C2,+10), H(C1,+8) → **D, F, J, H**
**3rds:** G(C2,−6), L(C4,−8), N(C3,−10), I(C1,−12) → **G, L, N, I**
**4ths:** K(C3,−20), P(C1,−20), M(C4,−22), O(C2,−24) → **K, P, M, O**

### Flatten & split

```
[A(C1), B(C2), C(C3), E(C4), D(C4), F(C3), J(C2), H(C1), G(C2), L(C4), N(C3), I(C1), K(C3), P(C1), M(C4), O(C2)]
```

`splitSize(4)=2` → **2 winner courts** (8 slots), **2 loser courts** (8 slots)

**Winners** (top 8): `[A(C1), B(C2), C(C3), E(C4), D(C4), F(C3), J(C2), H(C1)]`
**Losers** (bottom 8): `[G(C2), L(C4), N(C3), I(C1), K(C3), P(C1), M(C4), O(C2)]`

### Origin mixing (Winners → 2 courts)

| Player (origin) | Decision                   | Court 1            | Court 2            |
| --------------- | -------------------------- | ------------------ | ------------------ |
| A (C1)          | → C1                       | {C1}               | {}                 |
| B (C2)          | → C2                       | {C1}               | {C2}               |
| C (C3)          | tie → C1                   | {C1,C3}            | {C2}               |
| E (C4)          | C2 load 1 < C1 load 2 → C2 | {C1,C3}            | {C2,C4}            |
| D (C4)          | C2 has C4 → skip → C1      | {C1,C3,C4}         | {C2,C4}            |
| F (C3)          | C1 has C3 → skip → C2      | {C1,C3,C4}         | {C2,C4,C3}         |
| J (C2)          | C2 has C2 → skip → C1      | {C1,C3,C4,C2} full | {C2,C4,C3}         |
| H (C1)          | C1 has C1 → skip → C2      | full               | {C2,C4,C3,C1} full |

**Winner courts:**
| Court 1 (W) | Court 2 (W) |
| A (C1) | B (C2) |
| C (C3) | E (C4) |
| D (C4) | F (C3) |
| J (C2) | H (C1) |

**Loser distribution** (8 players → 2 courts, same algorithm). Result:

**Loser courts:**
| Court 3 (L) | Court 4 (L) |
| G (C2) | L (C4) |
| N (C3) | I (C1) |
| P (C1) | K (C3) |
| M (C4) | O (C2) |

### Round 2 Courts

| Court 1 (W) | Court 2 (W) | Court 3 (L) | Court 4 (L) |
| :---------: | :---------: | :---------: | :---------: |
|   A (C1)    |   B (C2)    |   G (C2)    |   L (C4)    |
|   C (C3)    |   E (C4)    |   N (C3)    |   I (C1)    |
|   D (C4)    |   F (C3)    |   P (C1)    |   K (C3)    |
|   J (C2)    |   H (C1)    |   M (C4)    |   O (C2)    |

---

## Round 2 Results

| Court 1 (W) | Court 2 (W) | Court 3 (L) | Court 4 (L) |
| :---------: | :---------: | :---------: | :---------: |
|  1. C +10   |   1. B +8   |  1. G +12   |  1. L +10   |
|   2. A +6   |   2. H +4   |   2. N +6   |   2. O +4   |
|   3. D −2   |   3. E −2   |   3. M −8   |   3. I −6   |
|  4. J −14   |  4. F −10   |  4. P −10   |   4. K −8   |

---

## Round 2 → Round 3: Subsequent Split (isFirstSplit=false)

All 4 courts redistribute together by finish position (`splitSize(4)=2` → 2 top + 2 bottom courts).

**1sts+2nds from all courts → Courts 1–2** (origin mixing):
1sts: G(C3,+12), C(W1,+10), L(L4,+10), B(W2,+8)
2nds: A(W1,+6), N(L3,+6), H(W2,+4), O(L4,+4)

**3rds+4ths from all courts → Courts 3–4** (origin mixing):
3rds: D(W1,−2), E(W2,−2), I(L4,−6), M(L3,−8)
4ths: K(L4,−8), F(W2,−10), P(L3,−10), J(W1,−14)

### Round 3 Courts (Final Round)

| Court 1 (F) | Court 2 (L(W)) | Court 3 (TL) | Court 4 (BL) |
| :---------: | :------------: | :----------: | :----------: |
|   G (L3)    |     C (W1)     |    D (W1)    |    E (W2)    |
|   L (L4)    |     B (W2)     |    I (L4)    |    M (L3)    |
|   A (W1)    |     N (L3)     |    F (W2)    |    K (L4)    |
|   H (W2)    |     O (L4)     |    P (L3)    |    J (W1)    |

---

## Round 3 Results (Final Standings)

| Court 1 (F) | Court 2 (L(W)) | Court 3 (TL) | Court 4 (BL) |
| :---------: | :------------: | :----------: | :----------: |
|  1. B +10   |    5. D +8     |   9. G +12   |   13. I +8   |
|   2. A +8   |    6. E +2     |   10. N +6   |   14. K +2   |
|   3. C −2   |    7. J −4     |   11. L −4   |   15. M −2   |
|  4. H −16   |    8. F −6     |  12. O −14   |   16. P −8   |

---

## Final Standings

| Rank | Player | Final Court | Position |
| :--: | :----: | :---------: | :------: |
| 1st  | **B**  |   Court 1   |   1st    |
| 2nd  |   A    |   Court 1   |   2nd    |
| 3rd  |   C    |   Court 1   |   3rd    |
| 4th  |   H    |   Court 1   |   4th    |
| 5th  |   D    |   Court 2   |   1st    |
| 6th  |   E    |   Court 2   |   2nd    |
| 7th  |   J    |   Court 2   |   3rd    |
| 8th  |   F    |   Court 2   |   4th    |
| 9th  |   G    |   Court 3   |   1st    |
| 10th |   N    |   Court 3   |   2nd    |
| 11th |   L    |   Court 3   |   3rd    |
| 12th |   O    |   Court 3   |   4th    |
| 13th |   I    |   Court 4   |   1st    |
| 14th |   K    |   Court 4   |   2nd    |
| 15th |   M    |   Court 4   |   3rd    |
| 16th |   P    |   Court 4   |   4th    |

---

## Key Observations

1. **Each bracket halves independently**: The winner bracket (2 courts) → 1 final + 1 L(W). The loser bracket (2 courts) → 1 TL + 1 BL. Total still 4 courts, but the winner bracket shrinks.

2. **`splitSize(4)=2` produces balanced brackets**: Unlike 12p (2W+1L), 16p has equal-sized winner and loser brackets (2 each).

3. **Origin mixing is first-split only**: R1→R2 uses origin mixing across all 4 courts. R2→R3 doesn't — each bracket re-ranks internally, and the tier-based split naturally separates 1sts from 2nds.

4. **Re-ranking within brackets**: In R2→R3, the winner bracket re-ranks players across its 2 courts. C (1st on W1) and B (1st on W2) become the top 2 in the final. H (2nd on W2) drops below A (2nd on W1) in the re-ranking.

5. **The champion is determined solely by final Court 1 position**, not by aggregate points across rounds.
