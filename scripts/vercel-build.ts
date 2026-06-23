/**
 * Vercel build entrypoint.
 * Preview builds skip db:push (same as main) so PR deploys stay green.
 * Production runs db:push before vite build to apply pending SQL + schema sync.
 */
import { spawnSync } from 'node:child_process';

function run(command: string, args: string[]): number {
	const result = spawnSync(command, args, {
		stdio: 'inherit',
		env: process.env
	});
	return result.status ?? 1;
}

if (process.env.VERCEL_ENV === 'production') {
	console.log('Production build — running db:push...');
	const dbCode = run('bun', ['scripts/db-push.ts']);
	if (dbCode !== 0) process.exit(dbCode);
} else {
	console.log(`Skipping db:push for VERCEL_ENV=${process.env.VERCEL_ENV ?? 'local'}`);
}

process.exit(run('bunx', ['vite', 'build']));
