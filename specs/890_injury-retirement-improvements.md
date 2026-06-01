# 890 Injury/Retirement Improvements [WIP]

## Items

Two improvements for injury and retirement handling.

---

### 1. Per-Court "Report Injury" Disable

**File**: `src/routes/tournament/[id]/+page.svelte`

**Current condition**:

```svelte
{#if isActive && currentRound > 0 && hasScores}
```

This shows the "Report Injury" section whenever there are any scores in the current round. But it does not account for which _specific courts_ are still playable.

**Requirement**: Per-court granularity.

- Once a court's matches are all complete (scored or canceled = `isComplete`), the players assigned to that court cannot be picked for injury reporting.
- When _all_ courts are complete, the entire Report Injury section deactivates and shows a hint.

#### Player-level filter

The "Report Injury" section has a dropdown of active players. Filter it to exclude players from completed courts.

Add an `isComplete` flag to each court in `TournamentDisplayData`:

```ts
// per court
isComplete: matches.every((m) => (m.teamAScore !== null && m.teamBScore !== null) || m.isCanceled);
```

Then in the player dropdown, exclude players whose court `isComplete === true`.

#### All-courts-complete hint

Compute `allCourtsComplete` = `courts.every(c => c.isComplete)`.

Change the condition to:

```svelte
{#if isActive && currentRound > 0 && hasScores && !allCourtsComplete}
```

When `allCourtsComplete` is true, show a hint:

```
All courts finished for this round. To retire a player because of injury,
proceed to the next round and use the "Retire a Player" functionality.
```

#### Filter validation

When constructing the player dropdown, cross-reference each player's court `isComplete`:

```ts
const eligiblePlayers = currentRoundData.players.filter((p) => {
	const court = courts.find((c) => c.players.includes(p.id));
	return court && !court.isComplete;
});
```

#### Files affected

- `tournament-data.remote.ts` — add `isComplete` to court data, add `allCourtsComplete` to display data
- `[id]/+page.svelte` — filter player dropdown, update condition, add hint text

---

### 2. Undo Retirement / Injury

**Problem**: No way to undo a retirement or injury report if the organizer made a mistake.

#### Shared constraints (all undo operations)

All undo operations are capped by **both** of these conditions:

1. **No scores entered** in the affected round — if any match has real scores, undo is unavailable.
2. **Time window** — undo must be requested within **5 minutes** of the original action. Store `actionTimestamp` on the tournament or player row.

The 5-minute cap applies to **all** undo types: retirement undo, injury (cancel) undo, injury (substitute) undo.

If either constraint fails, the undo button is hidden.

#### Undo Retirement

**Location**: `src/routes/tournament/[id]/tournament-actions.remote.ts` — `retirePlayer`

**Current behavior**: Sets `player.retiredAt`, `player.retiredRound`, `player.retirementReason`, then redistributes all courts (removes the player, recalculates assignments, deletes existing matches).

**Undo approach**: Allow undoing ONLY if **no scores have been entered on ANY court** in the current round (the round is completely untouched by scoring). This is the same "no progress" condition.

**No `currentRound > 0` guard**: Accidental retirement can happen in round 1 just as easily. Remove the round-number constraint.

**Implementation**:

1. New remote function: `undoRetirement(tournamentId: number, playerId: number)`
2. Guards:
   - No scores entered on ANY match this round
   - Within 5 min of the retirement action
3. Clears `player.retiredAt`, `player.retiredRound`, `player.retirementReason`
4. Deletes existing matches for the current round (they have no scores since we checked)
5. Runs court redistribution for the current round with the player included
6. Creates new match records

#### Undo Injury

**Location**: `src/routes/tournament/[id]/tournament-actions.remote.ts` — `reportInjury`

**Current behavior**: Two branches:

- **Substitute**: Replaces injured player with a substitute (creates new match entry rows with sub)
- **Cancel**: Cancels remaining matches for the injured player's court (sets `isCanceled: true` on unmatched matches)

**Undo approach — two variants**:

**Undo Cancel** (simpler):

- Finds the injured player's canceled matches this round
- Sets `isCanceled = false` (or deletes the cancel marker)
- No reshuffling needed — other courts were unaffected

