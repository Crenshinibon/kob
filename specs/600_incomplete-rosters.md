# Handling Incomplete Rosters

## Problem Statement

The KoB Tracker currently supports **16 players (4 courts)** and **32 players (8 courts)** perfectly. In practice, tournament registrations rarely hit these exact numbers. We need a strategy for every count between 17 and 31 that:

1. **Maximizes playtime** — Players paid to play; sitting out feels like a rip-off.
2. **Preserves competitive integrity** — Winning must still be meaningful; the redistribution system must feel fair.
3. **Maintains timing** — A round should not take significantly longer because of edge-case handling.

## Analysis by Player Count

| Players | Courts (4-player) | Remainder | Category |
|---------|-------------------|-----------|----------|
| 17      | 4                 | +1        | 1 leftover |
| 18      | 4                 | +2        | 2 leftovers |
| 19      | 4                 | +3        | 3 leftovers |
| 20      | 5                 | 0         | Clean multiple |
| 21      | 5                 | +1        | 1 leftover |
| 22      | 5                 | +2        | 2 leftovers |
| 23      | 5                 | +3        | 3 leftovers |
| 24      | 6                 | 0         | Clean multiple |
| 25      | 6                 | +1        | 1 leftover |
| 26      | 6                 | +2        | 2 leftovers |
| 27      | 6                 | +3        | 3 leftovers |
| 28      | 7                 | 0         | Clean multiple |
| 29      | 7                 | +1        | 1 leftover |
| 30      | 7                 | +2        | 2 leftovers |
| 31      | 7                 | +3        | 3 leftovers |

The problem splits into two distinct buckets:

- **Clean multiples of 4 (20, 24, 28)**: Need redistribution logic for odd/even court counts (5, 6, 7).
- **1-3 leftovers (all others)**: Need a strategy for the extra players.

---

## Option A: Adjust Court Count (For 20, 24, 28 Players)

The simplest case. Just run 5, 6, or 7 courts of 4 players each. No format changes, no sit-outs, no timing issues.

### Redistribution Adjustments

**Random Seed Format**

- **Round 1 → Round 2 (Vertical seeding)**:
  - With 5 courts: 5 first places → C1 gets top 4, bottom 1 + top 3 second places → C2, etc. This mixes ranks on some courts.
  - With 6 courts: 6 first places → top 4 to C1, bottom 2 + top 2 second places → C2. Still mixes.
  - With 7 courts: Similar mixing pattern.
  - **Verdict**: Acceptable. The goal of Round 1→2 is to sort by strength. Mixing adjacent ranks (1st + 2nd) on the same court is defensible.

- **Round 2+ (Ladder)**:
  - Works perfectly for any court count ≥ 2.
  - 2 up, 2 down between adjacent courts.
  - Top court keeps top 2 + gets top 2 from court below.
  - Bottom court keeps bottom 2 + gets bottom 2 from court above.

**Preseed Format**

- **6 courts (24 players)**: Cleanest extension.
  - Round 1→2: Split into Winner Courts 1-3 (1st-2nd places) and Loser Courts 4-6 (3rd-4th places).
  - Round 2→3: Final placement. Courts 1-2 → places 1-8, Courts 3-4 → places 9-16, Courts 5-6 → places 17-24.
  - **Verdict**: Elegant. Natural extension of the 4-court logic.

- **5 courts (20 players)**:
  - Round 1→2: 1st places → C1 (5 players, keep top 4), 2nd places → C2 (bottom 1 from 1st + top 3 from 2nd), etc. Messy mixing.
  - **Verdict**: Doable but mixes ranks more aggressively.

- **7 courts (28 players)**:
  - Round 1→2: Similar to 5 courts but flipped. 7 first places → C1 gets top 4, C2 gets bottom 3 + top 1 from 2nd places. Messy.
  - **Verdict**: Doable but not elegant.

### Timing Impact

- **None**. Still 4-player courts, 3 matches per court, ~45-60 min per round.

### Competitive Integrity

