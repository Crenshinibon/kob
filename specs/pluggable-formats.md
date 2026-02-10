# Pluggable King of the Beach Formats

## Overview

This app focuses exclusively on "King of the Beach" (KoB) style tournaments - individual competitions where players rotate partners each round. Unlike traditional fixed-team tournaments, KoB emphasizes individual skill and adaptability.

**Key Principle**: We do NOT support standard bracket/pool tournaments (fixed teams) - use dedicated tournament software for those formats.

## King of the Beach Format Family

All formats share these core characteristics:

- Players register as individuals (no fixed partners)
- Partners rotate each match/round
- Individual scoring (not team-based)
- Final winner is the best individual player, not a team

## Supported Variations

### 1. Standard King of the Beach (Current Implementation)

**Configuration**:

- Players: Multiple of 4 (8, 12, 16, 20, 24, 28, 32)
- Courts: Players ÷ 4
- Format: 4 players per court, rotating partners
- Scoring: Rally points (team score = individual points)

**Round Structure**:

- Each court: 4 players play 3 matches
- Match 1: (A+B) vs (C+D)
- Match 2: (A+C) vs (B+D)
- Match 3: (A+D) vs (B+C)
- Each player partners with each other player exactly once

**Redistribution**:

- Round 1→2: Seeding by rank (all 1st place players to Court 1, etc.)
- Round 2+: Ladder system (2 up, 2 down between adjacent courts)

**Best For**: Standard individual skill assessment, finding compatible partners

---

### 2. Social King of the Beach (Whist Tournament Style)

**Configuration**:

- Players: Any even number (not necessarily multiple of 4)
- Courts: Flexible (depends on player count)
- Format: Partnership rotation across entire tournament

**Rules**:

- Players are partnered with as many different players as possible
- Goal: Play with every other player exactly once (or as close as possible)
- Goal: Play against each opponent a balanced number of times
- Uses combinatorial mathematics to generate fair rotations

**Player Counts & Structure**:

| Players | Courts | Matches/Player | Notes                            |
| ------- | ------ | -------------- | -------------------------------- |
| 6       | 1-2    | 5              | Each partners with 5 others      |
| 8       | 2      | 7              | Full round-robin partnerships    |
| 10      | 2-3    | 9              | May require sit-outs for balance |
| 12      | 3      | 11             | Full whist tournament format     |
| 14      | 3-4    | 13             | Complex scheduling               |
| 16      | 4      | 3 per round    | Standard format                  |
| 20      | 5      | 19             | Multi-round rotation             |
| 24      | 6      | 23             | Extended tournament              |

**Schedule Generation**:

- Uses "Whist Tournament" or "Social Golfer Problem" algorithms
- Ensures each player partners with others equally
- Minimizes repeated opponent matchups

**Best For**: Social events, meet-and-greet tournaments, partner finding

---

### 3. Compact King of the Beach (3-Player Courts)

**Configuration**:

- Players: Multiple of 3 (6, 9, 12, 15, 18, 21, 24)
- Courts: Players ÷ 3
- Format: 3 players per court, 2v1 rotation format

**Rules**:

- **Standard volleyball rules apply** - NO modifications needed
- 3 players per court: 2 vs 1 format with rotation
- Each player is the "single player" exactly once
- Team of 2: Normal 3-touch limit as a team (no consecutive touches by same player)
- Single player: Also has 3-touch limit, but since they're alone, they use all 3 touches themselves

**Important Clarification**: The single player having 3 consecutive touches is NOT a rule modification - it's standard volleyball applied to a team of 1. With no teammates, the single player naturally makes all touches.

**Match Structure**:

- Match 1: (A+B) vs C → C serves to A+B side, normal rally point scoring
- Match 2: (A+C) vs B → B serves to A+C side
- Match 3: (B+C) vs A → A serves to B+C side

**Gameplay Example**:

Match 1: Alice+Bob vs Carol

