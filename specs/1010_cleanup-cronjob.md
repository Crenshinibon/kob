# Cleanup Cronjob

## Problem

`scripts/cleanup-old-tournaments.ts` exists but has **no Vercel cronjob** configured. No `vercel.json` with `crons` config, no API route to invoke it. Tournaments are never auto-deleted in production.

## Current State

- Script: `scripts/cleanup-old-tournaments.ts` — runnable manually via `bun scripts/cleanup-old-tournaments.ts`
- Logic: Two-phase deletion
  1. Completed tournaments (`status = 'completed'`) older than 14 days — by `createdAt`
  2. All remaining tournaments older than 31 days — catches stale active/started tournaments
- Deletion order: match → courtRotation → court → player → tournament (no FK constraints)
- **Bug**: Stale tournament detection uses `createdAt` only, not last activity. A tournament created 31 days ago but active yesterday would be deleted. Should use last match score time or last round close time instead.

## Plan

### 1. Add Vercel cronjob config

Create `vercel.json`:

```json
{
	"crons": [
		{
			"path": "/api/cron/cleanup",
			"schedule": "0 3 * * *"
		}
	]
}
```

### 2. Create API route

`src/routes/api/cron/cleanup/+server.ts`:

- GET handler
- Verify `Authorization: Bearer ${CRON_SECRET}` header (Vercel sends this automatically)
- Run same logic as `scripts/cleanup-old-tournaments.ts`
- Return JSON `{ deleted: number }`

### 3. Fix stale detection

Current: `lt(tournament.createdAt, inactiveCutoff)` — deletes by creation date only.

Better: Track last activity. Options:

- **A)** Add `lastActivityAt` timestamp column to tournament, updated on score save / round close
- **B)** Use `MAX(match.updatedAt)` subquery (but match has no `updatedAt` column)
- **C)** Use `createdAt` for tournaments with `currentRound = 0` (never started), and a new `lastRoundClosedAt` for started ones

Recommended: **Option A** — `lastActivityAt` column, updated in `saveScore`, `closeRound`, `startTournament`, `retirePlayer`, `reportInjury`. Simple, covers all cases.

### 4. Environment

- `CRON_SECRET` env var for auth
- `DATABASE_URL` already available on Vercel

## References

- `scripts/cleanup-old-tournaments.ts` — existing cleanup script
- `scripts/db.ts` — shared DB client for scripts
- `src/lib/server/db/schema.ts` — tournament table definition
