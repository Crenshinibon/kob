-- Add round-specific tokens to court_rotation (idempotent; safe after db:push)
ALTER TABLE "court_rotation" ADD COLUMN IF NOT EXISTS "token" text;

-- Backfill: 32-char hex tokens (same length as crypto.randomBytes(16).toString('hex'))
UPDATE "court_rotation"
SET "token" = substr(md5(random()::text || "id"::text || clock_timestamp()::text), 1, 32)
WHERE "token" IS NULL OR "token" = '';

DO $$
BEGIN
	ALTER TABLE "court_rotation" ALTER COLUMN "token" SET NOT NULL;
EXCEPTION WHEN others THEN
	RAISE NOTICE 'token NOT NULL constraint: %', SQLERRM;
END $$;

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
		ALTER TABLE "court_rotation" ADD CONSTRAINT "court_rotation_token_unique" UNIQUE ("token");
	END IF;
END $$;
