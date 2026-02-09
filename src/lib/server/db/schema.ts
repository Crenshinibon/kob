import { pgTable, serial, integer, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const tournament = pgTable('tournament', {
	id: serial('id').primaryKey(),
	orgId: text('org_id').notNull(),
	name: text('name').notNull(),
	status: text('status').notNull().default('draft'),
	currentRound: integer('current_round').default(0),
	numRounds: integer('num_rounds').notNull().default(3),
	createdAt: timestamp('created_at').defaultNow()
});

export const player = pgTable('player', {
	id: serial('id').primaryKey(),
	tournamentId: integer('tournament_id').notNull(),
	name: text('name').notNull()
});

export const courtRotation = pgTable('court_rotation', {
	id: serial('id').primaryKey(),
	tournamentId: integer('tournament_id').notNull(),
	roundNumber: integer('round_number').notNull(),
	courtNumber: integer('court_number').notNull(),
	player1Id: integer('player_1_id').notNull(),
	player2Id: integer('player_2_id').notNull(),
	player3Id: integer('player_3_id').notNull(),
	player4Id: integer('player_4_id').notNull()
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

export const courtAccess = pgTable('court_access', {
	id: serial('id').primaryKey(),
	courtRotationId: integer('court_rotation_id').notNull(),
	token: text('token').notNull().unique(),
	isActive: boolean('is_active').default(true)
});

export * from './auth.schema';
