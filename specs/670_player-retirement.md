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
After removing 2: 22 players → 5×4p + 1×2p? No — 2p not valid
```

**2-player courts are not valid.** Minimum court size is 3 (2v1 format).

So for 22 players:
- 5×4p = 20 players + 2 leftover
- Options: 1×6p (Option D) or exclude 2 players
- Default: include as 6-player court

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
- 24 → 22 players: 5×4p + 2 leftover → 5×4p + 1×6p (Option D)
- 24 → 21 players: 5×4p + 1 leftover → 5×4p + 1×5p (Option D)
- 24 → 20 players: 5×4p (clean)

### Retirement Drops Below Minimum

If retirements drop below 8 players:
- Tournament cannot continue (minimum 2 courts)
- Show warning: "Only 7 players remain. Tournament cannot continue."
- Options: cancel tournament or recruit replacements

### Retirement in Final Round

**Special rule**: If a player retires during the final round (scores already entered), their scores are kept for redistribution purposes but they don't play further rounds.

If the retirement happens between rounds (before final round starts), normal redistribution applies.

### Retired Player's Scores

- **Completed rounds**: Scores are preserved in history
- **Current round**: If round is in progress, retired player's matches are marked as forfeit
- **Final standing**: Retired player gets standing based on their last completed round

### Replacements (Future)

- Retired players can be replaced by "alternates" (players previously excluded due to leftovers)
- Replacement must happen before the next round starts
- Replacement inherits the retired player's court position (or is placed at the bottom — TBD)

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

## Open Questions

1. **Forfeited matches**: If a player retires mid-round (scores partially entered), how do we handle their remaining matches? Auto-forfeit 0-21?
2. **Replacement timing**: Can a replacement join between rounds, or only before the tournament starts?
3. **Retired player visibility**: Should retired players appear on the standings page with a "retired" label, or be hidden?
4. **Final round elimination**: Should eliminated players be notified before the final round starts, or only when the round is displayed?
5. **Tiebreaker for elimination**: If 2 players are tied for the last spot on the final court, how do we break the tie? (Points → diff → ID, same as everywhere)
