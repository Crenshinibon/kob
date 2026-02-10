# Dark Theme for Outdoor Visibility

## Overview

Special high-contrast dark theme optimized for bright sunlight conditions. Essential for beach volleyball tournaments where users access the app on mobile devices in direct sunlight.

## Design Principles

### Contrast First

- Maximum contrast between text and backgrounds
- Bright, saturated accent colors that remain visible in sunlight
- Avoid subtle gradients or low-contrast combinations

### Mobile-Optimized

- Touch targets remain large and distinct
- No reliance on hover states (not available on touch)
- Readable at arm's length (typical phone viewing distance on beach)

### Accessibility

- WCAG AAA compliance for contrast ratios
- Color-blind friendly palette (don't rely solely on color)
- Support for system preference (prefers-color-scheme)

## Color Palette

### Backgrounds

- **Primary Background**: `#0a0a0a` (near black)
- **Secondary Background**: `#141414` (dark gray)
- **Card Background**: `#1a1a1a` (slightly lighter)
- **Input Background**: `#0f0f0f` (very dark)

### Text Colors

- **Primary Text**: `#ffffff` (pure white) - Contrast ratio: 21:1
- **Secondary Text**: `#e0e0e0` (light gray) - Contrast ratio: 17:1
- **Muted Text**: `#a0a0a0` (medium gray) - Contrast ratio: 10:1

### Accent Colors (High Visibility)

- **Success/Green**: `#00ff41` (bright neon green)
- **Error/Red**: `#ff3333` (bright red)
- **Warning/Yellow**: `#ffcc00` (bright yellow)
- **Info/Blue**: `#00ccff` (bright cyan)
- **Primary Action**: `#ff6b35` (bright orange)

### Borders & Highlights

- **Default Border**: `2px solid #404040`
- **Focus Border**: `3px solid #00ccff` (cyan glow)
- **Success Border**: `2px solid #00ff41`
- **Error Border**: `2px solid #ff3333`

## Component Styles

### Buttons

```css
.btn-primary {
	background: #ff6b35;
	color: #0a0a0a;
	border: 3px solid #ff6b35;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.btn-primary:hover {
	background: #ff8555;
	box-shadow: 0 0 15px rgba(255, 107, 53, 0.5);
}

.btn-secondary {
	background: transparent;
	color: #00ccff;
	border: 3px solid #00ccff;
}
```

### Cards

```css
.card {
	background: #1a1a1a;
	border: 2px solid #404040;
	border-radius: 8px;
}

.card-active {
	border-color: #00ff41;
	box-shadow: 0 0 10px rgba(0, 255, 65, 0.3);
}

.card-draft {
	border-color: #ffcc00;
}
```

### Inputs

```css
input,
textarea {
	background: #0f0f0f;
	color: #ffffff;
	border: 2px solid #505050;
	caret-color: #00ccff;
}

input:focus {
	border-color: #00ccff;
	box-shadow: 0 0 0 3px rgba(0, 204, 255, 0.3);
	outline: none;
}
```

### Status Badges

```css
.status {
	padding: 4px 12px;
	border-radius: 4px;
	font-weight: 700;
	font-size: 0.875rem;
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.status-active {
	background: #00ff41;
	color: #0a0a0a;
}

.status-draft {
	background: #ffcc00;
	color: #0a0a0a;
}

.status-completed {
	background: #00ccff;
	color: #0a0a0a;
}
```

## Typography

### Font Stack

```css
font-family:
	-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
```

### Font Weights

- Headings: 700 (bold)
- Body: 400 (normal)
- Labels/Buttons: 600 (semibold)
- Status: 700 (bold) + uppercase

### Text Shadows for Readability

```css
.text-shadow {
	text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}
```

## Implementation

### CSS Variables

```css
:root {
	--bg-primary: #0a0a0a;
	--bg-secondary: #141414;
	--bg-card: #1a1a1a;
	--text-primary: #ffffff;
	--text-secondary: #e0e0e0;
	--accent-success: #00ff41;
	--accent-error: #ff3333;
	--accent-warning: #ffcc00;
	--accent-info: #00ccff;
	--accent-primary: #ff6b35;
	--border-default: #404040;
}
```

### Toggle Mechanism

- Default to dark theme (no light theme needed)
- Respect `prefers-color-scheme` for future light theme option
- Store preference in localStorage

### Implementation Priority

1. **Critical**: Dashboard, login/signup, tournament management
2. **High**: Court score entry (most used on beach)
3. **Medium**: Player setup, standings pages

## Testing

### Visibility Tests

- Test in direct sunlight with brightness at 50%
- Verify all interactive elements are distinguishable
- Check contrast ratios meet WCAG AAA

### Device Testing

- Test on various mobile devices (iOS/Android)
- Verify touch targets remain accessible
- Check for color banding on OLED screens

## Migration Notes

- Current styles are in Svelte `<style>` blocks
- Will need to extract to CSS variables
- No breaking changes to component structure
- All changes are purely visual/styling
