# Game Rules & Duration Estimation

## Game Rules

### Standard Match Format (4-Player Courts)

Each court plays 3 matches per round. Every player partners with every other player exactly once:

| Match | Team A  | Team B  |
| ----- | ------- | ------- |
| 1     | P1 + P2 | P3 + P4 |
| 2     | P1 + P3 | P2 + P4 |
| 3     | P1 + P4 | P2 + P3 |

### Scoring Modes

The organizer chooses a scoring mode when creating the tournament:

| Mode                 | Description                         | Default for            |
| -------------------- | ----------------------------------- | ---------------------- |
| **Single Set to 21** | One set, first to 21, win by 2      | 4p courts (standard)   |
| **Best of 3 to 15**  | Up to 3 sets, each to 15 (win by 2) | Optional longer format |

#### Single Set to 21 (Default)

- 1 game per match
- Rally scoring: every rally = point
- First to 21 points, must win by 2
- Each player's points = their team's score in each match

#### Best of 3 to 15

- Up to 3 games per match
- Each game: first to 15, must win by 2
- Best of 3: first to win 2 games
- Each player's points = sum of their team's scores across all games they played
- If a match ends 2-0, the 3rd game is not played (no points for game 3)
- All sets (including 3rd) play to 15

### Configurable Parameters

| Parameter         | Default | Range | Notes                                     |
| ----------------- | ------- | ----- | ----------------------------------------- |
| `pointsToWin`     | 21      | 15-25 | Points needed to win a set                |
| `winBy`           | 2       | 1-3   | Minimum point margin to win               |
| `setsToWin`       | 1       | 1-2   | Number of sets needed to win match        |
| `pointsToWinSet2` | 15      | 11-21 | Points for subsequent sets (if best-of-3) |

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

- **1 set to 15 points** (default) or **1 set to 21 points** (organizer choice), win by 2
- **4 games per round** — 2 runs × 2 parallel games
- **One full court**, continuous play, rotating player swaps after every point
- **Run 1**: Fixed team on side X, one fixed player on side Y, two players rotate
- **Run 2**: Different fixed team on side X, different fixed player on side Y, different players rotate
- **Game count**: One player plays 4 games, others play 3 (role randomized across rounds)
- **Ranking**: Average points per round (normalized), then total points, then diff, then playerId

#### 6-Player Courts (Parallel Games, Rotating Every Point)

- **1 set to 15 points** (default) or **1 set to 21 points** (organizer choice), win by 2
- **4 games per round** — 2 runs × 2 parallel games
- **One full court**, continuous play, rotating pair swaps after every point
- **Setup**: Fixed team on side X, two pairs rotate on side Y
- **Game count**: Some players play 3, others play 2 (role randomized across rounds)
- **Ranking**: Average points per round (normalized), then total points, then diff, then playerId

### Rule Inference Table

| 4p Rule            | 3p Court           | 5p Court                              | 6p Court                              |
| ------------------ | ------------------ | ------------------------------------- | ------------------------------------- |
| Single set to 21   | Single set to 21   | 1 set to 15 (default) or configurable | 1 set to 15 (default) or configurable |
| Best-of-3 to 15    | Best-of-3 to 15    | Single set to 15                      | Single set to 15                      |
| Win by 2           | Win by 2           | Win by 2                              | Win by 2                              |
| 3 games/round      | 3 games/round      | 4 parallel games/round                | 4 parallel games/round                |
| Ranking: total pts | Ranking: total pts | Ranking: avg pts/round                | Ranking: avg pts/round                |

**Rationale for 5p/6p defaults**: Two parallel game tracks (15pt each), interleaved by rotating players every point, done in 2 runs = 4 games total. Not truly parallel — approximately same duration as a single game + 10% overhead for player switches. Because players play different numbers of games (3 or 4 in 5-player; 2 or 3 in 6-player), ranking uses **average points per round** to normalize performance. Ties are broken by total points (more data = advantage), then differential, then playerId. For 3-player courts, all players play the same number of games, so standard total-points ranking applies.

---

## Duration Estimation

### Purpose

Tournament organizers need to tell players "the tournament will take approximately X hours." This depends on multiple factors that the system can calculate.

### Duration Components

```
Total Duration = (Rounds × Round Duration) + ((Rounds - 1) × Transition Time) + Setup Time
```

| Component           | Description                                                             | Default    |
| ------------------- | ----------------------------------------------------------------------- | ---------- |
| **Setup Time**      | Initial court setup, player briefing                                    | 15 min     |
| **Round Duration**  | Time for one round (all courts play)                                    | Calculated |
| **Transition Time** | Score finalization, redistribution, new court assignments, player break | 10 min     |

### Round Duration Calculation

Round duration depends on the **bottleneck** — the slowest court to finish:

```
Round Duration = max(Court Duration for each active court)
```

#### Court Duration by Type

| Court Type    | Games       | Points/Game | Est. Court Duration |
| ------------- | ----------- | ----------- | ------------------- |
| 4p (21pt)     | 3           | 21          | ~45 min             |
| 4p (15pt BO3) | up to 3×3=9 | 15          | ~55 min             |
| 3p (21pt)     | 3           | 21          | ~35 min             |
| 5p (15pt)     | 4           | 15          | ~45 min             |
| 6p (15pt)     | 4           | 15          | ~45 min             |

**Note on 5p/6p courts**: The parallel games are not truly parallel — they alternate points with player switches. Duration is approximately the same as a single game with the same total points, plus ~10% overhead for switching players in and out.

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

#### Court Duration Defaults

| Court Type           | Default Duration | Notes                            |
| -------------------- | ---------------- | -------------------------------- |
| 4p (21pt single set) | 45 min           | 3 games, ~15 min each            |
| 4p (15pt best-of-3)  | 55 min           | Up to 9 games                    |
| 3p (21pt)            | 35 min           | 3 games, faster rallies (2v1)    |
| 5p (15pt)            | 45 min           | 4 games + 10% switching overhead |
| 6p (15pt)            | 45 min           | 4 games + 10% switching overhead |

### Virtual Court Scheduling

With virtual courts (N virtual > M physical), the round is split into shifts:

```
Shifts per round = ceil(N / M)
Round Duration = Shifts per round × Max Court Duration per Shift + (Shifts - 1) × Shift Transition Time
```

**Example**: 8 virtual courts, 4 physical courts

- 2 shifts per round
- Each shift: 4 courts play simultaneously, max 45 min
- Shift transition: 10 min
- Round Duration = 2 × 45 + 1 × 10 = 100 minutes

### Total Tournament Duration

```
Total = Setup + (Rounds × Round Duration) + ((Rounds - 1) × Transition) + Buffer
```

| Tournament Size             | Courts     | Rounds | Est. Round Duration | Total (with transitions) |
| --------------------------- | ---------- | ------ | ------------------- | ------------------------ |
| 16p (4 courts)              | 4          | 3      | 45 min              | ~2h 45min                |
| 32p (8 courts)              | 8          | 4      | 45 min              | ~3h 45min                |
| 24p (6 courts)              | 6          | 4      | 45 min              | ~3h 30min                |
| 16p (2 physical, 4 virtual) | 2×2 shifts | 3      | 100 min             | ~5h 40min                |
| 20p (5 courts, preseed)     | 5          | 4      | 45 min              | ~3h 30min                |
| 8p (2 courts)               | 2          | 2      | 45 min              | ~1h 45min                |

### UI: Duration Estimate Display

On tournament creation page, show:

```
Estimated Duration: ~3h 30min
├─ Setup: 15 min
├─ Round 1: 45 min
├─ Transition: 10 min
├─ Round 2: 45 min
├─ Transition: 10 min
├─ Round 3: 45 min
├─ Transition: 10 min
├─ Round 4: 45 min
└─ Buffer: 15 min

Based on: 6 courts, 24 players, single set to 21, preseed format
```

The estimate updates live as the organizer changes settings.

### Configurable Timing Parameters

| Parameter                   | Default | Description                                                            |
| --------------------------- | ------- | ---------------------------------------------------------------------- |
| `setupTimeMinutes`          | 15      | Time before first round                                                |
| `transitionTimeMinutes`     | 10      | Time between rounds (score finalization, redistribution, player break) |
| `avgRallyDurationSeconds`   | 35      | Average rally length                                                   |
| `timeBetweenRalliesSeconds` | 8       | Serve setup time                                                       |
| `timeBetweenMatchesMinutes` | 3       | Score recording, team rotation                                         |

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
scoringMode: text('scoring_mode').default('single-21'); // 'single-21' | 'best-of-3-15'
pointsToWin: integer('points_to_win').default(21);
winBy: integer('win_by').default(2);
setsToWin: integer('sets_to_win').default(1);
pointsToWinSet2: integer('points_to_win_set_2').default(15);
schedulingMode: text('scheduling_mode').default('batch'); // 'batch' | 'rolling'
```

---

## Decisions (Previously Open Questions)

1. **Best-of-3 scoring**: All sets (including 3rd) play to 15.
2. **Duration by skill level**: No presets. Use defaults, organizers can adjust manually.
3. **Break time**: 10 min transition between rounds (includes score finalization, redistribution, player break).
4. **Parallel game timing**: Not truly parallel. ~Same as single game + 10% overhead for player switches.
5. **Score validation**: 5/6p courts play 1 set to 15, win by 2. 3p courts use same rules as 4p courts.
