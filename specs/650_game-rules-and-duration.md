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

| Mode              | Description                                                         |
| ----------------- | ------------------------------------------------------------------- |
| **One Set to 21** | Single set, first to 21, win by 2 (default)                         |
| **Best of 3**     | First to 2 sets. Regular sets to 21, deciding set to 15, win by 2   |
| **Custom**        | Organizer sets regular set points, deciding set points, sets to win |

Picking "One Set to 21" or "Best of 3" uses the defaults above with no further configuration.
Picking "Custom" reveals editable fields for points and match length.

#### One Set to 21 (Default)

- 1 set per match
- Rally scoring: every rally = point
- First to 21 points, must win by 2
- Each player's points = their team's score

#### Best of 3

- Up to 3 sets per match. First to win 2 sets wins.
- Regular sets (1st, 2nd): first to `pointsToWin` (default 21), win by 2
- Deciding set (3rd): first to `decidingSetPoints` (default 15), win by 2
- All regular sets play to the **same** point target — only the deciding set is shorter
- If a match ends 2-0 the 3rd set is not played

#### Custom

Organizer can adjust:

- **Regular set points** (9–21, default 21)
- **Deciding set points** (9–21, default 15) — only relevant if best-of-3
- **Win by** margin (1 or 2, default 2)
- **Sets to win**: 1 (single set) or 2 (best-of-3)

### Configurable Parameters

| Parameter           | Default | Range | Notes                                                |
| ------------------- | ------- | ----- | ---------------------------------------------------- |
| `pointsToWin`       | 21      | 9-21  | Points needed to win a regular set                   |
| `winBy`             | 2       | 1-2   | Minimum point margin to win (radio: 1 or 2)          |
| `setsToWin`         | 1       | 1-2   | Sets needed to win match (radio: single or best-of-3)|
| `decidingSetPoints` | 15      | 9-21  | Points for the deciding set only (if best-of-3)      |

**UI note**: "Match Format" (single set vs best-of-3) and "Win By" (1 vs 2) should use radio buttons, not `<select>` dropdowns, since they only have two options.

### Special Court Rules (3p, 5p, 6p)

**Inference rule**: Special court rules are derived from the standard 4p rules unless explicitly overridden by the organizer.

**Org override**: The organizer can override scoring mode for non-standard courts (3p, 5p, 6p) when they are relevant to the tournament. This is configurable in tournament settings.

#### 3-Player Courts

- **Default**: Same scoring mode as 4p courts (single set or best-of-3)
- **Default point target**: Same as 4p courts (e.g., 21)
- **Org override**: Can configure different points/win-by/sets
- **Same number of matches**: 3 per round
- **Different team composition**: 2v1 format
  - Match 1: A+B vs C
  - Match 2: A+C vs B
  - Match 3: B+C vs A
- The solo player uses all 3 team touches themselves

#### 5-Player Courts (Parallel Games, Rotating Every Point)

- **Default**: 1 set to 15 points, win by 2
- **Org override**: Can configure to 21 points, best-of-3, or custom settings
- **4 games per round** — 2 runs × 2 parallel games
- **One full court**, continuous play, rotating player swaps after every point
- **Run 1**: Fixed team on side X, one fixed player on side Y, two players rotate
- **Run 2**: Different fixed team on side X, different fixed player on side Y, different players rotate
- **Game count**: One player plays 4 games, others play 3 (role randomized across rounds)
- **Ranking**: Average points per round (normalized), then total points, then diff, then playerId

#### 6-Player Courts (Parallel Games, Rotating Every Point)

- **Default**: 1 set to 15 points, win by 2
- **Org override**: Can configure to 21 points, best-of-3, or custom settings
- **4 games per round** — 2 runs × 2 parallel games
- **One full court**, continuous play, rotating pair swaps after every point
- **Setup**: Fixed team on side X, two pairs rotate on side Y
- **Partnership rule**: No pair of players partners together in both runs. Players mix up as much as possible.
- **Game count**: 4 players play 3 games, 2 players play 2 games (diff ≤ 1, roles randomized across rounds)
- **Ranking**: Average points per round (normalized), then total points, then diff, then playerId

### Rule Inference Table

| 4p Rule            | 3p Court           | 5p Court                              | 6p Court                              |
| ------------------ | ------------------ | ------------------------------------- | ------------------------------------- |
| Single set to 21   | Single set to 21   | 1 set to 15 (default) or org override | 1 set to 15 (default) or org override |
| Best-of-3 to 15    | Best-of-3 to 15    | Single set to 15 or org override      | Single set to 15 or org override      |
| Win by 2           | Win by 2           | Win by 2 or org override              | Win by 2 or org override              |
| 3 games/round      | 3 games/round      | 4 parallel games/round                | 4 parallel games/round                |
| Ranking: total pts | Ranking: total pts | Ranking: avg pts/round                | Ranking: avg pts/round                |

