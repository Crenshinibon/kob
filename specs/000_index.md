# Index

- **[010_requirements.md](./010_requirements.md)**: Core requirements: 4 courts (16 players) or 8 courts (32 players), partner rotation, promotion/relegation. Supports Random Seed and Preseed formats.

- **[020_arch.md](./020_arch.md)**: Tech stack: SvelteKit, Svelte 5, Drizzle + Neon, Better Auth. No CSS frameworks.

- **[030_auth-and-users.md](./030_auth-and-users.md)**: Simple auth: Admin login for management, anonymous access for players via court URLs.

- **[040_database-schema.md](./040_database-schema.md)**: Schema: tournament (with scoring/retirement/timing/court config), player (with retirement), court (stable tokens), courtRotation (variable size 3-6, linked to court), match (all court types, best-of-3, injury). Removed: match_3/5/6_player tables (dead schema, dropped via migration), courtAccess (replaced by `court` table).

- **[050_tournament-management.md](./050_tournament-management.md)**: Flow: Create (with players, scoring, court config) → Run rounds → Finish. No draft state — tournaments start immediately. Uses remote functions (all legacy server actions removed). Stable court tokens persist across rounds/retirements.

- **[060_court-operations.md](./060_court-operations.md)**: Mobile-optimized score entry. Supports 3p/4p/5p/6p courts. Best-of-3 set-by-set scoring. No live query on court page.

- **[070_scoring-and-standings.md](./070_scoring-and-standings.md)**: Points = your score each match. Tiebreakers: points → differential → playerId (deterministic). 5p/6p use average points per game. Canceled matches use averages. Scoring modes: single-21, best-of-3, custom. Per-court-type overrides.

- **[080_promotion-relegation.md](./080_promotion-relegation.md)**: Random Seed: Round 1 redistributes by rank (vertical seeding), Round 2+ uses ladder system (2 up, 2 down). Preseed: recursive tiered redistribution. All work for 8-64 players (2-16 courts). Non-standard bottom court for leftovers.
  - **[081_preseed-example-12p.md](./081_preseed-example-12p.md)**: 12 players (3 courts, 3 rounds) — bracket tree: 3→2W+1L→1F+1L(W)+1L. Shows origin mixing on first split, recursive halving on second.
  - **[082_preseed-example-16p.md](./082_preseed-example-16p.md)**: 16 players (4 courts, 3 rounds) — balanced bracket tree: 4→2W+2L→1F+1L(W)+1TL+1BL. Canonical preseed example.
  - **[083_preseed-example-20p.md](./083_preseed-example-20p.md)**: 20 players (5 courts, 4 rounds) — asymmetric bracket: 5→4W+1L→2WW+2LW+1L→1F+1L(WW)+1TL+1BL+1L. 3-level tree.

- **[090_total-standings.md](./090_total-standings.md)**: Cumulative standings across all rounds with podium view and achievement categories (Most Improved, Consistent Performer, Court Champion). Retirement section. [PARTIAL — no movement indicators, no PDF/CSV export] Sorted by court position (not total points), per spec 070.

- **[100_dark-theme.md](./100_dark-theme.md)**: High-contrast dark theme optimized for outdoor visibility in bright sunlight. Color palettes, component styles, and accessibility guidelines.

- **[120_gotchas.md](./120_gotchas.md)**: Development lessons, common issues, and workarounds encountered during implementation and testing.

- **[200_kob-32.md](./200_kob-32.md)**: 32-player (8-court) format specification. Points-based snake seeding, tiered redistribution, bracket visualization. Both Random Seed and Preseed for 16 and 32 players.

- **[300_pluggable-formats.md](./300_pluggable-formats.md)**: [PLANNED EXTENSION] Extensible architecture for supporting multiple tournament formats. Not yet implemented.

- **[980_standings-hydration-fix.md](./archive/980_standings-hydration-fix.md)**: [IMPLEMENTED] `ssr = false` on standings page. Client-only render avoids `query.live()` hydration mismatch. Shows all players even before any scores entered.
- **[990_retirement-5p-crash.md](./archive/990_retirement-5p-crash.md)**: [IMPLEMENTED] Fixed `distributeGroup` fallback for 5p origin overflow. Filtered retired players from preseed redistribution results.
- **[1000_minor-ui-fixes.md](./archive/1000_minor-ui-fixes.md)**: [IMPLEMENTED] Slider alignment, 5p/6p scoring defaults, average points rounding, save button first-click fix.

