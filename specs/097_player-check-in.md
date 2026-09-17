# Player Check-in

## Status

**PROPOSED — DRAFT FOR REVIEW.** Part of [095_org-player-experience-index.md](./095_org-player-experience-index.md). Schema additions (`player.token`, `checkedInAt`, `checkInSource`, `tournament.checkInClosedAt`) are in the shared migration `0016` described there. The page players land on after scanning is specified in [098_player-page.md](./098_player-page.md).

## Problem

At the start of a tournament the organizer stands at a table with a phone and a list while players trickle in over 30 minutes. Today:

- There is no record of who actually showed up. No-shows are discovered when Court 3 reports "we're only three".
- Players do not know their court until the organizer reads names out; then they have to find the right court QR code — which is on the organizer's screen, one per court.
- A court QR only ever shows that court. After close round, "Check with organizer for your next court" (060) sends everyone back to the table.

## Goals

1. Every player gets a **personal, stable URL** `/player/[token]` and a **QR code** for it, generated at creation (and for replacements / late joiners).
2. **Check-in page** for the organizer: searchable list, tap to check in, full-screen QR per player, live counter, not-checked-in list.
3. **Print sheet**: all players with name + QR on A4/Letter, so players self-serve at the registration table.
4. **Self check-in**: opening your own player page counts as checked in. Organizer can override.
5. **Close check-in**: one dialog that shows the no-shows and offers to remove them and reshuffle round 1 (via 096).

## Non-Goals

- Pre-registration, player accounts, e-mail invitations (030 stays anonymous for players).
- Payment or waiver tracking.
- Reintroducing a draft state: round 1 is still generated at creation (050). Check-in never blocks scoring; it only informs the roster edits in 096.

## Flow

```
Create tournament (`setup`, 0+ players) ─► Check-in page
                                          │  print sheet / show QRs
Players arrive ──► scan own QR (auto check-in) or organizer taps name
Start time ──────► organizer: "Close check-in" ─► "Start with 12 checked-in players?"
                                              └► startTournament (099) — round 1 generated
Players open their player page ─► see court ─► "Enter scores" ─► court page (060)
```

Check-in **before start** is the normal path ([099](./099_tournament-setup-and-start.md)). Courts do not exist yet, so the player page shows `not_started` until start.

The reshuffle banner ("your court may change") only appears if check-in is still open **after** the tournament has started (rare: "Create & start", or reopen check-in). Closing check-in after start may still remove no-shows and rebuild round 1 if it has no scores (096). Check-in can be reopened.

## UI

### Check-in page `/tournament/[id]/check-in` (organizer)

```
┌──────────────────────────────────────────────────┐
│ ← Beach Bash 2026                 Check-in 12/16 │
│ [Search…                                       ] │
│ [Print sheet]  [Close check-in]                  │
│                                                  │
│ ○ Carla Ruiz                              [QR]   │
│ ○ Dan Weber                               [QR]   │
│ ○ …                                              │
│ ─────────────────────────────────────────────── │
│ ✓ Anna Müller            09:41 · scanned  [QR]   │
│ ✓ Ben Otto               09:43 · by you   [QR]   │
│ …                                                │
│                                                  │
│ Not checked in (4): Carla Ruiz, Dan Weber, …     │
│ [Manage no-shows →]   (→ /manage#players)        │
└──────────────────────────────────────────────────┘
```

- Sort: not checked in first, then alphabetical (toggle to alphabetical only).
- **Tap the row** → toggles check-in (`checkInSource = 'org'`). Toggling off keeps `checkInSource = 'org'` so a later scan does not silently re-check the player (see Self check-in).
- **QR button** → full-screen modal: name (large), QR ≥ 240 px, tournament name, hint "Scan to open your player page", buttons **Copy link** and **Share** (Web Share API when available, hidden otherwise). Useful when the organizer walks up to a player with the phone.
- **Counter** `12/16` counts active (non-retired) players only. Replacements and late joiners appear in the list; retirees are hidden.
- Polling: `getCheckInData` refreshed every **5 s** so self check-ins pop up on the organizer's screen; paused while `document.hidden`.
- After check-in is closed the page stays usable (late arrival scanning still checks in) but shows a "Check-in closed at 10:02 · [Reopen]" banner instead of the Close button.

