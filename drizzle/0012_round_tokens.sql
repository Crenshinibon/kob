-- Add round-specific tokens to court_rotation (idempotent; safe after db:push)
ALTER TABLE "court_rotation" ADD COLUMN IF NOT EXISTS "token" text;

UPDATE "court_rotation"
SET "token" = md5('court_rotation:' || "id"::text)
WHERE "token" IS NULL;

DO $$
BEGIN
	ALTER TABLE "court_rotation" ALTER COLUMN "token" SET NOT NULL;
EXCEPTION WHEN others THEN
	RAISE NOTICE 'token NOT NULL constraint: %', SQLERRM;
END $$;

-- db:push may already create a unique constraint under a different name
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
