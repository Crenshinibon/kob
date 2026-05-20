# 820 UX Improvements

## Player Count Validation
- When entering more than 64 names, show warning/error that only max 64 are supported
- At least one player must be removed to proceed
- Currently the system accepts >64 but may fail silently or behave unexpectedly

## Non-Standard Format Explanation
- Need explanation of how 3p/5p/6p formats work
- Users need to understand the rotation and scoring rules for non-standard courts

## V1 Data Wipe Banner
- Show banner indicating this is v1 and data will be wiped
- Manage user expectations about data persistence

## Tournament Cleanup Script
- Need a way/script to wipe all tournaments from the database
- Useful for testing and maintenance

## Files Affected
- `src/routes/tournament/create/+page.svelte` - Player count validation
- `src/routes/tournament/[id]/+page.svelte` - Format explanation, banner
- Database cleanup script
