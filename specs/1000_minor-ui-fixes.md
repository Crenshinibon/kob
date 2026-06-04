# Minor UI Fixes

## Overview

Collection of small UI bugs discovered during manual testing.

---

## Bug 1: Physical Courts Slider Knob Alignment

### Location
Create tournament page — `input[type="range"]` for physical courts

### Symptom
The top end (16) of the physical courts slider is not at the right-most position. The label displaying the current count sits behind the slider knob.

### Fix
Adjust the `.range-labels` CSS grid to properly span the slider track width.

---

## Bug 2: 5p/6p Scoring Override Defaults to 21

### Location
Tournament page — Court Scoring Configuration expandable section

### Symptom
When opening the scoring configuration for a 5p court, the "Points to Win" input shows 21, despite the info text below showing "1 set to 15" (the actual effective scoring for 5p courts).

### Root Cause
The scoring override UI reads from `localOverrides` or `tournament.scoringOverrides?.[size]`. When no override exists, it falls back to `effective.pointsToWin`, which comes from `getEffectiveScoring()`. But `getEffectiveScoring` for 5p courts uses the default 15-point override. The input field should show the **effective** value (15), not the base value (21).

### Fix
Check the `effective` computation in the UI — ensure `getEffectiveScoring(size, base, overrides)` is called correctly for 5p/6p sizes.

---

## Bug 3: 5p/6p Average Points Not Rounded

### Location
Court page standings + Tournament standings page

### Symptom
When using average points for 5p/6p courts, the points and diff values show full precision (e.g., `18.3333333333`). Should show max 2 decimal places.

### Fix
Round average points to 2 decimal places in:
1. `calculateCourtStandings()` in `tournament-logic.ts` — return rounded values
2. Standings page display — apply rounding in the template

---

## Bug 4: Save Score Button Not Reacting on First Click

### Location
Court page — score entry

### Symptom
When there's an input error (e.g., below minimum points), clicking "Save Score" sometimes doesn't react on the first click. This happens most noticeably on the first score entry for a court page.

### Possible Cause
Live query data refresh may be in progress when the button is first clicked. The `saveScore` command is queued but the page hasn't finished its initial data sync. Or the score schema validation is using stale `effectiveScoring` data.

### Investigation Needed
Check if `dynamicScoreSchema` or `effectiveScoring` are computed before the live query yields its first data. The `data.court` object might not have the correct `minPoints` on first render.

---

## Acceptance Criteria

- [ ] Slider knob reaches right-most position at value 16
- [ ] 5p/6p scoring override inputs show effective values (15 for 5p, not 21)
- [ ] Average points rounded to 2 decimal places on both court page and standings page
- [ ] Save Score button works on first click even during initial page load
