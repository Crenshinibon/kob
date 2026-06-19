import crypto from 'node:crypto';
import postgres from 'postgres';

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

/** Same format as create.remote.ts / tournament-actions.remote.ts */
export function generateRoundToken(): string {
	return crypto.randomBytes(16).toString('hex');
}

/**
 * Ensure every court_rotation row has a unique round token.
 * Idempotent — only updates rows where token IS NULL or empty.
 */
export async function backfillCourtRotationTokens(): Promise<number> {
	const sql = postgres(url, { max: 1 });

	try {
		await sql`ALTER TABLE court_rotation ADD COLUMN IF NOT EXISTS token text`;

		const rows = await sql<{ id: number }[]>`
			SELECT id FROM court_rotation WHERE token IS NULL OR token = ''
		`;

		for (const { id } of rows) {
			const token = generateRoundToken();
			await sql`UPDATE court_rotation SET token = ${token} WHERE id = ${id}`;
		}

		if (rows.length > 0) {
			console.log(`Generated tokens for ${rows.length} court_rotation row(s)`);
		} else {
			console.log('All court_rotation rows already have tokens');
		}

		await sql`
			DO $$
			BEGIN
				ALTER TABLE court_rotation ALTER COLUMN token SET NOT NULL;
			EXCEPTION WHEN others THEN
				RAISE NOTICE 'token NOT NULL constraint: %', SQLERRM;
			END $$
		`;

		await sql`
			DO $$
			BEGIN
				IF NOT EXISTS (
					SELECT 1
					FROM pg_constraint c
					JOIN pg_class t ON t.oid = c.conrelid
					WHERE t.relname = 'court_rotation'
						AND c.contype = 'u'
						AND pg_get_constraintdef(c.oid) LIKE '%token%'
				) THEN
					ALTER TABLE court_rotation
						ADD CONSTRAINT court_rotation_token_unique UNIQUE (token);
				END IF;
			END $$
		`;

		return rows.length;
	} finally {
		await sql.end();
	}
}

if (import.meta.main) {
	const count = await backfillCourtRotationTokens();
	process.exit(count >= 0 ? 0 : 1);
}
