# Mid-Round Injury and Forward Retirement

## Status

**PROPOSED** — extends [670_player-retirement.md](./670_player-retirement.md) and connects to [091_preseed-retirement-bracket-policy.md](./091_preseed-retirement-bracket-policy.md).

---

## Problem

Mid-round **injury reporting** and between-round **retirement** are separate flows today, but they converge on the same outcome for **future rounds**:

> One fewer active player → next round's group assignments must be recalculated.

The gap: injury handling specifies substitute/cancel for the **current round only**, while [670](./670_player-retirement.md) says "on closeRound, apply standard retirement redistribution" without specifying shrink/cascade/replacement policies for preseed or cascade for random seed.

**This spec defines the bridge:** what happens when `closeRound` runs after a mid-round injury.

---

## Two phases of injury

```
Phase 1 (mid-round, NOW)     Phase 2 (on closeRound, FORWARD)
─────────────────────────    ─────────────────────────────────
Substitute or Cancel         Retirement redistribution policy
Affects current court only   Affects NEXT round assignments
Scores / averages            Shrink | Cascade | Replacement
Cannot change court size     Player count may drop (unless replacement)
```

| Phase | Question answered |
| ----- | ----------------- |
| **1 — Current round** | How do we finish today's matches on this court? |
| **2 — Forward** | Who plays on which group next round? |

---

## Phase 1: Current round (unchanged core rules)

When the organizer reports an injury **after at least one score** is entered on the player's group:

### Option A: Substitute (physical stand-in)

- Unscored matches keep the **injured player's ID** in the slot; UI shows "SUBST"
- Substitute is **not** a roster player — no standings entry
- Injured player earns **0 points** for substituted matches
- Partners and opponents score normally
- Court size unchanged (still 4p/5p/6p)

### Option B: Cancel & Average

- Unscored matches involving the injured player → `isCanceled = true`
- Court standings use **average points per completed match** (already implemented for 5p/6p)
- Injured player ranks last on the court with 0 average contribution from canceled games

### What injury does NOT do (Phase 1)

- Does **not** remove the player from the current court rotation mid-round
- Does **not** change court size mid-round (matches already played make this unfair)
- Does **not** redistribute other groups in the current round

### Immediate side effects (on report)

- `injuredAt` and `retiredAt` set on the player
- `retiredRound` = current round, `retiredCourt` = current court
- `retirementReason` = injury (or provided reason)

The player is **logically retired for the future** but **still listed on the court** for Phase 1 scoring purposes.

---

## Phase 2: Forward retirement (on `closeRound`)

When the organizer closes the round after an injury:

### Step sequence

```
1. Calculate current-round standings per court
   - Cancel courts: averages (injured player typically 4th)
   - Substitute courts: normal totals (injured player 0 for missed games)

2. Save round results to history (injured player's results preserved)

3. activePlayerCount = players where retiredAt is null OR ... 
   → injured players ARE retired → excluded from count

4. Recalculate courtSizes[] for activePlayerCount

5. Compute next-round assignments:
   a. If replacement was registered → slot swap, no shrink/cascade
   b. Else if random seed → ladder/vertical cascade with excludedPlayerIds
   c. Else if preseed → apply preseedRetirementPolicy (shrink | cascade)

6. Apply frozen-court filter (preseed)

7. Persist next round rotations + matches
```

### Key rule

**Forward behaviour MUST match between-round retirement** for the same format, policy, and player count — the only difference is timing:

| | Between-round retirement | Injury forward |
| - | ------------------------ | -------------- |
| Scores on current round | None | Some/all entered |
| Current round assignments | Deleted and rebuilt | Kept in history |
| Next round computation | From previous round OR rebuild current | From `closeRound` pipeline |
| Policy applied | At retirement time | At `closeRound` |

---

## Optional replacement at injury time (proposed)

Extend injury dialog with a third path:

```
Report Injury: Player D (Court 2)

Current round (pick one):
( ) Substitute — play remaining matches with a stand-in
( ) Cancel & Average — cancel remaining matches

Forward (optional):
[ ] Add tournament replacement for next round
    Name: [________________]
    Seed points (preseed): [____]

[Confirm Injury]
```

| Choice | Current round | Next round onward |
| ------ | ------------- | ----------------- |
| Substitute only | SUBST play | Shrink/cascade per policy |
| Cancel only | Canceled matches | Shrink/cascade per policy |
| Cancel + replacement | Canceled matches | **Replacement on D's next-round slot** — no shrink/cascade |
| Substitute + replacement | SUBST play | Replacement on next-round slot |

**Rationale:** Organizer may know at injury time that a waitlist player is available for **next round**, while still needing substitute/cancel to finish **this round**.

---

## Worked example: Random seed 17p — Injury in Round 2

Setup: 17 players, `[4,4,4,5]`, Round 2 in progress. Player **D** injured on Court 2 after 1 match scored.

### Phase 1 — Cancel & Average on Court 2

- Completed: D played 1 match
- Canceled: remaining matches involving D
- Round 2 court standings: computed with averages; D finishes 4th on Court 2

### Phase 2 — Close Round 2 → Round 3 (Cascade policy)

- Active players: 16
- New sizes: `[4,4,4,4]` (bottom 5p absorbs into 4×4)
- Next assignments: **ladder cascade** from R2 results excluding D (same as [089](./089_random-example-17p-retirement.md) between-round retire)

**Without replacement:** identical outcome to retiring D between R2 and R3.

**With replacement R added at injury:** R3 Court assignments = as if D still counted for sizing (`[4,4,4,5]`) but D's slot taken by R on whichever court ladder assigns — **or** simpler rule: replacement inherits D's **would-have-been** R3 slot from pre-computed closeRound ladder minus D plus R inserted at D's ladder position.

> **Proposed rule for injury replacement forward:** Run assignment algorithm excluding injured player, then insert replacement into the **court and slot the injured player would have occupied** if they had not been injured. If cascade moved players, replacement takes injured player's **bracket/placement level**, not their R2 finish rank directly.

---

## Worked example: Preseed 16p — Injury in Round 2

Uses [082](./082_preseed-example-16p.md) R2 results. **J** injured on Court 2 (Winners bracket) during R2; cancel & average.

### Phase 1

J finishes 4th on Court 2 in R2 standings (average-based).

### Phase 2 — Close R2 → R3 with Cascade policy

Same as [091 Example 1](./091_preseed-retirement-bracket-policy.md) between-round retire J:

- Court 1 unchanged
- Court 2: D, E, F, G (cascade)
- Court 4 → 3p

**Critical:** `closeRound` must **not** call global `processPreseedTransition()` with filtered tiers (current bug). It must apply **cascade on the already-computed R3 template** or re-derive cascade from R2 standings.

### Phase 2 — Shrink policy

Same as 091 Shrink example — Court 2 → 3p.

---

## Worked example: Preseed 20p — Injury on frozen Court 5

Court 5 frozen after R2. Player **T** injured during R2 on Court 5.

- Phase 1: substitute/cancel on C5 only
- Phase 2: **no forward redistribution** for C5 (frozen)
- T receives final standing in L5 bracket range (place 20)
- Active courts 1–4 unaffected by T's absence in R3+

---

## Worked example: Non-standard bottom — RS 21p injury

21 players `[4,4,4,4,5]`. Injury on Court 3 during R3. Forward to R4:

- 20 active players → `[4,4,4,4,4]` all standard
- Cascade: verify no mid-bracket 3p (test **B4** in 091 matrix)

Injury on Court 5 (5p bottom) during R3:

- 20 active → all 4p courts
- Bottom 5p eliminated — same as losing one player from 5p bottom

---

## Current implementation gaps

