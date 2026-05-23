# Database Schema

## Tables

### tournament

```typescript
{
  id: serial().primaryKey(),
  orgId: text().notNull(), // user.id from Better Auth
  name: text().notNull(),
  status: text().notNull().default('draft'), // 'draft', 'active', 'completed'
  currentRound: integer().default(0),
  numRounds: integer().notNull().default(3),
  formatType: text().notNull().default('random-seed'), // 'random-seed' | 'preseed'
  playerCount: integer().notNull().default(16),         // 8-64
  // Scoring
  scoringMode: text().default('single-21'),              // 'single-21' | 'best-of-3' | 'custom'
  pointsToWin: integer().default(21),
  winBy: integer().default(2),
  setsToWin: integer().default(1),
  decidingSetPoints: integer().default(15),
  scoringOverrides: jsonb(), // Per-court-type overrides: { "5": { pointsToWin: 15 }, "6": { pointsToWin: 15 } }
  // Court configuration
  courtSizes: text(), // JSON array, e.g. '[4,4,4,5]'
  schedulingMode: text().default('batch'), // 'batch'
  physicalCourtCount: integer().default(4),
  // Duration estimation
  setupTimeMinutes: integer().default(15),
  transitionTimeMinutes: integer().default(10),
  avgRallyDurationSeconds: integer().default(35),
  timeBetweenRalliesSeconds: integer().default(8),
  timeBetweenMatchesMinutes: integer().default(3),
  createdAt: timestamp().defaultNow()
}
```

### player

```typescript
{
  id: serial().primaryKey(),
  tournamentId: integer().notNull(),
  name: text().notNull(),
  seedPoints: integer(), // Required for preseed format
  seedRank: integer(),   // Calculated seed position
  // Retirement
  retiredAt: timestamp(),        // null = active
  retiredRound: integer(),       // Which round they retired after
  retiredCourt: integer(),       // Court number when retired
  retirementReason: text(),      // Optional: 'injury'|'schedule'|'personal'|'disqualified'|'other'
  finalStanding: integer()       // Set when tournament completes
}
```

### courtRotation

```typescript
{
  id: serial().primaryKey(),
  tournamentId: integer().notNull(),
  roundNumber: integer().notNull(),
  courtNumber: integer().notNull(), // 1-N (depends on player count)
  courtSize: integer().default(4),  // 3, 4, 5, or 6
  player1Id: integer().notNull(),
  player2Id: integer(),             // nullable for 3p courts
  player3Id: integer(),             // nullable
  player4Id: integer(),             // nullable
  player5Id: integer(),             // nullable, for 5p/6p courts
  player6Id: integer()              // nullable, for 6p courts
}
```

### match (used for ALL court sizes)

```typescript
{
  id: serial().primaryKey(),
  courtRotationId: integer().notNull(),
  matchNumber: integer().notNull(), // 1-3 (3p/4p) or 1-4 (5p/6p)
  setNumber: integer().notNull().default(1), // For best-of-3 support
  teamAPlayer1Id: integer().notNull(),
  teamAPlayer2Id: integer(),       // nullable for 3p solo player (duplicated ID)
  teamBPlayer1Id: integer().notNull(),
  teamBPlayer2Id: integer(),       // nullable for 3p solo player (duplicated ID)
  teamAScore: integer(),           // null until entered
  teamBScore: integer(),           // null until entered
  isCanceled: boolean().default(false),   // For mid-round injury handling
  injuredPlayerIds: jsonb()               // number[] of injured players in this match
}
```

**Note**: 3p/5p/6p matches are stored in the same `match` table using the same `teamAScore`/`teamBScore` columns. The separate `match_3_player`, `match_5_player`, `match_6_player` tables exist in the schema but are **unused** (dead schema from an earlier design).

### match_3_player (UNUSED - dead schema)

Present in schema file but never queried or inserted into. All 3p matches use the main `match` table.

### match_5_player (UNUSED - dead schema)

Present in schema file but never queried or inserted into. All 5p matches use the main `match` table.

### match_6_player (UNUSED - dead schema)

Present in schema file but never queried or inserted into. All 6p matches use the main `match` table.

### courtAccess

```typescript
{
  id: serial().primaryKey(),
  courtRotationId: integer().notNull(),
  token: text().notNull().unique(),
  isActive: boolean().default(true)
}
```

### auth schema (Better Auth)

Handled automatically by Better Auth CLI. See `src/lib/server/db/auth.schema.ts`.

That's it. No audit logs, no complex user tables (Better Auth handles that), no statistics tables.
