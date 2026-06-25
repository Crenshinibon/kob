# Round History Stepper

## Problem

Organizers and test users need to review **past tournament rounds** without leaving the tournament admin view. Today the tournament page always shows the **current** round only. Court QR links for past rounds exist in the database (`court_rotation` per round) but there is no UI to navigate to them.

## Goals

1. Full-width **round stepper** at the top of `/tournament/[id]` showing all rounds, e.g. `Round 1 → Round 2 → Round 3 → Round 4`.
2. Clicking a step loads that round's court cards (players, match progress, links).
3. **Past rounds**: court links and QR codes work; match scores are **read-only** on the court page.
4. **Current round**: unchanged behavior (score entry, close round, injury, retirement).
5. **Completed tournaments**: all rounds viewable; all scoring read-only.

## Non-Goals

- Editing scores for past rounds (explicitly out of scope).
- Changing redistribution after a round is closed.
- Round stepper on the public standings page (admin tournament view only).

## UI Specification

### Placement

- Directly below the tournament header (`<header>`), above scheduling info and court cards.
- Spans full content width (`width: 100%`).

### Visual Design

```
┌─────────────────────────────────────────────────────────────┐
│  (1) Round 1  ──►  (2) Round 2  ──►  (3) Round 3  ──►  (4) │
│       ✓                  ● current              future      │
└─────────────────────────────────────────────────────────────┘
```

- Each step is a button showing `Round N`.
- Steps connected by arrows (`→` or CSS chevrons).
- **Completed** rounds (round < currentRound): subdued success styling, optional checkmark.
- **Current** round: highlighted accent when stepper selection matches live round.
- **Future** rounds (round > currentRound): disabled, not clickable.
- **Selected** round (may differ from current when browsing history): distinct selected state.

### Behavior

| State | Stepper | Court cards | Close round / injury / retire |
|-------|---------|-------------|-------------------------------|
| Viewing current active round | Current highlighted | Live data (5s poll) | Shown |
| Viewing past round | Past step selected | Historical data | Hidden |
| Tournament completed | All rounds clickable | Historical | Hidden |
| Future round | Disabled | N/A | N/A |

Default selection on page load: `max(1, currentRound)` (or last round if completed).

Optional: persist selection in URL query `?round=N` for shareable links.

## Data Layer

### `getTournamentData` API change

```typescript
getTournamentData({
  tournamentId: number,
  viewRound?: number  // defaults to currentRound (or 1 if not started)
})
```

Returns additional fields:

```typescript
{
  viewRound: number;
  isViewingPastRound: boolean;  // viewRound < currentRound
  isViewingCurrentRound: boolean;
  totalRounds: number;
  // courts loaded for viewRound, not always currentRound
}
```

### Court rotation loading

- Query `court_rotation` where `roundNumber = viewRound` (clamped to `1..numRounds`).
- `canCloseRound`, `hasScores`, injury/retire eligibility computed **only** when `viewRound === currentRound`.

### Read-only court page

Court page (`/court/[token]`) derives editability:

```typescript
isEditable =
  tourney.status === 'active' &&
  rotation.roundNumber === tourney.currentRound &&
  courtRecord.isActive;
```

- `+page.server.ts` returns `isEditable` (replaces ambiguous `isActive` for score forms).
- `scores.remote.ts` rejects saves when `rotation.roundNumber !== tourney.currentRound`.
- UI shows read-only score display (no inputs / save buttons) when `!isEditable`.
- Standings table still visible on past rounds.

Past-round court links use the **round-specific rotation token** stored on `court_rotation.token` (already implemented in spec 050 / migration 0012).

## Remote Functions

| Function | Change |
|----------|--------|
| `getTournamentData` | Accept `viewRound`; load rotations for that round |
| `saveScore` / `saveSetScore` | Block when rotation is not current round |

No new database tables or migrations required.

## i18n Keys

- `round_stepper_label` — accessibility label for the stepper nav
- `round_stepper_round` — `Round {n}`
- `viewing_past_round` — banner when browsing history
- `scores_read_only` — notice on court page for past rounds

## Testing

### Unit / integration

- `fetchTournamentData` returns courts for `viewRound`, not current.
- `canCloseRound` is false when `viewRound !== currentRound`.

### E2E (optional)

- Create tournament, complete round 1, stepper shows round 1 complete and round 2 current.
- Open past round court link; score inputs disabled.

## Related Specs

- [050_tournament-management.md](./050_tournament-management.md) — tournament view
- [060_court-operations.md](./060_court-operations.md) — court page
- [094_configurable-tie-breaking.md](./094_configurable-tie-breaking.md) — manual tie-break dialog on court cards (current round only)

## Implementation Status

**Implemented.** Round stepper on `/tournament/[id]` with `viewRound` state, past-round read-only court pages, and close-round/manual UI hidden when browsing history.

## Implementation Files

- `src/routes/tournament/[id]/+page.svelte` — stepper component + `viewRound` state
- `src/routes/tournament/[id]/tournament-data.remote.ts` — `viewRound` param
- `src/routes/court/[token]/+page.server.ts` — `isEditable`
- `src/routes/court/[token]/+page.svelte` — read-only mode
- `src/routes/court/[token]/scores.remote.ts` — guard past-round saves
