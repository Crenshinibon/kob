CREATE TABLE "match_3_player" (
	"id" serial PRIMARY KEY NOT NULL,
	"court_rotation_id" integer NOT NULL,
	"match_number" integer NOT NULL,
	"team_of_two_player_1_id" integer NOT NULL,
	"team_of_two_player_2_id" integer NOT NULL,
	"solo_player_id" integer NOT NULL,
	"team_of_two_score" integer,
	"solo_player_score" integer
);
--> statement-breakpoint
CREATE TABLE "match_5_player" (
	"id" serial PRIMARY KEY NOT NULL,
	"court_rotation_id" integer NOT NULL,
	"game_number" integer NOT NULL,
	"run_number" integer NOT NULL,
	"side_x_player_1_id" integer NOT NULL,
	"side_x_player_2_id" integer NOT NULL,
	"side_y_fixed_player_id" integer NOT NULL,
	"side_y_rotating_player_id" integer NOT NULL,
	"side_x_score" integer,
	"side_y_score" integer
);
--> statement-breakpoint
CREATE TABLE "match_6_player" (
	"id" serial PRIMARY KEY NOT NULL,
	"court_rotation_id" integer NOT NULL,
	"game_number" integer NOT NULL,
	"run_number" integer NOT NULL,
	"fixed_team_player_1_id" integer NOT NULL,
	"fixed_team_player_2_id" integer NOT NULL,
	"rotating_team_player_1_id" integer NOT NULL,
	"rotating_team_player_2_id" integer NOT NULL,
	"fixed_team_score" integer,
	"rotating_team_score" integer
);
--> statement-breakpoint
ALTER TABLE "court_rotation" ADD COLUMN "court_size" integer DEFAULT 4 NOT NULL;