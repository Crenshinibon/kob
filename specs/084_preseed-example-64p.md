# Preseed Example: 64 Players (16 Courts, 5 Rounds)

## Overview

64 players on 16 courts. `calculateRoundCount(16, 'preseed') = floor(log2(15)) + 2 = 5` rounds.

**Assumption:** Players finish in **listed order** on every court (top of list = 1st). Paths are fully deterministic.

**Player IDs:** P01 (seed 1, highest) through P64 (seed 64, lowest).

### Bracket tree

```
Round 1:   [C1]…[C16]                              snake seeding
              ↓
Round 2:   [W1]…[W8] | [L9]…[L16]                  splitSize(16)=8 → 8W+8L
              ↓              ↓
Round 3:   [WT×4] [WB×4] | [LT×4] [LB×4]           one-level within each half
              ↓              ↓
Round 4:   16 leaf courts (WW/WL/LW/LL labels)     one-level on each quarter
              ↓
Round 5:   [F1]…[F4] | [T9]…[T12]                  winner-only → 8 courts, 32 players
           (other 32 players settled after R4)
```

### Subdivision schedule

| Transition | roundsCompleted | Groups | Mode | Courts after |
| ---------- | --------------- | ------ | ---- | ------------ |
| R1→R2 | 0 | all 16 | global first split | 16 |
| R2→R3 | 1 | [1–8], [9–16] | one-level each | 16 |
| R3→R4 | 2 | [1–4], [5–8], [9–12], [13–16] | one-level each | 16 |
| R4→R5 | 3 | [1,2], [3,4], … [15,16] | winner-only each | 8 |

### Gold-race rule

- **1st or 2nd** → stay in the upper court of the pair (remain in gold-race subtree).
- **3rd or 4th** → drop to the lower court **permanently** within that subtree.
- **Winner-only split (R4→R5):** only the top court of each pair plays R5; bottom court is settled.

---

## Round 1: Snake Seeding

| Court | 1st | 2nd | 3rd | 4th |
| ----- | --- | --- | --- | --- |
| 1 | P01 | P32 | P33 | P64 |
| 2 | P02 | P31 | P34 | P63 |
| 3 | P03 | P30 | P35 | P62 |
| 4 | P04 | P29 | P36 | P61 |
| 5 | P05 | P28 | P37 | P60 |
| 6 | P06 | P27 | P38 | P59 |
| 7 | P07 | P26 | P39 | P58 |
| 8 | P08 | P25 | P40 | P57 |
| 9 | P09 | P24 | P41 | P56 |
| 10 | P10 | P23 | P42 | P55 |
| 11 | P11 | P22 | P43 | P54 |
| 12 | P12 | P21 | P44 | P53 |
| 13 | P13 | P20 | P45 | P52 |
| 14 | P14 | P19 | P46 | P51 |
| 15 | P15 | P18 | P47 | P50 |
| 16 | P16 | P17 | P48 | P49 |

Round 1 results = same order (listed position = finish).

---

## Round 2 (after R1→R2 first split)

Courts 1–8 = **Winner bracket (W)**. Courts 9–16 = **Loser bracket (L)**.

| Court | Label | Players |
| ----- | ----- | ------- |
| 1 | W1 | P01, P09, P17, P25 |
| 2 | W2 | P02, P10, P18, P26 |
| 3 | W3 | P03, P11, P19, P27 |
| 4 | W4 | P04, P12, P20, P28 |
| 5 | W5 | P05, P13, P21, P29 |
| 6 | W6 | P06, P14, P22, P30 |
| 7 | W7 | P07, P15, P23, P31 |
| 8 | W8 | P08, P16, P24, P32 |
| 9 | L9 | P33, P41, P49, P57 |
| 10 | L10 | P34, P42, P50, P58 |
| 11 | L11 | P35, P43, P51, P59 |
| 12 | L12 | P36, P44, P52, P60 |
| 13 | L13 | P37, P45, P53, P61 |
| 14 | L14 | P38, P46, P54, P62 |
| 15 | L15 | P39, P47, P55, P63 |
| 16 | L16 | P40, P48, P56, P64 |

---

## Round 3 (after R2→R3 one-level split)

Within W half: courts 1,3,5,7 = top of each pair (WT); courts 2,4,6,8 = bottom (WB).
Within L half: courts 9,11,13,15 = top (LT); courts 10,12,14,16 = bottom (LB).