**Undo Substitute** (more complex):

- Removes substitute player's match entries
- Re-adds original injured player's match entries
- If scores were entered with the substitute, the operation is BLOCKED (undo button disappears as soon as the court progresses with scores)

**No `currentRound > 0` guard**: Same reasoning as retirement — it doesn't matter what round the player is in.

#### UI for Undo

**General principle**: Persistent button shown as long as both constraints are met (no scores + within 5 min window). Disappears (or hides) the moment either constraint fails.

**Undo Retirement** — in the "Retire a Player" section, show a list of retired players with an "Undo" button:

```svelte
{#each retiredPlayers as rp (rp.id)}
	{#if rp.canUndoRetire}
		<div class="retired-item">
			<span>{rp.name} retired</span>
			<button onclick={() => undoRetirement(rp.id)}>Undo</button>
		</div>
	{/if}
{/each}
```

`rp.canUndoRetire` is derived from:

- `Date.now() - rp.retiredAt < 5 * 60 * 1000` (within 5 min)
- `noScoresEnteredThisRound` (no match data yet this round)

When `canUndoRetire` becomes `false`, the button disappears.

**Undo Injury (Cancel)** — in the "Report Injury" section, after cancel is performed, show:

```svelte
{#if injuryState.type === 'cancel' && injuryState.canUndoInjury}
	<p>Cancel injury report for {injuryState.playerName}. Time left: {injuryState.timeLeft}s</p>
	<button onclick={() => undoInjury(injuryState.playerId)}>Undo</button>
{/if}
```

`canUndoInjury` derived from:

- `Date.now() - injuryState.reportedAt < 5 * 60 * 1000`
- `noScoresEnteredOnAffectedCourt` (court hasn't progressed with scores)

**Undo Injury (Substitute)** — after substitute is assigned, show:

```svelte
{#if injuryState.type === 'substitute' && injuryState.canUndoInjury}
	<p>Substitute assigned for {injuryState.playerName}. Time left: {injuryState.timeLeft}s</p>
	<button onclick={() => undoInjury(injuryState.playerId)}>Undo</button>
{/if}
```

`canUndoInjury` derived from:

- `Date.now() - injuryState.reportedAt < 5 * 60 * 1000`
- `noScoresEnteredOnAffectedCourt` — but for substitute, also check that the **substitute's matches have no scores**. As soon as any match on the injured player's court (whether played by sub or original player) gets a score, undo is blocked.

**All UI buttons**: Poll or recalculate `canUndo*` on each render/refresh cycle so the button is live-reactive. The client can check time remaining against `reportedAt` or `retiredAt` timestamps returned from the server.

#### DB changes

Add a column to track the timestamp of the retirement/injury action:

- **`players.retired_at`** already exists (timestamp) — used for 5 min window on undo retirement
- **New approach**: Store injury report metadata (playerId, type, timestamp) either:
  - In a new `injury_reports` table, or
  - Add fields to the tournament or match rows

Simpler path: Use a client-side timestamp returned from the remote function action response. The server returns `{ success: true, actionTimestamp: number }`. The client stores it in local state. No DB change needed for the 5-min window — but this means a page reload loses the timer. Acceptable? Probably not for a serious tool.

**Better**: Add `last_injury_action_at` to the `players` table (nullable timestamp). We already have `retired_at` on players. For injuries, we can store the timestamp on the match rows (matches already exist and are the affected records). Or simpler: just store `injured_at` on players too. Then the server can compute eligibility without relying on client state.

Since this is a simplified implementation:

1. Use existing `player.retired_at` for undo retirement timer check
2. Add `player.injured_at` timestamp for undo injury timer check
3. The server-side function checks `age < 5 min` and `no scores on relevant courts`

#### Files affected

- DB schema — add `injured_at` column to players table
- `tournament-actions.remote.ts` — add `undoRetirement` and `undoInjury` remote functions
- `[id]/+page.svelte` — add UI for undo buttons with time-remaining display
- `tournament-data.remote.ts` — expose `retiredPlayers` with `retiredAt`, expose injury state with `injuredAt`
- `$lib/server/tournament-logic.ts` — may need a redistribution function that works on the current round
