# Preseed Example: 12 Players (3 Courts, 3 Rounds)

## Overview

12 players is the smallest preseed tournament size that uses bracket-splitting. With 3 courts, `splitSize(3) = 2` — so every round produces **2 winner courts + 1 loser court**, with the top 8 players in winners and bottom 4 in losers.

`calculateRoundCount(3, 'preseed')` = `Math.floor(log2(3-1)) + 2` = 3 rounds.

---

## Round 1: Snake Seeding

Players sorted by seed points (descending), then distributed via snake pattern across 3 courts.

Seed order: A(100), B(90), C(80), D(70), E(60), F(50), G(40), H(30), I(20), J(10), K(5), L(0)

| Position             | Direction | Court 1 | Court 2 | Court 3 |
| -------------------- | --------- | ------- | ------- | ------- |
| pos 0 (top seeds)    | fwd       | A (100) | B (90)  | C (80)  |
| pos 1 (second seeds) | rev       | F (50)  | E (60)  | D (70)  |
| pos 2 (third seeds)  | fwd       | G (40)  | H (30)  | I (20)  |
| pos 3 (bottom seeds) | rev       | L (0)   | K (5)   | J (10)  |

### Round 1 Courts

| Court 1    | Court 2   | Court 3   |
| ---------- | --------- | --------- |
| 1. A (100) | 1. B (90) | 1. C (80) |
| 2. F (50)  | 2. E (60) | 2. D (70) |
| 3. G (40)  | 3. H (30) | 3. I (20) |
| 4. L (0)   | 4. K (5)  | 4. J (10) |

---

## Round 1 Results (after scoring)

Each court plays 3 matches (A&B vs C&D, A&C vs B&D, A&D vs B&C). Scores shown as total points +/– differential.

| Court 1  | Court 2  | Court 3 |
| -------- | -------- | ------- |
| 1. A +32 | 1. B +14 | 1. D +6 |
| 2. G +16 | 2. E +12 | 2. C +4 |
| 3. F −16 | 3. H +6  | 3. I −3 |
| 4. L −32 | 4. K −32 | 4. J −7 |

---

## Round 1 → Round 2: Preseed Redistribution

The preseed algorithm proceeds step by step:

### Step 1: Group by finish tier

Collect every player's **finish position** (1st, 2nd, 3rd, 4th) across all courts, preserving their **origin court** for the mixing constraint.

**Tier 1 (all 1st places):**

- A (court 1, +32)
- B (court 2, +14)
- D (court 3, +6)

Sorted by points (desc): **A, B, D**

**Tier 2 (all 2nd places):**

- G (court 1, +16)
- E (court 2, +12)
- C (court 3, +4)

Sorted by points: **G, E, C**

**Tier 3 (all 3rd places):**

- H (court 2, +6)
- I (court 3, −3)
- F (court 1, −16)

Sorted by points: **H, I, F**

**Tier 4 (all 4th places):**

- J (court 3, −7)
- K (court 2, −32, seed 5)
- L (court 1, −32, seed 0)

