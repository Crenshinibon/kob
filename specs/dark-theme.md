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
- **Secondary Background**: `#1a1a1a` (dark gray)
- **Card Background**: `#222222` (slightly lighter)
- **Input Background**: `#ffffff` (pure white) - **Critical for sunlight visibility**

### Text Colors

- **Primary Text**: `#ffffff` (pure white) - Contrast ratio: 21:1
- **Secondary Text**: `#e8e8e8` (light gray) - Contrast ratio: 17:1
- **Muted Text**: `#b0b0b0` (medium gray) - Contrast ratio: 10:1
- **Input Text**: `#000000` (pure black) - **On white inputs**

### Accent Colors (High Visibility)

- **Success/Green**: `#00ff41` (bright neon green)
- **Error/Red**: `#ff3333` (bright red)
- **Warning/Yellow**: `#ffcc00` (bright yellow)
- **Info/Blue**: `#00d9ff` (bright cyan)
- **Primary Action**: `#ff6b35` (bright orange)

### Borders & Highlights

- **Default Border**: `3px solid #808080` (prominent in sunlight)
- **Strong Border**: `3px solid #a0a0a0` (for cards and key elements)
- **Focus Border**: `4px solid #00d9ff` with glow effect
- **Success Border**: `3px solid #00ff41`
- **Error Border**: `3px solid #ff3333`

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
	background: #222222;
	border: 3px solid #a0a0a0; /* Prominent borders */
	border-radius: 8px;
}

.card-active {
	border-color: #00ff41;
	box-shadow: 0 0 15px rgba(0, 255, 65, 0.4);
}

.card-draft {
	border-color: #ffcc00;
}
```

### Inputs - Bright White Backgrounds for Sunlight

```css
input,
textarea {
	background: #ffffff; /* Pure white for maximum contrast */
	color: #000000; /* Black text for readability */
	border: 3px solid #808080; /* Prominent borders */
	caret-color: #ff6b35; /* Orange cursor for visibility */
	font-weight: 500;
	min-height: 48px; /* Larger touch targets */
}

input:focus {
	border-color: #00d9ff;
	box-shadow: 0 0 0 4px rgba(0, 217, 255, 0.4);
	transform: scale(1.02); /* Slight scale for focus indication */
	outline: none;
}

input::placeholder {
	color: #666666; /* Dark gray for visibility on white */
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
	--bg-secondary: #1a1a1a;
	--bg-card: #222222;
	--bg-input: #ffffff; /* Bright white for inputs */
	--text-primary: #ffffff;
	--text-secondary: #e8e8e8;
	--text-input: #000000; /* Black for input text */
	--accent-success: #00ff41;
	--accent-error: #ff3333;
	--accent-warning: #ffcc00;
	--accent-info: #00d9ff;
	--accent-primary: #ff6b35;
	--border-default: #808080;
	--border-strong: #a0a0a0;
	--border-thickness: 3px;
}
```

### File Location

CSS file located at `/static/global.css` and imported in `src/app.html`:

```html
<link rel="stylesheet" href="/global.css" />
```

**Note**: Global CSS is imported via `app.html` (static file) rather than in JavaScript/Svelte components. This ensures:

- Faster initial load (no JS import needed)
- CSS is loaded before any content renders
- Better caching behavior
- Consistent with SvelteKit static file conventions

### Logo

- **File**: `/static/logo.jpg` (original high-res version)
- **Optimized versions**:
  - `logo-100.jpg` (100px width, ~7KB)
  - `logo-200.jpg` (200px width, ~20KB) - used on landing page
  - `logo-400.jpg` (400px width, ~60KB)
- **Format**: Web-friendly JPG with srcset for responsive loading
- **Styling**: 60px width, border-radius, box-shadow for dark theme integration

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