- **High**. Everyone plays every round. Standard redistribution applies.

---

## Option B: Mixed Court Sizes (3-Player + 4-Player Courts)

For counts where pure 4-player courts leave 1-3 leftovers, mix in 3-player courts (2v1 format).

### Possible Configurations

| Players | 4-Player Courts | 3-Player Courts | Total Courts |
|---------|----------------|-----------------|--------------|
| 31      | 7 (28 players) | 1 (3 players)   | 8            |
| 30      | 6 (24 players) | 2 (6 players)   | 8            |
| 29      | 5 (20 players) | 3 (9 players)   | 8            |
| 27      | 6 (24 players) | 1 (3 players)   | 7            |
| 26      | 5 (20 players) | 2 (6 players)   | 7            |
| 25      | 4 (16 players) | 3 (9 players)   | 7            |
| 23      | 5 (20 players) | 1 (3 players)   | 6            |
| 22      | 4 (16 players) | 2 (6 players)   | 6            |
| 21      | 3 (12 players) | 3 (9 players)   | 6            |
| 19      | 4 (16 players) | 1 (3 players)   | 5            |
| 18      | 3 (12 players) | 2 (6 players)   | 5            |
| 17      | 2 (8 players)  | 3 (9 players)   | 5            |

### 3-Player Court Format

- **3 players per court**: A, B, C.
- **Matches** (3 total):
  1. A+B vs C
  2. A+C vs B
  3. B+C vs A
- **Scoring**: Standard rally points. Team of 2 gets team score each; single player gets their score.
- **Standard volleyball rules** — no modifications. Single player simply uses all 3 team touches themselves.
- **Timing**: Still 3 matches, same ~45-60 min per round.

### Redistribution Challenge

The hard part: **How do you compare 1st place on a 3-player court vs 1st place on a 4-player court?**

**Problem**: A 3-player court only has 1st, 2nd, 3rd (no 4th). If you group all 1st places together for redistribution, the 3-player 1st place is competing with fewer opponents.

**Solutions**:

1. **Rank-normalized redistribution**: Convert every finish to a percentile.
   - 1st of 4 = 100th percentile, 2nd = 75th, 3rd = 50th, 4th = 25th.
   - 1st of 3 = 100th percentile, 2nd = 50th, 3rd = 0th.
   - Redistribute based on percentile instead of raw rank.
   - **Verdict**: Fair but complex to explain to players.

2. **Separate ladders**: 3-player courts have their own promotion/relegation; 4-player courts have theirs. Players never switch between court sizes.
   - **Verdict**: Simple but creates two parallel tournaments. Players on 3-player courts can never win the overall tournament.

3. **Accept the asymmetry**: Just group by raw rank. 1st place (any court) → top group, 2nd place → next group, etc. 4th places from 4-player courts fill the bottom.
   - **Verdict**: Imperfect but practical. Players understand "I finished 1st on my court."

### Timing Impact

- **None**. 3-player courts take the same time as 4-player courts (3 matches).

### Competitive Integrity

- **Medium**. The 3-player format is inherently different (2v1). Some players may perceive it as easier/harder. Rank comparison across court sizes is imperfect.

---

## Option C: Rotating Sit-Outs

For any non-multiple-of-4 count, have some players sit out each round.

### How It Works

- If you have 31 players with 8 courts of 4: 1 player sits out each round.
- If you have 30 players with 8 courts of 4: 2 players sit out each round.
- If you have 29 players with 8 courts of 4: 3 players sit out each round.
- The sit-outs rotate fairly (everyone sits out the same number of times over the tournament).

### Points for Sit-Outs

**Option 1: Zero points**
- Simple. Sitting out = no points that round.
- Problem: Punishes players for a structural issue. Total standings become meaningless.

**Option 2: Average points**
- Sitting player gets the average points of all players who played that round.
- Problem: Artificial. A player could sit out and get more points than if they played.

