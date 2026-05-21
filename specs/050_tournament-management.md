# Tournament Management

## Flow

1. **Create Tournament** → Enter name, select format (Random/Preseed), select player count (16/32), set rounds
2. **Add Players** → Paste names (with points for Preseed format)
3. **Start** → System assigns to courts, generates QR codes
4. **Run Rounds** → Players enter scores, admin closes rounds
5. **Finish** → Final standings displayed on Total Standings page

## Pages

### Dashboard (`/`)

Shows user's tournaments organized in sections:

**Active Tournaments**

- All ongoing tournaments (status: active)
- Shows round progress: "Round 2 of 3"

**Draft Tournaments**

- Tournaments created but not yet started (status: draft)
- Shows planned number of rounds

**Finished Tournaments**

- All completed tournaments (status: completed)

**Archived Tournaments**

- Max 5 most recent archived tournaments

**Actions**

- "Create Tournament" button (disabled if not logged in)
- Click any tournament card to view/manage

### Create Tournament

Form with:

- Tournament name (required)
- Format: Random Seed or Preseed
- Player count: 8-64 players
- Number of rounds (1-5 for Random, fixed for Preseed)
- **Scoring mode**: Radio buttons for "Single Set", "Best of 3", "Custom"
- **Win By**: Radio buttons for "1" or "2"
- Physical courts: slider (1-16)
- [Create] button

### Add Players (`/tournament/[id]/players`)

Text area:

- Enter one player name per line
- Smart paste: When pasting text containing commas or semicolons, it automatically splits them into separate lines
  - Example: Pasting `Alice, Bob, Carol` becomes three separate lines
  - Example: Pasting `Alice; Bob; Carol` also works
- Preseed format: Enter names with points (e.g., "Nicholas Borchart 142")
- Shows count: "14/16 entered"
- Validation: Must be exactly the configured player count with unique names
- [Start Tournament] button (enabled at correct count)

### Tournament View (`/tournament/[id]`)

- Tournament name and status
- Court cards showing:
  - Court number
  - **QR code at the top** - Players can scan to access the court page
  - Player names (A, B, C, D)
  - Matches completed (e.g., "2/3")
  - Link to open court page
- [Close Round] button (enabled when all matches done)
- Progress: "Round 2 of 3"
- [Delete Tournament] button (visible only for draft tournaments)

### Total Standings (`/tournament/[id]/standings`)

- Podium view with medals for top 3
- Complete rankings table with round-by-round breakdown
- Achievement categories for completed tournaments

## Server Actions

**createTournament**

- Input: name, formatType, playerCount, numRounds
- Creates tournament in 'draft' status

**addPlayers**

- Input: tournamentId, names[]
- Validates exact player count (16 or 32) with unique names
- Creates player records

**startTournament**

- Random Seed: Shuffles players randomly to courts
- Preseed: Distributes players in snake pattern by seed points
- Creates courtRotation for round 1
- Creates matches (4 courts x 3 = 12 for 16p, 8 courts x 3 = 24 for 32p)
- Generates access tokens
- Sets status to 'active', currentRound to 1

**closeRound**

- Validates all matches have scores
- Calculates standings
- Creates next round assignments (format-specific redistribution)
- Generates new tokens
- Increments currentRound
- If last round: sets status to 'completed'

**deleteTournament**

- Verifies user authorization (must be org who created tournament)
- Cascades deletion through all related tables
- Available for all tournaments (not just drafts)
- Shows confirmation dialog before deletion
- Redirects to dashboard after successful deletion
- **Known bug**: Delete form submission not executing (see `840_critical-bugs.md`)
