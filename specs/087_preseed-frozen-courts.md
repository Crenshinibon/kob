# Preseed: Frozen Courts (Bracket Leaves)

## Problem

In preseed format, brackets split recursively each round. When a bracket reaches a single court (1 court = 4 players), those players have played a complete round-robin against each other. Their relative ranking is settled — further rounds of the same 4 players are statistically meaningless.

**Example (7 courts / 28 players):**

```
R1: [C1] [C2] [C3] [C4] [C5] [C6] [C7]       all play
                ↓ splitSize(7)=4
R2: [W1] [W2] [W3] [W4] | [L1] [L2] [L3]       4W+3L, all play
                ↓ splitSize(4)=2, splitSize(3)=2
R3: [WW1][WW2]|[LW1][LW2]| [LL]               C7 is a leaf → plays R3, then FREEZES
                ↓
R4: [F1] [F2] |[TL1] [TL2]                     only 6 active courts
```

Court 7 plays rounds 1, 2, and 3. After R3, their standings are final. They do not play R4.

## Freeze Detection Algorithm

A court **freezes** when its bracket reaches exactly 1 court. The freeze takes effect **after the round in which the court first plays as a single-court bracket**.

**Algorithm:** Simulate the preseed bracket tree round by round. After each round, split each bracket using `splitSize(N)`. Any sub-bracket of exactly 1 court is a **leaf** — it plays one more round, then freezes. Frozen courts are excluded from further splits.

```ts
export function getFrozenCourts(courtSizes: readonly number[], roundsCompleted: number): number[] {
	if (roundsCompleted < 2) return [];

	const totalCourts = courtSizes.length;
	const active = simulateBracketTree(totalCourts, roundsCompleted);
	// Return court numbers that were frozen before or at roundsCompleted
	return frozen;
}
```

### Freeze Points by Court Count

| Courts | Rds | Early Freezes        | Final Round Freezes |
| ------ | --- | -------------------- | ------------------- |
| 3      | 3   | R2: C3               | R3: C1, C2          |
| 4      | 3   | —                    | R3: C1–C4 (all)     |
| 5      | 4   | R2: C5               | R4: C1–C4           |
| 6      | 4   | R3: C5, C6           | R4: C1–C4           |
| 7      | 4   | R3: C7               | R4: C1–C6           |
| 8      | 4   | —                    | R4: C1–C8 (all)     |
| 9      | 5   | R2: C9               | R5: C1–C8           |
| 10     | 5   | R3: C9, C10          | R5: C1–C8           |
| 11     | 5   | R3: C11; R4: C9, C10 | R5: C1–C8           |
| 12     | 5   | R4: C9–C12           | R5: C1–C8           |
| 13     | 5   | R3: C13              | R5: C1–C12          |
| 14     | 5   | R4: C13, C14         | R5: C1–C12          |
| 15     | 5   | R4: C15              | R5: C1–C14          |
| 16     | 5   | —                    | R5: C1–C16 (all)    |

**Key observations:**

- Power-of-2 court counts (4, 8, 16) have no early freezes — the bracket tree is balanced.
- The "split off" bottom courts are the ones that freeze early.
- A single early freeze (3, 5, 9 courts) happens when the loser bracket is exactly 1 court after the first split.
- Multiple early freezes (6, 7, 10–15 courts) happen at different rounds as different sub-brackets reach their leaf nodes.

### Detailed Bracket Trees with Freeze Points

#### 12 Players (3 Courts, 3 Rounds)

```
R1: [C1] [C2] [C3]                all play
        ↓ splitSize(3)=2
R2: [W1] [W2] | [L3]  ← C3 is a single-court leaf, plays R2, then FREEZES
        ↓ splitSize(2)=1
R3: [F]   [L(W)]       ← only 2 active courts
```

- **C3 freezes after R2** (played R1 and R2, standings final)
- R3 has 2 active courts (C1, C2)

#### 20 Players (5 Courts, 4 Rounds)

