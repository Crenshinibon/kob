# Preseed Example: 64 Players (16 Courts, 5 Rounds)

## Overview

64 players on 16 courts. `calculateRoundCount(16, 'preseed') = 5` rounds.

**Players:** P01 (highest seed) through P64 (lowest seed).

**Assumption:** On every court, players finish in the **order they are listed** at the start of the round (1st = top line, 4th = bottom line).

### Gold-race rule

- **1st or 2nd** → stay in the upper court when the bracket pair splits.
- **3rd or 4th** → drop to the lower court permanently within that subtree.
- **R4→R5:** only the top court of each pair plays round 5; bottom courts are settled.

### Bracket tree

```
R1:  [C1]…[C16]
       ↓ first split (8W + 8L)
R2:  [W1]…[W8] | [L9]…[L16]
       ↓ one-level within each half
R3:  [WT×4][WB×4] | [LT×4][LB×4]
       ↓ one-level on each quarter
R4:  [WW/WL × 8] | [LW/LL × 8]
       ↓ winner-only pairs
R5:  [F1]…[F4] | [T9]…[T12]   (32 players; other 32 settled after R4)
```

---

## Round 1

Round 1 assignments come from **snake seeding** across 16 courts.

### At the start of round 1

**Court 1 (C1):** P01, P32, P33, P64

**Court 2 (C2):** P02, P31, P34, P63

**Court 3 (C3):** P03, P30, P35, P62

**Court 4 (C4):** P04, P29, P36, P61

**Court 5 (C5):** P05, P28, P37, P60

**Court 6 (C6):** P06, P27, P38, P59

**Court 7 (C7):** P07, P26, P39, P58

**Court 8 (C8):** P08, P25, P40, P57

**Court 9 (C9):** P09, P24, P41, P56

**Court 10 (C10):** P10, P23, P42, P55

**Court 11 (C11):** P11, P22, P43, P54

**Court 12 (C12):** P12, P21, P44, P53

**Court 13 (C13):** P13, P20, P45, P52

**Court 14 (C14):** P14, P19, P46, P51

**Court 15 (C15):** P15, P18, P47, P50

**Court 16 (C16):** P16, P17, P48, P49

### End of round 1

Players finish in **listed order** (top player = 1st).

**Court 1 (C1):**

1. P01
2. P32
3. P33
4. P64

**Court 2 (C2):**

1. P02
2. P31
3. P34
4. P63

**Court 3 (C3):**

1. P03
2. P30
3. P35
4. P62

**Court 4 (C4):**

1. P04
2. P29
3. P36
4. P61

**Court 5 (C5):**

1. P05
2. P28
3. P37
4. P60

**Court 6 (C6):**

1. P06
2. P27
3. P38
4. P59

**Court 7 (C7):**

1. P07
2. P26
3. P39
4. P58

**Court 8 (C8):**

1. P08
2. P25
3. P40
4. P57

**Court 9 (C9):**

1. P09
2. P24
3. P41
4. P56

**Court 10 (C10):**

1. P10
2. P23
3. P42
4. P55

**Court 11 (C11):**

1. P11
2. P22
3. P43
4. P54

**Court 12 (C12):**

1. P12
2. P21
3. P44
4. P53

**Court 13 (C13):**

1. P13
2. P20
3. P45
4. P52

**Court 14 (C14):**

1. P14
2. P19
3. P46
4. P51

**Court 15 (C15):**

1. P15
2. P18
3. P47
4. P50

**Court 16 (C16):**

1. P16
2. P17
3. P48
4. P49

---

**Round 1 → Round 2** (first split): global tiers, `splitSize(16)=8` → courts 1–8 winner bracket, courts 9–16 loser bracket. Origin mixing within each bracket.

- 1sts + 2nds from all courts → winner bracket (courts 1–8)
- 3rds + 4ths from all courts → loser bracket (courts 9–16)

## Round 2

### At the start of round 2

**Court 1 (W1):** P01, P09, P17, P25

**Court 2 (W2):** P02, P10, P18, P26

**Court 3 (W3):** P03, P11, P19, P27

**Court 4 (W4):** P04, P12, P20, P28

