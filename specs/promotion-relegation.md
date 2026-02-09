# Promotion & Relegation System

## Overview

This specification defines the mathematical algorithm for moving players between courts between rounds. The system ensures competitive balance while creating a "ladder" where strong players move up and weaker players move down.

## Core Concept

**Goal**: After each round, players are redistributed based on their performance to create more competitive matchups in subsequent rounds.

**Key Principles**:
1. Top performers move up to higher courts
2. Bottom performers move down to lower courts
3. Court 1 is the "Winners Court" (highest competition)
4. Court 4 is for developing players or those having a tough day
5. Exactly 4 players per court always maintained

## Transition Rules

### Round 1 → Round 2: The Seeding Round

**Purpose**: Sort players by skill level to establish initial hierarchy.

**Logic**: Vertical redistribution based on placement

```
Previous Round Courts:        Next Round Courts:
┌─────────┬─────────┐        ┌─────────┬─────────┐
│ Court 1 │ Court 2 │        │ Court 1 │ Court 2 │
├─────────┼─────────┤   →    ├─────────┼─────────┤
│ 1st: A  │ 1st: E  │        │ A, E, I,│ B, F, J,│
│ 2nd: B  │ 2nd: F  │        │ M       │ N       │
│ 3rd: C  │ 3rd: G  │        ├─────────┼─────────┤
│ 4th: D  │ 4th: H  │        │ C, G, K,│ D, H, L,│
└─────────┴─────────┘        │ O       │ P       │
┌─────────┬─────────┐        └─────────┴─────────┘
│ Court 3 │ Court 4 │
├─────────┼─────────┤
│ 1st: I  │ 1st: M  │
│ 2nd: J  │ 2nd: N  │
│ 3rd: K  │ 3rd: O  │
│ 4th: L  │ 4th: P  │
└─────────┴─────────┘
```

**Algorithm**:
```
Court 1 (new) = All 1st place players from Courts 1-4
Court 2 (new) = All 2nd place players from Courts 1-4
Court 3 (new) = All 3rd place players from Courts 1-4
Court 4 (new) = All 4th place players from Courts 1-4
```

**Implementation**:
```typescript
function seedingRedistribution(
  previousRoundCourts: CourtResult[]
): CourtAssignment[] {
  const placements: { [placement: number]: number[] } = {
    1: [], 2: [], 3: [], 4: []
  };
  
  // Group player IDs by their placement (1st, 2nd, 3rd, 4th)
  for (const court of previousRoundCourts) {
    for (let i = 0; i < 4; i++) {
      const player = court.standings[i];
      placements[player.rank].push(player.playerId);
    }
  }
  
  // Create new court assignments
  return [
    { courtNumber: 1, playerIds: placements[1] },
    { courtNumber: 2, playerIds: placements[2] },
    { courtNumber: 3, playerIds: placements[3] },
    { courtNumber: 4, playerIds: placements[4] }
  ];
}
```

### Round 2+ → Next Round: The Ladder

**Purpose**: Maintain competitive balance with gradual movement.

**Logic**: Horizontal mixing with vertical movement

```
Incoming/Outgoing Flow:

Court 1 (Top):
  OUT: Bottom 2 players → Court 2
  IN: Top 2 from Court 2
  STAY: Top 2 remain

Court 2:
  OUT: Top 2 → Court 1, Bottom 2 → Court 3
  IN: Bottom 2 from Court 1, Top 2 from Court 3
  
Court 3:
  OUT: Top 2 → Court 2, Bottom 2 → Court 4
  IN: Bottom 2 from Court 2, Top 2 from Court 4
  
Court 4 (Bottom):
  OUT: Top 2 players → Court 3
  IN: Bottom 2 from Court 3
  STAY: Bottom 2 remain
```

