# Cleanup Cronjob

## Problem

`scripts/cleanup-old-tournaments.ts` exists but has **no Vercel cronjob** configured. No `vercel.json` with `crons` config, no API route to invoke it. Tournaments are never auto-deleted in production.

## Fix (IMPLEMENTED)

- Added `vercel.json` with cron config (`0 3 * * *` → `/api/cron/cleanup`)
- Created `src/routes/api/cron/cleanup/+server.ts` — verifies `CRON_SECRET`, runs two-phase cleanup
- Added `lastActivityAt` column to tournament schema (migration `0011_last_activity_at.sql`)
- All tournament mutation points now set `lastActivityAt: new Date()`
- Stale detection uses `lastActivityAt` instead of `createdAt`
- Updated `scripts/cleanup-old-tournaments.ts` to use `lastActivityAt`

### Mutation points updated
- `create.remote.ts` — insert gets `defaultNow()` via schema
- `scores.remote.ts` — `saveScore`, `saveSetScore`
- `tournament-actions.remote.ts` — `closeRoundForm` (3 updates), `updateScoringOverrides`, `retirePlayer`, `reportInjury`, `undoRetirement`, `undoInjury`

### To deploy
- Run `bun run db:push` to apply migration
- Set `CRON_SECRET` env var on Vercel
