# Tournament Management (Simple)

## Flow

1. **Create Tournament** → Enter name, number of rounds
2. **Add Players** → Paste 16 names
3. **Start** → System assigns to courts (random), generates QR codes
4. **Run Rounds** → Players enter scores, admin closes rounds
5. **Finish** → Final standings displayed

## Pages

### Dashboard (`/`)
- List of your tournaments
- "Create Tournament" button
- Simple list: Name, Status, Current Round

### Create Tournament
Form with:
- Tournament name (required)
- Number of rounds (default 3)
- [Create] button

### Add Players (`/tournament/[id]/players`)
Text area:
- Paste 16 names (one per line)
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
