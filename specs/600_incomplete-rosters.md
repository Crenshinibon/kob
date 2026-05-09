# Handling Incomplete Rosters

## Problem Statement

The KoB Tracker currently supports **16 players (4 courts)** and **32 players (8 courts)** perfectly. In practice, tournament registrations rarely hit these exact numbers. We need a strategy for every count between **8 and 31** that:

1. **Maximizes playtime** — Players paid to play; sitting out feels like a rip-off.
2. **Preserves competitive integrity** — Winning must still be meaningful; the redistribution system must feel fair.
3. **Maintains timing** — A round should not take significantly longer because of edge-case handling.

**Cancellation threshold**: Below 8 players, cancel the tournament. KoB needs at least 2 courts (8 players) for the partner rotation and redistribution logic to function.

## Analysis by Player Count

| Players | Courts (4-player) | Remainder | Category |
|---------|-------------------|-----------|----------|
| 8       | 2                 | 0         | Clean multiple |
| 9       | 2                 | +1        | 1 leftover |
| 10      | 2                 | +2        | 2 leftovers |
| 11      | 2                 | +3        | 3 leftovers |
| 12      | 3                 | 0         | Clean multiple |
| 13      | 3                 | +1        | 1 leftover |
| 14      | 3                 | +2        | 2 leftovers |
| 15      | 3                 | +3        | 3 leftovers |
| 16      | 4                 | 0         | Clean multiple (standard) |
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

The problem splits into three buckets:

- **Clean multiples of 4 (8, 12, 16, 20, 24, 28)**: No sit-outs needed. Just need redistribution logic for different court counts.
- **1-3 leftovers (all others)**: Need a strategy for the extra players.
- **Below 8**: Cancel the tournament.

---

## How Vertical Seeding Actually Works

After Round 1 with N courts, we have exactly N first places, N second places, N third places, and N fourth places. For vertical seeding (Round 1 to 2), we fill courts by cascading down the ranks:

**Start with rank 1. Fill each court to 4 players. When a court has fewer than 4 of the current rank, take the remainder from the next rank (best by points/diff). Continue until all players are placed.**

### Examples

**2 courts (8 players)** — clean:
- C1: 2 first places + 2 second places = 4
- C2: 2 third places + 2 fourth places = 4

**3 courts (12 players)** — clean:
- C1: 3 first places + 1 best second place = 4
- C2: 2 remaining second places + 2 best third places = 4
- C3: 1 remaining third place + 3 fourth places = 4

**5 courts (20 players)** — clean:
- C1: 4 first places = 4
- C2: 1 remaining first place + 3 best second places = 4
- C3: 2 remaining second places + 2 best third places = 4
- C4: 3 remaining third places + 1 best fourth place = 4
- C5: 4 remaining fourth places = 4

**6 courts (24 players)** — clean:
- C1: 4 first places = 4
- C2: 2 remaining first places + 2 best second places = 4
- C3: 4 remaining second places = 4
- C4: 4 third places = 4
- C5: 2 remaining third places + 2 best fourth places = 4
- C6: 4 remaining fourth places = 4

**7 courts (28 players)** — clean:
- C1: 4 first places = 4
- C2: 3 remaining first places + 1 best second place = 4
- C3: 4 best second places = 4
- C4: 2 remaining second places + 2 best third places = 4
- C5: 4 best third places = 4
- C6: 1 remaining third place + 3 best fourth places = 4
- C7: 4 remaining fourth places = 4

**Key insight**: Vertical seeding works cleanly for ANY court count. The pattern is a natural cascade where overflow from one rank flows into the next court, sorted by performance (points/diff).

---

## Option A: Adjust Court Count (Clean Multiples of 4)

The simplest case. Just run 2, 3, 5, 6, or 7 courts of 4 players each. No format changes, no sit-outs, no timing issues.

### Redistribution Adjustments — Random Seed Format

- **Round 1 to Round 2 (Vertical seeding)**: Works cleanly for any court count. See examples above.

- **Round 2+ (Ladder)**:
  - Works for any court count >= 2.
  - 2 up, 2 down between adjacent courts.
  - Top court keeps top 2 + gets top 2 from court below.
  - Bottom court keeps bottom 2 + gets bottom 2 from court above.
  - Middle courts: get bottom 2 from above + top 2 from below.

### Redistribution Adjustments — Preseed Format

Preseed relies on repeated binary splitting. Each split divides courts into a "winner" group and a "loser" group. This requires the court count to be a power of 2 at each split stage:

| Courts | Splits Possible | Rounds | Preseed Works? |
|--------|----------------|--------|----------------|
| 2      | 1 (2 to 1+1)   | 2      | Yes |
| 3      | 0              | —      | No |
| 4      | 2 (4 to 2+2, then 2 to 1+1) | 3 | Yes |
| 5-7    | 0              | —      | No |
| 8      | 3 (8 to 4+4, 4 to 2+2, 2 to 1+1) | 4 | Yes |

