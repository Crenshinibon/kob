# Court Operations (Simple)

## Player Interface (`/court/[token]`)

Simple mobile-optimized page. No real-time updates - refresh to see updates.

### Layout

```
Beach Bash 2024 - Court 1, Round 2

Players: Alice, Bob, Carol, David

Match 1: Alice & Bob vs Carol & David
Score: [21] - [19] ✓

Match 2: Alice & Carol vs Bob & David
Team A Score: [___]
Team B Score: [___]
[Save]

Match 3: Alice & David vs Bob & Carol
Team A Score: [___]
Team B Score: [___]
[Save]

Current Standings:
1. Alice - 42 pts (+4)
2. Bob - 41 pts (+2)
3. Carol - 38 pts (-2)
4. David - 37 pts (-4)

[Refresh for updates]
```

### Score Entry

- Number inputs for scores
- **Single set mode**: One score input per match
- **Best-of-3 mode**: Set-by-set score entry (Set 1, Set 2, Set 3 if needed)
- Validation per set:
  - 4p/3p courts: First to 21, win by 2
  - 5p/6p courts: First to 15, win by 2
  - Custom mode: Use configured `pointsToWin` and `winBy`
- Show error if invalid: "Winner must have 21+ points" or "Must win by 2"
- Save button per match (saves all sets at once)
- On save: show "Saved" confirmation
- **Known bug**: Best-of-3 score entry not working - only shows one set input (see `840_critical-bugs.md`)
- **Known bug**: Score validation not enforcing rules (see `840_critical-bugs.md`)

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

- No real-time updates
- No token reset
- No override UI (admin can edit directly in DB if needed)
- No conflict resolution (last save wins)
