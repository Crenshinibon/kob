# Game Rules & Duration Estimation

## Game Rules

### Standard Match Format (4-Player Courts)

Each court plays 3 matches per round. Every player partners with every other player exactly once:

| Match | Team A | Team B |
|-------|--------|--------|
| 1 | P1 + P2 | P3 + P4 |
| 2 | P1 + P3 | P2 + P4 |
| 3 | P1 + P4 | P2 + P3 |

### Scoring Modes

The organizer chooses a scoring mode when creating the tournament:

| Mode | Description | Default for |
|------|-------------|-------------|
| **Single Set to 21** | One set, first to 21, win by 2, cap 25 | 4p courts (standard) |
| **Best of 3 to 15** | Up to 3 sets, each to 15 (win by 2, cap 19), 3rd set to 15 | Optional longer format |

#### Single Set to 21 (Default)

- 1 game per match
- Rally scoring: every rally = point
- First to 21 points, must win by 2
- Cap at 25 (first to 25 wins regardless of margin)
- Each player's points = their team's score in each match

#### Best of 3 to 15

- Up to 3 games per match
- Each game: first to 15, must win by 2, cap at 19
- Best of 3: first to win 2 games
- Each player's points = sum of their team's scores across all games they played
- If a match ends 2-0, the 3rd game is not played (no points for game 3)

### Configurable Parameters

| Parameter | Default | Range | Notes |
|-----------|---------|-------|-------|
| `pointsToWin` | 21 | 15-25 | Points needed to win a set |
| `winBy` | 2 | 1-3 | Minimum point margin to win |
| `pointCap` | 25 | 20-30 | Absolute maximum points per set |
| `setsToWin` | 1 | 1-2 | Number of sets needed to win match |
| `pointsToWinSet2` | 15 | 11-21 | Points for subsequent sets (if best-of-3) |

### Special Court Rules (3p, 5p, 6p)

**Inference rule**: Special court rules are derived from the standard 4p rules unless explicitly overridden by the organizer.

#### 3-Player Courts

- **Same scoring mode** as 4p courts (single set or best-of-3)
- **Same point target** (e.g., 21)
- **Same number of matches**: 3 per round
- **Different team composition**: 2v1 format
  - Match 1: A+B vs C
  - Match 2: A+C vs B
  - Match 3: B+C vs A
- The solo player uses all 3 team touches themselves

#### 5-Player Courts (Parallel Games, Rotating Every Point)

- **Inferred from 4p rules**: If 4p uses 21 points, 5p uses 15 points
- **4 games per round** (not 3) — two parallel game tracks, done twice
- **One full court**, continuous play, rotating player swaps after every point
- **Setup**: 2 fixed players (team A+B), 1 fixed opponent (C), 2 rotating (D+E)
- **Game tracks**: Game A = 1+2 vs 3+D (scored when D is on), Game B = 1+2 vs 3+E (scored when E is on)
- **Both tracks play to 15 points**, interleaved by alternating D/E every point
- **Pairing randomization**: Roles randomized each round
- **Override**: Organizer can set custom point target (default: 15)

#### 6-Player Courts (Parallel Games, Rotating Every Point)

- **Inferred from 4p rules**: If 4p uses 21 points, 6p uses 15 points
- **4 games per round** (not 3) — two parallel game tracks, done twice
- **One full court**, continuous play, rotating pair swaps after every point
- **Setup**: 2 fixed players (team A+B), 2 rotating pairs (C+D and E+F)
- **Game tracks**: Game A = 1+2 vs C+D (scored when C+D on), Game B = 1+2 vs E+F (scored when E+F on)
- **Both tracks play to 15 points**, interleaved by alternating pairs every point
- **Pairing randomization**: Roles randomized each round
- **Override**: Organizer can set custom point target (default: 15)

#### 6-Player Courts (Rotating Players)

- **Inferred from 4p rules**: If 4p uses 21 points, 6p uses 15 points
- **4 games per round** (not 3)
- **One full court**, no split — rotating player system
- **Setup**: 2 fixed players (team), 2 pairs rotating every point
- **Games**: 1+2 vs 3+4, 1+2 vs 5+6, repeat = 4 games
- **Pairing randomization**: Roles (fixed/rotating) are randomized each round
- **Override**: Organizer can set custom point target (default: 15)

