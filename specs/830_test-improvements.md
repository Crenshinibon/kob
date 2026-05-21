# 830 Test Improvements

## Auto Cleanup After Test Runs

- Add auto cleanup after test runs to remove test tournaments
- Prevents database pollution from test data
- `e2e/global-setup.ts` exists for test cleanup

## E2E Test Configuration Issue

- E2E tests fail with: `Error: Cannot find package '$env' imported from /home/dirk/Dev/kob/src/lib/server/db/index.ts`
- Tests were working previously
- Need to investigate and fix Playwright configuration
- See `840_critical-bugs.md` for details

## Old Tournament Cleanup Job

- Add job to delete tournaments that are closed and older than 14 days
- Add job to delete tournaments that are not updated for 31 days
- Manual cleanup script exists: `scripts/wipe-tournaments.ts`

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
- Tests in `tournament.spec.ts` need to go further and validate score entry rules

## Tournament Deletion Tests

- E2E test added for deleting tournament from detail page
- Test verifies both successful deletion and cancellation
- Located in `e2e/tournament.spec.ts` under 'Tournament Deletion' describe block

## Files Affected

- `e2e/global-setup.ts` - Test cleanup
- `e2e/tournament.spec.ts` - Scoring mode tests, tournament deletion tests
- `e2e/promotion.spec.ts` - 5p/6p redistribution tests
- `e2e/standings.spec.ts` - Non-standard court standings with actual scores
- `playwright.config.ts` - E2E configuration fix needed
- `scripts/wipe-tournaments.ts` - Manual cleanup utility
