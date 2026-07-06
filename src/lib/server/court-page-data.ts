import { error } from '@sveltejs/kit';
import * as m from '$lib/paraglide/messages';
import { db } from '$lib/server/db';
import { court, courtRotation, match, tournament, player } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { getMinPointsForSet, getScoringLabel, type TieBreakFactorId, type TieBreakDecidingOutcome } from '$lib/tournament-logic';
import {
	buildCompletedRoundsBefore,
	persistRotationDiceRolls,
	resolveRotationStandings
} from '$lib/server/court-standings-service';

export type CourtPageMatch = {
	id: number;
	courtRotationId: number;
	matchNumber: number;
	setNumber: number;
	teamAPlayer1Id: number;
	teamAPlayer2Id: number;
	teamBPlayer1Id: number;
	teamBPlayer2Id: number;
	teamAScore: number | null;
	teamBScore: number | null;
	isCanceled: boolean;
	injuredPlayerIds: number[] | null;
};

export type CourtPageStanding = {
	playerId: number;
	rank: number;
	points: number;
	diff: number;
	matchCount: number;
	id: number;
	name: string;
	avgPoints?: number;
	matchesPlayed: number;
	tiedFactors: TieBreakFactorId[];
	decidingFactor: TieBreakFactorId | null;
	decidingOutcome: TieBreakDecidingOutcome;
};

export type CourtPageData = {
	court: {
		tournamentName: string;
		courtNumber: number;
		roundNumber: number;
		courtSize: number;
		playerNames: Record<number, string>;
		minPoints: number;
		scoringLabel: string;
		winBy: number;
		setsToWin: number;
		pointsToWin: number;
		decidingSetPoints: number;
		label: string | null;
		scoringOverrides: Record<
			string,
			{ pointsToWin?: number; winBy?: number; setsToWin?: number; decidingSetPoints?: number }
		> | null;
	};
	matches: CourtPageMatch[];
	standings: CourtPageStanding[];
	isActive: boolean;
	isEditable: boolean;
	currentRound: number;
	isAuthenticated: boolean;
};

export async function fetchCourtPageData(
	token: string,
	isAuthenticated: boolean
): Promise<CourtPageData> {
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

	if (!courtRecord) error(404, m.not_found());

	const [tourney] = await db
		.select()
		.from(tournament)
		.where(eq(tournament.id, courtRecord.tournamentId));

	if (!tourney) error(404, m.tournament_not_found());

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
				winBy: 2,
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
			isAuthenticated
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

	const matchData = matches.map((row) => ({
		teamAPlayer1Id: row.teamAPlayer1Id,
		teamAPlayer2Id: row.teamAPlayer2Id,
		teamBPlayer1Id: row.teamBPlayer1Id,
		teamBPlayer2Id: row.teamBPlayer2Id,
		teamAScore: row.teamAScore,
		teamBScore: row.teamBScore,
		isCanceled: row.isCanceled ?? false,
		injuredPlayerIds: row.injuredPlayerIds ?? undefined
	}));

	const isCurrentRound =
		tourney.status === 'active' && rotation.roundNumber === currentRound;
	const useSnapshot = !isCurrentRound || tourney.status === 'completed';

	const standingsResult = resolveRotationStandings({
		rotation,
		matchData,
		playerIds,
		playerNames: playerMap,
		players,
		completedRounds,
		courtSizes,
		tourney,
		useSnapshot
	});

	if (
		isCurrentRound &&
		!standingsResult.fromSnapshot &&
		standingsResult.standings.length > 0 &&
		JSON.stringify(standingsResult.diceRolls) !== JSON.stringify(rotation.diceRolls ?? {})
	) {
		await persistRotationDiceRolls(rotation.id, standingsResult.diceRolls);
	}

	const standings = standingsResult.standings.map((s) => ({
		...s,
		id: s.playerId,
		avgPoints: s.matchCount > 0 ? s.points : undefined,
		matchesPlayed: matchData.filter(
			(row) =>
				!row.isCanceled &&
				row.teamAScore !== null &&
				(row.teamAPlayer1Id === s.playerId ||
					row.teamAPlayer2Id === s.playerId ||
					row.teamBPlayer1Id === s.playerId ||
					row.teamBPlayer2Id === s.playerId)
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

	const isEditable = isCurrentRound && (courtRecord.isActive ?? true);

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
		matches: matches.map((row) => ({
			id: row.id,
			courtRotationId: row.courtRotationId,
			matchNumber: row.matchNumber,
			setNumber: row.setNumber,
			teamAPlayer1Id: row.teamAPlayer1Id,
			teamAPlayer2Id: row.teamAPlayer2Id,
			teamBPlayer1Id: row.teamBPlayer1Id,
			teamBPlayer2Id: row.teamBPlayer2Id,
			teamAScore: row.teamAScore,
			teamBScore: row.teamBScore,
			isCanceled: row.isCanceled ?? false,
			injuredPlayerIds: row.injuredPlayerIds ?? null
		})),
		standings,
		isActive: (courtRecord.isActive ?? true) && tourney.status === 'active',
		isEditable,
		currentRound,
		isAuthenticated
	};
}