### Rule Inference Table

| 4p Rule | 3p Court | 5p Court | 6p Court |
|---------|----------|----------|----------|
| Single set to 21 | Single set to 21 | Single set to 15 | Single set to 15 |
| Best-of-3 to 15 | Best-of-3 to 15 | Single set to 15 | Single set to 15 |
| Win by 2 | Win by 2 | Win by 2 | Win by 2 |
| Cap 25 | Cap 25 | Cap 19 | Cap 19 |
| 3 games/round | 3 games/round | 4 parallel games/round | 4 parallel games/round |

**Rationale for 5p/6p defaults**: Two parallel game tracks (15pt each), interleaved by rotating players every point, done twice = 4 games total. Total duration ≈ 3 games at 21 points on a standard court.

---

## Duration Estimation

### Purpose

Tournament organizers need to tell players "the tournament will take approximately X hours." This depends on multiple factors that the system can calculate.

### Duration Components

```
Total Duration = (Rounds × Round Duration) + ((Rounds - 1) × Transition Time) + Setup Time
```

| Component | Description | Default |
|-----------|-------------|---------|
| **Setup Time** | Initial court setup, player briefing | 15 min |
| **Round Duration** | Time for one round (all courts play) | Calculated |
| **Transition Time** | Score finalization, redistribution, new court assignments | 5 min |

### Round Duration Calculation

Round duration depends on the **bottleneck** — the slowest court to finish:

```
Round Duration = max(Court Duration for each active court)
```

#### Court Duration by Type

| Court Type | Games | Points/Game | Est. Rally Duration | Est. Court Duration |
|------------|-------|-------------|--------------------|--------------------|
| 4p (21pt) | 3 | 21 | ~45 sec/rally | ~45 min |
| 4p (15pt BO3) | up to 3×3=9 | 15 | ~40 sec/rally | ~55 min |
| 3p (21pt) | 3 | 21 | ~30 sec/rally | ~35 min |
| 5p (15pt) | 4 | 15 | ~40 sec/rally | ~40 min |
| 6p (15pt) | 4 | 15 | ~40 sec/rally | ~40 min |

**Rally duration estimates** are configurable defaults. The system uses:
- Average rallies per game ≈ pointsToWin × 1.5 (accounts for side-outs)
- Average rally duration ≈ 30-45 seconds (depends on court size and skill level)

#### Court Duration Formula

```
Court Duration = Matches × Games per Match × (Avg Rallies per Game × Avg Rally Duration + Time between Rallies)
```

Where:
- `Avg Rallies per Game` = `pointsToWin × 1.5` (heuristic)
- `Avg Rally Duration` = 35 seconds (default, configurable)
- `Time between Rallies` = 8 seconds (serve setup, whistle)
- `Time between Matches` = 3 minutes (score recording, team rotation)

#### Example Calculations

**Standard 4p court (21pt single set)**:
- 3 matches × 1 game × (21 × 1.5 rallies × 35s + 21 × 1.5 × 8s) + 3 × 3min between matches
- = 3 × (31.5 rallies × 43s) + 9min
- = 3 × 22.5min + 9min
- = 67.5 + 9 ≈ 77 min... that seems high.

Let me recalibrate with real-world data:
- A 21-point set typically takes 15-20 minutes
- 3 matches = 45-60 minutes
- **Default: 45 minutes** for a standard 4p court

**5p court (15pt parallel)**:
- 4 matches × 1 game × ~12 min each = 48 min
- But parallel: 2 games at once, so effective = 24 min + overhead
- **Default: 40 minutes** (parallel format is faster per game but has rotation overhead)

**3p court (21pt)**:
- 3 matches, faster rallies (2v1 advantage)
- **Default: 35 minutes**

### Virtual Court Scheduling

With virtual courts (N virtual > M physical), the round is split into shifts:

```
Shifts per round = ceil(N / M)
Round Duration = Shifts per round × Max Court Duration per Shift + (Shifts - 1) × Shift Transition Time
```

**Example**: 8 virtual courts, 4 physical courts
- 2 shifts per round
- Each shift: 4 courts play simultaneously, max 45 min
- Shift transition: 5 min
- Round Duration = 2 × 45 + 1 × 5 = 95 minutes

