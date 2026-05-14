ALTER TABLE "tournament" ADD COLUMN "setup_time_minutes" integer DEFAULT 15 NOT NULL;--> statement-breakpoint
ALTER TABLE "tournament" ADD COLUMN "transition_time_minutes" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "tournament" ADD COLUMN "avg_rally_duration_seconds" integer DEFAULT 35 NOT NULL;--> statement-breakpoint
ALTER TABLE "tournament" ADD COLUMN "time_between_rallies_seconds" integer DEFAULT 8 NOT NULL;--> statement-breakpoint
ALTER TABLE "tournament" ADD COLUMN "time_between_matches_minutes" integer DEFAULT 3 NOT NULL;