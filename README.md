# KoB

A mobile-first web application for managing "King of the Beach" beach volleyball tournaments with 8–64 players.

## What is KoB?

King of the Beach is a beach volleyball tournament format where:

- **8–64 players** compete across **2–16 courts** (4 players per standard court)
- Players rotate partners each round, ensuring everyone plays with everyone
- Individual performance determines promotion/relegation between courts
- Winner is determined by final court position, not total points

## Features

### Tournament Management

- **Create & run tournaments**: Add players, configure scoring, start rounds, close rounds, finalize
- **Flexible player counts**: 8–64 players with automatic court sizing; non-multiples of 4 use a bottom court of 3, 5, or 6 players
- **Two formats**:
  - **Random Seed**: Flexible rounds with vertical seeding (R1→R2) then ladder redistribution (2 up, 2 down)
  - **Preseed**: Fixed rounds with tiered binary redistribution based on seed points; supports frozen courts
- **WVV import**: Paste player lists or upload CSV from WVV tournament software
- **Physical court labels**: Name courts (e.g. "Court A") shown on court pages and QR codes

### Scoring & Standings

- **Configurable scoring**: Single-set (21pts), best-of-3, or custom — with per-court-type overrides (e.g. 5p courts to 15pts)
- **Score entry**: Mobile-optimized court pages via QR code; no login required for players
- **Live standings**: Real-time court rankings with 5s client-side polling (no page flash)
- **Configurable tie-breaking**: Reorderable factors — round points/diff, total points/diff, seeding, dice, manual — applied to court standings and redistribution
- **Tie-break visualization**: Factor icons on standings with outcome colors (gold/green/blue) showing who won, tied, or lost each break
- **Manual tie-break dialog**: Organizer reorders tied players per court in a save/cancel dialog before closing the round
- **Round-close snapshots**: Final standings, tie-break config, and dice rolls persisted per rotation for stable historical views
- **Total standings page**: Cumulative rankings, podium view, achievement categories, retired players section

### Round History

- **Round stepper**: Browse past rounds on the tournament admin page; court links and QR codes work for historical rounds
- **Read-only past rounds**: Score entry disabled on court pages when viewing a closed round

### Player Changes

- **Injury handling**: Mid-round injury — substitute or cancel remaining matches (averaged standings)
- **Player retirement**: Between-rounds retirement with 5-minute undo window; automatic court reshuffling
- **Preseed frozen courts**: Single-court brackets freeze after their round-robin completes

### Operations

- **Virtual & physical courts**: When virtual courts exceed physical courts, batch shift scheduling with wait time estimates
- **Promotion/relegation**: Automated redistribution moves players between courts
- **Auto-cleanup**: Vercel cronjob deletes completed tournaments after 14 days and stale tournaments after 31 days
- **Internationalization**: English, German, Spanish, French via Paraglide-js
- **Dark theme**: High-contrast UI optimized for outdoor visibility

## Tech Stack

