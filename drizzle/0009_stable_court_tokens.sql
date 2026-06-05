-- Create court table with stable tokens
CREATE TABLE IF NOT EXISTS "court" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"court_number" integer NOT NULL,
	"token" text NOT NULL UNIQUE,
	"is_active" boolean DEFAULT true
);

-- Add courtId FK to courtRotation
ALTER TABLE "court_rotation" ADD COLUMN "court_id" integer;

-- Migrate existing data: create court records from courtAccess
INSERT INTO "court" ("tournament_id", "court_number", "token", "is_active")
SELECT cr."tournament_id", cr."court_number", ca."token", ca."is_active"
FROM "court_access" ca
JOIN "court_rotation" cr ON ca."court_rotation_id" = cr."id";

-- Set courtId FK on existing courtRotation records
UPDATE "court_rotation" cr
SET "court_id" = c."id"
FROM "court_access" ca
JOIN "court" c ON c."token" = ca."token"
WHERE ca."court_rotation_id" = cr."id";

-- Make courtId NOT NULL after migration
ALTER TABLE "court_rotation" ALTER COLUMN "court_id" SET NOT NULL;

-- Drop old courtAccess table
DROP TABLE IF EXISTS "court_access";