- **2 courts (8 players)**: Clean.
  - Round 1 to 2: Winner Court 1 (1st-2nd from both courts = 4 players), Loser Court 2 (3rd-4th from both = 4 players).
  - Round 2: Final placement. C1 = places 1-4, C2 = places 5-8.
  - **Verdict**: Works perfectly. A mini-KoB.

- **4 courts (16 players)**: Already implemented. 3 rounds.

- **8 courts (32 players)**: Already implemented. 4 rounds.

- **6 courts (24 players)**: Does NOT work for pure preseed (not power of 2). But works via Option E: play Round 1 on 6 courts, cut to top 16, then standard 16p preseed.

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
| 15      | 3 (12 players) | 1 (3 players)   | 4            |
| 14      | 2 (8 players)  | 2 (6 players)   | 4            |
| 13      | 2 (8 players)  | 1 (3 players)   | 3            |
| 11      | 2 (8 players)  | 1 (3 players)   | 3            |
| 10      | 1 (4 players)  | 2 (6 players)   | 3            |
| 9       | 1 (4 players)  | 1 (3 players)   | 2            |

### 3-Player Court Format

- **3 players per court**: A, B, C.
- **Matches** (3 total):
  1. A+B vs C
  2. A+C vs B
  3. B+C vs A
- **Scoring**: Standard rally points. Team of 2 gets team score each; single player gets their score.
- **Standard volleyball rules** — no modifications. Single player simply uses all 3 team touches themselves.
- **Timing**: Still 3 matches. May run slightly faster in practice because the 1v2 team is at a significant disadvantage, so rallies tend to end sooner.

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

3. **Accept the asymmetry**: Just group by raw rank. 1st place (any court) goes to top group, 2nd place to next group, etc. 4th places from 4-player courts fill the bottom.
   - **Verdict**: Imperfect but practical. Players understand "I finished 1st on my court."

### Timing Impact

- **None**. 3-player courts take the same time as 4-player courts (3 matches).

### Mixed Court Redistribution Strategies

When mixing 3-player and 4-player courts, the redistribution after each round must handle two different court sizes. There are two main strategies:

**Strategy 1: Stay Mixed (Persistent Mixed Courts)**
- After Round 1, redistribute using the vertical seeding cascade, treating all finishers equally regardless of court size.
- Group all 1st places (from both 3p and 4p courts) together, all 2nd places together, etc.
- The total number of finishers per rank equals the total number of courts. For example, 9 players = 1x4p + 1x3p = 2 courts → 2 firsts, 2 seconds, 2 thirds, 1 fourth.
- Vertical seeding fills courts to 4 players: C1 gets 2 firsts + 2 seconds, C2 gets 2 thirds + 1 fourth + 1 best second (but wait, seconds are already used...).
- Actually, with only 9 players and vertical seeding to 4-player courts, we need 2 courts of 4 = 8 spots, plus 1 sit-out. Or we keep 1x4p + 1x3p.
- **Verdict**: Complex. The court configuration may change each round depending on how the cascade falls. Better to pick a fixed configuration and stick with it.

**Strategy 2: Fixed Mixed Configuration (Recommended)**
- Decide the court split at tournament start and keep it for all rounds.
- Example: 11 players = 2x4p + 1x3p. This stays 2x4p + 1x3p for every round.
- Redistribution happens WITHIN each court size group:
  - 4-player courts: standard vertical seeding among the 4-player finishers.
  - 3-player courts: vertical seeding among the 3-player finishers.
- But this creates separate ladders for 4p and 3p courts. A player on a 3p court can never move to a 4p court.
- **Verdict**: Simple to implement. Players stay in their court-size category for the whole tournament.

**Strategy 3: Migrate Toward 4-Player Courts**
- After Round 1, redistribute as many players as possible to 4-player courts. The remainder (0-3 players) become sit-outs or stay on 3p courts.
- Example: 11 players = 2x4p + 1x3p after Round 1.
  - Redistribute: 2 courts of 4p = 8 players. Remaining 3 players = 1x3p court. Same configuration.
- Example: 13 players = 2x4p + 1x3p after Round 1.
  - Redistribute: 3 courts of 4p = 12 players. Remaining 1 player = sit-out.
- **Verdict**: Variable configuration per round. Adds complexity but maximizes 4-player playtime.

**Round 2+ Ladder for Mixed Courts**

If using Strategy 2 (fixed mixed configuration), the ladder works within each court-size group:
- 4-player courts: standard 2-up/2-down ladder between adjacent 4p courts.
- 3-player courts: adapted ladder — 1st moves up (or stays if top), 2nd stays, 3rd moves down (or stays if bottom).

