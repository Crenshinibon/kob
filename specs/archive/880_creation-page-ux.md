# 880 Creation Page UX Polish [FIXED]

## Items

Five small UX fixes implemented.

---

### 1. "Win By" Explainer [FIXED]

**File**: `src/routes/tournament/create/+page.svelte`

**Changed**: Radio labels from bare "2 points" / "1 point" to descriptive "2 points (deuce possible)" / "1 point (first to N wins)". Added `.field-hint` text below: "Points difference required to win a set (e.g., 21-19 with win-by-2)".

---

### 2. WVV CSV Import Help [FIXED]

**File**: `src/routes/tournament/create/+page.svelte`

**Changed**:

- `handlePaste` regex: `/[,;]+/` → `/[,;\t]+/` and condition `pastedText.includes('\t')` added
- Added `<details>` import tip below textarea: "From the WVV management site, download the CSV from 'Meldungen'. Copy the 'spieler 1' and 'wvv' columns and paste them here."
- Added `.hint` text: "One name per line, optionally with seed points: Name 1250"

---

### 3. Court Count Slider Knob Position [FIXED]

**File**: `src/routes/tournament/create/+page.svelte`

**Changed**: Wrapped slider + labels in `.range-container` div using CSS Grid:

```css
.range-container {
	display: grid;
	grid-template-columns: 1fr;
}
.range-container input[type='range'] {
	grid-row: 1;
}
.range-labels {
	display: grid;
	grid-template-columns: 1fr auto 1fr;
	grid-row: 2;
}
```

Labels now use the same column structure as the slider, ensuring "1" and "16" align precisely with the slider knob at extremes. The center label shows the current value.

---

### 4. Auto-Calculated Rounds Display [FIXED]

**File**: `src/routes/tournament/create/+page.svelte`

**Changed**: Replaced `<div class="info-box">` with `<span class="info-text">`. Added new CSS class:

```css
.info-text {
	font-size: var(--font-size-base);
	color: var(--text-muted);
	font-weight: 500;
}
```

No background or border — pure display element that clearly doesn't look like an input.

---

### 5. Retirement vs Injury Explainer [FIXED]

**File**: `src/routes/tournament/[id]/+page.svelte`

**Changed**:

- Retire note: "Remove a player before any scores are entered. This will reshuffle ALL courts (recalculate all player assignments). The retired player is removed for the remainder of the tournament."
- Injury note: "Handle a player injury mid-round. This only affects the player's current court for the current round. Other courts continue normally. At the end of the round, the injured player can either continue (substitute) or be retired."

## Summary

| #   | Change                          | Complexity | Tests                   |
| --- | ------------------------------- | ---------- | ----------------------- |
| 1   | Win-by radio labels + explainer | Trivial    | Visual only             |
| 2   | Tab delimiter + WVV import tip  | Trivial    | Manual paste test       |
| 3   | Slider grid layout              | Small      | Visual + existing E2E   |
| 4   | `.info-text` class              | Trivial    | Updated 2 E2E selectors |
| 5   | Retire/injury note text         | Trivial    | No E2E changes needed   |
