# Preseed Example: 20 Players (5 Courts, 4 Rounds)

## Overview

20 players on 5 courts. `calculateRoundCount(5, 'preseed') = floor(log2(5-1)) + 2 = 4` rounds.

**Three-level bracket tree:**

```
Round 1:   [C1] [C2] [C3] [C4] [C5]            (snake seeding)
             ↓
Round 2:   [W1] [W2] [W3] [W4] | [L5]          splitSize(5)=4 → 4W+1L, origin mixing
             ↓                     ↓
Round 3:  [WW1][WW2] | [LW1][LW2] | [L5]       winners(4) → 2WW+2LW, loser unchanged
             ↓          ↓             ↓
Round 4:  [F] [L(WW)]|[TL] [BL]   | [L5]       each 2-court bracket → 1F+1L
```

`splitSize(5) = 4` — since 5 is not a power of 2, the largest power of 2 ≤ 5. Every round has **4 winner courts + 1 loser court**, but the 4 winner courts are re-sorted into sub-competitions each round.

---

## Round 1: Snake Seeding

Seed order: A(2000), B(1900), C(1800), D(1700), E(1600), F(1500), G(1400), H(1300), I(1200), J(1100), K(1000), L(900), M(800), N(700), O(600), P(500), Q(400), R(300), S(200), T(100)

| Court 1 | Court 2 | Court 3 | Court 4 | Court 5 |
| :-----: | :-----: | :-----: | :-----: | :-----: |
| A(2000) | B(1900) | C(1800) | D(1700) | E(1600) |
| J(1100) | I(1200) | H(1300) | G(1400) | F(1500) |
| K(1000) | L(900)  | M(800)  | N(700)  | O(600)  |
| T(100)  | S(200)  | R(300)  | Q(400)  | P(500)  |

---

## Round 1 Results

For simplicity, **players finish in their listed order** (1st = top, 4th = bottom) on every court.

| Court 1 | Court 2 | Court 3 | Court 4 | Court 5 |
| :-----: | :-----: | :-----: | :-----: | :-----: |
|  1. A   |  1. B   |  1. C   |  1. D   |  1. E   |
|  2. J   |  2. L   |  2. H   |  2. G   |  2. F   |
|  3. K   |  3. I   |  3. M   |  3. N   |  3. P   |
|  4. T   |  4. S   |  4. R   |  4. Q   |  4. O   |

---

## Round 1 → Round 2: First Split (isFirstSplit=true)

Global tiers → `splitSize(5)=4` → 4W+1L → origin mixing.

**Tier 1 (1sts):** A(C1), B(C2), C(C3), D(C4), E(C5) → **A, B, C, D, E**
**Tier 2 (2nds):** J(C1), L(C2), H(C3), G(C4), F(C5) → **G, F, H, L, J**
**Tier 3 (3rds):** K(C1), I(C2), M(C3), N(C4), P(C5) → **I, P, M, N, K**
**Tier 4 (4ths):** Q(C4), O(C5), R(C3), T(C1), S(C2) → **Q, O, R, T, S**

Flattened: `[A, B, C, D, E, G, F, H, L, J, I, P, M, N, K, Q, O, R, T, S]`

`splitSize(5)=4` → **Winners** (top 16): [A, B, C, D, E, G, F, H, L, J, I, P, M, N, K, Q]
**Losers** (bottom 4): [O(C5), R(C3), T(C1), S(C2)]

### Origin mixing (Winners → 4 courts of 4)

