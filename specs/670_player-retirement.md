# Player Retirement During Tournament

## Implementation Status

**Between-rounds retirement**: ✅ IMPLEMENTED — Org can retire players between rounds via `retirePlayer` remote command. Court configuration recalculates, redistribution applies. Stable court tokens persist across retirements.

**Mid-round injury handling**: ⚠️ PARTIALLY IMPLEMENTED — `reportInjury` remote command exists for marking matches as canceled with `isCanceled` flag. Option B (cancel & average) is fully implemented. Option A (substitute) is partially implemented — server marks matches with `injuredPlayerIds`, scoring logic gives 0 points to injured player, court page shows injury banner and "Injured" tag on player card. Option C (restructure court) is not implemented. "Retire a Player" and "Report Injury" now have conditional visibility: retire only shows pre-scoring, injury only shows mid-round.

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

There are two distinct scenarios depending on whether the court has already recorded match results.

### Scenario 1: No Scores Yet on the Court (Pre-Scoring)

If the injury is reported before any matches on that court have been scored, the court format can still be changed. The organizer can choose between:

- **Option A (Substitute)** — same as below.
- **Option B (Cancel & Average)** — same as below, though trivial since no matches are completed yet (all canceled, all players get 0 for the round).
- **Option C (Restructure Court)** — Remove the injured player, recalculate the court format, and regenerate matches. The remaining players stay on this court and play the new format. See Option C details below.

**Option C is only available when no scores have been entered for the court.**

### Scenario 2: Scores Already Entered on the Court (Mid-Round)

When a player gets hurt during an active round and the court already has match results, the organizer **cannot change the court's configuration** (e.g., converting a 4-player court to a 3-player court) because games have already been played, and converting formats mid-round makes scoring and standings mathematically inconsistent and unfair.

Only Options A and B are viable in this scenario. The remaining unplayed matches for that court must be handled in one of the following two ways.

### Option A: Physical Play with a Neutral Substitute (Recommended for mid-round)

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
- **Works on**: All court sizes (4p, 5p, 6p, 3p). No format change needed.
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
  1. Canceled matches are marked `is_canceled = true` and their scores are left as `null`.
  2. When calculating standings for a court, if any match has `is_canceled = true`, the system automatically ranks players on that court by average points per completed match and average point differential per completed match, instead of total points.
- **Non-Standard Courts (5p/6p)**: Since 5-player and 6-player courts already use average points per game to rank players (due to uneven match distributions), Option B is trivial: the system simply cancels games involving the injured player, and ranks the remaining players by their averages over the games they completed.
- **Works on**: All court sizes (4p, 5p, 6p, 3p). No format change needed.
- **Pros**: Does not require a physical substitute. Fairly handles the situation without forcing arbitrary 0-21 forfeits that penalize the healthy partner and boost opponents.

### Option C: Restructure Court (Pre-Scoring Only)

- **Concept**: Remove the injured player and change the court format to match the new player count. The remaining players stay on the same court. Matches are deleted and regenerated for the new court size.
- **When available**: Only when **no scores have been entered** for the court yet. If any match has a score, this option is not available.
- **Key principle**: The non-standard court (3p/5p/6p) is always the **bottom court**. When a court is restructured mid-round, the remaining players stay on their current court number and play the new format. The court format changes (e.g., 4p→3p), but the court number and the players' relative rankings are preserved. For the **next round**, the standard redistribution logic recalculates all court assignments — filling top courts first, and the bottom court absorbs whatever format the new player count dictates.

#### Single-court restructure (one player injured)

| Current        | After Removal  | Current Round Action                                                                                                                                                                                                                                                                        |
| -------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6p (6 players) | 5p (5 players) | Delete 4 six-player matches, generate 4 five-player matches. 5 remaining players stay on this court.                                                                                                                                                                                        |
| 5p (5 players) | 4p (4 players) | Delete 4 five-player matches, generate 3 four-player matches. 4 remaining players stay on this court.                                                                                                                                                                                       |
| 4p (4 players) | 3p (3 players) | Delete 3 four-player matches, generate 3 three-player matches. 3 remaining players stay on this court.                                                                                                                                                                                      |
| 3p (3 players) | 2 players left | **Court does not play this round.** Both remaining players are treated as if they won the court (1st and 2nd place, broken by playerId). For the next round, the standard `calculateCourtSizes` logic determines the new bottom court format (likely a 6p court absorbing these 2 players). |

#### Multiple injuries on the same court (pre-scoring)

When 2+ players are injured on the same court before any scores are entered, the court may drop to 2 or fewer players:

| Current         | Players Left | Current Round Action                                                                                                  |
| --------------- | ------------ | --------------------------------------------------------------------------------------------------------------------- |
| 4p → 2 injuries | 2 players    | **Court does not play this round.** Both treated as 1st and 2nd place (by playerId). Next round: full redistribution. |
| 4p → 3 injuries | 1 player     | **Court does not play this round.** Player treated as 1st place. Next round: full redistribution.                     |
| 3p → 2 injuries | 1 player     | Same as above.                                                                                                        |
| 5p → 2 injuries | 3 players    | Restructure to 3p. Generate 3 three-player matches.                                                                   |
| 6p → 2 injuries | 4 players    | Restructure to 4p. Generate 3 four-player matches.                                                                    |

When a court does not play, its surviving players receive 0 points for the current round (no matches played) but are ranked at the top of their court for redistribution purposes.

#### Cross-court impact for next round

The current round is played with the restructured courts. When the round closes and the next round begins:

1. The total active player count is reduced by all retired players.
2. `calculateCourtSizes()` determines the new court configuration.
3. Standard redistribution (ladder for random-seed, bracket split for preseed) assigns players to courts.
4. Top courts are filled first. The bottom court gets whatever format the leftover players dictate.

**Preseed special case — bracket promotion**: In preseed, the winner bracket gets `splitSize(N) × 4` players (top finishers from each finish tier). Each round the winner bracket shrinks — e.g. for 4 courts: 16 players round 1, top 8 (winners) round 2, top 4 (final) round 3. The loser bracket receives the remaining players.

When retirements reduce the winner bracket below its expected player count, the top player(s) from the loser bracket are **promoted** to fill the gap. The promotion criteria is: **1st-place player from the highest court in the loser bracket** — the player closest to the winner/loser boundary, who would have been the first pick for promotion.

**When is promotion needed?** Only when the winner bracket has fewer players than the expected count after binary split. If 1 player retires from a 4p winner-bracket court (3 remain), the bracket still has enough players for the next round's split (3 is still ≥ half of 4 = 2). The 3rd-place player on that court is relegated to the loser bracket next round as usual. No promotion needed.

**Example where promotion IS needed (preseed, 16 players)**:

- Round 2: Winner bracket C1 (4p), C2 (4p). Loser bracket C3 (4p), C4 (4p).
- 3 players retire from C1, 1 from C2 (pre-scoring, Option C each time).
- C1 has 1 player left (does not play). C2 has 3 players (plays 3p).
- Round 2 plays: C1 inactive, C2(3p), C3(4p), C4(4p).
- Round 3: 12 active players. Expected: winner bracket needs 4 players, loser bracket needs 8.
- Winner bracket has 1 (from C1) + 3 (from C2) = 4 players. Just enough — no promotion needed.
- But if 4+ players had retired from the winner bracket (leaving <4), the top player(s) from C3 would be promoted to fill the winner bracket for round 3.

**Example where promotion IS needed (extreme case)**:

- Round 2: C1 (4p), C2 (4p), C3 (4p), C4 (4p).
- All 4 players on C1 retire. C2 has 3 players left.
- Winner bracket has 0 + 3 = 3 players. Need 4 for round 3's winner bracket.
- 1st-place player from C3 (highest loser-bracket court) is promoted to the winner bracket.
- Round 3: Winner bracket = 3 from C2 + 1 promoted from C3 = 4 players. Loser bracket = remaining 7 players → 1×4p + 1×3p.

**Random-seed**: No bracket concept. Standard ladder redistribution (2 up, 2 down) handles it naturally. The restructured court's players are ranked by their court position and redistributed normally.

#### Injured player handling

The injured player is marked as retired (`retiredAt`, `retiredRound`, `retiredCourt`, `retirementReason`, `finalStanding` set), same as between-rounds retirement. They are excluded from all future rounds.

#### Database Implementation

- Delete all matches for the court's current rotation.
- Delete the rotation row.
- If the court can still play (3+ players): create a new rotation with the updated `courtSize` and remaining player IDs. Generate new matches.
- If the court cannot play (2 or fewer players): no new rotation or matches for this court this round. The surviving players get a "bye" with 0 points.
- Update tournament's `courtSizes` and `playerCount` in DB.
- Trigger `getTournamentDataLive(tournamentId).reconnect()`.

- **Pros**: Clean format transition. No canceled matches. No substitute needed. Court plays the correct format for the remaining players.
- **Cons**: Only works before scoring starts. Cannot be used once any match has a score.

---

## UI Flow for Mid-Round Injury

### 1. Reporting an Injury

During an active round, the organizer sees a "Report Injury" section on the tournament page (visible only when the round has scores — `hasScores === true`).

### 2. Selecting the Handling Option

Clicking "Report Injury" for a player opens a selection. The available options depend on whether the injured player's court already has scores:

**When the court has NO scores yet** (all three options available):

