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
- Validation: 1-50, no ties, winner needs 21+
- Show error if invalid: "Winner must have 21+ points"
- Save button per match
- On save: show "Saved" confirmation

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
