# 32-Player Elimination King of the Beach Format

## Overview

A 32-player, 8-court tournament format with seeded initial placement and binary elimination-style redistribution across 4 rounds. This format prioritizes initial seeding and creates a clear hierarchy through progressive court consolidation.

## Key Differences from Standard Format

| Aspect | Standard (16 players) | 32-Player Elimination |
|--------|----------------------|----------------------|
| Players | 16 | 32 |
| Courts | 4 | 8 |
| Rounds | 3 | 4 |
| Matches per player | 9 | 12 |
| Redistribution | Ladder (2 up/2 down) | Binary elimination |
| Seeding | Random or manual | Points-based (required) |
| Recovery | Players can climb back | No recovery path |

## Tournament Structure

### Initial Seeding (Before Round 1)

Players must be seeded based on current points/ranking. The seeding follows a "snake" pattern:

```
Court 1:  Seed 1,  Seed 9,  Seed 17, Seed 25
Court 2:  Seed 2,  Seed 10, Seed 18, Seed 26
Court 3:  Seed 3,  Seed 11, Seed 19, Seed 27
Court 4:  Seed 4,  Seed 12, Seed 20, Seed 28
Court 5:  Seed 5,  Seed 13, Seed 21, Seed 29
Court 6:  Seed 6,  Seed 14, Seed 22, Seed 30
Court 7:  Seed 7,  Seed 15, Seed 23, Seed 31
Court 8:  Seed 8,  Seed 16, Seed 24, Seed 32
```

**Seeding Logic**:
- Top 8 seeds get position 1 on each court (advantageous as they face weaker opponents in first rotation)
- Seeds 9-16 get position 2
- Seeds 17-24 get position 3
- Seeds 25-32 get position 4

### Round 1 → Round 2 (Winner/Loser Split)

After Round 1, courts are divided into "Winner Courts" (1-4) and "Loser Courts" (5-8):

```
Winner Courts (1-4): All 1st and 2nd place finishers from all 8 courts
Loser Courts (5-8):  All 3rd and 4th place finishers from all 8 courts
```

**Assignment Logic**:
- Courts 1-4 receive 1st/2nd from Courts 1-4 (8 players) + 1st/2nd from Courts 5-8 (8 players) = 16 players, 4 per court
- Courts 5-8 receive 3rd/4th from Courts 1-4 (8 players) + 3rd/4th from Courts 5-8 (8 players) = 16 players, 4 per court

```
New Court 1: 1st from C1-C2, 1st from C5-C6
New Court 2: 2nd from C1-C2, 2nd from C5-C6
New Court 3: 1st from C3-C4, 1st from C7-C8
New Court 4: 2nd from C3-C4, 2nd from C7-C8
New Court 5: 3rd from C1-C2, 3rd from C5-C6
New Court 6: 4th from C1-C2, 4th from C5-C6
New Court 7: 3rd from C3-C4, 3rd from C7-C8
New Court 8: 4th from C3-C4, 4th from C7-C8
```

### Round 2 → Round 3 (Tier Consolidation)

```
Courts 1-2: 1st/2nd from Courts 1-4 (top 8 of winners)
Courts 3-4: 3rd/4th from Courts 1-4 (bottom 8 of winners)
Courts 5-6: 1st/2nd from Courts 5-8 (top 8 of losers)
Courts 7-8: 3rd/4th from Courts 5-8 (bottom 8 of losers)
```

**Assignment Logic**:
```
New Court 1: 1st from C1-C2
New Court 2: 2nd from C1-C2
New Court 3: 1st from C3-C4
New Court 4: 2nd from C3-C4
New Court 5: 3rd from C1-C2
New Court 6: 4th from C1-C2
New Court 7: 3rd from C3-C4
New Court 8: 4th from C3-C4
(Repeat pattern for Courts 5-8 source)
```

Wait - this needs more thought. Let me recalculate...

Actually, after Round 2 we have 16 players in Courts 1-4 and 16 in Courts 5-8. Each court has 4 players.

Round 2 → Round 3:
- From Courts 1-4: Top 2 stay in Courts 1-2, Bottom 2 go to Courts 3-4
- From Courts 5-8: Top 2 go to Courts 5-6, Bottom 2 go to Courts 7-8

```
New Court 1: 1st from C1, 1st from C2
New Court 2: 2nd from C1, 2nd from C2
New Court 3: 3rd from C1, 3rd from C2
New Court 4: 4th from C1, 4th from C2
New Court 5: 1st from C3, 1st from C4
New Court 6: 2nd from C3, 2nd from C4
New Court 7: 3rd from C3, 3rd from C4
New Court 8: 4th from C3, 4th from C4
+ same pattern from Courts 5-8
```

### Round 3 → Round 4 (Final Placement)

