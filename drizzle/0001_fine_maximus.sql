ALTER TABLE "player" ADD COLUMN "seed_points" integer;--> statement-breakpoint
ALTER TABLE "player" ADD COLUMN "seed_rank" integer;--> statement-breakpoint
ALTER TABLE "tournament" ADD COLUMN "format_type" text DEFAULT 'random-seed' NOT NULL;--> statement-breakpoint
ALTER TABLE "tournament" ADD COLUMN "player_count" integer DEFAULT 16 NOT NULL;