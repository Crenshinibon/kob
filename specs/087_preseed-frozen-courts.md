# Preseed: Frozen Courts for Round-Robin Brackets

## Problem

In preseed format with non-power-of-2 court counts (e.g. 5 courts / 20 players, 3 courts / 12 players), `splitSize()` carves off 1 loser court after round 1. That loser court has exactly 4 players who all play each other — a complete round robin. After one round, their rankings relative to each other are final.

Example (5 courts / 20 players):
```
R1: [C1] [C2] [C3] [C4] [C5]
       ↓                     ↓
R2: [W1] [W2] [W3] [W4] | [L5]   ← L5 is a round robin
       ↓                  ↓
R3: [WW] [LW] | [L5]          ← L5 same 4 players again
       ↓        ↓
R4: [F] [L(W)] | [L5]          ← L5 same 4 players again
```

Court 5 (L5) has the same 4 players every round. They've already established their relative ranking after round 2. Playing more rounds doesn't change their standings — it's statistically meaningless repetition.

## Current Behavior

- Every court plays every round, no exceptions
- `closeRound` requires all courts to have all matches scored
- Standings show round-by-round data for all courts equally
- The loser court in preseed plays 3-4 rounds of identical opponents

## Proposed Behavior

### Concept: Frozen Courts

After a preseed bracket reaches a state where all players on a court have played against each other, that court is **frozen**. A frozen court:

1. **Does not generate matches** for subsequent rounds
2. **Shows final standings** on the standings page (marked as final/settled)
3. **Can optionally** still play for fun — but entering scores is not required to close the round
4. **Is excluded** from the "waiting for scores" check that gates the "Close Round" button

### When Does a Court Freeze?

A court freezes when **all its players have been together for a full round AND no redistribution will move them**. This happens when:

- The court is a **single-court bracket** in the preseed bracket tree (i.e. `splitSize(N) = 0` or `N = 1` for that bracket)
- The court has already completed one round in this configuration

