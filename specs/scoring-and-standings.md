# Scoring & Standings System

## Overview

This specification defines the complete scoring system and standings calculation algorithm for the KoB Tracker. It covers how points are awarded, how standings are calculated within courts, and how final tournament rankings are determined.

## Scoring Rules

### Match Scoring (Beach Volleyball)

**Winning Conditions**:
- First team to 21 points wins
- Must win by 2 points
- No ceiling (rally can continue past 21)

**Examples**:
- 21-19: Valid, Team A wins
- 22-20: Valid, Team A wins (continued past 21)
- 25-23: Valid, extended rally
- 21-21: Invalid (tie not allowed)
- 20-18: Invalid (no team reached 21)

### Point Allocation

**Individual Points System**:
Each player receives points equal to their team's score in each match they play.

**Example Match**: Alice & Bob vs Carol & David, Score: 21-19
- Alice: +21 points
- Bob: +21 points
- Carol: +19 points
- David: +19 points

**Across All Matches**:
Each player plays 3 matches (partners with each other player once).

**Example - Alice's Tournament**:
```
Match 1 (A&B vs C&D): 21-19 → Alice: +21
Match 2 (A&C vs B&D): 25-23 → Alice: +25
Match 3 (A&D vs B&C): 18-21 → Alice: +18
─────────────────────────────────────
Alice Total: 64 points
```

## Standings Calculation

### Court Standings (Within a Round)

**Data Collected**:
For each player on a court, track:
1. **Total Points**: Sum of all points from 3 matches
2. **Points For**: Total points scored by player's teams
3. **Points Against**: Total points scored against player's teams
4. **Point Differential**: Points For - Points Against
5. **Matches Played**: Always 3 (when complete)

**Example Calculation**:

Players: Alice, Bob, Carol, David

Match 1: A&B 21 vs C&D 19
Match 2: A&C 25 vs B&D 23
Match 3: A&D 18 vs B&C 21

```
Alice:
  Points: 21 + 25 + 18 = 64
  Points For: 21 + 25 + 18 = 64
  Points Against: 19 + 23 + 21 = 63
  Differential: +1

Bob:
  Points: 21 + 23 + 21 = 65
  Points For: 21 + 23 + 21 = 65
  Points Against: 19 + 25 + 18 = 62
  Differential: +3

Carol:
  Points: 19 + 25 + 21 = 65
  Points For: 19 + 25 + 21 = 65
  Points Against: 21 + 23 + 18 = 62
  Differential: +3

David:
  Points: 19 + 23 + 18 = 60
  Points For: 19 + 23 + 18 = 60
  Points Against: 21 + 25 + 21 = 67
  Differential: -7
```

### Ranking Algorithm

**Step 1: Sort by Total Points (Descending)**
```
1. Bob: 65 pts
2. Carol: 65 pts
3. Alice: 64 pts
4. David: 60 pts
```

**Step 2: Break Ties by Point Differential (Descending)**
```
Bob vs Carol: Both 65 pts
  Bob: +3 differential
  Carol: +3 differential
  Still tied!
```

**Step 3: Head-to-Head Comparison**
When tied on points and differential, check if players played each other directly.

In this case, Bob and Carol played together in Match 2 (as partners), not against each other, so head-to-head doesn't resolve the tie.

**Step 4: Org Decision**
System notifies Org of tie. Org can:
- Let players decide (quick game, coin flip, etc.)
- Use random system coin flip
- Override with manual ranking

**Step 5: System Coin Flip**
If Org doesn't intervene, system randomly assigns order.

**Final Ranking**:
```
1. Bob (won coin flip)
2. Carol
3. Alice
4. David
```

### Algorithm Implementation

```typescript
function calculateCourtStandings(matches: Match[]): PlayerStanding[] {
  // Initialize standings for all 4 players
  const standings = new Map<number, PlayerStanding>();
  
  // Process each match
  for (const match of matches) {
    if (!match.isComplete) continue;
    
    // Award points to all 4 players
    updatePlayerStats(standings, match.teamAPlayer1, match.teamAScore, match.teamBScore);
    updatePlayerStats(standings, match.teamAPlayer2, match.teamAScore, match.teamBScore);
    updatePlayerStats(standings, match.teamBPlayer1, match.teamBScore, match.teamAScore);
    updatePlayerStats(standings, match.teamBPlayer2, match.teamBScore, match.teamAScore);
  }
  
  // Convert to array and sort
  const ranked = Array.from(standings.values())
    .sort((a, b) => {
      // Primary: Total points (desc)
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      
      // Secondary: Differential (desc)
      if (b.pointDifferential !== a.pointDifferential) {
        return b.pointDifferential - a.pointDifferential;
      }
      
      // Tertiary: Head-to-head (if applicable)
      const h2h = getHeadToHeadResult(a.playerId, b.playerId, matches);
      if (h2h !== 0) return h2h;
      
      // Final: Random (stable for same data)
      return Math.random() - 0.5;
    });
  
  // Assign ranks
  ranked.forEach((standing, index) => {
    standing.rank = index + 1;
  });
  
  return ranked;
}
```

