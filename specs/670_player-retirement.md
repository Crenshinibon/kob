# Player Retirement During Tournament

## Implementation Status

**Between-rounds retirement**: ✅ IMPLEMENTED — Org can retire players between rounds via `retirePlayer` server action. Court configuration recalculates, redistribution applies.

**Mid-round injury handling**: ⚠️ PARTIALLY IMPLEMENTED — `reportInjury` action exists for marking matches as canceled with `isCanceled` flag. Options A (substitute), B (cancel & average), C (solo play) are spec'd but only Option B (cancel & average) is implemented in the scoring logic. No UI for selecting between the three options.

**Final round elimination**: ✅ IMPLEMENTED — Top court must have exactly 4 players. Extra players eliminated.

## Problem

Players bail out mid-tournament for various reasons:

- Injury
- Schedule conflict
- Frustration with performance
- Personal reasons

The system must handle this gracefully without breaking the redistribution logic.

## Retirement Flow

### Org Action: Retire Player

After closing a round, the org can retire a player:

```
┌─────────────────────────────────────────────────────────┐
│ Round 2 Complete                                         │
│                                                          │
│ Retire a player:                                         │
│ [Dropdown: Select player ▼]                              │
│                                                          │
│ Selected: Player X (Court 3, 2nd place, 45 points)       │
│ Reason: [Injury ▼]                                       │
│                                                          │
│ After retirement: 23 players → 5×4p + 1×3p              │
│                                                          │
│ [Retire Player] [Cancel]                                 │
└─────────────────────────────────────────────────────────┘
```

### Retirement Reasons (Optional)

| Reason       | Notes                           |
| ------------ | ------------------------------- |
| Injury       | Player injured, cannot continue |
| Schedule     | Player has to leave             |
| Personal     | Player chooses to withdraw      |
| Disqualified | Rule violation                  |
| Other        | Free text                       |

Reason is optional — the system doesn't require it.

## Redistribution After Retirement

### Step 1: Recalculate Court Configuration

After removing a player, recalculate:

```
Before: 24 players → 6×4p = 6 courts
After removing 1: 23 players → 5×4p + 1×3p = 6 courts
After removing 2: 22 players → 4×4p + 2 leftover → 4×4p + 1×6p
```

**2-player courts are not valid.** If only 2 players remain, they join a 6-player court (with the 4 worst players from other courts). Minimum court size is 3 (2v1 format), but 6-player court is preferred for 2 remaining players.

So for 22 players:

- 4×4p = 16 players + 2 leftover → 1×6p court (2 leftover + 4 worst from other courts)
- Total: 4×4p + 1×6p = 5 courts

### Step 2: Apply Normal Redistribution

Use the standard redistribution logic (ladder or preseed) with the new player count:

```
23 players, round 2 complete
→ Redistribute using vertical seeding / ladder
→ 5 full courts + 1 court with 3 players (bottom court)
→ Bottom court gets the 3 lowest-ranked players
```

**Key rule**: The incomplete court is always the BOTTOM court (lowest ranked players). This is consistent with the one non-standard bottom court approach.

### Step 3: Continue Tournament

The tournament continues with the new court configuration. Remaining rounds still use the same redistribution logic.

## Edge Cases

### Multiple Retirements in One Round

If 2+ players retire at once, apply the same logic:

- 24 → 22 players: 4×4p + 2 leftover → 4×4p + 1×6p
- 24 → 21 players: 5×4p + 1 leftover → 5×4p + 1×5p
- 24 → 20 players: 5×4p (clean)

### Retirement Drops Below 8 Players

If retirements drop below 8 players mid-tournament, the tournament can still continue. The minimum is flexible — as long as there's at least 1 court (3+ players), the tournament continues. If only 4 players remain, they play on 1 court. If 3 remain, they play on a 3-player court. If 2 remain, they join a 6-player court (with the 4 worst players from other courts).

The 8-player minimum only applies at tournament start. Once running, the tournament adapts to however many players remain.

### Retirement in Final Round

**Special rule**: If a player retires during the final round (scores already entered), their scores are kept for redistribution purposes but they don't play further rounds.

If the retirement happens between rounds (before final round starts), normal redistribution applies.

### Retired Player's Scores

- **Completed rounds**: Scores are preserved in history.
- **Current round**: If a round is in progress when the retirement/injury occurs, the organizer can handle the remaining matches of that player's court using one of three options (see [Mid-Round Injury Handling](#mid-round-injury-handling) below).
- **Final standing**: Calculated using the bracket/relegation logic described below.

### Replacements

- Replacements are only allowed before the tournament starts. Once the tournament is active, no mid-tournament replacements. Retired players are out for the rest of the tournament (though temporary substitutes may be used for physical play).

