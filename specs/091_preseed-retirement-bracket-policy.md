# Preseed Retirement: Bracket Policy (Shrink vs Cascade)

## Status

**PROPOSED** — not yet implemented. This spec defines two org-selectable policies for between-round retirement in preseed tournaments after the next round's groups have already been calculated.

Related specs:

- [670_player-retirement.md](./670_player-retirement.md) — general retirement flow
- [082_preseed-example-16p.md](./082_preseed-example-16p.md) — canonical 16-player bracket walkthrough
- [083_preseed-example-20p.md](./083_preseed-example-20p.md) — asymmetric 20-player bracket + frozen Court 5
- [087_preseed-frozen-courts.md](./087_preseed-frozen-courts.md) — frozen bracket leaves
- [089_random-example-17p-retirement.md](./089_random-example-17p-retirement.md) — random-seed cascade (analogous policy)

---

## Problem

In **preseed** format, closing a round does two things:

1. Saves round results
2. Calculates the **next round's court assignments** via `processPreseedTransition()` (tier split within each bracket group)

If a player retires **after the round is closed** but **before any scores are entered** in the newly calculated round, the organizer must decide what happens to the bracket structure.

Unlike random seed (where ladder redistribution is linear between adjacent courts), preseed has a **bracket tree**:

```
Winner bracket ─┬─ Final court (F)
                └─ Loser-of-winners (L(W))
Loser bracket  ─┬─ Top consolation (TL)
                └─ Bottom consolation (BL)
Early leaf     ─── Frozen court (e.g. L5 in 20p)
```

When one player disappears, two reasonable approaches exist — and they have different trade-offs for competitive integrity, court formats, and the **one non-standard court** design goal.

---

## Scope

| In scope | Out of scope |
| -------- | ------------ |
| Between-round retirement in **preseed** format | Random-seed retirement (see [089](./089_random-example-17p-retirement.md)) |
| Retirement **before scores** in the current round | Mid-round injury (substitute / cancel & average) |
| Active (non-frozen) courts only | Re-running completed rounds |
| Single or multiple retirements between same rounds | Pre-tournament player removal |

### Preconditions

1. Tournament format = `preseed`
2. `currentRound > 0` and round is active
3. **No scores entered** on the retiring player's group
4. Next-round assignments were already computed by `closeRound` (or equivalent)

---

## Design Constraints

### 1. Frozen courts are immutable

Courts that have **frozen** (per [087](./087_preseed-frozen-courts.md)) do not participate in redistribution. Their standings are final. Retiring a player on a frozen court only affects final placement — not group composition.

### 2. One non-standard court (tournament-wide goal)

The product goal is **at most one non-standard court** (3p / 5p / 6p), and it should be the **lowest-ranked active court** when possible. See [610_incomplete-core.md](./610_incomplete-core.md).

| Policy | Risk to non-standard rule |
| ------ | ------------------------- |
| **Shrink** | Can create a **3p court inside the bracket** (e.g. Court 2 in a 16p final round) while Court 4 is still 4p — **two** non-standard situations |
| **Cascade** | Concentrates the player deficit at the **bottom** of the bracket hierarchy; only the lowest active court may become 3p |

### 3. Bracket roles are preserved

Neither policy re-runs a full global `processPreseedTransition()` from scratch (which would reshuffle all groups). Both policies start from the **already-calculated assignments** for the current round and apply a local adjustment.

### 4. Final standing for retirees

Unchanged from [670](./670_player-retirement.md): preseed retirees receive the **worst place in their bracket range**, with ordering for multiple retirees in the same bracket.

---

## Org Control

### Tournament setting

Add a tournament-level option:

| Field | Values | Default (proposed) |
| ----- | ------ | ------------------ |
| `preseedRetirementPolicy` | `shrink` \| `cascade` | `cascade` |

**Where to set it:**

- Tournament creation form (preseed format only)
- Editable until Round 1 starts
- Shown in tournament settings summary for the organizer

### Per-retirement confirmation (optional enhancement)

When retiring, show a read-only preview of the selected policy's effect:

```
Retire J from Court 2 (Silver bracket)

Policy: Cascade — Court 2 stays 4p. G moves up from Court 3. Court 4 becomes 3p.

[Retire Player]  [Cancel]
```

