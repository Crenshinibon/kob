# KoB

A web application for managing "King of the Beach" beach volleyball tournaments with 8–32 players.

## What is KoB?

King of the Beach is a beach volleyball tournament format where:

- **8–32 players** compete across **2–8 courts** (4 players each court)
- Players rotate partners each round, ensuring everyone plays with everyone
- Individual performance determines promotion/relegation between courts
- Winner is determined by final court position, not total points

## Features

- **Tournament Management**: Create tournaments, add players, control rounds
- **Flexible Player Counts**: 8–32 players with automatic court sizing, 4 players standard courts and possibly one court with 3, 5 or 6 players, to accommodate player number no a multiple of 4.
- **Two Formats**:
  - **Random Seed**: Flexible rounds with ladder redistribution
  - **Preseed**: Fixed rounds with tiered binary redistribution based on seed points
- **Virtual & Physical Courts**: When virtual courts exceed physical courts, batch shift scheduling with wait time estimates
- **Configurable Scoring**: Single-set (21pts), best-of-3, or custom — with per-round and per court-type overrides (e.g. 5p courts to 15pts)
- **Score Entry**: Mobile-optimized court pages via QR code access
- **Injury Handling**: Mid-round injury support — substitute or cancel remaining matches
- **Player Retirement**: Between-rounds retirement with 5-minute undo window; automatic court reshuffling
- **Live Updates**: Client-side polling with in-place reactive updates (no page flash)
- **Live Standings**: Real-time court rankings with automatic tie-breakers
- **Total Standings**: Cumulative rankings across all rounds with podium view and achievement categories
- **Promotion/Relegation**: Automated redistribution moves players between courts
- **Auto-Cleanup**: Vercel cronjob deletes completed tournaments after 14 days and stale tournaments after 31 days
- **Internationalization**: English, German, Spanish, French via Paraglide-js
- **Dark Theme**: High-contrast UI optimized for outdoor visibility

## Tech Stack

- **Framework**: [SvelteKit 2.x](https://kit.svelte.dev/) with [Svelte 5](https://svelte.dev/)
- **Language**: TypeScript (strict mode)
- **Database**: Neon PostgreSQL with [Drizzle ORM](https://orm.drizzle.team/)
- **Auth**: [Better Auth](https://www.better-auth.com/) with email/password
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Build**: Vite

## Development

### Prerequisites

- [Bun](https://bun.sh/) (package manager)
- PostgreSQL database (Neon recommended)

### Setup

```bash
# Install dependencies
bun install

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and other secrets

# Push database schema
bun run db:push

# Start development server
bun run dev
```

### Available Scripts

```bash
# Development
bun run dev              # Start dev server
bun run build           # Production build
bun run preview         # Preview production build

# Type checking
bun run check           # Run svelte-check
bun run check:watch     # Run svelte-check in watch mode

# Testing
bun run test            # Run all tests (unit + E2E)
bun run test:unit       # Run Vitest unit tests
bun run test:e2e        # Run Playwright E2E tests

# Linting & Formatting
bun run lint            # Check prettier + eslint
bun run format          # Auto-fix formatting

# Database
bun run db:generate     # Generate migration files
bun run db:push         # Push schema changes
bun run db:migrate      # Run pending migrations
bun run db:studio       # Open Drizzle Studio GUI

# Auth
bun run auth:schema     # Regenerate Better Auth schema
```

## Project Structure

```
├── src/
│   ├── lib/
│   │   └── server/
│   │       ├── db/
│   │       │   ├── schema.ts      # Database tables
│   │       │   └── index.ts       # Database client
│   │       ├── auth.ts            # Better Auth config
│   │       └── tournament-logic.ts # Pure functions for scoring/redistribution
│   ├── routes/
│   │   ├── +page.svelte          # Home/dashboard
│   │   ├── tournament/
│   │   │   ├── create/           # Create tournament
│   │   │   └── [id]/             # Tournament details
│   │   │       ├── +page.svelte
│   │   │       ├── players/      # Add/manage players
│   │   │       └── standings/    # Total standings & podium
│   │   ├── court/
│   │   │   └── [token]/          # Court score entry (mobile)
│   │   ├── login/
│   │   └── signup/
│   ├── hooks.server.ts           # Auth session middleware
│   └── app.d.ts                  # App types
├── specs/                        # Detailed specifications
├── e2e/                          # Playwright E2E tests
├── src/lib/server/               # Unit tests
├── drizzle/                      # Migration files
└── static/                       # Static assets (logo, global CSS)
```

## Documentation

Detailed specifications are in the [`specs/`](./specs/) directory:

- [`010_requirements.md`](./specs/010_requirements.md) - Core requirements and features
- [`020_arch.md`](./specs/020_arch.md) - Architecture and tech decisions
- [`040_database-schema.md`](./specs/040_database-schema.md) - Database design
- [`050_tournament-management.md`](./specs/050_tournament-management.md) - Tournament flow
- [`070_scoring-and-standings.md`](./specs/070_scoring-and-standings.md) - Scoring logic
- [`080_promotion-relegation.md`](./specs/080_promotion-relegation.md) - Redistribution system
- [`200_kob-32.md`](./specs/200_kob-32.md) - 32-player and Preseed format details
- [`100_dark-theme.md`](./specs/100_dark-theme.md) - UI/UX guidelines
- [`400_testing-gaps.md`](./specs/400_testing-gaps.md) - Testing status and checklist
- [`600_incomplete-rosters.md`](./specs/600_incomplete-rosters.md) - Handling non-standard player counts

## License

MIT
