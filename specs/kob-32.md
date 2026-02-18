# 32-Player Preseed King of the Beach Format

## Overview

A 32-player, 8-court tournament format with seeded initial placement and tiered redistribution across 4 rounds. All players play the same number of matches - the seeding and redistribution determines final placement, not elimination.

## Format Types

| Format | Players | Courts | Seeding | Redistribution |
|--------|---------|--------|---------|----------------|
| Random Seed | 16 | 4 | Random or manual | Ladder (2 up/2 down) |
| Random Seed | 32 | 8 | Random or manual | Ladder (2 up/2 down) |
| Preseed | 16 | 4 | Points-based | Tiered binary |
| Preseed | 32 | 8 | Points-based | Tiered binary |

## Virtual Courts Concept

Courts in this system are "virtual" - logical groupings of 4 players. Physical implementation uses half the court count:

- **32 players / 8 virtual courts = 4 physical courts**
- **16 players / 4 virtual courts = 2 physical courts**

Players rotate between playing and breaks:
- Round 1: Courts 1-4 play, Courts 5-8 have break
- Round 1 (continued): Courts 5-8 play, Courts 1-4 have break

This ensures all players get rest between matches by design.

### Scheduling Example (32 players)

```
Time Slot 1: Virtual Courts 1, 2, 3, 4 play (16 players active, 16 on break)
Time Slot 2: Virtual Courts 5, 6, 7, 8 play (16 players active, 16 on break)
```

## Preseed Format Structure (32 Players)

### Initial Seeding

Players must be seeded based on current points/ranking. The seeding follows a "snake" pattern to distribute strength evenly:

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
- Top 8 seeds get position 1 on each court
- Seeds 9-16 get position 2
- Seeds 17-24 get position 3
- Seeds 25-32 get position 4

### Round 1 → Round 2 (Winner/Loser Split)

After Round 1, courts are divided into "Winner Courts" (1-4) and "Loser Courts" (5-8):

```
Winner Courts (1-4): All 1st and 2nd place finishers (16 players)
Loser Courts (5-8):  All 3rd and 4th place finishers (16 players)
```

**Assignment Logic**:
```
Court 1: 1st from C1, 1st from C2, 1st from C5, 1st from C6
Court 2: 2nd from C1, 2nd from C2, 2nd from C5, 2nd from C6
Court 3: 1st from C3, 1st from C4, 1st from C7, 1st from C8
Court 4: 2nd from C3, 2nd from C4, 2nd from C7, 2nd from C8
Court 5: 3rd from C1, 3rd from C2, 3rd from C5, 3rd from C6
Court 6: 4th from C1, 4th from C2, 4th from C5, 4th from C6
Court 7: 3rd from C3, 3rd from C4, 3rd from C7, 3rd from C8
Court 8: 4th from C3, 4th from C4, 4th from C7, 4th from C8
```

### Round 2 → Round 3 (Tier Consolidation)

Players consolidate further within their tier:

```
Courts 1-2: 1st/2nd from Courts 1-4 (top 8 of winners)
Courts 3-4: 3rd/4th from Courts 1-4 (bottom 8 of winners)
Courts 5-6: 1st/2nd from Courts 5-8 (top 8 of losers)
Courts 7-8: 3rd/4th from Courts 5-8 (bottom 8 of losers)
```

**Assignment Logic**:
```
Court 1: 1st from C1, 1st from C2
Court 2: 2nd from C1, 2nd from C2
Court 3: 3rd from C1, 3rd from C2
Court 4: 4th from C1, 4th from C2
Court 5: 1st from C3, 1st from C4
Court 6: 2nd from C3, 2nd from C4
Court 7: 3rd from C3, 3rd from C4
Court 8: 4th from C3, 4th from C4
```

(Note: This is one possible assignment - see visualization for exact flow)

### Round 3 → Round 4 (Final Placement)

