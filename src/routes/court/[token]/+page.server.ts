import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { courtAccess, courtRotation, match, tournament, player } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

import type { PageServerLoad } from './$types';
import type { MatchData } from '$lib/server/tournament-logic';

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

	// Get player names for all player slots (including player5/6 for non-standard courts)
	const playerIds: number[] = [
		rotation.player1Id,
		rotation.player2Id,
		...(rotation.player3Id ? [rotation.player3Id] : []),
		...(rotation.player4Id ? [rotation.player4Id] : []),
		...(rotation.player5Id ? [rotation.player5Id] : []),
		...(rotation.player6Id ? [rotation.player6Id] : [])
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

	const courtSize = (tourney as any).courtSizes
		? ((JSON.parse((tourney as any).courtSizes) as number[])[rotation.courtNumber - 1] ??
			playerIds.length)
		: playerIds.length;

	const scoringMode = tourney.scoringMode ?? 'single-21';
	const pointsToWin = tourney.pointsToWin ?? 21;
	const decidingSetPoints = tourney.decidingSetPoints ?? 15;

	let scoreCap: number;
	if (scoringMode === 'best-of-3-15') {
		scoreCap = Math.min(pointsToWin, decidingSetPoints);
	} else if (courtSize >= 5) {
		scoreCap = pointsToWin === 21 ? 15 : pointsToWin;
	} else {
		scoreCap = pointsToWin;
	}

	const scoringLabel =
		scoringMode === 'best-of-3-15'
			? `Best of ${tourney.setsToWin ?? 1} (reg: ${pointsToWin}pt, deciding: ${decidingSetPoints}pt)`
			: `1 set to ${scoreCap}`;

	return {
		court: {
			tournamentName: tourney.name,
			courtNumber: rotation.courtNumber,
			roundNumber: rotation.roundNumber,
			courtSize,
			playerNames,
			scoreCap,
			scoringLabel
		},
		matches,
		standings,
		isActive: access.isActive && tourney.status === 'active',
		isAuthenticated: !!locals.user
	};
};

export const actions: Actions = {
	saveScore: async (event) => {
		const token = event.params.token;
		const formData = await event.request.formData();
		const matchId = parseInt(formData.get('matchId')?.toString() || '0');
		const teamAScore = parseInt(formData.get('teamAScore')?.toString() || '0');
		const teamBScore = parseInt(formData.get('teamBScore')?.toString() || '0');

		// Basic sanity checks
		if (teamAScore < 0 || teamAScore > 50 || teamBScore < 0 || teamBScore > 50) {
			return { error: 'Scores must be between 0 and 50' };
		}

		if (teamAScore === teamBScore) {
			return { error: 'Scores cannot be tied' };
		}

		const maxScore = Math.max(teamAScore, teamBScore);
		const minScore = Math.min(teamAScore, teamBScore);

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

		// Look up court size to determine score cap
		const [rotation] = await db
			.select()
			.from(courtRotation)
			.where(eq(courtRotation.id, matchRecord.courtRotationId));
		const [tourney] = await db
			.select()
			.from(tournament)
			.where(eq(tournament.id, rotation.tournamentId));

		const courtSizes: number[] = tourney.courtSizes ? JSON.parse(tourney.courtSizes) : [];
		const courtSize = courtSizes[rotation.courtNumber - 1] ?? 4;

		const scoringMode = tourney.scoringMode ?? 'single-21';
		const pointsToWin = tourney.pointsToWin ?? 21;
		const decidingSetPoints = tourney.decidingSetPoints ?? 15;

		let scoreCap: number;
		if (scoringMode === 'best-of-3-15') {
			scoreCap = Math.min(pointsToWin, decidingSetPoints);
		} else if (courtSize >= 5) {
			scoreCap = pointsToWin === 21 ? 15 : pointsToWin;
		} else {
			scoreCap = pointsToWin;
		}

		if (maxScore < scoreCap) {
			return { error: `Winner must have at least ${scoreCap} points` };
		}

		// Save score
		await db.update(match).set({ teamAScore, teamBScore }).where(eq(match.id, matchId));

		return { success: 'Score saved!' };
	}
};

interface Actions {
	saveScore: (event: {
		request: Request;
		params: { token: string };
	}) => Promise<{ success?: string; error?: string }>;
}

function calculateStandings(matches: MatchData[], playerNames: Record<number, string>) {
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
		if (m.teamAScore === null || m.teamBScore === null) return;

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
