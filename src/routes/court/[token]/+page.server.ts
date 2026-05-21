import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { courtAccess, courtRotation, match, tournament, player } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

import type { PageServerLoad } from './$types';
import type { MatchData } from '$lib/server/tournament-logic';
import {
	calculateCourtStandings,
	getMinPointsForSet,
	getScoringLabel
} from '$lib/server/tournament-logic';

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
		.orderBy(match.matchNumber, match.setNumber);

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

	// Map DB matches to MatchData and calculate standings using shared logic
	const matchData: MatchData[] = matches.map((m) => ({
		teamAPlayer1Id: m.teamAPlayer1Id,
		teamAPlayer2Id: m.teamAPlayer2Id,
		teamBPlayer1Id: m.teamBPlayer1Id,
		teamBPlayer2Id: m.teamBPlayer2Id,
		teamAScore: m.teamAScore,
		teamBScore: m.teamBScore,
		isCanceled: m.isCanceled ?? false,
		injuredPlayerIds: m.injuredPlayerIds ?? undefined
	}));

	const standings = calculateCourtStandings(matchData, playerIds).map((s) => ({
		...s,
		name: playerNames[s.playerId] || 'Unknown',
		matchesPlayed: matchData.filter(
			(m) =>
				!m.isCanceled &&
				m.teamAScore !== null &&
				(m.teamAPlayer1Id === s.playerId ||
					m.teamAPlayer2Id === s.playerId ||
					m.teamBPlayer1Id === s.playerId ||
					m.teamBPlayer2Id === s.playerId)
		).length
	}));

	const courtSize = (tourney as any).courtSizes
		? ((JSON.parse((tourney as any).courtSizes) as number[])[rotation.courtNumber - 1] ??
			playerIds.length)
		: playerIds.length;

	const pointsToWin = tourney.pointsToWin ?? 21;
	const decidingSetPoints = tourney.decidingSetPoints ?? 15;
	const setsToWin = tourney.setsToWin ?? 1;

	const config = { pointsToWin, setsToWin, decidingSetPoints };
	const overrides = tourney.scoringOverrides as Record<
		string,
		{ pointsToWin?: number; winBy?: number; setsToWin?: number; decidingSetPoints?: number }
	> | null;
	const minPoints = getMinPointsForSet(1, courtSize, config, overrides);
	const scoringLabel = getScoringLabel(config, courtSize, overrides);

	return {
		court: {
			tournamentName: tourney.name,
			courtNumber: rotation.courtNumber,
			roundNumber: rotation.roundNumber,
			courtSize,
			playerNames,
			minPoints,
			scoringLabel,
			setsToWin,
			pointsToWin,
			decidingSetPoints,
			scoringOverrides: overrides
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

		const config = {
			pointsToWin: tourney.pointsToWin ?? 21,
			setsToWin: tourney.setsToWin ?? 1,
			decidingSetPoints: tourney.decidingSetPoints ?? 15
		};
		const overrides = tourney.scoringOverrides as Record<
			string,
			{ pointsToWin?: number; winBy?: number; setsToWin?: number; decidingSetPoints?: number }
		> | null;
		const minPoints = getMinPointsForSet(1, courtSize, config, overrides);

		if (maxScore < minPoints) {
			return { error: `Winner must have at least ${minPoints} points` };
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