**Option 3: No points, but winner by final court position**
- Since KoB winner is determined by final court position (not total points), sit-outs don't affect winning.
- Problem: Sit-outs affect Round 1→2 seeding. A player who sits out Round 1 gets no points, so they get seeded to a lower court in Round 2.

**Option 4: Rotating sit-outs only in Round 2+**
- Round 1: Everyone plays. Use smaller court sizes or accept that some courts have fewer players (impossible with 4-player format).
- Actually this doesn't work for Round 1.

**Option 5: "Ghost" player**
- The sit-out player is replaced by a "ghost" who always scores 0.
- The 3 real players on that court play a modified format.
- Problem: Not a real KoB format anymore.

### Timing Impact

- **None**. Standard courts, standard timing.

### Competitive Integrity

- **Low to Medium**. Players paid to play; sitting out feels unfair. Round 1→2 seeding is distorted for sitters.

---

## Option D: King of the Court Challenge (For 1-2 Leftovers)

A hybrid format where the "leftover" players participate in a parallel "King of the Court" challenge while the main KoB tournament runs.

### How It Works

**For 1 leftover:**
- Main tournament: 16 or 28 players on standard courts.
- The 1 leftover becomes the "King" on a challenge court.
- Other players (from the main tournament, rotating) challenge the King in 1v1 or 2v2 matches.
- **Problem**: The leftover player is not part of the main tournament. They can't win.

**For 2 leftovers:**
- Main tournament: 16 or 28 players.
- The 2 leftovers play each other or challenge rotating players.
- **Problem**: Same as above.

**Verdict**: This is really a separate side activity. Doesn't solve the core problem of integrating all players into one tournament.

---

## Option E: 5-Player Court (Parallel Games)

The user mentioned this idea: put 5 or 6 players on a court and run parallel 2v2 games.

### How It Works

- 5 players on a court: Run two simultaneous 2v2 matches (using half the court each) with 1 player sitting out.
- Rotate so everyone sits out once.
- **Match schedule for 5 players (A, B, C, D, E)**:
  - Game 1: A+B vs C+D (E sits)
  - Game 2: A+C vs B+E (D sits)
  - Game 3: A+D vs C+E (B sits)
  - Game 4: A+E vs B+C (D sits) — wait, D already sat.
  - Actually with 5 players, C(5,2)=10 unique pairs. Each match uses 2 pairs = 4 players. Over 5 games, each player sits once and plays 4 times.
  - But that's **5 games**, not 3. Timing is ~1.67× longer.

- 6 players on a court: Even more complex scheduling. More games, more sit-outs.

### Timing Impact

- **Significant**. 5-player court needs 5 games (vs 3 for 4-player). That's **~67% longer** per round.
- For a tournament with multiple rounds, this compounds.

### Competitive Integrity

- **Medium**. Everyone plays, but the format is different from standard KoB.

---

## Timing Comparison Summary

| Approach | Round Time | Setup Complexity | Player Satisfaction |
|----------|-----------|------------------|---------------------|
| Adjust court count (20/24/28) | ~45-60 min | Low | High |
| Mixed 4p + 3p courts | ~45-60 min | Medium | Medium-High |
| Rotating sit-outs | ~45-60 min | Low | Low-Medium |
| King of the Court side | Variable | High | Low (for leftovers) |
| 5p parallel games | ~75-100 min | High | Medium |

---

## Recommendations by Player Count

### Preseed Format

Preseed requires a fixed structure with clean redistribution. Not all counts work well.

| Players | Recommendation | Courts | Notes |
|---------|---------------|--------|-------|
| 16 | Standard preseed | 4 | Already implemented |
| 17-19 | **Sit-outs on 4 courts** OR **drop to 16** | 4 | Preseed structure breaks with odd court counts |
| 20 | **5-court preseed** (stretch) OR **drop to 16** | 5 | Round 1→2 mixes ranks aggressively |
| 21-23 | **Sit-outs on 6 courts** OR **drop to 20** (if 5-court supported) | 6 | |
| 24 | **6-court preseed** | 6 | Clean extension! Recommended |
| 25-27 | **Sit-outs on 6 courts** OR **drop to 24** | 6 | |
| 28 | **7-court preseed** (stretch) | 7 | Round 1→2 is messy |
| 29-31 | **Sit-outs on 8 courts** OR **drop to 28** (if 7-court supported) | 8 | |
| 32 | Standard preseed | 8 | Already implemented |

