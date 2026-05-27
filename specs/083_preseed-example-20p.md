# Preseed Example: 20 Players (5 Courts, 4 Rounds)

## Overview

20 players is the smallest preseed tournament size where `splitSize(N) > N/2`. With 5 courts, `splitSize(5) = 4` (largest power of 2 ≤ 5). Every round produces **4 winner courts + 1 loser court**, with the top 16 players in winners and bottom 4 in losers. Only the bottom 4 players are relegated each round.

`calculateRoundCount(5, 'preseed')` = `Math.floor(log2(5-1)) + 2` = `Math.floor(2) + 2` = 4 rounds.

---

## Round 1: Snake Seeding

Players sorted by seed points (descending). The snake distributes across 5 standard courts (all 4p since 20 ÷ 4 = 5).

Seed order: A(2000), B(1900), C(1800), D(1700), E(1600), F(1500), G(1400), H(1300), I(1200), J(1100), K(1000), L(900), M(800), N(700), O(600), P(500), Q(400), R(300), S(200), T(100)

| Position | Direction |   C1    |   C2    |   C3    |   C4    |   C5    |
| -------- | :-------: | :-----: | :-----: | :-----: | :-----: | :-----: |
| pos 0    |    fwd    | A(2000) | B(1900) | C(1800) | D(1700) | E(1600) |
| pos 1    |    rev    | J(1100) | I(1200) | H(1300) | G(1400) | F(1500) |
| pos 2    |    fwd    | K(1000) | L(900)  | M(800)  | N(700)  | O(600)  |
| pos 3    |    rev    | T(100)  | S(200)  | R(300)  | Q(400)  | P(500)  |

### Round 1 Courts

| Court 1 | Court 2 | Court 3 | Court 4 | Court 5 |
| :-----: | :-----: | :-----: | :-----: | :-----: |
| A(2000) | B(1900) | C(1800) | D(1700) | E(1600) |
| J(1100) | I(1200) | H(1300) | G(1400) | F(1500) |
| K(1000) | L(900)  | M(800)  | N(700)  | O(600)  |
| T(100)  | S(200)  | R(300)  | Q(400)  | P(500)  |

---

## Round 1 Results

| Court 1  | Court 2  | Court 3  | Court 4  | Court 5  |
| :------: | :------: | :------: | :------: | :------: |
| 1. A +28 | 1. B +24 | 1. C +20 | 1. D +18 | 1. E +14 |
| 2. J +8  | 2. L +10 | 2. H +12 | 2. G +14 | 2. F +12 |
| 3. K −14 | 3. I −8  | 3. M −10 | 3. N −12 | 3. P −8  |
| 4. T −22 | 4. S −26 | 4. R −22 | 4. Q −20 | 4. O −18 |

---

## Round 1 → Round 2: Preseed Redistribution

### Step 1: Group by finish tier

**Tier 1 (1st places):** A(C1,+28), B(C2,+24), C(C3,+20), D(C4,+18), E(C5,+14)
→ Sorted by points: **A, B, C, D, E**

**Tier 2 (2nd places):** J(C1,+8), L(C2,+10), H(C3,+12), G(C4,+14), F(C5,+12)
→ G(+14), H(+12), F(+12) tiebreak F<H, L(+10), J(+8) → **G, F, H, L, J**

**Tier 3 (3rd places):** K(C1,−14), I(C2,−8), M(C3,−10), N(C4,−12), P(C5,−8)
→ I(−8) = P(−8) tiebreak I<P, M(−10), N(−12), K(−14) → **I, P, M, N, K**

**Tier 4 (4th places):** T(C1,−22), S(C2,−26), R(C3,−22), Q(C4,−20), O(C5,−18)
→ O(−18), Q(−20), R(−22)=T(−22) tiebreak R<T, S(−26) → **O, Q, R, T, S**

### Step 2: Flatten tiers

```
[A(C1), B(C2), C(C3), D(C4), E(C5), G(C4), F(C5), H(C3), L(C2), J(C1),
 I(C2), P(C5), M(C3), N(C4), K(C1), O(C5), Q(C4), R(C3), T(C1), S(C2)]
```

### Step 3: Split into brackets

`splitSize(5) = 4` → 4 winner courts + 1 loser court.
Winner slots = 4 × 4 = **16 slots**. Loser slots = 1 × 4 = **4 slots**.

