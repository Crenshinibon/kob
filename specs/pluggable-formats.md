# Pluggable Tournament Formats

## Overview

Architecture to support multiple tournament formats, court configurations, and player counts. The system should be extensible to accommodate different beach volleyball tournament styles beyond the current "King of the Beach" rotating partner format.

## Supported Formats

### 1. King of the Beach (Rotating Partners) - CURRENT

**Configuration**:

- Players: 16 (divisible by 4)
- Courts: 4
- Teams: Dynamic (change each match)
- Duration: Multiple rounds (typically 2-4)

**Rules**:

- Players rotate partners each match within their court
- All 4 players on a court play with and against each other
- Points = your team's score in each match
- After round: redistribution based on standings

**Redistribution Logic**:

- Round 1 → Round 2: Seeding (vertical by rank)
- Round 2+: Ladder system (2 up, 2 down)

**Best For**: Individual skill showcase, finding compatible partners

---

### 2. King/Queen of the Court (Winner Stays On)

**Configuration**:

- Teams: 4-5 fixed teams per court
- Courts: 1-4 (can scale)
- Duration: Time-based rounds (e.g., 15-30 minutes)

**Rules**:

- One side is "King/Queen" side (scoring side)
- Challenger serves to King side
- Winner stays on King side, loser goes to back of queue
- Points only earned on King side
- Most points at end of time wins

**Scoring**:

- Individual points (for singles format)
- Or team points (for doubles format)

**Best For**: Fast-paced action, continuous play, spectator-friendly

---

### 3. Fixed Teams (Standard Tournament)

**Configuration**:

- Teams: 8-32 fixed pairs
- Courts: 2-8
- Duration: Pool play + bracket

**Rules**:

- Teams register as pairs
- Pool play: Round robin within pools
- Bracket: Single or double elimination
- No partner rotation

**Scoring**:

- Match wins/losses
- Set differential
- Point differential (tiebreaker)

**Bracket Sizes**:

- 8 teams: 3 courts, pools of 4
- 16 teams: 4 courts, pools of 4
- 24 teams: 6 courts, pools of 4
- 32 teams: 8 courts, pools of 4

**Best For**: Traditional tournament play, established partnerships

---

### 4. Queen & King of the Beach (Co-Ed)

**Configuration**:

- Players: 16 (8 male, 8 female)
- Courts: 4
- Format: Gender-specific pools with cross-gender play

**Rules**:

- Men play in 2 courts, women in 2 courts
- Rotating partners within gender
- Mixed play in later rounds or finals
- Separate male/female winners + potential co-ed final

**Scoring**: Same as King of the Beach

**Best For**: Co-ed events, showcasing both genders

---

### 5. Progressive Tournament (Beginner to Advanced)

**Configuration**:

- Players: Variable (12-24)
- Courts: 3-6
- Skill levels: Mixed initially, then grouped by performance

**Rules**:

- Round 1: Random assignment (assess skill)
- Round 2+: Group by skill level (Gold/Silver/Bronze courts)
- Players move between divisions based on performance

**Best For**: Multi-skill events, developmental tournaments

---

## Architecture

### Plugin System Design

```typescript
// Core interfaces
interface TournamentFormat {
	id: string;
	name: string;
	description: string;

	// Configuration
	minPlayers: number;
	maxPlayers: number;
	playerIncrement: number; // Must be multiple of (e.g., 4)
	minCourts: number;
	maxCourts: number;
	defaultRounds: number;
	minRounds: number;
	maxRounds: number;

	// Capabilities
	supportsPartnerRotation: boolean;
	supportsFixedTeams: boolean;
	supportsTimeBasedRounds: boolean;
	requiresEvenGenderSplit: boolean;

	// Logic modules
	matchGenerator: MatchGenerator;
	scoringSystem: ScoringSystem;
	redistributionStrategy: RedistributionStrategy;
	standingsCalculator: StandingsCalculator;
}

interface MatchGenerator {
	generateRoundMatches(
		players: Player[],
		courtRotations: CourtRotation[],
		roundNumber: number,
		formatConfig: FormatConfig
	): Match[];
}

interface ScoringSystem {
	calculateMatchPoints(
		teamAScore: number,
		teamBScore: number,
		playerIds: number[],
		format: string
	): PlayerPoints[];

	validateScore(scoreA: number, scoreB: number): ValidationResult;
	getWinningScore(): number; // e.g., 21 for beach volleyball
	getWinByPoints(): number; // e.g., 2 points
}

interface RedistributionStrategy {
	redistributePlayers(
		courtResults: CourtResult[],
		currentRound: number,
		formatConfig: FormatConfig
	): CourtAssignment[];
}

interface StandingsCalculator {
	calculateStandings(matches: Match[], players: Player[], formatConfig: FormatConfig): Standing[];

	getTiebreakers(): Tiebreaker[];
}
```