If using Strategy 1 or 3, the ladder is only applied to the 4-player court group. The 3-player courts either have their own ladder or are treated as a separate tier.

### Competitive Integrity

- **Medium**. The 3-player format is inherently different (2v1). Some players may perceive it as easier or harder. Rank comparison across court sizes is imperfect. Strategy 2 (fixed mixed) is the most defensible because it treats each court size as its own tier.

---

## Option C: Rotating Sit-Outs

For any non-multiple-of-4 count, have some players sit out each round.

### How It Works

- 31 players with 8 courts of 4: 1 player sits out each round.
- 30 players with 8 courts of 4: 2 players sit out each round.
- 15 players with 4 courts of 4: 1 player sits out each round.
- 9 players with 2 courts of 4: 1 player sits out each round.
- The sit-outs rotate fairly (everyone sits out the same number of times over the tournament).

### Points for Sit-Outs

**Important**: Points are per-round only. They do NOT carry over between rounds. A player's total standings are the sum of points across all rounds, but each round's points are independent. A sit-out in Round 1 means 0 points for Round 1 only.

**Option 1: Zero points for the round**
- Simple. Sitting out = 0 points that round.
- This only affects the player's position in the current round's standings. It does not affect their ability to compete in subsequent rounds.
- The player will be seeded to a lower court in Round 2 based on having fewer Round 1 points. This is the natural consequence of not playing.

**Option 2: Average points for the round**
- Sitting player gets the average points of all players who played that round.
- Problem: Artificial. A player could sit out and get more points than if they had played poorly.
- Not recommended.

### Timing Impact

- **None**. Standard courts, standard timing.

### Competitive Integrity

- **Low to Medium**. Players paid to play; sitting out feels unfair. However, since points don't carry over between rounds, the only distortion is in Round 1 to 2 seeding — a sitter starts Round 2 on a lower court. From Round 2 onward, they compete normally.

---

## Option D: 5/6-Player Court (Parallel Games)

For 5 or 6 players on one court: run parallel 2v2 games with rotating players.

### How It Works

**5 players (A, B, C, D, E):**
- The court hosts 2 parallel 2v2 games simultaneously (splitting the full court into two halves).
- At any time, 4 players are actively playing and 1 player waits on the sideline.
- 3 players have fixed positions (e.g., A, B, C). The 4th active spot is shared by D and E, who rotate in/out.
- **4 games per round** (not 3). Each game played to **15 points** (not 21).
- The reduced point target compensates for the extra game, keeping total round duration similar.

**6 players (A, B, C, D, E, F):**
- The court hosts 2 parallel 2v2 games simultaneously.
- At any time, 4 players are actively playing and 2 players wait.
- 2 players are fixed (e.g., A, B). The opposing side rotates between pairs (C+D) and (E+F).
- **4 games per round**, each to **15 points**.
- Over the 4 games, everyone plays equal time.

**Scoring**: Each player gets points equal to their team's score in the games they participated in.

### Timing Impact

- **Same as standard** (~45-60 min).
- 4 games × 15 points ≈ 3 games × 21 points in duration.
- The parallel format means 2 games run at once, but the total ball-in-play time is calibrated to match standard courts.

### Competitive Integrity

- **Medium-High**. Everyone plays equal time. Timing matches standard courts. The only asymmetry is that 5/6-player courts use 15-point games instead of 21, but this is applied uniformly.
- **Ranking**: Players are ranked 1st through 5th (or 6th) on their court by total points, then diff, then playerId — same formula as 4-player courts.

---

## Option E: Single Cut to Top 16 (Preseed Only)

For preseed with non-power-of-2 court counts above 16: play Round 1 with all players on courts, then cut everyone beyond the top 16. The top 16 continue with standard preseed. The eliminated players continue on lower courts to determine their final placement (17th, 18th, etc.).

### How It Works

**Cut rule**: After Round 1, sort all players by court finish rank, then total points, then point diff, then playerId. The top 16 advance to the championship. Players ranked 17+ are "cut" from title contention but continue playing.

**Important**: "Cut" does NOT mean stop playing. Cut players continue on lower courts to determine their final placement. Everyone still plays every round.

**Examples**:

**20 players (5 courts)**:
- Round 1: 5 courts (20 players). Play standard 3 matches per court.
- After Round 1: Cut bottom 4 players (ranked 17-20). They move to consolation courts.
- Round 2-4: Top 16 run standard 16-player preseed (3 rounds). Cut players play on 1 consolation court to determine places 17-20.
- **Total rounds**: 4 (same as 16p preseed + 1 extra round).

**24 players (6 courts)**:
- Round 1: 6 courts (24 players).
- After Round 1: Cut bottom 8 players (ranked 17-24). They move to consolation courts.
- Round 2-4: Top 16 run standard 16-player preseed (3 rounds). Cut players play on 2 consolation courts to determine places 17-24.
- **Total rounds**: 4.

