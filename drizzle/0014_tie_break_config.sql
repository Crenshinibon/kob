ALTER TABLE "tournament" ADD COLUMN IF NOT EXISTS "tie_break_config" jsonb;
ALTER TABLE "court_rotation" ADD COLUMN IF NOT EXISTS "manual_rank_order" jsonb;
