# Index

- **./requirements.md**: Core requirements: 4 courts, 16 players, partner rotation, promotion/relegation.

- **./arch.md**: Tech stack: SvelteKit, Svelte 5, Drizzle + Neon, Better Auth. No CSS frameworks.

- **./auth-and-users.md**: Simple auth: Admin login for management, anonymous access for players via court URLs.

- **./database-schema.md**: Minimal schema: tournament, player, courtRotation, match, courtAccess tables.

- **./tournament-management.md**: Simple flow: Create → Add 16 players → Start → Run rounds → Finish.

- **./court-operations.md**: Mobile-optimized score entry. No real-time - refresh to update.

- **./scoring-and-standings.md**: Points = your score each match. Tiebreakers: points → differential → random.

- **./promotion-relegation.md**: Round 1 redistributes by rank. Round 2+ uses ladder system (2 up, 2 down).

- **./gotchas.md**: Development lessons, common issues, and workarounds encountered during implementation and testing.

- **./dark-theme.md**: High-contrast dark theme optimized for outdoor visibility in bright sunlight. Color palettes, component styles, and accessibility guidelines.

- **./total-standings.md**: Cumulative standings across all rounds for winner announcement and prize distribution. Includes podium view and achievement categories.

- **./pluggable-formats.md**: Extensible architecture for supporting multiple tournament formats (King of the Beach, King of the Court, Fixed Teams, etc.) with different player counts, court configurations, and promotion/relegation strategies.

- **./kob-32.md**: 32-player Preseed format with points-based seeding and tiered redistribution. Supports both Random Seed (existing ladder format) and Preseed (points-based) formats for 16 and 32 players.