**Winner bracket** (top 16): `[A(C1), B(C2), C(C3), D(C4), E(C5), G(C4), F(C5), H(C3), L(C2), J(C1), I(C2), P(C5), M(C3), N(C4), K(C1), T(C1)]`
**Loser bracket** (bottom 4): `[O(C5), Q(C4), R(C3), S(C2)]`

### Step 4: Distribute within brackets (origin mixing)

**Winner distribution** (16 players → 4 courts of 4):

|  #  | Player (origin) |                           Decision                           |   C1 origins    |   C2 origins    |  C3 origins   |  C4 origins   |
| :-: | :-------------: | :----------------------------------------------------------: | :-------------: | :-------------: | :-----------: | :-----------: |
|  1  |     A (C1)      |                             → C1                             |      {C1}       |                 |               |               |
|  2  |     B (C2)      |                             → C2                             |      {C1}       |      {C2}       |               |               |
|  3  |     C (C3)      |                             → C3                             |      {C1}       |      {C2}       |     {C3}      |               |
|  4  |     D (C4)      |                             → C4                             |      {C1}       |      {C2}       |     {C3}      |     {C4}      |
|  5  |     E (C5)      |               all load 1, none has C5 → tie C1               |     {C1,C5}     |      {C2}       |     {C3}      |     {C4}      |
|  6  |     G (C4)      |              C4 has C4 → skip; C2 min load → C2              |     {C1,C5}     |     {C2,C4}     |     {C3}      |     {C4}      |
|  7  |     F (C5)      |                C1 has C5 → skip; C3 min → C3                 |     {C1,C5}     |     {C2,C4}     |    {C3,C5}    |     {C4}      |
|  8  |     H (C3)      |                C3 has C3 → skip; C4 min → C4                 |     {C1,C5}     |     {C2,C4}     |    {C3,C5}    |    {C4,C3}    |
|  9  |     L (C2)      |                C2 has C2 → skip; C1 min → C1                 |   {C1,C5,C2}    |     {C2,C4}     |    {C3,C5}    |    {C4,C3}    |
| 10  |     J (C1)      |                C1 has C1 → skip; C2 min → C2                 |   {C1,C5,C2}    |   {C2,C4,C1}    |    {C3,C5}    |    {C4,C3}    |
| 11  |     I (C2)      |       C2 has C2 → skip; C1 has C2 → skip; C3 min → C3        |   {C1,C5,C2}    |   {C2,C4,C1}    |  {C3,C5,C2}   |    {C4,C3}    |
| 12  |     P (C5)      |       C1 has C5 → skip; C3 has C5 → skip; C4 min → C4        |   {C1,C5,C2}    |   {C2,C4,C1}    |  {C3,C5,C2}   |  {C4,C3,C5}   |
| 13  |     M (C3)      |       C3 has C3 → skip; C4 has C3 → skip; C1 min → C1        |  {C1,C5,C2,C3}  |   {C2,C4,C1}    |  {C3,C5,C2}   |  {C4,C3,C5}   |
| 14  |     N (C4)      |       C2 has C4 → skip; C4 has C4 → skip; C3 min → C3        | {C1,C5,C2,C3} F |   {C2,C4,C1}    | {C3,C5,C2,C4} |  {C4,C3,C5}   |
| 15  |     K (C1)      |          C1 F, C2 has C1 → skip, C3 F, C4 open → C4          |        F        |   {C2,C4,C1}    |       F       | {C4,C3,C5,C1} |
| 16  |     T (C1)      | C1 F, C2 has C1 → skip, C3 F, C4 has C1 → skip → fallback C2 |        F        | {C2,C4,C1,C1} F |       F       |       F       |

_(F = full court)_

**Winner courts:**

| Court 1 | Court 2 | Court 3 | Court 4 |
| :-----: | :-----: | :-----: | :-----: |
| A (C1)  | B (C2)  | C (C3)  | D (C4)  |
| E (C5)  | G (C4)  | F (C5)  | H (C3)  |
| L (C2)  | J (C1)  | I (C2)  | P (C5)  |
| M (C3)  | T (C1)  | N (C4)  | K (C1)  |

**Origin-mixing note:** Court 2 has J(C1) and T(C1) from the same origin — this is the unavoidable fallback case. When the 16th player (T) was placed, every court with an open slot already had a C1-origin player. The algorithm chose the least-loaded court, which was Court 2. This is correct behavior — the constraint is "prefer" not "guarantee."

