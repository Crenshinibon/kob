import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import postgres from 'postgres';

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const MIGRATIONS_TABLE = '__kob_sql_migrations';
const drizzleDir = join(import.meta.dir, '../drizzle');

/**
 * db:push prompts in CI when adding NOT NULL/UNIQUE columns to populated tables.
 * Apply idempotent drizzle/*.sql migrations first (backfills, etc.), then push --force
 * to sync schema without an interactive TTY.
 *
 * SQL files are discovered automatically (####_*.sql) and tracked in __kob_sql_migrations
 * so each file runs once. Existing production DBs (pre-journal) skip migrations that
 * were already applied via drizzle-kit migrate/push before tracking existed.
 */
const sql = postgres(url, { max: 1 });

async function listMigrationFiles(): Promise<string[]> {
	const entries = await readdir(drizzleDir);
	return entries.filter((f) => /^\d{4}_.*\.sql$/.test(f)).sort();
}

async function ensureMigrationsTable(): Promise<void> {
	await sql.unsafe(`
		CREATE TABLE IF NOT EXISTS "${MIGRATIONS_TABLE}" (
			filename text PRIMARY KEY,
			applied_at timestamptz DEFAULT now() NOT NULL
		)
	`);
}

async function getAppliedMigrations(): Promise<Set<string>> {
	const rows: { filename: string }[] = await sql.unsafe(
		`SELECT filename FROM "${MIGRATIONS_TABLE}"`
	);
	return new Set(rows.map((r) => r.filename));
}

async function markApplied(filename: string): Promise<void> {
	await sql.unsafe(
		`INSERT INTO "${MIGRATIONS_TABLE}" (filename) VALUES ($1) ON CONFLICT DO NOTHING`,
		[filename]
	);
}

async function isExistingDatabase(): Promise<boolean> {
	const rows = await sql`
		SELECT EXISTS (
			SELECT 1 FROM information_schema.tables
			WHERE table_schema = 'public' AND table_name = 'tournament'
		) AS exists
	`;
	return rows[0]?.exists === true;
}

/**
 * Production DBs that predated __kob_sql_migrations already have schema through
 * drizzle-kit migrate/push. Mark older SQL files as applied without re-running them.
 */
async function bootstrapLegacyMigrations(files: string[], applied: Set<string>): Promise<void> {
	if (applied.size > 0) return;
	if (!(await isExistingDatabase())) return;

	for (const file of files) {
		if (file.localeCompare('0013_preseed_retirement.sql') < 0) {
			await markApplied(file);
			console.log(`Bootstrap: marked ${file} as already applied`);
		}
	}
}

try {
	await ensureMigrationsTable();
	const files = await listMigrationFiles();
	let applied = await getAppliedMigrations();
	await bootstrapLegacyMigrations(files, applied);
	applied = await getAppliedMigrations();

	for (const file of files) {
		if (applied.has(file)) continue;
		const path = join(drizzleDir, file);
		console.log(`Applying ${file}...`);
		await sql.file(path);
		await markApplied(file);
	}
} finally {
	await sql.end();
}

const push = Bun.spawnSync(['bunx', 'drizzle-kit', 'push', '--force'], {
	stdio: ['inherit', 'inherit', 'inherit'],
	env: process.env
});

process.exit(push.exitCode ?? 1);