- **Framework**: [SvelteKit 2.x](https://kit.svelte.dev/) with [Svelte 5](https://svelte.dev/) (runes mode)
- **Language**: TypeScript (strict mode)
- **Database**: Neon PostgreSQL with [Drizzle ORM](https://orm.drizzle.team/)
- **Auth**: [Better Auth](https://www.better-auth.com/) with email/password
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Build**: Vite
- **Runtime**: [Bun](https://bun.sh/) (package manager + script runner)

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
# Edit .env with your DATABASE_URL, BETTER_AUTH_SECRET, and ORIGIN

# Push database schema
bun run db:push

# Start development server
bun run dev
```

### Available Scripts

```bash
# Development
bun run dev              # Start dev server
bun run build            # Push schema + production build
bun run preview          # Preview production build

# Type checking
bun run check            # Run svelte-check
bun run check:watch      # Run svelte-check in watch mode

# Testing
bun run test             # Run all tests (unit + E2E)
bun run test:unit        # Run Vitest unit tests
bun run test:e2e         # Run Playwright E2E tests (requires DATABASE_URL)

# Linting & Formatting
bun run lint             # Check prettier + eslint
bun run format           # Auto-fix formatting

# Database
bun run db:generate      # Generate migration files
bun run db:push          # Push schema changes
bun run db:migrate       # Run pending migrations
bun run db:studio        # Open Drizzle Studio GUI

# Auth
bun run auth:schema      # Regenerate Better Auth schema
```

E2E tests use Playwright with a production preview server (`vite build && vite preview`). Set `DATABASE_URL` in `.env` before running `bun run test:e2e`.

## Project Structure

```
├── src/
│   ├── lib/
│   │   ├── tournament-logic.ts       # Pure functions: scoring, redistribution, tie-breaking
│   │   ├── court-colors.ts           # Court position and tie-break outcome colors
│   │   ├── parse-players.ts          # Player list parsing (paste, CSV)
│   │   ├── components/               # Shared Svelte components (QR, tie-break icons, i18n)
│   │   └── server/
│   │       ├── db/
│   │       │   ├── schema.ts         # Database tables
│   │       │   └── index.ts          # Database client
│   │       ├── auth.ts               # Better Auth config
│   │       ├── tournament-logic.ts   # Re-exports shared tournament logic
│   │       ├── court-standings-service.ts  # Standings resolution + round snapshots
│   │       └── tournament-logic.test.ts    # Unit tests
│   ├── routes/
│   │   ├── +page.svelte              # Home/dashboard
│   │   ├── tournament/
│   │   │   ├── create/               # Create tournament
│   │   │   └── [id]/                 # Tournament admin (stepper, tie-break, courts)
│   │   │       ├── standings/        # Total standings & podium
│   │   │       ├── tournament-data.remote.ts
│   │   │       └── tournament-actions.remote.ts
│   │   ├── court/
│   │   │   └── [token]/              # Court score entry (mobile)
│   │   ├── login/
│   │   └── signup/
│   ├── hooks.server.ts               # Auth session middleware
│   └── app.d.ts                      # App types
├── specs/                            # Detailed specifications
├── e2e/                              # Playwright E2E tests
├── drizzle/                          # Migration files
└── static/                           # Static assets (logo, global.css)
```

## Documentation

Detailed specifications are in the [`specs/`](./specs/) directory. Start with [`000_index.md`](./specs/000_index.md).

Key specs:

| Spec | Topic |
|------|-------|
| [`010_requirements.md`](./specs/010_requirements.md) | Core requirements and features |
| [`020_arch.md`](./specs/020_arch.md) | Architecture and tech decisions |
| [`040_database-schema.md`](./specs/040_database-schema.md) | Database design |
| [`050_tournament-management.md`](./specs/050_tournament-management.md) | Tournament flow |
| [`070_scoring-and-standings.md`](./specs/070_scoring-and-standings.md) | Scoring logic and tie-break display |
| [`080_promotion-relegation.md`](./specs/080_promotion-relegation.md) | Redistribution system |
| [`093_round-history-stepper.md`](./specs/093_round-history-stepper.md) | Round history navigation |
| [`094_configurable-tie-breaking.md`](./specs/094_configurable-tie-breaking.md) | Configurable tie-break factors |
| [`200_kob-32.md`](./specs/200_kob-32.md) | 32-player and Preseed format details |
| [`600_incomplete-rosters-index.md`](./specs/600_incomplete-rosters-index.md) | Non-standard player counts (3p/5p/6p) |
| [`660_virtual-court-scheduling.md`](./specs/660_virtual-court-scheduling.md) | Virtual vs physical courts |
| [`670_player-retirement.md`](./specs/670_player-retirement.md) | Retirement and injury handling |
| [`100_dark-theme.md`](./specs/100_dark-theme.md) | UI/UX guidelines |

## License

MIT
