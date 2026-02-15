# KoB Tracker

A mobile-first web application for managing King of the Beach beach volleyball tournaments with 4 courts and 16 players.

## What is KoB?

King of the Beach is a beach volleyball tournament format where:

- **16 players** compete across **4 courts** (4 players per court)
- Players rotate partners each round, ensuring everyone plays with everyone
- Individual performance determines promotion/relegation between courts
- Winner is determined by final court position, not total points

## Features

- **Tournament Management**: Create tournaments, add players, control rounds
- **Score Entry**: Mobile-optimized court pages via QR code access
- **Live Standings**: Real-time rankings with automatic tie-breakers
- **Promotion/Relegation**: Automated ladder system moves players between courts
- **Dark Theme**: High-contrast UI optimized for outdoor visibility

## Tech Stack

- **Framework**: [SvelteKit 2.x](https://kit.svelte.dev/) with [Svelte 5](https://svelte.dev/)
- **Language**: TypeScript (strict mode)
- **Database**: Neon PostgreSQL with [Drizzle ORM](https://orm.drizzle.team/)
- **Auth**: [Better Auth](https://www.better-auth.com/) with email/password
- **Testing**: Playwright (E2E)
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
bun run test            # Run Playwright E2E tests

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
│   │       └── auth.ts            # Better Auth config
│   ├── routes/
│   │   ├── +page.svelte          # Home/dashboard
│   │   ├── tournament/
│   │   │   ├── create/           # Create tournament
│   │   │   └── [id]/             # Tournament details
│   │   │       ├── +page.svelte
│   │   │       ├── standings/
│   │   │       └── players/
│   │   ├── court/
│   │   │   └── [token]/          # Court score entry (mobile)
│   │   ├── login/
│   │   └── signup/
│   ├── hooks.server.ts           # Auth session middleware
│   └── app.d.ts                  # App types
├── specs/                        # Detailed specifications
├── e2e/                          # Playwright tests
├── drizzle/                      # Migration files
└── static/                       # Static assets
```

## Documentation

Detailed specifications are in the [`specs/`](./specs/) directory:

- [`requirements.md`](./specs/requirements.md) - Core requirements and features
- [`arch.md`](./specs/arch.md) - Architecture and tech decisions
- [`database-schema.md`](./specs/database-schema.md) - Database design
- [`tournament-management.md`](./specs/tournament-management.md) - Tournament flow
- [`scoring-and-standings.md`](./specs/scoring-and-standings.md) - Scoring logic
- [`promotion-relegation.md`](./specs/promotion-relegation.md) - Ladder system
- [`dark-theme.md`](./specs/dark-theme.md) - UI/UX guidelines

## License

MIT
