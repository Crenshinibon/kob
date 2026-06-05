# Standings Live Update

## Question

Does the standings page live-update with incoming scores and pre-calculated standings? Currently players can only see their court's standings — they need to see the full tournament standings update in real-time to understand their global placement and chances.

## Current Behavior

The standings page (`/tournament/[id]/standings`) is a server-rendered page:

- `+page.server.ts` loads all data on page load
- No live query, no polling, no WebSocket
- Page shows a snapshot at load time
- User must manually refresh to see updated scores

The tournament overview page (`/tournament/[id]`) DOES use `query.live()` with 3-second polling for its data.

## Requirement

Standings page should reflect incoming scores in near-real-time. When players enter scores on court pages, standings should update automatically.

## Implementation Options

### Option A: `query.live()` Polling (Recommended)

Mirror the tournament page approach:

- Convert standings data loading to a `query.live()` function
- Poll every 3-5 seconds
- On each poll, recalculate standings from current match data
- Page automatically updates when new scores arrive

**Pros**: Simple, same pattern as tournament page, no new infrastructure
**Cons**: Server recalculation on every poll, even if no new scores

### Option B: On-Demand Refresh Only

Add a "Refresh" button to the standings page. Users manually refresh when they want to see updates.

**Pros**: No server load, simple UI change
**Cons**: Not a live experience, players must actively refresh

### Option C: Event-Driven via Live Query Reconnect

When scores are saved on a court page, trigger `getStandingsDataLive(id).reconnect()` (similar to tournament data). The standings page's live query detects the reconnect and yields new data.

**Pros**: Real-time without constant polling
**Cons**: Requires coupling between score save and standings reconnect, more complex

---

## Recommended: Option A

Convert the server load function to a `query.live()` with 3-second polling. This is the same pattern already used for the tournament data page and requires no new infrastructure.

### Implementation

**File**: `src/routes/tournament/[id]/standings/+page.server.ts` → Create `standings-data.remote.ts`

1. Extract data-loading logic into a `query.live()` function
2. Import and use in `+page.svelte` via `getStandingsDataLive(tournamentId)`
3. Yield updated standings on each poll cycle

**File**: `src/routes/tournament/[id]/standings/+page.svelte`

1. Use the live query instead of server-side `data` prop
2. Handle loading/error states
3. Keep existing UI components, just feed them reactive data

---

## Acceptance Criteria

- [x] Standings page updates automatically when new scores are entered
- [x] No manual refresh needed
- [x] Poll interval is reasonable (3 seconds)
- [x] Loading state shown while initial data loads
- [x] Error state handled gracefully
