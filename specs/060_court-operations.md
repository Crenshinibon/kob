# Court Operations

## Player Interface (`/court/[token]`)

Mobile-optimized page. No live query — data loads once on page load.

### Layout

```
Beach Bash 2024 - Court 1, Round 2 (4p)

Players: Alice, Bob, Carol, David

Match 1: Alice & Bob vs Carol & David
  Set 1: [21] - [19] ✓

Match 2: Alice & Carol vs Bob & David
  Set 1: Team A [___] - Team B [___]
  [Save]

Match 3: Alice & David vs Bob & Carol
  Set 1: Team A [___] - Team B [___]
  [Save]

Current Standings:
1. Alice - 42 pts (+4)
2. Bob - 41 pts (+2)
3. Carol - 38 pts (-2)
4. David - 37 pts (-4)
```

### Court Types

**3-Player Court (2v1 format)**

- Label: "Solo Rotation"
- 3 matches: A+B vs C, A+C vs B, B+C vs A
- Solo player highlighted in match display
- Same scoring rules as 4p courts (inherit from tournament config)

**5-Player Court (Parallel Games)**

- Label: "Parallel Games"
- 4 matches grouped into 2 runs
- Run 1: Fixed team + fixed player + rotating players
- Run 2: Different fixed team + different fixed player + rotating players
- Match display shows run grouping and rotation details
- Ranking: average points per round (normalized for uneven game counts)

**6-Player Court (Parallel Games)**

- Label: "Parallel Games"
- 4 matches grouped into 2 runs
- Run 1: Fixed team on one side, rotating pair on other
- Run 2: Different fixed team, different rotating pair
- Partnership rule: no pair partners together in both runs
- Ranking: average points per round (normalized for uneven game counts)

### Score Entry

- **Single set mode**: One score pair per match
- **Best-of-3 mode**: Set-by-set score entry with separate "Set 1", "Set 2", "Set 3 (Deciding)" cards
  - Deciding set only shown when sets 1 & 2 are both saved and split 1-1
  - Each set has its own save/edit/cancel workflow
- Score validation per set:
  - 4p/3p courts: First to 21 (or configured `pointsToWin`), win by 2
  - 5p/6p courts: First to 15 (or overridden `pointsToWin`), win by 2
  - No point caps — scores can exceed target (e.g., 30-28 is valid)
  - Custom mode: Uses configured `pointsToWin` and `winBy`
- Per-court-type scoring overrides from tournament config applied via `getEffectiveScoring()`
- Save button per set (saves individual set)
- On save: show "Saved" confirmation
- Edit button available for authenticated users only

### Closed Round

If round is closed:

```
This round is closed.

Final Court 1 Standings:
1. Alice
2. Bob
3. Carol
4. David

Check with organizer for your next court.
```

## Admin Court View

Same as tournament view - just shows all courts at once. No separate detailed view needed.

## QR Codes

- Simple QR code library (`qrcode` npm package)
- URL: `/court/[token]`
- Display as image
- Download/Print buttons

No complex features:

- No live query on court page (refresh for updates)
- No token reset (tokens are stable — live on `court` table, persist across rounds and retirements)
- No override UI (admin can edit directly in DB if needed)
- No conflict resolution (last save wins)
- No undo/confirmation for score edits
- Canceled matches show "Canceled — scores will be averaged" notice (no score entry form)
