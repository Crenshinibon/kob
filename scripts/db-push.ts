/**
 * db:push prompts in CI when adding NOT NULL/UNIQUE columns to populated tables.
 * Run pending SQL migrations first (0012 backfills tokens for existing rows), then
 * push --force to sync schema without an interactive TTY.
 */
const migrate = Bun.spawnSync(['bunx', 'drizzle-kit', 'migrate'], {
	stdio: ['inherit', 'inherit', 'inherit'],
	env: process.env
});

if (migrate.exitCode !== 0) {
	process.exit(migrate.exitCode ?? 1);
}

const push = Bun.spawnSync(['bunx', 'drizzle-kit', 'push', '--force'], {
	stdio: ['inherit', 'inherit', 'inherit'],
	env: process.env
});

process.exit(push.exitCode ?? 1);
