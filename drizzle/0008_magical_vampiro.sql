ALTER TABLE "match" ADD COLUMN "set_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "match" ADD COLUMN "is_canceled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "match" ADD COLUMN "injured_player_ids" jsonb;--> statement-breakpoint
ALTER TABLE "match_3_player" ADD COLUMN "set_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "match_3_player" ADD COLUMN "is_canceled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "match_5_player" ADD COLUMN "set_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "match_5_player" ADD COLUMN "is_canceled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "match_6_player" ADD COLUMN "set_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "match_6_player" ADD COLUMN "is_canceled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "player" ADD COLUMN "retired_court" integer;--> statement-breakpoint
ALTER TABLE "tournament" ADD COLUMN "scoring_overrides" jsonb;