- **[1010_cleanup-cronjob.md](./archive/1010_cleanup-cronjob.md)**: [IMPLEMENTED] Vercel cronjob + API route + `lastActivityAt` column. Auto-deletes completed (14d) and stale (31d) tournaments.

- **[1020_live-query-timeout.md](./archive/1020_live-query-timeout.md)**: [IMPLEMENTED] Replaced `query.live()` with `query()` + client-side polling (5s). Removed infinite server loops causing Vercel 300s timeouts. N+1 query batching deferred.

- **[1030_player-input-parsing.md](./archive/1030_player-input-parsing.md)**: [IMPLEMENTED] Fix paste from spreadsheet (tab-separated name+points), add WVV CSV file upload, improve parsePlayerLine regex. Unit tests for all parsers.

- **[600_incomplete-rosters-index.md](./600_incomplete-rosters-index.md)**: [IN PROGRESS] Index for incomplete roster specs. Supports 8-64 players, recursive preseed, physical/virtual courts.
  - **[610_incomplete-core.md](./610_incomplete-core.md)**: Problem statement, physical vs virtual courts, player count extension (8-64), vertical seeding, leftover configuration.
  - **[620_incomplete-options.md](./620_incomplete-options.md)**: Options A (recursive preseed), B (mixed courts), D (parallel games), E (generalized recursive split).
  - **[630_incomplete-implementation.md](./630_incomplete-implementation.md)**: Implementation phases, unit testing strategy, open questions.
  - **[660_virtual-court-scheduling.md](./660_virtual-court-scheduling.md)**: Shift scheduling, wait time forecasting, rolling physical court reassignment.
  - **[670_player-retirement.md](./670_player-retirement.md)**: Player bailout handling, redistribution after retirement, final round elimination rule.