## Mid-Round Injury Handling

When a player gets hurt during an active round, the organizer cannot change the court's configuration (e.g., converting a 4-player court to a 3-player court) because games have already been played, and converting formats mid-round makes scoring and standings mathematically inconsistent and unfair.

Instead, the remaining unplayed matches for that court must be handled in one of the following three ways.

### Option A: Physical Play with a Neutral Substitute (Recommended)

- **Concept**: A temporary substitute player (not part of the court's standings) replaces the injured player for the remaining matches/sets of the current round.
- **Sourcing the Substitute**:
  1. A player from another court that has already finished their matches.
  2. A player who is on a bye (resting) in the current shift.
  3. An external volunteer, spectator, or the organizer themselves.
- **Scoring Rules**:
  1. The substitute player plays in the matches, but their individual standing points are **not tracked** (they do not receive points, and their name is not added to the tournament standings).
  2. The healthy partner who plays _with_ the substitute receives the **actual points scored** by their team in the match.
  3. The opponents receive their **actual points scored** in the match.
  4. The injured player receives **0 points** (forfeit) for the matches they missed.
- **Database Implementation**: The match is entered normally with the injured player's ID in the slot. Since the substitute is temporary and doesn't get points, keeping the injured player's ID in the match record allows the partner's points to be computed naturally.
- **Pros**: Standard 2v2 gameplay is preserved. No mathematical skewing. Partners can still play and earn points. Opponents don't get free 21-0 wins that distort tournament-wide standings.

### Option B: Cancel & Average (Mathematical Solution)

- **Concept**: If a physical substitute cannot be found, the remaining matches involving the injured player are **canceled**.
- **Scoring Rules**:
  1. The injured player receives **0 points** for the canceled matches.
  2. The healthy players on the court are ranked by their **average points per match** and **average point differential per match** for the current round, rather than total points.
  3. _Example_:
     - Match 1: P1 + P2 vs P3 + P4 (completed: 21 - 18)
     - P4 is injured. Match 2 (P1+P3 vs P2+P4) and Match 3 (P1+P4 vs P2+P3) are canceled.
     - P1 and P2 only played 1 match. Their average points = 21.0. Their average diff = +3.0.
     - P3 only played 1 match. Their average points = 18.0. Their average diff = -3.0.
     - P4 gets 0 points.
     - Court Standings for the round: P1 & P2 (1st place, 21.0 avg pts) > P3 (3rd place, 18.0 avg pts) > P4 (4th place, 0 avg pts).
- **Database Implementation**:
  1. Add an `isCanceled` column (boolean, default false) to the match tables: `match`, `match_3_player`, `match_5_player`, and `match_6_player`.
  2. Canceled matches are marked `is_canceled = true` and their scores are left as `null`.
  3. When calculating standings for a court, if any match has `is_canceled = true`, the system automatically ranks players on that court by average points per completed match and average point differential per completed match, instead of total points.
- **Non-Standard Courts (5p/6p)**: Since 5-player and 6-player courts already use average points per game to rank players (due to uneven match distributions), Option B is trivial: the system simply cancels games involving the injured player, and ranks the remaining players by their averages over the games they completed.
- **Pros**: Does not require a physical substitute. Fairly handles the situation without forcing arbitrary 0-21 forfeits that penalize the healthy partner and boost opponents.

### Option C: Play Solo (2v1)

- **Concept**: The remaining matches are played as scheduled, but the team with the injured player plays as a 1-player team.
- **Rules**:
  1. The solo player gets 3 touches (using the 3-player court solo player rule).
  2. Matches are scored exactly as played.
- **Pros**: Keeps the games active without requiring a substitute.
- **Cons**: Extremely physically demanding and unfair for the solo player, who is almost guaranteed to lose by a large margin (hurting their standing points and point differential).

---

## UI Flow for Mid-Round Injury

### 1. Reporting an Injury

During an active round, the organizer sees a "Report Injury" button next to each court or next to each player name on the tournament dashboard/court view.

### 2. Selecting the Handling Option

Clicking "Report Injury" for a player opens a modal:

```
┌─────────────────────────────────────────────────────────┐
│ Report Injury: Player D (Court 2)                       │
│                                                          │
│ How would you like to handle the remaining matches?       │
│                                                          │
│ ( ) Use a Substitute (Recommended)                       │
│     Matches remain on the schedule. Play 2v2 with a      │
│     temporary substitute. Scores are entered normally.    │
│                                                          │
│ ( ) Cancel & Average                                     │
│     Cancel remaining matches for Player D. Court         │
│     standings will be calculated using average points.   │
│                                                          │
│ ( ) Play Solo (2v1)                                      │
│     Matches remain on the schedule. Player D's partner   │
│     plays solo (3 touches). Scores entered normally.     │
│                                                          │
│ [Confirm Injury] [Cancel]                                │
└─────────────────────────────────────────────────────────┘
```

### 3. Court View Updates

- **If Substitute or Play Solo is selected**: The court view displays Player D as "Injured" but the remaining matches remain active for score entry.
- **If Cancel & Average is selected**: The remaining matches involving Player D are marked as "Canceled" and disabled in the UI. The organizer only enters scores for any matches that did not involve Player D.

### 4. Closing the Round

When the organizer closes the round:

1. The injured player is marked as retired (`retiredAt` set to current timestamp, `retiredRound` set to current round).
2. The standings for the court are calculated. If Option B (Cancel & Average) was used, the standings are calculated using averages of completed matches.
3. For subsequent rounds, the retired player is excluded from court assignment generation, and the court configuration is recalculated for the remaining players (applying the standard retirement rules).

## Final Round Exception

### Problem

With player retirements, the final round might have 5 or 6 players. Running a 5/6-player court in the final round is unfair (parallel games, different scoring).

### Rule

**The top court in the final round must always have exactly 4 players.**

If 5 or 6 players remain for the final round:

- Top 4 players (by cumulative standing) play on Court 1
- Remaining 1-2 players are **eliminated** and receive the lowest final standing

### Examples

**5 players remaining, final round**:

```
Court 1: Players ranked 1-4 (play for places 1-4)
Eliminated: Player ranked 5 → Final standing: 5th place
```

**6 players remaining, final round**:

```
Court 1: Players ranked 1-4 (play for places 1-4)
Eliminated: Players ranked 5-6 → Final standing: 5th and 6th place
```

**7 players remaining, final round**:

```
Court 1: Players ranked 1-4 (play for places 1-4)
Court 2: Players ranked 5-7 → 3-player court (2v1 format, valid)
Final standing: Places 1-4 from Court 1, Places 5-7 from Court 2
```

**8 players remaining, final round**:

```
Court 1: Players ranked 1-4 (play for places 1-4)
Court 2: Players ranked 5-8 (play for places 5-8)
Normal final round
```

### Final Standing Calculation

For the final round:

- Players on Court 1: places 1-4 determined by court standings
- Eliminated players (5th/6th if 5/6 remaining): ranked by cumulative points, then diff, then ID
- Players on lower courts (if any): places determined by court position

### UI: Final Round with Elimination

```
┌─────────────────────────────────────────────────────────┐
│ Final Round — 5 players remaining                        │
│                                                          │
│ Court 1: Players 1-4 (playing for places 1-4)            │
│   Player A (120 pts)                                     │
│   Player B (115 pts)                                     │
│   Player C (108 pts)                                     │
│   Player D (102 pts)                                     │
│                                                          │
│ Eliminated:                                              │
│   Player E (89 pts) → Final standing: 5th place          │
│                                                          │
│ [Start Final Round]                                      │
└─────────────────────────────────────────────────────────┘
```

## Final Placement for Retired Players

### Preseed Format

A retired player gets the **worst place in their current bracket**. The bracket is determined by the recursive splitting.

**Bracket determination**: After each round, the recursive split divides courts into winner and loser groups. Each group has a range of possible final places.

**Example: 16-player preseed**

- Round 1: 4 courts play
- Round 2: Split → Winner courts (C1, C2 → places 1-8), Loser courts (C3, C4 → places 9-16)
- A player who finished 3rd in Round 1 goes to the loser bracket (places 9-16)
- If they retire: place 16 (worst in bracket)
- If a second player in the same bracket retires: place 15
- Order of retirement matters within the same bracket

**Example: 32-player preseed**

- Round 1: 8 courts play
- Round 2: Split → Winner courts (C1-C4 → places 1-16), Loser courts (C5-C8 → places 17-32)
- A player on Court 5 (loser bracket) retires: place 32
- A player on Court 1 (winner bracket) retires: place 16

**Example: 24-player preseed (recursive)**

- Round 1: 6 courts play
- Round 2: Split → Winner courts (C1-C4 → places 1-16), Loser courts (C5-C6 → places 17-24)
- A player on Court 5 retires: place 24
- A player on Court 1 retires: place 16

### Multiple Retirements (Preseed)

Within the same bracket, retirements are ordered. The first retiree gets the worst place, the second gets the second-worst, etc.

**Example**: Two players retire from the loser bracket (places 9-16) in a 16-player preseed.

- First retiree: place 16
- Second retiree: place 15

### Random Seed Format

A retired player gets the **worst place possible if they were relegated every remaining round**, capped at the total number of courts in the tournament.

**Example**: 24 players, random seed, 4 rounds, 6 courts. Player retires after Round 2 on Court 3.

- If relegated every round: Court 3 → Court 4 → Court 5 → Court 6 (max 6 courts)
- Court 6 determines places 21-24
- Retired player gets place 24 (worst possible)

**Example**: 16 players, random seed, 3 rounds, 4 courts. Player retires after Round 1 on Court 2.

- If relegated every round: Court 2 → Court 3 → Court 4 (max 4 courts)
- Court 4 determines places 13-16
- Retired player gets place 16 (worst possible)

**Example**: 32 players, random seed, 4 rounds, 8 courts. Player retires after Round 1 on Court 3.

- If relegated every round: Court 3 → Court 4 → Court 5 → Court 6 (capped at 8 courts, but only 3 remaining rounds)
- Court 6 determines places 21-24
- Retired player gets place 24

**Key rule**: `worstCourt = min(currentCourt + remainingRounds, totalCourts)`. A player cannot be relegated beyond the bottom court.

### Calculation

```
function calculateRetiredStanding(
  currentCourt: number,
  totalCourts: number,
  totalRounds: number,
  currentRound: number,
  format: 'preseed' | 'random-seed',
  bracketRange: { min: number, max: number },  // for preseed
  courtSizesByCourt: number[]  // array of court sizes indexed by court number (1-based)
): number {
  if (format === 'preseed') {
    // Worst place in current bracket
    return bracketRange.max;
  } else {
    // Worst place if relegated every remaining round, capped at totalCourts
    const remainingRounds = totalRounds - currentRound;
    const worstCourt = Math.min(currentCourt + remainingRounds, totalCourts);

    // The non-standard court is always the last court
    // Final standing = position on court + 4 * (courts before it)
    // For the last court: worst position = courtSize (3, 5, or 6)
    // But we use 4 * (worstCourt - 1) + worst position on that court
    const courtsBefore = worstCourt - 1;
    const destCourtSize = courtSizesByCourt[worstCourt - 1];  // 0-indexed array
    const worstPositionOnCourt = destCourtSize;  // worst position = last place on that court
    return courtsBefore * 4 + worstPositionOnCourt;
  }
}
```

**Non-standard court rule**: The non-standard court (3p/5p/6p) is always the last court. Final standing = position on the destination court + 4 × (number of courts before it). The destination court size (not the player's original court size) determines the worst possible position.

**Example**: 6 courts (5 standard + 1 non-standard 6p at bottom)

- Court 1: places 1-4
- Court 2: places 5-8
- Court 3: places 9-12
- Court 4: places 13-16
- Court 5: places 17-20
- Court 6 (6p): 1st → 21, 2nd → 22, ..., 6th → 26

### Multiple Retirements

**Preseed**: Within the same bracket, retirements are ordered. First retiree gets worst place, second gets second-worst, etc.

**Random seed**: Retirements are ordered by current court position. Player on the worse court gets the worse standing.

**Example (random seed)**: Players on Court 2 and Court 4 retire after Round 2 (24 players, 4 rounds, 6 courts).

- Court 2 player: worst place = 24 (Court 2 → Court 6 with full relegation)
- Court 4 player: worst place = 24... but two players can't share place 24.
- Resolution: Court 4 player gets 24 (worse court), Court 2 player gets 23.

## Database Changes

### Player Table

```typescript
// New columns:
retiredAt: timestamp('retired_at'); // null = active
retiredRound: integer('retired_round'); // which round they retired after
retirementReason: text('retirement_reason'); // optional
finalStanding: integer('final_standing'); // set when tournament completes
```

### Match Tables

Add an `isCanceled` column (boolean, not null, default false) to all match tables to support Option B (Cancel & Average):

```typescript
// match, match3Player, match5Player, match6Player all get:
isCanceled: boolean('is_canceled').notNull().default(false);
```

### Court Rotation

No changes needed. The existing court rotation system handles variable court sizes.

## Decisions (Previously Open Questions)

1. **Forfeited/Injured matches**: In-progress rounds can be handled via physical substitution, cancellation & averaging (using average points per completed match to calculate standings), or playing solo (2v1). Auto-forfeit 0-21 is only used as a fallback if no other option is selected.
2. **Replacement timing**: Only before the tournament starts. No mid-tournament replacements.
3. **Final round elimination**: The org should see which players are eliminated from the final round before it starts.
4. **Tiebreaker for elimination**: Compare by average points per round first (normalizes across court sizes), then total points, then diff, then playerId.
