# 830 Test Improvements

## Auto Cleanup After Test Runs
- Add auto cleanup after test runs to remove test tournaments
- Prevents database pollution from test data

## Old Tournament Cleanup Job
- Add job to delete tournaments that are closed and older than 14 days
- Add job to delete tournaments that are not updated for 31 days

## 5p/6p Court Redistribution Tests
- Add E2E tests for 5p and 6p court redistribution logic
- Currently only 3p redistribution is tested

## Non-Standard Court Standings Tests
- Extend tests to actually enter points and verify players are ranked correctly
- Currently tests only check structure, not actual scoring/ranking

## Scoring Mode Tests
- Integration tests for scoring modes should verify scores must be entered as dictated by selected mode
- Best of 3 should require set-by-set score entry
- Current score entry doesn't reflect game mode

## Files Affected
- `e2e/promotion.spec.ts` - 5p/6p redistribution tests
- `e2e/standings.spec.ts` - Non-standard court standings with actual scores
- `e2e/tournament.spec.ts` - Scoring mode tests
- Test cleanup utilities
