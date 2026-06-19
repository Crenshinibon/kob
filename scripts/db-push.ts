import { backfillCourtRotationTokens } from './backfill-court-rotation-tokens';
import { join } from 'node:path';
import postgres from 'postgres';

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

/**
 * db:push prompts for confirmation in CI when adding NOT NULL/UNIQUE columns to
 * tables with existing rows (e.g. court_rotation.token). Backfill tokens for old
 * rows first, apply other idempotent SQL, then push --force without a TTY.
 */
await backfillCourtRotationTokens();

const sql = postgres(url, { max: 1 });
try {
	const path = join(import.meta.dir, '../drizzle/0011_last_activity_at.sql');
	console.log('Applying 0011_last_activity_at.sql...');
	await sql.file(path);
} finally {
	await sql.end();
}

const push = Bun.spawnSync(['bunx', 'drizzle-kit', 'push', '--force'], {
	stdio: ['inherit', 'inherit', 'inherit'],
	env: process.env
});

process.exit(push.exitCode ?? 1);
