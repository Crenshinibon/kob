# Index

- **./requirements.md**: Complete functional requirements specification covering user roles, tournament setup, scoring rules, and promotion/relegation logic.

- **./arch.md**: High-level architectural overview of the technology stack including SvelteKit, Svelte 5, Neon PostgreSQL with Drizzle, Better Auth, and the no-CSS-framework approach.

- **./auth-and-users.md**: Authentication system and user management specification covering Org (authenticated) and Player (anonymous) roles, Better Auth integration, session management, protected routes, and security considerations.

- **./database-schema.md**: Complete database design with entity relationships, table specifications for tournaments, players, court rotations, matches, and access tokens using Drizzle ORM with PostgreSQL.

- **./tournament-management.md**: Tournament lifecycle management from creation through completion, including the multi-step setup wizard, player management, state transitions, and the Org dashboard interface.

- **./court-operations.md**: Court-level operations for both Org and Player interfaces, covering QR code generation, score entry, real-time updates, access tokens, and mobile-optimized player experience.

- **./scoring-and-standings.md**: Complete scoring system and standings calculation algorithm, including point allocation, tiebreaker logic, final tournament rankings, and statistics tracking.

- **./promotion-relegation.md**: Mathematical algorithm for moving players between rounds, including the seeding round logic, ladder system for subsequent rounds, and court reassignment implementation.
