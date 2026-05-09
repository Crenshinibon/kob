# Index

- **./requirements.md**: Core requirements: 4 courts (16 players) or 8 courts (32 players), partner rotation, promotion/relegation. Supports Random Seed and Preseed formats.

- **./arch.md**: Tech stack: SvelteKit, Svelte 5, Drizzle + Neon, Better Auth. No CSS frameworks.

- **./auth-and-users.md**: Simple auth: Admin login for management, anonymous access for players via court URLs.

- **./database-schema.md**: Schema: tournament, player, courtRotation, match, courtAccess tables. Tournament supports formatType and playerCount.

- **./tournament-management.md**: Flow: Create → Select format and player count → Add players → Start → Run rounds → Finish. Supports 16 and 32 players, Random Seed and Preseed formats.

- **./court-operations.md**: Mobile-optimized score entry. No real-time - refresh to update.

- **./scoring-and-standings.md**: Points = your score each match. Tiebreakers: points → differential → playerId (deterministic). Total standings page with podium and achievements.

- **./promotion-relegation.md**: Random Seed: Round 1 redistributes by rank (vertical seeding), Round 2+ uses ladder system (2 up, 2 down). Preseed: tiered binary redistribution.

- **./total-standings.md**: Cumulative standings across all rounds with podium view and achievement categories (Most Improved, Consistent Performer, Court Champion).

- **./gotchas.md**: Development lessons, common issues, and workarounds encountered during implementation and testing.

- **./dark-theme.md**: High-contrast dark theme optimized for outdoor visibility in bright sunlight. Color palettes, component styles, and accessibility guidelines.

- **./score-saving-ux.md**: Score saving UX - fixed Svelte 5 reactivity for immediate button feedback on mobile.

- **./testing-gaps.md**: Testing gaps, missing E2E tests, and pre-launch checklist.

- **./production-readiness-progress.md**: Progress log of critical fixes made for production readiness.

- **./kob-32.md**: 32-player Preseed format with points-based seeding and tiered redistribution. Supports both Random Seed and Preseed formats for 16 and 32 players.

- **./pluggable-formats.md**: [PLANNED EXTENSION] Extensible architecture for supporting multiple tournament formats. Not yet implemented.