```
R1: [C1] [C2] [C3] [C4] [C5]                all play
        ↓ splitSize(5)=4
R2: [W1] [W2] [W3] [W4] | [L5]  ← C5 is a leaf, plays R2, then FREEZES
        ↓ splitSize(4)=2
R3: [WW1] [WW2] | [LW1] [LW2]               4 active courts
        ↓ splitSize(2)=1
R4: [F]   [L(WW)] | [TL]  [BL]              4 active courts
```

- **C5 freezes after R2** (played R1 and R2, standings final)
- R3 and R4 have 4 active courts

#### 28 Players (7 Courts, 4 Rounds)

```
R1: [C1][C2][C3][C4][C5][C6][C7]                all play
        ↓ splitSize(7)=4
R2: [W1][W2][W3][W4] | [L1][L2][L3]             all play (4W+3L)
        ↓ splitSize(4)=2, splitSize(3)=2
R3: [WW1][WW2]|[LW1][LW2]| [LL]    ← C7 is a leaf, plays R3, then FREEZES
        ↓ splitSize(2)=1 (each)
R4: [F1][F2] |[TL1][TL2]                        6 active courts
```

- **C7 freezes after R3** (loser of loser bracket, single court since R3)
- Courts 5–6 play R1–R3 in a 2-court bracket, then split for R4 → each gets a single-court final round

#### 24 Players (6 Courts, 4 Rounds)

```
R1: [C1][C2][C3][C4][C5][C6]                    all play
        ↓ splitSize(6)=4
R2: [W1][W2][W3][W4] | [L1][L2]                 all play (4W+2L)
        ↓ splitSize(4)=2, splitSize(2)=1
R3: [WW1][WW2]|[LW1][LW2] | [F_L1][F_L2]  ← C5 & C6 are leaves, play R3, then FREEZE
        ↓ splitSize(2)=1
R4: [F] [L(WW)] | [TL] [BL]                   4 active courts
```

- **C5, C6 freeze after R3** (loser bracket was 2 courts, split into 1+1)
- R4 has 4 active courts

#### 44 Players (11 Courts, 5 Rounds) — Multi-Round Cascade

```
R1:  [C1]…[C11]                     all play
        ↓ splitSize(11)=8
R2:  [W1]…[W8] | [L9][L10][L11]     4W+4W + 3L (all play)
        ↓ splitSize(3)=2
R3:  8W split → 4WW+4LW             C11 is a leaf (single L), plays R3 → FREEZES after R3
     3L split → 2WL+1LL
        ↓ splitSize(4)=2, splitSize(2)=1
R4:  4WW → 2 each                   C9, C10 are leaves → FREEZES after R4
     4LW → 2 each
     2WL → 1F+1L
     1LL: already frozen
        ↓ splitSize(2)=1
R5:  Final placements                8 active courts
```

- **C11 freezes after R3** (single-court loser after R2 split)
- **C9, C10 freeze after R4** (2-court loser bracket splits into 1+1)
- R5 has 8 active courts

## Implementation

### Phase 1: Core Logic

**`getFrozenCourts(courtSizes, roundsCompleted)`** — pure function in `tournament-logic.ts`:

1. Simulate the bracket tree using `splitSize()` recursively
2. Track which courts become single-court leaves at each round
3. Return court numbers that frozen on or before `roundsCompleted`