**28 players (7 courts)**:
- Round 1: 7 courts (28 players).
- After Round 1: Cut bottom 12 players (ranked 17-28). They move to consolation courts.
- Round 2-4: Top 16 run standard 16-player preseed (3 rounds). Cut players play on 3 consolation courts to determine places 17-28.
- **Total rounds**: 4.

**12 players (3 courts)**:
- Round 1: 3 courts (12 players).
- After Round 1: Cut bottom 4 players (ranked 9-12).
- Round 2: Top 8 run standard 8-player preseed (2 courts: Winner + Loser).
- Round 3: Final placement. Winner Court = places 1-4, Loser Court = places 5-8. Cut players on 1 consolation court for places 9-12.
- **Total rounds**: 3.

### Timing Impact

- **Same per round** (~45-60 min).
- 12p: 3 rounds.
- 20p: 4 rounds (1 more than standard 16p preseed).
- 24p: 4 rounds (same as 20p — cut after R1, then standard 16p preseed).
- 28p: 4 rounds (same as 20p/24p).

### Competitive Integrity

- **High** for top 16. Every Round 1 match matters — players fight to avoid the cut.
- **High** for cut players too. They continue playing on consolation courts to determine their final placement. Everyone plays every round.
- **Fairness**: Cut is by court rank first, then points/diff/id within rank. A 4th-place finisher on a strong court might outscore a 3rd-place finisher on a weak court, but court rank reflects relative performance. This is defensible.

### Comparison with Random Seed

| Players | Random Seed (Rounds) | Preseed + Cut (Rounds) |
|---------|---------------------|------------------------|
| 12      | 2-5 (configurable)  | 3 (fixed)              |
| 20      | 2-5 (configurable)  | 4 (fixed)              |
| 24      | 2-5 (configurable)  | 4 (fixed)              |
| 28      | 2-5 (configurable)  | 4 (fixed)              |

---

## Timing Comparison Summary

| Approach | Round Time | Setup Complexity | Player Satisfaction |
|----------|-----------|------------------|---------------------|
| Adjust court count (8/12/20/24/28) | ~45-60 min | Low | High |
| Mixed 4p + 3p courts | ~45-60 min | Medium | Medium-High |
| Rotating sit-outs | ~45-60 min | Low | Low-Medium |
| 5p parallel games (3 games) | ~45-60 min | High | Medium |

---

## Recommendations by Player Count

### Preseed Format

Preseed requires repeated binary splitting, which only works when the court count is a power of 2.

| Players | Courts | Preseed Offered? | Recommendation |
|---------|--------|------------------|----------------|
| 8       | 2      | Yes              | Standard 2-round mini-tournament |
| 9-15    | —      | No               | Below 16, use Random Seed only |
| 16      | 4      | Yes              | Standard (already implemented) |
| 17-19   | —      | No               | Use Random Seed only |
| 20      | 5      | Yes (cut)        | 4 rounds: cut to top 16 after R1, then standard 16p preseed |
| 21-23   | —      | No               | Use Random Seed only |
| 24      | 6      | Yes (cut)        | 4 rounds: cut to top 16 after R1, then standard 16p preseed |
| 25-27   | —      | No               | Use Random Seed only |
| 28      | 7      | Yes (cut)        | 4 rounds: cut to top 16 after R1, then standard 16p preseed |
| 29-31   | —      | No               | Use Random Seed only |
| 32      | 8      | Yes              | Standard (already implemented) |

**Key insight**: Preseed works cleanly for 8, 16, and 32 players only (power-of-2 court counts). For non-power-of-2 counts above 16, Option E (single cut to top 16 after Round 1) makes preseed work with only 1 extra round.

### Random Seed Format

Random seed is flexible because vertical seeding and the ladder system work for any court count.

| Players | Courts | Recommendation |
|---------|--------|----------------|
| 8       | 2      | Clean — 2-court ladder |
| 9       | 2+3p   | Mixed: 1x4p + 1x3p |
| 10      | 2+3p   | Mixed: 1x4p + 2x3p OR drop to 8 |
| 11      | 2+3p   | Mixed: 2x4p + 1x3p |
| 12      | 3      | Clean — 3-court ladder |
| 13      | 3+3p   | Mixed: 2x4p + 1x3p |
| 14      | 3+3p   | Mixed: 2x4p + 2x3p OR drop to 12 |
| 15      | 3+3p   | Mixed: 3x4p + 1x3p |
| 16      | 4      | Standard |
| 17-19   | 4+3p   | Mixed on 4-5 courts OR sit-outs |
| 20      | 5      | Clean — 5-court ladder |
| 21-23   | 5+3p   | Mixed on 5-6 courts OR sit-outs |
| 24      | 6      | Clean — 6-court ladder (RECOMMENDED) |
| 25-27   | 6+3p   | Mixed on 6-7 courts OR sit-outs |
| 28      | 7      | Clean — 7-court ladder |
| 29-31   | 7+3p   | Mixed on 7-8 courts OR sit-outs |
| 32      | 8      | Standard |

