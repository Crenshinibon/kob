# Preseed Bracket Ranking Investigation

## Question

Should preseed tournament standings rank by bracket rather than by raw court position? For mid-tournament rounds, multiple courts share a bracket. Should players across those courts be compared by performance?

## Current Behavior

Standings sort strictly by court position: Court 1 rank 1-4 → Court 2 rank 1-4 → ...

## Example: 16 Players After Round 1

```
R1→R2: splitSize(4)=2 → 2W + 2L
  Winners bracket: Courts 1-2 (8 players: all 1st+2nd from R1, origin-mixed)
  Losers bracket:  Courts 3-4 (8 players: all 3rd+4th from R1, origin-mixed)
```

**Current ranking** (court position, within-court by points):
```
1st:  Court 1, rank 1 (60 pts)
2nd:  Court 1, rank 2 (55 pts)
3rd:  Court 1, rank 3 (50 pts)
4th:  Court 1, rank 4 (45 pts)
5th:  Court 2, rank 1 (65 pts)  ← better than C1 last places
6th:  Court 2, rank 2 (58 pts)
7th:  Court 2, rank 3 (48 pts)
8th:  Court 2, rank 4 (40 pts)
...
```

**Bracket-level ranking** (rank all 8 in winners bracket by points):
```
1st:  Court 2, rank 1 (65 pts)  ← moves up
2nd:  Court 1, rank 1 (60 pts)  ← moves down
3rd:  Court 2, rank 2 (58 pts)
4th:  Court 1, rank 2 (55 pts)
5th:  Court 1, rank 3 (50 pts)
6th:  Court 2, rank 3 (48 pts)
7th:  Court 1, rank 4 (45 pts)
8th:  Court 2, rank 4 (40 pts)
...
```

Bracket-level ranking is arguably more accurate mid-tournament: a 1st place on Court 2 with 65 pts outperformed a 1st place on Court 1 with 60 pts in the same round on comparable courts.

## Bracket Structure Per Round (16p Preseed)

```
Round 1: No brackets (flat snake seeding)
  Rankings by court position — no bracket concept yet

Round 2: splitSize(4)=2 → 2W+2L
  Bracket W: Courts 1-2 (1st+2nd places from R1)
  Bracket L: Courts 3-4 (3rd+4th places from R1)

Round 3 (final): splitSize(2)=1 → each court is own bracket
  Court 1 = winner of winners
  Court 2 = loser of winners
  Court 3 = winner of losers
  Court 4 = loser of losers
```

For 20p preseed the bracket tree is more complex — 3-level tree with asymmetric branches. `getPreseedBracketRange` can determine bracket membership but the UI would need to know which courts form each bracket.

## Implementation Complexity

### What's Needed

1. **Bracket boundary computation**: Which courts share a bracket at the current round. For 16p round 2: `[{courts: [1,2], label: "Winners"}, {courts: [3,4], label: "Losers"}]`

2. **Bracket-aware sort**: Within each bracket group, sort by points/diff instead of by court number. Players on different courts within the same bracket are compared by performance.

3. **UI grouping**: Visual separation between brackets (using the existing left-border + group-separator from spec 940, potentially with bracket labels)

### Difficulty Assessment

| Concern | Complexity | Notes |
|---------|-----------|-------|
| Bracket boundary computation | Medium | `getPreseedBracketRange(courtNum, totalCourts)` gives `{min,max}` place range per court. Courts with equal range share a bracket. But this doesn't work for the final round where each court is its own bracket. Need to compute bracket groups per round. |
| Sort logic changes | Medium | Current sort is simple: court→rank→points. Bracket sort would group-by-bracket then sort-within-bracket. Changes needed in `standings/+page.server.ts` sort function. |
| Bracket labels/UI | Low | Just add visual grouping, no new data. Left-border already groups by court; bracket grouping would merge adjacent courts with same bracket. |
| Asymmetric brackets (20p, 12p) | High | `splitSize` creates irregular trees. The `L` bracket in 20p (Court 5) stays constant across rounds while winner courts keep splitting. Need generic bracket tree traversal. |
| Round 1 handling | None | No brackets in round 1 — flat seeding, keep current behavior. |
| Random seed format | None | Random seed doesn't use brackets — keep current court-position sort. |
| Pre-existing retirement bracket logic | Low | `getPreseedBracketRange` already used in retirement final-standing computation. |

### Risk

- **Correctness**: Bracket-level ranking must match the actual redistribution logic. If standings sort by bracket but redistribution places players differently, standings become misleading.
- **Regression**: Changing sort mid-tournament could break tests that assume court-position ordering.
- **Edge cases**: 3p/5p/6p bottom courts, player retirements that change court sizes, injury cancellations.

### Effort Estimate

2-3 days: bracket boundary computation + sort logic + UI grouping + tests.

## Recommendation

**Defer.** Court-position ranking is correct for final standings (where each court IS its own bracket) and provides a consistent, predictable ordering throughout the tournament. Bracket-level ranking adds meaningful nuance mid-tournament but the complexity-to-value ratio is high:

- Bracket structure is already implicit in court ordering (winner courts before loser courts)
- The redistribution re-ranks within brackets for the next round anyway
- Players care about which court they're on, not abstract bracket placement

If implemented, restrict to preseed format only, rounds ≥ 2, and clearly label brackets in the UI. The simplest approach: group adjacent courts with the same `getPreseedBracketRange` result, sort within each group by points.

---

## Acceptance Criteria

- [x] Investigated bracket vs court ranking for preseed mid-tournament
- [x] Documented complexity and risks
- [ ] Implement bracket-level ranking (DEFERRED — 2-3 day effort, moderate risk)