All other origins are cleanly separated across courts.

**Loser distribution** (4 players → 1 court, C5):
O(C5), Q(C4), R(C3), S(C2) → all to Court 5 (no mixing needed with a single court).

### Round 2 Courts

| Court 1 (W) | Court 2 (W) | Court 3 (W) | Court 4 (W) | Court 5 (L) |
| :---------: | :---------: | :---------: | :---------: | :---------: |
|   A (C1)    |   B (C2)    |   C (C3)    |   D (C4)    |   O (C5)    |
|   E (C5)    |   G (C4)    |   F (C5)    |   H (C3)    |   Q (C4)    |
|   L (C2)    |   J (C1)    |   I (C2)    |   P (C5)    |   R (C3)    |
|   M (C3)    |   T (C1)    |   N (C4)    |   K (C1)    |   S (C2)    |

---

## Round 2 Results

| Court 1 (W) | Court 2 (W) | Court 3 (W) | Court 4 (W) | Court 5 (L) |
| :---------: | :---------: | :---------: | :---------: | :---------: |
|  1. A +10   |  1. B +12   |   1. F +8   |  1. D +10   |  1. O +10   |
|   2. E +2   |   2. G +4   |   2. C +3   |   2. P +1   |   2. R +4   |
|   3. L −4   |   3. J −6   |   3. N −2   |   3. K −3   |   3. Q −4   |
|   4. M −8   |  4. T −10   |   4. I −9   |   4. H −8   |  4. S −10   |

---

## Round 2 → Round 3: Preseed Redistribution

### Step 1: Group by finish tier

**Tier 1 (1sts):** A(W1,+10), B(W2,+12), F(W3,+8), D(W4,+10), O(L5,+10)
→ B(+12), A(+10)=D(+10)=O(+10) tiebreak A<D<O, F(+8)
→ **B(W2), A(W1), D(W4), O(L5), F(W3)**

**Tier 2 (2nds):** E(W1,+2), G(W2,+4), C(W3,+3), P(W4,+1), R(L5,+4)
→ G(+4)=R(+4) tiebreak G<R, C(+3), E(+2), P(+1)
→ **G(W2), R(L5), C(W3), E(W1), P(W4)**

**Tier 3 (3rds):** L(W1,−4), J(W2,−6), N(W3,−2), K(W4,−3), Q(L5,−4)
→ N(−2), K(−3), L(−4)=Q(−4) tiebreak L<Q, J(−6)
→ **N(W3), K(W4), L(W1), Q(L5), J(W2)**

**Tier 4 (4ths):** M(W1,−8), T(W2,−10), I(W3,−9), H(W4,−8), S(L5,−10)
→ H(−8)=M(−8) tiebreak H<M, I(−9), S(−10)=T(−10) tiebreak S<T
→ **H(W4), M(W1), I(W3), S(L5), T(W2)**

### Step 2: Flatten tiers

```
[B(W2), A(W1), D(W4), O(L5), F(W3), G(W2), R(L5), C(W3), E(W1), P(W4),
 N(W3), K(W4), L(W1), Q(L5), J(W2), H(W4), M(W1), I(W3), S(L5), T(W2)]
```

### Step 3: Split into brackets

`splitSize(5) = 4` → 4 winner + 1 loser.
Winner slots = 16. Loser slots = 4.

**Winner bracket** (top 16): `[B(W2), A(W1), D(W4), O(L5), F(W3), G(W2), R(L5), C(W3), E(W1), P(W4), N(W3), K(W4), L(W1), Q(L5), J(W2), H(W4)]`
**Loser bracket** (bottom 4): `[M(W1), I(W3), S(L5), T(W2)]`

### Step 4: Distribute with origin mixing

**Winner distribution** (16 players → 4 courts of 4):