**Court 5 (W5):** P05, P13, P21, P29

**Court 6 (W6):** P06, P14, P22, P30

**Court 7 (W7):** P07, P15, P23, P31

**Court 8 (W8):** P08, P16, P24, P32

**Court 9 (L9):** P33, P41, P49, P57

**Court 10 (L10):** P34, P42, P50, P58

**Court 11 (L11):** P35, P43, P51, P59

**Court 12 (L12):** P36, P44, P52, P60

**Court 13 (L13):** P37, P45, P53, P61

**Court 14 (L14):** P38, P46, P54, P62

**Court 15 (L15):** P39, P47, P55, P63

**Court 16 (L16):** P40, P48, P56, P64

### End of round 2

Players finish in **listed order** (top player = 1st).

**Court 1 (W1):**

1. P01
2. P09
3. P17
4. P25

**Court 2 (W2):**

1. P02
2. P10
3. P18
4. P26

**Court 3 (W3):**

1. P03
2. P11
3. P19
4. P27

**Court 4 (W4):**

1. P04
2. P12
3. P20
4. P28

**Court 5 (W5):**

1. P05
2. P13
3. P21
4. P29

**Court 6 (W6):**

1. P06
2. P14
3. P22
4. P30

**Court 7 (W7):**

1. P07
2. P15
3. P23
4. P31

**Court 8 (W8):**

1. P08
2. P16
3. P24
4. P32

**Court 9 (L9):**

1. P33
2. P41
3. P49
4. P57

**Court 10 (L10):**

1. P34
2. P42
3. P50
4. P58

**Court 11 (L11):**

1. P35
2. P43
3. P51
4. P59

**Court 12 (L12):**

1. P36
2. P44
3. P52
4. P60

**Court 13 (L13):**

1. P37
2. P45
3. P53
4. P61

**Court 14 (L14):**

1. P38
2. P46
3. P54
4. P62

**Court 15 (L15):**

1. P39
2. P47
3. P55
4. P63

**Court 16 (L16):**

1. P40
2. P48
3. P56
4. P64

---

**Round 2 → Round 3** (one-level ×2): each half subdivides independently.

- Pair (C1,C2): 1sts+2nds → top court, 3rds+4ths → bottom court
- Same for (C3,C4)…(C7,C8) within winner bracket, and (C9,C10)…(C15,C16) within loser bracket

## Round 3

### At the start of round 3

**Court 1 (WT1):** P01, P03, P10, P12

**Court 2 (WT2):** P02, P04, P09, P11

**Court 3 (WT3):** P17, P19, P26, P28

**Court 4 (WT4):** P18, P20, P25, P27

**Court 5 (WB5):** P05, P07, P14, P16

**Court 6 (WB6):** P06, P08, P13, P15

**Court 7 (WB7):** P21, P23, P30, P32

**Court 8 (WB8):** P22, P24, P29, P31

**Court 9 (LT9):** P33, P35, P42, P44

**Court 10 (LT10):** P34, P36, P41, P43

**Court 11 (LT11):** P49, P51, P58, P60

**Court 12 (LT12):** P50, P52, P57, P59

**Court 13 (LB13):** P37, P39, P46, P48

**Court 14 (LB14):** P38, P40, P45, P47

**Court 15 (LB15):** P53, P55, P62, P64

**Court 16 (LB16):** P54, P56, P61, P63

### End of round 3

Players finish in **listed order** (top player = 1st).

**Court 1 (WT1):**

1. P01
2. P03
3. P10
4. P12

**Court 2 (WT2):**

1. P02
2. P04
3. P09
4. P11

**Court 3 (WT3):**

1. P17
2. P19
3. P26
4. P28

**Court 4 (WT4):**

1. P18
2. P20
3. P25
4. P27

**Court 5 (WB5):**

1. P05
2. P07
3. P14
4. P16

**Court 6 (WB6):**

1. P06
2. P08
3. P13
4. P15

**Court 7 (WB7):**

1. P21
2. P23
3. P30
4. P32

**Court 8 (WB8):**

1. P22
2. P24
3. P29
4. P31

**Court 9 (LT9):**

