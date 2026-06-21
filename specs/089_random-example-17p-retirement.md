# Random Seed Example: 17 Players — Round 3 Retirement

## Overview

This example shows how **between-round retirement** works in random seed format. Retirement is not a full reshuffle and not “keep every group except remove one player”. It is **ladder redistribution from the previous round’s standings**, with the retired player excluded and empty slots filled by the next relegated player on the same ladder path.

We use the same Round 1–2 data as [085_random-example-16p.md](./085_random-example-16p.md), plus player **Q** on the 5-player bottom court.

```
Round 1:    [C1] [C2] [C3] [C4 5p]   (random shuffle)
              ↓
Round 2:    [C1] [C2] [C3] [C4 5p]   (vertical seed)
              ↓
Round 3:    [C1] [C2] [C3] [C4 5p]   (ladder) — scores not yet entered
              ↓ retire D from Court 2
Round 3':   [C1] [C2] [C3] [C4 4p]   (ladder minus D, cascade backfill)
```

---

## Setup: 17 Players

Court sizes: `[4, 4, 4, 5]`. Rounds 1–2 follow the 16-player example; **Q** is the 17th player and lands on the 5-player bottom court in Round 1.

### Round 2 Results (same as 16p on Courts 1–4)

| Court 1  | Court 2  | Court 3 | Court 4  | Court 4 (5p) |
| -------- | -------- | ------- | -------- | ------------ |
| 1. A +20 | 1. E +16 | 1. K +6 | 1. P +4  | 1. Q +2      |
| 2. B +12 | 2. F +8  | 2. G +2 | 2. M +2  |              |
| 3. C −4  | 3. J −2  | 3. L −6 | 3. O −6  |              |
| 4. D −28 | 4. H −22 | 4. I −2 | 4. N −10 |              |

*(Q’s exact points are omitted — only placement on the bottom court matters for the retirement walkthrough.)*

---

## Round 2 → Round 3: Normal Ladder (17 players)

```
Court 1 ← C1[1st+2nd] + C2[1st+2nd]  →  A, B, E, F
Court 2 ← C1[3rd+4th] + C3[1st+2nd]  →  C, D, K, G
Court 3 ← C2[3rd+4th] + C4[1st+2nd]  →  J, H, P, M
Court 4 ← C3[3rd+4th] + C4[3rd+]      →  L, I, O, N, Q   (5p bottom)
```

### Round 3 Courts (before retirement)

| Court 1      | Court 2  | Court 3  | Court 4 (5p) |
| ------------ | -------- | -------- | ------------ |
| A (C1 stays) | C (C1 ↓) | J (C2 ↓) | L (C3 ↓)     |
| B (C1 stays) | D (C1 ↓) | H (C2 ↓) | I (C3 ↓)     |
| E (C2 ↑)     | K (C3 ↑) | P (C4 ↑) | O (C4)       |
| F (C2 ↑)     | G (C3 ↑) | M (C4 ↑) | N (C4)       |
|              |          |          | Q (C4 5p)    |

**No scores entered yet.** Organizer retires **D** (was 4th on Court 1 in Round 2, currently on Court 2).

---

## Retirement: D leaves (17 → 16 players)

```
Before: 17 players → 4×4p + 1×5p
After:  16 players → 4×4p
```

### Algorithm

1. Keep **full Round 2 standings** (ranks unchanged — D still appears as 4th on Court 1 in history).
2. Run **ladder redistribution** with new court sizes `[4, 4, 4, 4]`.
3. **Skip D** when filling rank slots.
4. **Backfill** any court that is short: promote the next relegated player from that court’s Round 2 pool (rank 3, then 4, …).

### Slot filling for Court 2

Normal Court 2 slots:

| Slot source        | Player |
| ------------------ | ------ |
| Court 1, 3rd       | C      |
| Court 1, 4th       | ~~D~~ (retired) |
| Court 3, 1st       | K      |
| Court 3, 2nd       | G      |

Court 2 is one player short. **Backfill** from Court 2’s Round 2 relegation pool: **J** (was 3rd on Court 2 in Round 2, would normally have gone to Court 3).

### Round 3 Courts (after D retires)

| Court 1 (unchanged) | Court 2 (D out, J up) | Court 3 (cascade) | Court 4 (now 4p) |
| ------------------- | --------------------- | ----------------- | ---------------- |
| A                   | C                     | H                 | I                |
| B                   | K                     | P                 | O                |
| E                   | G                     | M                 | N                |
| F                   | J ← backfill          | L ← from C3       | Q                |

### What stays the same vs what moves

| Court | Changes? | Why |
| ----- | -------- | --- |
| **1** | **No**   | D was not in Court 1’s promotion pool (ranks 1–2 stay, ranks 3–4 from C1 only fed Court 2). |
| **2** | **Yes**  | D’s slot opens; J backfills from the same court’s relegation path. |
| **3** | **Yes**  | Loses J to Court 2; lower courts cascade upward. |
| **4** | **Yes**  | Shrinks from 5p to 4p; one player drops off the bottom. |

---

## 16-Player Variant (same logic, cleaner numbers)

Using only the 16-player data from [085](./085_random-example-16p.md): retire **D** from Court 2 before Round 3 scores.

| Court 1 (unchanged) | Court 2              | Court 3           | Court 4 (3p) |
| ------------------- | -------------------- | ----------------- | ------------ |
| A, B, E, F          | C, K, G, **J** ↑     | H, P, M, L        | O, N, I      |

- D’s slot on Court 2 → **J** (Court 2’s 3rd from Round 2).
- Court 3 loses J, gains **L** from the next rung down.
- 15 players → bottom court becomes **3p**.

This case is covered by unit tests in `tournament-logic.test.ts`.

---

## Key Rules

1. **Retirement timing**: only before any scores are entered in the current round.
2. **Redistribution source**: previous round’s **full standings** (ranks preserved).
3. **Not a reshuffle**: ladder slots are fixed by rank; only absent players change who fills them.
4. **Cascade**: when a rank slot is empty, the next player from the same court’s relegation pool moves up.
5. **Court size change**: `recalculateCourtConfigAfterRetirement()` may shrink the bottom court (17→16 removes the 5p court).

---

## Implementation

See `ladderRedistribute()` in `src/lib/tournament-logic.ts`:

- `takeByRank()` selects by **finish rank**, not array index.
- `excludedPlayerIds` skips retired players without compressing standings.
- Backfill loop promotes relegated players from the same previous-round court when a group is short.
