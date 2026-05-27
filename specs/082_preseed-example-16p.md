# Preseed Example: 16 Players (4 Courts, 3 Rounds)

## Overview

16 players is the most common preseed tournament size. With 4 courts, `splitSize(4) = 2` (4 is a power of 2, so `4/2 = 2`). Every round produces **2 winner courts + 2 loser courts**, with the top 8 players in winners and bottom 8 in losers.

`calculateRoundCount(4, 'preseed')` = `Math.floor(log2(4-1)) + 2` = `Math.floor(1.585) + 2` = 3 rounds.

---

## Round 1: Snake Seeding

Players sorted by seed points (descending), then distributed via snake pattern across 4 standard courts.

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

## Round 1 Results (after scoring)

Each court plays 3 matches (A&B vs C&D, A&C vs B&D, A&D vs B&C). Scores shown as total points (+/− differential) for the round.

| Court 1  | Court 2  | Court 3  | Court 4  |
| -------- | -------- | -------- | -------- |
| 1. A +24 | 1. B +20 | 1. C +18 | 1. E +16 |
| 2. H +8  | 2. J +10 | 2. F +12 | 2. D +14 |
| 3. I −12 | 3. G −6  | 3. N −10 | 3. L −8  |
| 4. P −20 | 4. O −24 | 4. K −20 | 4. M −22 |

---

## Round 1 → Round 2: Preseed Redistribution

### Step 1: Group by finish tier

**Tier 1 (1st places):** A(C1,+24), B(C2,+20), C(C3,+18), E(C4,+16)
→ Sorted by points: **A, B, C, E**

**Tier 2 (2nd places):** H(C1,+8), J(C2,+10), F(C3,+12), D(C4,+14)
→ Sorted by points: **D(+14), F(+12), J(+10), H(+8)**

**Tier 3 (3rd places):** I(C1,−12), G(C2,−6), N(C3,−10), L(C4,−8)
→ Sorted by points: **G(−6), L(−8), N(−10), I(−12)**

**Tier 4 (4th places):** P(C1,−20), O(C2,−24), K(C3,−20), M(C4,−22)
→ Sorted by diff, then playerId: **K(−20)**, **P(−20)**, (both −20, tiebreak by id), then **M(−22)**, **O(−24)**
→ **K, P, M, O**

### Step 2: Flatten tiers

```
[A(C1), B(C2), C(C3), E(C4), D(C4), F(C3), J(C2), H(C1), G(C2), L(C4), N(C3), I(C1), K(C3), P(C1), M(C4), O(C2)]
```

### Step 3: Split into brackets

`splitSize(4) = 2` → 2 winner courts, 2 loser courts.
Winner slots = 2 × 4 = **8 slots**. Loser slots = 2 × 4 = **8 slots**.

**Winner bracket** (top 8): `[A(C1), B(C2), C(C3), E(C4), D(C4), F(C3), J(C2), H(C1)]`
**Loser bracket** (bottom 8): `[G(C2), L(C4), N(C3), I(C1), K(C3), P(C1), M(C4), O(C2)]`

### Step 4: Distribute within brackets (origin mixing)

The `distributeMixed` algorithm assigns players to courts greedily:

1. Prefer a court that doesn't already have a player from the same origin court
2. Among those, pick the least-loaded court (tie → lowest index)
3. If all courts have the origin, fall back to least-loaded court

**Winner distribution** (8 players → 2 courts):

| Player (origin) | Decision                              | Court 1 load | Court 1 origins | Court 2 load | Court 2 origins |
| --------------- | ------------------------------------- | :----------: | :-------------: | :----------: | :-------------: |
| A (C1)          | Both empty, tie → C1                  |      1       |      {C1}       |      0       |       {}        |
| B (C2)          | C2 empty, C1 has 1 ≠ 2 → C2           |      1       |      {C1}       |      1       |      {C2}       |
| C (C3)          | Both load 1, neither has C3, tie → C1 |      2       |     {C1,C3}     |      1       |      {C2}       |
| E (C4)          | C2 load 1 < C1 load 2, C2 no C4 → C2  |      2       |     {C1,C3}     |      2       |     {C2,C4}     |
| D (C4)          | C2 has C4 → skip, C1 no C4 → C1       |      3       |   {C1,C3,C4}    |      2       |     {C2,C4}     |
| F (C3)          | C1 has C3 → skip, C2 no C3 → C2       |      3       |   {C1,C3,C4}    |      3       |   {C2,C4,C3}    |
| J (C2)          | C2 has C2 → skip, C1 no C2 → C1       |      4       |  {C1,C3,C4,C2}  |      3       |   {C2,C4,C3}    |
| H (C1)          | C1 has C1 → skip, C2 no C1 → C2       |      4       |      full       |      4       |  {C2,C4,C3,C1}  |

**Winner courts:**
| Court 1 (W) | Court 2 (W) |
|:-----------:|:-----------:|
| A (origin C1) | B (origin C2) |
| C (origin C3) | E (origin C4) |
| D (origin C4) | F (origin C3) |
| J (origin C2) | H (origin C1) |

