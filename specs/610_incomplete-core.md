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

**4 physical courts, 32 players entered (8 virtual courts):**
- Shift 1: Virtual courts 5-8 are active (lower courts first). Courts 1-4 have players waiting.
- Shift 2: Courts 1-4 become active (top courts). Courts 5-8 players now wait.
- The waiting players still get court assignments — they just play in a later shift.

**How virtual courts are determined**: The system calculates `virtualCourtCount = Math.ceil(playerCount / 4)`. The organizer sets `physicalCourtCount` based on their venue. If `virtualCourtCount > physicalCourtCount`, shifts are used.

**Implementation**: The system tracks `physicalCourtCount` and `virtualCourtCount` separately. The UI shows which physical court each virtual court maps to, and which players are "on break" for the current round.

### UI Support

- Tournament creation: "Physical Courts" input (number of actual courts at venue)
- Player input: paste names (random seed) or names + points (preseed)
- Court configuration: system calculates from player count + physical courts
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

For any player count that is not a multiple of 4, we have 1-3 leftover players. The leftover count is deterministic: `playerCount % 4`.

The lowest court is always the "odd one" — one non-standard court at the bottom:

| Leftovers | Bottom Court | Format |
|-----------|-------------|--------|
| 0 | None (all standard) | All 4-player courts |
| 1 | 5-player court | Parallel games (see `620`) |
| 2 | 6-player court | Parallel games (see `620`) |
| 3 | 3-player court | 2v1 format (3 matches, 21 points) |

The organizer does NOT choose the court configuration — it's determined by the player count. The organizer chooses **what to do with the leftovers**: include them (default) or exclude them.

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

**8 courts (32 players)** — clean:
- C1: 4 first places = 4
- C2: 4 remaining first places = 4
- C3: 4 best second places = 4
- C4: 4 remaining second places = 4
- C5: 4 best third places = 4
- C6: 4 remaining third places = 4
- C7: 4 best fourth places = 4
- C8: 4 remaining fourth places = 4

**9 courts (36 players)** — clean:
- C1: 4 first places = 4
- C2: 4 remaining first places = 4
- C3: 1 remaining first place + 3 best second places = 4
- C4: 4 remaining second places = 4
- C5: 2 remaining second places + 2 best third places = 4
- C6: 4 remaining third places = 4
- C7: 3 remaining third places + 1 best fourth place = 4
- C8: 4 remaining fourth places = 4
- C9: 4 remaining fourth places = 4

**10 courts (40 players)** — clean:
- C1: 4 first places = 4
- C2: 4 remaining first places = 4
- C3: 2 remaining first places + 2 best second places = 4
- C4: 4 remaining second places = 4
- C5: 4 remaining second places = 4
- C6: 4 third places = 4
- C7: 4 remaining third places = 4
- C8: 2 remaining third places + 2 best fourth places = 4
- C9: 4 remaining fourth places = 4
- C10: 4 remaining fourth places = 4

**12 courts (48 players)** — clean:
- C1: 4 first places = 4
- C2: 4 remaining first places = 4
- C3: 4 remaining first places = 4
- C4: 4 best second places = 4
- C5: 4 remaining second places = 4
- C6: 4 remaining second places = 4
- C7: 4 best third places = 4
- C8: 4 remaining third places = 4
- C9: 4 remaining third places = 4
- C10: 4 best fourth places = 4
- C11: 4 remaining fourth places = 4
- C12: 4 remaining fourth places = 4

**16 courts (64 players)** — clean:
- C1-C4: 16 first places (4 each)
- C5-C8: 16 second places (4 each)
- C9-C12: 16 third places (4 each)
- C13-C16: 16 fourth places (4 each)

### Vertical Seeding with Non-Standard Bottom Court

When there's a non-standard bottom court (3p/5p/6p), the vertical seeding fills standard courts first, then places remaining players on the bottom court.

**Example: 25 players (6×4p + 1×5p)**
- 6 first places → C1: 4 firsts, C2: 2 firsts + 2 seconds
- 6 second places → C2: (2 used), C3: 4 seconds
- 6 third places → C4: 4 thirds, C5: 2 thirds + 2 fourths
- 6 fourth places → C5: (2 used), C6: 4 fourths
- Remaining: 1 player → C7 (5-player court, gets worst 4 from other courts as partners)

