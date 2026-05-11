# Incomplete Rosters: Implementation Plan & Testing

## Development Plan

### Phase 1: Tournament Logic (Pure Functions)

**Goal**: Extend `src/lib/server/tournament-logic.ts` with all redistribution algorithms for arbitrary court counts.

**Deliverables**:

1. **Recursive preseed redistribution** (`redistributePreseedRecursive`)
   - Takes `CourtResult[]`, `currentRound`, `totalRounds`
   - Implements recursive splitting: largest power-of-2 winner group + remainder loser group
   - Returns `CourtAssignment[]`
   - Pure function, no DB, no HTTP

2. **Generalized vertical seeding** (`redistributeLadder` extension)
   - Already works for 4 and 8 courts
   - Extend to support any court count (2-16)
   - The existing cascade logic should generalize naturally

3. **Generalized ladder redistribution**
   - Already works for 4 and 8 courts
   - Extend to support any court count (2-16)
   - 2-up/2-down between adjacent courts

4. **Round count calculator** (`calculateRoundCount`)
   - Input: number of courts, format type
   - Output: number of rounds needed
   - For preseed: `floor(log2(N)) + 1` plus remainder handling
   - For random seed: configurable (1-10)

5. **Leftover strategy dispatcher**
   - Input: player count, chosen strategy (mixed/parallel)
   - Output: court configuration (how many 4p, 3p, 5p, 6p courts)

**Testing**: Comprehensive unit tests for all functions (see Testing section below).

### Phase 2: Database Schema Updates

**Goal**: Extend schema to support flexible player counts and leftover strategies.

**Changes to `tournament` table**:
```typescript
// Existing columns to modify:
playerCount: integer('player_count').notNull()  // Remove default, accept 8-64

// New columns:
physicalCourtCount: integer('physical_court_count')  // Nullable, defaults to virtualCourtCount
leftoverStrategy: text('leftover_strategy').default('mixed')  // 'mixed' | 'parallel'
```

**Changes to `courtRotation` table**:
```typescript
// New column:
courtSize: integer('court_size').default(4)  // 3, 4, 5, or 6
isWaiting: boolean('is_waiting').default(false)  // For virtual courts on break
```

**Migration**: Drizzle migration to add new columns.

### Phase 3: Player Input Updates

**Goal**: Remove the 16/32 player restriction.

**Changes to `src/routes/tournament/create/+page.server.ts`**:
- Remove `if (playerCount !== 16 && playerCount !== 32)` check
- Accept any integer 8-64
- Calculate court count: `Math.ceil(playerCount / 4)`
- For preseed: auto-calculate round count

**Changes to `src/routes/tournament/[id]/players/+page.server.ts`**:
- Remove `if (allPlayers.length !== maxPlayers)` exact match check
- Allow starting with any player count 8-64
- Calculate court configuration based on leftover strategy
- Generate appropriate match assignments (3p, 4p, 5p, 6p courts)

**Changes to tournament creation UI**:
- Player count: dropdown or number input (8-64)
- Physical courts: optional input (defaults to virtual court count)
- Leftover strategy: dropdown (Mixed courts / Parallel games)

### Phase 4: Match Generation for Variable Court Sizes

**Goal**: Support generating matches for 3p, 4p, 5p, and 6p courts.

**3-player court matches**:
```
Match 1: A+B vs C
Match 2: A+C vs B
Match 3: B+C vs A
```

**5-player court matches** (parallel games):
```
Match 1: A+B vs C+D (E waits)
Match 2: A+B vs C+E (D waits)
Match 3: A+B vs D+E (C waits)
Match 4: A+C vs B+D (E waits)  — or similar rotation
```
*Exact rotation TBD — needs to ensure equal play time.*

**6-player court matches** (parallel games):
```
Match 1: A+B vs C+D (E,F wait)
Match 2: A+B vs E+F (C,D wait)
Match 3: A+C vs B+D (E,F wait)
Match 4: A+E vs B+F (C,D wait)  — or similar rotation
```
*Exact rotation TBD.*

**Schema consideration**: The `match` table currently has exactly 4 player fields (2 per team). For 5/6-player courts, we need to track which players participated in each match. Options:
- Add `participant3Id`, `participant4Id`, `participant5Id`, `participant6Id` to match table (sparse, nullable)
- Create a `matchParticipant` join table
- Keep 4 player fields but add a `waitingPlayer1Id`, `waitingPlayer2Id` field

**Recommendation**: Keep the existing 4 player fields for the active players in each match. Add `waitingPlayer1Id` and `waitingPlayer2Id` nullable fields to track who sat out each match.

### Phase 5: Close Round with Variable Court Sizes

**Goal**: Update `closeRound` action to handle non-4-player courts.

**Changes to `src/routes/tournament/[id]/+page.server.ts`**:
- `calculateCourtStandings()`: Already handles any player count (just iterates over playerIds)
- `redistributePlayers()`: Use the new recursive preseed or generalized ladder
- Match generation: use the appropriate match generator based on court size
- Handle virtual court rotation (which physical courts are active)

### Phase 6: UI Updates