**Key insight**: For preseed, the clean counts are 16 (4 courts), 24 (6 courts), and 32 (8 courts). These are all even court counts where the winner/loser split works cleanly. Odd court counts (5, 7) break the binary split logic.

### Random Seed Format

Random seed is more flexible because the ladder system works for any court count.

| Players | Recommendation | Courts | Notes |
|---------|---------------|--------|-------|
| 16 | Standard | 4 | Already implemented |
| 17-19 | **Mixed 4p + 3p** OR **sit-outs** | 4+3p | 3p courts work well for 3 leftovers |
| 20 | **5-court random seed** | 5 | Ladder works; Round 1→2 mixes ranks |
| 21-23 | **Mixed 4p + 3p** OR **sit-outs on 6 courts** | 6 | |
| 24 | **6-court random seed** | 6 | Ladder works perfectly |
| 25-27 | **Mixed 4p + 3p** OR **sit-outs on 6 courts** | 6 | |
| 28 | **7-court random seed** | 7 | Ladder works; Round 1→2 mixes ranks |
| 29-31 | **Mixed 4p + 3p** OR **sit-outs on 8 courts** | 8 | |
| 32 | Standard | 8 | Already implemented |

---

## The 24-Player Sweet Spot

**24 players (6 courts) is the most important non-standard count to support.**

Why:
1. It's a realistic turnout (between 16 and 32).
2. It's a clean multiple of 4 — no sit-outs, no mixed courts.
3. 6 courts is an even number, so preseed redistribution works elegantly.
4. The ladder system works for any court count, so random seed is trivial.

**Implementation for 24 players:**
- Random Seed: Extend ladder logic to 6 courts. Round 1→2: group by rank, split top 4/bottom 2 for each rank group across adjacent courts.
- Preseed: 3 rounds fixed. Round 1→2: Winner Courts 1-3 (1st-2nd), Loser Courts 4-6 (3rd-4th). Round 2→3: Final placement by court pairs.

---

## The 29-31 Player Problem

These are the hardest because they're close to 32 but just short.

**Best approach: Mixed 4-player + 3-player courts.**

- 31 = 7×4 + 1×3 (8 courts total)
- 30 = 6×4 + 2×3 (8 courts total)
- 29 = 5×4 + 3×3 (8 courts total)

**Why this beats sit-outs:**
- Everyone plays every round. No one sits out.
- 3-player courts take the same time as 4-player courts.
- Players get 3 matches per round regardless of court size.

**The redistribution challenge** (and a practical solution):
- Group all 1st places (from both 4p and 3p courts) → top courts.
- Group all 2nd places → next courts.
- Group all 3rd places → next courts.
- Group all 4th places (from 4p courts only) → bottom courts.
- For 31 players on 8 courts: 7 first places + 1 first place = 8 first places. Split: top 4 → C1, bottom 4 → C2.
- 7 second places + 1 second place = 8 second places. Split: top 4 → C3, bottom 4 → C4.
- 7 third places + 1 third place = 8 third places. Split: top 4 → C5, bottom 4 → C6.
- 7 fourth places (from 4p courts only) = 7 fourth places. Hmm, we need 8 for two courts. We could take the bottom 4 third places and bottom 4 fourth places and mix them for C7/C8.

Actually, wait. With 31 players on 7×4 + 1×3 courts:
- After Round 1: 7 courts with 1st-4th + 1 court with 1st-3rd.
- Total: 8 first places, 8 second places, 8 third places, 7 fourth places.
- For redistribution to 8 courts of 4: we need 32 players... but we only have 31. We need to add a "ghost" or accept that one court has 3 players in Round 2 as well.

