ALTER TABLE "tournament" ADD COLUMN IF NOT EXISTS "preseed_retirement_policy" text NOT NULL DEFAULT 'cascade';

ALTER TABLE "player" ADD COLUMN IF NOT EXISTS "replaces_player_id" integer;
ALTER TABLE "player" ADD COLUMN IF NOT EXISTS "replaced_by_player_id" integer;
