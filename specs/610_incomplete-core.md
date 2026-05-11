# Incomplete Rosters: Core Concepts

## Problem Statement

The KoB Tracker currently supports **16 players (4 courts)** and **32 players (8 courts)** perfectly. In practice, tournament registrations rarely hit these exact numbers. We need a strategy for every count between **8 and 64** that:

1. **Maximizes playtime** — Players paid to play; sitting out feels like a rip-off.
2. **Preserves competitive integrity** — Winning must still be meaningful; the redistribution system must feel fair.
3. **Maintains timing** — A round should not take significantly longer because of edge-case handling.

**Cancellation threshold**: Below 8 players, cancel the tournament. KoB needs at least 2 courts (8 players) for the partner rotation and redistribution logic to function.

**Upper limit**: 64 players (16 courts). Beyond that, venue logistics become impractical.

## Physical vs Virtual Courts

### Concept

- **Physical courts**: Actual beach volleyball courts available at the venue.
- **Virtual courts**: Logical courts in the system that map to physical courts over time.

A tournament with N virtual courts and M physical courts (where N > M) runs in "shifts". Each round, M courts are active (players playing), while the remaining N-M courts have players waiting. After each round, the active/waiting assignment rotates.

### Example

**4 physical courts, 32 players (8 virtual courts):**
- Round 1: Virtual courts 1-4 are active (16 players playing). Courts 5-8 have players waiting.
- Round 2: Courts 5-8 become active. Courts 1-4 players now wait.
- The waiting players still get court assignments — they just play in a later shift.

**Implementation**: The system tracks `physicalCourtCount` and `virtualCourtCount` separately. The UI shows which physical court each virtual court maps to, and which players are "on break" for the current round.

### UI Support

- Tournament creation: separate inputs for "Physical Courts" and "Total Players"
- Court display: show virtual court number AND physical court mapping
- Round view: clearly indicate which players are active vs waiting
- Waiting players see "You play next round" status

## Analysis by Player Count (8-64)

### Clean Multiples of 4

| Players | Courts | Category |
|---------|--------|----------|
| 8       | 2      | Clean |
| 12      | 3      | Clean |
| 16      | 4      | Standard |
| 20      | 5      | Clean |
| 24      | 6      | Clean |
| 28      | 7      | Clean |
| 32      | 8      | Standard |
| 36      | 9      | Clean |
| 40      | 10     | Clean |
| 44      | 11     | Clean |
| 48      | 12     | Clean |
| 52      | 13     | Clean |
| 56      | 14     | Clean |
| 60      | 15     | Clean |
| 64      | 16     | Clean |

### With Leftovers (1-3 players)

For any player count that is not a multiple of 4, we have 1-3 leftover players. These are handled by:

- **Option B**: Mixed court sizes (3-player + 4-player courts)
- **Option D**: 5/6-player courts (parallel games)

The chosen strategy is configured per-tournament as a default, with optional per-round overrides.

## How Vertical Seeding Actually Works

After Round 1 with N courts, we have exactly N first places, N second places, N third places, and N fourth places. For vertical seeding (Round 1 to 2), we fill courts by cascading down the ranks:

**Start with rank 1. Fill each court to 4 players. When a court has fewer than 4 of the current rank, take the remainder from the next rank (best by points/diff). Continue until all players are placed.**

### Examples

**2 courts (8 players)** — clean:
- C1: 2 first places + 2 second places = 4
- C2: 2 third places + 2 fourth places = 4

**3 courts (12 players)** — clean:
- C1: 3 first places + 1 best second place = 4
- C2: 2 remaining second places + 2 best third places = 4
- C3: 1 remaining third place + 3 fourth places = 4

**5 courts (20 players)** — clean:
- C1: 4 first places = 4
- C2: 1 remaining first place + 3 best second places = 4
- C3: 2 remaining second places + 2 best third places = 4
- C4: 3 remaining third places + 1 best fourth place = 4
- C5: 4 remaining fourth places = 4

**6 courts (24 players)** — clean:
- C1: 4 first places = 4
- C2: 2 remaining first places + 2 best second places = 4
- C3: 4 remaining second places = 4
- C4: 4 third places = 4
- C5: 2 remaining third places + 2 best fourth places = 4
- C6: 4 remaining fourth places = 4

**7 courts (28 players)** — clean:
- C1: 4 first places = 4
- C2: 3 remaining first places + 1 best second place = 4
- C3: 4 best second places = 4
- C4: 2 remaining second places + 2 best third places = 4
- C5: 4 best third places = 4
- C6: 1 remaining third place + 3 best fourth places = 4
- C7: 4 remaining fourth places = 4

**Key insight**: Vertical seeding works cleanly for ANY court count. The pattern is a natural cascade where overflow from one rank flows into the next court, sorted by performance (points/diff).

## Leftover Handling Configuration

### Tournament-Level Default

When creating a tournament, the organizer chooses a default leftover strategy:

- **Option B: Mixed courts** — Use 3-player courts for leftovers (2v1 format)
- **Option D: Parallel games** — Use 5/6-player courts with parallel 2v2 games

This default applies to all rounds unless overridden.

### Per-Round Override

The organizer can override the leftover strategy for individual rounds. This accommodates:

- Player preferences (e.g., "we don't want parallel games this round")
- Logistical constraints (e.g., "court 4 is being repaired, use mixed instead")
- Dynamic decisions based on how the tournament is going

The override is set before closing the previous round. The UI shows a dropdown per round: "Use tournament default" or specific strategy.

## Open Questions

1. Should the system auto-suggest the best configuration when the user enters a player count? Or should the user manually choose?
2. For virtual courts: should the waiting rotation be random, or based on standings (lower-ranked players wait first)?
3. Should we support "ghost players" (organizers/volunteers) to fill spots and reach a multiple of 4?
4. How do we handle players arriving late or leaving early mid-tournament with virtual courts?