### Format Registry

```typescript
// Registry pattern for available formats
class TournamentFormatRegistry {
	private formats = new Map<string, TournamentFormat>();

	register(format: TournamentFormat): void {
		this.formats.set(format.id, format);
	}

	get(id: string): TournamentFormat | undefined {
		return this.formats.get(id);
	}

	getAll(): TournamentFormat[] {
		return Array.from(this.formats.values());
	}

	getSupportedPlayerCounts(): number[] {
		const counts = new Set<number>();
		for (const format of this.formats.values()) {
			for (let i = format.minPlayers; i <= format.maxPlayers; i += format.playerIncrement) {
				counts.add(i);
			}
		}
		return Array.from(counts).sort((a, b) => a - b);
	}
}

// Initialize with built-in formats
const registry = new TournamentFormatRegistry();
registry.register(KingOfTheBeachFormat);
registry.register(KingOfTheCourtFormat);
registry.register(FixedTeamsFormat);
registry.register(CoEdFormat);
```

### Database Schema Extensions

```sql
-- Add format configuration to tournament table
ALTER TABLE tournament ADD COLUMN format_id VARCHAR(50) DEFAULT 'king-of-beach';
ALTER TABLE tournament ADD COLUMN format_config JSONB DEFAULT '{}';

-- Example format_config for King of the Beach:
-- {
--   "redistributionType": "ladder",
--   "pointsPerMatch": true,
--   "courtCount": 4
-- }

-- Example format_config for King of the Court:
-- {
--   "timeBased": true,
--   "roundDurationMinutes": 20,
--   "winnerStaysOn": true,
--   "maxTeamsPerCourt": 5
-- }
```

## Format Implementations

### 1. King of the Beach (Current)

```typescript
const KingOfTheBeachFormat: TournamentFormat = {
	id: 'king-of-beach',
	name: 'King of the Beach',
	description: 'Individual tournament with rotating partners',

	minPlayers: 8,
	maxPlayers: 32,
	playerIncrement: 4,
	minCourts: 2,
	maxCourts: 8,
	defaultRounds: 3,
	minRounds: 1,
	maxRounds: 5,

	supportsPartnerRotation: true,
	supportsFixedTeams: false,
	supportsTimeBasedRounds: false,
	requiresEvenGenderSplit: false,

	matchGenerator: {
		generateRoundMatches(players, courtRotations, roundNumber, config) {
			// Current implementation
			// Each court gets 4 players
			// Generate 3 matches with all partner combinations
		}
	},

	scoringSystem: {
		calculateMatchPoints(teamAScore, teamBScore, playerIds) {
			// Team A players get teamAScore points each
			// Team B players get teamBScore points each
		},

		validateScore(scoreA, scoreB) {
			// Winner >= 21
			// Win by 2
			// Max 50
		},

		getWinningScore: () => 21,
		getWinByPoints: () => 2
	},

	redistributionStrategy: {
		redistributePlayers(courtResults, currentRound) {
			if (currentRound === 1) {
				// Seeding: Group by rank across courts
				return seedingRedistribution(courtResults);
			} else {
				// Ladder: 2 up, 2 down
				return ladderRedistribution(courtResults);
			}
		}
	},

	standingsCalculator: {
		calculateStandings(matches, players, config) {
			// Sum all points
			// Sort by points, then differential
		},

		getTiebreakers() {
			return [
				{ type: 'points', label: 'Total Points' },
				{ type: 'differential', label: 'Point Differential' },
				{ type: 'head-to-head', label: 'Head-to-Head' },
				{ type: 'random', label: 'Random' }
			];
		}
	}
};
```