Sorted by diff (desc), then playerId: **J** (−7 > −32), then **K** (same diff as L, lower playerId = 5 < 0? Actually playerId: K is player K and L is player L. K = 11th player? No - K is just the name, the actual playerId is the DB auto-increment ID which is unpredictable. For order: after diff tie (−32 each), we use `a.playerId - b.playerId`. Since we don't know the actual DB IDs, in this example we assume K was created before L so K.id < L.id → **K, L**.)

So Tier 4: **J, K, L**

### Step 2: Flatten tiers

All 1sts, then all 2nds, then all 3rds, then all 4ths:

```
[A(1), B(2), D(3), G(1), E(2), C(3), H(2), I(3), F(1), J(3), K(2), L(1)]
```

### Step 3: Split into brackets

`splitSize(3) = 2` → 2 winner courts, 1 loser court.
Winner slots = 2 courts × 4 players = **8 slots**.
Loser slots = 1 court × 4 players = **4 slots**.

**Winner bracket** (top 8): `[A(1), B(2), D(3), G(1), E(2), C(3), H(2), I(3)]`
**Loser bracket** (bottom 4): `[F(1), J(3), K(2), L(1)]`

### Step 4: Distribute within brackets (origin mixing)

The `distributeMixed` algorithm assigns players to courts greedily, preferring courts that don't already have a player from the same origin court. If all courts have that origin, it falls back to the least-loaded court.

**Winner distribution** (8 players → 2 courts of 4):

| Player (origin) | Available courts                   | Assignment | Court 1 origins | Court 2 origins |
| --------------- | ---------------------------------- | ---------- | --------------- | --------------- |
| A (court 1)     | Both empty                         | → Court 1  | {1}             | {}              |
| B (court 2)     | Court 2 empty, Court 1 has 1 ≠ 2   | → Court 2  | {1}             | {2}             |
| D (court 3)     | Both have load 1, neither has 3    | → Court 1  | {1, 3}          | {2}             |
| G (court 1)     | Court 1 has 1 → skip. Court 2 open | → Court 2  | {1, 3}          | {2, 1}          |
| E (court 2)     | Court 2 has 2 → skip. Court 1 open | → Court 1  | {1, 3, 2}       | {2, 1}          |
| C (court 3)     | Court 1 has 3 → skip. Court 2 open | → Court 2  | {1, 3, 2}       | {2, 1, 3}       |
| H (court 2)     | Both have 2 → fallback, tie → C1   | → Court 1  | {1, 3, 2}       | {2, 1, 3}       |
| I (court 3)     | Both have 3 → fallback. C1 full    | → Court 2  | {1, 3, 2}       | {2, 1, 3}       |

**Result — Winner Courts:**

| Court 1 (W) | Court 2 (W) |
| ----------- | ----------- |
| A (court 1) | B (court 2) |
| D (court 3) | G (court 1) |
| E (court 2) | C (court 3) |
| H (court 2) | I (court 3) |

**Origin mixing verified:** No 1st+2nd from the same original court land on the same new court.

- A(1) & G(1) → different courts ✓
- B(2) & E(2) → different courts ✓ (B on C2, E on C1)
- B(2) & H(2) → different courts ✓ (B on C2, H on C1)
- D(3) & C(3) → different courts ✓ (D on C1, C on C2)
- D(3) & I(3) → different courts ✓

**Loser distribution** (4 players → 1 court):

| Player (origin) | Assignment |
| --------------- | ---------- |
| F (court 1)     | → Court 3  |
| J (court 3)     | → Court 3  |
| K (court 2)     | → Court 3  |
| L (court 1)     | → Court 3  |

With only 1 court, all players go there regardless of origin.

### Round 2 Courts

| Court 1 (Winner) | Court 2 (Winner) | Court 3 (Loser) |
| ---------------- | ---------------- | --------------- |
| A (origin 1)     | B (origin 2)     | F (origin 1)    |
| D (origin 3)     | G (origin 1)     | J (origin 3)    |
| E (origin 2)     | C (origin 3)     | K (origin 2)    |
| H (origin 2)     | I (origin 3)     | L (origin 1)    |

---

## Round 2 Results

| Court 1 (W) | Court 2 (W) | Court 3 (L) |
| ----------- | ----------- | ----------- |
| 1. A +12    | 1. B +6     | 1. L +12    |
| 2. E +6     | 2. G +2     | 2. J +3     |
| 3. H −4     | 3. D +1     | 3. F −5     |
| 4. C −14    | 4. I −9     | 4. K −10    |

---

## Round 2 → Round 3: Preseed Redistribution

### Step 1: Group by finish tier

**Tier 1 (1sts):** A(W1, +12), B(W2, +6), L(L3, +12) → sorted: L(+12), A(+12), B(+6) — tiebreak A vs L by playerId (assume A < L)

Wait, let me sort properly: `b.points - a.points` → L(+12) = A(+12) = 12, B(+6) = 6. So L and A tie. Then `b.diff - a.diff` → L(+12) = A(+12) same. Then `a.playerId - b.playerId` → A < L → A first.

Tier 1: **A(W1, +12), L(L3, +12), B(W2, +6)**

**Tier 2 (2nds):** E(W1, +6), G(W2, +2), J(L3, +3) → sorted: E(+6), J(+3), G(+2)

**Tier 3 (3rds):** H(W1, −4), D(W2, +1), F(L3, −5) → sorted: D(+1), H(−4), F(−5)

**Tier 4 (4ths):** C(W1, −14), I(W2, −9), K(L3, −10) → sorted: I(−9), K(−10), C(−14)

### Step 2: Flatten tiers

```
[A(W1), L(L3), B(W2), E(W1), J(L3), G(W2), D(W2), H(W1), F(L3), I(W2), K(L3), C(W1)]
```

### Step 3: Split into brackets

`splitSize(3) = 2` → 2 winner courts, 1 loser court.
Winner slots = 8, Loser slots = 4.

**Winner bracket** (top 8): `[A(W1), L(L3), B(W2), E(W1), J(L3), G(W2), D(W2), H(W1)]`
**Loser bracket** (bottom 4): `[F(L3), I(W2), K(L3), C(W1)]`

### Step 4: Distribute with origin mixing

**Winner distribution** (8 players → 2 courts of 4):

| Player (origin) | Assignment                                           | Court 1    | Court 2    |
| --------------- | ---------------------------------------------------- | ---------- | ---------- |
| A (W1)          | → C1                                                 | {W1}       | {}         |
| L (L3)          | → C2                                                 | {W1}       | {L3}       |
| B (W2)          | → C1                                                 | {W1,W2}    | {L3}       |
| E (W1)          | C1 has W1 → skip → C2                                | {W1,W2}    | {L3,W1}    |
| J (L3)          | C2 has L3 → skip → C1                                | {W1,W2,L3} | {L3,W1}    |
| G (W2)          | C1 has W2 → skip → C2                                | {W1,W2,L3} | {L3,W1,W2} |
| D (W2)          | Both have W2 → fallback, C1 load 3 < C2 3 → tie → C1 | {W1,W2,L3} | {L3,W1,W2} |
| H (W1)          | Both have W1 → fallback, C1 load 4 full → C2         | {W1,W2,L3} | {L3,W1,W2} |

Note: In the fallback step for D, both courts have load 3 and both have origin W2. The algorithm picks the lowest-indexed court (C1). For H, C1 is full (load 4) so H goes to C2.

### Round 3 Courts

| Court 1 (Winner) | Court 2 (Loser) | Court 3 (Loser, bottom) |
| ---------------- | --------------- | ----------------------- |
| A (origin W1)    | L (origin L3)   | F (origin L3)           |
| B (origin W2)    | E (origin W1)   | I (origin W2)           |
| J (origin L3)    | G (origin W2)   | K (origin L3)           |
| D (origin W2)    | H (origin W1)   | C (origin W1)           |

Court 3 is the **bottom loser court** — after Round 3, these players' final standings are already determined by their Court 3 finish.

---

## Round 3 Results (Final Round)

| Court 1  | Court 2 | Court 3   |
| -------- | ------- | --------- |
| 1. B +12 | 5. D +5 | 9. L +12  |
| 2. A +11 | 6. H +1 | 10. J +3  |
| 3. G −10 | 7. I 0  | 11. F −5  |
| 4. E −13 | 8. C −6 | 12. K −10 |

---

## Final Standings

The tournament champion is determined by **final court position** (not total aggregate points):

| Rank | Player | Final Court | Position |
| ---- | ------ | ----------- | -------- |
| 1st  | B      | Court 1     | 1st      |
| 2nd  | A      | Court 1     | 2nd      |
| 3rd  | G      | Court 1     | 3rd      |
| 4th  | E      | Court 1     | 4th      |
| 5th  | D      | Court 2     | 1st      |
| 6th  | H      | Court 2     | 2nd      |
| 7th  | I      | Court 2     | 3rd      |
| 8th  | C      | Court 2     | 4th      |
| 9th  | L      | Court 3     | 1st      |
| 10th | J      | Court 3     | 2nd      |
| 11th | F      | Court 3     | 3rd      |
| 12th | K      | Court 3     | 4th      |

---

## Key Observations

1. **Bracket structure is consistent**: With `splitSize(3) = 2`, every round has 2 winner courts + 1 loser court. The top 8 players by tier+performance always go to winners.

2. **Origin mixing is enforced**: A 1st+2nd from the same previous-round court never land on the same new court. For example, A(1) and G(1) went to different winner courts in R2.

3. **Players move between brackets**: H went from Winner (R2) → Loser (R3) after finishing 3rd on Court 1 in R2. L went from Loser (R2) → Top of Loser bracket (R3) after winning Court 3 in R2.

4. **Court 3 players are locked**: Since there's only 1 loser court, players there play against the same pool each round. Their final rank is determined within that single loser court.

5. **The champion is the winner of Court 1**: B won the final round on Court 1, beating A who had dominated earlier rounds. This demonstrates that final aggregate points don't determine the winner — only the final court finish matters.
