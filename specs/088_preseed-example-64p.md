# Preseed Example: 64 Players (16 Courts, 5 Rounds)

## Overview

64 players on 16 courts. `calculateRoundCount(16, 'preseed') = 5` rounds.

**Players:** P01 (highest seed) through P64 (lowest seed).

**Assumption:** On every court, players finish in the **order they are listed** at the start of the round (1st = top line, 4th = bottom line).

### Gold-race rule

- **1st or 2nd** → stay in the upper court when the bracket pair splits.
- **3rd or 4th** → drop to the lower court permanently within that subtree.
- **Every split:** global finish tiers → `splitSize(N)` winner/loser courts → 1sts+2nds fill top court numbers, 3rds+4ths fill bottom court numbers.

### Bracket tree

```
R1:  [C1]…[C16]
       ↓ first split (8W + 8L)
R2:  [W1]…[W8] | [L9]…[L16]
       ↓ split within each half (8→4+4)
R3:  [WT×4][WB×4] | [LT×4][LB×4]
       ↓ split within each quarter (4→2+2)
R4:  [WW/WL × 8] | [LW/LL × 8]
       ↓ split within each pair (2→1+1)
R5:  [F1]…[F8] | [T9]…[T16]   (64 players)
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

**Round 2 → Round 3** (split ×2): each half of 8 courts uses the same algorithm.

- Global finish tiers across courts 1–8 (or 9–16), `splitSize(8)=4` → top 4 courts get 1sts+2nds, bottom 4 get 3rds+4ths

## Round 3

### At the start of round 3

**Court 1 (WT1):** P01, P05, P10, P14

**Court 2 (WT2):** P02, P06, P09, P13

**Court 3 (WT3):** P03, P07, P12, P16

**Court 4 (WT4):** P04, P08, P11, P15

**Court 5 (WB5):** P17, P21, P26, P30

**Court 6 (WB6):** P18, P22, P25, P29

**Court 7 (WB7):** P19, P23, P28, P32

**Court 8 (WB8):** P20, P24, P27, P31

**Court 9 (LT9):** P33, P37, P42, P46

**Court 10 (LT10):** P34, P38, P41, P45

**Court 11 (LT11):** P35, P39, P44, P48

**Court 12 (LT12):** P36, P40, P43, P47

**Court 13 (LB13):** P49, P53, P58, P62

**Court 14 (LB14):** P50, P54, P57, P61

**Court 15 (LB15):** P51, P55, P60, P64

**Court 16 (LB16):** P52, P56, P59, P63

### End of round 3

Players finish in **listed order** (top player = 1st).

**Court 1 (WT1):**

1. P01
2. P05
3. P10
4. P14

**Court 2 (WT2):**

1. P02
2. P06
3. P09
4. P13

**Court 3 (WT3):**

1. P03
2. P07
3. P12
4. P16

**Court 4 (WT4):**

1. P04
2. P08
3. P11
4. P15

**Court 5 (WB5):**

1. P17
2. P21
3. P26
4. P30

**Court 6 (WB6):**

1. P18
2. P22
3. P25
4. P29

**Court 7 (WB7):**

1. P19
2. P23
3. P28
4. P32

**Court 8 (WB8):**

1. P20
2. P24
3. P27
4. P31

**Court 9 (LT9):**

1. P33
2. P37
3. P42
4. P46

**Court 10 (LT10):**

1. P34
2. P38
3. P41
4. P45

**Court 11 (LT11):**

1. P35
2. P39
3. P44
4. P48

**Court 12 (LT12):**

1. P36
2. P40
3. P43
4. P47

**Court 13 (LB13):**

1. P49
2. P53
3. P58
4. P62

**Court 14 (LB14):**

1. P50
2. P54
3. P57
4. P61

**Court 15 (LB15):**

1. P51
2. P55
3. P60
4. P64

**Court 16 (LB16):**

1. P52
2. P56
3. P59
4. P63

---

**Round 3 → Round 4** (split ×4): each quarter of 4 courts uses the same algorithm.

- Global finish tiers within the quarter, `splitSize(4)=2` → top 2 courts get 1sts+2nds, bottom 2 get 3rds+4ths

## Round 4

### At the start of round 4

**Court 1 (WW1):** P01, P03, P06, P08

**Court 2 (WL2):** P02, P04, P05, P07

**Court 3 (WW3):** P09, P11, P14, P16

**Court 4 (WL4):** P10, P12, P13, P15

**Court 5 (WW5):** P17, P19, P22, P24

**Court 6 (WL6):** P18, P20, P21, P23

**Court 7 (WW7):** P25, P27, P30, P32

**Court 8 (WL8):** P26, P28, P29, P31

**Court 9 (LW9):** P33, P35, P38, P40

**Court 10 (LL10):** P34, P36, P37, P39

**Court 11 (LW11):** P41, P43, P46, P48

**Court 12 (LL12):** P42, P44, P45, P47

**Court 13 (LW13):** P49, P51, P54, P56

**Court 14 (LL14):** P50, P52, P53, P55

**Court 15 (LW15):** P57, P59, P62, P64

**Court 16 (LL16):** P58, P60, P61, P63

### End of round 4

Players finish in **listed order** (top player = 1st).

**Court 1 (WW1):**

1. P01
2. P03
3. P06
4. P08

**Court 2 (WL2):**

1. P02
2. P04
3. P05
4. P07

**Court 3 (WW3):**

1. P09
2. P11
3. P14
4. P16

**Court 4 (WL4):**

1. P10
2. P12
3. P13
4. P15

**Court 5 (WW5):**

1. P17
2. P19
3. P22
4. P24

**Court 6 (WL6):**

1. P18
2. P20
3. P21
4. P23

**Court 7 (WW7):**

1. P25
2. P27
3. P30
4. P32

**Court 8 (WL8):**

1. P26
2. P28
3. P29
4. P31

**Court 9 (LW9):**

1. P33
2. P35
3. P38
4. P40

**Court 10 (LL10):**

1. P34
2. P36
3. P37
4. P39

**Court 11 (LW11):**

1. P41
2. P43
3. P46
4. P48

**Court 12 (LL12):**

1. P42
2. P44
3. P45
4. P47

**Court 13 (LW13):**

1. P49
2. P51
3. P54
4. P56

**Court 14 (LL14):**

1. P50
2. P52
3. P53
4. P55

**Court 15 (LW15):**

1. P57
2. P59
3. P62
4. P64

**Court 16 (LL16):**

1. P58
2. P60
3. P61
4. P63

---

**Round 4 → Round 5** (split ×8): each pair of 2 courts uses the same algorithm.

- Global finish tiers within the pair, `splitSize(2)=1` → top court gets 1sts+2nds, bottom court gets 3rds+4ths
- All **16 courts** (64 players) play round 5

## Round 5

All **16 courts** (64 players) play round 5.

### At the start of round 5

**Court 1 (F1):** P01, P02, P03, P04

**Court 2 (F2):** P05, P06, P07, P08

**Court 3 (F3):** P09, P10, P11, P12

**Court 4 (F4):** P13, P14, P15, P16

**Court 5 (F5):** P17, P18, P19, P20

**Court 6 (F6):** P21, P22, P23, P24

**Court 7 (F7):** P25, P26, P27, P28

**Court 8 (F8):** P29, P30, P31, P32

**Court 9 (T9):** P33, P34, P35, P36

**Court 10 (T10):** P37, P38, P39, P40

**Court 11 (T11):** P41, P42, P43, P44

**Court 12 (T12):** P45, P46, P47, P48

**Court 13 (T13):** P49, P50, P51, P52

**Court 14 (T14):** P53, P54, P55, P56

**Court 15 (T15):** P57, P58, P59, P60

**Court 16 (T16):** P61, P62, P63, P64

### End of round 5

Players finish in **listed order** (top player = 1st).

**Court 1 (F1):**

1. P01
2. P02
3. P03
4. P04

**Court 2 (F2):**

1. P05
2. P06
3. P07
4. P08

**Court 3 (F3):**

1. P09
2. P10
3. P11
4. P12

**Court 4 (F4):**

1. P13
2. P14
3. P15
4. P16

**Court 5 (F5):**

1. P17
2. P18
3. P19
4. P20

**Court 6 (F6):**

1. P21
2. P22
3. P23
4. P24

**Court 7 (F7):**

1. P25
2. P26
3. P27
4. P28

**Court 8 (F8):**

1. P29
2. P30
3. P31
4. P32

**Court 9 (T9):**

1. P33
2. P34
3. P35
4. P36

**Court 10 (T10):**

1. P37
2. P38
3. P39
4. P40

**Court 11 (T11):**

1. P41
2. P42
3. P43
4. P44

**Court 12 (T12):**

1. P45
2. P46
3. P47
4. P48

**Court 13 (T13):**

1. P49
2. P50
3. P51
4. P52

**Court 14 (T14):**

1. P53
2. P54
3. P55
4. P56

**Court 15 (T15):**

1. P57
2. P58
3. P59
4. P60

**Court 16 (T16):**

1. P61
2. P62
3. P63
4. P64

---

## Final standings (overview)

| Place range | Determined by                             |
| ----------- | ----------------------------------------- |
| 1–4         | R5 Court 1 (F1) finish order              |
| 5–8         | R5 Courts 2–4 (F2–F4) + R4 WL courts      |
| 9–16        | R5 Courts 5–8 (F5–F8) + settled WL courts |
| 17–32       | R5 T9–T16 + R4 LW/LL courts               |
| 33–64       | Loser subtree from R2 onward              |

---

## Player path summary

Compact view: **court label #finish** per round.

| Player | R1     | R2     | R3      | R4      | R5     |
| ------ | ------ | ------ | ------- | ------- | ------ |
| P01    | C1 #1  | W1 #1  | WT1 #1  | WW1 #1  | F1 #1  |
| P02    | C2 #1  | W2 #1  | WT2 #1  | WL2 #1  | F1 #2  |
| P03    | C3 #1  | W3 #1  | WT3 #1  | WW1 #2  | F1 #3  |
| P04    | C4 #1  | W4 #1  | WT4 #1  | WL2 #2  | F1 #4  |
| P05    | C5 #1  | W5 #1  | WT1 #2  | WL2 #3  | F2 #1  |
| P06    | C6 #1  | W6 #1  | WT2 #2  | WW1 #3  | F2 #2  |
| P07    | C7 #1  | W7 #1  | WT3 #2  | WL2 #4  | F2 #3  |
| P08    | C8 #1  | W8 #1  | WT4 #2  | WW1 #4  | F2 #4  |
| P09    | C9 #1  | W1 #2  | WT2 #3  | WW3 #1  | F3 #1  |
| P10    | C10 #1 | W2 #2  | WT1 #3  | WL4 #1  | F3 #2  |
| P11    | C11 #1 | W3 #2  | WT4 #3  | WW3 #2  | F3 #3  |
| P12    | C12 #1 | W4 #2  | WT3 #3  | WL4 #2  | F3 #4  |
| P13    | C13 #1 | W5 #2  | WT2 #4  | WL4 #3  | F4 #1  |
| P14    | C14 #1 | W6 #2  | WT1 #4  | WW3 #3  | F4 #2  |
| P15    | C15 #1 | W7 #2  | WT4 #4  | WL4 #4  | F4 #3  |
| P16    | C16 #1 | W8 #2  | WT3 #4  | WW3 #4  | F4 #4  |
| P17    | C16 #2 | W1 #3  | WB5 #1  | WW5 #1  | F5 #1  |
| P18    | C15 #2 | W2 #3  | WB6 #1  | WL6 #1  | F5 #2  |
| P19    | C14 #2 | W3 #3  | WB7 #1  | WW5 #2  | F5 #3  |
| P20    | C13 #2 | W4 #3  | WB8 #1  | WL6 #2  | F5 #4  |
| P21    | C12 #2 | W5 #3  | WB5 #2  | WL6 #3  | F6 #1  |
| P22    | C11 #2 | W6 #3  | WB6 #2  | WW5 #3  | F6 #2  |
| P23    | C10 #2 | W7 #3  | WB7 #2  | WL6 #4  | F6 #3  |
| P24    | C9 #2  | W8 #3  | WB8 #2  | WW5 #4  | F6 #4  |
| P25    | C8 #2  | W1 #4  | WB6 #3  | WW7 #1  | F7 #1  |
| P26    | C7 #2  | W2 #4  | WB5 #3  | WL8 #1  | F7 #2  |
| P27    | C6 #2  | W3 #4  | WB8 #3  | WW7 #2  | F7 #3  |
| P28    | C5 #2  | W4 #4  | WB7 #3  | WL8 #2  | F7 #4  |
| P29    | C4 #2  | W5 #4  | WB6 #4  | WL8 #3  | F8 #1  |
| P30    | C3 #2  | W6 #4  | WB5 #4  | WW7 #3  | F8 #2  |
| P31    | C2 #2  | W7 #4  | WB8 #4  | WL8 #4  | F8 #3  |
| P32    | C1 #2  | W8 #4  | WB7 #4  | WW7 #4  | F8 #4  |
| P33    | C1 #3  | L9 #1  | LT9 #1  | LW9 #1  | T9 #1  |
| P34    | C2 #3  | L10 #1 | LT10 #1 | LL10 #1 | T9 #2  |
| P35    | C3 #3  | L11 #1 | LT11 #1 | LW9 #2  | T9 #3  |
| P36    | C4 #3  | L12 #1 | LT12 #1 | LL10 #2 | T9 #4  |
| P37    | C5 #3  | L13 #1 | LT9 #2  | LL10 #3 | T10 #1 |
| P38    | C6 #3  | L14 #1 | LT10 #2 | LW9 #3  | T10 #2 |
| P39    | C7 #3  | L15 #1 | LT11 #2 | LL10 #4 | T10 #3 |
| P40    | C8 #3  | L16 #1 | LT12 #2 | LW9 #4  | T10 #4 |
| P41    | C9 #3  | L9 #2  | LT10 #3 | LW11 #1 | T11 #1 |
| P42    | C10 #3 | L10 #2 | LT9 #3  | LL12 #1 | T11 #2 |
| P43    | C11 #3 | L11 #2 | LT12 #3 | LW11 #2 | T11 #3 |
| P44    | C12 #3 | L12 #2 | LT11 #3 | LL12 #2 | T11 #4 |
| P45    | C13 #3 | L13 #2 | LT10 #4 | LL12 #3 | T12 #1 |
| P46    | C14 #3 | L14 #2 | LT9 #4  | LW11 #3 | T12 #2 |
| P47    | C15 #3 | L15 #2 | LT12 #4 | LL12 #4 | T12 #3 |
| P48    | C16 #3 | L16 #2 | LT11 #4 | LW11 #4 | T12 #4 |
| P49    | C16 #4 | L9 #3  | LB13 #1 | LW13 #1 | T13 #1 |
| P50    | C15 #4 | L10 #3 | LB14 #1 | LL14 #1 | T13 #2 |
| P51    | C14 #4 | L11 #3 | LB15 #1 | LW13 #2 | T13 #3 |
| P52    | C13 #4 | L12 #3 | LB16 #1 | LL14 #2 | T13 #4 |
| P53    | C12 #4 | L13 #3 | LB13 #2 | LL14 #3 | T14 #1 |
| P54    | C11 #4 | L14 #3 | LB14 #2 | LW13 #3 | T14 #2 |
| P55    | C10 #4 | L15 #3 | LB15 #2 | LL14 #4 | T14 #3 |
| P56    | C9 #4  | L16 #3 | LB16 #2 | LW13 #4 | T14 #4 |
| P57    | C8 #4  | L9 #4  | LB14 #3 | LW15 #1 | T15 #1 |
| P58    | C7 #4  | L10 #4 | LB13 #3 | LL16 #1 | T15 #2 |
| P59    | C6 #4  | L11 #4 | LB16 #3 | LW15 #2 | T15 #3 |
| P60    | C5 #4  | L12 #4 | LB15 #3 | LL16 #2 | T15 #4 |
| P61    | C4 #4  | L13 #4 | LB14 #4 | LL16 #3 | T16 #1 |
| P62    | C3 #4  | L14 #4 | LB13 #4 | LW15 #3 | T16 #2 |
| P63    | C2 #4  | L15 #4 | LB16 #4 | LL16 #4 | T16 #3 |
| P64    | C1 #4  | L16 #4 | LB15 #4 | LW15 #4 | T16 #4 |

---

## Spot checks

| Player | Path                                    | Note                                          |
| ------ | --------------------------------------- | --------------------------------------------- |
| P01    | C1 #1 → W1 #1 → WT1 #1 → WW1 #1 → F1 #1 | Always 1st on gold path                       |
| P09    | C9 #1 → W1 #2 → WT2 #3 → WW3 #1 → F3 #1 | 3rd in R2→R3 pair → out of gold bracket by R4 |
| P33    | C1 #3 → L9 #1 → LT9 #1 → LW9 #1 → T9 #1 | Tops loser bracket, plays T9 in R5            |

Regenerate this file: `bun scripts/generate-64p-spec.ts`