### Total Tournament Duration

```
Total = Setup + (Rounds × Round Duration) + ((Rounds - 1) × Transition) + Buffer
```

| Tournament Size | Courts | Rounds | Est. Round Duration | Total (with transitions) |
|-----------------|--------|--------|--------------------|-----------------------|
| 16p (4 courts) | 4 | 3 | 45 min | ~2h 30min |
| 32p (8 courts) | 8 | 4 | 45 min | ~3h 30min |
| 24p (6 courts) | 6 | 4 | 45 min | ~3h 15min |
| 16p (2 physical, 4 virtual) | 2×2 shifts | 3 | 95 min | ~5h 15min |
| 20p (5 courts, preseed) | 5 | 4 | 45 min | ~3h 15min |
| 8p (2 courts) | 2 | 2 | 45 min | ~1h 35min |

### UI: Duration Estimate Display

On tournament creation page, show:

```
Estimated Duration: ~3h 15min
├─ Setup: 15 min
├─ Round 1: 45 min
├─ Transition: 5 min
├─ Round 2: 45 min
├─ Transition: 5 min
├─ Round 3: 45 min
├─ Transition: 5 min
├─ Round 4: 45 min
└─ Buffer: 15 min

Based on: 6 courts, 24 players, single set to 21, preseed format
```

The estimate updates live as the organizer changes settings.

### Configurable Timing Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `setupTimeMinutes` | 15 | Time before first round |
| `transitionTimeMinutes` | 5 | Time between rounds |
| `avgRallyDurationSeconds` | 35 | Average rally length |
| `timeBetweenRalliesSeconds` | 8 | Serve setup time |
| `timeBetweenMatchesMinutes` | 3 | Score recording, rotation |
| `bufferPercent` | 10 | Extra time buffer (%) |

Organizers can adjust these for their venue/player skill level.

### Duration Estimate Accuracy

The estimate is a **forecast**, not a guarantee. Factors that affect actual duration:
- Player skill level (beginners = longer rallies, more errors)
- Score disputes / re-entry of scores
- Weather delays (outdoor beach volleyball)
- Player breaks between rounds
- Court availability delays (physical court conflicts)

The system should show the estimate as "~3h 15min" (with tilde) to indicate approximation.

---

## Database Schema Additions

### Tournament Table

```typescript
// New columns:
scoringMode: text('scoring_mode').default('single-21')  // 'single-21' | 'best-of-3-15'
pointsToWin: integer('points_to_win').default(21)
winBy: integer('win_by').default(2)
pointCap: integer('point_cap').default(25)
setsToWin: integer('sets_to_win').default(1)
pointsToWinSet2: integer('points_to_win_set_2').default(15)

// Timing parameters
setupTimeMinutes: integer('setup_time_minutes').default(15)
transitionTimeMinutes: integer('transition_time_minutes').default(5)
avgRallyDurationSeconds: integer('avg_rally_duration_seconds').default(35)
bufferPercent: integer('buffer_percent').default(10)
```

### Court-Specific Overrides (Optional)

For advanced organizers who want different rules per court size:

```typescript
// New table: courtRuleOverride
{
  id: serial('id').primaryKey(),
  tournamentId: integer('tournament_id').notNull(),
  courtSize: integer('court_size').notNull(),  // 3, 5, or 6
  pointsToWin: integer('points_to_win'),
  matchesPerRound: integer('matches_per_round'),
  // null = use inferred default
}
```

---

## Open Questions

1. **Best-of-3 scoring**: Should the 3rd set always be to 15, or should it be configurable separately (e.g., 3rd set to 11)?
2. **Point cap**: Should the cap always be `pointsToWin + 4`, or should it be independently configurable?
3. **Duration by skill level**: Should we offer "beginner / intermediate / advanced" presets that adjust rally duration estimates?
4. **Break time**: Should the estimate include optional player break time between rounds (e.g., 10 min every 2 rounds)?
5. **Parallel game timing**: For 5/6p courts, does the round duration equal the time for 4 sequential games, or is it shorter because 2 games run in parallel? Need to clarify: are the 4 games truly parallel (2 at a time) or sequential?
6. **Score validation per mode**: Currently validated at 21 points, win by 2. Need to make validation dynamic based on tournament scoring mode.