1. P33
2. P35
3. P42
4. P44

**Court 10 (LT10):**

1. P34
2. P36
3. P41
4. P43

**Court 11 (LT11):**

1. P49
2. P51
3. P58
4. P60

**Court 12 (LT12):**

1. P50
2. P52
3. P57
4. P59

**Court 13 (LB13):**

1. P37
2. P39
3. P46
4. P48

**Court 14 (LB14):**

1. P38
2. P40
3. P45
4. P47

**Court 15 (LB15):**

1. P53
2. P55
3. P62
4. P64

**Court 16 (LB16):**

1. P54
2. P56
3. P61
4. P63

---

**Round 3 → Round 4** (one-level ×4): each quarter subdivides into two peer pairs.

- Within each group of 4 courts: two pair splits by finish position

## Round 4

### At the start of round 4

**Court 1 (WW1):** P01, P02, P03, P04

**Court 2 (WL2):** P09, P10, P11, P12

**Court 3 (WW3):** P17, P18, P19, P20

**Court 4 (WL4):** P25, P26, P27, P28

**Court 5 (WW5):** P05, P06, P07, P08

**Court 6 (WL6):** P13, P14, P15, P16

**Court 7 (WW7):** P21, P22, P23, P24

**Court 8 (WL8):** P29, P30, P31, P32

**Court 9 (LW9):** P33, P34, P35, P36

**Court 10 (LL10):** P41, P42, P43, P44

**Court 11 (LW11):** P49, P50, P51, P52

**Court 12 (LL12):** P57, P58, P59, P60

**Court 13 (LW13):** P37, P38, P39, P40

**Court 14 (LL14):** P45, P46, P47, P48

**Court 15 (LW15):** P53, P54, P55, P56

**Court 16 (LL16):** P61, P62, P63, P64

### End of round 4

Players finish in **listed order** (top player = 1st).

**Court 1 (WW1):**

1. P01
2. P02
3. P03
4. P04

**Court 2 (WL2):**

1. P09
2. P10
3. P11
4. P12

**Court 3 (WW3):**

1. P17
2. P18
3. P19
4. P20

**Court 4 (WL4):**

1. P25
2. P26
3. P27
4. P28

**Court 5 (WW5):**

1. P05
2. P06
3. P07
4. P08

**Court 6 (WL6):**

1. P13
2. P14
3. P15
4. P16

**Court 7 (WW7):**

1. P21
2. P22
3. P23
4. P24

**Court 8 (WL8):**

1. P29
2. P30
3. P31
4. P32

**Court 9 (LW9):**

1. P33
2. P34
3. P35
4. P36

**Court 10 (LL10):**

1. P41
2. P42
3. P43
4. P44

**Court 11 (LW11):**

1. P49
2. P50
3. P51
4. P52

**Court 12 (LL12):**

1. P57
2. P58
3. P59
4. P60

**Court 13 (LW13):**

1. P37
2. P38
3. P39
4. P40

**Court 14 (LL14):**

1. P45
2. P46
3. P47
4. P48

**Court 15 (LW15):**

1. P53
2. P54
3. P55
4. P56

**Court 16 (LL16):**

1. P61
2. P62
3. P63
4. P64

---

**Round 4 → Round 5** (winner-only ×8): only the **top court** from each pair continues.

| R4 pair | Continues (R5) | Settled after R4 |
| ------- | -------------- | ---------------- |
| (1,2) | Court 1 → F1 | Court 2 (WL2) |
| (3,4) | Court 3 → F2 | Court 4 |
| (5,6) | Court 5 → F3 | Court 6 |
| (7,8) | Court 7 → F4 | Court 8 |
| (9,10) | Court 9 → T9 | Court 10 |
| (11,12) | Court 11 → T10 | Court 12 |
| (13,14) | Court 13 → T11 | Court 14 |
| (15,16) | Court 15 → T12 | Court 16 |

32 players on R4 bottom courts (2,4,6,8,10,12,14,16) are **settled** — no round 5.

## Round 5

Only **8 courts** (32 players) play round 5. The other 32 players were settled on R4 bottom courts (2, 4, 6, 8, 10, 12, 14, 16) and do not appear below.

