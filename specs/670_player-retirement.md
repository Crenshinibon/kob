# Player Retirement During Tournament

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

| Reason | Notes |
|--------|-------|
| Injury | Player injured, cannot continue |
| Schedule | Player has to leave |
| Personal | Player chooses to withdraw |
| Disqualified | Rule violation |
| Other | Free text |

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

- **Completed rounds**: Scores are preserved in history
- **Current round**: If round is in progress, retired player's remaining matches are auto-forfeit 0-21
- **Final standing**: Calculated using the bracket/relegation logic described below

### Replacements

Replacements are only allowed before the tournament starts. Once the tournament is active, no mid-tournament replacements. Retired players are out for the rest of the tournament.

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
retiredAt: timestamp('retired_at')           // null = active
retiredRound: integer('retired_round')       // which round they retired after
retirementReason: text('retirement_reason')  // optional
finalStanding: integer('final_standing')     // set when tournament completes
```

### Court Rotation

No changes needed. The existing court rotation system handles variable court sizes.

## Decisions (Previously Open Questions)

1. **Forfeited matches**: Auto-forfeit 0-21.
2. **Replacement timing**: Only before the tournament starts. No mid-tournament replacements.
3. **Final round elimination**: The org should see which players are eliminated from the final round before it starts.
4. **Tiebreaker for elimination**: Compare by average points per round first (normalizes across court sizes), then total points, then diff, then playerId.