Specifically for preseed:
- After R1→R2 split: the loser bracket has `N - splitSize(N)` courts. If that's exactly 1 court, it freezes after R2.
- More generally: any bracket that resolves to a single court (can't be split further) freezes after its first round.

For standard preseed intervals:
| Players | Courts | After Split | Loser Bracket | Freezes After |
|---------|--------|-------------|---------------|---------------|
| 12      | 3      | 2W + 1L     | 1 court (4p)  | Round 2       |
| 16      | 4      | 2W + 2L     | 2 courts each | No freeze     |
| 20      | 5      | 4W + 1L     | 1 court (4p)  | Round 2       |
| 24      | 6      | 4W + 2L     | 2 courts → split further | No freeze (R2→R3: 1W+1L each → freeze both after R3) |
| 28      | 7      | 4W + 3L     | 3 courts → splitSize(3)=2W+1L → 1L freezes after R3 |
| 32      | 8      | 4W + 4L     | 4 courts each | No freeze     |
| 36      | 9      | 8W + 1L     | 1 court (4p)  | Round 2       |

### Freezing Through Recursive Splits

For 24 players (6 courts):
```
R1: [C1] [C2] [C3] [C4] [C5] [C6]
R2: [W1] [W2] [W3] [W4] | [L1] [L2]    ← 4W+2L
R3: [WW1][WW2]|[LW1][LW2] | [L1][L2]   ← each 2-court bracket → 1W+1L
R4: [F] [L(WW)]|[TL][BL]  | [F_L][L_L]  ← all 2-court brackets are now single courts → freeze after R4
```

Wait, that's wrong. Let me reconsider.

Actually, the freeze happens when a bracket produces exactly 1 court. At that point, those players stay together forever — the court is a leaf in the bracket tree. After one round on that court, their relative ranking is settled.

For 24 players (6 courts, 4 rounds):
```
R1: [C1] [C2] [C3] [C4] [C5] [C6]        6 courts
R2: [W1] [W2] [W3] [W4] | [L1] [L2]      4W + 2L (splitSize(6)=4)
R3: Winner bracket splits into 2WW + 2LW
     Loser bracket splits into 1LL + 1LL    ← each L bracket is now 1 court → LEAF
R4: Winner continues, loser courts freeze again (or already frozen)
```

Actually the loser bracket with 2 courts (splitSize(2)=1) produces 1 final + 1 loser-of-losers per bracket. Both are single courts. So after R3, the two loser-of-losers courts are leaves and would freeze.

But actually this gets complicated. Let me simplify:

### Simplification: Freeze Only Single-Court Loser Brackets After Round 2

The most common and impactful case is **5 courts** (20p) and **3 courts** (12p), where the loser bracket after the first split is exactly 1 court.

**Rule**: After the first preseed split (R1→R2), any court in a 1-court loser bracket is **frozen after round 2**. This means:
- R2 scores still need to be entered for that court (to establish final ranking)
- From R3 onward, that court does not play
- The "Close Round" button does not require scores from frozen courts
- Their R2 standings become their **final** standings

For multi-court loser brackets (6, 8 courts), the bracket continues to split each round. Those courts don't freeze until the bracket tree reaches a leaf (1 court). Those deeper freezes are a future enhancement — document the full plan but only implement the R2 single-court freeze for now.

## Implementation Plan

### Phase 1: Compute Frozen Courts (Logic)

Add to `TournamentState` (or compute on-the-fly):

```ts
type FrozenCourt = {
  courtNumber: number;
  finalStandings: CourtStanding[];  // Rankings from their last played round
  finalRound: number;               // The round they froze after
};
```

New function: `getFrozenCourts(formatType, courtSizes, roundsCompleted)`:

```ts
export function getFrozenCourts(
  formatType: FormatType,
  courtSizes: readonly number[],
  currentRound: number,
  completedRounds: readonly CourtResult[][]
): FrozenCourt[] {
  if (formatType !== 'preseed') return [];
  // Only freeze after round 2 (first split is R1→R2, so after R2 scores are in)
  if (currentRound < 2) return [];

  const N = courtSizes.length;
  const loserCount = N - splitSize(N);
  if (loserCount !== 1) return [];  // Phase 1: only handle single-court loser brackets

  // The loser court is court number (splitSize(N) + 1)
  const loserCourtNumber = splitSize(N) + 1;

  // Find the last round this court played (round 2)
  const r2Results = completedRounds[1]; // index 1 = round 2
  if (!r2Results) return [];

  const loserResult = r2Results.find(r => r.courtNumber === loserCourtNumber);
  if (!loserResult) return [];

  return [{
    courtNumber: loserCourtNumber,
    finalStandings: loserResult.standings,
    finalRound: 2
  }];
}
```

### Phase 2: Exclude Frozen Courts from Match Generation

In `startRound` / `closeRound` / the action handler:

1. After computing `nextAssignments`, filter out frozen courts
2. Frozen courts don't get `currentMatches` generated
3. Frozen courts don't get `courtRotation` records in the DB
4. Their `isActive` stays `false` (they were deactivated on round close)

**Modified state flow for round 3+ with frozen courts:**

```
R2 close → compute R3 assignments → detect loser court is frozen → remove from assignments → start R3 without frozen court
```

### Phase 3: Adjust Close Round Requirement

Currently: "Close Round" requires ALL courts to have ALL matches scored.

Change: "Close Round" requires all **active** (non-frozen) courts to have all matches scored.

In `tournament-actions.remote.ts`, the `canCloseRound` check should exclude courts whose court number matches a frozen court.

### Phase 4: Standings Page Display

Frozen courts show in the standings with:
- A **"Final"** badge / indicator instead of a round number
- Their rankings are locked — same data shown for all remaining rounds
- The round-history column shows their final round's result with a special marker (e.g. checkmark or "F" badge)
- Below the active standings table, a "Settled Courts" section shows frozen courts with their final rankings

### Phase 5: Optional Play (Future)

Frozen courts CAN still play score-entry rounds as a "fun round" — but this should be:
- Clearly marked as optional / exhibition
- Not gated by the "Close Round" requirement
- Not factored into official standings
- Requires explicit admin action ("Reopen as fun round")

This is deferred. Phase 1-4 are the go-live requirement.

## Data Model Changes

### Tournament Table

No schema change needed. Frozen court detection is computed from `courtSizes`, `formatType`, and `roundsCompleted`.

### Court Rotation / Match Tables

No schema change. Frozen courts simply don't get rotation or match records for frozen rounds. Their last active round's data stays in the DB as the official result.

## Edge Cases

1. **Player retirement on a frozen court**: If a player retires from a frozen court, the court was already settled. The retirement only affects the retirement itself (removed from future considerations). No re-freeze needed.

2. **All courts frozen simultaneously**: Not possible with the single-court loser freeze rule. The winner bracket always has ≥2 courts that continue playing.

3. **Tournament completion**: Tournament is still "complete" after the last active round (all non-frozen courts finish). Final standings incorporate frozen court rankings from their last round.

4. **12 players (3 courts)**: Loser court is court 3. It freezes after R2. R3 has only 2 active courts (the winner bracket). Tournament completes after R3 with only 2 courts playing.

5. **20 players (5 courts)**: Loser court is court 5. It freezes after R2. R3 and R4 have 4 active courts. Tournament completes after R4 with 4 courts playing.

6. **16 players (4 courts)**: `splitSize(4)=2`, loser bracket has 2 courts. No freeze. All courts play all rounds.

7. **32 players (8 courts)**: `splitSize(8)=4`, loser bracket has 4 courts. No freeze at R2. After R2, loser bracket splits into 2+2, then after R3 each sub-bracket is 1+1. **Future enhancement**: freeze those 1-court loser sub-brackets after R3.

## Files to Change

1. **`src/lib/tournament-logic.ts`**: Add `getFrozenCourts()` function
2. **`src/routes/tournament/[id]/tournament-actions.remote.ts`**: Filter frozen courts from assignments, adjust close-round gating
3. **`src/routes/tournament/[id]/tournament-data.remote.ts`**: Add frozen court info to page data
4. **`src/routes/tournament/[id]/+page.svelte`**: Show frozen court status, exclude from "waiting for scores"
5. **`src/routes/tournament/[id]/standings/+page.svelte`**: Display frozen courts as "Final"/"Settled"
6. **`src/routes/tournament/[id]/standings/standings-data.remote.ts`**: Include frozen court data in standings computation
7. **`src/lib/server/tournament-logic.test.ts`**: Unit tests for `getFrozenCourts()`