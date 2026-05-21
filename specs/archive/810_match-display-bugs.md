# 810 Match Display Bugs

## Issues

### 3p Court
- Single player is shown twice in the matchups display
- In 3p solo rotation, there are 3 matches where one player sits out each match
- The display should show the 2 active players vs the 2 active players (with the solo player appearing only once per match they're in)

### 5p Court
- Unclear which matches "belong together" (parallel games executed simultaneously)
- Match up is duplicated in the top row
- Should group parallel matches visually

### 6p Court
- Unclear which matches "belong together" (parallel games)
- Bug: First team in first game should be same as first team in second match for parallel games to work
- Currently the team assignments don't support parallel play correctly

### Non-Standard Format Explanation
- Need explanation of how 3p/5p/6p formats work
- Users need to understand the rotation and scoring rules

## Files Affected
- `src/routes/court/[token]/+page.svelte` - Court page match display
- `src/lib/server/tournament-logic.ts` - Match generation for non-standard courts
- `src/lib/tournament-logic.ts` - Match generation logic