- Carol serves to Alice/Bob side
- Rally: Alice digs, Bob sets, Alice spikes (3 touches used by team of 2)
- OR: Carol serves, Alice digs to herself, sets to herself, spikes (3 touches by Carol alone)
- Score to 21 (beach volleyball rules: win by 2, max 50)

**Scoring**:

- **Standard rally points** (recommended): Your team's score = your individual points
- Team of 2 wins 21-18: Both players get 21 points, single player gets 18
- Single player wins 21-18: Single player gets 21, both team players get 18
- **No multipliers or bonuses needed** - the challenge is winning 1v2 with standard rules

**Court Dimensions**:

- **Standard court size** (no modifications)
- Full 8m width × 16m depth
- The challenge IS covering the whole court alone - that's the point!

**Redistribution**:

- Round 1→2: Seeding by rank (1st places to Court 1, 2nd to Court 2, etc.)
- Round 2+: Ladder system adapted for 3 players
  - 1st place: Move up one court (or stay if already top)
  - 2nd place: Stay on same court
  - 3rd place: Move down one court (or stay if already bottom)

**Why It Works**:

1. **Natural balance**: Everyone takes turns being the disadvantaged single player
2. **Skill showcase**: Tests partnership skills AND individual ability to cover court alone
3. **No confusion**: Standard beach volleyball rules everyone knows
4. **Fair**: The difficulty of 1v2 is the same for everyone when they rotate through

**Best For**: Limited court space, smaller tournaments, testing individual defensive skills

**Best For**: Small tournaments, limited courts, quick rounds

---

### 4. Gender-Segregated King of the Beach

**Configuration**:

- Players: Even split of men and women
- Courts: Split by gender (separate male/female courts)
- Format: Rotating partners within gender

**Structure**:

- 8 men on 2 courts, 8 women on 2 courts
- Separate male and female winners
- Optional: Mixed finals or overall champion calculation

**Variations**:

- **Separate Scoring**: Male and Female winners crowned independently
- **Combined Scoring**: Points normalized by gender, overall winner
- **Crossover Finals**: Top 2 men + Top 2 women play mixed final

**Best For**: Co-ed events with gender recognition

---

### 5. Progressive Skill-Based (Gold/Silver/Bronze)

**Configuration**:

- Players: Any number, divided by skill after first round
- Courts: Variable (may change count between rounds)
- Format: Self-seeding through performance

**Rules**:

- Round 1: Random assignment (assessment round)
- Round 2+: Players grouped by skill level
  - Gold Courts (top performers)
  - Silver Courts (middle performers)
  - Bronze Courts (developing players)
- Players can move between divisions based on performance

**Redistribution**:

- Dynamic based on points/rank
- Top 2 from each division promoted
- Bottom 2 relegated to lower division
- New players fill from below or enter at bottom

**Best For**: Developmental tournaments, multi-skill events

---

## Handling Uneven Player Counts

### The Challenge

King of the Beach traditionally requires multiples of 4 (for 4-player courts). When player count isn't divisible by 4, we need strategies to maintain fairness.

### Solutions by Player Count Modulo 4

#### Players = 4n + 1 (e.g., 5, 9, 13, 17, 21, 25)

**Option A: Rotating Sit-Out (Recommended)**

- One player sits out each round (rotates through all players)
- Sitting player gets average points of that round
- Or: Sitting player gets 0, but fewer total rounds
- Fairness: Everyone sits out equally
- All matches are meaningful (no artificial games)

**Option B: Flexible Court Sizes**

- Most courts: 4 players (standard format)
- One court: 3 players (2v1 format, standard volleyball rules)
- Example: 9 players = two 4-player courts + one 3-player court
- Use rank-based scoring for fair comparison across court sizes
- No rule modifications - standard 3-touch volleyball for everyone

#### Players = 4n + 2 (e.g., 6, 10, 14, 18, 22, 26)

**Option A: Pair of 3-Player Courts**