### At the start of round 5

**Court 1 (F1):** P01, P02, P03, P04

**Court 2 (F2):** P17, P18, P19, P20

**Court 3 (F3):** P05, P06, P07, P08

**Court 4 (F4):** P21, P22, P23, P24

**Court 5 (T9):** P33, P34, P35, P36

**Court 6 (T10):** P49, P50, P51, P52

**Court 7 (T11):** P37, P38, P39, P40

**Court 8 (T12):** P53, P54, P55, P56

### End of round 5

Players finish in **listed order** (top player = 1st).

**Court 1 (F1):**

1. P01
2. P02
3. P03
4. P04

**Court 2 (F2):**

1. P17
2. P18
3. P19
4. P20

**Court 3 (F3):**

1. P05
2. P06
3. P07
4. P08

**Court 4 (F4):**

1. P21
2. P22
3. P23
4. P24

**Court 5 (T9):**

1. P33
2. P34
3. P35
4. P36

**Court 6 (T10):**

1. P49
2. P50
3. P51
4. P52

**Court 7 (T11):**

1. P37
2. P38
3. P39
4. P40

**Court 8 (T12):**

1. P53
2. P54
3. P55
4. P56

---

## Final standings (overview)

| Place range | Determined by |
| ----------- | ------------- |
| 1–4 | R5 Court 1 (F1) finish order |
| 5–8 | R4 Court 2 (WL2) + R5 Court 2 (F2) |
| 9–12 | R5 Court 3 (F3) + settled WL courts |
| 13–16 | R5 Court 4 (F4) + settled WL courts |
| 17–32 | R5 T9–T12 + settled LW/LL courts from R4 |
| 33–64 | Settled on R4 bottom courts in loser subtree |

---

## Player path summary