```
Court 1: 1st/2nd from Courts 1-2 → Places 1-4
Court 2: 3rd/4th from Courts 1-2 → Places 5-8
Court 3: 1st/2nd from Courts 3-4 → Places 9-12
Court 4: 3rd/4th from Courts 3-4 → Places 13-16
Court 5: 1st/2nd from Courts 5-6 → Places 17-20
Court 6: 3rd/4th from Courts 5-6 → Places 21-24
Court 7: 1st/2nd from Courts 7-8 → Places 25-28
Court 8: 3rd/4th from Courts 7-8 → Places 29-32
```

### Final Standings

| Court | 1st Place | 2nd Place | 3rd Place | 4th Place |
|-------|-----------|-----------|-----------|-----------|
| 1 | #1 | #2 | #3 | #4 |
| 2 | #5 | #6 | #7 | #8 |
| 3 | #9 | #10 | #11 | #12 |
| 4 | #13 | #14 | #15 | #16 |
| 5 | #17 | #18 | #19 | #20 |
| 6 | #21 | #22 | #23 | #24 |
| 7 | #25 | #26 | #27 | #28 |
| 8 | #29 | #30 | #31 | #32 |

## Preseed Format Structure (16 Players)

Similar logic but with 4 courts:

### Initial Seeding

```
Court 1: Seed 1, Seed 5, Seed 9,  Seed 13
Court 2: Seed 2, Seed 6, Seed 10, Seed 14
Court 3: Seed 3, Seed 7, Seed 11, Seed 15
Court 4: Seed 4, Seed 8, Seed 12, Seed 16
```

### Round 1 → Round 2

```
Court 1: 1st from C1, 1st from C2 → Places 1-4 (after round 3)
Court 2: 2nd from C1, 2nd from C2 → Places 5-8
Court 3: 3rd from C1, 3rd from C2 → Places 9-12
Court 4: 4th from C1, 4th from C2 → Places 13-16
(Same pattern from C3, C4)
```

### Round 2 → Round 3

Final placement courts:
```
Court 1: 1st/2nd from C1-C2 top tier
Court 2: 3rd/4th from C1-C2
Court 3: 1st/2nd from C3-C4
Court 4: 3rd/4th from C3-C4
```

## Random Seed Format (16 or 32 Players)

The existing format with ladder redistribution:

### Initial Seeding
- Random assignment, or manual placement by organizer
- No points required

### Redistribution
- **Round 1 → Round 2**: Vertical seeding (all 1st places to Court 1, etc.)
- **Round 2+**: Ladder (2 up, 2 down between adjacent courts)

## Database Schema Extensions

```typescript
// tournament table
{
  id: serial().primaryKey(),
  orgId: text().notNull(),
  name: text().notNull(),
  status: text().notNull().default('draft'),
  currentRound: integer().default(0),
  numRounds: integer().notNull().default(3),
  formatType: text().notNull().default('random-seed'), // 'random-seed' | 'preseed'
  playerCount: integer().notNull().default(16),        // 16 or 32
  physicalCourts: integer().notNull().default(4),     // virtual courts / 2
  createdAt: timestamp().defaultNow()
}

// player table
{
  id: serial().primaryKey(),
  tournamentId: integer().notNull(),
  name: text().notNull(),
  seedPoints: integer(),    // Required for preseed format
  seedRank: integer(),      // Calculated seed position
}

// courtRotation - same schema, just more rows for 8 courts
{
  id: serial().primaryKey(),
  tournamentId: integer().notNull(),
  roundNumber: integer().notNull(),
  courtNumber: integer().notNull(), // 1-4 (16 players) or 1-8 (32 players)
  player1Id: integer().notNull(),
  player2Id: integer().notNull(),
  player3Id: integer().notNull(),
  player4Id: integer().notNull()
}

// scheduleSlot (new) - for virtual court scheduling
{
  id: serial().primaryKey(),
  tournamentId: integer().notNull(),
  roundNumber: integer().notNull(),
  slotNumber: integer().notNull(),      // 1 or 2 (first/second half of round)
  courtNumbers: integer[].notNull(),    // Which courts play in this slot
}
```

## Redistribution Algorithms

### Preseed Redistribution (32 Players)