- Convert two 4-player courts into three 3-player courts
- Example: 10 players = 2 courts (4+4) + 1 court of 2 (problem)
- Better: 10 players = two 3-player courts + one 4-player court (3+3+4=10)
- Requires mixed format handling

**Option B: Rotating Doubles Sit-Out**

- Two players sit out each round
- Rotate pairs so everyone sits equally
- Sitting players get mean points or 0

**Option C: Social Format (Whist)**

- Use 6-player or 10-player whist schedule
- Players rotate through partnerships
- Byes handled in schedule generation

#### Players = 4n + 3 (e.g., 7, 11, 15, 19, 23, 27)

**Option A: Mixed Court Sizes (Recommended)**

- Mix of 4-player and 3-player courts
- Example 11 players: 2 courts (4+4) + 1 court (3)
- Example 7 players: 1 court (4) + 1 court (3)
- All players play every round
- Use rank-based scoring for fair comparison

**Option B: Rotating Sit-Out**

- One player sits out each round (rotates through all players)
- Remaining players fill the courts (e.g., 7 players → 6 play on courts, 1 sits)
- Sitting player gets average points or 0
- Everyone plays equal number of rounds over time

**Option C: Flexible Scheduling**

- Some rounds have 4-player courts
- Some rounds have 3-player courts
- Rotate which players experience which format
- Balances playing time across different court types

### Implementation Strategy

```typescript
interface PlayerCountStrategy {
	players: number;
	courts: CourtConfig[];
	sitOutsPerRound: number;
	matchesPerPlayer: number;
}

interface CourtConfig {
	type: 'standard' | 'three-player';
	playerCount: number;
	matchGenerator: MatchGenerator;
}

// Determine strategy based on player count
function getStrategy(totalPlayers: number): PlayerCountStrategy {
	const remainder = totalPlayers % 4;

	switch (remainder) {
		case 0:
			return standardStrategy(totalPlayers);
		case 1:
			return rotatingSitOutStrategy(totalPlayers);
		case 2:
			return mixedCourtStrategy(totalPlayers);
		case 3:
			return mixedCourtWithSitOutStrategy(totalPlayers);
	}
}
```

### Recommended Approach for Each Count

| Players | Recommended Strategy | Courts   | Notes                            |
| ------- | -------------------- | -------- | -------------------------------- |
| 5       | Rotating sit-out     | 1        | One player sits, gets avg points |
| 6       | 3-player courts      | 2        | Compact format                   |
| 7       | Mixed 4+3            | 2        | One 4-player, one 3-player court |
| 8       | Standard             | 2        | Ideal format                     |
| 9       | Rotating sit-out     | 2        | Balanced 4+4+1 rotating          |
| 10      | Mixed 3+3+4          | 3        | Two 3-player, one 4-player       |
| 11      | Mixed 3+4+4          | 3        | One 3-player, two 4-player       |
| 12      | Standard             | 3        | Ideal format                     |
| 13      | Rotating sit-out     | 3        | Balanced rotation                |
| 14      | Mixed 4+4+6→3+3+4+4  | 4        | Complex but workable             |
| 15      | Mixed 3+4+4+4        | 4        | One 3-player, three 4-player     |
| 16      | Standard             | 4        | Ideal format (current)           |
| 17-31   | Various combinations | Variable | Use lookup table                 |

## Scoring Normalization for Uneven Courts

When mixing 3-player and 4-player courts, scoring must be normalized for fairness.

### 3-Player Court Scoring Options

**Option 1: Standard Rally Points (Recommended)**

