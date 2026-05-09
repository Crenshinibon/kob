# Total Standings and Winner Announcement

## Overview

Cumulative standings that track player performance across all rounds, enabling organizers to proclaim winners and distribute prizes at the end of each major round (Round 2+) and after the final round.

## Use Cases

1. **End of Round 2**: Show total standings to highlight top performers
2. **Final Round**: Final standings determine tournament winners
3. **Winner Announcement**: Support for podium ceremony with checks/medals
4. **Player Recognition**: Highlight best performers in different categories

## Data Model

### Total Standings Calculation

```typescript
interface TotalStanding {
	playerId: number;
	playerName: string;
	totalPoints: number; // Sum of all points across all matches
	totalPointDiff: number; // Sum of all (pointsFor - pointsAgainst)
	roundsPlayed: number; // Number of rounds completed
	matchesPlayed: number; // Total matches played
	courtAssignments: {
		// Track which courts player was on each round
		round: number;
		court: number;
		rankOnCourt: number; // 1st, 2nd, 3rd, 4th on that court
	}[];
	// Tiebreaker data
	headToHead?: number; // Wins against tied players
	totalWins: number; // Number of match wins (for future formats)
}
```

### Tournament-Level Standings Table

New database table: `total_standings` (or calculate on-demand)

```sql
CREATE TABLE total_standings_snapshot (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER REFERENCES tournament(id),
  round_number INTEGER NOT NULL,  -- Which round this snapshot is for
  player_id INTEGER REFERENCES player(id),
  total_points INTEGER NOT NULL,
  point_differential INTEGER NOT NULL,
  rank INTEGER NOT NULL,          -- Overall rank in tournament
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Features

### 1. Total Standings View

**Location**: `/tournament/[id]/standings`

**Display**:

- Complete rankings of all 16 players
- Rank, Player Name, Total Points, Point Differential
- Highlight top 3 with medals (🥇 🥈 🥉)
- Show movement indicators (↗️ ↘️ ➡️) compared to previous round

**Sort Order**:

1. Total Points (descending)
2. Point Differential (descending)
3. Head-to-head (if applicable)
4. Random (last resort)

### 2. Round-by-Round Breakdown

Expandable view showing player performance per round:

```
Player: Alice
Round 1: Court 1, 1st place, 60 pts (+18 diff)
Round 2: Court 1, 2nd place, 55 pts (+12 diff)
Round 3: Court 2, 1st place, 62 pts (+20 diff)
Total: 177 pts (+50 diff)
```

### 3. Winner Announcement Mode

Special view for end-of-tournament ceremony:

**Podium View**:

```
🏆 KING OF THE BEACH 2025 🏆

        🥇 1st Place
        Alice
        177 points
        Prize: $500

    🥈 2nd Place     🥉 3rd Place
    Bob               Carol
    168 points        159 points
    Prize: $300       Prize: $200
```

**Features**:

- Large, readable text for projection/display
- Photo-friendly layout
- Export to PDF/image for social media
- Prize amount display (if configured)

### 4. Achievement Categories

Recognize players beyond just top 3:

- **Most Improved**: Biggest point jump from Round 1 to final
- **Consistent Performer**: Lowest variance in court rankings
- **Court Champion**: Player who spent most rounds on Court 1
- **Comeback King**: Player who moved up most positions

## UI Components

### Total Standings Table

```svelte
<TotalStandingsTable standings={totalStandings} highlightTop={3} showMovement={true} />
```

### Winner Podium

```svelte
<WinnerPodium
	first={standings[0]}
	second={standings[1]}
	third={standings[2]}
	prizes={[500, 300, 200]}
