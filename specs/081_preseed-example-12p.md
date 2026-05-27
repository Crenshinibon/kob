# Preseed Example: 12 Players (3 Courts, 3 Rounds)

## Overview

12 players on 3 courts. `calculateRoundCount(3, 'preseed') = floor(log2(3-1)) + 2 = 3` rounds.

The bracket tree:

```
Round 1:    [C1] [C2] [C3]          (all equal, snake seeding)
              ↓
Round 2:    [W1] [W2] | [L]        (splitSize(3)=2 → 2W+1L, origin mixing)
              ↓        ↓
Round 3:  [F] [L(W)] | [L]         (winner bracket halves: 2→1F+1L(W), loser stays)
```

Winner bracket shrinks from 2 courts in R2 to 1 court in R3 (the final). The runner-up court L(W) holds the next 4 from the winner bracket. The loser court (L) stays as-is — same 4 players every round.

---

## Round 1: Snake Seeding

Seed order: A(100), B(90), C(80), D(70), E(60), F(50), G(40), H(30), I(20), J(10), K(5), L(0)

| Position             | Direction | Court 1 | Court 2 | Court 3 |
| -------------------- | --------- | ------- | ------- | ------- |
| pos 0 (top seeds)    | fwd       | A (100) | B (90)  | C (80)  |
| pos 1 (second seeds) | rev       | F (50)  | E (60)  | D (70)  |
| pos 2 (third seeds)  | fwd       | G (40)  | H (30)  | I (20)  |
| pos 3 (bottom seeds) | rev       | L (0)   | K (5)   | J (10)  |

### Round 1 Courts

| Court 1 | Court 2 | Court 3 |
| ------- | ------- | ------- |
| A (100) | B (90)  | C (80)  |
| F (50)  | E (60)  | D (70)  |
| G (40)  | H (30)  | I (20)  |
| L (0)   | K (5)   | J (10)  |

---

## Round 1 Results

| Court 1  | Court 2  | Court 3 |
| -------- | -------- | ------- |
| 1. A +32 | 1. B +14 | 1. D +6 |
| 2. G +16 | 2. E +12 | 2. C +4 |
| 3. F −16 | 3. H +6  | 3. I −3 |
| 4. L −32 | 4. K −32 | 4. J −7 |

---

## Round 1 → Round 2: First Split (isFirstSplit=true)

Flat redistribution: build global tiers, split by `splitSize(3)=2`, distribute with origin mixing.

### Tiers by finish position

**1sts:** A(C1,+32), B(C2,+14), D(C3,+6) → **A, B, D**
**2nds:** G(C1,+16), E(C2,+12), C(C3,+4) → **G, E, C**
**3rds:** H(C2,+6), I(C3,−3), F(C1,−16) → **H, I, F**
**4ths:** J(C3,−7), K(C2,−32), L(C1,−32) → **J, K, L**

### Flatten & split

```
[A(C1), B(C2), D(C3), G(C1), E(C2), C(C3), H(C2), I(C3), F(C1), J(C3), K(C2), L(C1)]
```

`splitSize(3)=2` → **2 winner courts** (8 slots), **1 loser court** (4 slots)

**Winners** (top 8): `[A(C1), B(C2), D(C3), G(C1), E(C2), C(C3), H(C2), I(C3)]`
**Losers** (bottom 4): `[F(C1), J(C3), K(C2), L(C1)]`

### Origin mixing (Winners → 2 courts)

The `distributeGroup` algorithm assigns each player to the least-loaded court that doesn't already have a player from the same origin.

| Player (origin) | Decision                              | Court 1         | Court 2         |
| --------------- | ------------------------------------- | --------------- | --------------- |
| A (C1)          | → C1                                  | {C1}            | {}              |
| B (C2)          | → C2                                  | {C1}            | {C2}            |
| D (C3)          | tie → C1                              | {C1,C3}         | {C2}            |
| G (C1)          | C1 has C1 → skip → C2                 | {C1,C3}         | {C2,C1}         |
| E (C2)          | C2 has C2 → skip → C1                 | {C1,C3,C2}      | {C2,C1}         |
| C (C3)          | C1 has C3 → skip → C2                 | {C1,C3,C2}      | {C2,C1,C3}      |
| H (C2)          | both have C2 → fallback tie → C1      | {C1,C3,C2} full | {C2,C1,C3}      |
| I (C3)          | both have C3 → fallback, C1 full → C2 | full            | {C2,C1,C3} full |

**Winner courts:**
| Court 1 (W) | Court 2 (W) |
| A (C1) | B (C2) |
| D (C3) | G (C1) |
| E (C2) | C (C3) |
| H (C2) | I (C3) |

