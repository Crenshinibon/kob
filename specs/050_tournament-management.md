# Tournament Management

## Flow

1. **Create Tournament** (`setup`) → Name, format, rules; 0–64 players optional. No courts yet. See **[099_tournament-setup-and-start.md](./099_tournament-setup-and-start.md)** (proposed).
2. **Start Tournament** → Requires 8–64 players; generates round 1. Optional "Create & start" on the creation form.
3. **Run Rounds** → Players enter scores, admin closes rounds (reopen last closed round: [096](./096_tournament-management-page.md))
4. **Finish** → Final standings displayed on Total Standings page

**Note (current implementation):** Tournaments are still created as `active` with Round 1 immediately generated. Spec 099 proposes splitting create and start.

## Pages

### Dashboard (`/`)

Shows user's tournaments organized in sections:

**Active Tournaments**

- All ongoing tournaments (status: active)
- Shows round progress: "Round 2 of 3"

**Setup Tournaments** (proposed — [099](./099_tournament-setup-and-start.md))

- Created but not started (`status: setup`)
- Shows player count: "14 players · not started"

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
- Player names textarea (supports smart paste with comma/semicolon splitting, tab-separated name+points from spreadsheets)
- For preseed: names + seed points input
- CSV file upload: Upload WVV Setzliste CSV directly (extracts `spieler1` and `wvv` columns, auto-switches to preseed format)
- [Create] button — saves as `setup` (proposed 099); today still starts immediately
- [Create & start] — proposed 099, same as today's Create when ≥ 8 names are pasted

### Tournament View (`/tournament/[id]`)

- **Round stepper** (full width): `Round 1 → Round 2 → …` — browse past rounds; court links work, past scores read-only. See **[093_round-history-stepper.md](./093_round-history-stepper.md)**.
- Tournament name and status
- Court cards showing:
  - Court number and size badge (3p/4p/5p/6p)
  - **QR code at the top** - Players can scan to access the court page (**stable URL** — persists across rounds and player retirements). **Proposed (098/097):** court QRs stay. Optional personal QRs from check-in are a second path.
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

### Proposed: Manage (`/tournament/[id]/manage`) and Check-in (`/tournament/[id]/check-in`)

Organizer back office (roster edits, swap/move players **before scores**, rules, finish early, reopen last round), **optional** player check-in (personal QRs alongside court QRs), player page as an additional scoring surface (current game + upcoming), and create ≠ start. Not implemented — see **[095_org-player-experience-index.md](./095_org-player-experience-index.md)**, [096](./096_tournament-management-page.md), [097](./097_player-check-in.md), [098](./098_player-page.md), [099](./099_tournament-setup-and-start.md).

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

**scores.remote.ts** (on court page; shared `$lib/server/save-score.ts` after 098)

- `saveScore` — form: single-set score entry with validation (court token)
- `saveSetScore` — form: per-set score entry for best-of-3 (court token)

Player-token equivalents `savePlayerScore` / `savePlayerSetScore` live on the player page ([098](./098_player-page.md)).