```
┌─────────────────────────────────────────────────────────┐
│ Report Injury: Player D (Court 2)                       │
│                                                          │
│ How would you like to handle this?                       │
│                                                          │
│ ( ) Restructure Court (Recommended)                      │
│     Remove Player D and change court format.             │
│     6p→5p, 5p→4p, 4p→3p. Matches regenerated.          │
│                                                          │
│ ( ) Use a Substitute                                     │
│     Play 2v2 with a temporary substitute.                │
│     Scores are entered normally.                         │
│                                                          │
│ ( ) Cancel & Average                                     │
│     Cancel all matches for Player D.                     │
│     Standings calculated using average points.           │
│                                                          │
│ [Confirm Injury] [Cancel]                                │
└─────────────────────────────────────────────────────────┘
```

**When the court HAS scores** (only Options A and B available):

```
┌─────────────────────────────────────────────────────────┐
│ Report Injury: Player D (Court 2)                       │
│                                                          │
│ How would you like to handle the remaining matches?      │
│                                                          │
│ ( ) Use a Substitute (Recommended)                       │
│     Matches remain on the schedule. Play 2v2 with a      │
│     temporary substitute. Scores are entered normally.    │
│                                                          │
│ ( ) Cancel & Average                                     │
│     Cancel remaining matches for Player D. Court         │
│     standings will be calculated using average points.   │
│                                                          │
│ ⚠ Restructure Court is not available because this        │
│   court already has match results.                       │
│                                                          │
│ [Confirm Injury] [Cancel]                                │
└─────────────────────────────────────────────────────────┘
```

### 3. Court View Updates

- **If Restructure Court (Option C) is selected**: The court page reloads with the new format (e.g., 5p instead of 6p). Matches are regenerated. The injured player's name is removed. Other players on the court see new match pairings. If the court drops below 3 players (cannot play), the court page shows "Court inactive this round — not enough players."
- **If Substitute (Option A) is selected**: The court view displays Player D as "Injured" but the remaining matches remain active for score entry.
- **If Cancel & Average (Option B) is selected**: The remaining matches involving Player D are marked as "Canceled" and disabled in the UI. The organizer only enters scores for any matches that did not involve Player D.

### 4. Closing the Round

When the organizer closes the round:

1. The injured player is already marked as retired (`retiredAt` set at time of injury report, `retiredRound` set to current round).
2. The standings for the court are calculated:
   - If Option A (Substitute) was used: normal standings calculation. The injured player gets 0 points for matches they missed.
   - If Option B (Cancel & Average) was used: standings are calculated using averages of completed matches.
   - If Option C (Restructure) was used: normal standings for the restructured court. If the court did not play (2 or fewer players), surviving players get 0 points but are ranked 1st/2nd on their court for redistribution.
