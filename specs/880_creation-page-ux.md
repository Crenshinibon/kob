# 880 Creation Page UX Polish

## Items

Five small UX fixes for the tournament creation page and court page.

---

### 1. "Win By" Explainer

**File**: `src/routes/tournament/create/+page.svelte` (lines 280-291)

**Problem**: The "Win By" radio shows "2 points" / "1 point" with no explanation of what this means.

**Fix**: Add a small help text below the radio group:

```
Points difference required to win a set (e.g., 21-19 with win-by-2)
```

For `winBy = '1'`, the help text could update to show the implication:

```
Points difference required to win a set (e.g., 21-20 with win-by-1 — no deuce)
```

Could also label the radios more clearly instead of just "2 points":

```
Win By: 2 points (deuce possible) / 1 point (first to N wins)
```

**UX note**: The "Win By" section is only visible inside the "Custom" scoring mode section (`advanced-section`), so the explainer is aimed at users who are configuring custom scoring.

---

### 2. WVV CSV Import Help

**File**: `src/routes/tournament/create/+page.svelte` (textarea around line 335)

**Problem**: No guidance on how to import players from the official WVV management site. Users don't know they can paste "spieler 1" + "wvv" columns from the CSV export.

**Fix**: Add a help text line below the textarea (or as a `<details>` expandable tip):

```
Tip: From the WVV management site, download the CSV from "Setzliste".
Copy the "spieler 1" and "wvv" columns and paste them here.
(One name per line, optionally with points: "Name 1234")
```

The textarea already supports pasting comma/semicolon-separated data (via `handlePaste`), but the WVV CSV has tab/space-separated columns. The tip should clarify the expected format.

Also consider: WVV CSV columns are typically tab-separated. The paste handler currently only splits on `,` and `;`. **Add tab (`\t`) as a split delimiter** in `handlePaste` so pasting WVV columns works directly:

```ts
const names = pastedText
	.split(/[,;\t]+/)
	.map((n) => n.trim())
	.filter((n) => n.length > 0);
```

---

### 3. Court Count Slider Knob Position

**File**: `src/routes/tournament/create/+page.svelte` (lines 382-404)

**Problem**: The range slider knob doesn't align with the "1" and "16" labels at the extremes. CSS issue: the slider track fills from the left, and the knob center doesn't match the label positions at min/max.

**Fix**: The issue is that `input[type='range']` in webkit browsers has the knob width extending beyond the track. The labels are positioned at `justify-content: space-between` which puts "1" at the very left edge and "16" at the very right edge, but the slider's effective range starts/ends inset by half the knob width.

Fix the CSS to align labels with knob positions:

```css
.range-labels {
	display: flex;
	justify-content: space-between;
	padding: 0 calc(knobWidth / 2); /* offset by half knob width */
}
```

The knob width varies by browser/OS. A practical approach:

- Set `padding: 0 8px` on the `.range-labels` container to visually align
- Or wrap the slider in a container and use the same padding on labels

Alternatively, restructure the slider container to use CSS Grid with the slider spanning the full width, and the labels aligned to the grid:

```css
.range-container {
	display: grid;
	grid-template-columns: 1fr auto 1fr;
	align-items: center;
}
```

---

### 4. Auto-Calculated Rounds Display

**File**: `src/routes/tournament/create/+page.svelte` (lines 406-425)

**Problem**: In Preseed format, the auto-calculated rounds count renders in an `info-box` div:

```svelte
<div class="info-box">{effectiveRounds} rounds (auto-calculated)</div>
```

But the `.info-box` class (lines 643-650) applies `background-color: var(--bg-input)` and `border: var(--border-thickness) solid var(--border-default)` — making it look like an input field.

**Fix**: Change the preseed rounds display to not look like an input. Options:

- Use a plain `<p>` or `<span>` with muted text
- Style `.info-box` differently (remove background/border when used for display-only content)
- Use a different class like `.info-text` that's purely a display element

Example fix:

```svelte
<span class="rounds-preseed">{effectiveRounds} rounds (auto-calculated for preseed format)</span>
```

With CSS:

```css
.rounds-preseed {
	font-size: var(--font-size-base);
	color: var(--text-muted);
	font-weight: 500;
}
```

---

### 5. Retirement vs Injury Explainer

**File**: `src/routes/tournament/[id]/+page.svelte` (lines 409-524)

**Problem**: The "Retire a Player" and "Report Injury" sections have brief notes but don't explain the difference in how they affect the tournament:

- **Retire** (line 414-416): "Remove a player before any scores are entered. Courts will be redistributed."
- **Report Injury** (line 466-468): "Handle a player injury mid-round. Choose how to handle remaining matches."

Missing: explanation that retirement reshuffles ALL courts (recalculates all assignments), while injury only affects the injured player's current court for the current round.

**Fix**: Update the notes:

Retire section:

```
Remove a player before any scores are entered. This will reshuffle ALL courts
(recalculate all player assignments). The retired player is removed for the
remainder of the tournament.
```

Injury section:

```
Handle a player injury mid-round. This only affects the player's current court
for the current round. Other courts continue normally. At the end of the round,
the injured player can either continue (substitute) or be retired.
```

## Summary of Changes

| #   | Change                             | File                      | Complexity |
| --- | ---------------------------------- | ------------------------- | ---------- |
| 1   | Win-by explainer text              | `create/+page.svelte`     | Trivial    |
| 2   | WVV CSV import tip + tab delimiter | `create/+page.svelte`     | Trivial    |
| 3   | Slider knob/label alignment        | `create/+page.svelte` CSS | Small      |
| 4   | Auto-calculated rounds styling     | `create/+page.svelte` CSS | Trivial    |
| 5   | Retirement/injury explainer text   | `[id]/+page.svelte`       | Trivial    |
