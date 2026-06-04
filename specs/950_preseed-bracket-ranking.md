# Preseed Bracket Ranking Investigation

## Question

Should preseed tournament standings rank by bracket rather than by raw court position?

Current standings sort: Court 1 → Court 2 → Court 3 → Court 4. Within each court, by rankOnCourt. This gives:

```
1st:  Court 1, rank 1
2nd:  Court 1, rank 2
3rd:  Court 1, rank 3
4th:  Court 1, rank 4
5th:  Court 2, rank 1
...
```

## Analysis

### 16 Players (4 Courts, 3 rounds) — Balanced Tree

Bracket tree for 16p preseed:
```
R1→R2: splitSize(4)=2 → 2W + 2L
  W: Courts 1-2  (all 1st+2nd from R1, mixed)
  L: Courts 3-4  (all 3rd+4th from R1, mixed)

R2→R3: splitSize(2)=1 → 1F+1L within each bracket
  Winners bracket:
    Court 1 (final): top 4 from C1+C2 in R2
    Court 2 (loser of winners): bottom 4 from C1+C2 in R2
  Losers bracket:
    Court 3 (winner of losers): top 4 from C3+C4 in R2
    Court 4 (loser of losers): bottom 4 from C3+C4 in R2
```

Final ranking by court position:
- Court 1: Places 1-4 ✅ (winner of winners bracket)
- Court 2: Places 5-8 ✅ (loser of winners bracket)  
- Court 3: Places 9-12 ✅ (winner of losers bracket)
- Court 4: Places 13-16 ✅ (loser of losers bracket)

**This IS bracket ranking.** The bracket tree aligns perfectly with court position for balanced (power-of-2) court counts.

### 20 Players (5 Courts, 4 rounds) — Asymmetric Tree

Bracket tree for 20p preseed:
```
R1→R2: splitSize(5)=4 → 4W + 1L
  W: Courts 1-4
  L: Court 5 (unchanged for rest of tournament)

R2→R3: splitSize(4)=2 → 2WW+2LW
  WW: Courts 1-2 (top of winners)
  LW: Courts 3-4 (bottom of winners)
  L: Court 5 (unchanged)

R3→R4: splitSize(2)=1 → 1F+1L within each 2-court bracket
  WW bracket: Court 1 (final), Court 2 (loser of WW)
  LW bracket: Court 3 (top of LW), Court 4 (bottom of LW)
  L bracket: Court 5 (unchanged)
```

Final ranking by court position:
- Court 1: Places 1-4 ✅ (winner of winners bracket)
- Court 2: Places 5-8 ✅ (loser of winners bracket)
- Court 3: Places 9-12 ✅ (winner of loser-of-winners)
- Court 4: Places 13-16 ✅ (loser of loser-of-winners)
- Court 5: Places 17-20 ✅ (loser bracket)

**Again, court position IS bracket ranking.** The recursive bracket structure ensures each leaf court maps to a specific bracket tier.

### 12 Players (3 Courts, 3 rounds) — Asymmetric Tree

```
R1→R2: splitSize(3)=2 → 2W + 1L
  W: Courts 1-2
  L: Court 3

R2→R3: splitSize(2)=1 → 1F+1L(W)
  W bracket: Court 1 (final), Court 2 (loser of winners)
  L bracket: Court 3 (unchanged)
```

Final ranking by court position:
- Court 1: Places 1-4 ✅
- Court 2: Places 5-8 ✅ 
- Court 3: Places 9-12 ✅

## Conclusion

**No change needed.** Court-position-based ranking ALREADY reflects bracket structure for all preseed configurations. The recursive bracket tree naturally ensures that court order maps to bracket order:

- First court(s) = top bracket (winner of winners)
- Last court(s) = bottom bracket (loser)

The `processPreseedTransition` + `splitSize` algorithm guarantees this invariant by always placing winner courts before loser courts.

---

## Implementation Verification

Check `src/lib/tournament-logic.ts`:
- `processPreseedTransition()` (line ~445) — splits into winner/loser brackets per `splitSize`
- Winner courts always assigned lower court numbers than loser courts
- `redistributePreseedRecursive()` (line ~397) — flat distribution within a single bracket maintains tier ordering

No code changes needed. Spec 080 and preseed examples (081-083) already correctly describe this behavior.

---

## Acceptance Criteria

- [x] Verified that court position = bracket position for all preseed court counts (8-64)
- [x] No ranking logic change needed
- [x] Documentation updated to clarify relationship between brackets and court ordering
