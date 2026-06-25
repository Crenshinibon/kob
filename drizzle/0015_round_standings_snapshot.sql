ALTER TABLE "court_rotation" ADD COLUMN "tie_break_config_snapshot" jsonb;
ALTER TABLE "court_rotation" ADD COLUMN "standings_snapshot" jsonb;
ALTER TABLE "court_rotation" ADD COLUMN "dice_rolls" jsonb;
ALTER TABLE "court_rotation" ADD COLUMN "round_closed_at" timestamp;