## Final Tournament Standings

### Determining Overall Winner

Unlike traditional tournaments, KoB winner is determined by **final court position**, not total aggregate points across all rounds.

**Ranking Hierarchy**:
```
Final Standings = Court Position Order

1st Place: 1st place on Court 1 (final round)
2nd Place: 2nd place on Court 1 (final round)
3rd Place: 3rd place on Court 1 (final round)
4th Place: 4th place on Court 1 (final round)
5th Place: 1st place on Court 2 (final round)
6th Place: 2nd place on Court 2 (final round)
...
16th Place: 4th place on Court 4 (final round)
```

**Why This System?**:
- Rewards players who consistently perform well
- Court 1 in final round = "winners bracket"
- Creates drama as players compete to reach Court 1
- Simple to understand and explain

### Final Standings Page

**Layout**:
```
┌─────────────────────────────────────┐
│  Beach Bash 2024 - Final Results    │
├─────────────────────────────────────┤
│                                     │
│  🥇 1st Place                       │
│     Alice                           │
│     Court 1, Round 3                │
│                                     │
│  🥈 2nd Place                       │
│     Bob                             │
│     Court 1, Round 3                │
│                                     │
│  🥉 3rd Place                       │
│     Carol                           │
│     Court 1, Round 3                │
│                                     │
│  4th Place                          │
│     David                           │
│     Court 1, Round 3                │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Court 2 Finalists                  │
│  5. Eve                             │
│  6. Frank                           │
│  7. Grace                           │
│  8. Henry                           │
│                                     │
│  Court 3 Finalists                  │
│  9. Ivy                             │
│  10. Jack                           │
│  11. Kate                           │
│  12. Liam                           │
│                                     │
│  Court 4 Finalists                  │
│  13. Mia                            │
│  14. Noah                           │
│  15. Olivia                         │
│  16. Paul                           │
│                                     │
│  [📊 View Full Statistics]          │
│  [🏠 Back to Dashboard]             │
│                                     │
└─────────────────────────────────────┘
```

**Features**:
- Medal emojis for top 3
- Court and round context for each player
- Shareable results (copy to clipboard, social share)
- Printable view for display at venue

## Statistics & Analytics

### Player Statistics

**Per Player**:
```typescript
interface PlayerStats {
  playerId: number;
  name: string;
  
  // Tournament totals
  totalPoints: number;           // Sum of all points across all rounds
  totalPointsAgainst: number;    // Sum of all opponent points
  overallDifferential: number;   // Points For - Against
  
  // Court progression
  courtHistory: {                // Which court each round
    round: number;
    court: number;
    placement: number;           // 1st, 2nd, 3rd, 4th on that court
  }[];
  
  // Match performance
  matchesWon: number;            // Matches where team scored higher
  matchesLost: number;           // Matches where team scored lower
  highestScore: number;          // Highest single match team score
  lowestScore: number;           // Lowest single match team score
  
  // Partner stats
  partners: {
    playerId: number;
    name: string;
    matchesTogether: number;
    pointsScoredTogether: number;
  }[];
}
```

### Tournament Statistics

**Overall**:
```typescript
interface TournamentStats {
  tournamentId: number;
  
  // Scoring
  totalPointsScored: number;     // Sum of all points by all players
  averageMatchScore: number;     // Average winning score
  highestMatchScore: number;     // Highest team score in any match
  mostLopsidedMatch: Match;      // Biggest point differential
  closestMatch: Match;           // Smallest point differential
  
  // Movement
  mostImproved: Player;          // Biggest court jump up
  biggestDrop: Player;           // Biggest court jump down
  mostConsistent: Player;        // Stayed on same court most rounds
  court1Finalists: Player[];     // Players who reached Court 1
}
```

### Statistics Page

**Layout**:
```
┌─────────────────────────────────────┐
│  Beach Bash 2024 - Statistics       │
├─────────────────────────────────────┤
│                                     │
│  🏆 Top Scorers                     │
│  1. Alice          187 points       │
│  2. Bob            185 points       │
│  3. Carol          182 points       │
│                                     │
│  📈 Court Progression               │
│  [Heat map showing court movement]  │
│                                     │
│  🤝 Best Partnerships               │
│  1. Alice & Bob    142 pts together │
│  2. Carol & David  138 pts together │
│                                     │
│  ⚡ Match Records                   │
│  Highest score: 32-30 (Round 2, C1) │
│  Most lopsided: 21-5 (Round 1, C4)  │
│                                     │
└─────────────────────────────────────┘
```