### 2. King of the Court

```typescript
const KingOfTheCourtFormat: TournamentFormat = {
	id: 'king-of-court',
	name: 'King of the Court',
	description: 'Winner stays on, continuous play format',

	minPlayers: 8, // 4 teams of 2
	maxPlayers: 40, // 5 courts × 4 teams × 2 players
	playerIncrement: 2,
	minCourts: 1,
	maxCourts: 5,
	defaultRounds: 1, // Time-based, not round-based
	minRounds: 1,
	maxRounds: 1,

	supportsPartnerRotation: false,
	supportsFixedTeams: true,
	supportsTimeBasedRounds: true,
	requiresEvenGenderSplit: false,

	matchGenerator: {
		generateRoundMatches(players, courtRotations, roundNumber, config) {
			// Teams are fixed for entire tournament
			// No pre-generated matches - played dynamically
			return [];
		}
	},

	scoringSystem: {
		calculateMatchPoints(teamAScore, teamBScore, playerIds, format) {
			// Points only awarded on King side
			// Individual or team tracking
		},

		validateScore(scoreA, scoreB) {
			// First to 15 or 21
			// Any winning margin
		},

		getWinningScore: () => 15, // Shorter matches
		getWinByPoints: () => 1 // Can win by 1
	},

	redistributionStrategy: {
		redistributePlayers() {
			// No redistribution in this format
			// Teams stay on their assigned court
			return [];
		}
	},

	standingsCalculator: {
		calculateStandings(matches, players, config) {
			// Sort by total points earned
			// Time-based rounds may have different match counts
		},

		getTiebreakers() {
			return [
				{ type: 'points', label: 'Total Points' },
				{ type: 'win-percentage', label: 'Win %' },
				{ type: 'matches-played', label: 'Matches Played' }
			];
		}
	}
};
```

### 3. Fixed Teams Format

```typescript
const FixedTeamsFormat: TournamentFormat = {
	id: 'fixed-teams',
	name: 'Fixed Teams Tournament',
	description: 'Standard bracket tournament with fixed pairs',

	minPlayers: 8, // 4 teams
	maxPlayers: 64, // 32 teams
	playerIncrement: 2,
	minCourts: 2,
	maxCourts: 8,
	defaultRounds: 2, // Pool + bracket
	minRounds: 1,
	maxRounds: 3, // Pool + winners + finals

	supportsPartnerRotation: false,
	supportsFixedTeams: true,
	supportsTimeBasedRounds: false,
	requiresEvenGenderSplit: false,

	matchGenerator: {
		generateRoundMatches(players, courtRotations, roundNumber, config) {
			if (roundNumber === 1) {
				// Pool play: Round robin within pools
				return generatePoolMatches(players, config.courtCount);
			} else {
				// Bracket play: Single elimination
				return generateBracketMatches(players, config.bracketSize);
			}
		}
	},

	scoringSystem: {
		calculateMatchPoints(teamAScore, teamBScore, playerIds) {
			// Match win = 1 point
			// Set differential for tiebreaker
		},

		validateScore(scoreA, scoreB) {
			// Best of 3 sets
			// Standard volleyball scoring
		},

		getWinningScore: () => 21,
		getWinByPoints: () => 2
	},

	redistributionStrategy: {
		redistributePlayers() {
			// No redistribution
			// Bracket advancement is based on wins
			return [];
		}
	},

	standingsCalculator: {
		calculateStandings(matches, players, config) {
			// Pool: Match wins, then set diff, then point diff
			// Bracket: Advancement position
		},

		getTiebreakers() {
			return [
				{ type: 'match-wins', label: 'Match Wins' },
				{ type: 'set-differential', label: 'Set Differential' },
				{ type: 'point-differential', label: 'Point Differential' },
				{ type: 'head-to-head', label: 'Head-to-Head' }
			];
		}
	}
};
```

## UI Considerations

### Format Selection

When creating a tournament:

1. **Format Dropdown**: Show all registered formats
2. **Player Count**: Auto-suggest valid player counts for selected format
3. **Court Count**: Suggest optimal court count based on players
4. **Description**: Show format details and rules

```svelte
<FormatSelector
	formats={registry.getAll()}
	onSelect={(format) => {
		suggestedCourts = Math.ceil(selectedPlayers / 4);
		suggestedRounds = format.defaultRounds;
	}}
/>
```

### Dynamic UI Components

Different formats need different UI elements:

**King of the Beach**:

- Court cards with rotating partners
- "Close Round" button
- Seeding/ladder indicators

**King of the Court**:

- Timer display (countdown)
- Queue visualization
- Live point tracking
- "Start/Stop Round" button

**Fixed Teams**:

- Bracket display
- Pool standings tables
- "Advance to Bracket" button

## Configuration Examples

### Small Tournament (2 Courts, 8 Players)

```typescript
{
  format: 'king-of-beach',
  players: 8,
  courts: 2,
  rounds: 2,
  redistributionType: 'ladder'
}
```

### Large Tournament (8 Courts, 32 Players)

```typescript
{
  format: 'king-of-beach',
  players: 32,
  courts: 8,
  rounds: 3,
  redistributionType: 'ladder'
}
```

### Quick Tournament (King of the Court)

```typescript
{
  format: 'king-of-court',
  players: 16,  // 8 teams
  courts: 2,
  roundDuration: 20,  // minutes
  pointsToWin: 15
}
```

### Championship (Fixed Teams)

```typescript
{
  format: 'fixed-teams',
  players: 32,  // 16 teams
  courts: 4,
  poolRounds: 1,
  bracketType: 'double-elimination'
}
```

## Migration Strategy

### Phase 1: Extract Current Format

1. Move current logic into `KingOfTheBeachFormat` plugin
2. Keep default behavior unchanged
3. Add format column to database

### Phase 2: Add Format Selection

1. Add format selector to tournament creation
2. Validate player/court counts for selected format
3. Show format-specific options

### Phase 3: Add New Formats

1. Implement King of the Court format
2. Implement Fixed Teams format
3. Add Co-Ed variant

### Phase 4: Advanced Features

1. Custom format builder
2. Hybrid formats
3. Format plugins from community

## API Changes

```typescript
// Tournament creation with format
POST /api/tournament
{
  name: "Summer Tournament",
  format: "king-of-beach",
  formatConfig: {
    courtCount: 4,
    rounds: 3
  },
  players: [...]
}

// Get available formats
GET /api/formats
{
  formats: [
    {
      id: "king-of-beach",
      name: "King of the Beach",
      supportedPlayerCounts: [8, 12, 16, 20, 24, 28, 32],
      supportedCourtCounts: [2, 3, 4, 5, 6, 7, 8]
    }
  ]
}

// Get format-specific UI components
GET /api/formats/:id/ui-config
{
  components: ["court-card", "round-timer", "standings-table"],
  actions: ["close-round", "start-timer"]
}
```

## Testing Strategy

### Format Validation Tests

- Test all valid player/court combinations
- Test invalid combinations (should error)
- Test edge cases (min/max players)

### Logic Tests

- Test match generation for each format
- Test scoring calculations
- Test redistribution strategies
- Test standings calculations

### E2E Tests

- Create tournament for each format
- Complete full tournament flow
- Verify format-specific UI elements

## Acceptance Criteria

- [ ] Current format works unchanged (backward compatibility)
- [ ] Can create tournament with different formats
- [ ] Format selection shows valid player/court counts
- [ ] Match generation works for all formats
- [ ] Scoring system adapts to format
- [ ] Standings calculation works for all formats
- [ ] UI shows format-specific elements
- [ ] Can add new format without code changes (plugin system)
- [ ] Documentation for creating custom formats

## Future Extensions

1. **Custom Formats**: User-defined rules
2. **Hybrid Formats**: Combine elements (e.g., pool play + King of the Court)
3. **International Rules**: FIVB, NCAA, AVP variants
4. **Youth Formats**: Modified rules for juniors
5. **Beach Volleyball 4x4**: Four-player teams