Compact view: **court label #finish** per round. `—` = no round 5 (settled after R4).

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
| P09 | C9 #1 | W1 #2 | WT2 #3 | WL2 #1 | — settled |
| P10 | C10 #1 | W2 #2 | WT1 #3 | WL2 #2 | — settled |
| P11 | C11 #1 | W3 #2 | WT2 #4 | WL2 #3 | — settled |
| P12 | C12 #1 | W4 #2 | WT1 #4 | WL2 #4 | — settled |
| P13 | C13 #1 | W5 #2 | WB6 #3 | WL6 #1 | — settled |
| P14 | C14 #1 | W6 #2 | WB5 #3 | WL6 #2 | — settled |
| P15 | C15 #1 | W7 #2 | WB6 #4 | WL6 #3 | — settled |
| P16 | C16 #1 | W8 #2 | WB5 #4 | WL6 #4 | — settled |
| P17 | C16 #2 | W1 #3 | WT3 #1 | WW3 #1 | F2 #1 |
| P18 | C15 #2 | W2 #3 | WT4 #1 | WW3 #2 | F2 #2 |
| P19 | C14 #2 | W3 #3 | WT3 #2 | WW3 #3 | F2 #3 |
| P20 | C13 #2 | W4 #3 | WT4 #2 | WW3 #4 | F2 #4 |
| P21 | C12 #2 | W5 #3 | WB7 #1 | WW7 #1 | F4 #1 |
| P22 | C11 #2 | W6 #3 | WB8 #1 | WW7 #2 | F4 #2 |
| P23 | C10 #2 | W7 #3 | WB7 #2 | WW7 #3 | F4 #3 |
| P24 | C9 #2 | W8 #3 | WB8 #2 | WW7 #4 | F4 #4 |
| P25 | C8 #2 | W1 #4 | WT4 #3 | WL4 #1 | — settled |
| P26 | C7 #2 | W2 #4 | WT3 #3 | WL4 #2 | — settled |
| P27 | C6 #2 | W3 #4 | WT4 #4 | WL4 #3 | — settled |
| P28 | C5 #2 | W4 #4 | WT3 #4 | WL4 #4 | — settled |
| P29 | C4 #2 | W5 #4 | WB8 #3 | WL8 #1 | — settled |
| P30 | C3 #2 | W6 #4 | WB7 #3 | WL8 #2 | — settled |
| P31 | C2 #2 | W7 #4 | WB8 #4 | WL8 #3 | — settled |
| P32 | C1 #2 | W8 #4 | WB7 #4 | WL8 #4 | — settled |
| P33 | C1 #3 | L9 #1 | LT9 #1 | LW9 #1 | T9 #1 |
| P34 | C2 #3 | L10 #1 | LT10 #1 | LW9 #2 | T9 #2 |
| P35 | C3 #3 | L11 #1 | LT9 #2 | LW9 #3 | T9 #3 |
| P36 | C4 #3 | L12 #1 | LT10 #2 | LW9 #4 | T9 #4 |
| P37 | C5 #3 | L13 #1 | LB13 #1 | LW13 #1 | T11 #1 |
| P38 | C6 #3 | L14 #1 | LB14 #1 | LW13 #2 | T11 #2 |
| P39 | C7 #3 | L15 #1 | LB13 #2 | LW13 #3 | T11 #3 |
| P40 | C8 #3 | L16 #1 | LB14 #2 | LW13 #4 | T11 #4 |
| P41 | C9 #3 | L9 #2 | LT10 #3 | LL10 #1 | — settled |
| P42 | C10 #3 | L10 #2 | LT9 #3 | LL10 #2 | — settled |
| P43 | C11 #3 | L11 #2 | LT10 #4 | LL10 #3 | — settled |
| P44 | C12 #3 | L12 #2 | LT9 #4 | LL10 #4 | — settled |
| P45 | C13 #3 | L13 #2 | LB14 #3 | LL14 #1 | — settled |
| P46 | C14 #3 | L14 #2 | LB13 #3 | LL14 #2 | — settled |
| P47 | C15 #3 | L15 #2 | LB14 #4 | LL14 #3 | — settled |
| P48 | C16 #3 | L16 #2 | LB13 #4 | LL14 #4 | — settled |
| P49 | C16 #4 | L9 #3 | LT11 #1 | LW11 #1 | T10 #1 |
| P50 | C15 #4 | L10 #3 | LT12 #1 | LW11 #2 | T10 #2 |
| P51 | C14 #4 | L11 #3 | LT11 #2 | LW11 #3 | T10 #3 |
| P52 | C13 #4 | L12 #3 | LT12 #2 | LW11 #4 | T10 #4 |
| P53 | C12 #4 | L13 #3 | LB15 #1 | LW15 #1 | T12 #1 |
| P54 | C11 #4 | L14 #3 | LB16 #1 | LW15 #2 | T12 #2 |
| P55 | C10 #4 | L15 #3 | LB15 #2 | LW15 #3 | T12 #3 |
| P56 | C9 #4 | L16 #3 | LB16 #2 | LW15 #4 | T12 #4 |
| P57 | C8 #4 | L9 #4 | LT12 #3 | LL12 #1 | — settled |
| P58 | C7 #4 | L10 #4 | LT11 #3 | LL12 #2 | — settled |
| P59 | C6 #4 | L11 #4 | LT12 #4 | LL12 #3 | — settled |
| P60 | C5 #4 | L12 #4 | LT11 #4 | LL12 #4 | — settled |
| P61 | C4 #4 | L13 #4 | LB16 #3 | LL16 #1 | — settled |
| P62 | C3 #4 | L14 #4 | LB15 #3 | LL16 #2 | — settled |
| P63 | C2 #4 | L15 #4 | LB16 #4 | LL16 #3 | — settled |
| P64 | C1 #4 | L16 #4 | LB15 #4 | LL16 #4 | — settled |

---

## Spot checks

| Player | Path | Note |
| ------ | ---- | ---- |
| P01 | C1 #1 → W1 #1 → WT1 #1 → WW1 #1 → F1 #1 | Always 1st on gold path |
| P09 | C9 #1 → W1 #2 → WT2 #3 → WL2 #1 → — settled | 3rd in R2→R3 pair → out of gold; settled after R4 |
| P33 | C1 #3 → L9 #1 → LT9 #1 → LW9 #1 → T9 #1 | Tops loser bracket, plays T9 in R5 |

Regenerate this file: `bun scripts/generate-64p-spec.ts`
