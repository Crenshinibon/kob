import { join } from 'node:path';
import postgres from 'postgres';

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

/**
 * db:push prompts in CI when adding NOT NULL/UNIQUE columns to populated tables.
 * Apply idempotent drizzle/*.sql migrations first (backfills, etc.), then push --force
 * to sync schema without an interactive TTY.
 *
 * Uses SQL files directly instead of drizzle-kit migrate so deploy stays in sync with
 * db:push workflows where __drizzle_migrations may lag behind the live schema.
 */
const migrationFiles = [
	'0011_last_activity_at.sql',
	'0012_round_tokens.sql',
	'0013_preseed_retirement.sql'
];

const sql = postgres(url, { max: 1 });
try {
	for (const file of migrationFiles) {
		const path = join(import.meta.dir, '../drizzle', file);
		console.log(`Applying ${file}...`);
		await sql.file(path);
	}
} finally {
	await sql.end();
}

const push = Bun.spawnSync(['bunx', 'drizzle-kit', 'push', '--force'], {
	stdio: ['inherit', 'inherit', 'inherit'],
	env: process.env
});

process.exit(push.exitCode ?? 1);