```
Court 1: 1st/2nd from Courts 1-2 → Compete for places 1-4
Court 2: 3rd/4th from Courts 1-2 → Compete for places 5-8
Court 3: 1st/2nd from Courts 3-4 → Compete for places 9-12
Court 4: 3rd/4th from Courts 3-4 → Compete for places 13-16
Court 5: 1st/2nd from Courts 5-6 → Compete for places 17-20
Court 6: 3rd/4th from Courts 5-6 → Compete for places 21-24
Court 7: 1st/2nd from Courts 7-8 → Compete for places 25-28
Court 8: 3rd/4th from Courts 7-8 → Compete for places 29-32
```

### Final Standings

After Round 4, final placements are determined by court standing:

| Court | Final Place |
|-------|-------------|
| Court 1 | 1st: #1, 2nd: #2, 3rd: #3, 4th: #4 |
| Court 2 | 1st: #5, 2nd: #6, 3rd: #7, 4th: #8 |
| Court 3 | 1st: #9, 2nd: #10, 3rd: #11, 4th: #12 |
| Court 4 | 1st: #13, 2nd: #14, 3rd: #15, 4th: #16 |
| Court 5 | 1st: #17, 2nd: #18, 3rd: #19, 4th: #20 |
| Court 6 | 1st: #21, 2nd: #22, 3rd: #23, 4th: #24 |
| Court 7 | 1st: #25, 2nd: #26, 3rd: #27, 4th: #28 |
| Court 8 | 1st: #29, 2nd: #30, 3rd: #31, 4th: #32 |

## Identified Issues & Concerns

### 1. Physical Demands
- **4 rounds × 3 matches = 12 matches per player**
- Standard beach volleyball tournaments often have 6-8 matches max
- Consider: Reduce to 2 matches per court, or 3 rounds instead of 4

### 2. No Recovery Path
- Unlike ladder system, a strong player who has one bad round is "trapped"
- Seed 1 could finish 3rd in Round 1 and never recover to top court
- **Mitigation**: Consider hybrid approach where lowest court uses ladder

### 3. Initial Seeding Critical
- With binary elimination, seeding quality determines tournament fairness
- Bad seed = permanently stuck in lower courts
- Requires accurate/verified point system before tournament

### 4. Complexity
- Redistribution logic is more complex than ladder
- Players may not understand why they moved to specific court
- Need clear visual explanation of bracket structure

### 5. Court Assignment Ambiguity
- When 8 players need to go to 2 courts, how to decide which court?
- Proposal: Maintain seed order within tier groups

### 6. Time Requirements
- 8 courts × 3 matches × ~20 min = ~8 hours of play minimum
- With 4 rounds = potentially 2-day tournament

## Alternative: 3-Round Version

If 4 rounds is too demanding, consider 3-round variant:

### Round 1 → Round 2
```
Courts 1-4: 1st/2nd from ALL courts (16 players)
Courts 5-8: 3rd/4th from ALL courts (16 players)
```

### Round 2 → Round 3 (Final)
```
Court 1: 1st from C1-C2 → Places 1-4
Court 2: 2nd from C1-C2 → Places 5-8
Court 3: 1st from C3-C4 → Places 9-12
Court 4: 2nd from C3-C4 → Places 13-16
Court 5: 3rd/4th from C1-C2 + 1st from C5-C6 → Places 17-20
...etc
```

This reduces to 9 matches per player (more standard).

## Database Schema Extensions

```typescript
// tournament table addition
{
  formatType: text().default('standard'), // 'standard' | 'kob32-elimination'
  formatConfig: jsonb().default({}),      // format-specific settings
}

// player table addition (for 32-player format)
{
  seedPoints: integer(),    // Points used for seeding
  seedRank: integer(),      // Calculated seed position (1-32)
}

// courtRotation - no changes needed, just more rows (8 courts instead of 4)

// New: bracket tracking
{
  id: serial().primaryKey(),
  tournamentId: integer().notNull(),
  roundNumber: integer().notNull(),
  tierGroup: text().notNull(),     // 'winner' | 'loser' | 'final'
  sourceCourts: integer[],         // Which courts feed into this court
  destinationCourts: integer[],    // Where players go after this round
}
```

## Implementation Plan

### Phase 1: Seeding System
1. Create player input UI with points field
2. Implement seed calculation and ranking
3. Add validation for exactly 32 players with points
4. Test seeding algorithm with various point distributions

### Phase 2: Redistribution Engine
1. Create `RedistributionStrategy` interface implementation
2. Implement `EliminationRedistribution` class
3. Handle all 3 redistribution transitions:
   - Round 1 → Round 2 (Winner/Loser split)
   - Round 2 → Round 3 (Tier consolidation)
   - Round 3 → Round 4 (Final placement)

### Phase 3: Court Generation
1. Modify court rotation to support 8 courts
2. Update match generation for 8-court layout
3. Generate 8 access tokens (QR codes)

### Phase 4: UI Updates
1. Create format selection at tournament creation
2. Add seeding input interface (paste with points)
3. Visual bracket/tier display showing progression
4. Final standings by court with placement numbers

