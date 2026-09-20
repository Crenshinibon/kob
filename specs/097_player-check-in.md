# Player Check-in

## Status

**IMPLEMENTED** (2026-09). Part of [095_org-player-experience-index.md](./095_org-player-experience-index.md). **Optional** — an organizer can skip this page and run on court QRs only. Schema additions (`player.token`, `checkedInAt`, `checkInSource`, `tournament.checkInClosedAt`) are in the shared migration `0016` described there. The page players land on after scanning is specified in [098_player-page.md](./098_player-page.md).

**As shipped:** checked-in rows sit at the **bottom** of the list with muted text. Print sheet hides site header/footer/cookie chrome, keeps cards intact (`break-inside: avoid`), and forces **dark player names on white cards** (plus light QR chrome via `--qr-bg` / `--qr-fg`). QR modal is inline on the check-in page (no separate `PlayerQrModal.svelte`).

## Problem

At the start of a tournament the organizer stands at a table with a phone and a list while players trickle in over 30 minutes. Today:

- There is no record of who actually showed up. No-shows are discovered when Court 3 reports "we're only three".
- Players who only have a court QR do not know their **next** court after close round; "Check with organizer" (060) sends everyone back to the table.
- The organizer who wants a registration-desk list and a personal QR per player has nowhere to put it. Court QRs stay useful — this spec does not take them away.

## Goals

1. Every player **can** get a **personal, stable URL** `/player/[token]` and a **QR code** for it, generated at creation for every player added to the tournament (and for replacements). That URL is court + scores + placement for the whole tournament ([098](./098_player-page.md)). Handing it out is **optional**. Late joiners after round 1 are out of v1 (096).
2. **Check-in page** for the organizer who wants it: searchable list, tap to check in, full-screen QR per player, live counter, not-checked-in list.
3. **Print sheet**: all players with name + QR on A4/Letter, for self-serve at the registration table.
4. **Self check-in**: opening your own player page counts as checked in. Organizer can override.
5. **Close check-in**: optional dialog that shows no-shows and offers to remove them and start (099) or rebuild round 1 (096). Start does **not** require this dialog.

## Non-Goals

- Pre-registration, player accounts, e-mail invitations (030 stays anonymous for players).
- Payment or waiver tracking.
- Replacing or hiding `/court/[token]` or court QRs on the operations view. Both scoring paths stay (095).
- Requiring check-in before start or before scores. An organizer who never opens this page has a complete tournament.
- Blocking score entry until check-in is closed.

## Flow

Two organizer paths; both are complete:

```
Court-QR path (check-in unused)
  Create (`setup`) ─► Manage: add/remove players
                   ─► Start (099) ─► operations view: court QRs
                   ─► before scores: swap / move / remove (096)
                   ─► players scan court QR ─► enter scores (060)

Check-in path (optional)
  Create (`setup`) ─► Check-in page: print sheet / show personal QRs
  Players arrive ──► scan own QR (auto check-in) or organizer taps name
  Start time ──────► "Close check-in" ─► "Start with 12 checked-in players?"
                                      └► startTournament (099)
  Players open their player page ─► NOW: court, who vs whom ─► enter scores (098)
  Court QRs on the operations view still work if someone uses them.
```

Check-in **before start** is available, not required ([099](./099_tournament-setup-and-start.md)). Courts do not exist yet in `setup`, so a player page opened early shows `not_started` until start.

The reshuffle banner ("your court may change") only appears if check-in is still open **after** the tournament has started (rare: reopen check-in). Closing check-in after start may still remove no-shows and rebuild round 1 if it has no scores (096). Check-in can be reopened. Skipping check-in entirely leaves `checkedInAt` null on every player; start uses the full roster.

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

- Sort: not checked in first, then alphabetical (toggle to alphabetical only). **Checked-in rows stay at the bottom and use muted text.**
- **Tap the row** → toggles check-in (`checkInSource = 'org'`). Toggling off keeps `checkInSource = 'org'` so a later scan does not silently re-check the player (see Self check-in).
- **QR button** → full-screen modal: name (large), QR ≥ 240 px, tournament name, hint "Scan for your court and scores", buttons **Copy link** and **Share** (Web Share API when available, hidden otherwise). Useful when the organizer walks up to a player with the phone.
- **Counter** `12/16` counts active (non-retired) players only. Replacements appear in the list; retirees are hidden. **Do not** show round-1 court numbers — after start, each player sees their court on the player page (098).
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

Delegates to `startTournamentForm({ checkedInOnly })` (099) and sets `checkInClosedAt`. Start still requires ≥ **4** players in the chosen set.

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