| Court | Label | Players |
| ----- | ----- | ------- |
| 1 | WT1 | P01, P03, P10, P12 |
| 2 | WT2 | P02, P04, P09, P11 |
| 3 | WT3 | P17, P19, P26, P28 |
| 4 | WT4 | P18, P20, P25, P27 |
| 5 | WB5 | P05, P07, P14, P16 |
| 6 | WB6 | P06, P08, P13, P15 |
| 7 | WB7 | P21, P23, P30, P32 |
| 8 | WB8 | P22, P24, P29, P31 |
| 9 | LT9 | P33, P35, P42, P44 |
| 10 | LT10 | P34, P36, P41, P43 |
| 11 | LT11 | P49, P51, P58, P60 |
| 12 | LT12 | P50, P52, P57, P59 |
| 13 | LB13 | P37, P39, P46, P48 |
| 14 | LB14 | P38, P40, P45, P47 |
| 15 | LB15 | P53, P55, P62, P64 |
| 16 | LB16 | P54, P56, P61, P63 |

---

## Round 4 (after R3→R4 one-level split)

| Court | Label | Players |
| ----- | ----- | ------- |
| 1 | WW1 | P01, P02, P03, P04 |
| 2 | WL2 | P09, P10, P11, P12 |
| 3 | WW3 | P17, P18, P19, P20 |
| 4 | WL4 | P25, P26, P27, P28 |
| 5 | WW5 | P05, P06, P07, P08 |
| 6 | WL6 | P13, P14, P15, P16 |
| 7 | WW7 | P21, P22, P23, P24 |
| 8 | WL8 | P29, P30, P31, P32 |
| 9 | LW9 | P33, P34, P35, P36 |
| 10 | LL10 | P41, P42, P43, P44 |
| 11 | LW11 | P49, P50, P51, P52 |
| 12 | LL12 | P57, P58, P59, P60 |
| 13 | LW13 | P37, P38, P39, P40 |
| 14 | LL14 | P45, P46, P47, P48 |
| 15 | LW15 | P53, P54, P55, P56 |
| 16 | LL16 | P61, P62, P63, P64 |

---

## Round 5 (after R4→R5 winner-only split)

Only courts 1,3,5,7,9,11,13,15 from R4 continue (renumbered 1–8). Bottom courts settled.

| Court | Label | Players |
| ----- | ----- | ------- |
| 1 | F1 | P01, P02, P03, P04 |
| 2 | F2 | P17, P18, P19, P20 |
| 3 | F3 | P05, P06, P07, P08 |
| 4 | F4 | P21, P22, P23, P24 |
| 5 | T9 | P33, P34, P35, P36 |
| 6 | T10 | P49, P50, P51, P52 |
| 7 | T11 | P37, P38, P39, P40 |
| 8 | T12 | P53, P54, P55, P56 |

---

## Complete player paths

Format: **court label #finish**. `—` = settled after R4, no R5.

