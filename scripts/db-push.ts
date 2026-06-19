import { join } from 'node:path';
import postgres from 'postgres';

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

/**
 * db:push prompts for confirmation in CI when adding NOT NULL/UNIQUE columns to
 * tables with existing rows (e.g. court_rotation.token). Apply idempotent SQL
 * migrations first, then push --force to sync remaining schema without a TTY.
 */
const sql = postgres(url, { max: 1 });

const migrationFiles = ['0011_last_activity_at.sql', '0012_round_tokens.sql'];

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