### Close check-in dialog

**In `setup` ([099](./099_tournament-setup-and-start.md)):**

```
Close check-in and start?
4 players are not checked in:
  Carla Ruiz · Dan Weber · Eva Lang · Finn Berg

(•) Start with the 12 checked-in players  (12 players, 3 × 4p)
( ) Start with all 16 players

[Start tournament]  [Cancel]
```

Delegates to `startTournamentForm({ checkedInOnly })` (099) and sets `checkInClosedAt`. Start still requires ≥ 8 players in the chosen set.

**After the tournament has started** (round 1 exists):

```
Close check-in?
4 players are not checked in:
  Carla Ruiz · Dan Weber · Eva Lang · Finn Berg

(•) Remove them and rebuild round 1  (16 → 12 players)   // only if round 1 has no scores
( ) Keep them on the roster

[Close check-in]  [Cancel]
```

- "Remove" delegates to `removeUncheckedPlayers` (096) and is only offered while round 1 has no scores; otherwise the dialog says "Round 1 already has scores — use Retire on the manage page" and only "Keep" is available.
- Sets `tournament.checkInClosedAt = now()`.

### Print sheet `/tournament/[id]/check-in/print`

- Grid of cards, **3 columns** on A4/Letter portrait (≈ 60 × 70 mm each): player name (bold, ~14 pt), QR ≈ 40 × 40 mm, tournament name (small), hint "Scan for your court". Alphabetical. `page-break-inside: avoid`; `@media print` hides everything else; a **Print** button triggers `window.print()`.
- Regenerating the sheet after roster changes is just reloading the page — tokens are stable per player.
- QR content: locale-free absolute URL `${origin}/player/${token}` (device language decides, same rule as court QRs).
- QR rendering: existing `qrcode` package, via the generic `QrCode.svelte` extracted from `CourtQRCode.svelte` (095).

### Entry points

- Operations view header: **Check-in** button while `checkInClosedAt` is null (or always, low-key, after that).
- Manage page → Players tab shows the ✓/○ badge per player and links to the check-in page.
- Creation redirect is `/tournament/[id]` in `setup` ([099](./099_tournament-setup-and-start.md)); the start panel links to check-in.

## Self Check-in (on the player page)

On load of `/player/[token]` (in `+page.server.ts`, not in the polled query):

```
if tournament.status === 'active'
   and player.checkedInAt is null
   and player.checkInSource is null        // never touched by the organizer
   and request is not from the logged-in organizer (locals.user is null or not orgId)
then set checkedInAt = now(), checkInSource = 'scan'
```

- Idempotent, one-way, organizer can revert. No other writes from the player page.
- Skipping the organizer's own session avoids checking everyone in while the organizer previews links from the print sheet.

## Data Layer

### Schema (migration `0016`, see 095)

```typescript
// player
token: text('token').notNull().unique();
checkedInAt: timestamp('checked_in_at');
checkInSource: text('check_in_source'); // 'scan' | 'org' | null

// tournament
checkInClosedAt: timestamp('check_in_closed_at');
```

Token generation: `crypto.randomBytes(16).toString('hex')` on every `player` insert — `createTournamentForm`, replacement inserts in `retirePlayer` / `reportInjury`, `addPlayer` (096). A shared `newPlayerToken()` helper in `tournament-orchestration.ts` keeps this in one place.

### `src/routes/tournament/[id]/check-in/check-in.remote.ts`

| Function           | Kind    | Input                                 | Notes                                                                                                                       |
| ------------------ | ------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `getCheckInData`   | query   | `tournamentId`                        | active players with `token`, `checkedInAt`, `checkInSource`; counts; `checkInClosedAt`; `round1HasScores`                   |
| `setPlayerCheckIn` | command | `playerId, checkedIn: boolean`        | sets/clears `checkedInAt`, `checkInSource = 'org'`                                                                          |
| `closeCheckIn`     | command | `tournamentId, removeUnchecked: bool` | After start: `removeUnchecked` → 096. In `setup`, the UI calls `startTournamentForm` (099) instead. Sets `checkInClosedAt`. |
| `reopenCheckIn`    | command | `tournamentId`                        | clears `checkInClosedAt`                                                                                                    |

