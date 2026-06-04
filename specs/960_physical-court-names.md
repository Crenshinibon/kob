# Physical Court Name Labels

## Overview

When physical courts < virtual courts, players play in shifts. Currently, courts are numbered 1-N but there's no way for the organizer to label which physical court (e.g., "Court A", "Court 3", "Beach 1") corresponds to which virtual court slot.

## Requirement

Add a text field on the tournament creation page where the organizer enters physical court names. These labels appear on the court page and tournament overview so players know which physical court to use.

Example: 3 virtual courts, 2 physical courts → organizer labels them "Court A" and "Court B". Shift 1 shows "Court A" and "Court B". Shift 2 shows remaining virtual courts mapped to "Court A" and "Court B".

## Implementation

### Phase 1: Database

**File**: `src/lib/server/db/schema.ts`

Add a `physicalCourtLabels` column to the `tournament` table:
```typescript
physicalCourtLabels: text('physical_court_labels'), // JSON array of strings
```

Stored as JSON array: `["Court A", "Court B"]` or `["1", "2", "3", "4"]`.

### Phase 2: Creation UI

**File**: `src/routes/tournament/create/+page.svelte`

Below the physical court count slider, add a text input field:
- Label: "Physical Court Labels"
- Placeholder: "Court A, Court B, Court C, Court D"
- Help text: "Enter names for each physical court, separated by commas. Leave empty for default numbering."
- One label per physical court
- Parsed server-side into JSON array

The number of labels must match `physicalCourtCount`. Show validation message if count mismatches:
- "You have 3 physical courts but entered 2 labels"

### Phase 3: Court Page Display

**File**: `src/routes/court/[token]/+page.server.ts`

When a virtual court is assigned to a shift, determine which physical court it maps to and include the label in page data.

**File**: `src/routes/court/[token]/+page.svelte`

Display the physical court name prominently on the court page:
```
Court A — Shift 1 of 2
Players: Alice, Bob, Carol, Dave
```

### Phase 4: Tournament Overview

**File**: `src/routes/tournament/[id]/+page.svelte`

Each court card in the overview shows both the virtual court number and the assigned physical court label:
```
Court 1 → Court A
Shift 2 → Court A
```

For batch scheduling, the physical court label for each shift can be shown based on the mapping.

---

## Physical-to-Virtual Court Mapping

When `physicalCourtCount = 2` and `virtualCourtCount = 4`:

```
Shift 1: Virtual Court 1 → Physical Court 0 (label: "A")
         Virtual Court 2 → Physical Court 1 (label: "B")
Shift 2: Virtual Court 3 → Physical Court 0 (label: "A")
         Virtual Court 4 → Physical Court 1 (label: "B")
```

The mapping is `physicalIndex = virtualCourtNumber % physicalCourtCount`. Labels are looked up from the array by index.

---

## Acceptance Criteria

- [ ] Organizer can enter physical court labels during tournament creation
- [ ] Labels validate: count must match physical court count
- [ ] Court page shows assigned physical court label with shift info
- [ ] Tournament overview shows virtual-to-physical court mapping
- [ ] Defaults to numeric (1, 2, 3...) if no labels provided
- [ ] Labels persist across rounds
- [ ] Labels stored as JSON in tournament table
