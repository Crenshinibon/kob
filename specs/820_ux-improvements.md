# 820 UX Improvements

## Match Format & Win By Inputs

- Change `<select>` dropdowns to radio buttons for "Match Format" and "Win By"
- Both only have two options, radio buttons are more visible and require fewer clicks
- See `840_critical-bugs.md` for details

## Player Count Validation

- When entering more than 64 names, show warning/error that only max 64 are supported
- At least one player must be removed to proceed
- Currently the system accepts >64 but may fail silently or behave unexpectedly

## Non-Standard Format Explanation

- Need explanation of how 3p/5p/6p formats work
- Users need to understand the rotation and scoring rules for non-standard courts

## Org Override for Non-Standard Court Scoring

- Org should be able to overwrite scoring mode for 3p, 5p, and 6p courts
- Relevant when these court types are active (or become active due to player retirements)
- Override options: points to win, win-by margin, sets to win
- UI should show which court types are active and allow per-type configuration
- See `840_critical-bugs.md` for details

## V1 Data Wipe Banner

- Show banner indicating this is v1 and data will be wiped
- Manage user expectations about data persistence
- Auto-cleanup jobs: delete closed tournaments older than 14 days, delete inactive tournaments older than 31 days

## Tournament Cleanup Script

- Need a way/script to wipe all tournaments from the database
- Useful for testing and maintenance
- Script exists: `scripts/wipe-tournaments.ts` (`npm run db:wipe`)

## Player Name Background Overflow (UI Glitch)

- When a court has player names that wrap to a second line, the dark background extends to fill two lines
- Courts with single-line player names don't have this issue
- Inconsistent visual appearance across court cards
- See `840_critical-bugs.md` for details

## Files Affected

- `src/routes/tournament/create/+page.svelte` - Radio buttons for Match Format/Win By, player count validation
- `src/routes/tournament/[id]/+page.svelte` - Format explanation, banner, UI glitch, org override settings
- `src/routes/court/[token]/+page.svelte` - Score entry with org override rules
- `scripts/wipe-tournaments.ts` - Database cleanup script
- New scheduled job file for auto-cleanup