```typescript
function redistributePreseed32(
  courtResults: CourtResult[],
  currentRound: number
): CourtAssignment[] {
  
  if (currentRound === 1) {
    // Round 1 → Round 2: Winner/Loser split
    return redistributeRound1To2(courtResults);
  }
  
  if (currentRound === 2) {
    // Round 2 → Round 3: Tier consolidation
    return redistributeRound2To3(courtResults);
  }
  
  if (currentRound === 3) {
    // Round 3 → Round 4: Final placement
    return redistributeRound3To4(courtResults);
  }
  
  return [];
}

function redistributeRound1To2(results: CourtResult[]): CourtAssignment[] {
  const byPosition = { 1: [], 2: [], 3: [], 4: [] };
  
  for (const court of results.sort((a, b) => a.courtNumber - b.courtNumber)) {
    byPosition[1].push(court.standings[0]);
    byPosition[2].push(court.standings[1]);
    byPosition[3].push(court.standings[2]);
    byPosition[4].push(court.standings[3]);
  }
  
  return [
    { court: 1, players: [byPosition[1][0], byPosition[1][1], byPosition[1][4], byPosition[1][5]] },
    { court: 2, players: [byPosition[2][0], byPosition[2][1], byPosition[2][4], byPosition[2][5]] },
    { court: 3, players: [byPosition[1][2], byPosition[1][3], byPosition[1][6], byPosition[1][7]] },
    { court: 4, players: [byPosition[2][2], byPosition[2][3], byPosition[2][6], byPosition[2][7]] },
    { court: 5, players: [byPosition[3][0], byPosition[3][1], byPosition[3][4], byPosition[3][5]] },
    { court: 6, players: [byPosition[4][0], byPosition[4][1], byPosition[4][4], byPosition[4][5]] },
    { court: 7, players: [byPosition[3][2], byPosition[3][3], byPosition[3][6], byPosition[3][7]] },
    { court: 8, players: [byPosition[4][2], byPosition[4][3], byPosition[4][6], byPosition[4][7]] },
  ];
}
```

### Random Seed Redistribution (Ladder)

```typescript
function redistributeLadder(
  courtResults: CourtResult[],
  isFirstRound: boolean,
  courtCount: number
): CourtAssignment[] {
  
  if (isFirstRound) {
    // Vertical seeding: all 1st places to Court 1, etc.
    const byRank: Record<number, Player[]> = {};
    for (let i = 1; i <= 4; i++) byRank[i] = [];
    
    for (const court of courtResults) {
      for (let i = 0; i < 4; i++) {
        byRank[i + 1].push(court.standings[i]);
      }
    }
    
    return Array.from({ length: courtCount }, (_, i) => ({
      court: i + 1,
      players: byRank[i + 1]
    }));
  }
  
  // Ladder: 2 up, 2 down
  const sorted = courtResults.sort((a, b) => a.courtNumber - b.courtNumber);
  
  return sorted.map((court, idx) => {
    const assignments: Player[] = [];
    
    // Keep middle players (positions vary by court position)
    if (idx === 0) {
      // Top court: keep 1st/2nd, get 1st/2nd from court below
      assignments.push(
        ...court.standings.slice(0, 2),
        ...sorted[1].standings.slice(0, 2)
      );
    } else if (idx === courtCount - 1) {
      // Bottom court: keep 3rd/4th, get 3rd/4th from court above
      assignments.push(
        ...sorted[idx - 1].standings.slice(2, 4),
        ...court.standings.slice(2, 4)
      );
    } else {
      // Middle courts: get from above and below
      assignments.push(
        ...sorted[idx - 1].standings.slice(2, 4),
        ...sorted[idx + 1].standings.slice(0, 2)
      );
    }
    
    return { court: idx + 1, players: assignments };
  });
}
```

## Virtual Court Scheduling