| Player | Decision |    Court 1    |     Court 2     |    Court 3    |    Court 4    |
| ------ | -------- | :-----------: | :-------------: | :-----------: | :-----------: |
| A(C1)  | → C1     |     {C1}      |                 |               |               |
| B(C2)  | → C2     |     {C1}      |      {C2}       |               |               |
| C(C3)  | → C3     |     {C1}      |      {C2}       |     {C3}      |               |
| D(C4)  | → C4     |     {C1}      |      {C2}       |     {C3}      |     {C4}      |
| E(C5)  | tie → C1 |    {C1,C5}    |      {C2}       |     {C3}      |     {C4}      |
| G(C4)  | → C2     |    {C1,C5}    |     {C2,C4}     |     {C3}      |     {C4}      |
| F(C5)  | → C3     |    {C1,C5}    |     {C2,C4}     |    {C3,C5}    |     {C4}      |
| H(C3)  | → C4     |    {C1,C5}    |     {C2,C4}     |    {C3,C5}    |    {C4,C3}    |
| L(C2)  | → C1     |  {C1,C5,C2}   |     {C2,C4}     |    {C3,C5}    |    {C4,C3}    |
| J(C1)  | → C2     |  {C1,C5,C2}   |   {C2,C4,C1}    |    {C3,C5}    |    {C4,C3}    |
| I(C2)  | → C3     |  {C1,C5,C2}   |   {C2,C4,C1}    |  {C3,C5,C2}   |    {C4,C3}    |
| P(C5)  | → C4     |  {C1,C5,C2}   |   {C2,C4,C1}    |  {C3,C5,C2}   |  {C4,C3,C5}   |
| M(C3)  | → C1     | {C1,C5,C2,C3} |   {C2,C4,C1}    |  {C3,C5,C2}   |  {C4,C3,C5}   |
| N(C4)  | → C3     |       F       |   {C2,C4,C1}    | {C3,C5,C2,C4} |  {C4,C3,C5}   |
| K(C1)  | → C4     |       F       |   {C2,C4,C1}    |       F       | {C4,C3,C5,C1} |
| Q(C4)  | → C2     |       F       | {C2,C4,C1,C4} F |       F       |       F       |

### Round 2 Courts

| Court 1 (W) | Court 2 (W) | Court 3 (W) | Court 4 (W) | Court 5 (L) |
| :---------: | :---------: | :---------: | :---------: | :---------: |
|   A (C1)    |   B (C2)    |   C (C3)    |   D (C4)    |   O (C5)    |
|   E (C5)    |   G (C4)    |   F (C5)    |   H (C3)    |   R (C3)    |
|   L (C2)    |   J (C1)    |   I (C2)    |   P (C5)    |   T (C1)    |
|   M (C3)    |   Q (C4)    |   N (C4)    |   K (C1)    |   S (C2)    |

---

## Round 2 Results

Same assumption: players finish in listed order.

| C1 (W) | C2 (W) | C3 (W) | C4 (W) | C5 (L) |
| :----: | :----: | :----: | :----: | :----: |
|  1. A  |  1. B  |  1. C  |  1. D  |  1. O  |
|  2. E  |  2. G  |  2. F  |  2. H  |  2. R  |
|  3. L  |  3. J  |  3. I  |  3. P  |  3. T  |
|  4. M  |  4. Q  |  4. N  |  4. K  |  4. S  |

---

## Round 2 → Round 3: Subsequent Split (isFirstSplit=false)

`splitSize(5)=4` → **Winner bracket** = courts 1-4 subdivide by pairs. **Loser bracket** = court 5 unchanged.

### Pair (Courts 1–2)

**1sts+2nds → Court 1:** A(C1), B(C2), E(C1), G(C2)
**3rds+4ths → Court 2:** L(C1), J(C2), M(C1), Q(C2)

### Pair (Courts 3–4)

**1sts+2nds → Court 3:** C(C3), D(C4), F(C3), H(C4)
**3rds+4ths → Court 4:** I(C3), P(C4), N(C3), K(C4)

### Round 3 Courts

| Court 1 (WW⊤) | Court 2 (WW⊥) | Court 3 (LW⊤) | Court 4 (LW⊥) | Court 5 (L) |
| :-----------: | :-----------: | :-----------: | :-----------: | :---------: |
|   A (C1)    |   L (C1)    |   C (C3)    |   I (C3)    |   O (L5)    |
|   B (C2)    |   J (C2)    |   D (C4)    |   P (C4)    |   R (L5)    |
|   E (C1)    |   M (C1)    |   F (C3)    |   N (C3)    |   T (L5)    |
|   G (C2)    |   Q (C2)    |   H (C4)    |   K (C4)    |   S (L5)    |

---

## Round 3 Results

