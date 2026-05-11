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
   - For preseed: `floor(log2(N-1)) + 2` for N >= 2
   - For random seed: configurable (1-10)

5. **Court configuration calculator** (`getCourtConfiguration`)
   - Input: player count
   - Output: court configuration (how many 4p courts + bottom court type)
   - Logic: `playerCount % 4` determines the bottom court (0=none, 1=5p, 2=6p, 3=3p)
   - No strategy choice — it's deterministic

**Testing**: Comprehensive unit tests for all functions (see Testing section below).

### Phase 2: Database Schema Updates

**Goal**: Extend schema to support flexible player counts and new court types.

**Changes to `tournament` table**:
```typescript
// Existing columns to modify:
playerCount: integer('player_count').notNull()  // Remove default, accept 8-64

// New columns:
physicalCourtCount: integer('physical_court_count')  // Nullable, defaults to virtualCourtCount
```

**Changes to `courtRotation` table**:
```typescript
// New column:
courtSize: integer('court_size').default(4)  // 3, 4, 5, or 6
isWaiting: boolean('is_waiting').default(false)  // For virtual courts on break
```

**New tables** (see Phase 4 for full schemas):
- `match3Player` — for 3-player courts (2v1 format)
- `match5Player` — for 5-player courts (parallel games)
- `match6Player` — for 6-player courts (parallel games)

Existing `match` table is unchanged (4-player courts only).

**Migration**: Drizzle migration to add new columns and tables.

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
- Calculate court configuration from player count
- Generate appropriate match assignments (3p, 4p, 5p, 6p courts)

**Changes to tournament creation UI**:
- Physical courts: input (number of actual courts at venue)
- Player input: paste names (random seed) or names + points (preseed)
- System calculates court configuration from player count
- Show court configuration preview before starting

### Phase 4: Match Generation for Variable Court Sizes

**Goal**: Support generating matches for 3p, 4p, 5p, and 6p courts.

**3-player court matches**:
```
Match 1: A+B vs C
Match 2: A+C vs B
Match 3: B+C vs A
```

**5-player court matches** (2 runs × 2 parallel games = 4 games):

Run 1: A+B fixed on side X, C fixed on side Y, D/E rotate every point.
```
Game 1: A+B vs C+D (scored when D on court)
Game 2: A+B vs C+E (scored when E on court)
```

Run 2: D+E fixed on side X, B fixed on side Y, A/C rotate every point.
```
Game 3: D+E vs B+A (scored when A on court)
Game 4: D+E vs B+C (scored when C on court)
```

Roles randomized each round. One player plays 4 games, others play 3. Ranking by average points per game.

**6-player court matches** (2 runs × 2 parallel games = 4 games):

Run 1: A+B fixed on side X, C+D and E+F rotate every point.
```
Game 1: A+B vs C+D (scored when C+D on court)
Game 2: A+B vs E+F (scored when E+F on court)
```

Run 2: C+D fixed on side X, A+B and E+F rotate every point.
```
Game 3: C+D vs A+B (scored when A+B on court)
Game 4: C+D vs E+F (scored when E+F on court)
```

Roles randomized each round. Some players play 3, others play 2. Ranking by average points per game.

**Schema**: Instead of reusing the existing `match` table (designed for 2v2), create separate tables per court type. This avoids if-cascades in all layers (DB queries, server logic, UI components).

**Existing table** (unchanged):
```typescript
// match — for 4-player courts (2v2)
{
  id: serial('id').primaryKey(),
  courtRotationId: integer('court_rotation_id').notNull(),
  matchNumber: integer('match_number').notNull(),
  teamAPlayer1Id: integer('team_a_player_1_id').notNull(),
  teamAPlayer2Id: integer('team_a_player_2_id').notNull(),
  teamBPlayer1Id: integer('team_b_player_1_id').notNull(),
  teamBPlayer2Id: integer('team_b_player_2_id').notNull(),
  teamAScore: integer('team_a_score'),
  teamBScore: integer('team_b_score')
}
```

**New table for 3-player courts**:
```typescript
// match3Player — 2v1 format, 3 matches per round
{
  id: serial('id').primaryKey(),
  courtRotationId: integer('court_rotation_id').notNull(),
  matchNumber: integer('match_number').notNull(),  // 1, 2, 3
  teamOfTwoPlayer1Id: integer('team_of_two_player_1_id').notNull(),
  teamOfTwoPlayer2Id: integer('team_of_two_player_2_id').notNull(),
  soloPlayerId: integer('solo_player_id').notNull(),
  teamOfTwoScore: integer('team_of_two_score'),
  soloPlayerScore: integer('solo_player_score')
}
```

**New table for 5-player courts**:
```typescript
// match5Player — parallel games, 4 games per round (2 runs × 2 games)
{
  id: serial('id').primaryKey(),
  courtRotationId: integer('court_rotation_id').notNull(),
  gameNumber: integer('game_number').notNull(),  // 1, 2, 3, 4
  runNumber: integer('run_number').notNull(),    // 1 or 2
  sideXPlayer1Id: integer('side_x_player_1_id').notNull(),  // fixed team
  sideXPlayer2Id: integer('side_x_player_2_id').notNull(),
  sideYFixedPlayerId: integer('side_y_fixed_player_id').notNull(),
  sideYRotatingPlayerId: integer('side_y_rotating_player_id').notNull(),
  sideXScore: integer('side_x_score'),
  sideYScore: integer('side_y_score')
}
```