**Loser court** (single court → all 4 go there): F(C1), J(C3), K(C2), L(C1)

### Round 2 Courts

| Court 1 (W)   | Court 2 (W)   | Court 3 (L)   |
| ------------- | ------------- | ------------- |
| A (origin C1) | B (origin C2) | F (origin C1) |
| D (origin C3) | G (origin C1) | J (origin C3) |
| E (origin C2) | C (origin C3) | K (origin C2) |
| H (origin C2) | I (origin C3) | L (origin C1) |

---

## Round 2 Results

| Court 1 (W) | Court 2 (W) | Court 3 (L) |
| ----------- | ----------- | ----------- |
| 1. A +12    | 1. B +6     | 1. L +12    |
| 2. E +6     | 2. C +4     | 2. J +3     |
| 3. H −4     | 3. G +2     | 3. F −5     |
| 4. D −14    | 4. I −9     | 4. K −10    |

---

## Round 2 → Round 3: Subsequent Split (isFirstSplit=false)

`splitSize(3)=2` → **Winner bracket** = first 2 results (courts 1-2), **Loser bracket** = last result (court 3).

### Winner bracket (2 courts): re-rank & split

Collect tiers from the winner bracket courts only:

**1sts:** A(W1,+12), B(W2,+6) → **A, B**
**2nds:** E(W1,+6), C(W2,+4) → **E, C**
**3rds:** H(W1,−4), G(W2,+2) → **G, H** (G+2 > H−4)
**4ths:** D(W1,−14), I(W2,−9) → **I, D** (I−9 > D−14)

Flattened: `[A(W1), B(W2), E(W1), C(W2), G(W2), H(W1), I(W2), D(W1)]`

`splitSize(2)=1` → **1 final court** (top 4) + **1 L(W) court** (bottom 4)

**Final court:** [A, B, E, C] — 1 player per origin, single court → no mixing needed
**L(W) court:** [G, H, I, D]

### Loser bracket (1 court): unchanged

Single court → Court 3 stays as-is: [L, J, F, K] (same 4 players as R2 Court 3)

### Round 3 Courts (Final Round)

| Court 1 (F) | Court 2 (L(W)) | Court 3 (L) |
| ----------- | -------------- | ----------- |
| A (W1 1st)  | G (W2 3rd)     | L (L3 1st)  |
| B (W2 1st)  | H (W1 3rd)     | J (L3 2nd)  |
| E (W1 2nd)  | I (W2 4th)     | F (L3 3rd)  |
| C (W2 2nd)  | D (W1 4th)     | K (L3 4th)  |

---

## Round 3 Results (Final Standings)

| Court 1 (F) | Court 2 (L(W)) | Court 3 (L) |
| ----------- | -------------- | ----------- |
| 1. B +12    | 5. G +7        | 9. L +12    |
| 2. A +10    | 6. H +2        | 10. J +3    |
| 3. E −8     | 7. I 0         | 11. F −5    |
| 4. C −14    | 8. D −9        | 12. K −10   |

---

## Final Standings

Champion determined by final court position (not aggregate points):

| Rank | Player | Final Court | Position |
| ---- | ------ | ----------- | -------- |
| 1st  | B      | Court 1     | 1st      |
| 2nd  | A      | Court 1     | 2nd      |
| 3rd  | E      | Court 1     | 3rd      |
| 4th  | C      | Court 1     | 4th      |
| 5th  | G      | Court 2     | 1st      |
| 6th  | H      | Court 2     | 2nd      |
| 7th  | I      | Court 2     | 3rd      |
| 8th  | D      | Court 2     | 4th      |
| 9th  | L      | Court 3     | 1st      |
| 10th | J      | Court 3     | 2nd      |
| 11th | F      | Court 3     | 3rd      |
| 12th | K      | Court 3     | 4th      |

---

## Key Observations

1. **Bracket structure changes each round**: R1→R2 is flat (global tiers + origin mixing). R2→R3 is recursive (winner bracket halves, loser bracket unchanged).

2. **`splitSize(3)=2` determines bracket count**: 2W + 1L every round. But in R3, the "2 winners" are really 1 final + 1 loser-of-winners, because the winner bracket was re-ranked internally.

3. **Loser court is a round-robin**: The 4 players on Court 3 stay together for all subsequent rounds (only 1 loser court, no redistribution).

4. **Origin mixing only applies to the first split**: R1→R2 uses origin mixing to spread 1sts and 2nds from the same R1 court across different R2 courts. R2→R3 doesn't need it because the tier-based split within each bracket naturally separates 1sts from 2nds.

5. **The final winner is determined by Court 1 finish**, not total points across all rounds.
