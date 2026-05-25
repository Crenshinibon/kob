# Tournament Management

## Flow

1. **Create Tournament** → Enter name, format, player count, scoring mode, add player names — tournament starts immediately (no draft state)
2. **Run Rounds** → Players enter scores, admin closes rounds
3. **Finish** → Final standings displayed on Total Standings page

**Note**: The draft status exists in the schema but is never used. Tournaments are created as `active` with Round 1 immediately generated. There is no separate "add players" step — player names are entered on the creation form.

## Pages

### Dashboard (`/`)

Shows user's tournaments organized in sections:

**Active Tournaments**

- All ongoing tournaments (status: active)
- Shows round progress: "Round 2 of 3"

**Draft Tournaments**

- Currently empty (tournaments skip draft status and go straight to active)

**Finished Tournaments**

- All completed tournaments (status: completed)

**Archived Tournaments**

- Max 5 most recent archived tournaments

**Actions**

- "Create Tournament" button (disabled if not logged in)
- Click any tournament card to view/manage

### Create Tournament (`/tournament/create`)

Combined form with:

- Tournament name (required)
- Format: Random Seed or Pre-Seed (radio buttons)
- Player count: 8-64 players (entered via player names)
- **Scoring mode**: Radio buttons for "Single Set to 21", "Best of 3 to 15", "Custom"
- Custom scoring: match format (single/best-of-3), win-by (1 or 2 radio), points to win, deciding set points
- **Leftover player handling**: Shows court configuration preview (5p/6p/3p bottom court), "Kick leftovers" options
- Physical courts: slider (1-16)
- **Duration estimation**: Live display with round-by-round breakdown
- Number of rounds (auto-calculated for preseed, configurable 1-10 for random seed)
- Player names textarea (supports smart paste with comma/semicolon splitting)
- For preseed: names + seed points input
- [Create] button — immediately starts tournament with Round 1

### Tournament View (`/tournament/[id]`)

- Tournament name and status
- Court cards showing:
  - Court number and size badge (3p/4p/5p/6p)
  - **QR code at the top** - Players can scan to access the court page (**stable URL** — persists across rounds and player retirements)
  - Player names
  - Matches completed (e.g., "2/3")
  - Shift badge (when virtual courts > physical courts)
  - Link to open court page
- [Close Round] button (enabled when all matches done)
- Progress: "Round 2 of 3"
- Scoring overrides configuration (per court type, collapsible sections)
- Player retirement form (collapsible, between rounds only)
- Injury reporting form (collapsible, during active rounds)
- [Delete Tournament] button
- **Live query**: Auto-updates court data every 3 seconds via `query.live()`

### Total Standings (`/tournament/[id]/standings`)

- Podium view with medals for top 3
- Complete rankings table with round-by-round breakdown
- Achievement categories for completed tournaments
- Retired players section

## Remote Functions

**tournament-data.remote.ts**

- `getTournamentData(tournamentId)` — regular query
- `getTournamentDataLive(tournamentId)` — live query with 3-second polling

**tournament-actions.remote.ts**

- `closeRoundForm` — form: validates all matches scored, closes round, pre-computes next round assignments
- `deleteTournamentForm` — form: cascades deletion through all related tables
- `updateScoringOverrides` — command: per-court-type scoring overrides
- `retirePlayer` — command: validates no scores exist, marks player retired, recalculates courts, regenerates current round
- `reportInjury` — command: validates scores exist, cancels/marks injured matches, marks player retired

**create.remote.ts** (on create page)

- `createTournamentForm` — form: parses player names, validates count, calculates court config, creates tournament + players + round 1, redirects

**scores.remote.ts** (on court page)

- `saveScore` — form: single-set score entry with validation
- `saveSetScore` — form: per-set score entry for best-of-3
