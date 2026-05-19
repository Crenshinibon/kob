import { pgTable, serial, integer, text, timestamp, boolean } from 'drizzle-orm/pg-core';

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
	retirementReason: text('retirement_reason'),
	finalStanding: integer('final_standing')
});

export const courtRotation = pgTable('court_rotation', {
	id: serial('id').primaryKey(),
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
	teamAPlayer1Id: integer('team_a_player_1_id').notNull(),
	teamAPlayer2Id: integer('team_a_player_2_id').notNull(),
	teamBPlayer1Id: integer('team_b_player_1_id').notNull(),
	teamBPlayer2Id: integer('team_b_player_2_id').notNull(),
	teamAScore: integer('team_a_score'),
	teamBScore: integer('team_b_score')
});

export const match3Player = pgTable('match_3_player', {
	id: serial('id').primaryKey(),
	courtRotationId: integer('court_rotation_id').notNull(),
	matchNumber: integer('match_number').notNull(),
	teamOfTwoPlayer1Id: integer('team_of_two_player_1_id').notNull(),
	teamOfTwoPlayer2Id: integer('team_of_two_player_2_id').notNull(),
	soloPlayerId: integer('solo_player_id').notNull(),
	teamOfTwoScore: integer('team_of_two_score'),
	soloPlayerScore: integer('solo_player_score')
});

export const match5Player = pgTable('match_5_player', {
	id: serial('id').primaryKey(),
	courtRotationId: integer('court_rotation_id').notNull(),
	gameNumber: integer('game_number').notNull(),
	runNumber: integer('run_number').notNull(),
	sideXPlayer1Id: integer('side_x_player_1_id').notNull(),
	sideXPlayer2Id: integer('side_x_player_2_id').notNull(),
	sideYFixedPlayerId: integer('side_y_fixed_player_id').notNull(),
	sideYRotatingPlayerId: integer('side_y_rotating_player_id').notNull(),
	sideXScore: integer('side_x_score'),
	sideYScore: integer('side_y_score')
});

export const match6Player = pgTable('match_6_player', {
	id: serial('id').primaryKey(),
	courtRotationId: integer('court_rotation_id').notNull(),
	gameNumber: integer('game_number').notNull(),
	runNumber: integer('run_number').notNull(),
	fixedTeamPlayer1Id: integer('fixed_team_player_1_id').notNull(),
	fixedTeamPlayer2Id: integer('fixed_team_player_2_id').notNull(),
	rotatingTeamPlayer1Id: integer('rotating_team_player_1_id').notNull(),
	rotatingTeamPlayer2Id: integer('rotating_team_player_2_id').notNull(),
	fixedTeamScore: integer('fixed_team_score'),
	rotatingTeamScore: integer('rotating_team_score')
});

export const courtAccess = pgTable('court_access', {
	id: serial('id').primaryKey(),
	courtRotationId: integer('court_rotation_id').notNull(),
	token: text('token').notNull().unique(),
	isActive: boolean('is_active').default(true)
});

export * from './auth.schema';