If the tournament policy is `shrink` but the preview shows a mid-bracket 3p court, display a warning:

```
⚠ Shrink policy will create a 3-player court on Court 2. Consider switching to Cascade in tournament settings.
```

### Relationship to random seed

Random-seed tournaments **always** use cascade (ladder backfill). There is no separate setting — cascade is the only correct ladder behaviour. The preseed setting exists because bracket trees introduce the shrink alternative.

---

## Bracket ordering (for cascade)

At any round, assign each **active** court a **placement level** (1 = best, N = worst). Cascade always pulls from level `k+1` into level `k`.

### 16 players, Round 3 (final)

| Level | Court | Bracket role |
| ----- | ----- | ------------ |
| 1 | Court 1 | Final (F) |
| 2 | Court 2 | Loser-of-winners (L(W)) |
| 3 | Court 3 | Top consolation (TL) |
| 4 | Court 4 | Bottom consolation (BL) |

### 20 players, Round 3 (Court 5 frozen)

| Level | Court | Bracket role | Active? |
| ----- | ----- | ------------ | ------- |
| 1 | Court 1 | WW top | ✓ |
| 2 | Court 2 | WW bottom | ✓ |
| 3 | Court 3 | LW top | ✓ |
| 4 | Court 4 | LW bottom | ✓ |
| — | Court 5 | Early leaf (L5) | **Frozen** |

### 20 players, Round 4 (Court 5 frozen)

| Level | Court | Bracket role | Active? |
| ----- | ----- | ------------ | ------- |
| 1 | Court 1 | Final | ✓ |
| 2 | Court 2 | Top consolation (TL) | ✓ |
| 3 | Court 3 | *(unused — only 2 active courts in final split)* | — |
| 4 | Court 4 | *(unused)* | — |
| — | Court 5 | Frozen | **Frozen** |

> **Rule:** Placement levels are computed from the bracket tree **at the current round**, not from raw court numbers alone. Implementation must use the same bracket-group metadata that `processPreseedTransition()` uses.

---

## Policy A: Bracket Shrink (`shrink`)

### Definition

**Keep the calculated bracket assignment. Remove the retired player. Do not replace them.**

- All other courts keep their exact player lists
- The affected court may drop below 4 players (typically 3p)
- No player moves between bracket levels

### Algorithm

```
1. Load current-round assignments (already computed)
2. Remove retiredPlayerId from their court's playerIds
3. Recalculate tournament courtSizes[] for new player count
4. If the affected court's size < 4, mark it non-standard (3p)
5. Frozen courts: unchanged
6. Regenerate matches for affected courts only
```

### Properties

| Pro | Con |
| --- | --- |
| Simple, predictable | May create **3p court mid-bracket** |
| No player "undeservedly" promoted | Violates one-non-standard-court goal |
| Bracket membership strictly reflects prior round results | Uneven match counts on the short court |
| | 3p in a gold/silver court feels wrong competitively |

### When organizers might choose Shrink

- They want **zero promotion** from lower brackets
- Retirement is on the **bottom active court** anyway (shrink ≈ cascade)
- Exhibition / casual event where format purity matters less

---

## Policy B: Bracket Cascade (`cascade`)

### Definition

**Keep the calculated bracket assignment structure. Remove the retired player. Backfill the vacancy by promoting players upward through the bracket hierarchy** — analogous to random-seed ladder cascade ([089](./089_random-example-17p-retirement.md)).

### Algorithm

```
1. Load current-round assignments and full previous-round standings (ranks preserved)
2. Build placement levels for active courts (best → worst)
3. Remove retiredPlayerId from their court
4. For level k where retirement occurred, while court k is short:
     a. Identify the next placement level k+1 (or same-level relegation pool — see backfill order)
     b. Select the best available promotable player by previous-round finish rank
     c. Move player to level k, mark assigned
5. Repeat cascade downward until all levels processed or bottom level absorbs deficit
6. Bottom active court may become 3p if player count requires it
7. Frozen courts: unchanged
```

### Backfill order within a level

When court at level `k` needs a player, candidates are chosen in this order:

1. **Primary:** Best finisher (rank 1, then 2, …) from the **next lower placement level** `k+1` who is not yet reassigned
2. **Secondary:** If level `k+1` is exhausted, continue from level `k+2`, etc.
3. **Tertiary:** Within the same bracket group, use previous-round **finish rank on the retiring player's origin court** (same logic as random-seed relegation pool backfill)

Tie-break: points → diff → playerId (deterministic).

### Properties

| Pro | Con |
| --- | --- |
| Preserves **4p courts** at higher bracket levels | A lower-bracket player moves up (may feel unfair) |
| Concentrates non-standard court at the **bottom** | Slightly more complex |
| Consistent with random-seed cascade mental model | Requires clear UI explanation |
| Better competitive format above the bottom court | |

### When organizers might choose Cascade

- Default for competitive tournaments
- Retirement from a **non-bottom** court (most cases)
- When maintaining standard 4p play on gold/silver courts matters

---

## Example 1: 16 Players — Retire J from Court 2 (Round 3)

Uses data from [082_preseed-example-16p.md](./082_preseed-example-16p.md). Round 2 is closed; Round 3 assignments are calculated; **no scores entered**.

### Round 3 before retirement

| Court 1 (F) | Court 2 (L(W)) | Court 3 (TL) | Court 4 (BL) |
| :---------: | :------------: | :----------: | :----------: |
| C           | D              | G            | I            |
| B           | E              | L            | M            |
| A           | F              | N            | K            |
| H           | **J** ← retires | O            | P            |

**Context:** J finished 4th on Court 1 (Winners) in Round 2 and was relegated to Court 2 (Silver) for Round 3.

**Player count:** 16 → 15 → court config `[4, 4, 4, 3]`

---

### Policy A (Shrink): Result

Remove J. All other courts unchanged.

| Court 1 (F) 4p | Court 2 (L(W)) **3p** | Court 3 (TL) 4p | Court 4 (BL) 4p |
| -------------- | --------------------- | --------------- | --------------- |
| C              | D                     | G               | I               |
| B              | E                     | L               | M               |
| A              | F                     | N               | K               |
| H              |                       | O               | P               |

**Observations:**

- Court 2 is now **3p** (2v1 rotation) in the **silver bracket** — not the bottom court
- Court 4 remains 4p even though the tournament only needs one 3p court globally
- **Two format anomalies:** Court 2 is 3p, but config says bottom court should be 3p → **conflict**

---

### Policy B (Cascade): Result

Remove J. Backfill Court 2 from Court 3 (next level down). Cascade continues.

**Step 1 — Court 2 loses J:**

| Slot | Source | Player |
| ---- | ------ | ------ |
| Keep | — | D, E, F |
| Vacancy | Pull best from Court 3 (TL) | **G** (1st on Court 3 in R2) |

**Step 2 — Court 3 loses G:**

| Slot | Source | Player |
| ---- | ------ | ------ |
| Keep | — | L, N, O |
| Vacancy | Pull best from Court 4 (BL) | **I** (1st on Court 4 in R2) |

**Step 3 — Court 4 loses I:**

Court 4 absorbs deficit at bottom → **3p**

| Court 1 (F) 4p | Court 2 (L(W)) 4p | Court 3 (TL) 4p | Court 4 (BL) **3p** |
| -------------- | ----------------- | --------------- | ------------------- |
| C              | D                 | L               | M                   |
| B              | E                 | N               | K                   |
| A              | F                 | O               | P                   |
| H              | **G** ↑           | **I** ↑         |                     |

**Observations:**