## Edge Cases

### Incomplete Matches

**Scenario**: Round closing with incomplete matches

**Resolution**:
1. Prevent round close until all matches complete
2. Show warning: "Cannot close round - 2 matches pending on Court 3"
3. Org must either:
   - Enter scores for missing matches
   - Forfeit matches (assign 0-21 loss)
   - Extend round time

### Tie Resolution UI

**Scenario**: Bob and Carol tied for 1st on Court 2

**Org Interface**:
```
⚠️ Tie Detected

Bob and Carol are tied for 1st place on Court 2:
• Both: 65 points
• Both: +3 differential
• No head-to-head result

How would you like to resolve?

( ) Let players decide (rock-paper-scissors, etc.)
( ) Random coin flip
( ) Manual override

[Cancel] [Resolve Tie]
```

**After Resolution**:
- Store resolution method in database
- Continue with promotion/relegation
- Show tie resolution in audit log

### Disputed Scores

**Scenario**: Alice says Match 1 was 21-19, Bob says it was 20-22

**Resolution Flow**:
1. System detects conflict when second score entered
2. Show both entries with timestamps
3. Freeze match until resolved
4. Notify Org of dispute
5. Org reviews and selects correct score
6. Audit trail records dispute and resolution

## API Endpoints

### Calculate Standings

**Endpoint**: `GET /api/tournament/[id]/court/[number]/standings`

**Response**:
```typescript
{
  courtNumber: number;
  roundNumber: number;
  isComplete: boolean;
  standings: [
    {
      rank: 1,
      playerId: 1,
      name: "Alice",
      totalPoints: 64,
      pointDifferential: 1,
      isTied: false
    },
    // ...
  ],
  ties: [ // If any ties detected
    {
      rank: 1,
      playerIds: [2, 3],
      resolutionRequired: true
    }
  ]
}
```

### Resolve Tie

**Endpoint**: `POST /api/tournament/[id]/court/[number]/resolve-tie`

**Input**:
```typescript
{
  roundNumber: number;
  tiedPlayerIds: number[];
  resolution: 'player-decision' | 'coin-flip' | 'manual';
  winnerPlayerId?: number; // for manual resolution
}
```

### Get Tournament Statistics

**Endpoint**: `GET /api/tournament/[id]/statistics`

**Response**: Full `TournamentStats` object

## Testing Strategy

### Unit Tests

1. **Points Calculation**:
   - Verify each player gets correct points per match
   - Verify totals across multiple matches
   - Handle edge cases (0 points, very high scores)

2. **Standings Sorting**:
   - Primary sort by points
   - Secondary sort by differential
   - Tertiary sort by head-to-head
   - Stable random for unresolved ties

3. **Tie Detection**:
   - Detect exact ties
   - Detect ties only on points
   - Detect ties on points + differential
   - Head-to-head resolution logic

### Integration Tests

1. **End-to-End Scoring**:
   - Enter scores for all matches in a round
   - Verify standings update correctly
   - Verify promotion/relegation uses correct data

2. **Tie Resolution**:
   - Create artificial tie
   - Verify Org notification
   - Resolve via different methods
   - Verify final ordering

### E2E Tests

1. **Player enters scores and sees standings**
2. **Org views standings and closes round**
3. **Complete tournament and verify final rankings**
4. **Dispute resolution workflow**

## Performance Considerations

### Calculation Optimization

**Challenge**: Standings recalculated on every score entry

**Solution**:
- Calculate incrementally where possible
- Cache intermediate results
- Debounce rapid updates
- Use database aggregations for historical data

### Query Optimization

**Efficient Query Pattern**:
```typescript
// Single query to get all match data for a court
const matches = await db
  .select()
  .from(match)
  .where(eq(match.courtRotationId, rotationId));

// Calculate in application code (faster than complex SQL)
const standings = calculateStandings(matches);
```

**Indexing**:
- Index on `match.court_rotation_id`
- Index on `court_rotation.tournament_id`
- Index on `court_rotation.round_number`

## Future Enhancements

1. **Detailed Match Stats**:
   - Time tracking per match
   - Timeout tracking
   - Side-switch tracking

2. **Historical Comparison**:
   - Compare to previous tournaments
   - Player improvement tracking
   - Career statistics

3. **Export Formats**:
   - PDF tournament report
   - CSV data export
   - API for external integrations

4. **Live Leaderboards**:
   - Public-facing real-time standings
   - Social media integration
   - Live commentary support
