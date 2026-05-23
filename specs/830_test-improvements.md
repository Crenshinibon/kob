# 830 Test Improvements

## ~~Auto Cleanup After Test Runs~~ [FIXED]

- `e2e/global-setup.ts` exists for test cleanup
- `e2e/db.ts` provides database connection for E2E tests
- Prevents database pollution from test data

## ~~E2E Test Configuration Issue~~ [FIXED]

- E2E tests were failing with: `Error: Cannot find package '$env'`
- Fixed by creating `e2e/db.ts` with proper database connection
- Created `e2e/global-setup.ts` for test cleanup

## ~~Old Tournament Cleanup Job~~ [FIXED]

- `scripts/cleanup-old-tournaments.ts` (`bun run db:cleanup`): deletes completed tournaments older than 14 days, deletes any tournament older than 31 days
- Manual cleanup script: `scripts/wipe-tournaments.ts` (`bun run db:wipe`)

## E2E Live Query Timing

- Two E2E tests fail because the live query polls every 3 seconds
- Tests wait for "Finalize Tournament" / "Close Round & Advance" button that doesn't exist in DOM until `canCloseRound` refreshes
- The disabled state renders as a completely different button ("⏳ Waiting for all scores...")
- Affected: `promotion.spec.ts:275`, `tournament.spec.ts:810`
- See `specs/860_e2e-live-query-timing.md` for fix options

## 5p/6p Court Redistribution Tests

- Need E2E tests for 5p and 6p court redistribution logic
- Unit tests exist in `tournament-logic.test.ts` (82 passing)
- E2E tests still needed

## ~~Non-Standard Court Standings Tests~~ [FIXED]

- Tests now enter points and verify players are ranked correctly
- 5p/6p average scoring tested in unit tests

## ~~Scoring Mode Tests~~ [FIXED]

- Integration tests verify scores must be entered as dictated by selected mode
- Best-of-3 per-set validation tested
- Single-set min points validation tested
- 5p min points validation tested

## Tournament Deletion Tests

- E2E test for deleting tournament from detail page
- Test verifies both successful deletion and cancellation
- Located in `e2e/tournament.spec.ts`

## E2E Test Files

| File | Coverage |
|------|----------|
| `e2e/demo.test.ts` | Basic home page check |
| `e2e/tournament.spec.ts` | Tournament creation, scoring, deletion |
| `e2e/standings.spec.ts` | Standings page functionality |
| `e2e/promotion.spec.ts` | Promotion/relegation logic |
| `e2e/format.spec.ts` | Court format (3p/5p/6p) tests |
| `e2e/global-setup.ts` | Test cleanup |
| `e2e/db.ts` | Database connection for E2E |

## Files Affected

- `e2e/global-setup.ts` - Test cleanup
- `e2e/db.ts` - Database connection
- `e2e/tournament.spec.ts` - Scoring mode tests, tournament deletion tests
- `e2e/promotion.spec.ts` - 5p/6p redistribution tests
- `e2e/standings.spec.ts` - Non-standard court standings with actual scores
- `e2e/format.spec.ts` - Court format tests
- `playwright.config.ts` - E2E configuration