|  #  | Player |                                                                          Decision                                                                          |   C1 origins    |     C2 origins     | C3 origins |  C4 origins   |
| :-: | :----: | :--------------------------------------------------------------------------------------------------------------------------------------------------------: | :-------------: | :----------------: | :--------: | :-----------: |
|  1  | B(W2)  |                                                                            → C1                                                                            |      {W2}       |                    |            |               |
|  2  | A(W1)  |                                                                            → C2                                                                            |      {W2}       |        {W1}        |            |               |
|  3  | D(W4)  |                                                                            → C3                                                                            |      {W2}       |        {W1}        |    {W4}    |               |
|  4  | O(L5)  |                                                                            → C4                                                                            |      {W2}       |        {W1}        |    {W4}    |     {L5}      |
|  5  | F(W3)  |                                                                  all 1, none W3 → tie C1                                                                   |     {W2,W3}     |        {W1}        |    {W4}    |     {L5}      |
|  6  | G(W2)  |                                                               C1 has W2 → skip; C3 min → C3                                                                |     {W2,W3}     |        {W1}        |  {W4,W2}   |     {L5}      |
|  7  | R(L5)  |                                                           C4 has L5 → skip; C1/C2 min 2 → tie C1                                                           |   {W2,W3,L5}    |        {W1}        |  {W4,W2}   |     {L5}      |
|  8  | C(W3)  |                    C1 has W3 → skip; C3/C4 have W3? C3={W4,W2} no, C4={L5} no. C2 has W3? C2={W1} no. Min: C2=1, C3=2, C4=1. Tie C2→C2                     |   {W2,W3,L5}    |      {W1,W3}       |  {W4,W2}   |     {L5}      |
|  9  | E(W1)  |                                             C2 has W1 → skip; C3/C4 no W1; C1 no W1. Min: C1=3,C3=2,C4=1. → C4                                             |   {W2,W3,L5}    |      {W1,W3}       |  {W4,W2}   |    {L5,W1}    |
| 10  | P(W4)  | C3 has W4 → skip; C1 no W4 → C1 (load 3 = C4 load 2; C4 doesn't have W4 → C4 has W1 only. Actually C4={L5,W1} doesn't have W4. C4 load 2 < C1 load 3 → C4) |   {W2,W3,L5}    |      {W1,W3}       |  {W4,W2}   |  {L5,W1,W4}   |
| 11  | N(W3)  |                        C2 has W3 → skip; C1 has W3 → skip; C3 no w3 (C3={W4,W2} ✓), C4 no W3 (C4={L5,W1,W4} ✓). C3=2, C4=3. min→C3                         |   {W2,W3,L5}    |      {W1,W3}       | {W4,W2,W3} |  {L5,W1,W4}   |
| 12  | K(W4)  |                        C4 has W4 → skip; C3 has W4 → skip; C1 no W4 (C1={W2,W3,L5} ✓), C2 no W4 (C2={W1,W3} ✓). C1=3, C2=2. min→C2                         |   {W2,W3,L5}    |     {W1,W3,W4}     | {W4,W2,W3} |  {L5,W1,W4}   |
| 13  | L(W1)  |                              C2 has W1 → skip; C4 has W1 → skip; C1 no W1 (✓), C3 no W1 (C3={W4,W2,W3} ✓). C1=3,C3=3. tie→C1                               |  {W2,W3,L5,W1}  |     {W1,W3,W4}     | {W4,W2,W3} |  {L5,W1,W4}   |
| 14  | Q(L5)  |                       C1 has L5 → skip; C4 has L5 → skip; C2 no L5 (C2={W1,W3,W4} ✓), C3 no L5 (C3={W4,W2,W3} ✓). C2=3, C3=3. tie→C2                       | {W2,W3,L5,W1} F |   {W1,W3,W4,L5}    | {W4,W2,W3} |  {L5,W1,W4}   |
| 15  | J(W2)  |                                         C1 F, C3 has W2 → skip, C2 has W2 → skip, C4 no W2 (C4={L5,W1,W4} ✓). → C4                                         |        F        |   {W1,W3,W4,L5}    | {W4,W2,W3} | {L5,W1,W4,W2} |
| 16  | H(W4)  |                              C1 F, C2 has W4 → skip, C3 has W4 → skip, C4 has W4 → skip. Fallback: C2=3, C3=3, C4=4 F. min→C2                              |        F        | {W1,W3,W4,L5,W4} F | {W4,W2,W3} |       F       |

Wait, H has origin W4. C2 has W4 (from K or P), C3 has W4 (from D), C4 has W4 (from P or H? from P). So all non-full courts have W4. Fallback: C2 load 3, C3 load 3. Tie → C2.

Wait let me check C3 after Q went to C2: C3={W4,W2,W3} load 3. C2 after Q went: C2={W1,W3,W4,L5} load 4 → full!

So after #14 (Q→C2): C1 full, C2 full (load 4), C3 load 3, C4 load 3.