**Origin mixing verified:** No two players from the same R1 court appear on the same R2 winner court.

- A(C1) & H(C1) → different courts ✓
- B(C2) & J(C2) → different courts ✓
- C(C3) & F(C3) → different courts ✓
- D(C4) & E(C4) → different courts ✓

**Loser distribution** (8 players → 2 courts):

| Player (origin) | Decision                                             |   Court 3 origins    |   Court 4 origins    |
| --------------- | ---------------------------------------------------- | :------------------: | :------------------: |
| G (C2)          | Tie → C3                                             |         {C2}         |          {}          |
| L (C4)          | C4 empty → C4                                        |         {C2}         |         {C4}         |
| N (C3)          | C3 load 1 < C4 load 1, tie → C3                      |       {C2,C3}        |         {C4}         |
| I (C1)          | C4 load 1 < C3 load 2 → C4                           |       {C2,C3}        |       {C4,C1}        |
| K (C3)          | C3 has C3 → skip, C4 no C3? C4={C4,C1} no C3 → C4    |       {C2,C3}        |      {C4,C1,C3}      |
| P (C1)          | C3 no C1 ✓, C4 has C1 → skip. Load: C3=2 < C4=3 → C3 |      {C2,C3,C1}      |      {C4,C1,C3}      |
| M (C4)          | C3 no C4 ✓, C4 has C4 → skip → C3                    |    {C2,C3,C1,C4}     |      {C4,C1,C3}      |
| O (C2)          | C3 has C2 → skip, C4 no C2 → C4                      | {C2,C3,C1,C4} (full) | {C4,C1,C3,C2} (full) |

**Loser courts:**
| Court 3 (L) | Court 4 (L) |
|:-----------:|:-----------:|
| G (origin C2) | L (origin C4) |
| N (origin C3) | I (origin C1) |
| P (origin C1) | K (origin C3) |
| M (origin C4) | O (origin C2) |

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

## Round 2 → Round 3: Preseed Redistribution

### Step 1: Group by finish tier

**Tier 1 (1sts):** C(W1,+10), B(W2,+8), G(L3,+12), L(L4,+10)
→ Sort by points: G(+12), then C(+10) = L(+10) tied, C.id < L.id → C, L. Then B(+8).
→ **G(L3), C(W1), L(L4), B(W2)**

**Tier 2 (2nds):** A(W1,+6), H(W2,+4), N(L3,+6), O(L4,+4)
→ Sort by points: A(+6) = N(+6) tied, A.id < N.id → A, N. Then H(+4) = O(+4) tied, H.id < O.id → H, O.
→ **A(W1), N(L3), H(W2), O(L4)**

**Tier 3 (3rds):** D(W1,−2), E(W2,−2), M(L3,−8), I(L4,−6)
→ Sort by points: D(−2) = E(−2) tied, D.id < E.id → D, E. Then I(−6), M(−8).
→ **D(W1), E(W2), I(L4), M(L3)**

**Tier 4 (4ths):** J(W1,−14), F(W2,−10), P(L3,−10), K(L4,−8)
→ Sort by points: K(−8), then F(−10) = P(−10) tied, F.id < P.id → F, P. Then J(−14).
→ **K(L4), F(W2), P(L3), J(W1)**

### Step 2: Flatten tiers

```
[G(L3), C(W1), L(L4), B(W2), A(W1), N(L3), H(W2), O(L4), D(W1), E(W2), I(L4), M(L3), K(L4), F(W2), P(L3), J(W1)]
```

### Step 3: Split into brackets

`splitSize(4) = 2` → 2 winner courts, 2 loser courts.
Winner slots = 8, Loser slots = 8.

**Winner bracket** (top 8): `[G(L3), C(W1), L(L4), B(W2), A(W1), N(L3), H(W2), O(L4)]`
**Loser bracket** (bottom 8): `[D(W1), E(W2), I(L4), M(L3), K(L4), F(W2), P(L3), J(W1)]`

### Step 4: Distribute with origin mixing

**Winner distribution** (8 → 2 courts):

| Player (origin) | Decision                                           |   Court 1 origins    |   Court 2 origins    |
| --------------- | -------------------------------------------------- | :------------------: | :------------------: |
| G (L3)          | Tie → C1                                           |         {L3}         |          {}          |
| C (W1)          | C2 empty → C2                                      |         {L3}         |         {W1}         |
| L (L4)          | C1 no L4 ✓, C2 no L4 ✓, load 1 tie → C1            |       {L3,L4}        |         {W1}         |
| B (W2)          | C1 no W2 ✓, C2 no W2 ✓, C2 load 1 < C1 load 2 → C2 |       {L3,L4}        |       {W1,W2}        |
| A (W1)          | C2 has W1 → skip, C1 no W1 → C1                    |      {L3,L4,W1}      |       {W1,W2}        |
| N (L3)          | C1 has L3 → skip, C2 no L3 → C2                    |      {L3,L4,W1}      |      {W1,W2,L3}      |
| H (W2)          | C1 no W2 ✓, C2 has W2 → skip → C1                  |    {L3,L4,W1,W2}     |      {W1,W2,L3}      |
| O (L4)          | C1 has L4 → skip, C2 no L4 → C2                    | {L3,L4,W1,W2} (full) | {W1,W2,L3,L4} (full) |

