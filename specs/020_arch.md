# Arch

## SvelteKit (Remote Functions)

Uses SvelteKit's experimental Remote Functions for data fetching and mutations. Scoring and tournament commands live in `.remote.ts` files, including:

- `tournament-data.remote.ts` — tournament operations view
- `tournament-actions.remote.ts` — close round, retire, injury, and related commands
- `create.remote.ts` — tournament creation
- `court/[token]/scores.remote.ts` — court-token score entry and edits
- `player/[token]/player-data.remote.ts` — the personal tournament page and write-once score saves
- `manage/*.remote.ts` and `check-in/*.remote.ts` — back office and optional check-in

## Player pages and court pages

Two public scoring surfaces, no player accounts:

- `/court/[token]` is one stable QR per court. Anyone with it can enter and correct scores on that court.
- `/player/[token]` is one personal tournament page per player for the whole event: current game, upcoming games, write-once score entry, placement (current / best / safe), wait clock, and history. Check-in can hand these links out; it is optional. A saved score is corrected on the court page.

## Svelte5 (Runes Mode)

Uses `$state()`, `$derived()`, `$effect()`, `$props()`. Live queries wrapped in `$derived()` for reactivity.

## Neon / Drizzle

Postgres as a Service with Drizzle for migrations and ORM. Prefers the SQL-like Drizzle syntax. Multiple migrations for scoring, retirement, timing columns.

## BetterAuth

For authenticated access. Email/password only, no social providers.

## No CSS "helpers"

We are creating our UI by ourselves no tailwind or other utils or libraries (shadcn/ui, ...) for the UI.
