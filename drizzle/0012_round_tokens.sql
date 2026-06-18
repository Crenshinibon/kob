-- Add round-specific tokens to court_rotation (idempotent)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE "court_rotation" ADD COLUMN IF NOT EXISTS "token" text;

-- Populate unique tokens for existing rows that don't have one
UPDATE "court_rotation" SET "token" = encode(gen_random_bytes(16), 'hex') WHERE "token" IS NULL;

-- Make token NOT NULL (safe no-op if already NOT NULL)
DO $$
BEGIN
    ALTER TABLE "court_rotation" ALTER COLUMN "token" SET NOT NULL;
EXCEPTION WHEN others THEN
    RAISE NOTICE 'token NOT NULL constraint: %', SQLERRM;
END $$;

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'court_rotation_token_unique'
    ) THEN
        ALTER TABLE "court_rotation" ADD CONSTRAINT "court_rotation_token_unique" UNIQUE ("token");
    END IF;
END $$;