- Same as 4-player courts: your team's score = your individual points
- Single player naturally has 3 touches (they're their own team)
- No rule modifications, no court size changes
- Accept that 3-player matches have different dynamics than 4-player
- Fairness comes from equal rotation, not rule adjustments

**Option 2: Rank-Based Points (For Mixed Court Tournaments)**

When mixing 3-player and 4-player courts in same tournament:

- 1st place on any court: Fixed points (e.g., 60)
- 2nd place: Fixed points (e.g., 50)
- 3rd place: Fixed points (e.g., 40)
- 4th place (on 4-player courts): Fixed points (e.g., 30)
- Independent of match scores, making all courts comparable

**Why Rank-Based Works Better for Mixed Courts**:

- 3-player and 4-player matches have fundamentally different dynamics
- 2v1 format vs 2v2 format creates incomparable match scores
- Rank-based scoring treats all courts equally (1st place is 1st place regardless of court size)
- Simpler for players to understand: "Finish 1st on your court, get 60 points"

**Not Recommended**:

- Proportional multipliers (e.g., 4/3 for 3-player courts) - too confusing
- Rule modifications (extra touches, shortened courts) - not standard volleyball
- Hybrid systems mixing rally and rank points - inconsistent

## Redistribution Strategies by Format

### Standard (4-Player Courts)

**Round 1→2: Vertical Seeding**

```
Before:        After (Round 2):
C1: A1 A2 A3 A4    C1: A1 B1 C1 D1 (all 1st places)
C2: B1 B2 B3 B4    C2: A2 B2 C2 D2 (all 2nd places)
C3: C1 C2 C3 C4    C3: A3 B3 C3 D3 (all 3rd places)
C4: D1 D2 D3 D4    C4: A4 B4 C4 D4 (all 4th places)
```

**Round 2+: Ladder System**

```
C1: P1 P2 P3 P4    → Promote P1,P2 to next court up (if exists)
C2: P5 P6 P7 P8    → P1,P2 from C1 move here; P7,P8 move down to C3
C3: P9 P10 P11 P12  → P5,P6 from C2 move here; P11,P12 move down
C4: P13 P14 P15 P16 → P9,P10 from C3 move here; P13,P14 stay
```

### 3-Player Court Adaptation

**Seeding (Round 1→2)**:

```
Before:        After:
C1: A1 A2 A3       C1: A1 B1 C1 (all 1st places from each court)
C2: B1 B2 B3       C2: A2 B2 C2 (all 2nd places)
C3: C1 C2 C3       C3: A3 B3 C3 (all 3rd places)
```

**Ladder (3-Player Courts)**:

- 1st place: Move up one court
- 2nd place: Stay on same court
- 3rd place: Move down one court

### Mixed Court Sizes

When mixing 3-player and 4-player courts:

**Option A: Separate Ladders**

- 3-player courts have their own promotion/relegation
- 4-player courts have their own system
- Players never switch between court sizes

**Option B: Normalized Rankings**

- Convert all performances to percentile ranks
- Redistribute based on overall percentile
- May require moving between court sizes

## Core Philosophy: Standard Rules

### Why We Don't Modify Volleyball Rules

**The Fundamental Principle**: King of the Beach is a **tournament format**, not a **rule variant**. The volleyball itself stays pure.

**For 3-Player Courts**:

- Single player having 3 consecutive touches is NOT a rule modification
- It's simply standard volleyball applied to a team of 1
- With no teammates available, all 3 team touches are made by the same person
- This is mechanically identical to a 2-player team where both players happen to be the same person

**What We DON'T Do**:

- ❌ Allow extra touches (4-5) for single player
- ❌ Shorten the court for single player
- ❌ Give single player consecutive touch exceptions
- ❌ Modify scoring rules (win by 2, max 50, etc.)

**What We DO**:

- ✅ Standard 3-touch limit for ALL teams (whether 1 or 2 players)
- ✅ Standard court dimensions (8m × 16m)
- ✅ Standard beach volleyball scoring (21 to win, by 2, cap 50)
- ✅ Standard rotation so everyone experiences 2v1 equally
- ✅ Use rank-based scoring when mixing court sizes (for fair comparison)

**Why This Works**:

1. **Simplicity**: No special rules to learn or explain
2. **Fairness**: The 2v1 disadvantage is the same for everyone when they rotate
3. **Challenge**: Being able to win 1v2 IS the test of individual skill
4. **Clarity**: Standard volleyball is standard volleyball, period

**The Takeaway**: Don't change the game to make it easier. Change the tournament structure to make it fair. That's what redistribution (seeding/ladder) is for.

## Database Schema Extensions

```sql
-- Add format type and configuration
ALTER TABLE tournament ADD COLUMN format_type VARCHAR(50) DEFAULT 'standard';
ALTER TABLE tournament ADD COLUMN format_config JSONB DEFAULT '{}';

-- Example configs:
-- Standard 16-player: {"courtSize": 4, "redistribution": "ladder"}
-- 3-player variant: {"courtSize": 3, "redistribution": "ladder-3"}
-- Mixed sizes: {"courts": [{"size": 4}, {"size": 4}, {"size": 3}]}
-- Social format: {"type": "whist", "fullRotation": true}

-- Track sit-outs for uneven player handling
CREATE TABLE player_sit_outs (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER REFERENCES tournament(id),
  player_id INTEGER REFERENCES player(id),
  round_number INTEGER NOT NULL,
  reason VARCHAR(20) NOT NULL, -- 'uneven_count', 'odd_player', 'bye'
  assigned_points INTEGER, -- Points awarded for sitting out (if any)
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Implementation Architecture

### Format Registry

```typescript
interface KingOfBeachFormat {
	id: string;
	name: string;
	description: string;

	// Player requirements
	supportedPlayerCounts: number[]; // e.g., [8, 12, 16, 20, 24]
	courtSize: 3 | 4;
	allowUnevenCounts: boolean;

	// Core logic
	matchGenerator: MatchGenerator;
	redistributionStrategy: RedistributionStrategy;
	scoringSystem: ScoringSystem;

	// Options
	availableOptions: FormatOption[];
}

const formatRegistry = new Map<string, KingOfBeachFormat>();

// Register built-in formats
formatRegistry.set('standard', StandardKingOfBeach);
formatRegistry.set('social', SocialKingOfBeach);
formatRegistry.set('compact', CompactKingOfBeach);
formatRegistry.set('gender-segregated', GenderSegregatedKoB);
formatRegistry.set('progressive', ProgressiveSkillBased);
```

### Match Generator Interface

```typescript
interface MatchGenerator {
	generateMatches(players: Player[], roundNumber: number, config: FormatConfig): Match[];
}

// Standard 4-player generator
class StandardMatchGenerator implements MatchGenerator {
	generateMatches(players, roundNumber, config) {
		const matches = [];
		// Generate A+B vs C+D, A+C vs B+D, A+D vs B+C
		return matches;
	}
}

// 3-player generator
class ThreePlayerMatchGenerator implements MatchGenerator {
	generateMatches(players, roundNumber, config) {
		const matches = [];
		// Generate (A+B) vs C, (A+C) vs B, (B+C) vs A
		return matches;
	}
}

// Whist tournament generator (social format)
class WhistMatchGenerator implements MatchGenerator {
	generateMatches(players, roundNumber, config) {
		// Use combinatorial algorithm for balanced rotations
		// Players partner with different people each round
		return matches;
	}
}
```

### Redistribution Interface

```typescript
interface RedistributionStrategy {
	redistribute(
		courtResults: CourtResult[],
		currentRound: number,
		formatConfig: FormatConfig
	): CourtAssignment[];
}

class SeedingRedistribution implements RedistributionStrategy {
	redistribute(courtResults, currentRound, config) {
		// Group by rank across courts
		// All 1st places to Court 1, 2nd places to Court 2, etc.
	}
}

class LadderRedistribution implements RedistributionStrategy {
	redistribute(courtResults, currentRound, config) {
		// 2 up, 2 down between adjacent courts
		// Adapted for 3 or 4 player courts
	}
}

class SkillBasedRedistribution implements RedistributionStrategy {
	redistribute(courtResults, currentRound, config) {
		// Group by performance percentile
		// Top X% to Gold courts, next to Silver, etc.
	}
}
```

## UI/UX Considerations

### Format Selection Screen

```
Create Tournament

Format Type:
○ Standard King of the Beach (4-player courts)
○ Social King of the Beach (balanced rotation)
○ Compact Format (3-player courts)
○ Gender-Segregated
○ Progressive Skill-Based

Number of Players: [16]
[Check Availability] → Shows "✓ Valid for Standard Format"

Options:
☑ Use rotating sit-outs for uneven counts
☑ Enable ladder redistribution
☐ Enable progressive divisions

[Create Tournament]
```

### Player Count Validation

```typescript
function validatePlayerCount(count: number, formatId: string): ValidationResult {
	const format = formatRegistry.get(formatId);

	if (format.supportedPlayerCounts.includes(count)) {
		return { valid: true, message: 'Perfect fit!' };
	}

	if (format.allowUnevenCounts) {
		const strategies = getUnevenStrategies(count);
		return {
			valid: true,
			message: `${count} players requires special handling`,
			strategies: strategies
		};
	}

	return {
		valid: false,
		message: `${count} not supported. Use: ${format.supportedPlayerCounts.join(', ')}`
	};
}
```

### Uneven Count Warnings

When creating tournament with non-multiple-of-4 players:

- Show warning banner: "17 players detected. Using rotating sit-out strategy."
- Explain: "One player will sit out each round and receive average points."
- Visual indicator on dashboard showing who sits out each round

## Testing Strategy

### Unit Tests

- Test match generation for all player counts (5-32)
- Test redistribution logic for each format
- Test scoring normalization between 3 and 4 player courts

### Integration Tests

- Create tournaments for each supported format
- Complete full tournament flows
- Verify fair rotation for uneven counts

### Edge Cases

- Test sit-out rotation fairness
- Test mixed court sizes (3-player + 4-player combinations)
- Test minimum players (5-7)
- Test maximum players (28-32)

## Migration Path

### Phase 1: Refactor Current Format

- Extract current 4-player logic into `StandardKingOfBeach` plugin
- Maintain backward compatibility (default to standard)
- Add format column to database

### Phase 2: Add Uneven Count Support

- Implement rotating sit-out strategy
- Add mixed court size support (3-player + 4-player)
- Test with 5, 6, 7 players

### Phase 3: Add Alternative Formats

- Implement 3-player compact format
- Implement social whist format
- Add format selector to UI

### Phase 4: Advanced Features

- Custom format builder
- Saved format templates
- Format validation engine

## Acceptance Criteria

- [ ] Standard 16-player format works unchanged
- [ ] Can create tournament with 12 players (3 courts)
- [ ] Can create tournament with 20 players (5 courts)
- [ ] Uneven counts (5, 6, 7) use appropriate strategies
- [ ] Sit-outs rotate fairly among all players
- [ ] Scoring normalization works across court sizes
- [ ] Redistribution works for 3-player courts
- [ ] UI clearly indicates format and any special handling
- [ ] All formats tested with full tournament flows

## Future Considerations

1. **Adaptive Scheduling**: Dynamic schedule adjustment if players drop out mid-tournament
2. **Multi-Day Tournaments**: Support for tournaments spanning multiple days
3. **Custom Rotation Rules**: User-defined partner rotation patterns
4. **Hybrid Formats**: Start with KoB, finish with bracket finals
5. **Time-Based Rounds**: Add optional time limits per round

## Summary

This architecture supports:

- Standard 4-player King of the Beach (8-32+ players)
- Social/Whist formats for any even player count
- Compact 3-player format for limited space
- Gender-segregated and skill-based variations
- Graceful handling of non-multiple-of-4 player counts through rotating sit-outs and mixed court sizes (3-player + 4-player combinations)

**Not Supported**: Fixed-team tournaments, standard brackets, or King of the Court formats (those require different apps).
