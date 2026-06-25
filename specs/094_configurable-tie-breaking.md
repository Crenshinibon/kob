# Configurable Tie-Breaking

## Problem

Promotion, relegation, and within-court standings currently use a **fixed** tie-break order: points → differential → player ID. Beach volleyball organizers often need different resolution strategies:

- Normalized points for 5p/6p courts
- Cumulative tournament totals with 5p/6p round normalization
- Random dice roll among tied players
- Manual org decision (e.g. playoff point, coin flip, short 1v1 — org records outcome)

This spec defines **configurable, reorderable tie-break factors** stored per tournament.

## Tie-Break Factors

| ID | Label | Description |
|----|-------|-------------|
| `round_points` | Points This Round | Court standings for the active round. On 5p/6p (or canceled-match average courts): **average points per game** in this round on this court. |
| `round_diff` | Diff This Round | Point differential this round on this court. Normalized to **average diff per game** on 5p/6p / canceled courts. |
| `total_points` | Total Points | Sum of per-round point contributions across all completed rounds **plus** the round being ranked. Each 5p/6p round contributes `roundRawPoints / 3` (3 = standard games per round). Standard 4p rounds contribute raw round points. |
| `total_diff` | Total Diff | Sum of raw point differentials across all rounds (no per-game normalization). |
| `initial_order` | Seeding | Lower `playerId` wins (deterministic). For preseed with `seedRank`, lower `seedRank` wins; ties fall back to `playerId`. |
| `dice` | Dice | When still tied after all prior **enabled** factors, pick a random ordering among the tied group. Uses injected RNG (tests use seeded RNG). |
| `manual` | Manual | Organizer-defined order for tied players on a court before closing the round. Stored as `manual_rank_order` on `court_rotation`. Lower index = better rank. |

### Default Configuration

Enabled factors in this order (dice and manual **disabled** by default):

1. `round_points`
2. `round_diff`
3. `total_points`
4. `total_diff`
5. `initial_order` (the **final** tie-breaker — exactly one of seeding/dice/manual must be enabled)
6. `dice` (disabled)
7. `manual` (disabled)

```typescript
export const DEFAULT_TIE_BREAK_CONFIG: TieBreakConfig = {
  factors: [
    { id: 'round_points', enabled: true },
    { id: 'round_diff', enabled: true },
    { id: 'total_points', enabled: true },
    { id: 'total_diff', enabled: true },
    { id: 'initial_order', enabled: true },
    { id: 'dice', enabled: false },
    { id: 'manual', enabled: false }
  ]
};
```

### Config Normalization (`normalizeTieBreakConfig`)

Saved and loaded configs are normalized to enforce:

1. **Canonical order** — statistical factors first (`round_points` → `total_diff`), then final factors (`initial_order`, `dice`, `manual`).
2. **Exactly one final factor enabled** — seeding, dice, or manual; defaults to `initial_order` if none enabled.
3. **Statistical factors** — any subset may be enabled/disabled and reordered among themselves.

Normalization runs on read (tournament load, standings resolution) and on save (`updateTieBreakConfig`).

### Backward Compatibility

Tournaments with `tie_break_config = NULL` use `DEFAULT_TIE_BREAK_CONFIG`. With only the five statistical factors enabled in default order, behavior matches the previous hard-coded `points → diff → playerId` for standard 4p courts.

## Where Tie-Breaking Applies

| Context | Factors used |
|---------|--------------|
| **Court standings** (`calculateCourtStandings`) | All enabled factors; `round_*` from current court matches; `total_*` from completed rounds + current |
| **Vertical seeding tier sort** | Same; players compared across courts at same finish position |
| **Preseed redistribution tier sort** | Same |
| **Ladder redistribution rank picks** | Same when comparing candidates |
| **Final court positions** | Court standings on final round use full factor chain — relevant for all positions (1st–4th), not only 2nd vs 3rd |

## Factor Semantics (Detailed)

### Round points (5p/6p normalization)

For courts with `playerCount >= 5` on that rotation, or any court with canceled matches:

```
round_points = sum(matchPoints) / gamesPlayed
```

Same as existing `calculateCourtStandings` average logic.

### Total points (5p/6p normalization)

For each round the player participated in:

```
if courtSize >= 5 || roundHadCanceledMatches:
  contribution = sum(rawMatchPointsThatRound) / 3
else:
  contribution = sum(rawMatchPointsThatRound)

total_points = sum(contributions over all rounds)
```

The divisor `3` is the **standard games per round** (not games actually played). Example: 4 games on a 5p court → round points summed, divided by 3, added to cumulative total.

### Dice

- Evaluated only when `enabled: true` and reached in factor order.
- Applied per **tie group**: when sorting, players equal on all prior factors enter a dice resolution block.
- One random shuffle of the tied subgroup (Fisher–Yates with injected `rng`).
- Production: `Math.random`. Tests: `() => fixedValue`.

### Manual

- Enabled only when org selects **Manual** as the final tie-breaker (radio group).
- Org reorders players on a court via a **dialog** on the tournament admin page (current round only).
- Dialog shows a factor comparison table and local draft order with ↑/↓; explicit **Save** persists, **Cancel** discards.
- Persisted on `court_rotation.manual_rank_order: number[]` (player IDs best-to-worst).
- At ranking time: among players still tied on prior factors, compare `indexOf(playerId)` in `manual_rank_order` (lower index = better).
- Players not listed in manual order are treated as tied at the end of the manual block.
- Intended for close-round workflow: org resolves ties, then clicks Close Round.

## Database Schema

### `tournament.tie_break_config` (JSONB, nullable)

```typescript
type TieBreakFactorId =
  | 'round_points'
  | 'round_diff'
  | 'total_points'
  | 'total_diff'
  | 'initial_order'
  | 'dice'
  | 'manual';

type TieBreakFactorConfig = {
  id: TieBreakFactorId;
  enabled: boolean;
};

type TieBreakConfig = {
  factors: TieBreakFactorConfig[];
};
```

### `court_rotation.manual_rank_order` (JSONB, nullable)

`number[]` — player IDs in desired rank order (index 0 = best).

### Round-close snapshots (`court_rotation`, migration `0015`)

When a round is closed, each rotation stores:

| Column | Type | Purpose |
|--------|------|---------|
| `tie_break_config_snapshot` | JSONB | Tie-break rules in effect when the round closed |
| `standings_snapshot` | JSONB | Final per-player ranks, points, diff, tie-break explanations |
| `dice_rolls` | JSONB | Stable pair-wise dice rolls (`"minId:maxId"` → `0..1`) |
| `round_closed_at` | timestamp | Marks the rotation as finalized |

Past-round views (stepper, court pages) read snapshots instead of recomputing live rankings. Dice rolls are also persisted during the active round so standings do not shuffle on reload.

When loading snapshots, `applyStandingsExplanations` recomputes tie-break factor icons and `decidingOutcome` using the snapshotted config and dice rolls so explanations stay consistent with current logic.

## API / UI

### Tournament creation (`/tournament/create`)

- Collapsible **Tie-break rules** section.
- Statistical factors: enable checkbox + ↑/↓ reorder.
- **Final tie-breaker**: radio group at bottom — exactly one of Seeding, Dice, or Manual.
- Saved to `tie_break_config` on create (normalized on save).

### Tournament admin (`/tournament/[id]`)

- Same editor as creation (collapsible, near scoring overrides).
- Config syncs from server via `$effect` when tournament data loads.
- `updateTieBreakConfig` remote command (normalizes before persist).

### Manual rank (current round only)

- When **Manual** is the selected final tie-breaker and viewing the current round:
  - Each court card with unresolved manual ties shows a **Set order** button.
  - Opens `<dialog>` with factor table, local draft reorder (↑/↓), Save/Cancel.
  - `updateManualRankOrder({ rotationId, playerIds })` remote command on Save.

### Tie-break visualization

