# Tournament Management

## Flow

1. **Create Tournament** (`setup`) → Name, format, rules; 0–64 players optional. No courts yet. See **[099_tournament-setup-and-start.md](./099_tournament-setup-and-start.md)**.
2. **Start Tournament** → Requires **4–64** players; generates round 1. **Always two steps** — there is no "Create & start".
3. **Run Rounds** → Players enter scores (court page and/or player page), admin closes rounds (reopen last closed round: [096](./096_tournament-management-page.md))
4. **Finish** → Final standings displayed on Total Standings page

## Pages

### Home (`/`)

Signed-out visitors see the public landing page (format, features, sign up / log in). Signed-in organizers see the dashboard below.

### Dashboard (signed in)

Shows user's tournaments organized in sections:

**Active Tournaments**

- All ongoing tournaments (status: active)
- Shows round progress: "Round 2 of 3"

**Setup Tournaments** ([099](./099_tournament-setup-and-start.md))

- Created but not started (`status: setup`)
- Shows player count: "14 players · not started"

**Finished Tournaments**

- All completed tournaments (status: completed)

**Archived Tournaments**

- Max 5 most recent archived tournaments

**Actions**

- "+ New Tournament" link (this dashboard is signed-in only)
- Click any tournament card to open the operations view

### Create Tournament (`/tournament/create`)

Combined form with:

- Tournament name (required)
- Format: Random Seed or Pre-Seed (radio buttons)
- Player names textarea (optional on create; 0–64; smart paste with comma/semicolon splitting, tab-separated name+points from spreadsheets). **List order is the seeding** when no points are entered (first name = seed 1). The same `seedRank` is the default last tie-break (`initial_order`).
- Player count: **4–64 at start** (create allows 0). One court (4–6 players) → one round.
- **Scoring mode**: Radio buttons for "Single Set to 21", "Best of 3 to 15", "Custom"
- Custom scoring: match format (single/best-of-3), win-by (1 or 2 radio), points to win, deciding set points
- **Leftover player handling**: Shows court configuration preview (5p/6p/3p bottom court), "Kick leftovers" options
- Physical courts: slider (1-16)
- **Duration estimation**: Live display with round-by-round breakdown
- Number of rounds (auto-calculated for preseed, configurable 1-10 for random seed)
- For preseed: names + optional seed points. Higher points = better seed; omitted or tied points keep list order.
- CSV file upload: Upload WVV Setzliste CSV directly (extracts `spieler1` and `wvv` columns, auto-switches to preseed format)
- [Create] button — saves as `setup`. **No "Create & start"** — always two steps ([099](./099_tournament-setup-and-start.md)).

### Tournament View (`/tournament/[id]`)

- **Header `ops-nav`:** spaced chip links to Manage, Check-in, and Standings.
- **`setup`:** start panel instead of court cards — player count, optional checked-in start, editable rounds and physical courts, Start (≥ 4). See **[099](./099_tournament-setup-and-start.md)**.
- **Round stepper** (full width): `Round 1 → Round 2 → …` — browse past rounds; court links work, past scores read-only. See **[093_round-history-stepper.md](./093_round-history-stepper.md)**.
- Tournament name and status
- Court cards showing:
  - Court number and size badge (3p/4p/5p/6p)
  - **QR code at the top** — Players can scan to access the court page (**stable URL** — persists across rounds and player retirements). Court QRs stay. Optional personal QRs from check-in are a second path ([097](./097_player-check-in.md) / [098](./098_player-page.md)).
  - Player names
  - Matches completed (e.g., "2/3")
  - Shift badge (when virtual courts > physical courts)
  - Link to open court page
- Close round / finalize when every match is done. Until then the action is a hint (`waiting-scores`), not a disabled button. Closing refreshes tournament data so the next round’s court cards and QR links appear immediately.
- Progress: "Round 2 of 3" (`round-label`)
- Manual tie-break rank dialog on a court card when that court is still tied after the statistical factors
- One-line hint linking to Manage → Rules and Manage → Players. Scoring, tie-break editing, retire, injury, and delete are **not** on this page.
- After start: physical-court count on the schedule (same range slider as Create)
- Reopen last round when the current round has no scores (also on Manage → Tournament)
- Polling: `query()` + client interval while visible (not `query.live()` — [1020](./archive/1020_live-query-timeout.md))

### Manage (`/tournament/[id]/manage`) and Check-in (`/tournament/[id]/check-in`) — implemented

Organizer back office and optional check-in. Seed order, add, and remove are setup or round 1 before scores. Court moves are allowed in any round that has no scores yet. Delete asks for confirmation. Player page is a second scoring surface (write-once). See **[095](./095_org-player-experience-index.md)**, [096](./096_tournament-management-page.md), [097](./097_player-check-in.md), [098](./098_player-page.md), [099](./099_tournament-setup-and-start.md).

### Total Standings (`/tournament/[id]/standings`)

- Podium view with medals for top 3
- Complete rankings table with round-by-round breakdown
- Achievement categories for completed tournaments
- Retired players section

## Remote Functions

**tournament-data.remote.ts**

- `getTournamentData(tournamentId)` — query, refreshed on an interval by the page (current-round QR links use the stable `court.token`; a past round in the stepper uses that round’s `courtRotation.token`)

**tournament-actions.remote.ts**

- `closeRoundForm` — form: validates all matches scored, closes round, pre-computes next round assignments
- `deleteTournamentForm` — form on Manage → Tournament: confirm, then cascade-delete and redirect home
- `updateScoringOverrides` — command: per-court-type scoring overrides
- `retirePlayer` — command: validates no scores exist, marks player retired, recalculates courts, regenerates current round
- `reportInjury` — command: validates scores exist, cancels/marks injured matches, marks player retired

**create.remote.ts** (on create page)

- `createTournamentForm` — form: parses player names, saves a `setup` tournament (no round 1). Start is `startTournamentForm`.

**scores.remote.ts** (on court page; shared `$lib/server/save-score.ts` after 098)

- `saveScore` — form: single-set score entry with validation (court token)
- `saveSetScore` — form: per-set score entry for best-of-3 (court token)

Player-token equivalents `savePlayerScore` / `savePlayerSetScore` live on the player page ([098](./098_player-page.md)).
