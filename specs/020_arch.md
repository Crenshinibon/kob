# Arch

## SvelteKit (Remote Functions)

Uses SvelteKit's experimental Remote Functions for data fetching and mutations. Three `.remote.ts` files:

- `tournament-data.remote.ts` — live query for tournament data
- `tournament-actions.remote.ts` — closeRound, deleteTournament, updateScoringOverrides
- `scores.remote.ts` — saveScore, saveSetScore

Some legacy server actions still exist (retirePlayer, reportInjury, create).

## Svelte5 (Runes Mode)

Uses `$state()`, `$derived()`, `$effect()`, `$props()`. Live queries wrapped in `$derived()` for reactivity.

## Neon / Drizzle

Postgres as a Service with Drizzle for migrations and ORM. Prefers the SQL-like Drizzle syntax. Multiple migrations for scoring, retirement, timing columns.

## BetterAuth

For authenticated access. Email/password only, no social providers.

## No CSS "helpers"

We are creating our UI by ourselves no tailwind or other utils or libraries (shadcn/ui, ...) for the UI.