| Area | Current behaviour | Required behaviour |
| ---- | ----------------- | ------------------ |
| `closeRound` after injury | Re-runs full redistribution; preseed ignores shrink/cascade | Apply format-specific forward policy |
| `reportInjury` | Marks retired; no replacement option | Optional `replacementName` / `replacementSeed` |
| `buildRedistributionFromResults` (preseed) | No `excludedPlayerIds` | Filter retiree; then apply shrink/cascade |
| Between-round vs injury forward | Different code paths | Unify through `resolveForwardRetirement()` |
| 670 spec | "Standard redistribution" vague | Point to 091 + this spec |
| 670 replacements | "Only before tournament starts" | **Superseded** for optional mid-tournament replacement per 091 |

---

## Unified forward resolver (proposed API)

```typescript
type ForwardRetirementOpts = {
  formatType: 'random-seed' | 'preseed';
  policy: 'shrink' | 'cascade'; // preseed only; RS always cascade
  trigger: 'between-round' | 'close-round';
  currentAssignments: CourtAssignment[];
  previousRoundResults: CourtResult[];
  retiredPlayerIds: ReadonlySet<number>;
  replacement?: { name: string; seedPoints?: number; slotCourtNumber: number };
  courtSizes: readonly number[];
  originalPlayerCount: number;
  roundsCompleted: number;
  frozenCourts: FrozenCourt[];
};

function resolveForwardRetirement(opts: ForwardRetirementOpts): {
  assignments: CourtAssignment[];
  courtSizes: number[];
  replacementPlayer?: { id: number }; // if created
};
```

**Call sites:**

1. `retirePlayer` (between-round, no scores) — after deleting current rotations
2. `closeRoundForm` (after injury or prior between-round retirements reflected in count)

---

## UI requirements

### Injury dialog additions

1. Separate **"This round"** and **"Next rounds"** sections
2. Forward policy preview (read-only, from tournament setting)
3. Optional replacement fields
4. Explicit copy:

> The injured player will not play in future rounds. When you close this round, groups for the next round will be recalculated using the **[Cascade / Shrink]** policy. Other groups are not changed during the current round.

### Close round confirmation (when injuries exist)

```
Closing Round 2

1 player injured this round: J (Court 2)
Forward policy: Cascade

Next round preview:
  Court 1: unchanged
  Court 2: G promoted from Court 3
  Court 4: 3-player group

[Close Round]
```

### Standings

- Injured players show in retired section with reason "injury"
- Replacement players show link: "Replaces J"

---

## Testing (extends 091 matrix)

Phase 2 injury tests are rows **E1–E6** and **F1–F5** in [091](./091_preseed-retirement-bracket-policy.md#comprehensive-test-matrix).

Additional injury-specific tests:

| ID | Scenario | Expected |
| -- | -------- | -------- |
| J1 | Injury cancel → closeRound → R3 assignments match between-round retire same player | Identical forward state |
| J2 | Injury substitute → all matches scored → closeRound | Forward cascade; injured 0 pts on missed games only |
| J3 | Injury on 5p court cancel | Averages; forward sizing correct |
| J4 | Injury + replacement → closeRound | No shrink/cascade; replacement on correct next-round court |
| J5 | Two injuries same round different courts | Sequential forward policy application |
| J6 | Injury R2, between-round retire R3 pre-scores different player | Both exclusions in next assignment |

---

## Acceptance criteria

- [ ] Injury Phase 1 (substitute/cancel) behaviour unchanged
- [ ] `closeRound` applies same forward policy as between-round retirement
- [ ] Optional replacement at injury time (next round only)
- [ ] Preseed shrink/cascade selectable; random seed always cascade
- [ ] Frozen courts excluded from forward redistribution
- [ ] Non-standard bottom court scenarios covered (091 matrix B1–B9, E4)
- [ ] Tests J1–J6 pass
- [ ] 670 updated to reference this spec; replacement contradiction removed