| Player | R1 | R2 | R3 | R4 | R5 |
| ------ | -- | -- | -- | -- | -- |
| P01 | C1 #1 | W1 #1 | WT1 #1 | WW1 #1 | F1 #1 |
| P02 | C2 #1 | W2 #1 | WT2 #1 | WW1 #2 | F1 #2 |
| P03 | C3 #1 | W3 #1 | WT1 #2 | WW1 #3 | F1 #3 |
| P04 | C4 #1 | W4 #1 | WT2 #2 | WW1 #4 | F1 #4 |
| P05 | C5 #1 | W5 #1 | WB5 #1 | WW5 #1 | F3 #1 |
| P06 | C6 #1 | W6 #1 | WB6 #1 | WW5 #2 | F3 #2 |
| P07 | C7 #1 | W7 #1 | WB5 #2 | WW5 #3 | F3 #3 |
| P08 | C8 #1 | W8 #1 | WB6 #2 | WW5 #4 | F3 #4 |
| P09 | C9 #1 | W1 #2 | WT2 #3 | WL2 #1 | — (settled) |
| P10 | C10 #1 | W2 #2 | WT1 #3 | WL2 #2 | — (settled) |
| P11 | C11 #1 | W3 #2 | WT2 #4 | WL2 #3 | — (settled) |
| P12 | C12 #1 | W4 #2 | WT1 #4 | WL2 #4 | — (settled) |
| P13 | C13 #1 | W5 #2 | WB6 #3 | WL6 #1 | — (settled) |
| P14 | C14 #1 | W6 #2 | WB5 #3 | WL6 #2 | — (settled) |
| P15 | C15 #1 | W7 #2 | WB6 #4 | WL6 #3 | — (settled) |
| P16 | C16 #1 | W8 #2 | WB5 #4 | WL6 #4 | — (settled) |
| P17 | C16 #2 | W1 #3 | WT3 #1 | WW3 #1 | F2 #1 |
| P18 | C15 #2 | W2 #3 | WT4 #1 | WW3 #2 | F2 #2 |
| P19 | C14 #2 | W3 #3 | WT3 #2 | WW3 #3 | F2 #3 |
| P20 | C13 #2 | W4 #3 | WT4 #2 | WW3 #4 | F2 #4 |
| P21 | C12 #2 | W5 #3 | WB7 #1 | WW7 #1 | F4 #1 |
| P22 | C11 #2 | W6 #3 | WB8 #1 | WW7 #2 | F4 #2 |
| P23 | C10 #2 | W7 #3 | WB7 #2 | WW7 #3 | F4 #3 |
| P24 | C9 #2 | W8 #3 | WB8 #2 | WW7 #4 | F4 #4 |
| P25 | C8 #2 | W1 #4 | WT4 #3 | WL4 #1 | — (settled) |
| P26 | C7 #2 | W2 #4 | WT3 #3 | WL4 #2 | — (settled) |
| P27 | C6 #2 | W3 #4 | WT4 #4 | WL4 #3 | — (settled) |
| P28 | C5 #2 | W4 #4 | WT3 #4 | WL4 #4 | — (settled) |
| P29 | C4 #2 | W5 #4 | WB8 #3 | WL8 #1 | — (settled) |
| P30 | C3 #2 | W6 #4 | WB7 #3 | WL8 #2 | — (settled) |
| P31 | C2 #2 | W7 #4 | WB8 #4 | WL8 #3 | — (settled) |
| P32 | C1 #2 | W8 #4 | WB7 #4 | WL8 #4 | — (settled) |
| P33 | C1 #3 | L9 #1 | LT9 #1 | LW9 #1 | T9 #1 |
| P34 | C2 #3 | L10 #1 | LT10 #1 | LW9 #2 | T9 #2 |
| P35 | C3 #3 | L11 #1 | LT9 #2 | LW9 #3 | T9 #3 |
| P36 | C4 #3 | L12 #1 | LT10 #2 | LW9 #4 | T9 #4 |
| P37 | C5 #3 | L13 #1 | LB13 #1 | LW13 #1 | T11 #1 |
| P38 | C6 #3 | L14 #1 | LB14 #1 | LW13 #2 | T11 #2 |
| P39 | C7 #3 | L15 #1 | LB13 #2 | LW13 #3 | T11 #3 |
| P40 | C8 #3 | L16 #1 | LB14 #2 | LW13 #4 | T11 #4 |
| P41 | C9 #3 | L9 #2 | LT10 #3 | LL10 #1 | — (settled) |
| P42 | C10 #3 | L10 #2 | LT9 #3 | LL10 #2 | — (settled) |
| P43 | C11 #3 | L11 #2 | LT10 #4 | LL10 #3 | — (settled) |
| P44 | C12 #3 | L12 #2 | LT9 #4 | LL10 #4 | — (settled) |
| P45 | C13 #3 | L13 #2 | LB14 #3 | LL14 #1 | — (settled) |
| P46 | C14 #3 | L14 #2 | LB13 #3 | LL14 #2 | — (settled) |
| P47 | C15 #3 | L15 #2 | LB14 #4 | LL14 #3 | — (settled) |
| P48 | C16 #3 | L16 #2 | LB13 #4 | LL14 #4 | — (settled) |
| P49 | C16 #4 | L9 #3 | LT11 #1 | LW11 #1 | T10 #1 |
| P50 | C15 #4 | L10 #3 | LT12 #1 | LW11 #2 | T10 #2 |
| P51 | C14 #4 | L11 #3 | LT11 #2 | LW11 #3 | T10 #3 |
| P52 | C13 #4 | L12 #3 | LT12 #2 | LW11 #4 | T10 #4 |
| P53 | C12 #4 | L13 #3 | LB15 #1 | LW15 #1 | T12 #1 |
| P54 | C11 #4 | L14 #3 | LB16 #1 | LW15 #2 | T12 #2 |
| P55 | C10 #4 | L15 #3 | LB15 #2 | LW15 #3 | T12 #3 |
| P56 | C9 #4 | L16 #3 | LB16 #2 | LW15 #4 | T12 #4 |
| P57 | C8 #4 | L9 #4 | LT12 #3 | LL12 #1 | — (settled) |
| P58 | C7 #4 | L10 #4 | LT11 #3 | LL12 #2 | — (settled) |
| P59 | C6 #4 | L11 #4 | LT12 #4 | LL12 #3 | — (settled) |
| P60 | C5 #4 | L12 #4 | LT11 #4 | LL12 #4 | — (settled) |
| P61 | C4 #4 | L13 #4 | LB16 #3 | LL16 #1 | — (settled) |
| P62 | C3 #4 | L14 #4 | LB15 #3 | LL16 #2 | — (settled) |
| P63 | C2 #4 | L15 #4 | LB16 #4 | LL16 #3 | — (settled) |
| P64 | C1 #4 | L16 #4 | LB15 #4 | LL16 #4 | — (settled) |