```typescript
function generateSchedule(
  tournamentId: number,
  roundNumber: number,
  courtCount: number
): ScheduleSlot[] {
  const physicalCourts = courtCount / 2;
  
  return [
    {
      tournamentId,
      roundNumber,
      slotNumber: 1,
      courtNumbers: Array.from({ length: physicalCourts }, (_, i) => i + 1)
    },
    {
      tournamentId,
      roundNumber,
      slotNumber: 2,
      courtNumbers: Array.from({ length: physicalCourts }, (_, i) => i + physicalCourts + 1)
    }
  ];
}
```

## UI Mockup: Tournament Creation

```
Create Tournament

Name: [Beach Bash 2024]

Format:
  ○ Random Seed (existing format, ladder redistribution)
  ● Preseed (points-based seeding, tiered redistribution)

Players:
  ○ 16 players (4 courts / 2 physical)
  ● 32 players (8 courts / 4 physical)

Number of Rounds: [4]

[Continue →]
```

## UI Mockup: Player Seeding (Preseed Format)

```
Player Seeding - Preseed Format

Enter players with their current points:
(Format: Name, Points - one per line, 32 required)

Alice Anderson, 1250
Bob Brown, 1180
Carol Chen, 1150
...

[Validate Count] [Import CSV]

Seeding Preview:
┌─────────────────────────────────────────────┐
│ Court 1: Alice (1), Ivan (9), Quinn (17), Yuki (25)
│ Court 2: Bob (2), Julia (10), Rosa (18), Zach (26)
│ ...
└─────────────────────────────────────────────┘

[Start Tournament]
```

## UI Mockup: Schedule View

```
Round 1 Schedule

Slot 1 (Courts 1-4 active, Courts 5-8 on break):
  Court 1: Alice, Ivan, Quinn, Yuki
  Court 2: Bob, Julia, Rosa, Zach
  Court 3: Carol, Kevin, Sam, Amy
  Court 4: David, Leo, Tina, Ben

Slot 2 (Courts 5-8 active, Courts 1-4 on break):
  Court 5: Emma, Mike, Uma, Chris
  Court 6: Frank, Nancy, Victor, Diana
  Court 7: Grace, Oscar, Wendy, Eric
  Court 8: Henry, Paula, Xavier, Fiona
```

## Implementation Plan

### Phase 1: Database & Types
1. Add `formatType`, `playerCount`, `physicalCourts` to tournament schema
2. Add `seedPoints`, `seedRank` to player schema
3. Create `scheduleSlot` table
4. Update TypeScript types

### Phase 2: Seeding System
1. Create seeding input UI (name + points)
2. Implement seed calculation and ranking
3. Implement snake-pattern court distribution
4. Validation for exact player count with points

### Phase 3: Redistribution Engine
1. Create `RedistributionStrategy` interface
2. Implement `PreseedRedistribution` (for preseed format)
3. Refactor existing logic into `LadderRedistribution` (for random-seed)
4. Support both 16 and 32 player variants

### Phase 4: Scheduling
1. Generate schedule slots for virtual courts
2. Display schedule view showing active/break courts
3. Update court view to show current slot status

### Phase 5: UI Updates
1. Format selection at tournament creation
2. Conditional seeding input (required for preseed)
3. Schedule visualization
4. Final standings by placement

### Phase 6: Testing
1. Unit tests for seeding algorithm (16 and 32 players)
2. Unit tests for preseed redistribution (all transitions)
3. Unit tests for ladder redistribution (16 and 32 players)
4. Schedule generation tests
5. Full tournament simulation tests

## Acceptance Criteria

- [ ] Can select format type: Random Seed or Preseed
- [ ] Can select player count: 16 or 32
- [ ] Random Seed works without points (existing behavior)
- [ ] Preseed requires points input for all players
- [ ] Seeding distributes players in snake pattern
- [ ] Preseed redistribution works for all rounds (32 players)
- [ ] Preseed redistribution works for all rounds (16 players)
- [ ] Ladder redistribution works for 32 players (extended from 16)
- [ ] Virtual courts generate correct schedule slots
- [ ] Schedule view shows which courts play when
- [ ] Final standings display correct placements
- [ ] Court access tokens generated for all courts