```ts
export interface FrozenCourt {
	courtNumber: number;
	freezeAfterRound: number; // 1-indexed: this court plays rounds 1..freezeAfterRound, then stops
}

export function getFrozenCourts(
	courtSizes: readonly number[],
	roundsCompleted: number
): FrozenCourt[] {
	if (roundsCompleted < 2) return [];

	const totalCourts = courtSizes.length;
	const result: FrozenCourt[] = [];
	const frozen = new Set<number>();

	// Simulate bracket tree round by round
	// activeBrackets: arrays of court numbers still playing
	let activeBrackets: number[][] = [Array.from({ length: totalCourts }, (_, i) => i + 1)];

	for (let round = 1; round <= roundsCompleted; round++) {
		const nextBrackets: number[][] = [];

		for (const bracket of activeBrackets) {
			if (bracket.length <= 1) {
				// Already frozen — skip (stays in its frozen state)
				continue;
			}
			// Split this bracket
			const w = splitSize(bracket.length);
			const winnerCourts = bracket.slice(0, w);
			const loserCourts = bracket.slice(w);

			// Check for single-court leaves
			if (winnerCourts.length === 1 && !frozen.has(winnerCourts[0])) {
				result.push({ courtNumber: winnerCourts[0], freezeAfterRound: round + 1 });
				frozen.add(winnerCourts[0]);
			} else if (winnerCourts.length > 1) {
				nextBrackets.push(winnerCourts);
			}

			if (loserCourts.length === 1 && !frozen.has(loserCourts[0])) {
				result.push({ courtNumber: loserCourts[0], freezeAfterRound: round + 1 });
				frozen.add(loserCourts[0]);
			} else if (loserCourts.length > 1) {
				nextBrackets.push(loserCourts);
			}
		}

		activeBrackets = nextBrackets;
	}

	return result.filter((f) => f.freezeAfterRound <= roundsCompleted);
}
```

**Note:** `freezeAfterRound` means the court plays rounds 1 through `freezeAfterRound` inclusive, and from `freezeAfterRound + 1` onward it is frozen.

### Phase 2: Exclude Frozen Courts from Match Generation

In `closeRound` / `startRound` / action handlers:

1. After computing `nextAssignments`, call `getFrozenCourts(courtSizes, roundsCompleted + 1)`
2. Filter out any court whose `courtNumber` appears in the frozen list with `freezeAfterRound <= roundsCompleted + 1`
3. Frozen courts don't get `courtRotation` records or `match` records
4. Their `isActive` stays `false`

### Phase 3: Adjust Close Round Gating

`canCloseRound` should only require matches from **active** (non-frozen) courts. Courts that are frozen for this round are excluded from the check.

### Phase 4: Standings Display

Frozen courts show in the standings with a **"Final"** badge. Their rankings are locked — the round-history column shows their final round result with a checkmark or "F" marker. A "Settled Courts" section at the bottom lists frozen courts with their final rankings.

### Phase 5: Optional Play (Deferred)

Frozen courts can optionally play exhibition rounds, but:

- Not required for round completion
- Not factored into official standings
- Requires explicit admin action
- Marked as "Fun round" in UI

## Edge Cases

1. **Player retirement on a frozen court**: The court was already settled. Retirement only affects future redistribution logic (which doesn't apply to frozen courts). No re-freeze needed.

2. **All-power-of-2 (4, 8, 16 courts)**: No early freezes. Every court plays every round. The bracket tree is balanced.

3. **Tournament completion**: Complete after the last active round. Final standings include frozen court rankings from their last played round.

4. **Frozen court with non-standard size** (e.g., 5p or 3p bottom court): Works the same — a single-court bracket of any size freezes. The court still has 4 players (or 3/5/6 for non-standard), all of whom have played each other.

5. **Retirement reducing an active bracket to 1 court mid-tournament**: The bracket's remaining court becomes frozen at that point. Triggered by `recalculateCourtConfigAfterRetirement`.

## Files to Change

1. **`src/lib/tournament-logic.ts`**: Add `getFrozenCourts()` function and `FrozenCourt` type
2. **`src/lib/server/tournament-logic.test.ts`**: Unit tests for `getFrozenCourts()` covering all court counts 3–16
3. **`src/routes/tournament/[id]/tournament-actions.remote.ts`**: Filter frozen courts from assignments after closeRound, adjust close-round gating
4. **`src/routes/tournament/[id]/tournament-data.remote.ts`**: Add frozen court info to page data
5. **`src/routes/tournament/[id]/+page.svelte`**: Show frozen court status, exclude from "waiting for scores"
6. **`src/routes/tournament/[id]/standings/+page.svelte`**: Display frozen courts with "Final" badge
7. **`src/routes/tournament/[id]/standings/standings-data.remote.ts`**: Include frozen court data in standings computation
