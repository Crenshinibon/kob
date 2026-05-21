# 850 Bun Migration

## Problem

The project uses `npx`, `tsx`, and `npm run` in package.json scripts despite running in a Bun environment (`"packageManager": "bun@1.3.9"`). This introduces unnecessary dependencies and tooling overhead.

## Current State

Scripts using non-Bun tooling:

| Script | Current | Issue |
|--------|---------|-------|
| `db:wipe` | `npx tsx scripts/wipe-tournaments.ts` | Uses `npx` + `tsx` (Bun runs TS natively) |
| `db:cleanup` | `npx tsx scripts/cleanup-old-tournaments.ts` | Uses `npx` + `tsx` (Bun runs TS natively) |
| `auth:schema` | `npx @better-auth/cli generate ...` | Uses `npx` instead of `bunx` |
| All scripts | invoked via `npm run` | Should use `bun run` |

Dependencies that could be removed:
- `dotenv` — Bun has built-in `.env` file loading
- `tsx` (not even a direct dependency, but pulled in via npx)

## Migration Plan

### Phase 1: Script Commands (Low Risk)

Replace `npx tsx` with `bun`:

```json
"db:wipe": "bun scripts/wipe-tournaments.ts",
"db:cleanup": "bun scripts/cleanup-old-tournaments.ts",
"auth:schema": "bunx @better-auth/cli generate --config src/lib/server/auth.ts --output src/lib/server/db/auth.schema.ts --yes"
```

### Phase 2: Remove `dotenv` Dependency

Bun automatically loads `.env` files. Scripts that currently use:

```ts
import 'dotenv/config';
const DATABASE_URL = process.env.DATABASE_URL!;
```

Can be simplified to:

```ts
const DATABASE_URL = process.env.DATABASE_URL!;
```

Then remove `dotenv` from `devDependencies`.

### Phase 3: Update AGENTS.md

Update all command references from `npm run` / `npx` to `bun run` / `bunx`.

### Phase 4: Verify

- All scripts work with `bun run`
- E2E tests still pass
- Database scripts still work
- No regressions in dev workflow

## Constraints

- Do NOT replace Vitest with Bun's test runner — Vitest is deeply integrated with the SvelteKit tooling and Playwright setup
- Do NOT replace Playwright — it's the standard for E2E testing
- Keep `drizzle-kit` commands as-is (they work fine via npm/bun scripts)
- The `dotenv` removal should be verified — some scripts run outside SvelteKit's vite context and may need explicit env loading

## Decision: Bun-First Policy

**Going forward, all new scripts and tooling should use Bun's built-in capabilities rather than introducing additional dependencies.** This includes:

- Running TypeScript files: `bun script.ts` (not `npx tsx`)
- Running CLI tools: `bunx tool` (not `npx tool`)
- Environment variables: Bun's built-in `.env` loading (not `dotenv` package)
- Package management: `bun add/remove/install` (not `npm`)
- Running scripts: `bun run script` (not `npm run script`)

Exceptions are allowed when:
- A tool explicitly requires Node.js runtime
- A tool has known incompatibilities with Bun
- The SvelteKit/Vite ecosystem requires npm-specific behavior
