# Database Schema (Minimal)

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
  playerCount: integer().notNull().default(16),         // 16 or 32
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
  seedRank: integer()    // Calculated seed position
}
```

### courtRotation

```typescript
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
```

### match

```typescript
{
  id: serial().primaryKey(),
  courtRotationId: integer().notNull(),
  matchNumber: integer().notNull(), // 1-3
  teamAPlayer1Id: integer().notNull(),
  teamAPlayer2Id: integer().notNull(),
  teamBPlayer1Id: integer().notNull(),
  teamBPlayer2Id: integer().notNull(),
  teamAScore: integer(), // null until entered
  teamBScore: integer()  // null until entered
}
```

### courtAccess

```typescript
{
  id: serial().primaryKey(),
  courtRotationId: integer().notNull(),
  token: text().notNull().unique(),
  isActive: boolean().default(true)
}
```

That's it. No audit logs, no complex user tables (Better Auth handles that), no statistics tables.