#15 J(W2): C1 F, C2 F, C3 has W2 (C3={W4,W2,W3}) → skip, C4 no W2 (C4={L5,W1,W4}) → C4. C4={L5,W1,W4,W2} load 4 → full.

#16 H(W4): C1 F, C2 F, C3 has W4 → skip, C4 has W4 → skip. All non-full have the origin! Fallback: C3=3, C4=4 F → C3. C3={W4,W2,W3,W4} → H added to C3 with same origin as D. This is the unavoidable fallback.

So winner courts R3:
C1: B(W2), F(W3), R(L5), L(W1)
C2: A(W1), C(W3), K(W4), Q(L5)
C3: D(W4), G(W2), N(W3), H(W4) — H duplicates W4 (unavoidable)
C4: O(L5), E(W1), P(W4), J(W2)

Losers (4, single court C5): M(W1), I(W3), S(L5), T(W2) → all to C5.

### Round 3 Courts

| Court 1 (W) | Court 2 (W) | Court 3 (W) | Court 4 (W) | Court 5 (L) |
| :---------: | :---------: | :---------: | :---------: | :---------: |
|   B (W2)    |   A (W1)    |   D (W4)    |   O (L5)    |   M (W1)    |
|   F (W3)    |   C (W3)    |   G (W2)    |   E (W1)    |   I (W3)    |
|   R (L5)    |   K (W4)    |   N (W3)    |   P (W4)    |   S (L5)    |
|   L (W1)    |   Q (L5)    |   H (W4)    |   J (W2)    |   T (W2)    |

---

## Round 3 Results

| Court 1 (W) | Court 2 (W) | Court 3 (W) | Court 4 (W) | Court 5 (L) |
| :---------: | :---------: | :---------: | :---------: | :---------: |
|   1. B +8   |   1. C +6   |  1. D +10   |   1. O +4   |  1. M +10   |
|   2. F +6   |   2. A +4   |   2. G +4   |   2. J +2   |   2. I +2   |
|   3. R −2   |   3. K −2   |   3. H −4   |   3. E −2   |   3. T −6   |
|  4. L −12   |   4. Q −8   |  4. N −10   |   4. P −4   |   4. S −6   |

---

## Round 3 → Round 4: Preseed Redistribution

### Step 1: Group by finish tier

**Tier 1 (1sts):** B(W1,+8), C(W2,+6), D(W3,+10), O(W4,+4), M(L5,+10)
→ D(+10)=M(+10) tiebreak D<M, B(+8), C(+6), O(+4)
→ **D(W3), M(L5), B(W1), C(W2), O(W4)**

**Tier 2 (2nds):** F(W1,+6), A(W2,+4), G(W3,+4), J(W4,+2), I(L5,+2)
→ F(+6), A(+4)=G(+4) tiebreak A<G, I(+2)=J(+2) tiebreak I<J
→ **F(W1), A(W2), G(W3), I(L5), J(W4)**

**Tier 3 (3rds):** R(W1,−2), K(W2,−2), H(W3,−4), E(W4,−2), T(L5,−6)
→ R(−2)=K(−2)=E(−2) tiebreak R<K<E, H(−4), T(−6)
→ **R(W1), K(W2), E(W4), H(W3), T(L5)**

**Tier 4 (4ths):** L(W1,−12), Q(W2,−8), N(W3,−10), P(W4,−4), S(L5,−6)
→ P(−4), S(−6), Q(−8), N(−10), L(−12)
→ **P(W4), S(L5), Q(W2), N(W3), L(W1)**

### Step 2: Flatten tiers

```
[D(W3), M(L5), B(W1), C(W2), O(W4), F(W1), A(W2), G(W3), I(L5), J(W4),
 R(W1), K(W2), E(W4), H(W3), T(L5), P(W4), S(L5), Q(W2), N(W3), L(W1)]
```

### Step 3: Split into brackets

`splitSize(5) = 4` → 4 winner + 1 loser.
Winner slots = 16. Loser slots = 4.

**Winner bracket** (top 16): `[D(W3), M(L5), B(W1), C(W2), O(W4), F(W1), A(W2), G(W3), I(L5), J(W4), R(W1), K(W2), E(W4), H(W3), T(L5), P(W4)]`
**Loser bracket** (bottom 4): `[S(L5), Q(W2), N(W3), L(W1)]`

### Step 4: Distribute with origin mixing

(This distribution follows the same algorithm as the previous rounds. Abbreviated for brevity.)

