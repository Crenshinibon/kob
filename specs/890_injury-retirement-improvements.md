# 890 Injury/Retirement Improvements

## Items

Two improvements for injury and retirement handling.

---

### 1. Disable "Report Injury" When All Scores Are Entered

**File**: `src/routes/tournament/[id]/+page.svelte` (line 461)

**Current condition**:

```svelte
{#if isActive && currentRound > 0 && hasScores}
```

This shows the "Report Injury" section whenever there are any scores in the current round. But if ALL matches have scores entered (i.e., the round is fully scored), there's nothing to report injury on — the appropriate action is "Retire" between rounds.

**Fix**: Add an `allScoresEntered` field to `TournamentDisplayData` (in `tournament-data.remote.ts`). Compute it as:

```ts
allScoresEntered = completedMatchCount === expectedMatchCount;
```

Where `completedMatchCount` counts matches with `teamAScore !== null && teamBScore !== null || isCanceled` and `expectedMatchCount` is the expected number of matches for the round.

Then change the condition to:

```svelte
{#if isActive && currentRound > 0 && hasScores && !allScoresEntered}
```

Add an info note below the section when `allScoresEntered` is true:

```svelve
{#if allScoresEntered}
	<p class="info-muted">
		All scores entered for this round. Use "Retire a Player" before the next round
		if a player needs to be removed.
	</p>
{/if}
```

**Files affected**:

- `tournament-data.remote.ts` — add `allScoresEntered` to `TournamentDisplayData`, compute in `fetchTournamentData`
- `[id]/+page.svelte` — update condition, add info text

---

### 2. Undo Retirement / Injury

**Problem**: No way to undo a retirement or injury report if the organizer made a mistake.

#### Undo Retirement

**Location**: `src/routes/tournament/[id]/tournament-actions.remote.ts` — `retirePlayer`

**Current behavior**: Sets `player.retiredAt`, `player.retiredRound`, `player.retirementReason`, then redistributes all courts (removes the player, recalculates assignments, deletes existing matches).

**Undo approach**: Reversing a retirement is complex because:

- The player was removed from all courts and matches were deleted
- Redistribution already happened (other courts were reshuffled)
- The player may have been in the middle of a round

**Simplified undo**: Allow undoing ONLY if the round has NOT been closed yet AND no scores have been entered in any match involving the retired player's court. In this case:

1. Re-add the player to the tournament (clear `retiredAt`/`retiredRound`)
2. Recalculate all court assignments from scratch for the current round
3. Recreate match records
4. The simplest approach: call the same redistribution logic that runs when `closeRound` creates the next round, but apply it to the current round

**Implementation**:

- New remote function: `undoRetirement(tournamentId: number, playerId: number)`
- Only callable if `currentRound > 0`, player is retired, and no scores entered in ANY match for the current round
- Clears `player.retiredAt`, `player.retiredRound`, `player.retirementReason`
- Deletes existing matches for the current round (which have no scores since we checked)
- Runs court redistribution for the current round with the player included
- Creates new match records

#### Undo Injury

**Location**: `src/routes/tournament/[id]/tournament-actions.remote.ts` — `reportInjury`

**Current behavior**: For "substitute" option — adds a substitute player. For "cancel" option — cancels remaining matches for the injured player's court.

**Undo approach**: Simpler than retirement because the data still exists:

- Canceled matches still exist in the DB (with `isCanceled: true`)
- The injured player is NOT removed from the tournament
- No courts were reshuffled

**Implementation**:

- New remote function: `undoInjury(tournamentId: number, playerId: number)`
- Only callable if `currentRound > 0`, player has matches with `isCanceled: true` in the current round
- Reverts `isCanceled` on the player's matches for the current round
- If a substitute was added, removes the substitute from the rotation
- Clears any injury marker from the matches

#### UI for Undo

In the tournament page, after a retirement or injury action succeeds, show an "Undo" button with a brief time window (or persistent until round closes).

**Retire section** — update to show retired players with undo option:

```svelte
{#if retiredPlayers.length > 0 && !hasScores}
	<div class="retired-list">
		{#each retiredPlayers as rp (rp.id)}
			<div class="retired-item">
				<span>{rp.name} (Round {rp.retiredRound})</span>
				<button class="btn-small" onclick={() => undoRetirement(...)}>Undo</button>
			</div>
		{/each}
	</div>
{/if}
```

**Injury section** — after injury is reported, show:

```svelte
{#if reportedInjury}
	<div class="injury-undo">
		<p>Injury reported for {reportedInjury.playerName}</p>
		<button class="btn-small" onclick={() => undoInjury(...)}>Undo</button>
	</div>
{/if}
```

#### Undo validation guard

Both undo operations should be inaccessible (button hidden/disabled) once:

- The round has been closed
- Any scores have been entered in affected matches
- Another injury/retirement has occurred that depends on the first one

#### Files affected

- `tournament-actions.remote.ts` — add `undoRetirement` and `undoInjury` remote functions
- `[id]/+page.svelte` — add UI for undo buttons
- `tournament-data.remote.ts` — expose `retiredPlayers` and injury state for undo eligibility
- `$lib/server/tournament-logic.ts` — may need a redistribution function that works on the current round (not just creating next round)
