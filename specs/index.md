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
