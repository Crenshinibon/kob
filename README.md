# KoB

A web application for managing "King of the Beach" beach volleyball tournaments with 4–64 players.

## What is KoB?

King of the Beach is a beach volleyball tournament format where:

- **4–64 players** compete across **1–16 courts** (4 players standard per court; 3/5/6 player courts for leftover counts; 4–6 players is one court and one round)
- Players rotate partners each round, ensuring everyone plays with everyone
- Individual performance determines promotion/relegation between courts
- Winner is determined by final court position, not total points

## Features

- **Public landing page**: Logged-out `/` explains the format (partner rotation, 2-up/2-down, Random Seed vs Preseed) and links to sign up or log in. Organizers see the dashboard after sign-in.
- **Create, then start**: Create saves a `setup` tournament (0–64 names). Start (≥ 4 players) builds round 1. There is no combined create-and-start.
- **Operations view** (`/tournament/[id]`): Round stepper, court cards with stable court QR codes, close round / finalize, reopen, physical-court schedule, and the manual tie-break dialog. While scores are missing, close round is a hint, not a disabled button.
- **Manage** (`/tournament/[id]/manage`): Back office — Players, Courts, Rules, Tournament.
  - Players: rename, seed order (setup or round 1 before scores only), add/remove in that same window, retire, injury, undo (5 minutes).
  - Courts: pointer long-press drag and a court select while the round has no scores.
  - Rules: per court size (3p/4p/5p/6p) scoring and the tie-break editor.
  - Tournament: name, rounds (1–10), physical courts, finish early, reopen, delete (with confirmation).
- **Optional check-in** (`/tournament/[id]/check-in`): Personal QR per player, print sheet, self check-in. Court QRs stay even when check-in is used.
- **Player page** (`/player/[token]`): Current game, write-once score entry, upcoming games, Currently / Best / Safe, wait clock, and history. The organizer corrects a saved score on the court page.
- **Flexible player counts**: 4–64 at start, automatic court sizing. Standard courts have 4 players; one leftover court may hold 3, 5, or 6.
- **Two formats**:
  - **Random Seed**: Flexible rounds (1–10) with ladder redistribution (2 up, 2 down)
  - **Preseed**: Fixed rounds with tiered binary redistribution based on seed points; frozen courts complete their bracket leaves early
- **Virtual & physical courts**: When virtual courts exceed physical courts, batch shift scheduling with wait time estimates
- **Configurable scoring**: Points per set (6–30), win by 1 or 2, one set or best of 3, per court size. Deuce-aware score validation.
- **Configurable tie-breaking**: Reorderable factors (round/total points and diff, seeding, dice, manual)
- **Round history stepper**: Browse past rounds on the operations view; those scores stay read-only until the round is reopened
- **Court score entry**: Mobile court pages via QR; set-by-set scoring for best of 3 (Set 3 appears only after a 1–1 split)
- **Injury and retirement**: Mid-round injury (substitute or cancel and average) and between-rounds retirement, both with a 5-minute undo. Stable court tokens survive rebuilds.
- **Live updates**: Client-side polling with in-place updates (no full-page flash)
- **Standings**: Court rankings during play; cumulative standings by final court position, with a podium
- **Auto-cleanup**: Completed tournaments after 14 days, inactive tournaments after 31 days
- **Internationalization**: English, German, Spanish, French
- **Dark theme**: High-contrast UI for outdoor use

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
│   │   ├── components/                # Landing page, scoring fields, QR, sliders, score entry
│   │   ├── paraglide/                 # Generated message bundles (en/de/fr/es)
│   │   ├── tournament-logic.ts        # Scoring, redistribution, tie-breaks
│   │   ├── player-page-logic.ts       # Player-page placement (Currently / Best / Safe)
│   │   ├── manage-logic.ts            # Roster lock, court moves, seed order
│   │   └── server/
│   │       ├── db/                    # Drizzle schema + client
│   │       ├── auth.ts                # Better Auth
│   │       ├── save-score.ts          # Shared court-token and player-token score writes
│   │       └── tournament-orchestration.ts
│   ├── routes/
│   │   ├── +page.svelte               # Landing page, or the organizer dashboard when signed in
│   │   ├── tournament/
│   │   │   ├── create/                # Create (setup only)
│   │   │   └── [id]/                  # Operations view
│   │   │       ├── manage/            # Players, courts, rules, tournament
│   │   │       ├── check-in/          # Optional personal QRs + print sheet
│   │   │       └── standings/         # Cumulative standings
│   │   ├── court/[token]/             # Court score entry (QR)
│   │   ├── player/[token]/            # Personal player page (QR)
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
- [`050_tournament-management.md`](./specs/050_tournament-management.md) - Create, start, operations view
- [`095_org-player-experience-index.md`](./specs/095_org-player-experience-index.md) - Manage, check-in, and player page
- [`060_court-operations.md`](./specs/060_court-operations.md) - Court score entry, 3p/4p/5p/6p courts
- [`070_scoring-and-standings.md`](./specs/070_scoring-and-standings.md) - Scoring logic and tie-breakers
- [`080_promotion-relegation.md`](./specs/080_promotion-relegation.md) - Redistribution system (Random + Preseed)
- [`087_preseed-frozen-courts.md`](./specs/087_preseed-frozen-courts.md) - Frozen courts in preseed brackets
- [`090_total-standings.md`](./specs/090_total-standings.md) - Cumulative standings & podium
- [`093_round-history-stepper.md`](./specs/093_round-history-stepper.md) - Round history stepper UI
- [`094_configurable-tie-breaking.md`](./specs/094_configurable-tie-breaking.md) - Configurable tie-break factors
- [`200_kob-32.md`](./specs/200_kob-32.md) - 32-player and Preseed format details
- [`600_incomplete-rosters-index.md`](./specs/600_incomplete-rosters-index.md) - Leftover 3/5/6 courts, physical/virtual courts (start at 4 players)
- [`670_player-retirement.md`](./specs/670_player-retirement.md) - Retirement and mid-round injury handling
- [`100_dark-theme.md`](./specs/100_dark-theme.md) - UI/UX guidelines
- [`120_gotchas.md`](./specs/120_gotchas.md) - Dev lessons and common pitfalls

Completed and superseded specs are archived under [`specs/archive/`](./specs/archive/).

## License

MIT