**New table for 6-player courts**:
```typescript
// match6Player — parallel games, 4 games per round (2 runs × 2 games)
{
  id: serial('id').primaryKey(),
  courtRotationId: integer('court_rotation_id').notNull(),
  gameNumber: integer('game_number').notNull(),  // 1, 2, 3, 4
  runNumber: integer('run_number').notNull(),    // 1 or 2
  fixedTeamPlayer1Id: integer('fixed_team_player_1_id').notNull(),
  fixedTeamPlayer2Id: integer('fixed_team_player_2_id').notNull(),
  rotatingTeamPlayer1Id: integer('rotating_team_player_1_id').notNull(),
  rotatingTeamPlayer2Id: integer('rotating_team_player_2_id').notNull(),
  fixedTeamScore: integer('fixed_team_score'),
  rotatingTeamScore: integer('rotating_team_score')
}
```

**Benefits**:
- Each table has exactly the fields needed — no nullable columns
- Each court type has its own UI component — no conditional rendering
- Each court type has its own score validation logic
- Each court type has its own standings calculation
- Clean separation, easy to extend if new court types are needed

**Trade-off**: More tables and more code, but each piece is simpler and self-contained.

### Phase 5: Close Round with Variable Court Sizes

**Goal**: Update `closeRound` action to handle non-4-player courts.

**Changes to `src/routes/tournament/[id]/+page.server.ts`**:
- `calculateCourtStandings()`: Existing for 4p. Create `calculateCourtStandings3p()`, `calculateCourtStandings5p()`, `calculateCourtStandings6p()`
- `redistributePlayers()`: Use the new recursive preseed or generalized ladder
- Match generation: use the appropriate match generator based on court size
- Handle virtual court rotation (which physical courts are active)
- Query the correct match table based on `courtRotation.courtSize`

### Phase 6: UI Updates

**Goal**: Display variable court sizes, virtual court mapping, and max achievable places.

**Tournament view** (`/tournament/[id]`):
- Show court cards with variable player counts
- Indicate court size (3p, 4p, 5p, 6p)
- For virtual courts: show physical court mapping per shift
- Court configuration: system calculates from player count + physical courts
- Show max achievable final place for each player from current position

**Court page** (`/court/[token]`):
- Adapt layout for 3p, 5p, 6p courts
- Show correct number of match cards
- Adjust standings display (using cross-court-size normalization)

**Standings page** (`/tournament/[id]/standings`):
- Handle variable court sizes in final placement (3p → 1st/2nd/4th mapping)
- Show max achievable place per player
- Final round: loser courts first, top court last (dramatic finale)

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

### Table: Court Configuration Calculator

| Test Name | Players | Expected 4p Courts | Expected Bottom Court |
|-----------|---------|-------------------|----------------------|
| `config-8p` | 8 | 2 | none |
| `config-9p` | 9 | 1 | 5p (1 leftover) |
| `config-10p` | 10 | 1 | 6p (2 leftovers) |
| `config-11p` | 11 | 2 | 3p (3 leftovers) |
| `config-12p` | 12 | 3 | none |
| `config-13p` | 13 | 3 | 5p (1 leftover) |
| `config-15p` | 15 | 3 | 3p (3 leftovers) |
| `config-16p` | 16 | 4 | none |
| `config-24p` | 24 | 6 | none |
| `config-25p` | 25 | 6 | 5p (1 leftover) |
| `config-27p` | 27 | 6 | 3p (3 leftovers) |
| `config-32p` | 32 | 8 | none |
| `config-64p` | 64 | 16 | none |

---

## Open Questions & Loopholes

### Decided

1. ~~Should preseed be restricted to power-of-2 court counts?~~ **No.** Recursive splitting works for any court count.
2. ~~Should we use rotating sit-outs?~~ **No.** Eliminated. One non-standard bottom court for leftovers instead.
3. ~~Which redistribution strategy for mixed courts?~~ **One non-standard bottom court.** The lowest court always gets the leftovers.
4. **Virtual court rotation order**: Start with lower courts first, work up. For the final round, run loser courts first, then winners — so the top court final is last with fresh players.
5. **Preseed with non-standard bottom court**: Top courts filled to 4p. Non-standard court at the bottom with lowest-ranked players.
6. **Per-round override**: The org can decide to do something different for non-standard courts each round, or manually decide who advances/stays in the top of a specific split.
7. **Standings with variable court sizes**:
   - 3p court: 1st → 1st, 2nd → 2nd, 3rd → 4th
   - 5p court: 1st → 1st, 2nd → 2nd, 3rd → 3rd, 4th → 4th, 5th → 4th
   - 6p court: 1st → 1st, 2nd → 2nd, 3rd → 2nd, 4th → 3rd, 5th → 4th, 6th → 4th
8. **Database migration**: No migration of existing tournaments. Clean up database on scheduled "no-tournament" dates with advance notification. Existing tournaments will be deleted by that date.
9. **Score validation for 5/6-player courts**: 15 points (inferred from 4p rules). Win by 2 stays.
10. **Physical court mapping**: Each shift (active courts per round) has a mapping table showing which virtual court maps to which physical court. More flexible than a single tournament-level mapping.
11. **Player retirement**: Already have retirement concept (see `670_player-retirement.md`). Org can retire players mid-tournament, next best player takes their spot, all players "shift around."
12. **Tiebreaker across court sizes**: Compare by average points per game first (normalizes for 3p/4p/5p/6p courts), then total points, then diff, then playerId.
13. **Max achievable place**: Show players which final place they can still achieve from their current position. E.g., being 3rd in round 1 of a 16p tournament allows max 9th final place.