**Visual Representation**:
```
Round N Courts:                    Round N+1 Courts:
┌─────────┐                        ┌─────────┐
│ Court 1 │ 1st, 2nd ────────────►│ Court 1 │ 1st, 2nd (stayed)
│         │ 3rd, 4th ──┐   ┌─────│         │ 3rd, 4th (from C2)
└─────────┘            │   │      └─────────┘
                       ▼   ▲
┌─────────┐        ┌─────────┐     ┌─────────┐
│ Court 2 │ 1st, 2nd┤         │1st,2nd Court 2│
│         │ 3rd, 4th┤         │3rd,4th        │
└─────────┘        └─────────┘     └─────────┘
                       ▲   ▼
┌─────────┐            │   │      ┌─────────┐
│ Court 3 │ 1st, 2nd ──┘   └─────│ Court 3 │
│         │ 3rd, 4th ────────────►│         │
└─────────┘                        └─────────┘
                       ▲   ▼
┌─────────┐            │   │      ┌─────────┐
│ Court 4 │ 1st, 2nd ──┘   └─────│ Court 4 │
│         │ 3rd, 4th (stayed)────►│         │
└─────────┘                        └─────────┘
```

**Algorithm**:
```typescript
function ladderRedistribution(
  previousRoundCourts: CourtResult[]
): CourtAssignment[] {
  // Sort courts by court number
  const courts = previousRoundCourts.sort((a, b) => 
    a.courtNumber - b.courtNumber
  );
  
  const newAssignments: CourtAssignment[] = [];
  
  // Court 1: Keep top 2, get top 2 from Court 2
  newAssignments.push({
    courtNumber: 1,
    playerIds: [
      ...courts[0].standings.slice(0, 2).map(s => s.playerId), // Top 2 stay
      ...courts[1].standings.slice(0, 2).map(s => s.playerId)  // Top 2 from C2 move up
    ]
  });
  
  // Court 2: Get bottom 2 from C1, keep middle? No...
  // Actually: bottom 2 from C1 + top 2 from C3
  newAssignments.push({
    courtNumber: 2,
    playerIds: [
      ...courts[0].standings.slice(2, 4).map(s => s.playerId), // Bottom 2 from C1
      ...courts[2].standings.slice(0, 2).map(s => s.playerId)  // Top 2 from C3 move up
    ]
  });
  
  // Court 3: Get bottom 2 from C2, top 2 from C4
  newAssignments.push({
    courtNumber: 3,
    playerIds: [
      ...courts[1].standings.slice(2, 4).map(s => s.playerId), // Bottom 2 from C2
      ...courts[3].standings.slice(0, 2).map(s => s.playerId)  // Top 2 from C4 move up
    ]
  });
  
  // Court 4: Get bottom 2 from C3, keep bottom 2? No...
  // Actually: bottom 2 from C3 + bottom 2 stay
  newAssignments.push({
    courtNumber: 4,
    playerIds: [
      ...courts[2].standings.slice(2, 4).map(s => s.playerId), // Bottom 2 from C3
      ...courts[3].standings.slice(2, 4).map(s => s.playerId)  // Bottom 2 stay
    ]
  });
  
  return newAssignments;
}
```

## Implementation Details

### Data Structures

**Court Result** (from previous round):
```typescript
interface CourtResult {
  courtNumber: number;
  tournamentId: number;
  roundNumber: number;
  standings: PlayerStanding[]; // Sorted 1st-4th
}
```

**Court Assignment** (for next round):
```typescript
interface CourtAssignment {
  courtNumber: number;
  playerIds: number[]; // Exactly 4 players
}
```

### Close Round Process

**Step-by-Step**:

1. **Validate Round Completion**:
   ```typescript
   // Check all matches in all courts are complete
   const incompleteCourts = await checkIncompleteCourts(tournamentId, roundNumber);
   if (incompleteCourts.length > 0) {
     throw new Error(`Courts not ready: ${incompleteCourts.join(', ')}`);
   }
   ```

2. **Calculate Standings**:
   ```typescript
   // For each court, calculate final standings
   const courtResults: CourtResult[] = [];
   for (let courtNum = 1; courtNum <= 4; courtNum++) {
     const matches = await getCourtMatches(tournamentId, roundNumber, courtNum);
     const standings = calculateStandings(matches);
     courtResults.push({
       courtNumber: courtNum,
       tournamentId,
       roundNumber,
       standings
     });
   }
   ```

