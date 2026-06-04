# Standings Visual Improvements: Court Grouping Colors

## Overview

Current standings table shows all rows with uniform white text on dark background. Court grouping is only indicated by a small green text badge ("C1 4p", "C2 4p", etc.). Players can't easily distinguish which court/bracket group they belong to at a glance.

## Design Constraint

Keep dark background — necessary for outdoor visibility in bright sunlight (see spec 100_dark-theme.md). Court grouping must be indicated via font colors, borders, and badge colors — never background colors.

## Requirements

### 1. Font Color Gradient by Court

Text color for player names and points varies by court group. Gradient from top court to bottom court:

- **Court 1** (winner bracket): Bright gold `#FFD700` — highlights the leaders
- **Court 2**: Bright yellow-green `#ADFF2F`
- **Court 3**: Bright orange `#FF8C00`
- **Court 4**: Bright coral `#FF6B6B`
- **5p/6p bottom courts**: Deep red `#FF4444`

Colors are saturated and bright for maximum contrast on black background.

### 2. Court Badge Color Update

The existing court badge (e.g., "C1 4p") currently uses green (`var(--accent-success)`). Replace with the court's group color from the gradient above. Each court's badge matches its text color.

### 3. Left Border per Court Group

A 3-4px left border on each row, colored per court group. Same color as the court badge and text. Creates a clear vertical grouping line visible even when scrolling.

```
▌ Court 1 players (gold border, gold badge, gold text)
▌ Court 2 players (yellow-green border, yellow-green badge)
▌ Court 3 players (orange border, orange badge)
```

### 4. Larger Court Position Numbers

Display the court-internal position (1st–4th) prominently next to the overall rank. Use large bold numbers — no icons or emojis — in the court group color:

```
Overall | Player   | Points | Diff | Pos
   1    | Alice    | ...          | 1
   5    | Eve      | ...          | 1
   6    | Frank    | ...          | 2
```

The court position number should be visually dominant:
- Large font size (1.5–2× body text)
- Bold weight
- Colored with the court group color
- Stands alone in its own column or beside the player name

### 5. Court Group Separator

A subtle horizontal divider line between court groups (using the next court's color) to reinforce the grouping.

---

## Color Stops

| Court | Badge/Font Color | Hex | Visual |
|-------|-----------------|-----|--------|
| 1 | Bright gold | `#FFD700` | 🟡 |
| 2 | Yellow-green | `#ADFF2F` | 🟢 |
| 3 | Orange | `#FF8C00` | 🟠 |
| 4 | Coral | `#FF6B6B` | 🔴 |
| 5+ | Deep red | `#FF4444` | ❤️ |

All colors are bright enough to maintain contrast against `var(--bg-primary)` (dark).

---

## Implementation

### Phase 1: Court Color Function

**File**: `src/routes/tournament/[id]/standings/+page.svelte`

Add a helper that returns the court group color:
```typescript
function getCourtColor(courtNum: number): string {
    const colors = ['#FFD700', '#ADFF2F', '#FF8C00', '#FF6B6B'];
    return colors[Math.min(courtNum - 1, colors.length - 1)] || '#FF4444';
}
```

### Phase 2: Apply Colors

- **Text**: apply `getCourtColor(courtNum)` as `color` on the player name cell
- **Badge**: replace green with `getCourtColor(courtNum)` in the court badge element
- **Border**: apply `border-left: 3px solid getCourtColor(courtNum)` on each row
- **Separator**: add `border-bottom` between court groups when court changes

### Phase 3: Court Position Display

- Add a "Pos" column showing the court-internal rank number (1-4)
- Large bold numbers, colored with the court group color
- Separate column for clarity

---

## Acceptance Criteria

- [x] Each court group has a distinct bright font color (gold → red gradient)
- [x] Left border in court group color on each row
- [x] Court badge replaces green with court group color
- [x] Court position within court displayed as large bold numbers (1-4), no emojis
- [x] Court position numbers colored with the court group color
- [x] Dark background preserved (no background color changes)
- [x] All colors maintain high contrast on black background
- [x] Works on mobile
- [x] Works for both mid-tournament and final standings
