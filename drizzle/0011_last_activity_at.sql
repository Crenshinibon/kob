ALTER TABLE "tournament" ADD COLUMN IF NOT EXISTS "last_activity_at" timestamp DEFAULT now();
UPDATE "tournament" SET "last_activity_at" = COALESCE("created_at", now()) WHERE "last_activity_at" IS NULL;