3. **Determine Next Round Assignments**:
   ```typescript
   const isFirstRound = roundNumber === 1;
   const assignments = isFirstRound 
     ? seedingRedistribution(courtResults)
     : ladderRedistribution(courtResults);
   ```

4. **Create Court Rotation Records**:
   ```typescript
   const nextRound = roundNumber + 1;
   for (const assignment of assignments) {
     await db.insert(courtRotation).values({
       tournamentId,
       roundNumber: nextRound,
       courtNumber: assignment.courtNumber,
       player1Id: assignment.playerIds[0],
       player2Id: assignment.playerIds[1],
       player3Id: assignment.playerIds[2],
       player4Id: assignment.playerIds[3]
     });
   }
   ```

5. **Create Match Records**:
   ```typescript
   // For each court rotation, create 3 matches
   for (const assignment of assignments) {
     const rotation = await getCourtRotation(tournamentId, nextRound, assignment.courtNumber);
     const [p1, p2, p3, p4] = assignment.playerIds;
     
     // Match 1: P1 & P2 vs P3 & P4
     await db.insert(match).values({
       courtRotationId: rotation.id,
       matchNumber: 1,
       teamAPlayer1Id: p1,
       teamAPlayer2Id: p2,
       teamBPlayer1Id: p3,
       teamBPlayer2Id: p4
     });
     
     // Match 2: P1 & P3 vs P2 & P4
     await db.insert(match).values({
       courtRotationId: rotation.id,
       matchNumber: 2,
       teamAPlayer1Id: p1,
       teamAPlayer2Id: p3,
       teamBPlayer1Id: p2,
       teamBPlayer2Id: p4
     });
     
     // Match 3: P1 & P4 vs P2 & P3
     await db.insert(match).values({
       courtRotationId: rotation.id,
       matchNumber: 3,
       teamAPlayer1Id: p1,
       teamAPlayer2Id: p4,
       teamBPlayer1Id: p2,
       teamBPlayer2Id: p3
     });
   }
   ```

6. **Generate New Court Access Tokens**:
   ```typescript
   for (const assignment of assignments) {
     const rotation = await getCourtRotation(tournamentId, nextRound, assignment.courtNumber);
     const token = generateSecureToken();
     await db.insert(courtAccess).values({
       tournamentId,
       courtRotationId: rotation.id,
       accessToken: token,
       isActive: true
     });
   }
   ```

7. **Update Tournament State**:
   ```typescript
   await db.update(tournament)
     .set({ 
       currentRound: nextRound,
       status: nextRound > numRounds ? 'completed' : 'active'
     })
     .where(eq(tournament.id, tournamentId));
   ```

8. **Deactivate Old Tokens**:
   ```typescript
   await db.update(courtAccess)
     .set({ isActive: false })
     .where(and(
       eq(courtAccess.tournamentId, tournamentId),
       eq(courtAccess.roundNumber, roundNumber)
     ));
   ```

## User Interface

### Close Round Confirmation

**Modal Dialog**:
```
┌─────────────────────────────────────┐
│  Close Round 2 of 3?      [X]       │
├─────────────────────────────────────┤
│                                     │
│  All courts have reported scores.   │
│                                     │
│  Court 1 Standings:                 │
│  1. Alice (stays on C1)        ↑    │
│  2. Bob (stays on C1)          ↑    │
│  3. Carol (moves to C2)        ↓    │
│  4. David (moves to C2)        ↓    │
│                                     │
│  Court 2 Standings:                 │
│  1. Eve (moves to C1)          ↑    │
│  2. Frank (moves to C1)        ↑    │
│  ...                                │
│                                     │
│  New court assignments will be      │
│  generated with fresh QR codes.     │
│                                     │
│     [Cancel]    [Close Round →]     │
│                                     │
└─────────────────────────────────────┘
```

**Features**:
- Preview of all court standings
- Movement indicators (↑ promotion, ↓ relegation, ─ stay)
- Confirmation required (irreversible action)
- Shows consequence (new QR codes generated)

