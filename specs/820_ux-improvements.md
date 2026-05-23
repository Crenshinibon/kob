# 820 UX Improvements

## ~~Match Format & Win By Inputs~~ [FIXED]

- Changed `<select>` dropdowns to radio buttons for "Match Format" and "Win By"
- Both only have two options, radio buttons are more visible and require fewer clicks

## ~~Player Count Validation~~ [FIXED]

- When entering more than 64 names, warning/error shown that only max 64 are supported
- At least one player must be removed to proceed

## ~~Non-Standard Format Explanation~~ [FIXED]

- 3p courts show "Solo Rotation" format explanation
- 5p/6p courts show "Parallel Games" format explanation with run details
- Users can understand the rotation and scoring rules for non-standard courts

## ~~Org Override for Non-Standard Court Scoring~~ [FIXED]

- `scoringOverrides` JSONB column on tournament table for per-court-type scoring config
- UI on tournament page with collapsible per-court-type fieldsets (edit/save/cancel)
- `getEffectiveScoring()` merges base config with overrides
- All consumers use centralized scoring functions

## V1 Data Wipe Banner

- Show banner indicating this is v1 and data will be wiped
- Manage user expectations about data persistence
- Auto-cleanup jobs: delete closed tournaments older than 14 days, delete inactive tournaments older than 31 days

## ~~Tournament Cleanup Script~~ [FIXED]

- Script exists: `scripts/wipe-tournaments.ts` (`bun run db:wipe`)
- Auto-cleanup script: `scripts/cleanup-old-tournaments.ts` (`bun run db:cleanup`)
- Shared `scripts/db.ts` utility for database access outside SvelteKit

## ~~Player Name Background Overflow (UI Glitch)~~ [FIXED]

- Added `align-self: flex-start` to `.player` CSS class
- Courts with multi-line player names no longer extend dark background

## Files Affected

- `src/routes/tournament/create/+page.svelte` - Radio buttons for Match Format/Win By, player count validation, format explanations
- `src/routes/tournament/[id]/+page.svelte` - Format explanation, org override settings, retirement UI, injury reporting
- `src/routes/court/[token]/+page.svelte` - Score entry with org override rules, 3p/5p/6p format explanations
- `scripts/wipe-tournaments.ts` - Database wipe script
- `scripts/cleanup-old-tournaments.ts` - Auto-cleanup script
