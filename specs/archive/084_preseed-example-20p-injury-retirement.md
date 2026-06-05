# Preseed Example: 20 Players with Mid-Tournament Retirement

## Overview

This example demonstrates how player retirement affects a preseed tournament. We start with the same 20-player configuration as the standard 20p example, but after Round 2, Player T retires (schedule conflict), reducing active players to 19.

The court configuration recalculates from 5×4p to 4×4p + 1×3p. The bottom court becomes a 3-player court. The preseed redistribution handles the non-standard court naturally.

**What changes vs standard 20p:**

- Rounds 1-2: identical
- Round 3: loser court has 3 players instead of 4
- Round 4: final standings include T at place 20 (bracket-worst for retiree)

---

## Rounds 1 & 2

Rounds 1 and 2 are identical to the standard 20p example. See [`083_preseed-example-20p.md`](./083_preseed-example-20p.md) for full details.

### Round 1 Results (Snake Seeding)

| Court 1  | Court 2  | Court 3  | Court 4  | Court 5  |
| :------: | :------: | :------: | :------: | :------: |
| 1. A +28 | 1. B +24 | 1. C +20 | 1. D +18 | 1. E +14 |
| 2. J +8  | 2. L +10 | 2. H +12 | 2. G +14 | 2. F +12 |
| 3. K −14 | 3. I −8  | 3. M −10 | 3. N −12 | 3. P −8  |
| 4. T −22 | 4. S −26 | 4. R −22 | 4. Q −20 | 4. O −18 |

### Round 2 Results (after preseed redistribution)

| Court 1 (W) | Court 2 (W) | Court 3 (W) | Court 4 (W) | Court 5 (L) |
| :---------: | :---------: | :---------: | :---------: | :---------: |
|  1. A +10   |  1. B +12   |   1. F +8   |  1. D +10   |  1. O +10   |
|   2. E +2   |   2. G +4   |   2. C +3   |   2. P +1   |   2. R +4   |
|   3. L −4   |   3. J −6   |   3. N −2   |   3. K −3   |   3. Q −4   |
|   4. M −8   |  4. T −10   |   4. I −9   |   4. H −8   |  4. S −10   |

---

## Player Retirement (After Round 2)

The organizer retires Player T. Reason: schedule conflict.

```
Before retirement: 20 players → 5 × 4p = 5 courts
After retirement:  19 players → 4 × 4p + 1 × 3p = 5 courts
```

New court configuration: `[4, 4, 4, 4, 3]`

The bottom court (Court 5) becomes a 3-player court. All top courts remain standard 4-player courts.

T's R2 standings (Court 2, 4th place, −10) are preserved in history but T is excluded from all future rounds.

---

## Round 2 → Round 3: Preseed Redistribution (19 players)

### Step 1: Group by finish tier (T removed)

**Tier 1 (1sts):** A(W1,+10), B(W2,+12), F(W3,+8), D(W4,+10), O(L5,+10)
→ **B(+12), A(+10), D(+10), O(+10), F(+8)** (A<D<O tiebreak)

**Tier 2 (2nds):** E(W1,+2), G(W2,+4), C(W3,+3), P(W4,+1), R(L5,+4)
→ **G(+4), R(+4), C(+3), E(+2), P(+1)** (G<R tiebreak)

**Tier 3 (3rds):** L(W1,−4), J(W2,−6), N(W3,−2), K(W4,−3), Q(L5,−4)
→ **N(−2), K(−3), L(−4), Q(−4), J(−6)** (L<Q tiebreak)