### Court Assignment Preview

**After Closing Round**:
```
┌─────────────────────────────────────┐
│  Round 3 Assignments Generated!     │
├─────────────────────────────────────┤
│                                     │
│  Players have been reassigned:      │
│                                     │
│  🏆 Court 1 (Winners Court)         │
│  Alice ──➤ Court 1 (stayed)         │
│  Bob ────➤ Court 1 (stayed)         │
│  Eve ────➤ Court 1 (from C2)        │
│  Frank ──➤ Court 1 (from C2)        │
│                                     │
│  Court 2                            │
│  Carol ──➤ Court 2 (from C1)        │
│  David ──➤ Court 2 (from C1)        │
│  Grace ──➤ Court 2 (from C3)        │
│  Henry ──➤ Court 2 (from C3)        │
│                                     │
│  ...                                │
│                                     │
│  [📱 View New QR Codes]             │
│                                     │
└─────────────────────────────────────┘
```

## Edge Cases

### Ties at Cutoff Points

**Scenario**: Court 1 has tie for 2nd/3rd place

**Rule**: Both tied players considered at the cutoff
- If 2nd and 3rd tied: Both stay on Court 1 (5 players? No...)
- Actually: System must resolve tie first (see Scoring spec)

**Resolution**:
- Ties must be resolved before closing round
- Org manually breaks tie
- Then normal promotion/relegation applies

### Early Tournament Completion

**Scenario**: Tournament set for 3 rounds, but Org wants to end after 2

**Solution**:
- Allow "Finalize Tournament" button (available anytime after Round 1)
- Skip remaining rounds
- Calculate final standings from current court positions
- Mark tournament as COMPLETED

### Player Dropout

**MVP Constraint**: No substitutions allowed

**If player drops out**:
- Tournament must continue with 15? No, system requires 16
- Org must find replacement or cancel tournament
- Future: Allow mid-tournament substitutions with penalty

## Mathematical Properties

### Convergence

**Question**: Do players eventually settle on their "correct" court?

**Answer**: With the ladder system, players should converge toward courts matching their skill level, but movement continues throughout all rounds.

**Properties**:
- Top players tend to cluster on Court 1
- Bottom players tend to cluster on Court 4
- Middle courts have the most movement
- No player is "stuck" permanently

### Fairness

**Every player**:
- Gets to play with every other player exactly once per court rotation
- Has equal opportunity to move up
- Cannot be eliminated early
- Final ranking determined by sustained performance

## Testing Strategy

### Unit Tests

1. **Seeding Redistribution**:
   - All 1st places go to Court 1
   - All 4th places go to Court 4
   - Each court has exactly 4 players
   - All 16 players assigned

2. **Ladder Redistribution**:
   - Court 1 keeps top 2, gets top 2 from C2
   - Court 4 keeps bottom 2, gets bottom 2 from C3
   - No player appears on multiple courts
   - Movement direction is correct

3. **Edge Cases**:
   - Verify no data loss
   - Handle duplicate player IDs (error)
   - Handle missing courts (error)

### Integration Tests

1. **Close Round Flow**:
   - Complete all matches
   - Trigger close round
   - Verify new rotations created
   - Verify new matches created
   - Verify new tokens generated
   - Verify tournament state updated

2. **Multi-Round Tournament**:
   - Run 3-round tournament
   - Verify player movement each round
   - Verify final standings correct
   - No player ever on 2 courts simultaneously

### E2E Tests

1. **Org closes round and sees preview**
2. **Players move to new courts with new QR codes**
3. **Complete tournament flow with promotions/relegations**

## Future Enhancements

1. **Custom Movement Rules**:
   - Allow only 1 player to move up/down
   - Swap players between adjacent courts
   - Manual override with drag-and-drop

2. **Visual Court History**:
   - Show player journey through courts
   - Animated transitions
   - "Rise and fall" visualization

3. **Statistics**:
   - Track who moved up/down most
   - Calculate "court stability" score
   - Show average court position
