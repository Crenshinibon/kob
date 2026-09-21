# Court Operations

> **Shipped ([098](./098_player-page.md), [097](./097_player-check-in.md)):** `/court/[token]` stays a player-facing scoring URL. The organizer may keep handing out **court QRs** from the operations view, may additionally (or instead) hand out **personal player QRs** via optional check-in, or mix both. Score rules below still apply; the UI is extracted into `ScoreEntry.svelte` and reused on the player page. Court-page writes are last-write-wins (including edits). Player-page writes are first-write of matches that player is in.

## Player Interface (`/court/[token]`)

Mobile-optimized page. Player-facing scoring URL (court QR). No live query — data loads once on page load, then client poll (5 s) while visible. Pause while a score field is focused (098).

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
- Edit after save: **court page** still allows anyone with the court token to edit (how the organizer corrects a write-once player-page save — 095 Open Question 1). Clicking **Edit** opens the score fields **pre-filled with the current scores** so the organizer can overwrite them. The **player page** (098) does not: first write of matches that player is in, then read-only.

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
(Or open your personal player page if you have one.)
```

> **Proposed:** keep the organizer hint; add the personal-page line for players who received a check-in QR. See **[098_player-page.md](./098_player-page.md)** and [097_player-check-in.md](./097_player-check-in.md).

## Admin Court View

Same as tournament view - just shows all courts at once. No separate detailed view needed.

## QR Codes

Court QRs stay on the operations view. Optional personal QRs (097) are a second path, not a replacement.

- Simple QR code library (`qrcode` npm package); extract to generic `QrCode.svelte` (095)
- URL: `/court/[token]` (stable `court.token` — 1045)
- Display as image
- Download/Print buttons

No complex features:

- No live query on court page (`query()` + 5 s client poll; pause while hidden or while a score field is focused — 098)
- No token reset (tokens are stable — live on `court` table, persist across rounds and retirements)
- No override UI (admin can edit directly in DB if needed)
- No conflict resolution (last save wins — including vs. a player-page save)
- No undo/confirmation for score edits
- Canceled matches show "Canceled — scores will be averaged" notice (no score entry form)

> **Implementation note (2026-07-04):** Tournament admin QR links currently expose `rotation.token` (see `tournament-data.remote.ts`), which **changes** when `retirePlayer` or `closeRoundForm` rebuilds rotations. The court page load handler supports stable `court.token` fallback, but admin links do not use it yet. This breaks stale QR URLs after retirement and causes E2E failures — tracked in [1045](./1045_e2e-flaky-fixes-and-dynamic-closeRound.md). Target fix: expose `court.token` in tournament QR links. Personal player QRs (097) are a separate URL and do not replace this fix.