All organizer-only (same guard as the operations view). `regeneratePlayerToken` lives in 096 (`manage-actions.remote.ts`) and is linked from the QR modal's ⋯ menu.

### Print page

`+page.server.ts` loads name + token for active players (organizer guard). Client renders QRs; `ssr` can stay on for the text and the QR `<img>` elements fill in on mount.

## i18n Keys (new)

`checkin_title`, `checkin_progress` (`{checked} / {total}`), `checkin_search`, `checkin_print`, `checkin_close`, `checkin_reopen`, `checkin_closed_at`, `checkin_open_note`, `checkin_not_checked_in`, `checkin_source_scan`, `checkin_source_org`, `checkin_qr_hint`, `checkin_copy_link`, `checkin_link_copied`, `checkin_share`, `checkin_manage_no_shows`, `checkin_close_remove_option`, `checkin_close_keep_option`, `checkin_close_scores_exist`, `checkin_start_checked_in`, `checkin_start_all`, `checkin_print_hint`, `checkin_print_button`, `checkin_sort_alpha`, `checkin_sort_status`.

## Testing

### Unit

- `newPlayerToken()` returns 32 hex chars; tokens on creation, replacement and late add are unique (orchestration test with an in-memory stub or the existing DB-backed unit pattern).
- Self check-in predicate (`shouldAutoCheckIn(tournament, player, isOrganizer)`) — table test over the four conditions.

### E2E (`e2e/check-in.spec.ts`)

1. Create 16p → check-in page shows `0/16`, all ○, print page renders 16 QR images with `/player/` URLs.
2. Tap a row → ✓ with "by you"; tap again → ○.
3. Open another player's `/player/[token]` in an anonymous context → organizer's list shows ✓ "scanned" within one poll.
4. Organizer un-checks that player → reload the player page → stays ○ (source stays `org`).
5. In `setup`, check in 12 of 16 → Close check-in → Start with checked-in only → 12 players, round 1 generated, removed tokens 404.
6. After start, save one score in round 1 → close-check-in dialog offers only "Keep".
7. Reopen check-in after start → banner appears on player page (098).

## Open Questions

1. **Self check-in on scan** — keep (proposed), or make check-in a strictly organizer action?
2. Should **closing check-in be required** before start / before scores can be saved? Proposed: no — soft gate, banner only after start.
3. Print layout: **cards, 3 columns** (proposed) vs. a dense table with small QRs (more per page, harder to scan).
4. **Regenerate link** per player when a QR was shared: included via 096 (proposed). Needed for v1?
5. Should the check-in page show each player's **round-1 court**? Hidden in `setup` (no courts yet). After start: as a small suffix (proposed).

## Related Specs

- [095_org-player-experience-index.md](./095_org-player-experience-index.md)
- [096_tournament-management-page.md](./096_tournament-management-page.md) — `removeUncheckedPlayers`, `regeneratePlayerToken`, badges
- [099_tournament-setup-and-start.md](./099_tournament-setup-and-start.md) — check-in before start
- [098_player-page.md](./098_player-page.md) — landing page after scan; `not_started` + banner
- [060_court-operations.md](./060_court-operations.md) — existing court QR codes and the `qrcode` package
- [030_auth-and-users.md](./030_auth-and-users.md) — anonymous player access model

## Implementation Files

- `src/routes/tournament/[id]/check-in/+page.svelte`, `+page.server.ts`, `check-in.remote.ts`
- `src/routes/tournament/[id]/check-in/print/+page.svelte`, `+page.server.ts`
- `src/lib/components/QrCode.svelte` (extracted), `PlayerQrModal.svelte`
- `src/lib/server/tournament-orchestration.ts` — `newPlayerToken()`
- `src/routes/tournament/create/create.remote.ts`, `tournament-actions.remote.ts` — token on insert
- `src/routes/player/[token]/+page.server.ts` — self check-in (098)
- `messages/*.json`, `e2e/check-in.spec.ts`
