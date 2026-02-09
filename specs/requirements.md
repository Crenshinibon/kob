# Requirements Specification: King of the Beach (KoB) Tracker

## 1. Overview
The purpose of this project is to provide a simple, mobile-first web application to track a "King of the Beach" beach volleyball tournament. 

The core concept is to manage individual rankings within a 2v2 format. Players rotate partners on a single court, and their individual performance determines if they move up to a higher court or down to a lower court in subsequent rounds.

## 2. Assumptions & Constraints (MVP)
* **Court Count:** Fixed at **4 Courts**.
* **Player Count:** Fixed at **16 Players** (4 players per court).
    * *Note:* The system must enforce this count to ensure the math for partner rotation works.
* **Platform:** Mobile-web optimized (users will access via smartphones on the beach).

## 3. User Roles

### 3.1 Authenticated User ("Org")
* **Permissions:** Full administrative rights.
* **Capabilities:** * Create, edit, and delete tournaments.
    * Generate and share court links/QR codes.
    * Manually override scores (if necessary).
    * Control the flow: "Start Tournament", "Close Round", "Finalize Tournament".

### 3.2 Anonymous User ("Player")
* **Permissions:** Temporary write access to specific court data.
* **Capabilities:**
    * Access a specific court via a unique URL/QR code.
    * Enter match results for that court.
    * View live standings for that court.
* **Constraint:** Players can only edit results while the round is **Active**. Once the Org closes a round, the view becomes read-only.

## 4. Feature: Creating & Editing Tournaments

### 4.1 Tournament Setup
Only the Org can create a tournament. The creation form requires:
* **Name:** (String, Default: "KoB [Date]")
* **Number of Courts:** Fixed at 4.
* **Number of Rounds:** Integer (Default: 3).
* **Seeding Mode (First Round):**
    * *Random:* System randomly assigns players to Courts 1–4.
    * *Manual:* Org manually places players into specific courts (e.g., based on league standing).

### 4.2 Player Management
* **Input:** The Org inputs player names via a text field (one name per line) or pasteboard.
* **Validation:** The system must validate that **exactly 16 unique names** are provided.
    * *Error Handling:* If 15 or 17 names are pasted, the system prevents starting the tournament and prompts the user to fix the count.

## 5. Feature: Running the Tournament

### 5.1 Starting
* When "Start Tournament" is clicked, the system locks the player list and generates 4 unique URLs (one for each court).
* The Org can display/print QR codes for these URLs to distribute to players.

### 5.2 Round Logic (The "Court Engine")
Each court always contains 4 players (A, B, C, D). The system automatically generates 3 matches to ensure every player partners with every other player exactly once:

1.  **Match 1:** A & B vs. C & D
2.  **Match 2:** A & C vs. B & D
3.  **Match 3:** A & D vs. B & C

### 5.3 Scoring & Standings
* Players enter the final score of each match (e.g., 21-19).
* **Points Calculation:** Players are awarded points equal to their score in the match.
    * *Example:* If A/B win 21-19, Player A gets +21, Player B gets +21.
* **Ranking Criteria (Per Court):**
    Players are ranked 1st through 4th on their court based on the following hierarchy:
    1.  **Total Points Won:** (Highest sum of points across all 3 matches).
    2.  **Point Differential:** (Points Won - Points Lost).
    3.  **Head-to-Head:** (If applicable/calcuable).
    4.  **Org decides**: May let players matchup in small game or stone-paper-scissors.
    5.  **Random:** Org tosses a system coin

### 5.4 Closing a Round
* The round cannot be closed until all scores on all 4 courts are recorded.
* The Org clicks "Close Round".
* The system calculates the new court assignments for the next round (see Section 6).

## 6. Promotion & Relegation Logic (The Mathematics)

### 6.1 Logic: Round 1 → Round 2 (The "Seeding" Round)
*Goal: Sort players by strength to establish the initial hierarchy.*

* **Court 1 (Winners Court):** Receives the **1st place** player from all 4 previous courts.
* **Court 2:** Receives the **2nd place** player from all 4 previous courts.
* **Court 3:** Receives the **3rd place** player from all 4 previous courts.
* **Court 4 (Losers Court):** Receives the **4th place** player from all 4 previous courts.

### 6.2 Logic: Round 2 → Subsequent Rounds (The "Ladder")
*Goal: Strong players move up, weaker players move down. Logic ensures 4 players per court.*

| Court | Outgoing (Result of current round) | Incoming (For next round) |
| :--- | :--- | :--- |
| **Court 1** (Top) | Bottom 2 players go **DOWN** to C2. | Top 2 stay. <br> **+** Top 2 from C2. |
| **Court 2** | Top 2 players go **UP** to C1. <br> Bottom 2 players go **DOWN** to C3. | **+** Bottom 2 from C1. <br> **+** Top 2 from C3. |
| **Court 3** | Top 2 players go **UP** to C2. <br> Bottom 2 players go **DOWN** to C4. | **+** Bottom 2 from C2. <br> **+** Top 2 from C4. |
| **Court 4** (Bottom) | Top 2 players go **UP** to C3. | Bottom 2 stay. <br> **+** Bottom 2 from C3. |

## 7. Tournament Conclusion

### 7.1 Final Standings
When the Org closes the **Final Round**, the tournament winner is determined by their **Final Court Position**, not their total aggregate points.

* **1st Place:** Winner of Court 1.
* **2nd Place:** 2nd Place of Court 1.
* **...**
* **5th Place:** Winner of Court 2.
* **...**
* **16th Place:** 4th Place of Court 4.

### 7.2 Closing
The system displays a "Tournament Summary" page listing the final ranking of all 16 players. The Org can mark the tournament as "Complete/Archived".