Players finish in listed order.

| C1  | C2  | C3  | C4  | C5  |
| :-: | :-: | :-: | :-: | :-: |
| 1.A | 1.L | 1.D | 1.P | 1.O |
| 2.B | 2.J | 2.C | 2.I | 2.R |
| 3.G | 3.M | 3.H | 3.K | 3.T |
| 4.E | 4.Q | 4.F | 4.N | 4.S |

---

## Round 3 → Round 4: Winner-only split (final round)

Courts 1–4 use **winner-only** subdivision: only the top court from each pair continues. The bottom court (WL, LL) is settled — placements determined by R3 finish order.

### Pair (Courts 1–2)

**Court 1 (WW) → Final:** A, B, G, E (all players from WW court — championship round)
**Court 2 (WL):** settled after R3 — L(5th), J(6th), M(7th), Q(8th). **L cannot reach the Final** despite winning Court 2 in R3, because finishing 4th on Court 2 in R2 permanently dropped out of the gold race.

### Pair (Courts 3–4)

**Court 3 (LW) → TL:** D, C, H, F (all players from LW court — play for places 9–12)
**Court 4 (LL):** settled after R3 — P(13th), I(14th), K(15th), N(16th)

### Round 4 Courts (active)

| Final | TL  | L5 (frozen) |
| :---: | :-: | :---------: |
|   A   |  D  |     O       |
|   B   |  C  |     R       |
|   G   |  H  |     T       |
|   E   |  F  |     S       |

---

## Final Standings

| Rank | Player | Determined by |
| :--: | :----: | :-----------: |
| 1st  | **A**  | Final (R4 C1) 1st |
| 2nd  |   B    | Final (R4 C1) 2nd |
| 3rd  |   G    | Final (R4 C1) 3rd |
| 4th  |   E    | Final (R4 C1) 4th |
| 5th  |   L    | WL (R3 C2) 1st — out of gold after R2 |
| 6th  |   J    | WL (R3 C2) 2nd |
| 7th  |   M    | WL (R3 C2) 3rd |
| 8th  |   Q    | WL (R3 C2) 4th |
| 9th  |   D    | TL (R4 C2) 1st |
| 10th |   C    | TL (R4 C2) 2nd |
| 11th |   H    | TL (R4 C2) 3rd |
| 12th |   F    | TL (R4 C2) 4th |
| 13th |   P    | LL (R3 C4) 1st |
| 14th |   I    | LL (R3 C4) 2nd |
| 15th |   K    | LL (R3 C4) 3rd |
| 16th |   N    | LL (R3 C4) 4th |
| 17th |   O    | L5 (R2+) 1st |
| 18th |   R    | L5 (R2+) 2nd |
| 19th |   T    | L5 (R2+) 3rd |
| 20th |   S    | L5 (R2+) 4th |

---

## Bracket Tree Summary

```
R1:       [C1]   [C2]   [C3]   [C4]   [C5]
           ││││   ││││   ││││   ││││   ││││
R1→R2:    global tiers → splitSize(5)=4 → 4W+1L + origin mixing
            │                   │
R2:    [W1][W2][W3][W4]  |  [L5]
         │    │    │    │      │
R2→R3:  pair subdivision within winner courts (C1/C2 → C1/C2, C3/C4 → C3/C4)
         │          │            │
R3:   [WW⊤][WW⊥] | [LW⊤][LW⊥] | [L5]
         │          │            │
R3→R4: winner-only pairs — WW and LW continue, WL and LL settled
         │          │            │
R4:   [Final] | [TL]           | [L5 frozen]
```

### Key Points

1. **3rd/4th = permanent dropout from gold race.** A player who finishes 3rd or 4th on any court never returns to contention for places 1–4.

2. **Peer vs winner-only pairs:** The first split of a court pair combines 1sts+2nds from both courts. Later splits only advance the top court from the pair; the bottom court is settled.

3. **`splitSize(5)=4` is asymmetric:** 20p has 4W+1L. Court 5 (L5) freezes after R2.

4. **Origin mixing only for R1→R2:** Subsequent splits separate by finish position within each bracket group.