---

## The 8-Player Mini Tournament

**8 players (2 courts) is surprisingly viable.**

- **Random Seed**: 2 courts, ladder redistribution.
  - Round 1 to 2: C1 gets 2 firsts + 2 seconds. C2 gets 2 thirds + 2 fourths. Clean.
  - Round 2+: C1 keeps top 2 + gets top 2 from C2. C2 gets bottom 2 from C1 + keeps bottom 2.
  - Configurable rounds (2-5).
- **Preseed**: 2 rounds fixed.
  - Round 1 to 2: Winner Court 1 (1st-2nd from both = 4 players), Loser Court 2 (3rd-4th from both = 4 players).
  - Round 2: Final placement. C1 = places 1-4, C2 = places 5-8.
- **Timing**: Same as standard (~45-60 min per round).
- **Competitive integrity**: High. Clean redistribution, no edge cases.

---

## The 12-Player Option

**12 players (3 courts) is clean for Random Seed.**

- **Random Seed**: 3 courts, ladder redistribution.
  - Round 1 to 2: Vertical seeding cascades cleanly:
    - C1: 3 firsts + 1 best second
    - C2: 2 seconds + 2 best thirds
    - C3: 1 third + 3 fourths
  - Round 2+: Ladder with 2 up / 2 down between adjacent courts.
  - Configurable rounds (2-5).
- **Preseed**: Not available. 3 courts is not a power of 2. Binary split is impossible.
- **Timing**: Same as standard.
- **Competitive integrity**: High for Random Seed.

---

## The 24-Player Sweet Spot

**24 players (6 courts) is the most important non-standard count to support.**

Why:
1. It is a realistic turnout (between 16 and 32).
2. It is a clean multiple of 4 — no sit-outs, no mixed courts.
3. Random seed ladder works perfectly.
4. Preseed works via single cut: play Round 1 on 6 courts, cut to top 16, then standard 16p preseed (4 rounds total).

**Implementation for 24 players:**
- Random Seed: Extend ladder logic to 6 courts. Vertical seeding cascades cleanly (see examples above).
- Preseed: 6 courts Round 1, cut to top 16 after Round 1, then standard 16p preseed for Rounds 2-4.

---

## The 9-15 Player Problem

These are the most constrained because:
- Only 2-3 courts available (small venue).
- Preseed is not available (not power-of-2 court counts).
- Mixed courts create redistribution complexity.

**Best approach for 9-11 (2 courts base):**
- 9 = 1x4p + 1x3p. After Round 1: redistribute to 2x4p + 1 sits out. Or stay mixed.
- 10 = 1x4p + 2x3p. After Round 1: redistribute to 2x4p + 2 sit out. Or stay mixed.
- 11 = 2x4p + 1x3p. After Round 1: redistribute to 3x4p — but only 11 players. One court will have 3 players again.

**Best approach for 13-15 (3 courts base):**
- 13 = 2x4p + 1x3p. After Round 1: 3x4p + 1 sits out. Or stay mixed.
- 14 = 2x4p + 2x3p. After Round 1: 3x4p + 2 sit out. Or stay mixed.
- 15 = 3x4p + 1x3p. After Round 1: 4x4p — but only 15 players. One court gets 3 again.

**Key realization**: With mixed courts, the remainder follows you across rounds. You either accept permanent mixed courts, or you use rotating sit-outs to fill 4-player courts.

**Practical recommendation for 9-15:**
1. **Mixed courts for the whole tournament** — everyone plays every round, no sit-outs. Accept the redistribution asymmetry.
2. **Reduce to nearest clean multiple** (8 or 12) — draw lots or use seed points to select. Remaining players become alternates.
3. **Rotating sit-outs** — fill 4-player courts, rotate who sits. Simple but frustrating.

---

## Practical Decision Tree

