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

- **[110_score-saving-ux.md](./110_score-saving-ux.md)**: Score saving UX - fixed Svelte 5 reactivity for immediate button feedback on mobile.

- **[120_gotchas.md](./120_gotchas.md)**: Development lessons, common issues, and workarounds encountered during implementation and testing.

- **[200_kob-32.md](./200_kob-32.md)**: 32-player Preseed format with points-based seeding and tiered redistribution. Supports both Random Seed and Preseed formats for 16 and 32 players.

- **[300_pluggable-formats.md](./300_pluggable-formats.md)**: [PLANNED EXTENSION] Extensible architecture for supporting multiple tournament formats. Not yet implemented.

- **[400_testing-gaps.md](./400_testing-gaps.md)**: Testing gaps, missing E2E tests, and pre-launch checklist.

- **[500_production-readiness-progress.md](./500_production-readiness-progress.md)**: Progress log of critical fixes made for production readiness.

- **[600_incomplete-rosters-index.md](./600_incomplete-rosters-index.md)**: Index for incomplete roster specs. Replaces original 600_incomplete-rosters.md. Supports 8-64 players, recursive preseed, physical/virtual courts.

  - **[610_incomplete-core.md](./610_incomplete-core.md)**: Problem statement, physical vs virtual courts, player count extension (8-64), vertical seeding, leftover configuration.
  - **[620_incomplete-options.md](./620_incomplete-options.md)**: Options A (recursive preseed), B (mixed courts), D (parallel games), E (generalized recursive split).
  - **[630_incomplete-implementation.md](./630_incomplete-implementation.md)**: Implementation phases, unit testing strategy, open questions.
  - **[640_incomplete-devplan.md](./640_incomplete-devplan.md)**: Development plan summary: 7 phases, effort estimates, risks.
  - **[650_game-rules-and-duration.md](./650_game-rules-and-duration.md)**: Scoring modes, special court rules, duration estimation with live forecast.
