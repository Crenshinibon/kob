# Requirements Specification: King of the Beach (KoB) Tracker

## 1. Overview

The purpose of this project is to provide a simple, mobile-first web application to track a "King of the Beach" beach volleyball tournament.

The core concept is to manage individual rankings within a 2v2 format. Players rotate partners on a single court, and their individual performance determines if they move up to a higher court or down to a lower court in subsequent rounds.

## 2. Assumptions & Constraints

- **Player Count:** Supports **16 players** (4 courts) or **32 players** (8 courts).
- **Players per Court:** Fixed at 4 players per court.
- **Platform:** Mobile-web optimized (users will access via smartphones on the beach).
- **Formats:**
  - **Random Seed**: Flexible round count, ladder redistribution.
  - **Preseed**: Fixed rounds (3 for 16p, 4 for 32p), tiered binary redistribution based on seed points.

## 3. User Roles

### 3.1 Authenticated User ("Org")

- **Permissions:** Full administrative rights.
- **Capabilities:**
  - Create, edit, and delete tournaments.
  - Generate and share court links/QR codes.
  - Control the flow: "Start Tournament", "Close Round", "Finalize Tournament".

### 3.2 Anonymous User ("Player")

- **Permissions:** Temporary write access to specific court data.
- **Capabilities:**
  - Access a specific court via a unique URL/QR code.
  - Enter match results for that court.
  - View live standings for that court.
- **Constraint:** Players can only edit results while the round is **Active**. Once the Org closes a round, the view becomes read-only.

## 4. Feature: Creating & Editing Tournaments

### 4.1 Tournament Setup

Only the Org can create a tournament. The creation form requires:

- **Name:** (String, Default: "KoB [Date]")
- **Format:**
  - **Random Seed:** First round random placement, then ladder system. Configurable number of rounds (1-5).
  - **Preseed:** Seeding based on player points. Fixed rounds: 3 for 16 players, 4 for 32 players.
- **Player Count:** 16 or 32 players.

### 4.2 Player Management

- **Input:** The Org inputs player names via a text field (one name per line) or pasteboard.
- **Smart Paste:** When pasting text containing commas or semicolons, it automatically splits them into separate lines.
- **Preseed Format:** Players must be entered with seed points (name followed by points, whitespace-separated).
- **Validation:** The system validates the exact required player count (16 or 32) with unique names.
  - _Error Handling:_ If the wrong count is provided, the system prevents starting the tournament and prompts the user to fix the count.

## 5. Feature: Running the Tournament

### 5.1 Starting

- When "Start Tournament" is clicked, the system locks the player list and generates unique URLs (one for each court).
- The Org can display/print QR codes for these URLs to distribute to players.

### 5.2 Round Logic (The "Court Engine")

Each court always contains 4 players (A, B, C, D). The system automatically generates 3 matches to ensure every player partners with every other player exactly once:

1.  **Match 1:** A & B vs. C & D
2.  **Match 2:** A & C vs. B & D
3.  **Match 3:** A & D vs. B & C

### 5.3 Scoring & Standings

- Players enter the final score of each match (e.g., 21-19).
- **Points Calculation:** Players are awarded points equal to their score in the match.
  - _Example:_ If A/B win 21-19, Player A gets +21, Player B gets +21.
- **Ranking Criteria (Per Court):**
  Players are ranked 1st through 4th on their court based on the following hierarchy:
  1.  **Total Points Won:** (Highest sum of points across all 3 matches).
  2.  **Point Differential:** (Points Won - Points Lost).
  3.  **Player ID:** (Deterministic tiebreaker for consistent results).

### 5.4 Closing a Round

- The round cannot be closed until all scores on all courts are recorded.
- The Org clicks "Close Round".
- The system calculates the new court assignments for the next round based on the selected format (see Section 6).

## 6. Promotion & Relegation Logic (The Mathematics)

### 6.1 Random Seed Format

#### Round 1 → Round 2 (The "Seeding" Round)

_Goal: Sort players by strength to establish the initial hierarchy._

- **16 players:** All 1st place players → Court 1, all 2nd → Court 2, etc.
- **32 players:** All finish positions are sorted by points within each rank, then split between two courts (top 4 / bottom 4).

#### Round 2+ (The "Ladder")

_Goal: Strong players move up, weaker players move down._

- **16 players (4 courts):** 2 up, 2 down between adjacent courts.
- **32 players (8 courts):** Same ladder logic extended across 8 courts.

### 6.2 Preseed Format

#### Initial Seeding (Round 1)

Players distributed in snake pattern based on seed points:
- **16 players:** Seeds 1,5,9,13 on Court 1; Seeds 2,6,10,14 on Court 2; etc.
- **32 players:** Seeds 1,9,17,25 on Court 1; Seeds 2,10,18,26 on Court 2; etc.

#### Redistribution

- **Round 1 → Round 2:** Winner/loser split. All 1st-2nd places → Courts 1-4, all 3rd-4th → Courts 5-8.
- **Round 2 → Round 3:** Tier consolidation. Top 2 from adjacent courts move up, bottom 2 stay.
- **Round 3 → Round 4 (32p only):** Final placement. Courts determine final rankings.

## 7. Tournament Conclusion

### 7.1 Final Standings

When the Org closes the **Final Round**, the tournament winner is determined by their **Final Court Position**, not their total aggregate points.

- **1st Place:** Winner of Court 1.
- **2nd Place:** 2nd Place of Court 1.
- **...**
- **Final rankings** are displayed on the Total Standings page with a podium view and achievement categories.

### 7.2 Total Standings Page

- Complete rankings across all rounds with total points and point differential.
- Podium view with medals for top 3 finishers.
- Round-by-round breakdown showing court assignments and court ranks.
- Achievement categories: Most Improved, Consistent Performer, Court Champion.

### 7.3 Closing

The system displays a "Tournament Summary" page listing the final ranking of all players. The Org can mark the tournament as "Complete/Archived".
