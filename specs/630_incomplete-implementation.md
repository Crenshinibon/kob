# Incomplete Rosters: Implementation Plan & Testing

## Development Plan

### Phase 1: Tournament Logic (Pure Functions)

**Goal**: Extend `src/lib/server/tournament-logic.ts` with all redistribution algorithms for arbitrary court counts.

**Deliverables**:

1. **Preseed redistribution** (`redistributePreseedRecursive`)
   - Takes `CourtResult[]` and optional `courtSizes`
   - Groups all players by finish tier (1sts, 2nds, 3rds, 4ths)
   - Sorts each tier by performance (points desc, diff desc, playerId asc)
   - Flattens tiers and splits into winner/loser brackets via `splitSize`
   - Distributes each bracket's players across its courts with origin mixing (prevents 1st+2nd from same previous court on the same new court)
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
playerCount: integer('player_count').notNull(); // Remove default, accept 8-64

// New columns:
physicalCourtCount: integer('physical_court_count'); // Nullable, defaults to virtualCourtCount
schedulingMode: text('scheduling_mode').default('batch'); // 'batch' | 'rolling'
```

**Changes to `courtRotation` table**:

```typescript
// New column:
courtSize: integer('court_size').default(4); // 3, 4, 5, or 6
isWaiting: boolean('is_waiting').default(false); // For virtual courts on break
```

**No separate match tables** — decided against special 3p/5p/6p tables. The single `match` table was extended with nullable `player5Id`/`player6Id` columns (for 5p/6p parallel games), `set_number` for best-of-3, and `injuredPlayerIds`/`isCanceled` for injury handling. A single query path serves all court sizes, keeping the standings page and score entry simple. See [`040_database-schema.md`](./040_database-schema.md) for the current schema.

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

Roles randomized each round. One player plays 4 games, others play 3. Ranking by average points per round.

**6-player court matches** (2 runs × 2 parallel games = 4 games):

Run 1: A+B fixed on side X, C+E and D+F rotate every point.

```
Game 1: A+B vs C+E (scored when C+E on court)
Game 2: A+B vs D+F (scored when D+F on court)
```

Run 2: C+D fixed on side X, A+E and B+F rotate every point.

```
Game 3: C+D vs A+E (scored when A+E on court)
Game 4: C+D vs B+F (scored when B+F on court)
```

Roles randomized each round. 4 players play 3 games, 2 players play 2 games (diff ≤ 1). **No partnership repeats across runs** — if two players were partners in Run 1, they are not partners in Run 2. Ranking by average points per round.

**Schema**: A single `match` table handles all court sizes. Key columns:

```typescript
// match — single table for all court types (3p, 4p, 5p, 6p)
{
  id: serial('id').primaryKey(),
  courtRotationId: integer('court_rotation_id').notNull(),
  matchNumber: integer('match_number').notNull(),
  setNumber: integer('set_number').notNull().default(1),  // for best-of-3
  teamAPlayer1Id: integer('team_a_player_1_id').notNull(),
  teamAPlayer2Id: integer('team_a_player_2_id'),
  teamBPlayer1Id: integer('team_b_player_1_id').notNull(),
  teamBPlayer2Id: integer('team_b_player_2_id'),
  teamAScore: integer('team_a_score'),
  teamBScore: integer('team_b_score'),
  isCanceled: boolean('is_canceled').notNull().default(false),
  injuredPlayerIds: jsonb('injured_player_ids').$type<number[]>()
}
```

- `teamAPlayer2Id`/`teamBPlayer2Id` are nullable for 3p courts (solo player vs pair)
- 5p/6p parallel games use the same columns — one team is fixed, the other rotates per game number
- `setNumber` supports best-of-3 format (sets 1, 2, 3)
- `injuredPlayerIds` tracks substitute-played matches for injury handling

**Benefits of single-table approach**:

- Single query path for all match data — simpler standings page and score entry
- No schema proliferation — fewer tables to migrate and maintain
- Easier to add new court types in the future
- Consistent UI rendering — one component set adapts to court size
- `calculateCourtStandings()` handles all court sizes with a single algorithm

**Trade-off**: Nullable `teamAPlayer2Id`/`teamBPlayer2Id` columns break strict 2v2 typing, but this is handled cleanly in application code (3p: pair vs solo, 5p/6p: fixed vs rotating team).

### Phase 5: Close Round with Variable Court Sizes

**Goal**: Update `closeRound` action to handle non-4-player courts.

**Changes to `src/routes/tournament/[id]/+page.server.ts`**:

- `calculateCourtStandings()`: Single function handles all court sizes (3p/4p/5p/6p) with tiebreakers (points → diff → playerId). Uses averages for 5p/6p and when any match is canceled.
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

- Single template adapts to all court sizes (3p, 4p, 5p, 6p)
- Shows correct number of match cards (3 for 3p/4p, 4 for 5p/6p)
- Displays players in a horizontal card layout with letter labels (A-F)
- Format note per court type (3p: 2v1 rotation, 5p/6p: parallel games to 15)
- For 5p/6p: matches grouped by run with "Run 1" / "Run 2" labels
- Best-of-3 mode shows per-set entry (Set 1/2/3) with deciding set rules

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

| Test Name             | Courts | Round | Expected Winner Courts    | Expected Loser Courts    |
| --------------------- | ------ | ----- | ------------------------- | ------------------------ |
| `preseed-3courts-r1`  | 3      | 1→2   | 2 courts (1st-2nd places) | 1 court (3rd-4th places) |
| `preseed-5courts-r1`  | 5      | 1→2   | 4 courts (top performers) | 1 court (remainder)      |
| `preseed-6courts-r1`  | 6      | 1→2   | 4 courts                  | 2 courts                 |
| `preseed-7courts-r1`  | 7      | 1→2   | 4 courts                  | 3 courts                 |
| `preseed-9courts-r1`  | 9      | 1→2   | 8 courts                  | 1 court                  |
| `preseed-10courts-r1` | 10     | 1→2   | 8 courts                  | 2 courts                 |
| `preseed-12courts-r1` | 12     | 1→2   | 8 courts                  | 4 courts                 |
| `preseed-16courts-r1` | 16     | 1→2   | 8 courts                  | 8 courts                 |

### Table: Recursive Preseed — Full Tournament Flow

| Test Name         | Start Courts | Expected Rounds | Final Placement            |
| ----------------- | ------------ | --------------- | -------------------------- |
| `preseed-3-full`  | 3            | 3               | C1: 1-4, C2: 5-8, C3: 9-12 |
| `preseed-5-full`  | 5            | 4               | C1: 1-4, ..., C5: 17-20    |
| `preseed-6-full`  | 6            | 4               | C1: 1-4, ..., C6: 21-24    |
| `preseed-7-full`  | 7            | 4               | C1: 1-4, ..., C7: 25-28    |
| `preseed-9-full`  | 9            | 5               | C1: 1-4, ..., C9: 33-36    |
| `preseed-10-full` | 10           | 5               | C1: 1-4, ..., C10: 37-40   |

### Table: Vertical Seeding (Random Seed, Round 1 to 2)

For each court count N, given N courts with known standings, verify the cascade produces the correct court assignments.

| Test Name           | Courts | Expected C1    | Expected C2          | ...            |
| ------------------- | ------ | -------------- | -------------------- | -------------- |
| `vertical-2courts`  | 2      | P1,P2,P5,P6    | P3,P4,P7,P8          | —              |
| `vertical-3courts`  | 3      | P1,P2,P3,P5    | P4,P6,P7,P9          | P8,P10,P11,P12 |
| `vertical-5courts`  | 5      | First 4 firsts | 1st+3 best 2nds      | ...            |
| `vertical-6courts`  | 6      | First 4 firsts | 2 firsts+2 best 2nds | ...            |
| `vertical-7courts`  | 7      | First 4 firsts | 3 firsts+1 best 2nd  | ...            |
| `vertical-9courts`  | 9      | First 4 firsts | ...                  | ...            |
| `vertical-12courts` | 12     | First 4 firsts | ...                  | ...            |
| `vertical-16courts` | 16     | First 4 firsts | ...                  | ...            |

### Table: Ladder Redistribution (Random Seed, Round 2+)

| Test Name               | Courts | Focus | Assertion                              |
| ----------------------- | ------ | ----- | -------------------------------------- |
| `ladder-2courts-top`    | 2      | C1    | Keeps top 2 + gets top 2 from C2       |
| `ladder-2courts-bottom` | 2      | C2    | Keeps bottom 2 + gets bottom 2 from C1 |
| `ladder-3courts-top`    | 3      | C1    | Keeps top 2 + gets top 2 from C2       |
| `ladder-3courts-middle` | 3      | C2    | Gets bottom 2 from C1 + top 2 from C3  |
| `ladder-3courts-bottom` | 3      | C3    | Keeps bottom 2 + gets bottom 2 from C2 |
| `ladder-5courts-middle` | 5      | C3    | Gets bottom 2 from C2 + top 2 from C4  |
| `ladder-7courts-bottom` | 7      | C7    | Keeps bottom 2 + gets bottom 2 from C6 |
| `ladder-9courts-middle` | 9      | C5    | Gets bottom 2 from C4 + top 2 from C6  |
| `ladder-16courts-top`   | 16     | C1    | Keeps top 2 + gets top 2 from C2       |

### Table: Round Count Calculator

| Test Name           | Courts | Format  | Expected Rounds |
| ------------------- | ------ | ------- | --------------- |
| `rounds-2-preseed`  | 2      | preseed | 2               |
| `rounds-3-preseed`  | 3      | preseed | 3               |
| `rounds-4-preseed`  | 4      | preseed | 3               |
| `rounds-5-preseed`  | 5      | preseed | 4               |
| `rounds-6-preseed`  | 6      | preseed | 4               |
| `rounds-7-preseed`  | 7      | preseed | 4               |
| `rounds-8-preseed`  | 8      | preseed | 4               |
| `rounds-9-preseed`  | 9      | preseed | 5               |
| `rounds-16-preseed` | 16     | preseed | 5               |

### Table: Scheduling Mode Configuration

| Test Name                      | Virtual Courts | Physical Courts | Mode    | Expected Shifts             | Expected Wait (approx)            |
| ------------------------------ | -------------- | --------------- | ------- | --------------------------- | --------------------------------- |
| `batch-8v4`                    | 8              | 4               | batch   | 2 shifts [5-8],[1-4]        | ~55 min for Shift 1               |
| `batch-12v4`                   | 12             | 4               | batch   | 3 shifts [9-12],[5-8],[1-4] | ~100 min for Shift 1              |
| `rolling-8v4`                  | 8              | 4               | rolling | No shifts, continuous       | Variable per position             |
| `batch-vs-rolling-equivalence` | 8              | 4               | both    | Same total round duration   | Different per-player distribution |

### Table: Variable Court Standings Normalization

| Test Name            | Court Size | Games/Player | Input Scenario                     | Expected Avg          | Expected Rank                |
| -------------------- | ---------- | ------------ | ---------------------------------- | --------------------- | ---------------------------- |
| `norm-3p-equal`      | 3p         | 3            | All 21 pts each                    | 21.0                  | Tie by playerId              |
| `norm-5p-uneven`     | 5p         | 3 & 4        | 3-game: 63 total, 4-game: 48 total | 21.0 vs 12.0          | 3-game player ranks higher   |
| `norm-6p-uneven`     | 6p         | 3 & 2        | 3-game: 63 total, 2-game: 30 total | 21.0 vs 15.0          | 3-game player ranks higher   |
| `norm-tiebreak-diff` | 5p         | 3 & 4        | Same avg                           | Higher total pts wins | Total pts is tiebreaker      |
| `norm-tiebreak-id`   | 5p         | 3 & 4        | Same avg, same total               | Lower playerId wins   | playerId is final tiebreaker |

### Table: Standings Calculation + Tiebreaking

| Test Name                   | Players | Court Size | Matches | Scenario                    | Expected                       |
| --------------------------- | ------- | ---------- | ------- | --------------------------- | ------------------------------ |
| `standings-basic`           | 4       | 4p         | 3       | Clear winner                | Highest total points first     |
| `standings-tie-points`      | 4       | 4p         | 3       | Same points, different diff | Higher diff wins               |
| `standings-tie-points-diff` | 4       | 4p         | 3       | Same points and diff        | Lower playerId wins            |
| `standings-all-tied`        | 4       | 4p         | 3       | All same                    | Sorted by playerId             |
| `standings-missing-scores`  | 4       | 4p         | 2       | 2 of 3 matches              | Unscored = 0 for all           |
| `standings-3player`         | 3       | 3p         | 3       | 2v1 format                  | Avg pts/round formula          |
| `standings-3player-tied`    | 3       | 3p         | 3       | All same avg                | Lower playerId wins            |
| `standings-5player-equal`   | 5       | 5p         | 4       | Equal avg across all        | Total pts tiebreaker           |
| `standings-5player-uneven`  | 5       | 5p         | 4       | Mixed 3/4 game counts       | Normalized avg ranks higher    |
| `standings-6player-mixed`   | 6       | 6p         | 4       | Mixed 2/3 game counts       | Normalized avg ranks higher    |
| `standings-cross-size`      | Mixed   | 4p+3p      | —       | Cross-court-size comparison | Avg pts/round normalizes first |

### Table: Court Configuration Calculator

| Test Name    | Players | Expected 4p Courts | Expected Bottom Court |
| ------------ | ------- | ------------------ | --------------------- |
| `config-8p`  | 8       | 2                  | none                  |
| `config-9p`  | 9       | 2                  | 5p (1 leftover)       |
| `config-10p` | 10      | 2                  | 6p (2 leftovers)      |
| `config-11p` | 11      | 2                  | 3p (3 leftovers)      |
| `config-12p` | 12      | 3                  | none                  |
| `config-13p` | 13      | 3                  | 5p (1 leftover)       |
| `config-15p` | 15      | 3                  | 3p (3 leftovers)      |
| `config-16p` | 16      | 4                  | none                  |
| `config-24p` | 24      | 6                  | none                  |
| `config-25p` | 25      | 6                  | 5p (1 leftover)       |
| `config-27p` | 27      | 6                  | 3p (3 leftovers)      |
| `config-32p` | 32      | 8                  | none                  |
| `config-64p` | 64      | 16                 | none                  |

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
9. **Score validation for 5/6-player courts**: 1 set to 15, win by 2. No cap.
10. **Physical court mapping**: Each shift (active courts per round) has a mapping table showing which virtual court maps to which physical court. More flexible than a single tournament-level mapping.
11. **Player retirement**: Already have retirement concept (see `670_player-retirement.md`). Org can retire players mid-tournament, next best player takes their spot, all players "shift around."
12. **Tiebreaker across court sizes**: Compare by average points per round first (normalizes for 3p/4p/5p/6p courts), then total points, then diff, then playerId.
13. **Max achievable place**: Show players which final place they can still achieve from their current position. E.g., being 3rd in round 1 of a 16p tournament allows max 9th final place.