/>
```

### Round Breakdown

```svelte
<RoundBreakdown {player} rounds={roundHistory} />
```

## Implementation

### Calculation Strategy

**Option 1: Real-time Calculation** (Recommended)

- Calculate on-demand when standings page is loaded
- Query all matches for the tournament
- Aggregate points per player
- Time complexity: O(n\*m) where n=players, m=matches

**Option 2: Snapshot at Round Close**

- Save standings to `total_standings_snapshot` table when closing each round
- Fast retrieval for historical comparison
- Storage overhead: 16 rows per round per tournament

**Hybrid Approach**:

- Real-time calculation for current view
- Snapshots only for historical trend data

### API Endpoints

```typescript
// GET /api/tournament/[id]/total-standings
{
  tournament: { id, name, numRounds, currentRound },
  standings: TotalStanding[],
  generatedAt: timestamp
}

// GET /api/tournament/[id]/total-standings?round=2
// Standings up to and including round 2

// GET /api/tournament/[id]/player/[playerId]/history
{
  player: { id, name },
  rounds: RoundHistory[],
  totals: TotalStanding
}
```

## Database Queries

### Calculate Total Standings

```sql
WITH player_points AS (
  SELECT
    p.id as player_id,
    p.name as player_name,
    COALESCE(SUM(CASE
      WHEN m.team_a_player1_id = p.id OR m.team_a_player2_id = p.id
      THEN m.team_a_score
      WHEN m.team_b_player1_id = p.id OR m.team_b_player2_id = p.id
      THEN m.team_b_score
      ELSE 0
    END), 0) as total_points,
    COALESCE(SUM(CASE
      WHEN m.team_a_player1_id = p.id OR m.team_a_player2_id = p.id
      THEN m.team_a_score - m.team_b_score
      WHEN m.team_b_player1_id = p.id OR m.team_b_player2_id = p.id
      THEN m.team_b_score - m.team_a_score
      ELSE 0
    END), 0) as point_differential
  FROM player p
  LEFT JOIN match m ON (
    m.team_a_player1_id = p.id OR m.team_a_player2_id = p.id OR
    m.team_b_player1_id = p.id OR m.team_b_player2_id = p.id
  )
  WHERE p.tournament_id = $1 AND m.team_a_score IS NOT NULL
  GROUP BY p.id, p.name
)
SELECT
  player_id,
  player_name,
  total_points,
  point_differential,
  RANK() OVER (ORDER BY total_points DESC, point_differential DESC) as rank
FROM player_points
ORDER BY rank;
```

## UI/UX Considerations

### Dark Theme Optimization

- Use high-contrast colors for standings table
- Gold/silver/bronze highlighting for top 3
- Consider heat map coloring for point differentials

### Mobile View

- Horizontal scroll for wide tables
- Collapsible round breakdown
- Swipe between rounds

### Print/Export

- Print-friendly CSS (white background, black text)
- PDF export with logo and tournament branding
- CSV export for spreadsheet analysis

## Edge Cases

### Ties

- Multiple players with same total points
- Show tied rank (e.g., "T-3rd")
- Use point differential as first tiebreaker
- Head-to-head as second tiebreaker
- Random or organizer decision as last resort

### Mid-Tournament View

- Show "In Progress" indicator
- Players may have played different numbers of matches
- Gray out players who haven't completed current round

### Missing Data

- If no matches completed yet, show message: "Standings will appear after Round 1"
- Partial data: "Standings updated through Round 2"

## Future Enhancements

1. **Live Standings**: Real-time updates as scores are entered
2. **Predictions**: Show projected final standings based on current trends
3. **Comparison**: Compare two players side-by-side
4. **Historical**: Compare to previous tournaments
5. **Social Sharing**: Generate shareable graphics for winners

## Acceptance Criteria

- [ ] Total standings calculate correctly across all rounds
- [ ] Rankings update immediately when round is closed
- [ ] Top 3 winners clearly highlighted
- [ ] Movement indicators show rank changes between rounds
- [ ] Winner announcement view is projection-friendly
- [ ] Export to PDF/CSV works
- [ ] Mobile display is readable
- [ ] Handles ties appropriately