**Tier 4 (4ths):** M(W1,−8), I(W3,−9), H(W4,−8), S(L5,−10)
→ **H(−8), M(−8), I(−9), S(−10)** (H<M tiebreak; W2's 4th is T — retired)

Tier 4 has only 4 players (T removed from W2's slot). Total: 5+5+5+4 = **19 players** ✓

### Step 2: Flatten tiers

```
[B(W2), A(W1), D(W4), O(L5), F(W3), G(W2), R(L5), C(W3), E(W1), P(W4),
 N(W3), K(W4), L(W1), Q(L5), J(W2), H(W4), M(W1), I(W3), S(L5)]
```

### Step 3: Split into brackets

`splitSize(5) = 4` → 4 winner courts, 1 loser court.
Winner slots = 4 × 4 = **16 slots**. Loser slots = **3 slots** (remaining players).

**Winner bracket** (top 16): `[B(W2), A(W1), D(W4), O(L5), F(W3), G(W2), R(L5), C(W3), E(W1), P(W4), N(W3), K(W4), L(W1), Q(L5), J(W2), H(W4)]`
**Loser bracket** (bottom 3): `[M(W1), I(W3), S(L5)]`

The loser bracket has exactly 3 players — matching the 3p bottom court.

### Step 4: Distribute within brackets (origin mixing)

**Winner distribution** (16 players → 4 courts of 4):

|  #  | Player (origin) |                            Decision                             |  C1 origins   |  C2 origins   |   C3 origins    |  C4 origins   |
| :-: | :-------------: | :-------------------------------------------------------------: | :-----------: | :-----------: | :-------------: | :-----------: |
|  1  |     B (W2)      |                              → C1                               |     {W2}      |               |                 |               |
|  2  |     A (W1)      |                              → C2                               |     {W2}      |     {W1}      |                 |               |
|  3  |     D (W4)      |                              → C3                               |     {W2}      |     {W1}      |      {W4}       |               |
|  4  |     O (L5)      |                              → C4                               |     {W2}      |     {W1}      |      {W4}       |     {L5}      |
|  5  |     F (W3)      |                       all 1, none W3 → C1                       |    {W2,W3}    |     {W1}      |      {W4}       |     {L5}      |
|  6  |     G (W2)      |                    C1 has W2 → skip; C3 → C3                    |    {W2,W3}    |     {W1}      |     {W4,W2}     |     {L5}      |
|  7  |     R (L5)      |                    C4 has L5 → skip; C1 → C1                    |  {W2,W3,L5}   |     {W1}      |     {W4,W2}     |     {L5}      |
|  8  |     C (W3)      |                    C1 has W3 → skip; C2 → C2                    |  {W2,W3,L5}   |    {W1,W3}    |     {W4,W2}     |     {L5}      |
|  9  |     E (W1)      |                    C2 has W1 → skip; C4 → C4                    |  {W2,W3,L5}   |    {W1,W3}    |     {W4,W2}     |    {L5,W1}    |
| 10  |     P (W4)      |                    C3 has W4 → skip; C4 → C4                    |  {W2,W3,L5}   |    {W1,W3}    |     {W4,W2}     |  {L5,W1,W4}   |
| 11  |     N (W3)      |              C1 has W3, C2 has W3 → skip; C3 → C3               |  {W2,W3,L5}   |    {W1,W3}    |   {W4,W2,W3}    |  {L5,W1,W4}   |
| 12  |     K (W4)      |              C4 has W4, C3 has W4 → skip; C2 → C2               |  {W2,W3,L5}   |  {W1,W3,W4}   |   {W4,W2,W3}    |  {L5,W1,W4}   |
| 13  |     L (W1)      |              C2 has W1, C4 has W1 → skip; C1 → C1               | {W2,W3,L5,W1} |  {W1,W3,W4}   |   {W4,W2,W3}    |  {L5,W1,W4}   |
| 14  |     Q (L5)      |              C1 has L5, C4 has L5 → skip; C2 → C2               |       F       | {W1,W3,W4,L5} |   {W4,W2,W3}    |  {L5,W1,W4}   |
| 15  |     J (W2)      |              C3 has W2, C2 has W2 → skip; C4 → C4               |       F       | {W1,W3,W4,L5} |   {W4,W2,W3}    | {L5,W1,W4,W2} |
| 16  |     H (W4)      | C3 has W4, C4 has W4, C2 has W4 → all full have W4; fallback C3 |       F       |       F       | {W4,W2,W3,W4} F |       F       |

_(F = full court)_

**Winner courts:**

| Court 1 | Court 2 | Court 3 | Court 4 |
| :-----: | :-----: | :-----: | :-----: |
| B (W2)  | A (W1)  | D (W4)  | O (L5)  |
| F (W3)  | C (W3)  | G (W2)  | E (W1)  |
| R (L5)  | K (W4)  | N (W3)  | P (W4)  |
| L (W1)  | Q (L5)  | H (W4)  | J (W2)  |

**Loser distribution** (3 players → 1 court of 3):
M(W1), I(W3), S(L5) → all to Court 5. With a single court, no mixing is needed.

### Round 3 Courts

| Court 1 (W) | Court 2 (W) | Court 3 (W) | Court 4 (W) | Court 5 (L, 3p) |
| :---------: | :---------: | :---------: | :---------: | :-------------: |
|   B (W2)    |   A (W1)    |   D (W4)    |   O (L5)    |     M (W1)      |
|   F (W3)    |   C (W3)    |   G (W2)    |   E (W1)    |     I (W3)      |
|   R (L5)    |   K (W4)    |   N (W3)    |   P (W4)    |     S (L5)      |
|   L (W1)    |   Q (L5)    |   H (W4)    |   J (W2)    |                 |

Court 5 has 3 players and plays the 3-player format (A&B vs C, A&C vs B, B&C vs A — 3 matches, each player sits out 1 match).

---

## Round 3 Results

| Court 1 (W) | Court 2 (W) | Court 3 (W) | Court 4 (W) | Court 5 (L, 3p) |
| :---------: | :---------: | :---------: | :---------: | :-------------: |
|   1. B +8   |   1. C +6   |  1. D +10   |   1. O +4   |    1. M +12     |
|   2. F +6   |   2. A +4   |   2. G +4   |   2. J +2   |     2. I +4     |
|   3. R −2   |   3. K −2   |   3. H −4   |   3. E −2   |    3. S −16     |
|  4. L −12   |   4. Q −8   |  4. N −10   |   4. P −4   |                 |

With only 3 players, Court 5 has no 4th position. This means Tier 4 in the next round will have only 4 players (from the 4 standard courts).

---

## Round 3 → Round 4: Preseed Redistribution (19 players)

### Step 1: Group by finish tier

**Tier 1 (1sts):** B(W1,+8), C(W2,+6), D(W3,+10), O(W4,+4), M(L5,+12)
→ **M(+12), D(+10), B(+8), C(+6), O(+4)**

**Tier 2 (2nds):** F(W1,+6), A(W2,+4), G(W3,+4), J(W4,+2), I(L5,+4)
→ **F(+6), A(+4), G(+4), I(+4), J(+2)** (A<G<I tiebreak)

**Tier 3 (3rds):** R(W1,−2), K(W2,−2), H(W3,−4), E(W4,−2), S(L5,−16)
→ **R(−2), K(−2), E(−2), H(−4), S(−16)** (R<K<E tiebreak)

**Tier 4 (4ths):** L(W1,−12), Q(W2,−8), N(W3,−10), P(W4,−4)
→ **P(−4), Q(−8), N(−10), L(−12)**

Total: 5+5+5+4 = **19 players** ✓ (Court 5's 3p format contributes only 3 tiers)

### Step 2: Flatten tiers

```
[M(L5), D(W3), B(W1), C(W2), O(W4), F(W1), A(W2), G(W3), I(L5), J(W4),
 R(W1), K(W2), E(W4), H(W3), S(L5), P(W4), Q(W2), N(W3), L(W1)]
```

### Step 3: Split into brackets

`splitSize(5) = 4` → 4 winner + 1 loser (3p).
Winner slots = 16. Loser slots = 3.

**Winners** (top 16): `[M(L5), D(W3), B(W1), C(W2), O(W4), F(W1), A(W2), G(W3), I(L5), J(W4), R(W1), K(W2), E(W4), H(W3), S(L5), P(W4)]`
**Losers** (bottom 3): `[Q(W2), N(W3), L(W1)]`

### Step 4: Distribute with origin mixing

**Winner distribution** (16 → 4 courts of 4):

|  #  | Player |                                  Decision                                   |  C1 origins   |   C2 origins    |   C3 origins    |  C4 origins   |
| :-: | :----: | :-------------------------------------------------------------------------: | :-----------: | :-------------: | :-------------: | :-----------: |
|  1  | M(L5)  |                                    → C1                                     |     {L5}      |                 |                 |               |
|  2  | D(W3)  |                                    → C2                                     |     {L5}      |      {W3}       |                 |               |
|  3  | B(W1)  |                                    → C3                                     |     {L5}      |      {W3}       |      {W1}       |               |
|  4  | C(W2)  |                                    → C4                                     |     {L5}      |      {W3}       |      {W1}       |     {W2}      |
|  5  | O(W4)  |                             all 1, none W4 → C1                             |    {L5,W4}    |      {W3}       |      {W1}       |     {W2}      |
|  6  | F(W1)  |                          C3 has W1 → skip; C2 → C2                          |    {L5,W4}    |     {W3,W1}     |      {W1}       |     {W2}      |
|  7  | A(W2)  |                          C4 has W2 → skip; C3 → C3                          |    {L5,W4}    |     {W3,W1}     |     {W1,W2}     |     {W2}      |
|  8  | G(W3)  |                          C2 has W3 → skip; C4 → C4                          |    {L5,W4}    |     {W3,W1}     |     {W1,W2}     |    {W2,W3}    |
|  9  | I(L5)  |                          C1 has L5 → skip; C2 → C2                          |    {L5,W4}    |   {W3,W1,L5}    |     {W1,W2}     |    {W2,W3}    |
| 10  | J(W4)  |                          C1 has W4 → skip; C3 → C3                          |    {L5,W4}    |   {W3,W1,L5}    |   {W1,W2,W4}    |    {W2,W3}    |
| 11  | R(W1)  |                          C3 has W1 → skip; C4 → C4                          |    {L5,W4}    |   {W3,W1,L5}    |   {W1,W2,W4}    |  {W2,W3,W1}   |
| 12  | K(W2)  |                          C4 has W2 → skip; C1 → C1                          |  {L5,W4,W2}   |   {W3,W1,L5}    |   {W1,W2,W4}    |  {W2,W3,W1}   |
| 13  | E(W4)  | C4 has W4? C4={W2,W3,W1} no W4 ✓; C1 has W4 → skip; C3 has W4 → skip. C4→C4 |  {L5,W4,W2}   |   {W3,W1,L5}    |   {W1,W2,W4}    | {W2,W3,W1,W4} |
| 14  | H(W3)  |     C2 has W3 → skip; C4 has W3 → skip; C1 → C1 (C1={L5,W4,W2} no W3 ✓)     | {L5,W4,W2,W3} |   {W3,W1,L5}    |   {W1,W2,W4}    |       F       |
| 15  | S(L5)  |  C1 has L5 → skip; C2 has L5 → skip; C3 only non-full — C3 has no L5 → C3   |       F       |   {W3,W1,L5}    | {W1,W2,W4,L5} F |       F       |
| 16  | P(W4)  |           C2 has no W4? C2={W3,W1,L5} ✓; C2 is only non-full → C2           |       F       | {W3,W1,L5,W4} F |        F        |       F       |

**Winner courts (R4 final):**

| Court 1 | Court 2 | Court 3 | Court 4 |
| :-----: | :-----: | :-----: | :-----: |
| M (L5)  | D (W3)  | B (W1)  | C (W2)  |
| O (W4)  | F (W1)  | A (W2)  | G (W3)  |
| K (W2)  | I (L5)  | J (W4)  | R (W1)  |
| H (W3)  | P (W4)  | S (L5)  | E (W4)  |

**Loser court (R4 final):** Q(W2), N(W3), L(W1) → all to Court 5 (3p).

---

## Round 4 Results (Final Standings)

| Court 1  | Court 2  | Court 3  | Court 4  | Court 5 (3p) |
| :------: | :------: | :------: | :------: | :----------: |
| 1. M +8  | 5. D +10 | 9. B +6  | 13. C +8 |  17. N +10   |
| 2. O +4  | 6. F +2  | 10. H +2 | 14. E +2 |   18. Q +2   |
| 3. K −2  | 7. P −4  | 11. A −2 | 15. G −4 |  19. L −12   |
| 4. R −10 | 8. I −8  | 12. J −6 | 16. S −6 |              |

---

## Final Standings

|   Rank   |      Player       |   Final Court   |   Position    |
| :------: | :---------------: | :-------------: | :-----------: |
| **1st**  |       **M**       |     Court 1     |      1st      |
|   2nd    |         O         |     Court 1     |      2nd      |
|   3rd    |         K         |     Court 1     |      3rd      |
|   4th    |         R         |     Court 1     |      4th      |
|   5th    |         D         |     Court 2     |      1st      |
|   6th    |         F         |     Court 2     |      2nd      |
|   7th    |         P         |     Court 2     |      3rd      |
|   8th    |         I         |     Court 2     |      4th      |
|   9th    |         B         |     Court 3     |      1st      |
|   10th   |         H         |     Court 3     |      2nd      |
|   11th   |         A         |     Court 3     |      3rd      |
|   12th   |         J         |     Court 3     |      4th      |
|   13th   |         C         |     Court 4     |      1st      |
|   14th   |         E         |     Court 4     |      2nd      |
|   15th   |         G         |     Court 4     |      3rd      |
|   16th   |         S         |     Court 4     |      4th      |
|   17th   |         N         |     Court 5     |      1st      |
|   18th   |         Q         |     Court 5     |      2nd      |
|   19th   |         L         |     Court 5     |      3rd      |
| **20th** | **T** _(retired)_ | _(R2, Court 2)_ | _(4th place)_ |

---

## Retired Player Placement

Player T retired after Round 2 while in the winner bracket. The preseed final-placement logic assigns:

1. **Determine T's bracket at time of retirement**: T finished 4th on Court 2 (W). In the R2→R3 split, the 4th-place tier (Tier 4, 5 players: M, T, I, H, S) ranks T behind H, M, I, S. The top 16 of 19 players go to the winner bracket; T is in the bottom 3 (loser bracket).

2. **Bracket range**: T would have been in the loser bracket, which covers places 17–20 for a 20-player tournament.

3. **First retiree → worst place**: Since T is the only retiree, T gets the worst place in that bracket = **20th place**.

---

## Key Observations

1. **Non-standard court handled naturally**: The 3-player loser court (Court 5) participates fully in the tournament. Players play 3 matches each (one sitting out per match). Tier construction in the next redistribution automatically adapts — the 3p court contributes only 3 finish tiers instead of 4.

2. **Origin-mixing unaffected by retirement**: The winner-bracket distribution uses the same algorithm regardless of the loser-court size. All mixing constraints still apply within the winner courts.

3. **Retired player's slot disappears**: When T is removed, Tier 4 has only 4 players instead of 5. The preseed split adjusts: 16 winners (covering Tiers 1-3 fully + partial Tier 4) and 3 losers (remaining Tier 4 players). The system doesn't leave a "ghost slot."

4. **The non-standard court stays at the bottom**: The 3-player court is always Court 5 — the bottom court. Top courts (1-4) remain standard 4p courts throughout.

5. **Retirement changes the champion**: In the standard 20p example, D won the tournament. In this example, M — who was in the loser bracket and performed well — won the championship. This is because the retirement removed T, causing M to play different opponents and achieve different scores. The bracket composition shifted.

6. **Consistent final-place distribution**: Despite having 19 active players, the final standings fill places 1-19 cleanly, with the retired player taking place 20. No gaps or duplicate positions.