### Phase 5: Testing
1. Unit tests for seeding algorithm
2. Unit tests for each redistribution transition
3. Full tournament simulation tests
4. Edge case testing (ties, identical points, etc.)

## Redistribution Algorithm

```typescript
function redistributeKO32(
  courtResults: CourtResult[],
  currentRound: number
): CourtAssignment[] {
  
  if (currentRound === 1) {
    // Round 1 → Round 2: Winner/Loser split
    const winners: Player[] = [];
    const losers: Player[] = [];
    
    for (const court of courtResults) {
      winners.push(court.standings[0], court.standings[1]);
      losers.push(court.standings[2], court.standings[3]);
    }
    
    // Sort by original seed for fair distribution
    winners.sort((a, b) => a.seedRank - b.seedRank);
    losers.sort((a, b) => a.seedRank - b.seedRank);
    
    return [
      { court: 1, players: [winners[0], winners[2], winners[4], winners[6]] },
      { court: 2, players: [winners[1], winners[3], winners[5], winners[7]] },
      { court: 3, players: [winners[8], winners[10], winners[12], winners[14]] },
      { court: 4, players: [winners[9], winners[11], winners[13], winners[15]] },
      { court: 5, players: [losers[0], losers[2], losers[4], losers[6]] },
      { court: 6, players: [losers[1], losers[3], losers[5], losers[7]] },
      { court: 7, players: [losers[8], losers[10], losers[12], losers[14]] },
      { court: 8, players: [losers[9], losers[11], losers[13], losers[15]] },
    ];
  }
  
  if (currentRound === 2) {
    // Round 2 → Round 3: Tier consolidation within winner/loser groups
    // Courts 1-4 are winner courts, 5-8 are loser courts
    return consolidateTiers(courtResults);
  }
  
  if (currentRound === 3) {
    // Round 3 → Round 4: Final placement consolidation
    return finalConsolidation(courtResults);
  }
  
  return [];
}

function consolidateTiers(courtResults: CourtResult[]): CourtAssignment[] {
  const winnerCourts = courtResults.filter(c => c.courtNumber <= 4);
  const loserCourts = courtResults.filter(c => c.courtNumber > 4);
  
  // Process winner courts (1-4) → (1-4 still, but consolidated)
  // Process loser courts (5-8) → (5-8 still, but consolidated)
  // ... implementation details
}

function finalConsolidation(courtResults: CourtResult[]): CourtAssignment[] {
  // Round 3 → Round 4: Final court placement
  // Court 1 = top 2 from Courts 1-2
  // Court 2 = bottom 2 from Courts 1-2
  // etc.
}
```

## UI Mockup: Seeding Input

```
32-Player Tournament Setup

Enter players with their current points (one per line):
Format: Player Name, Points

Alice Anderson, 1250
Bob Brown, 1180
Carol Chen, 1150
...
[32 lines required]

[Validate] [Import from CSV]

Seeding Preview:
Seed 1:  Alice Anderson (1250 pts) → Court 1, Position 1
Seed 2:  Bob Brown (1180 pts) → Court 2, Position 1
...
Seed 32: Zoe Zhang (450 pts) → Court 8, Position 4

[Start Tournament]
```

## UI Mockup: Bracket Visualization

```
Round 1          Round 2          Round 3          Round 4 (Final)
                                             
[C1] ───┐
[C2] ───┼── [C1-C2] ──┬── [C1] ─────── Places 1-4
[C5] ───┤             │
[C6] ───┘             └── [C2] ─────── Places 5-8
                                
[C3] ───┐
[C4] ───┼── [C3-C4] ──┬── [C3] ─────── Places 9-12
[C7] ───┤             │
[C8] ───┘             └── [C4] ─────── Places 13-16
                      │
                      ├── [C5] ─────── Places 17-20
                      │
                      ├── [C6] ─────── Places 21-24
                      │
                      ├── [C7] ─────── Places 25-28
                      │
                      └── [C8] ─────── Places 29-32
```

## Recommendation

Consider the **3-round variant** as the primary implementation:
- 9 matches per player (same as standard format)
- Still provides elimination-style progression
- More feasible for single-day tournaments
- Less physically demanding

The 4-round version could be offered as an "Extended Tournament" option for 2-day events.

## Acceptance Criteria

- [ ] Can create tournament with 32 players
- [ ] Must enter points for seeding (validation: exactly 32 players with points)
- [ ] Initial seeding distributes players correctly (snake pattern)
- [ ] Round 1 → Round 2 redistribution works (winner/loser split)
- [ ] Round 2 → Round 3 redistribution works (tier consolidation)
- [ ] Round 3 → Round 4 redistribution works (final placement)
- [ ] Final standings display correct placements (1-32)
- [ ] Visual bracket/tier display shows progression path
- [ ] All 8 court access tokens generated correctly
