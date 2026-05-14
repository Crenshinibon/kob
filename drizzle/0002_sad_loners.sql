ALTER TABLE "tournament" ADD COLUMN "scoring_mode" text DEFAULT 'single-21' NOT NULL;--> statement-breakpoint
ALTER TABLE "tournament" ADD COLUMN "points_to_win" integer DEFAULT 21 NOT NULL;--> statement-breakpoint
ALTER TABLE "tournament" ADD COLUMN "win_by" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "tournament" ADD COLUMN "sets_to_win" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "tournament" ADD COLUMN "points_to_win_set_2" integer DEFAULT 15;