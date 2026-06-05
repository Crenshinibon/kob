ALTER TABLE "tournament" ADD COLUMN "deciding_set_points" integer DEFAULT 15;--> statement-breakpoint
ALTER TABLE "tournament" DROP COLUMN "points_to_win_set_2";