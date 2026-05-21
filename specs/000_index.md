# Index

- **[010_requirements.md](./010_requirements.md)**: Core requirements: 4 courts (16 players) or 8 courts (32 players), partner rotation, promotion/relegation. Supports Random Seed and Preseed formats.

- **[020_arch.md](./020_arch.md)**: Tech stack: SvelteKit, Svelte 5, Drizzle + Neon, Better Auth. No CSS frameworks.

- **[030_auth-and-users.md](./030_auth-and-users.md)**: Simple auth: Admin login for management, anonymous access for players via court URLs.

- **[040_database-schema.md](./040_database-schema.md)**: Schema: tournament, player, courtRotation, match, courtAccess tables. Tournament supports formatType and playerCount.

- **[050_tournament-management.md](./050_tournament-management.md)**: Flow: Create → Select format and player count → Add players → Start → Run rounds → Finish. Supports 16 and 32 players, Random Seed and Preseed formats.

- **[060_court-operations.md](./060_court-operations.md)**: Mobile-optimized score entry. No real-time - refresh to update.

- **[070_scoring-and-standings.md](./070_scoring-and-standings.md)**: Points = your score each match. Tiebreakers: points → differential → playerId (deterministic). Total standings page with podium and achievements.

- **[080_promotion-relegation.md](./080_promotion-relegation.md)**: Random Seed: Round 1 redistributes by rank (vertical seeding), Round 2+ uses ladder system (2 up, 2 down). Preseed: tiered binary redistribution.

- **[090_total-standings.md](./090_total-standings.md)**: Cumulative standings across all rounds with podium view and achievement categories (Most Improved, Consistent Performer, Court Champion).

- **[100_dark-theme.md](./100_dark-theme.md)**: High-contrast dark theme optimized for outdoor visibility in bright sunlight. Color palettes, component styles, and accessibility guidelines.

- **[120_gotchas.md](./120_gotchas.md)**: Development lessons, common issues, and workarounds encountered during implementation and testing.

- **[200_kob-32.md](./200_kob-32.md)**: 32-player Preseed format with points-based seeding and tiered redistribution. Supports both Random Seed and Preseed formats for 16 and 32 players.

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
  - **[840_critical-bugs.md](./840_critical-bugs.md)**: Critical bugs: delete tournament, best-of-3 score entry, score validation, player removal, UI glitches, reactivity warnings, E2E config, auto-cleanup, radio button inputs
  - **[850_bun-migration.md](./850_bun-migration.md)**: Migrate package.json scripts from npx/tsx/npm to Bun-native tooling
  - **Archived**: [810](./archive/810_match-display-bugs.md), [811](./archive/811-closeRound-requested-error.md), [812](./archive/812-standings-ranking-bug.md), [813](./archive/813-qr-live-query-bugs.md), [814](./archive/814-fetch-errors.md)

- **[820_ux-improvements.md](./820_ux-improvements.md)**: UX improvements: radio button inputs, player count validation, format explanations, org override for non-standard courts, v1 banner

- **[830_test-improvements.md](./830_test-improvements.md)**: Test improvements: auto cleanup, E2E config fix, 5p/6p tests, scoring mode tests, tournament deletion tests

- **Archived specs** (completed, no longer active references):
  - **[110_score-saving-ux.md](./archive/110_score-saving-ux.md)**: Score saving UX fixes
  - **[400_testing-gaps.md](./archive/400_testing-gaps.md)**: Testing gaps and pre-launch checklist
  - **[500_production-readiness-progress.md](./archive/500_production-readiness-progress.md)**: Production readiness progress log
  - **[800_e2e-fixes-and-improvements.md](./archive/800_e2e-fixes-and-improvements.md)**: E2E test fixes and tournament creation simplification