```
How many players registered?
│
├─ < 8 -> CANCEL TOURNAMENT
│
├─ 8 -> Standard 2-court tournament (Random or Preseed)
│
├─ 9-11 -> Option 1: Mixed 4p + 3p courts
│         -> Option 2: Drop to 8 (draw lots)
│         -> Option 3: Rotating sit-outs on 2-3 courts
│
├─ 12 -> Standard 3-court tournament (Random Seed only)
│
├─ 13-15 -> Option 1: Mixed 4p + 3p courts
│        -> Option 2: Drop to 12 (draw lots)
│        -> Option 3: Rotating sit-outs on 3-4 courts
│
├─ 16 -> Standard 4-court tournament
│
├─ 17-19 -> Option 1: Mixed 4p + 3p on 4-5 courts
│        -> Option 2: Rotating sit-outs on 4 courts
│        -> Option 3: Drop to 16 (draw lots)
│
├─ 20 -> Random Seed: 5-court ladder
│     -> Preseed: 5 courts R1, cut to 16, then standard 16p preseed (4 rounds total)
│
├─ 21-23 -> Option 1: Mixed 4p + 3p on 5-6 courts
│        -> Option 2: Rotating sit-outs on 5-6 courts
│        -> Option 3: Drop to 20 (if supported) or 16
│
├─ 24 -> Random Seed: 6-court ladder (RECOMMENDED)
│     -> Preseed: 6 courts R1, cut to 16, then standard 16p preseed (4 rounds total)
│
├─ 25-27 -> Option 1: Mixed 4p + 3p on 6-7 courts
│        -> Option 2: Rotating sit-outs on 6 courts
│        -> Option 3: Drop to 24
│
├─ 28 -> Random Seed: 7-court ladder
│     -> Preseed: 7 courts R1, cut to 16, then standard 16p preseed (4 rounds total)
│
├─ 29-31 -> Option 1: Mixed 4p + 3p on 7-8 courts
│        -> Option 2: Rotating sit-outs on 7-8 courts
│        -> Option 3: Find substitutes to reach 32
│        -> Option 4: Drop to 28 (if supported) or 24
│
└─ 32 -> Standard 8-court tournament
```

---

## Unit Testing Strategy

All redistribution, seeding, and tiebreaking logic must be unit-tested with Vitest before touching the UI. Table-driven tests covering edge cases are the right approach.

### Test Architecture

Pure functions in `src/lib/server/tournament-logic.ts` should handle all redistribution. Each function takes `CourtResult[]` + config and returns `CourtAssignment[]`. No DB, no Svelte, no HTTP — just data transformations.

### Table: Vertical Seeding (Random Seed, Round 1 to 2)

For each court count N, given N courts with known standings, verify the cascade produces the correct court assignments.

| Test Name | Courts | Input Standings | Expected C1 | Expected C2 | Expected C3 | Expected C4 | Expected C5 | Expected C6 | Expected C7 |
|-----------|--------|-----------------|-------------|-------------|-------------|-------------|-------------|-------------|-------------|
| `vertical-2courts` | 2 | C1: [P1, P2, P3, P4], C2: [P5, P6, P7, P8] | P1, P2, P5, P6 | P3, P4, P7, P8 | — | — | — | — | — |
| `vertical-3courts` | 3 | C1: [P1, P2, P3, P4], C2: [P5, P6, P7, P8], C3: [P9, P10, P11, P12] | P1, P2, P3, P5 | P4, P6, P7, P9 | P8, P10, P11, P12 | — | — | — | — |
| `vertical-5courts` | 5 | 5 courts with distinct player IDs | First 4 firsts | 1st + 3 best 2nds | 2nds + 2 best 3rds | 3rds + 1 best 4th | 4 fourths | — | — |
| `vertical-6courts` | 6 | 6 courts with distinct player IDs | First 4 firsts | 2 firsts + 2 best 2nds | 4 remaining 2nds | 4 thirds | 2 thirds + 2 best 4ths | 4 remaining 4ths | — |
| `vertical-7courts` | 7 | 7 courts with distinct player IDs | First 4 firsts | 3 firsts + 1 best 2nd | 4 best 2nds | 2 2nds + 2 best 3rds | 4 best 3rds | 1 3rd + 3 best 4ths | 4 remaining 4ths |

**Tiebreaker tests within vertical seeding**:

| Test Name | Description |
|-----------|-------------|
| `vertical-tiebreaker-points` | Two second-place finishers with different points — higher points gets promoted to higher court |
| `vertical-tiebreaker-diff` | Two second-place finishers with same points but different diff — higher diff gets promoted |
| `vertical-tiebreaker-playerid` | Two second-place finishers with same points and diff — lower playerId wins (deterministic) |

### Table: Ladder Redistribution (Random Seed, Round 2+)

For each court count N, verify the 2-up/2-down ladder works for top, middle, and bottom courts.

| Test Name | Courts | Focus | Assertion |
|-----------|--------|-------|-----------|
| `ladder-2courts-top` | 2 | C1 | Keeps top 2 + gets top 2 from C2 |
| `ladder-2courts-bottom` | 2 | C2 | Keeps bottom 2 + gets bottom 2 from C1 |
| `ladder-3courts-top` | 3 | C1 | Keeps top 2 + gets top 2 from C2 |
| `ladder-3courts-middle` | 3 | C2 | Gets bottom 2 from C1 + top 2 from C3 |
| `ladder-3courts-bottom` | 3 | C3 | Keeps bottom 2 + gets bottom 2 from C2 |
| `ladder-5courts-middle` | 5 | C3 | Gets bottom 2 from C2 + top 2 from C4 |
| `ladder-7courts-bottom` | 7 | C7 | Keeps bottom 2 + gets bottom 2 from C6 |