**Example: 11 players (2×4p + 1×3p)**
- 2 first places → C1: 2 firsts + 2 best seconds
- 2 second places → C1: (2 used), C2: 2 remaining seconds + 2 best thirds
- 2 third places → C2: (2 used), C3: 1 remaining third (3-player court)
- 2 fourth places → C3: gets 2 fourths as partners (3-player court: 1 third + 2 fourths)

## Leftover Handling

### How Leftovers Work

The leftover count is `playerCount % 4`. The system determines the court configuration automatically:

```
27 players → 6 courts of 4 + 3 leftover → 6×4p + 1×3p = 7 courts
26 players → 6 courts of 4 + 2 leftover → 6×4p + 1×6p = 7 courts
25 players → 6 courts of 4 + 1 leftover → 6×4p + 1×5p = 7 courts
24 players → 6 courts of 4 + 0 leftover → 6×4p = 6 courts (clean)
```

### Organizer Decision: Include or Exclude Leftovers

The organizer enters player names (and seed points for preseed). The system counts them and determines the leftover situation. The UI shows the result:

```
┌─────────────────────────────────────────────────────────┐
│ 27 players entered                                       │
│                                                          │
│ Court configuration: 6 courts of 4 players + 3 leftover  │
│                                                          │
│ The 3 leftover players will play on a 3-player court     │
│ (2v1 format, 3 matches per round).                       │
│                                                          │
│ ○ Include all 27 players (recommended)                   │
│ ○ Exclude 3 players to get 24 (6 clean courts)           │
│   └─ Select which 3 players to exclude:                  │
│      [ ] Player X (seed: 45)                             │
│      [ ] Player Y (seed: 52)                             │
│      [ ] Player Z (seed: 61)                             │
│                                                          │
│ [Start Tournament]                                       │
└─────────────────────────────────────────────────────────┘
```

The player count field is removed from tournament creation. The system calculates:
- `playerCount` = number of names entered
- `leftoverCount` = `playerCount % 4`
- `courtCount` = `Math.floor(playerCount / 4)` + (1 if leftover > 0 and included)

### Leftover Scenarios

| Leftover | Include (Default) | Exclude |
|----------|-------------------|---------|
| **1 player** | One 5-player court (parallel games, 4 matches at 15pt) | Exclude 1 player → clean courts. Organizer picks who. |
| **2 players** | One 6-player court (parallel games, 4 matches at 15pt) | Exclude 2 players → clean courts. Organizer picks who. |
| **3 players** | One 3-player court (2v1 format, 3 matches at 21pt) | Exclude 3 players → clean courts. Organizer picks who. |

### Exclusion Rules

- Organizer can only exclude players **before starting the tournament** (not mid-tournament)
- Excluded players are informed before the tournament starts — they are not present at the venue
- The system suggests exclusion based on **input order** (which is usually registration date), last entered players suggested first
- Organizer can override and manually select who to exclude
- Excluded players are NOT charged entry fee (organizer's responsibility)
- Excluded players do NOT appear on the standings page

### Include/Exclude Leftovers

The organizer can choose to exclude leftover players before starting the tournament. Excluded players are informed and do not participate. This results in clean courts (all 4-player).

If included, the bottom court is non-standard (3p/5p/6p) as determined by `playerCount % 4`.

### UI: Court Configuration Summary

The tournament view always shows the current court configuration:

```
Round 2 — 7 courts
├─ Courts 1-4: 4 players each (standard)
├─ Courts 5-6: 4 players each (standard)
└─ Court 7: 3 players (2v1 format)
```

Or with virtual courts:

```
Round 2 — 8 virtual courts, 4 physical courts
├─ Shift 1 (active): VC1-VC4
│   ├─ VC1-VC3: 4 players each
│   └─ VC4: 3 players (2v1)
├─ Shift 2 (waiting): VC5-VC8
│   ├─ VC5-VC7: 4 players each
│   └─ VC8: 3 players (2v1)
```

## Decisions (Previously Open Questions)

1. **Virtual court rotation**: Start with lower courts first, work up. For the final round, run loser courts first, then winners — so the top court final is last with fresh players.
2. **Ghost players**: No. Never. Ghost players don't make sense in beach volleyball.
3. **Exclusion suggestion order**: Based on input order (usually registration date). Last entered players suggested first. Organizer can override.
4. **Excluded player visibility**: Excluded players are informed before the tournament starts and will not be there. They do not appear on standings.

**Player retirement during tournament**: See `670_player-retirement.md` for handling players leaving mid-tournament, redistribution after retirement, and final round elimination rules.