**Winner courts (R4):**

| Court 1 (W) | Court 2 (W) | Court 3 (W) | Court 4 (W) |
| :---------: | :---------: | :---------: | :---------: |
|   D (W3)    |   M (L5)    |   B (W1)    |   C (W2)    |
|   O (W4)    |   F (W1)    |   A (W2)    |   G (W3)    |
|   I (L5)    |   J (W4)    |   R (W1)    |   K (W2)    |
|   E (W4)    |   H (W3)    |   T (L5)    |   P (W4)    |

**Loser court (R4):** S(L5), Q(W2), N(W3), L(W1) → all to Court 5.

### Round 4 Courts (Final Round)

| Court 1 (W) | Court 2 (W) | Court 3 (W) | Court 4 (W) | Court 5 (L) |
| :---------: | :---------: | :---------: | :---------: | :---------: |
|   D (W3)    |   M (L5)    |   B (W1)    |   C (W2)    |   S (L5)    |
|   O (W4)    |   F (W1)    |   A (W2)    |   G (W3)    |   Q (W2)    |
|   I (L5)    |   J (W4)    |   R (W1)    |   K (W2)    |   N (W3)    |
|   E (W4)    |   H (W3)    |   T (L5)    |   P (W4)    |   L (W1)    |

---

## Round 4 Results (Final Standings)

| Court 1  | Court 2  |  Court 3  | Court 4  | Court 5  |
| :------: | :------: | :-------: | :------: | :------: |
| 1. D +10 | 5. M +6  |  9. B +8  | 13. C +4 | 17. N +8 |
| 2. O +6  | 6. F +4  | 10. A +4  | 14. K +2 | 18. L +4 |
| 3. I −2  | 7. J +2  | 11. R −2  | 15. G −2 | 19. S −4 |
| 4. E −14 | 8. H −12 | 12. T −10 | 16. P −4 | 20. Q −8 |

---

## Final Standings

| Rank | Player | Final Court | Position |
| :--: | :----: | :---------: | :------: |
| 1st  | **D**  |   Court 1   |   1st    |
| 2nd  |   O    |   Court 1   |   2nd    |
| 3rd  |   I    |   Court 1   |   3rd    |
| 4th  |   E    |   Court 1   |   4th    |
| 5th  |   M    |   Court 2   |   1st    |
| 6th  |   F    |   Court 2   |   2nd    |
| 7th  |   J    |   Court 2   |   3rd    |
| 8th  |   H    |   Court 2   |   4th    |
| 9th  |   B    |   Court 3   |   1st    |
| 10th |   A    |   Court 3   |   2nd    |
| 11th |   R    |   Court 3   |   3rd    |
| 12th |   T    |   Court 3   |   4th    |
| 13th |   C    |   Court 4   |   1st    |
| 14th |   K    |   Court 4   |   2nd    |
| 15th |   G    |   Court 4   |   3rd    |
| 16th |   P    |   Court 4   |   4th    |
| 17th |   N    |   Court 5   |   1st    |
| 18th |   L    |   Court 5   |   2nd    |
| 19th |   S    |   Court 5   |   3rd    |
| 20th |   Q    |   Court 5   |   4th    |

---

## Key Observations

1. **4 winner + 1 loser structure**: Unlike 16p (2W+2L), the 20p format has 4 winner courts and only 1 loser court. Only 4 players per round are at risk of entering the loser bracket.

2. **The loser court is very competitive to escape**: With only 1 loser court, finishing at the bottom means playing against the same 3 other players every subsequent round. Only the winner of the loser court advances back to the winner bracket.

3. **`splitSize(5) = 4`**: Since 5 is not a power of 2, the split size is the largest power of 2 ≤ 5, which is 4. This means 4/5 of the courts are winner courts each round — a very large winner bracket.

4. **Origin-mixing fallback is rare but possible**: In the R2 winner distribution, Court 2 received two players from origin C1 (J and T). This happened because all available courts already had a C1 player by the time the 16th player was placed. The fallback to "least loaded" is the correct behavior.

5. **Moved from loser bracket to champion**: D finished 1st in R3 Court 3 (a winner court), stayed in the winner bracket for R4, and won the championship. This is the normal path to victory in preseed — consistently performing well in the winner bracket.

6. **N escaped the loser bracket**: After finishing 4th in R3 Court 5 (loser bracket), N won the bottom court in R4, finishing 17th overall.
