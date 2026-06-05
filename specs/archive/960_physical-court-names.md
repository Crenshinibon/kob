# Physical Court Name Labels

## Overview

Virtual courts are numbered 1-N but there's no way for the organizer to label which physical court (e.g., "Court A", "Beach 1", "Platz 3") corresponds to each virtual court. The mapping can change between rounds.

## Requirement

A per-virtual-court free-text label, editable by the organizer from the tournament overview page. Each virtual court gets an inline text input where the org enters the physical court name. The label is stored on the `court` table and can be changed at any time (between rounds, mid-round — whenever). The players' court page displays the label prominently.

## Design

### Database

**File**: `src/lib/server/db/schema.ts`

Add `label` column to the `court` table:

```typescript
label: text('label'), // free-text physical court name, nullable
```

One label per virtual court. The `court` table has stable rows (one per virtual court per tournament, created at tournament start). Editing the label updates the existing row — no need for per-round storage; the org changes it when needed.

### Tournament Overview UI

**File**: `src/routes/tournament/[id]/+page.svelte`

Each court card in the round overview gets an inline text input for the physical label, shown as extra info below the virtual court header:

```
┌─ Court 1 ──────────────────┐
│ Physical: [___Court A____]  │  ← inline text input
│ Players: Alice, Bob, ...    │
│ Open Court Page →           │
└─────────────────────────────┘
```

- Placeholder text: "e.g. Court A"
- Auto-saves on blur
- Dimmed/ghost text when empty: "(no label)"
- Virtual court numbering (Court 1, Court 2, ...) stays as the primary identifier

### Remote Command

**File**: `src/routes/tournament/[id]/tournament-actions.remote.ts`

New `command` or `form`:

```typescript
export const setCourtLabel = command(
	v.object({
		courtId: v.number(),
		label: v.string()
	}),
	async ({ courtId, label }) => {
		// validate org owns this court's tournament
		await db
			.update(court)
			.set({ label: label || null })
			.where(eq(court.id, courtId));
		getTournamentDataLive(tournamentId).reconnect();
	}
);
```

### Court Page Display

**File**: `src/routes/court/[token]/+page.server.ts`

Include `label` from the `court` table in the page data (already loaded via `court` join).

**File**: `src/routes/court/[token]/+page.svelte`

Show the physical label as extra info, keeping the virtual court number primary:

```
Court 1
Physical: Court A
Players on This Court (4p)
```

Or more compact:

```
Court 1 · Court A
Shift 1 of 2
```

If no label set, show only the virtual court number (no extra line). The virtual court number is always the primary identifier.

---

## Acceptance Criteria

- [x] `label` column added to `court` table (nullable text)
- [x] Tournament overview shows inline text input per court for label
- [x] Label auto-saves (blur or small save button)
- [x] Court page displays label prominently
- [x] No label = no extra display (clean fallback)
- [x] Label survives round transitions (on `court` table, not rotation)
- [x] Only tournament organizer sees/can edit the label input (court page shows it read-only)