**Goal**: Display variable court sizes and virtual court mapping.

**Tournament view** (`/tournament/[id]`):
- Show court cards with variable player counts
- Indicate court size (3p, 4p, 5p, 6p)
- For virtual courts: show physical court mapping and "waiting" status
- Leftover strategy override per round

**Court page** (`/court/[token]`):
- Adapt layout for 3p, 5p, 6p courts
- Show correct number of match cards
- Adjust standings display

**Standings page** (`/tournament/[id]/standings`):
- Handle variable court sizes in final placement
- A 1st place on a 3p court is still 1st place

---

## Unit Testing Strategy

All redistribution, seeding, and tiebreaking logic must be unit-tested with Vitest before touching the UI. Table-driven tests covering edge cases are the right approach.

### Test Architecture

Pure functions in `src/lib/server/tournament-logic.ts` should handle all redistribution. Each function takes `CourtResult[]` + config and returns `CourtAssignment[]`. No DB, no Svelte, no HTTP — just data transformations.

### Table: Recursive Preseed Splitting

| Test Name | Courts | Round | Expected Winner Courts | Expected Loser Courts |
|-----------|--------|-------|----------------------|----------------------|
| `preseed-3courts-r1` | 3 | 1→2 | 2 courts (1st-2nd places) | 1 court (3rd-4th places) |
| `preseed-5courts-r1` | 5 | 1→2 | 4 courts (top performers) | 1 court (remainder) |
| `preseed-6courts-r1` | 6 | 1→2 | 4 courts | 2 courts |
| `preseed-7courts-r1` | 7 | 1→2 | 4 courts | 3 courts |
| `preseed-9courts-r1` | 9 | 1→2 | 8 courts | 1 court |
| `preseed-10courts-r1` | 10 | 1→2 | 8 courts | 2 courts |
| `preseed-12courts-r1` | 12 | 1→2 | 8 courts | 4 courts |
| `preseed-16courts-r1` | 16 | 1→2 | 8 courts | 8 courts |

### Table: Recursive Preseed — Full Tournament Flow

| Test Name | Start Courts | Expected Rounds | Final Placement |
|-----------|-------------|-----------------|-----------------|
| `preseed-3-full` | 3 | 3 | C1: 1-4, C2: 5-8, C3: 9-12 |
| `preseed-5-full` | 5 | 4 | C1: 1-4, ..., C5: 17-20 |
| `preseed-6-full` | 6 | 4 | C1: 1-4, ..., C6: 21-24 |
| `preseed-7-full` | 7 | 4 | C1: 1-4, ..., C7: 25-28 |
| `preseed-9-full` | 9 | 5 | C1: 1-4, ..., C9: 33-36 |
| `preseed-10-full` | 10 | 5 | C1: 1-4, ..., C10: 37-40 |

### Table: Vertical Seeding (Random Seed, Round 1 to 2)

For each court count N, given N courts with known standings, verify the cascade produces the correct court assignments.

| Test Name | Courts | Expected C1 | Expected C2 | ... |
|-----------|--------|-------------|-------------|-----|
| `vertical-2courts` | 2 | P1,P2,P5,P6 | P3,P4,P7,P8 | — |
| `vertical-3courts` | 3 | P1,P2,P3,P5 | P4,P6,P7,P9 | P8,P10,P11,P12 |
| `vertical-5courts` | 5 | First 4 firsts | 1st+3 best 2nds | ... |
| `vertical-6courts` | 6 | First 4 firsts | 2 firsts+2 best 2nds | ... |
| `vertical-7courts` | 7 | First 4 firsts | 3 firsts+1 best 2nd | ... |
| `vertical-9courts` | 9 | First 4 firsts | ... | ... |
| `vertical-12courts` | 12 | First 4 firsts | ... | ... |
| `vertical-16courts` | 16 | First 4 firsts | ... | ... |

### Table: Ladder Redistribution (Random Seed, Round 2+)

| Test Name | Courts | Focus | Assertion |
|-----------|--------|-------|-----------|
| `ladder-2courts-top` | 2 | C1 | Keeps top 2 + gets top 2 from C2 |
| `ladder-2courts-bottom` | 2 | C2 | Keeps bottom 2 + gets bottom 2 from C1 |
| `ladder-3courts-top` | 3 | C1 | Keeps top 2 + gets top 2 from C2 |
| `ladder-3courts-middle` | 3 | C2 | Gets bottom 2 from C1 + top 2 from C3 |
| `ladder-3courts-bottom` | 3 | C3 | Keeps bottom 2 + gets bottom 2 from C2 |
| `ladder-5courts-middle` | 5 | C3 | Gets bottom 2 from C2 + top 2 from C4 |
| `ladder-7courts-bottom` | 7 | C7 | Keeps bottom 2 + gets bottom 2 from C6 |
| `ladder-9courts-middle` | 9 | C5 | Gets bottom 2 from C4 + top 2 from C6 |
| `ladder-16courts-top` | 16 | C1 | Keeps top 2 + gets top 2 from C2 |

### Table: Round Count Calculator

