import { pgTable, serial, integer, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';

export const tournament = pgTable('tournament', {
	id: serial('id').primaryKey(),
	orgId: text('org_id').notNull(),
	name: text('name').notNull(),
	status: text('status').notNull().default('draft'),
	currentRound: integer('current_round').default(0),
	numRounds: integer('num_rounds').notNull().default(3),
	formatType: text('format_type').notNull().default('random-seed'),
	scoringMode: text('scoring_mode').notNull().default('single-21'),
	pointsToWin: integer('points_to_win').notNull().default(21),
	winBy: integer('win_by').notNull().default(2),
	setsToWin: integer('sets_to_win').notNull().default(1),
	decidingSetPoints: integer('deciding_set_points').default(15),
	scoringOverrides:
		jsonb('scoring_overrides').$type<
			Record<
				string,
				{ pointsToWin?: number; winBy?: number; setsToWin?: number; decidingSetPoints?: number }
			>
		>(),
	schedulingMode: text('scheduling_mode').notNull().default('batch'),
	physicalCourtCount: integer('physical_court_count').notNull().default(4),
	playerCount: integer('player_count').notNull().default(16),
	courtSizes: text('court_sizes'),
	setupTimeMinutes: integer('setup_time_minutes').notNull().default(15),
	transitionTimeMinutes: integer('transition_time_minutes').notNull().default(10),
	avgRallyDurationSeconds: integer('avg_rally_duration_seconds').notNull().default(35),
	timeBetweenRalliesSeconds: integer('time_between_rallies_seconds').notNull().default(8),
	timeBetweenMatchesMinutes: integer('time_between_matches_minutes').notNull().default(3),
	createdAt: timestamp('created_at').defaultNow()
});

export const player = pgTable('player', {
	id: serial('id').primaryKey(),
	tournamentId: integer('tournament_id').notNull(),
	name: text('name').notNull(),
	seedPoints: integer('seed_points'),
	seedRank: integer('seed_rank'),
	retiredAt: timestamp('retired_at'),
	retiredRound: integer('retired_round'),
	retiredCourt: integer('retired_court'),
	retirementReason: text('retirement_reason'),
	finalStanding: integer('final_standing')
});

export const court = pgTable('court', {
	id: serial('id').primaryKey(),
	tournamentId: integer('tournament_id').notNull(),
	courtNumber: integer('court_number').notNull(),
	token: text('token').notNull().unique(),
	isActive: boolean('is_active').default(true)
});

export const courtRotation = pgTable('court_rotation', {
	id: serial('id').primaryKey(),
	courtId: integer('court_id').notNull(),
	tournamentId: integer('tournament_id').notNull(),
	roundNumber: integer('round_number').notNull(),
	courtNumber: integer('court_number').notNull(),
	courtSize: integer('court_size').notNull().default(4),
	player1Id: integer('player_1_id').notNull(),
	player2Id: integer('player_2_id').notNull(),
	player3Id: integer('player_3_id'),
	player4Id: integer('player_4_id'),
	player5Id: integer('player_5_id'),
	player6Id: integer('player_6_id')
});

export const match = pgTable('match', {
	id: serial('id').primaryKey(),
	courtRotationId: integer('court_rotation_id').notNull(),
	matchNumber: integer('match_number').notNull(),
	setNumber: integer('set_number').notNull().default(1),
	teamAPlayer1Id: integer('team_a_player_1_id').notNull(),
	teamAPlayer2Id: integer('team_a_player_2_id').notNull(),
	teamBPlayer1Id: integer('team_b_player_1_id').notNull(),
	teamBPlayer2Id: integer('team_b_player_2_id').notNull(),
	teamAScore: integer('team_a_score'),
	teamBScore: integer('team_b_score'),
	isCanceled: boolean('is_canceled').notNull().default(false),
	injuredPlayerIds: jsonb('injured_player_ids').$type<number[]>()
});

export * from './auth.schema';