- Courts 1–3 remain standard **4p**
- Only Court 4 (bottom consolation) becomes **3p** — matches the global non-standard rule
- G and I are **promoted** one bracket level (they would have benefited from J's retirement)
- Competitive integrity: gold bracket (Court 1) untouched

---

### Side-by-side summary (16p / retire J)

| Aspect | Shrink | Cascade |
| ------ | ------ | ------- |
| Court 1 | Unchanged | Unchanged |
| Court 2 | **3p** (D, E, F) | 4p (D, E, F, G) |
| Court 3 | Unchanged | I promoted in, G promoted out |
| Court 4 | Unchanged | **3p** (M, K, P) |
| Non-standard courts | 1 mid-bracket | 1 at bottom |
| Players promoted | None | G, I |

---

## Example 2: 20 Players — Retire M from Court 2 (Round 3)

Uses data from [083_preseed-example-20p.md](./083_preseed-example-20p.md). Round 2 closed; Round 3 calculated; Court 5 **frozen** after Round 2.

### Round 3 before retirement

| C1 (WW⊤) | C2 (WW⊥) | C3 (LW⊤) | C4 (LW⊥) | C5 (frozen) |
| :------: | :------: | :------: | :------: | :---------: |
| A        | L        | C        | I        | O           |
| B        | J        | D        | P        | R           |
| E        | **M** ←  | F        | N        | T           |
| G        | Q        | H        | K        | S           |

**Context:** M finished 3rd on Court 1 (WW) in Round 2 and was on Court 2 (WW bottom) for Round 3.

**Player count:** 20 → 19 → court config `[4, 4, 4, 4, 3]` — but Court 5 is frozen with 4 players, so **active** config is `[4, 4, 4, 3]` on Courts 1–4.

---

### Policy A (Shrink): Result

| C1 4p | C2 **3p** | C3 4p | C4 4p | C5 frozen |
| ----- | --------- | ----- | ----- | --------- |
| A,B,E,G | L,J,Q | C,D,F,H | I,P,N,K | O,R,T,S |

- Court 2 becomes **3p** in the **winner bracket sub-tree**
- Courts 3–4 unaffected
- Frozen Court 5 unchanged
- **Problem:** Active bracket now has a 3p court at level 2 AND needs a 3p at level 4 for player-count math — shrink does not resolve global sizing cleanly

---

### Policy B (Cascade): Result

Placement levels: C1(1) → C2(2) → C3(3) → C4(4). Court 5 frozen.

**Step 1 — Court 2 loses M:**

Backfill from Court 3 (LW top): **C** (strongest promotable — 1st on Court 3 in R2 results)

**Step 2 — Court 3 loses C:**

Backfill from Court 4: **I** (1st on Court 4 in R2)

**Step 3 — Court 4 loses I:**

Court 4 becomes **3p** at bottom of active bracket

| C1 4p | C2 4p | C3 4p | C4 **3p** | C5 frozen |
| ----- | ----- | ----- | --------- | --------- |
| A,B,E,G | L,J,Q,**C**↑ | D,F,H,**I**↑ | P,N,K | O,R,T,S |

**Observations:**

- Winner-bracket top (C1) unchanged — critical for gold race integrity
- Only the lowest **active** court (C4) becomes 3p
- Frozen Court 5 unaffected
- C and I promoted — they gain harder opponents but also a chance at better final placement

---

## Example 3: Retirement on the Bottom Active Court

### 16p — Retire P from Court 4 (BL)

**Shrink:** Court 4 → 3p (I, M, K). Courts 1–3 unchanged. ✅ Acceptable — non-standard at bottom.

**Cascade:** No level below Court 4. Backfill impossible. **Same result as shrink.** ✅

> **Rule:** Cascade and Shrink are **equivalent** when retiring from the lowest active placement level.

### 20p — Retire S from frozen Court 5

Court 5 is frozen. Retirement does not change assignments. S receives final standing place 20. ✅

---

## Example 4: Retirement from Top Court (Edge Case)

### 16p — Retire H from Court 1 (F)

| Policy | Result |
| ------ | ------ |
| **Shrink** | Court 1 → **3p** (C, B, A) — disastrous format-wise |
| **Cascade** | Pull from Court 2: **D** (best available from L(W)) → Court 1 stays 4p. Cascade continues to bottom. |

**Recommendation:** Never use Shrink for non-bottom retirements. Cascade strongly preferred for Court 1 retirements.

---

## Comparison Table

| Criterion | Shrink | Cascade |
| --------- | ------ | ------- |
| Algorithm complexity | Low | Medium |
| Preserves 4p on upper courts | ❌ | ✅ |
| One non-standard court at bottom | ❌ | ✅ |
| Player promotion from lower bracket | Never | Yes, by bracket level |
| Same as random-seed mental model | ❌ | ✅ |
| Fair if retirement is on bottom court | ✅ | ✅ (identical) |
| Fair if retirement is mid-bracket | ⚠️ Short court | ⚠️ Someone promoted |
| Frozen court handling | No change | No change |
| Re-runs full preseed redistribution | No | No |

---

## Multiple Retirements

If 2+ players retire before the same round's scores:

1. Process retirements **sequentially** in the order the organizer submits them
2. Apply the tournament's policy after each removal
3. Final standing uses bracket ordering per [670](./670_player-retirement.md)

**Shrink example (16p):** Retire J then F from Court 2 → Court 2 becomes **2p** — invalid. System should reject or force cascade for the second retirement.

**Validation rule (proposed):** If shrink would produce a court with fewer than 3 players, block the retirement and suggest cascade:

```
Cannot retire: Court 2 would have 2 players. Switch to Cascade policy or retire a different player.
```

Minimum court size is 3 (2v1). Courts with 1–2 players cannot function.

---

## UI / UX Requirements

### Tournament creation (preseed only)

```
Preseed retirement policy
( ) Cascade — promote from lower bracket (recommended)
( ) Shrink  — remove player, court may become 3-player
```

Help text:

> **Cascade** keeps standard 4-player courts at higher levels and moves players up from lower brackets — similar to random seed. **Shrink** simply removes the player, which may create a 3-player court in the middle of the bracket.

### Retirement dialog

Show:

- Retiring player's name, current court, bracket role
- Active policy name
- Preview table: before / after courts
- Warning if shrink creates mid-bracket 3p
- Warning if cascade promotes specific named players

### Standings page

- No change to frozen court display
- If a court is 3p due to retirement, show format badge: `3-player group`

---

## Implementation Notes (Future)

### Database

```typescript
// tournament table
preseedRetirementPolicy: text('preseed_retirement_policy')
  .notNull()
  .default('cascade'); // 'shrink' | 'cascade'
```

### Logic layer (`src/lib/tournament-logic.ts`)

New functions (proposed):

| Function | Purpose |
| -------- | ------- |
| `getActiveBracketLevels(courtCount, roundsCompleted, frozenCourts)` | Placement levels for cascade |
| `applyPreseedShrink(assignments, retiredId, courtSizes)` | Policy A |
| `applyPreseedCascade(assignments, prevResults, retiredId, levels, courtSizes)` | Policy B |
| `resolvePreseedRetirement(opts)` | Entry point; selects policy from tournament config |

`buildRedistributionFromResults()` for preseed should **not** be the primary retirement path — bracket policies operate on **already-calculated** assignments.

### Current behaviour (gap)

Today, preseed retirement calls `processPreseedTransition()` with filtered player lists, which **re-runs global tier redistribution** rather than either policy described here. That can reshuffle multiple courts unpredictably. Implementation should be updated to match this spec.

---

## Recommended Defaults

| Scenario | Recommended policy |
| -------- | ------------------ |
| New preseed tournaments | **Cascade** (default) |
| Retirement on bottom active court | Either (equivalent) |
| Retirement on frozen court | N/A (no redistribution) |
| Casual / no promotion wanted | Shrink (with warnings) |

---

## Open Questions

1. **Per-retirement override:** Should the organizer override the tournament policy for a single retirement, or only at creation time?
2. **Cascade across bracket group boundaries:** When the winner bracket has an odd split (20p R4), does cascade cross from TL into Final, or only within the same R3 bracket pair?
3. **Undo retirement:** Re-apply the inverse of whichever policy was used (store `retirementPolicyApplied` on player row?).
4. **Preseed + random hybrid:** Out of scope — preseed only.

---

## Acceptance Criteria (when implemented)

- [ ] Organizer can select `shrink` or `cascade` at preseed tournament creation
- [ ] Example 1 (16p / retire J) produces exact tables above for each policy
- [ ] Example 2 (20p / retire M) produces exact tables above for each policy
- [ ] Frozen courts never change on retirement
- [ ] Shrink blocks retirement that would create a <3p court
- [ ] Unit tests for both policies + frozen + bottom-court equivalence
- [ ] E2E: retire player in preseed R3 before scores, verify preview matches result