| Test Name | Courts | Format | Expected Rounds |
|-----------|--------|--------|-----------------|
| `rounds-2-preseed` | 2 | preseed | 2 |
| `rounds-3-preseed` | 3 | preseed | 3 |
| `rounds-4-preseed` | 4 | preseed | 3 |
| `rounds-5-preseed` | 5 | preseed | 4 |
| `rounds-6-preseed` | 6 | preseed | 4 |
| `rounds-7-preseed` | 7 | preseed | 4 |
| `rounds-8-preseed` | 8 | preseed | 4 |
| `rounds-9-preseed` | 9 | preseed | 5 |
| `rounds-16-preseed` | 16 | preseed | 5 |

### Table: Standings Calculation + Tiebreaking

| Test Name | Players | Matches | Scenario | Expected |
|-----------|---------|---------|----------|----------|
| `standings-basic` | 4 | 3 | Clear winner | Highest total points first |
| `standings-tie-points` | 4 | 3 | Same points, different diff | Higher diff wins |
| `standings-tie-points-diff` | 4 | 3 | Same points and diff | Lower playerId wins |
| `standings-all-tied` | 4 | 3 | All same | Sorted by playerId |
| `standings-missing-scores` | 4 | 2 | 2 of 3 matches | Unscored = 0 for all |
| `standings-3player` | 3 | 3 | 3-player court | Same formula |
| `standings-5player` | 5 | 4 | 5-player parallel | Same formula, 5 rankings |
| `standings-6player` | 6 | 4 | 6-player parallel | Same formula, 6 rankings |

### Table: Leftover Strategy Dispatcher

| Test Name | Players | Strategy | Expected 4p Courts | Expected 3p Courts | Expected 5p Courts | Expected 6p Courts |
|-----------|---------|----------|-------------------|-------------------|-------------------|-------------------|
| `leftover-9-mixed` | 9 | mixed | 1 | 1 | 0 | 0 |
| `leftover-11-mixed` | 11 | mixed | 2 | 1 | 0 | 0 |
| `leftover-13-mixed` | 13 | mixed | 2 | 1 | 0 | 0 |
| `leftover-9-parallel` | 9 | parallel | 1 | 0 | 1 | 0 |
| `leftover-10-parallel` | 10 | parallel | 1 | 0 | 0 | 1 |
| `leftover-11-parallel` | 11 | parallel | 2 | 0 | 1 | 0 |
| `leftover-31-mixed` | 31 | mixed | 7 | 1 | 0 | 0 |
| `leftover-31-parallel` | 31 | parallel | 7 | 0 | 1 | 0 |
| `leftover-33-mixed` | 33 | mixed | 8 | 1 | 0 | 0 |
| `leftover-63-mixed` | 63 | mixed | 15 | 1 | 0 | 0 |

---

## Open Questions & Loopholes

### Decided

1. ~~Should preseed be restricted to power-of-2 court counts?~~ **No.** Recursive splitting works for any court count.
2. ~~Should we use rotating sit-outs?~~ **No.** Eliminated in favor of Option B (mixed) and Option D (parallel).
3. ~~Which redistribution strategy for mixed courts?~~ **Strategy 3: Accept asymmetry.** Bottom courts are always incomplete.

### Open

1. **Virtual court rotation**: Should the waiting rotation be random, or based on standings (lower-ranked players wait first)? Waiting first means less play time but also less fatigue.

2. **5/6-player match rotation**: What is the exact match rotation for 5 and 6 player courts that ensures equal play time? Need to design and test this carefully.

3. **Preseed with incomplete courts**: When a preseed tournament has mixed courts (3p + 4p), how does the recursive split handle the 3-player court? Does it get lumped into the loser group, or treated specially?

4. **Per-round strategy override**: How does the UI work? A dropdown per round on the tournament page? Or a separate "configure round" modal?

5. **Standings with variable court sizes**: The current standings logic assumes court 1 = places 1-4, court 2 = places 5-8, etc. With variable court sizes (3p, 5p, 6p), the placement calculation needs adjustment. A 3-player court only produces 3 placements, not 4.

6. **Database migration**: How to handle existing tournaments (16/32 players) during migration? They should continue to work unchanged.

7. **Score validation for 5/6-player courts**: Currently validated at 21 points, win by 2. For 15-point parallel games, need separate validation rules.

8. **Physical court mapping UI**: How to display which virtual court maps to which physical court? A simple mapping table during tournament setup?

9. **Late arrivals / early departures**: With virtual courts, what happens if a player leaves mid-tournament? Do they get removed from the rotation, or does their spot stay empty?

10. **Tiebreaker for cut boundary (Option E generalized)**: When cutting between winner/loser groups, if two players have the same rank on different courts, how do we break the tie? Points → diff → playerId, but rank on court comes first.

11. **Match generation for 3-player courts**: The `match` table has 4 player fields. For 3-player courts, one team has only 1 player. Need to handle the "single player" team correctly in the schema and UI.

12. **Consolation bracket for losers**: In the recursive preseed, the loser group plays their own mini-tournament. Should these be labeled as "consolation" in the UI, or just shown as lower courts?