- Grid of cards, **3 columns** on A4/Letter portrait (≈ 60 × 70 mm each): player name (bold, ~14 pt, **forced `#111` / print `#000`** so global theme `h2` white does not wash out on the white card), QR ≈ 40 × 40 mm on a **light** background, tournament name (small, same dark ink), hint "Scan for your court and scores". Alphabetical. `page-break-inside: avoid` / `break-inside: avoid`. `@media print` hides `.top-nav`, `.v1-banner`, `.site-footer`, `.cookie-notice` (also `.no-print` in `static/global.css`). A **Print** button triggers `window.print()`.
- Regenerating the sheet after roster changes is just reloading the page — tokens are stable per player.
- QR content: locale-free absolute URL `${origin}/player/${token}` (device language decides, same rule as court QRs).
- QR rendering: existing `qrcode` package, via the generic `QrCode.svelte` extracted from `CourtQRCode.svelte` (095).

### Entry points

- Operations view header: **Check-in** button (always, low-key — the page is optional). After close, it stays as a way to reopen or look up a personal QR.
- Manage page → Players tab shows the ✓/○ badge per player **only if at least one check-in exists**; otherwise the badge is hidden. Links to the check-in page.
- Creation redirect is `/tournament/[id]` in `setup` ([099](./099_tournament-setup-and-start.md)); the start panel links to **Manage** first and to check-in as an optional extra.

## Self Check-in (on the player page)

On load of `/player/[token]` (in `+page.server.ts`, not in the polled query):

```
if tournament.status === 'active'
   and player.checkedInAt is null
   and player.checkInSource is null        // never touched by the organizer
   and request is not from the logged-in organizer (locals.user is null or not orgId)
then set checkedInAt = now(), checkInSource = 'scan'
```

- Idempotent, one-way, organizer can revert. The other writes from the player page are score saves (098), not check-in.
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

`checkin_title`, `checkin_progress` (`{checked} / {total}`), `checkin_search`, `checkin_print`, `checkin_close`, `checkin_reopen`, `checkin_closed_at`, `checkin_open_note`, `checkin_not_checked_in`, `checkin_source_scan`, `checkin_source_org`, `checkin_qr_hint` (`Scan for your court and scores`), `checkin_copy_link`, `checkin_link_copied`, `checkin_share`, `checkin_manage_no_shows`, `checkin_close_remove_option`, `checkin_close_keep_option`, `checkin_close_scores_exist`, `checkin_start_checked_in`, `checkin_start_all`, `checkin_print_hint` (`Scan for your court and scores`), `checkin_print_button`, `checkin_sort_alpha`, `checkin_sort_status`.

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
6. After start, save one score from a **player page** in round 1 → close-check-in dialog offers only "Keep".
7. Reopen check-in after start → banner appears on player page (098).
8. Skip check-in entirely → Start with all 16 → operations view shows court QRs; scores via `/court/[token]` work; player pages still exist if a URL is opened.

## Decisions (from review)

1. **Self check-in on scan stays.** Opening `/player/[token]` checks the player in when the organizer has not touched that row.
2. **Closing check-in is not required** before start or before scores. Soft banner only if check-in was opened and is still open after start.
3. **Print layout: 3-column cards** on A4/Letter.
4. **Regenerate player link** is in v1 (096 ⋯ menu + QR modal).
5. Check-in list does **not** show round-1 court. After start, the player page is the place for "which court".

## Open Questions

None remaining for this spec. Court-page vs organizer-only score correction is in [095](./095_org-player-experience-index.md).

## Related Specs

- [095_org-player-experience-index.md](./095_org-player-experience-index.md)
- [096_tournament-management-page.md](./096_tournament-management-page.md) — `removeUncheckedPlayers`, `regeneratePlayerToken`, badges
- [099_tournament-setup-and-start.md](./099_tournament-setup-and-start.md) — start does not require check-in; "checked-in only" is an optional start option
- [098_player-page.md](./098_player-page.md) — landing page after scan: current game, score entry, upcoming; `not_started` + banner
- [060_court-operations.md](./060_court-operations.md) — court QRs remain; `qrcode` package shared via `QrCode.svelte`
- [030_auth-and-users.md](./030_auth-and-users.md) — anonymous player access model

## Implementation Files

- `src/routes/tournament/[id]/check-in/+page.svelte`, `+page.server.ts`, `check-in.remote.ts`
- `src/routes/tournament/[id]/check-in/print/+page.svelte`, `+page.server.ts`
- `src/lib/components/QrCode.svelte` (extracted; `--qr-bg` / `--qr-fg` for print)
- `src/lib/server/tournament-orchestration.ts` — `newPlayerToken()`
- `src/routes/tournament/create/create.remote.ts`, `tournament-actions.remote.ts` — token on insert
- `src/routes/player/[token]/+page.server.ts` — self check-in (098)
- `messages/*.json`, `e2e/check-in.spec.ts`
