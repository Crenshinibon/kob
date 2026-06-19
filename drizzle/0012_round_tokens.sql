-- court_rotation.token: round-specific QR link tokens (idempotent)
ALTER TABLE "court_rotation" ADD COLUMN IF NOT EXISTS "token" text;

-- Generate a unique 32-char hex token for every existing row (same length as randomBytes(16))
UPDATE "court_rotation"
SET "token" = md5('court_rotation:' || "id"::text)
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
