# Tournament Management (Simple)

## Flow

1. **Create Tournament** → Enter name, number of rounds
2. **Add Players** → Paste 16 names
3. **Start** → System assigns to courts (random), generates QR codes
4. **Run Rounds** → Players enter scores, admin closes rounds
5. **Finish** → Final standings displayed

## Pages

### Dashboard (`/`)

Shows user's tournaments organized in sections:

**Active Tournaments**

- All ongoing tournaments (status: active)
- Shows round progress: "Round 2 of 3"

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
- Number of rounds (default 3)
- [Create] button

### Add Players (`/tournament/[id]/players`)

Text area:

- Enter one player name per line
- Smart paste: When pasting text containing commas or semicolons, it automatically splits them into separate lines
  - Example: Pasting `Alice, Bob, Carol` becomes three separate lines
  - Example: Pasting `Alice; Bob; Carol` also works
- Shows count: "14/16 entered"
- Validation: Must be exactly 16 unique names
- [Start Tournament] button (enabled at 16)

### Tournament View (`/tournament/[id]`)

- Tournament name and status
- 4 court cards showing:
  - Court number
  - Player names (A, B, C, D)
  - Matches completed (e.g., "2/3")
  - QR code button
- [Close Round] button (enabled when all matches done)
- Progress: "Round 2 of 3"

### QR Codes (`/tournament/[id]/courts`)

- 4 large QR codes
- Each labeled: "Court 1", "Court 2", etc.
- Instructions: "Display at court for players to scan"
- [Print] button

## Server Actions

**createTournament**

- Input: name, numRounds
- Creates tournament in 'draft' status

**addPlayers**

- Input: tournamentId, names[]
- Validates 16 unique names
- Creates player records

**startTournament**

- Shuffles players randomly to 4 courts
- Creates courtRotation for round 1
- Creates 12 matches (4 courts × 3)
- Generates 4 access tokens
- Sets status to 'active', currentRound to 1

**closeRound**

- Validates all matches have scores
- Calculates standings
- Creates next round assignments (seeding or ladder)
- Generates new tokens
- Increments currentRound
- If last round: sets status to 'completed'

That's it. No complex state machines, no manual seeding, no import/export.