### Table: Preseed Binary Splits

For power-of-2 court counts, verify the winner/loser split at each round transition.

| Test Name | Courts | Round | Split | Verification |
|-----------|--------|-------|-------|--------------|
| `preseed-2courts-r1` | 2 | 1 to 2 | Winner: 1st-2nd (4p), Loser: 3rd-4th (4p) | All 1st-2nd on C1, all 3rd-4th on C2 |
| `preseed-4courts-r1` | 4 | 1 to 2 | Winner: C1-C2 (1st-2nd), Loser: C3-C4 (3rd-4th) | C1: 4 best 1sts, C2: 2 remaining 1sts + 2 best 2nds, C3: 4 remaining 2nds, C4: 4 3rds + 4 4ths... wait |

Actually, for 4-court preseed Round 1 to 2:
- Winner Courts (C1-C2): all 1st places (4) + all 2nd places (4) = 8 players
  - C1: 4 best 1st places
  - C2: 4 remaining 2nd places? No, 4 firsts all go to C1. Then 4 seconds go to C2.
- Loser Courts (C3-C4): all 3rd places (4) + all 4th places (4) = 8 players
  - C3: 4 third places
  - C4: 4 fourth places

For 8-court preseed Round 1 to 2:
- Winner Courts (C1-C4): all 1st (8) + all 2nd (8) = 16 players
  - C1: 4 best 1sts
  - C2: 4 remaining 1sts
  - C3: 4 best 2nds
  - C4: 4 remaining 2nds
- Loser Courts (C5-C8): all 3rd (8) + all 4th (8) = 16 players
  - C5: 4 best 3rds
  - C6: 4 remaining 3rds
  - C7: 4 best 4ths
  - C8: 4 remaining 4ths

| Test Name | Courts | Round | Verification |
|-----------|--------|-------|--------------|
| `preseed-2courts-r1-split` | 2 | 1 to 2 | C1 has all 1st-2nd (4p), C2 has all 3rd-4th (4p) |
| `preseed-4courts-r1-split` | 4 | 1 to 2 | Winner C1: 4 1sts; Winner C2: 4 2nds; Loser C3: 4 3rds; Loser C4: 4 4ths |
| `preseed-4courts-r2-split` | 4 | 2 to 3 | C1: 1st-2nd from old C1+C2 (places 1-4); C2: 3rd-4th from old C1+C2 (places 5-8); C3: 1st-2nd from old C3+C4 (places 9-12); C4: 3rd-4th from old C3+C4 (places 13-16) |
| `preseed-8courts-r1-split` | 8 | 1 to 2 | Winner C1-C2: 8 1sts split by points; Winner C3-C4: 8 2nds split by points; Loser C5-C6: 8 3rds split by points; Loser C7-C8: 8 4ths split by points |
| `preseed-8courts-r2-split` | 8 | 2 to 3 | Within Winner group (C1-C4): 1sts from C1-C2 to C1, 2nds to C2, 1sts from C3-C4 to C3, 2nds to C4. Within Loser group (C5-C8): 1sts from C5-C6 to C5, 2nds to C6, 1sts from C7-C8 to C7, 2nds to C8 |
| `preseed-8courts-r3-split` | 8 | 3 to 4 | C1: places 1-4; C2: places 5-8; C3: places 9-12; C4: places 13-16; C5: places 17-20; C6: places 21-24; C7: places 25-28; C8: places 29-32 |

### Table: Single Cut to Top 16

For non-power-of-2 court counts above 16, verify that after Round 1, exactly the top 16 players advance and the rest are assigned to consolation courts.

| Test Name | Start Players | Start Courts | Cut After R1 | Top 16 Format | Consolation Courts | Total Rounds |
|-----------|---------------|--------------|--------------|---------------|-------------------|--------------|
| `cut-20p` | 20 | 5 | Bottom 4 (rank 17-20) | Standard 16p preseed (R2-R4) | 1 court (places 17-20) | 4 |
| `cut-24p` | 24 | 6 | Bottom 8 (rank 17-24) | Standard 16p preseed (R2-R4) | 2 courts (places 17-24) | 4 |
| `cut-28p` | 28 | 7 | Bottom 12 (rank 17-28) | Standard 16p preseed (R2-R4) | 3 courts (places 17-28) | 4 |
| `cut-12p` | 12 | 3 | Bottom 4 (rank 9-12) | Standard 8p preseed (R2-R3) | 1 court (places 9-12) | 3 |