**Loser distribution** (8 → 2 courts):

| Player (origin) | Decision                                             |   Court 3 origins    |   Court 4 origins    |
| --------------- | ---------------------------------------------------- | :------------------: | :------------------: |
| D (W1)          | Tie → C3                                             |         {W1}         |          {}          |
| E (W2)          | C4 empty → C4                                        |         {W1}         |         {W2}         |
| I (L4)          | C3 load 1 = C4 load 1, tie → C3                      |       {W1,L4}        |         {W2}         |
| M (L3)          | C4 load 1 < C3 load 2 → C4                           |       {W1,L4}        |       {W2,L3}        |
| K (L4)          | C3 has L4 → skip, C4 no L4 → C4                      |       {W1,L4}        |      {W2,L3,L4}      |
| F (W2)          | C4 has W2 → skip, C3 no W2 → C3 (load 2 = C4 load 3) |      {W1,L4,W2}      |      {W2,L3,L4}      |
| P (L3)          | C4 has L3 → skip, C3 no L3 → C3 (load 3 = C4 load 3) |    {W1,L4,W2,L3}     |      {W2,L3,L4}      |
| J (W1)          | C3 has W1 → skip, C4 no W1 ✓ (load 3 < C3 full) → C4 | {W1,L4,W2,L3} (full) | {W2,L3,L4,W1} (full) |

### Round 3 Courts (Final Round)

| Court 1 (W) | Court 2 (W) | Court 3 (L) | Court 4 (L) |
| :---------: | :---------: | :---------: | :---------: |
|   G (L3)    |   C (W1)    |   D (W1)    |   E (W2)    |
|   L (L4)    |   B (W2)    |   I (L4)    |   M (L3)    |
|   A (W1)    |   N (L3)    |   F (W2)    |   K (L4)    |
|   H (W2)    |   O (L4)    |   P (L3)    |   J (W1)    |

---

## Round 3 Results (Final Standings)

Final court finish determines overall ranking. Champions are the top finishers on Court 1.

|   Court 1    | Court 2 |  Court 3  | Court 4  |
| :----------: | :-----: | :-------: | :------: |
| **1. A** +10 | 5. C +8 | 9. D +12  | 13. E +8 |
|   2. B −2    | 6. L +2 | 10. F +4  | 14. K +2 |
|   3. G −4    | 7. N 0  | 11. I −6  | 15. M −4 |
|   4. H −10   | 8. O −2 | 12. P −10 | 16. J −6 |

---

## Final Standings

| Rank | Player | Final Court | Position |
| :--: | :----: | :---------: | :------: |
| 1st  | **A**  |   Court 1   |   1st    |
| 2nd  |   B    |   Court 1   |   2nd    |
| 3rd  |   G    |   Court 1   |   3rd    |
| 4th  |   H    |   Court 1   |   4th    |
| 5th  |   C    |   Court 2   |   1st    |
| 6th  |   L    |   Court 2   |   2nd    |
| 7th  |   N    |   Court 2   |   3rd    |
| 8th  |   O    |   Court 2   |   4th    |
| 9th  |   D    |   Court 3   |   1st    |
| 10th |   F    |   Court 3   |   2nd    |
| 11th |   I    |   Court 3   |   3rd    |
| 12th |   P    |   Court 3   |   4th    |
| 13th |   E    |   Court 4   |   1st    |
| 14th |   K    |   Court 4   |   2nd    |
| 15th |   M    |   Court 4   |   3rd    |
| 16th |   J    |   Court 4   |   4th    |

---

## Key Observations

1. **Consistent bracket structure**: 2 winner + 2 loser courts every round. `splitSize(4) = 2` never changes for a 16-player tournament.

2. **Origin mixing works across all rounds**: In R2, A(C1) and H(C1) go to different winner courts. In R3, G(L3) and N(L3) go to different courts. The constraint holds for every pair from the same previous-round court.

3. **Players move between brackets based on finish**:
   - A and H (R2 winners from C1+C2) stay in the winner bracket for R3.
   - C and G won their R2 loser courts and jumped up to the R3 winner bracket.
   - D and E (R2 3rd-place finishers in losers) dropped to the R3 loser bracket.

4. **Winner takes all**: A came 2nd in R2 (winner court) but won Court 1 in the final round, becoming champion. B came 1st in R2 but finished 2nd in the final round. The champion is determined solely by final court position.

5. **Both brackets are equally sized**: Unlike the 12p example (2W + 1L), 16p produces balanced 2W + 2L brackets, meaning loser-bracket players have a fair chance to advance by winning their court.