- `TieBreakFactorIcons.svelte` shows factor glyphs beside player names in standings.
- **Tied factors** (dashed border, muted): stats that were equal for that player group.
- **Deciding factor** (solid border, outcome color): factor that separated ranks.
- **Outcome colors** (`src/lib/court-colors.ts`): gold = won break (`won`), green = middle (`middle`), blue = lost (`lost`).
- Legend shown on tournament admin court standings and court page when any tie-break icons present.
- Rank numbers on tournament page use the same outcome color when a deciding factor exists.

## Core Functions (`src/lib/tournament-logic.ts`)

```typescript
normalizeTieBreakConfig(config): TieBreakConfig

explainCourtStandings(standings, config, context): CourtStandingExplanation[]

buildPlayerRoundStats(matches, playerIds): Map<playerId, { points, diff, rawPoints, rawDiff, gamesPlayed }>

buildPlayerTotalStats(completedRounds, currentRoundMatches, courtSizes, players): Map<playerId, { totalPoints, totalDiff }>

comparePlayersForTieBreak(a, b, config, context): number

sortPlayersByTieBreak(playerIds, config, context): number[]

calculateCourtStandings(matches, playerIds, options?: {
  tieBreakConfig?: TieBreakConfig;
  completedRounds?: CourtResult[][];
  courtSizes?: number[];
  players?: Player[];
  manualRankOrder?: number[];
  rng?: () => number;
}): CourtStandings[]
```

Redistribution functions accept optional `tieBreakOptions` passed through to tier sorts.

### Court standings service (`src/lib/server/court-standings-service.ts`)

- `resolveRotationStandings` — live or snapshot standings for a rotation.
- `snapshotClosedRoundRotations` — persist config, standings, dice rolls on round close.
- `applyStandingsExplanations` — attach tie-break icons/outcomes to standing rows.

## Testing Requirements

### Tie-break unit tests (`src/lib/server/tournament-logic.test.ts`)

Dedicated `describe('tie-break ranking')` with cases for:

1. **Default config** — reproduces legacy 4p ordering.
2. **Single factor enabled** — each factor alone determines order when others disabled.
3. **Factor order** — swapping `round_diff` before `round_points` changes outcome.
4. **5p round_points** — averages vs totals.
5. **5p total_points** — raw sum/3 contribution to cumulative.
6. **total_diff** — cumulative diff breaks tie when round stats equal.
7. **Seeding** — playerId / seed rank tiebreak.
8. **dice** — seeded RNG produces deterministic shuffle among equals.
9. **manual** — manual_rank_order overrides automatic tie.
10. **Combined** — realistic multi-factor scenarios (e.g. equal round points, diff differs on total).
11. **Redistribution** — vertical seeding tier order changes when total_points enabled and differs.

Minimum **30+** new assertions across factor combinations.

## Related Specs

- [070_scoring-and-standings.md](./070_scoring-and-standings.md) — superseded tie-break section for configurable rules
- [080_promotion-relegation.md](./080_promotion-relegation.md) — tier sorting references this spec
- [093_round-history-stepper.md](./093_round-history-stepper.md) — manual rank only on current round view

## Implementation Files

- `src/lib/tournament-logic.ts` — core ranking engine, normalization, explanations
- `src/lib/court-colors.ts` — tie-break outcome colors
- `src/lib/components/TieBreakFactorIcons.svelte` — standings factor icons
- `src/lib/server/court-standings-service.ts` — snapshots and explanation recompute
- `src/lib/server/db/schema.ts` — columns
- `drizzle/0014_tie_break_config.sql` — migration
- `drizzle/0015_round_close_snapshots.sql` — snapshot columns
- `src/routes/tournament/create/*` — creation UI
- `src/routes/tournament/[id]/tournament-actions.remote.ts` — config + manual rank commands, closeRound wiring
- `src/routes/tournament/[id]/+page.svelte` — tie-break settings, manual dialog, court standings display
- `src/routes/court/[token]/+page.svelte` — tie-break icons on court standings
- `src/lib/server/tournament-logic.test.ts` — comprehensive tests
