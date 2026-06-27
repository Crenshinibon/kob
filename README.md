# KoB

A web application for managing "King of the Beach" beach volleyball tournaments with 8–64 players.

## What is KoB?

King of the Beach is a beach volleyball tournament format where:

- **8–64 players** compete across **2–16 courts** (4 players standard per court; 3/5/6 player courts for leftover counts)
- Players rotate partners each round, ensuring everyone plays with everyone
- Individual performance determines promotion/relegation between courts
- Winner is determined by final court position, not total points

## Features

- **Tournament Management**: Create tournaments, add players, control rounds
- **Flexible Player Counts**: 8–64 players with automatic court sizing. Standard courts have 4 players; one leftover court may hold 3, 5, or 6 players when the count is not a multiple of 4
- **Two Formats**:
  - **Random Seed**: Flexible rounds with ladder redistribution (2 up, 2 down)
  - **Preseed**: Fixed rounds with tiered binary redistribution based on seed points; frozen courts complete their bracket leaves early
- **Virtual & Physical Courts**: When virtual courts exceed physical courts, batch shift scheduling with wait time estimates
- **Configurable Scoring**: Single-set (21pts), best-of-3, or custom — with per-court-type overrides (e.g. 5p/6p courts default to 15pts). Deuce-aware score validation (win by 2 unless overridden)
- **Configurable Tie-Breaking**: Reorderable tie-break factors (round/total points & diff, seeding, dice, manual) stored per tournament
- **Round History Stepper**: Browse past rounds on the admin view with read-only scores
- **Score Entry**: Mobile-optimized court pages via QR code access; set-by-set scoring for best-of-3
- **Injury Handling**: Mid-round injury support — substitute or cancel & average remaining matches
- **Player Retirement**: Between-rounds retirement with 5-minute undo window; automatic court reshuffling with stable court tokens
- **Live Updates**: Client-side polling with in-place reactive updates (no page flash)
- **Live Standings**: Real-time court rankings with configurable tie-breakers
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
│   │   ├── components/                # Reusable Svelte components
│   │   │   ├── CookieNotice.svelte
│   │   │   ├── CourtQRCode.svelte
│   │   │   ├── LanguageSwitcher.svelte
│   │   │   └── TieBreakFactorIcons.svelte
│   │   ├── i18n/                      # Paraglide i18n config
│   │   ├── paraglide/                 # Generated message bundles (en/de/fr/es)
│   │   ├── court-colors.ts            # Court color gradients
│   │   ├── parse-players.ts           # Name/points parsing, CSV/tab paste handling
│   │   ├── tournament-logic.ts        # Shared scoring/redistribution helpers
│   │   └── server/
│   │       ├── db/
│   │       │   ├── schema.ts          # Database tables
│   │       │   ├── auth.schema.ts     # Better Auth schema
│   │       │   └── index.ts           # Database client
│   │       ├── auth.ts                # Better Auth config
│   │       └── tournament-logic.ts    # Pure functions for scoring/redistribution
│   ├── routes/
│   │   ├── +page.svelte               # Home/dashboard
│   │   ├── tournament/
│   │   │   ├── create/                # Create tournament (+page.svelte, create.remote.ts)
│   │   │   └── [id]/                  # Tournament details
│   │   │       ├── +page.svelte       # Round stepper, court cards, controls
│   │   │       ├── tournament-actions.remote.ts  # retirePlayer, reportInjury, closeRound…
│   │   │       ├── tournament-data.remote.ts     # live query + remote reads
│   │   │       └── standings/         # Total standings & podium
│   │   ├── court/
│   │   │   └── [token]/               # Court score entry (mobile, QR access)
│   │   ├── login/
│   │   └── signup/
│   ├── hooks.server.ts                # Auth session middleware
│   └── app.d.ts                       # App types
├── specs/                             # Detailed specifications
├── e2e/                               # Playwright E2E tests
├── drizzle/                           # Migration files
└── static/                            # Static assets (logo, global CSS)
```

## Documentation

Detailed specifications are in the [`specs/`](./specs/) directory. See [`specs/000_index.md`](./specs/000_index.md) for the full index. Highlights:

- [`010_requirements.md`](./specs/010_requirements.md) - Core requirements and features
- [`020_arch.md`](./specs/020_arch.md) - Architecture and tech decisions
- [`030_auth-and-users.md`](./specs/030_auth-and-users.md) - Auth model (admin login, anonymous court access)
- [`040_database-schema.md`](./specs/040_database-schema.md) - Database design
- [`050_tournament-management.md`](./specs/050_tournament-management.md) - Tournament flow
- [`060_court-operations.md`](./specs/060_court-operations.md) - Mobile score entry, 3p/4p/5p/6p courts
- [`070_scoring-and-standings.md`](./specs/070_scoring-and-standings.md) - Scoring logic and tie-breakers
- [`080_promotion-relegation.md`](./specs/080_promotion-relegation.md) - Redistribution system (Random + Preseed)
- [`087_preseed-frozen-courts.md`](./specs/087_preseed-frozen-courts.md) - Frozen courts in preseed brackets
- [`090_total-standings.md`](./specs/090_total-standings.md) - Cumulative standings & podium
- [`093_round-history-stepper.md`](./specs/093_round-history-stepper.md) - Round history stepper UI
- [`094_configurable-tie-breaking.md`](./specs/094_configurable-tie-breaking.md) - Configurable tie-break factors
- [`200_kob-32.md`](./specs/200_kob-32.md) - 32-player and Preseed format details
- [`600_incomplete-rosters-index.md`](./specs/600_incomplete-rosters-index.md) - 8–64 players, physical/virtual courts, leftover handling
- [`670_player-retirement.md`](./specs/670_player-retirement.md) - Retirement and mid-round injury handling
- [`100_dark-theme.md`](./specs/100_dark-theme.md) - UI/UX guidelines
- [`120_gotchas.md`](./specs/120_gotchas.md) - Dev lessons and common pitfalls

Completed and superseded specs are archived under [`specs/archive/`](./specs/archive/).

## License

MIT