**Org override**: When non-standard courts are active, organizer can configure custom scoring per court type (3p, 5p, 6p) via tournament settings. Overrides include points to win, win-by margin, and sets to win.

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

Round duration depends on the **bottleneck** — the slowest court among the active courts in one shift:

```
Shift Duration    = max(Court Duration for courts in one shift)
Round Duration    = Shifts × Shift Duration + (Shifts - 1) × Shift Transition
Shift Transition  = 5 min (players swap, score posting)
```

Courts per shift = physical court count. Only active (physical-many) courts are considered; the shift runs as long as the slowest court in that shift.

#### Court Duration Formula

Simple linear scaling model: **a single game to 21 points takes ~18 minutes**. Other point targets scale proportionally.

```
Game Duration     = 18 × (pointsToWin / 21) minutes
Court Duration    = Matches × Game Duration
                    + (Matches - 1) × Time between Matches
                    × (1.1 if 5p/6p court, else 1.0)
```

Where:

- `pointsToWin` = points needed to win a game (21 for 4p/3p, 15 for 5p/6p)
- `Time between Matches` = 3 minutes (score recording)

#### Court Duration Defaults

| Court Type            | Games | Point Target | Court Duration                       |
| --------------------- | ----- | ------------ | ------------------------------------ |
| 4p (single set to 21) | 3     | 21           | ~60 min (3 × 18 + 2 × 3)             |
| 4p (best-of-3 to 15)  | ≤9    | 15           | ~55 min (avg 4.5 games × 13 + 2 × 3) |
| 3p (single set to 21) | 3     | 21           | ~48 min (3 × 14 + 2 × 3)             |
| 5p (single set to 15) | 4     | 15           | ~60 min (4 × 13 + 3 × 3) × 1.1       |
| 6p (single set to 15) | 4     | 15           | ~60 min (4 × 13 + 3 × 3) × 1.1       |

3p courts: 80% of 4p game duration (faster rallies in 2v1).

### Virtual Court Scheduling

With virtual courts (N virtual > M physical), the round is split into shifts:

```
Shifts per round = ceil(N / M)
Round Duration = Shifts per round × Max Court Duration per Shift + (Shifts - 1) × Shift Transition Time
```

**Example**: 8 virtual courts, 4 physical courts

- 2 shifts per round
- Each shift: 4 courts play simultaneously, max 60 min
- Shift transition: 5 min
- Round Duration = 2 × 60 + 1 × 5 = 125 minutes

### Total Tournament Duration

```
Total = Setup + (Rounds × Round Duration) + ((Rounds - 1) × Transition) + Buffer
```

| Tournament Size            | Courts     | Rounds | Est. Round Duration | Total (with transitions) |
| -------------------------- | ---------- | ------ | ------------------- | ------------------------ |
| 16p (4 courts, 4 physical) | 4          | 3      | 60 min              | ~3h 30min                |
| 32p (8 courts, 8 physical) | 8          | 4      | 60 min              | ~4h 45min                |
| 24p (6 courts, 6 physical) | 6          | 4      | 60 min              | ~4h 30min                |
| 32p (8 courts, 4 physical) | 2×2 shifts | 4      | 125 min             | ~9h 0min                 |
| 30p (8 courts, 4 physical) | 2×2 shifts | 4      | 125 min             | ~9h 0min                 |
| 20p (5 courts, 5 physical) | 5          | 4      | 60 min              | ~4h 30min                |
| 8p (2 courts, 2 physical)  | 2          | 2      | 60 min              | ~2h 15min                |

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
scoringMode: text('scoring_mode').default('single-21'); // 'single-21' | 'best-of-3' | 'custom'
pointsToWin: integer('points_to_win').default(21);
winBy: integer('win_by').default(2);
setsToWin: integer('sets_to_win').default(1);
decidingSetPoints: integer('deciding_set_points').default(15);
schedulingMode: text('scheduling_mode').default('batch'); // 'batch' | 'rolling'
```

### Match Tables (Updated)

All match tables now include a `setNumber` column to support best-of-3 scoring:

```typescript
// match, match3Player, match5Player, match6Player all have:
setNumber: integer('set_number').notNull().default(1);
```

- For single-set matches: `setNumber = 1` (default)
- For best-of-3: Multiple rows per match with `setNumber = 1, 2, 3`
- Match is won when a team wins `setsToWin` sets

---

## Decisions (Previously Open Questions)

1. **Best-of-3 scoring**: All sets (including 3rd) play to 15.
2. **Duration by skill level**: No presets. Use defaults, organizers can adjust manually.
3. **Break time**: 10 min transition between rounds (includes score finalization, redistribution, player break).
4. **Parallel game timing**: Not truly parallel. ~Same as single game + 10% overhead for player switches.
5. **Score validation**: 5/6p courts play 1 set to 15, win by 2. 3p courts use same rules as 4p courts.
6. **Score validation enforcement**: System must validate scores match the configured rules (points to win, win-by margin). Currently not enforced correctly (see `840_critical-bugs.md`).