- **Archived specs** (completed or superseded, no longer active references):
  - **[084_preseed-example-20p-injury-retirement.md](./archive/084_preseed-example-20p-injury-retirement.md)**: [SUPERSEDED by 083 + 670] Used old flat-redistribution algorithm.
  - **[640_incomplete-devplan.md](./archive/640_incomplete-devplan.md)**: Development plan for incomplete rosters & extended player counts. All 11 phases complete. [ARCHIVED — historical reference]
  - **[110_score-saving-ux.md](./archive/110_score-saving-ux.md)**: Score saving UX fixes [COMPLETE]
  - **[400_testing-gaps.md](./archive/400_testing-gaps.md)**: Testing gaps and pre-launch checklist [COMPLETE]
  - **[500_production-readiness-progress.md](./archive/500_production-readiness-progress.md)**: Production readiness progress log [COMPLETE]
  - **[700_i18n-index.md](./archive/700_i18n-index.md)**: i18n spec index. en/de/fr/es via Paraglide-js. [COMPLETE]
  - **[710_i18n-core.md](./archive/710_i18n-core.md)**: Architecture, locale structure, URL strategy, language switcher. [COMPLETE]
  - **[720_i18n-content.md](./archive/720_i18n-content.md)**: Translation keys, pluralization, interpolation. [COMPLETE]
  - **[730_i18n-implementation.md](./archive/730_i18n-implementation.md)**: 7 implementation phases, file changes, testing. [COMPLETE]
  - **[800_bug-fixes-index.md](./archive/800_bug-fixes-index.md)**: Bug fixes index — all subspecs completed. [COMPLETE]
  - **[800_e2e-fixes-and-improvements.md](./archive/800_e2e-fixes-and-improvements.md)**: E2E test fixes and tournament creation simplification [COMPLETE]
  - **[810_match-display-bugs.md](./archive/810_match-display-bugs.md)**: 3p/5p/6p court matchup display bugs [COMPLETE]
  - **[811-closeRound-requested-error.md](./archive/811-closeRound-requested-error.md)**: closeRound errors with requested() outside context [COMPLETE]
  - **[812-standings-ranking-bug.md](./archive/812-standings-ranking-bug.md)**: Standings ranking by court position first, not points [COMPLETE]
  - **[813-qr-live-query-bugs.md](./archive/813-qr-live-query-bugs.md)**: QR codes not loading/updating, live query not working [COMPLETE]
  - **[814-fetch-errors.md](./archive/814-fetch-errors.md)**: Failed to fetch errors in browser console [COMPLETE]
  - **[820_ux-improvements.md](./archive/820_ux-improvements.md)**: UX improvements [ALL FIXED]
  - **[830_test-improvements.md](./archive/830_test-improvements.md)**: Test improvements: auto cleanup, E2E config, scoring mode tests [COMPLETE]
  - **[840_critical-bugs.md](./archive/840_critical-bugs.md)**: Critical bug fixes [ALL FIXED]
  - **[850_bun-migration.md](./archive/850_bun-migration.md)**: Migrate to Bun-native tooling [COMPLETE]
  - **[850_injury-e2e-fix.md](./archive/850_injury-e2e-fix.md)**: Fix injury E2E tests [COMPLETE]
  - **[860_e2e-live-query-timing.md](./archive/860_e2e-live-query-timing.md)**: E2E live query polling timing fixes [COMPLETE]
  - **[870_score-entry-validation.md](./archive/870_score-entry-validation.md)**: Score validation — blowout scores, deuce-aware enforcement [COMPLETE]
  - **[880_creation-page-ux.md](./archive/880_creation-page-ux.md)**: Creation page UX — win-by explainer, WVV import, slider, rounds, retirements [COMPLETE]
  - **[890_injury-retirement-improvements.md](./archive/890_injury-retirement-improvements.md)**: Undo retirement/injury, per-court injury disable, all-courts hint [COMPLETE]
  - **[900_logging-reduction.md](./archive/900_logging-reduction.md)**: Remove debug console.log, logging cleanup [COMPLETE]
  - **[910_final-standings-fix.md](./archive/910_final-standings-fix.md)**: Final round results saved, standings by court position, finalStanding for all players, numRounds synced [COMPLETE]
  - **[920_landing-ux-fixes.md](./archive/920_landing-ux-fixes.md)**: Language switcher on landing page, German translations, WVV label, format-specific help text [COMPLETE]
  - **[930_bestof3-round-completion.md](./archive/930_bestof3-round-completion.md)**: isMatchComplete logic, best-of-3 2-0 finishes complete correctly, E2E test [COMPLETE]
  - **[940_standings-court-grouping.md](./archive/940_standings-court-grouping.md)**: Court color gradient, left borders, large position numbers, courts grouped visually [COMPLETE]
  - **[950_preseed-bracket-ranking.md](./archive/950_preseed-bracket-ranking.md)**: Preseed bracket ranking analysis — court position already correct [INVESTIGATED — NO CHANGE]
  - **[960_physical-court-names.md](./archive/960_physical-court-names.md)**: Court label input on tournament page, displayed on court page [COMPLETE]
  - **[970_standings-live-update.md](./archive/970_standings-live-update.md)**: query.live() polling for standings page, auto-updates [COMPLETE]
  - **[980_standings-hydration-fix.md](./archive/980_standings-hydration-fix.md)**: `ssr = false` on standings page, hydration mismatch fix [COMPLETE]
  - **[990_retirement-5p-crash.md](./archive/990_retirement-5p-crash.md)**: 5p preseed retirement crash fix [COMPLETE]
  - **[1000_minor-ui-fixes.md](./archive/1000_minor-ui-fixes.md)**: Minor UI fixes — slider, scoring defaults, rounding, save button [COMPLETE]
  - **[1010_cleanup-cronjob.md](./archive/1010_cleanup-cronjob.md)**: Vercel cronjob + `lastActivityAt` + auto-cleanup [COMPLETE]
  - **[1020_live-query-timeout.md](./archive/1020_live-query-timeout.md)**: `query.live()` → `query()` + polling, Vercel timeout fix [COMPLETE]
  - **[1030_player-input-parsing.md](./archive/1030_player-input-parsing.md)**: Tab-aware paste, CSV upload, parsePlayerLine regex [COMPLETE]