Hmm, this reveals a deeper problem: **If we start with mixed court sizes, we either stay mixed forever or we need to add/remove players between rounds.**

**Alternative for 29-31: Sit-outs with the goal of reaching 32.**
- 31 players: Find 1 substitute/walk-up to reach 32.
- 30 players: Find 2 substitutes.
- 29 players: Find 3 substitutes.
- **Verdict**: In practice, this might be the easiest solution for tournament organizers. But it's not a software solution.

**Alternative for 29-31: Reduce to 28 (7 courts).**
- Draw lots or use seed points to select 28 players.
- The remaining 1-3 players become "alternates" who fill in if someone drops out.
- **Verdict**: Simple, preserves format integrity. But someone is disappointed.

---

## Practical Decision Tree

```
How many players registered?
│
├─ 16 → Standard 4-court tournament
│
├─ 17-19 → Option 1: Drop to 16 (draw lots)
│         → Option 2: Mixed 4p + 3p courts
│         → Option 3: Rotating sit-outs on 4 courts
│
├─ 20 → Option 1: 5-court tournament (stretch implementation)
│     → Option 2: Drop to 16
│
├─ 21-23 → Option 1: Mixed 4p + 3p on 6 courts
│        → Option 2: Rotating sit-outs on 6 courts
│        → Option 3: Drop to 20 (if supported) or 16
│
├─ 24 → 6-court tournament (RECOMMENDED — clean extension)
│
├─ 25-27 → Option 1: Mixed 4p + 3p on 6 courts
│        → Option 2: Rotating sit-outs on 6 courts
│        → Option 3: Drop to 24
│
├─ 28 → Option 1: 7-court tournament (stretch)
│     → Option 2: Drop to 24
│
├─ 29-31 → Option 1: Mixed 4p + 3p on 8 courts
│        → Option 2: Rotating sit-outs on 8 courts
│        → Option 3: Find substitutes to reach 32
│        → Option 4: Drop to 28 (if supported) or 24
│
└─ 32 → Standard 8-court tournament
```

---

## Implementation Priority

### Phase 1: Support 24 Players (6 Courts)

**Why first**: Cleanest non-standard count. No sit-outs, no mixed courts, no timing issues.

**Random Seed**:
- Extend `redistributeLadder()` to handle 6 courts.
- Round 1→2: Vertical seeding with 6 courts (mix adjacent ranks on boundary courts).
- UI: Show 6 court cards.

**Preseed**:
- Extend `redistributePreseed()` for 6 courts.
- 3 rounds fixed. Round 1→2: Winner Courts 1-3, Loser Courts 4-6.
- Round 2→3: Final placement.

### Phase 2: Support 20 and 28 Players (5 and 7 Courts)

**Why second**: Still clean multiples of 4, but odd court counts make preseed redistribution messier.

**Random Seed**: Ladder works. Round 1→2 needs careful rank mixing.
**Preseed**: Binary split doesn't work cleanly with odd court counts. May need to accept rank mixing.

### Phase 3: Mixed 4-Player + 3-Player Courts

**Why third**: Most complex. Requires:
- 3-player match generation (A+B vs C, A+C vs B, B+C vs A).
- 3-player standings calculation (same formula, just 3 players).
- Redistribution logic that handles mixed court sizes.
- UI support for 3-player court display.

### Phase 4: Rotating Sit-Outs

**Why last**: Simplest to implement but worst player experience. Good as a fallback.

---

## Open Questions

1. **Should the system auto-suggest the best configuration** when the user enters a player count? Or should the user manually choose?
2. **For preseed with odd court counts**, is rank mixing acceptable? Or should we restrict preseed to even court counts only (4, 6, 8)?
3. **For 3-player courts**, should the single player serve from the same position? Any rule modifications?
4. **Should sit-out players get points?** If so, how many?
5. **Can we recruit "ghost" players** (organizers, volunteers) to fill spots and reach a multiple of 4?
