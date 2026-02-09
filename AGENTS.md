# Agent Instructions for KoB Tracker

This is a **King of the Beach (KoB) Tracker** - a mobile-first SvelteKit web application for managing beach volleyball tournaments with 4 courts and 16 players.

## Build/Lint/Test Commands

```bash
# Development
npm run dev              # Start dev server
npm run build           # Production build
npm run preview         # Preview production build

# Type checking
npm run check           # Run svelte-check once
npm run check:watch     # Run svelte-check in watch mode

# Testing (Playwright E2E)
npm run test            # Run all E2E tests
npm run test:e2e        # Same as above
npx playwright test e2e/demo.test.ts              # Run single test file
npx playwright test --grep "home page"            # Run tests matching pattern
npx playwright test --headed                      # Run with visible browser

# Linting & Formatting
npm run lint            # Check prettier + eslint
npm run format          # Auto-fix prettier formatting
npx eslint .            # Run eslint only
npx eslint src/lib/server/db/index.ts             # Lint single file
npx prettier --check src/routes                   # Check specific directory

# Database (Drizzle + Neon PostgreSQL)
npm run db:generate     # Generate migration files
npm run db:push         # Push schema changes to database
npm run db:migrate      # Run pending migrations
npm run db:studio       # Open Drizzle Studio GUI

# Auth
npm run auth:schema     # Regenerate Better Auth schema
```

## Tech Stack

- **Framework**: SvelteKit 2.x with Svelte 5 (runes mode)
- **Language**: TypeScript (strict mode enabled)
- **Database**: Neon PostgreSQL with Drizzle ORM
- **Auth**: Better Auth with email/password
- **Testing**: Playwright (E2E only)
- **Build**: Vite

## Code Style Guidelines

### Formatting (Prettier)

- **Use tabs** (not spaces)
- **Single quotes** for strings
- **No trailing commas**
- **Print width**: 100 characters
- Svelte files use the svelte parser

### TypeScript Conventions

- Strict mode enabled - all types must be explicit
- Use `type` over `interface` for object types (unless extending)
- Prefer explicit return types on exported functions
- Use `$types` imports for SvelteKit types: `import type { PageServerLoad } from './$types'`
- Path aliases: `$lib` for lib, `$app/*` for SvelteKit internals, `$env/*` for env vars

### Naming Conventions

- **Files**: kebab-case (e.g., `auth.schema.ts`, `page.server.ts`)
- **Components**: PascalCase Svelte files (e.g., `UserProfile.svelte`)
- **Variables/functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE for true constants
- **Database tables**: snake_case in schema definitions
- **Types/Interfaces**: PascalCase

### Import Order

1. Svelte/SvelteKit imports (`$app/*`, `$lib/*`)
2. Third-party libraries (better-auth, drizzle-orm)
3. Local modules with relative paths
4. Type-only imports last

### Svelte 5 Patterns

- Use `$props()` for component props
- Use `$state()` for reactive state
- Use `$derived()` for computed values
- Use `$effect()` for side effects (sparingly)
- Use `runes` mode (enabled by default in Svelte 5)

### Error Handling

- Always validate env vars at module level: `if (!env.DATABASE_URL) throw new Error('...')`
- Use SvelteKit's `error()` and `redirect()` helpers in load functions
- Prefer early returns over nested conditionals
- Database operations should handle null/undefined gracefully

### Database (Drizzle)

- Define tables in `src/lib/server/db/schema.ts`
- Use SQL-like Drizzle syntax (not the query API)
- Export schema from `src/lib/server/db/index.ts` with `drizzle(client, { schema })`
- Migrations handled via `drizzle-kit`

### CSS/Styling

- **NO CSS frameworks** (no Tailwind, shadcn/ui, etc.)
- Write vanilla CSS in Svelte `<style>` blocks
- Mobile-first approach (users access via smartphones on the beach)
- Keep styles scoped to components

### Server-Side Patterns

- Use `+page.server.ts` for server load functions and actions
- Use `hooks.server.ts` for middleware (auth session handling)
- Access auth via `event.locals.user` and `event.locals.session`
- Always use `svelteKitHandler` from better-auth for auth routes

## Project Context

### Domain Logic

- **4 courts**, **16 players** (fixed for MVP)
- Players rotate partners each round (A&B vs C&D, A&C vs B&D, A&D vs B&C)
- Ranking by: Total Points → Point Differential → Head-to-Head → Org decision
- Promotion/relegation between rounds

### Key Files

- `src/lib/server/db/schema.ts` - Database tables
- `src/lib/server/auth.ts` - Better Auth configuration
- `src/lib/server/db/index.ts` - Database client export
- `src/hooks.server.ts` - Auth session middleware
- `src/app.d.ts` - App-wide type declarations

## Svelte MCP Server

You have access to comprehensive Svelte 5 and SvelteKit documentation:

1. **list-sections** - Discover available documentation sections
2. **get-documentation** - Retrieve full docs for specific sections
3. **svelte-autofixer** - Analyze and fix Svelte code issues (MUST use before delivering Svelte code)
4. **playground-link** - Generate Svelte Playground links (ask user first, never for project files)

Always use `svelte-autofixer` on Svelte code before presenting it to the user.
