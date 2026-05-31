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

- **[090_total-standings.md](./090_total-standings.md)**: Cumulative standings across all rounds with podium view and achievement categories (Most Improved, Consistent Performer, Court Champion). Retirement section. [PARTIAL — no movement indicators, no PDF/CSV export]

- **[100_dark-theme.md](./100_dark-theme.md)**: High-contrast dark theme optimized for outdoor visibility in bright sunlight. Color palettes, component styles, and accessibility guidelines.

- **[120_gotchas.md](./120_gotchas.md)**: Development lessons, common issues, and workarounds encountered during implementation and testing.

- **[200_kob-32.md](./200_kob-32.md)**: 32-player (8-court) format specification. Points-based snake seeding, tiered redistribution, bracket visualization. Both Random Seed and Preseed for 16 and 32 players.

- **[300_pluggable-formats.md](./300_pluggable-formats.md)**: [PLANNED EXTENSION] Extensible architecture for supporting multiple tournament formats. Not yet implemented.

- **[600_incomplete-rosters-index.md](./600_incomplete-rosters-index.md)**: Index for incomplete roster specs. Replaces original 600_incomplete-rosters.md. Supports 8-64 players, recursive preseed, physical/virtual courts.
  - **[610_incomplete-core.md](./610_incomplete-core.md)**: Problem statement, physical vs virtual courts, player count extension (8-64), vertical seeding, leftover configuration.
  - **[620_incomplete-options.md](./620_incomplete-options.md)**: Options A (recursive preseed), B (mixed courts), D (parallel games), E (generalized recursive split).
  - **[630_incomplete-implementation.md](./630_incomplete-implementation.md)**: Implementation phases, unit testing strategy, open questions.
  - **[640_incomplete-devplan.md](./640_incomplete-devplan.md)**: Development plan summary: 7 phases, effort estimates, risks.
  - **[650_game-rules-and-duration.md](./650_game-rules-and-duration.md)**: Scoring modes, special court rules, duration estimation with live forecast.
  - **[660_virtual-court-scheduling.md](./660_virtual-court-scheduling.md)**: Shift scheduling, wait time forecasting, rolling physical court reassignment.
  - **[670_player-retirement.md](./670_player-retirement.md)**: Player bailout handling, redistribution after retirement, final round elimination rule.

- **[700_i18n-index.md](./700_i18n-index.md)**: Internationalization spec index. German, French, Spanish support via Paraglide.
  - **[710_i18n-core.md](./710_i18n-core.md)**: Architecture, Paraglide library, locale structure, URL strategy, language switcher.
  - **[720_i18n-content.md](./720_i18n-content.md)**: Translation keys (~150 keys), pluralization, interpolation, format names.
  - **[730_i18n-implementation.md](./730_i18n-implementation.md)**: 7 implementation phases, file changes, testing strategy.

- **[800_bug-fixes-index.md](./800_bug-fixes-index.md)**: Bug fixes from user testing and code review.
  - **[860_e2e-live-query-timing.md](./860_e2e-live-query-timing.md)**: E2E tests fail due to live query polling delay (3s). Two tests affected. Fix: increase timeout or reduce polling interval.

- **[830_test-improvements.md](./830_test-improvements.md)**: Test improvements: [ALL FIXED] auto cleanup, E2E config, scoring mode tests, non-standard standings tests, 5p/6p redistribution E2E tests.

- **Archived specs** (completed or superseded, no longer active references):
  - **[084_preseed-example-20p-injury-retirement.md](./archive/084_preseed-example-20p-injury-retirement.md)**: [SUPERSEDED by 083 + 670] Used old flat-redistribution algorithm. Retirement behavior documented in 670_player-retirement.md.
  - **[110_score-saving-ux.md](./archive/110_score-saving-ux.md)**: Score saving UX fixes [COMPLETE]
  - **[400_testing-gaps.md](./archive/400_testing-gaps.md)**: Testing gaps and pre-launch checklist [COMPLETE]
  - **[500_production-readiness-progress.md](./archive/500_production-readiness-progress.md)**: Production readiness progress log [COMPLETE]
  - **[800_e2e-fixes-and-improvements.md](./archive/800_e2e-fixes-and-improvements.md)**: E2E test fixes and tournament creation simplification [COMPLETE]
  - **[810_match-display-bugs.md](./archive/810_match-display-bugs.md)**: 3p/5p/6p court matchup display bugs [COMPLETE]
  - **[811-closeRound-requested-error.md](./archive/811-closeRound-requested-error.md)**: closeRound errors with requested() outside context [COMPLETE]
  - **[812-standings-ranking-bug.md](./archive/812-standings-ranking-bug.md)**: Standings ranking by court position first, not points [COMPLETE]
  - **[813-qr-live-query-bugs.md](./archive/813-qr-live-query-bugs.md)**: QR codes not loading/updating, live query not working [COMPLETE]
  - **[814-fetch-errors.md](./archive/814-fetch-errors.md)**: Failed to fetch errors in browser console [COMPLETE]
  - **[820_ux-improvements.md](./archive/820_ux-improvements.md)**: UX improvements: radio buttons, player count validation, format explanations, org override, cleanup scripts, UI glitch, v1 banner [ALL FIXED]
  - **[840_critical-bugs.md](./archive/840_critical-bugs.md)**: Critical bug fixes: radio buttons, org override, delete, best-of-3, score validation, UI glitch, reactivity, E2E config, auto-cleanup, winBy, dead tables, draft status, broken link, courtSize mismatch, $derived.by, stable court tokens, closed round double-counting, 5p/6p accessibility [ALL FIXED]. Remaining live query timing issue documented in 860_e2e-live-query-timing.md.
  - **[850_bun-migration.md](./archive/850_bun-migration.md)**: Migrate scripts from npx/tsx/npm to Bun-native tooling [COMPLETE]
  - **[850_injury-e2e-fix.md](./archive/850_injury-e2e-fix.md)**: Fix injury E2E tests (cancel & substitute) [COMPLETE]
