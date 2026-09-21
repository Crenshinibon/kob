-- Organizer back office + player page + setup/start + optional check-in (095–099)
-- Idempotent: safe to re-run from db:push.

ALTER TABLE "tournament" ALTER COLUMN "status" SET DEFAULT 'setup';
ALTER TABLE "tournament" ADD COLUMN IF NOT EXISTS "started_at" timestamp;
ALTER TABLE "tournament" ADD COLUMN IF NOT EXISTS "check_in_closed_at" timestamp;
ALTER TABLE "tournament" ADD COLUMN IF NOT EXISTS "completed_at" timestamp;
ALTER TABLE "tournament" ADD COLUMN IF NOT EXISTS "finished_early" boolean NOT NULL DEFAULT false;

ALTER TABLE "player" ADD COLUMN IF NOT EXISTS "token" text;
ALTER TABLE "player" ADD COLUMN IF NOT EXISTS "checked_in_at" timestamp;
ALTER TABLE "player" ADD COLUMN IF NOT EXISTS "check_in_source" text;
ALTER TABLE "player" ADD COLUMN IF NOT EXISTS "joined_round" integer;

UPDATE "player"
SET "token" = md5(random()::text || id::text || clock_timestamp()::text)
WHERE "token" IS NULL OR "token" = '';

DO $$
BEGIN
	ALTER TABLE "player" ALTER COLUMN "token" SET NOT NULL;
EXCEPTION WHEN others THEN
	RAISE NOTICE 'player.token NOT NULL constraint: %', SQLERRM;
END $$;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint c
		JOIN pg_class t ON t.oid = c.conrelid
		WHERE t.relname = 'player'
			AND c.contype = 'u'
			AND pg_get_constraintdef(c.oid) LIKE '%token%'
	) THEN
		ALTER TABLE "player" ADD CONSTRAINT "player_token_unique" UNIQUE ("token");
	END IF;
END $$;

ALTER TABLE "court_rotation" ADD COLUMN IF NOT EXISTS "manual_adjusted_at" timestamp;