**Cut boundary tests**:

| Test Name | Description |
|-----------|-------------|
| `cut-4th-vs-3rd` | A 4th-place finisher with high points vs a 3rd-place finisher with low points — 3rd place always advances over 4th place regardless of points |
| `cut-tiebreaker-points` | Two 3rd-place finishers tied on rank competing for last advancement spot — higher points advances |
| `cut-tiebreaker-diff` | Two 3rd-place finishers tied on rank and points — higher diff advances |
| `cut-tiebreaker-id` | Two 3rd-place finishers tied on rank, points, diff — lower playerId advances (deterministic) |
| `cut-consolation-continues` | Cut players still get court assignments in Round 2+ and play full matches — they are NOT idle |

### Table: Mixed Court Sizes (3p + 4p)

| Test Name | 4p Courts | 3p Courts | Total Players | Test Focus |
|-----------|-----------|-----------|---------------|------------|
| `mixed-9p` | 1 | 1 | 9 | Redistribution: 2 firsts (one from each court size) + best 2 third places? Actually need to think about this more carefully. |

Actually, mixed court redistribution is complex. Let me define the tests more carefully:

For mixed courts, the redistribution groups are formed by collecting all finishers of the same rank across ALL courts (both 3p and 4p), then distributing them using the vertical seeding cascade. The difference is that 3p courts produce 3 finishers (1st, 2nd, 3rd) while 4p courts produce 4 finishers (1st, 2nd, 3rd, 4th).

For example, 9 players = 1x4p + 1x3p = 2 courts:
- After Round 1: 2 firsts, 2 seconds, 2 thirds, 1 fourth (from 4p court only)
- Vertical seeding to 2 courts of 4... but we only have 9 players, not 8. We'd need to add a sit-out or accept 1 court of 5.

Actually, with mixed courts, the total player count determines the next round's court configuration. If we start with 9 and stay mixed:
- After Round 1: still 9 players. Could be 1x4p + 1x3p again, or 2x4p + 1 sit-out.

This is getting complicated. Let me focus the tests on the simpler cases first and leave mixed courts for Phase 3.

### Table: Standings Calculation + Tiebreaking

These tests verify `calculateCourtStandings()` works correctly for all edge cases.

| Test Name | Players | Matches | Scenario | Expected Rank 1 | Expected Rank 4 |
|-----------|---------|---------|----------|-----------------|-----------------|
| `standings-basic` | 4 | 3 | All scores entered, clear winner | Highest total points | Lowest total points |
| `standings-tie-points` | 4 | 3 | Two players same points, different diff | Higher diff wins | — |
| `standings-tie-points-diff` | 4 | 3 | Two players same points AND same diff | Lower playerId wins | — |
| `standings-all-tied` | 4 | 3 | All 4 players same points and diff | Sorted by playerId ascending | — |
| `standings-missing-scores` | 4 | 2 | Only 2 of 3 matches have scores | Unscored match contributes 0 to all stats | — |
| `standings-3player` | 3 | 3 | 3-player court (A+B vs C, etc.) | Highest total points | Lowest total points |

---

## Implementation Priority

### Phase 1: Support 8 and 24 Players

**Why first**: Cleanest non-standard counts. No sit-outs, no mixed courts, no timing issues.

- **8 players (2 courts)**:
  - Random Seed: Ladder works perfectly. Vertical seeding is clean (2 firsts + 2 seconds on C1, 2 thirds + 2 fourths on C2).
  - Preseed: 2 rounds fixed. Binary split works cleanly.
  - UI: Show 2 court cards.

- **24 players (6 courts)**:
  - Random Seed: Extend ladder logic to 6 courts. Vertical seeding cascades cleanly.
  - Preseed: Not available. 6 courts is not a power of 2.
  - UI: Show 6 court cards.

### Phase 2: Support 12, 20, and 28 Players

**Why second**: Still clean multiples of 4. Preseed available via single cut for 20p and 28p.

- **12 players (3 courts)**: Random Seed only. Preseed not available (below 16).
- **20 players (5 courts)**: Random Seed ladder. Preseed via cut: 5 courts R1, cut to 16, then standard preseed.
- **28 players (7 courts)**: Random Seed ladder. Preseed via cut: 7 courts R1, cut to 16, then standard preseed.

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

1. Should the system auto-suggest the best configuration when the user enters a player count? Or should the user manually choose?
2. For preseed with odd court counts, is rank mixing acceptable? Or should we restrict preseed to power-of-2 court counts only (2, 4, 8)?
3. For 3-player courts, should the single player serve from the same position? Any rule modifications?
4. Should sit-out players get points? If so, how many?
5. Can we recruit ghost players (organizers, volunteers) to fill spots and reach a multiple of 4?
