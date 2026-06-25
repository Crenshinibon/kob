import { error } from '@sveltejs/kit';
import * as m from '$lib/paraglide/messages';
import { db } from '$lib/server/db';
import { court, courtRotation, match, tournament, player } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

import type { PageServerLoad } from './$types';
import {
	getMinPointsForSet,
	getScoringLabel
} from '$lib/server/tournament-logic';
import {
	buildCompletedRoundsBefore,
	computeExplainedStandings
} from '$lib/server/court-standings-service';

export const load: PageServerLoad = async ({ params, locals }) => {
	const token = params.token;

	const [rotationByToken] = await db
		.select()
		.from(courtRotation)
		.where(eq(courtRotation.token, token));

	let courtRecord: typeof court.$inferSelect | undefined;
	let rotation: typeof courtRotation.$inferSelect | undefined;

	if (rotationByToken) {
		rotation = rotationByToken;
		const [foundCourt] = await db.select().from(court).where(eq(court.id, rotationByToken.courtId));
		courtRecord = foundCourt;
	} else {
		const [foundCourt] = await db.select().from(court).where(eq(court.token, token));
		courtRecord = foundCourt;
	}

	if (!courtRecord) throw error(404, m.not_found());

	const [tourney] = await db
		.select()
		.from(tournament)
		.where(eq(tournament.id, courtRecord.tournamentId));

	if (!tourney) throw error(404, m.tournament_not_found());

	const currentRound = tourney.currentRound || 0;

	if (!rotation && currentRound > 0) {
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
			isEditable: false,
			currentRound,
			isAuthenticated: !!locals.user
		};
	}

	const matches = await db
		.select()
		.from(match)
		.where(eq(match.courtRotationId, rotation.id))
		.orderBy(match.matchNumber, match.setNumber);

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

	const courtSizes = tourney.courtSizes
		? (JSON.parse(tourney.courtSizes) as number[])
		: [playerIds.length];

	const logicPlayers = players.map((p) => ({
		id: p.id,
		name: p.name,
		seedPoints: p.seedPoints,
		seedRank: p.seedRank
	}));

	const completedRounds = await buildCompletedRoundsBefore(
		rotation.tournamentId,
		rotation.roundNumber,
		courtSizes,
		logicPlayers,
		tourney.tieBreakConfig ?? null
	);

	const matchData = matches.map((m) => ({
		teamAPlayer1Id: m.teamAPlayer1Id,
		teamAPlayer2Id: m.teamAPlayer2Id,
		teamBPlayer1Id: m.teamBPlayer1Id,
		teamBPlayer2Id: m.teamBPlayer2Id,
		teamAScore: m.teamAScore,
		teamBScore: m.teamBScore,
		isCanceled: m.isCanceled ?? false,
		injuredPlayerIds: m.injuredPlayerIds ?? undefined
	}));

	const explained =
		matchData.some((m) => m.teamAScore !== null)
			? computeExplainedStandings({
					matchData,
					playerIds,
					playerNames: playerMap,
					tourney,
					players,
					completedRounds,
					courtSizes,
					courtNumber: rotation.courtNumber,
					manualRankOrder: rotation.manualRankOrder
				})
			: [];

	const standings = explained.map((s) => ({
		...s,
		id: s.playerId,
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

	const isEditable =
		tourney.status === 'active' &&
		rotation.roundNumber === currentRound &&
		(courtRecord.isActive ?? true);

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
		isEditable,
		currentRound,
		isAuthenticated: !!locals.user
	};
};
