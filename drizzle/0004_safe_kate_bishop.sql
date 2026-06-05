ALTER TABLE "player" ADD COLUMN "retired_at" timestamp;--> statement-breakpoint
ALTER TABLE "player" ADD COLUMN "retired_round" integer;--> statement-breakpoint
ALTER TABLE "player" ADD COLUMN "retirement_reason" text;--> statement-breakpoint
ALTER TABLE "player" ADD COLUMN "final_standing" integer;