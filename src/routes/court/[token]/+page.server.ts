import { error } from '@sveltejs/kit';
import * as m from '$lib/paraglide/messages';
import { db } from '$lib/server/db';
import { court, courtRotation, match, tournament, player } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

import type { PageServerLoad } from './$types';
import type { MatchData } from '$lib/server/tournament-logic';
import {
	calculateCourtStandings,
	getMinPointsForSet,
	getScoringLabel
} from '$lib/server/tournament-logic';

export const load: PageServerLoad = async ({ params, locals }) => {
	const token = params.token;

	// Get court by token
	const [courtRecord] = await db.select().from(court).where(eq(court.token, token));

	if (!courtRecord) throw error(404, m.not_found());

	// Get tournament
	const [tourney] = await db
		.select()
		.from(tournament)
		.where(eq(tournament.id, courtRecord.tournamentId));

	if (!tourney) throw error(404, m.tournament_not_found());

	const currentRound = tourney.currentRound || 0;

	// Find rotation for current round on this court
	let rotation: typeof courtRotation.$inferSelect | undefined;
	if (currentRound > 0) {
		const [found] = await db
			.select()
			.from(courtRotation)
			.where(
				and(eq(courtRotation.courtId, courtRecord.id), eq(courtRotation.roundNumber, currentRound))
			);
		rotation = found;
	}

	if (!rotation) {
		return {
		court: {
			tournamentName: tourney.name,
			courtNumber: courtRecord.courtNumber,
			roundNumber: currentRound,
			courtSize: 4,
			playerNames: {},
			minPoints: 21,
			scoringLabel: '',
			setsToWin: 1,
			pointsToWin: 21,
			decidingSetPoints: 15,
			scoringOverrides: null,
			label: courtRecord.label ?? null
		},
			matches: [],
			standings: [],
			isActive: false,
			isAuthenticated: !!locals.user
		};
	}

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
		playerNames[id] = playerMap.get(id) || m.err_unknown_player();
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
		id: s.playerId,
		name: playerNames[s.playerId] || m.err_unknown_player(),
		avgPoints: s.matchCount > 0 ? s.points : undefined,
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

	const courtSize = rotation.courtSize ?? playerIds.length;

	const pointsToWin = tourney.pointsToWin ?? 21;
	const winBy = tourney.winBy ?? 2;
	const decidingSetPoints = tourney.decidingSetPoints ?? 15;
	const setsToWin = tourney.setsToWin ?? 1;

	const config = { pointsToWin, winBy, setsToWin, decidingSetPoints };
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
			winBy,
			setsToWin,
			pointsToWin,
			decidingSetPoints,
			scoringOverrides: overrides,
			label: courtRecord.label ?? null
		},
		matches,
		standings,
		isActive: courtRecord.isActive && tourney.status === 'active',
		isAuthenticated: !!locals.user
	};
};