3. For subsequent rounds, the retired player is excluded from court assignment generation, and the court configuration is recalculated for the remaining players (applying the standard retirement rules). Top courts fill first; loser-bracket players may be promoted to fill winner-bracket courts (preseed).

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
// match table:
isCanceled: boolean('is_canceled').notNull().default(false);
injuredPlayerIds: jsonb('injured_player_ids').$type<number[]>();
```

### Court Rotation

No changes needed. The existing court rotation system handles variable court sizes.

## Decisions (Previously Open Questions)

1. **Forfeited/Injured matches**: Two scenarios: (a) Pre-scoring — full restructure (Option C), substitute (Option A), or cancel & average (Option B). (b) Mid-round with scores — only substitute (Option A) or cancel & average (Option B). The old "Play Solo (2v1)" option is removed — it was physically unfair and rarely used. Restructure (Option C) replaces it for pre-scoring situations and is much cleaner.
2. **Replacement timing**: Only before the tournament starts. No mid-tournament replacements.
3. **Final round elimination**: The org should see which players are eliminated from the final round before it starts.
4. **Tiebreaker for elimination**: Compare by average points per round first (normalizes across court sizes), then total points, then diff, then playerId.

## Implementation Plan: Option C (Restructure Court)

### Overview

Option C allows the organizer to remove an injured player from a court **before any scores are entered** and restructure the court to the correct smaller format. The remaining players stay on the same court and play the new format. If a court drops below 3 players, it does not play this round — surviving players are treated as if they won the court (by playerId). For the next round, the standard redistribution logic handles everything, including promoting loser-bracket players to fill winner-bracket courts when needed (preseed).

### Phase 1: Server-Side Logic

**File: `tournament-actions.remote.ts`**

1. Extend the `reportInjury` validation schema to accept `option: 'substitute' | 'cancel' | 'restructure'`.
2. In the `reportInjury` handler, add a `restructure` branch:
   - Verify the court has NO scores (`hasScores` check — for restructure, require `!hasScores`; error if scores exist).
   - Get the injured player's current rotation and court.
   - Mark the player as retired (`retiredAt`, `retiredRound`, `retiredCourt`, `retirementReason`, `finalStanding`).
   - Calculate the new player count on the court (current - 1, or current - N for multiple injuries).
   - **If 3+ players remain**: Delete the court's current matches and rotation. Create a new rotation with the updated `courtSize` and remaining player IDs. Generate new matches using `generateAllMatchesForAssignment()`. Update `court.courtSize`.
   - **If 2 or fewer players remain**: Delete the court's current matches and rotation. Deactivate the court for this round. Surviving players are assigned a "bye" with 0 points and ranked 1st/2nd by playerId on their court for redistribution purposes.
   - Update tournament's `courtSizes` and `playerCount` in DB.
   - Trigger `getTournamentDataLive(tournamentId).reconnect()`.

**File: `tournament-logic.ts`**

3. No new pure functions needed. The existing `calculateCourtSizes()`, `generateAllMatchesForAssignment()`, `recalculateCourtConfigAfterRetirement()`, and `calculateRetiredStanding()` are sufficient. The `reportInjury` handler composes these.

### Phase 2: Redistribution for Next Round

**No new code needed** — the existing `closeRoundForm` already recalculates `courtSizes` for the reduced player count and applies the standard redistribution (ladder for random-seed, `redistributePreseedRecursive` for preseed). The preseed redistribution naturally promotes the best-available players to fill top courts, including pulling players from the loser bracket into the winner bracket when the winner bracket is underfilled due to retirements.

### Phase 3: UI Changes

**File: `tournament/[id]/+page.svelte`**

4. Add `'restructure'` to the `injuryOption` type: `type = 'substitute' | 'cancel' | 'restructure' | ''`.
5. Add a third radio option in the injury form:
   ```svelte
   <label class="radio-label">
   	<input type="radio" bind:group={injuryOption} value="restructure" required />
   	<span class="radio-title">Restructure Court</span>
   	<span class="radio-desc">
   		Remove injured player and change court format. Matches regenerated.
   	</span>
   </label>
   ```
6. Make the restructure option conditional: only show when `!hasScores`. When `hasScores` is true, show a disabled label with explanation:
   ```svelte
   {#if hasScores}
   	<label class="radio-label disabled">
   		<input type="radio" disabled />
   		<span class="radio-title">Restructure Court (unavailable)</span>
   		<span class="radio-desc">Not available — court already has match results.</span>
   	</label>
   {:else}
   	<!-- active restructure option -->
   {/if}
   ```
7. The `reportInjury` call in the button `onclick` already passes `injuryOption` — no change needed there.
8. **Court page update**: When a court has no rotation (because it was deactivated due to <3 players), show "Court inactive this round — not enough players" instead of match forms.

### Phase 4: Edge Cases & Testing

9. **3p court dissolution** (court cannot play): When a player on a 3p court is restructured out, the 2 remaining players get a bye. Test with 11 players (2×4p + 1×3p). Verify that next round's redistribution creates a valid court configuration (e.g., 2×4p + 1×6p with the 2 bye players joining the bottom court).
10. **4p→3p on a top court**: Verify that the top court's 3 remaining players play 3p format. Verify that the 3rd-place player is relegated in the next round's redistribution. For preseed: verify that a loser-bracket player is promoted to fill the winner bracket.
11. **5p→4p transition**: Verify match count changes from 4 (5p) to 3 (4p) and match pairings are correct.
12. **6p→5p transition**: Verify match count stays at 4 but the match format changes from 6p parallel runs to 5p parallel runs.
13. **Multiple injuries on same court**: Test 4p court losing 2 players (2 remain → court does not play). Verify surviving players ranked by playerId.
14. **E2E tests**: Add tests for each scenario in `tournament.spec.ts` under the "Player Retirement" describe block.

### Phase 5: Cleanup

15. Remove any references to "Play Solo (2v1)" from code comments, validation schemas, and UI.
16. Update `TO_FIX.md` to mark Option C as complete.

### Effort Estimate

| Phase                   | Effort                                                                | Risk                             |
| ----------------------- | --------------------------------------------------------------------- | -------------------------------- |
| Phase 1: Server logic   | Medium — reuses existing `retirePlayer` patterns                      | Low — well-tested pure functions |
| Phase 2: Redistribution | None — existing logic handles it                                      | None                             |
| Phase 3: UI             | Low — add radio option with conditional rendering                     | Low                              |
| Phase 4: Testing        | Medium — 5 scenarios (6p→5p, 5p→4p, 4p→3p, 3p dissolve, multi-injury) | Low                              |
| Phase 5: Cleanup        | Trivial                                                               | None                             |
