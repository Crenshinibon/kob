import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { courtAccess, courtRotation, match, tournament, player } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const token = params.token;

	// Get court access
	const [access] = await db.select().from(courtAccess).where(eq(courtAccess.token, token));

	if (!access) throw error(404, 'Court not found');

	// Get rotation
	const [rotation] = await db
		.select()
		.from(courtRotation)
		.where(eq(courtRotation.id, access.courtRotationId));

	if (!rotation) throw error(404, 'Court rotation not found');

	// Get tournament
	const [tourney] = await db
		.select()
		.from(tournament)
		.where(eq(tournament.id, rotation.tournamentId));

	if (!tourney) throw error(404, 'Tournament not found');

	// Get matches
	const matches = await db
		.select()
		.from(match)
		.where(eq(match.courtRotationId, rotation.id))
		.orderBy(match.matchNumber);

	// Get player names
	const playerIds = [
		rotation.player1Id,
		rotation.player2Id,
		rotation.player3Id,
		rotation.player4Id
	];

	const players = await db
		.select()
		.from(player)
		.where(eq(player.tournamentId, rotation.tournamentId));

	const playerMap = new Map(players.map((p) => [p.id, p.name]));
	const playerNames: Record<number, string> = {};
	playerIds.forEach((id) => {
		playerNames[id] = playerMap.get(id) || 'Unknown';
	});

	// Calculate standings
	const standings = calculateStandings(matches, playerNames);

	return {
		court: {
			tournamentName: tourney.name,
			courtNumber: rotation.courtNumber,
			roundNumber: rotation.roundNumber,
			playerNames
		},
		matches,
		standings,
		isActive: access.isActive && tourney.status === 'active',
		isAuthenticated: !!locals.user
	};
};

import type { Actions } from './$types';

export const actions: Actions = {
	saveScore: async ({ request, params }) => {
		const token = params.token;
		const formData = await request.formData();
		const matchId = parseInt(formData.get('matchId')?.toString() || '0');
		const teamAScore = parseInt(formData.get('teamAScore')?.toString() || '0');
		const teamBScore = parseInt(formData.get('teamBScore')?.toString() || '0');

		// Validate scores
		if (teamAScore < 1 || teamAScore > 50 || teamBScore < 1 || teamBScore > 50) {
			return { error: 'Scores must be between 1 and 50' };
		}

		if (teamAScore === teamBScore) {
			return { error: 'Scores cannot be tied' };
		}

		const maxScore = Math.max(teamAScore, teamBScore);
		const minScore = Math.min(teamAScore, teamBScore);

		if (maxScore < 21) {
			return { error: 'Winner must have at least 21 points' };
		}

		if (maxScore - minScore < 2) {
			return { error: 'Winner must win by at least 2 points' };
		}

		// Verify match belongs to this court
		const [access] = await db.select().from(courtAccess).where(eq(courtAccess.token, token));

		if (!access || !access.isActive) {
			return { error: 'Court is not active' };
		}

		const [matchRecord] = await db.select().from(match).where(eq(match.id, matchId));

		if (!matchRecord || matchRecord.courtRotationId !== access.courtRotationId) {
			return { error: 'Invalid match' };
		}

		// Save score
		await db.update(match).set({ teamAScore, teamBScore }).where(eq(match.id, matchId));

		return { success: 'Score saved!' };
	}
};

function calculateStandings(matches: any[], playerNames: Record<number, string>) {
	const stats: Record<number, { id: number; points: number; for: number; against: number }> = {};

	// Get all player IDs from matches
	const allPlayerIds = new Set<number>();
	matches.forEach((m) => {
		allPlayerIds.add(m.teamAPlayer1Id);
		allPlayerIds.add(m.teamAPlayer2Id);
		allPlayerIds.add(m.teamBPlayer1Id);
		allPlayerIds.add(m.teamBPlayer2Id);
	});

	// Initialize stats
	allPlayerIds.forEach((id) => {
		stats[id] = { id, points: 0, for: 0, against: 0 };
	});

	// Calculate stats from completed matches
	matches.forEach((m) => {
		if (m.teamAScore === null) return;

		// Team A players
		stats[m.teamAPlayer1Id].points += m.teamAScore;
		stats[m.teamAPlayer1Id].for += m.teamAScore;
		stats[m.teamAPlayer1Id].against += m.teamBScore;

		stats[m.teamAPlayer2Id].points += m.teamAScore;
		stats[m.teamAPlayer2Id].for += m.teamAScore;
		stats[m.teamAPlayer2Id].against += m.teamBScore;

		// Team B players
		stats[m.teamBPlayer1Id].points += m.teamBScore;
		stats[m.teamBPlayer1Id].for += m.teamBScore;
		stats[m.teamBPlayer1Id].against += m.teamAScore;

		stats[m.teamBPlayer2Id].points += m.teamBScore;
		stats[m.teamBPlayer2Id].for += m.teamBScore;
		stats[m.teamBPlayer2Id].against += m.teamAScore;
	});

	// Convert to array and sort
	return Object.values(stats)
		.map((s) => ({
			...s,
			name: playerNames[s.id] || 'Unknown',
			diff: s.for - s.against
		}))
		.sort((a, b) => {
			if (b.points !== a.points) return b.points - a.points;
			if (b.diff !== a.diff) return b.diff - a.diff;
			return a.id - b.id;
		})
		.map((s, i) => ({ ...s, rank: i + 1 }));
}