---

## Spot checks

| Player | R1 | R2 | R3 | R4 | R5 | Notes |
| ------ | -- | -- | -- | -- | -- | ----- |
| P01 | C1 #1 | W1 #1 | WT1 #1 | WW1 #1 | F1 #1 | Always 1st every round on gold path → F1#1 (champion track) |
| P02 | C2 #1 | W2 #1 | WT2 #1 | WW1 #2 | F1 #2 | Always top-2 in gold subtree → F1#2 |
| P09 | C9 #1 | W1 #2 | WT2 #3 | WL2 #1 | — (settled) | R1 1st on C9. R3: WT2#3 (3rd in pair) drops from WW. R4: WL2#1 but pair bottom — settled, no R5 |
| P16 | C16 #1 | W8 #2 | WB5 #4 | WL6 #4 | — (settled) | R1: 1st on C16. R2: W8#2. R4: WL6#4 (bottom of pair) → settled |
| P17 | C16 #2 | W1 #3 | WT3 #1 | WW3 #1 | F2 #1 | R1: 2nd on C16 → W1#3 in R2 (3rd in tier) — drops within W half |
| P32 | C1 #2 | W8 #4 | WB7 #4 | WL8 #4 | — (settled) | R1: 2nd on C1. R2: W8#4 (4th on W8) → drops to WB in R3, settled after R4 |
| P33 | C1 #3 | L9 #1 | LT9 #1 | LW9 #1 | T9 #1 | R1: 3rd on C1 → L9#1 — tops loser bracket consolation |
| P64 | C1 #4 | L16 #4 | LB15 #4 | LL16 #4 | — (settled) | R1: 4th on C1 — bottom overall |

### P09 — no return to gold

`C9 #1 → W1 #2 → WT2 #3 → WL2 #1 → — (settled)`

P09 was 1st on C9 in R1, reached W1 in R2, but finished 3rd in the R2→R3 pair split → dropped to WT2 (court 2). Even with 1st on WL2 in R4, **R5 = settled**. Bottom court of pair (1,2) never continues.

### P04 — still on gold court in R5 after WL detour

`C4 #1 → W4 #1 → WT2 #2 → WW1 #4 → F1 #4`

P04 was 1st on C4 through R2, then **2nd on WL4** in R3 (peer split within W quarter — not a 3rd/4th dropout). In R4, P04 lands on **WW1** via the [3,4] pair's top court. All four WW1 players continue to **F1** in R5 (winner-only passes the whole top court forward).

---

## How to verify

1. Open **Complete player paths** and pick any player.
2. At each round, note their finish (#1–#4).
3. For peer/one-level splits: **#1–#2 → top court of pair; #3–#4 → bottom court**.
4. For winner-only (R4→R5): only players on courts 1,3,5,7,9,11,13,15 in R4 play R5.
5. Players on bottom courts (2,4,6,8,10,12,14,16) in R4 show **— (settled)**.
