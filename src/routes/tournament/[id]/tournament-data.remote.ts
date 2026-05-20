import { query } from '$app/server';
import { db } from '$lib/server/db';
import { tournament, courtRotation, match, player, courtAccess } from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import * as v from 'valibot';
import {
	calculateCourtSizes,
	matchCountForCourtSize,
	getBatchShifts,
	getShiftForCourt,
	estimateRoundDurationMinutes,
	formatDuration,
	type DurationConfig
} from '$lib/server/tournament-logic';

export interface CourtDisplayData {
	courtNumber: number;
	courtSize: number;
	matches: (typeof match.$inferSelect)[];
	token: string | null;
	players: { id: number; name: string }[];
	shift?: number;
	totalShifts?: number;
	waitMinutes?: number;
	waitLabel?: string;
}

export interface TournamentDisplayData {
	tournament: typeof tournament.$inferSelect;
	courts: CourtDisplayData[];
	canCloseRound: boolean;
	isFinalRound: boolean;
	courtSizes: number[];
	currentRound: number;
	physicalCourtCount: number;
	shifts: number[][];
	roundDuration: number;
	currentPlayerCount: number;
	error?: string;
}

function parseCourtSizes(tourney: typeof tournament.$inferSelect): number[] {
	return tourney.courtSizes
		? JSON.parse(tourney.courtSizes)
		: calculateCourtSizes(tourney.playerCount);
}

async function fetchTournamentData(tournamentId: number): Promise<TournamentDisplayData> {
	const [tourney] = await db.select().from(tournament).where(eq(tournament.id, tournamentId));

	if (!tourney) {
		return { error: 'Tournament not found' } as TournamentDisplayData;
	}

	const currentRound = tourney.currentRound || 0;
	const courtSizes: number[] = parseCourtSizes(tourney);

	const dbPlayers = await db.select().from(player).where(eq(player.tournamentId, tournamentId));
	const players = dbPlayers.map((p) => ({
		id: p.id,
		name: p.name,
		seedPoints: p.seedPoints,
		seedRank: p.seedRank
	}));

	let canCloseRound = false;
	let isFinalRound = false;

	if (currentRound > 0) {
		const rotationIds = await db
			.select({ id: courtRotation.id })
			.from(courtRotation)
			.where(
				and(
					eq(courtRotation.tournamentId, tournamentId),
					eq(courtRotation.roundNumber, currentRound)
				)
			);

		const rotationIdList = rotationIds.map((r) => r.id);

		if (rotationIdList.length > 0) {
			const allMatches = await db
				.select()
				.from(match)
				.where(inArray(match.courtRotationId, rotationIdList));

			const expectedMatchCount = courtSizes.reduce(
				(sum, size) => sum + matchCountForCourtSize(size),
				0
			);
			const scoredMatchCount = allMatches.filter(
				(m) => m.teamAScore !== null && m.teamBScore !== null
			).length;
			canCloseRound =
				allMatches.length >= expectedMatchCount && scoredMatchCount === expectedMatchCount;
		}
		isFinalRound = currentRound >= tourney.numRounds;
	}

	const displayRound = currentRound === 0 ? 1 : currentRound;
	const rotations = await db
		.select()
		.from(courtRotation)
		.where(
			and(eq(courtRotation.tournamentId, tournamentId), eq(courtRotation.roundNumber, displayRound))
		)
		.orderBy(courtRotation.courtNumber);

	const playerMap = new Map(players.map((p) => [p.id, p]));

	const courts: CourtDisplayData[] = [];
	for (const rotation of rotations) {
		const matches = await db.select().from(match).where(eq(match.courtRotationId, rotation.id));

		const access = await db
			.select()
			.from(courtAccess)
			.where(eq(courtAccess.courtRotationId, rotation.id))
			.limit(1);

		const playerIds = [
			rotation.player1Id,
			rotation.player2Id,
			...(rotation.player3Id !== null ? [rotation.player3Id] : []),
			...(rotation.player4Id !== null ? [rotation.player4Id] : []),
			...(rotation.player5Id !== null ? [rotation.player5Id] : []),
			...(rotation.player6Id !== null ? [rotation.player6Id] : [])
		].filter((id): id is number => id !== null);

		const rotationPlayers = playerIds.map((id) => playerMap.get(id)).filter(Boolean) as {
			id: number;
			name: string;
		}[];

		const size = rotation.courtSize ?? courtSizes[rotation.courtNumber - 1] ?? 4;

		courts.push({
			courtNumber: rotation.courtNumber,
			courtSize: size,
			matches,
			token: access[0]?.token ?? null,
			players: rotationPlayers
		});
	}

	const physicalCourtCount = tourney.physicalCourtCount ?? 4;
	const virtualCourtCount = courts.length;
	const shifts = getBatchShifts(virtualCourtCount, physicalCourtCount);

	const durationConfig: DurationConfig = {
		setupTimeMinutes: tourney.setupTimeMinutes ?? 15,
		transitionTimeMinutes: tourney.transitionTimeMinutes ?? 10,
		avgRallyDurationSeconds: tourney.avgRallyDurationSeconds ?? 35,
		timeBetweenRalliesSeconds: tourney.timeBetweenRalliesSeconds ?? 8,
		timeBetweenMatchesMinutes: tourney.timeBetweenMatchesMinutes ?? 3
	};

	const pointsToWin = tourney.pointsToWin ?? 21;
	const setsToWin = tourney.setsToWin ?? 1;
	const roundDuration = estimateRoundDurationMinutes(
		courtSizes,
		pointsToWin,
		setsToWin,
		durationConfig
	);

	for (const court of courts) {
		const shiftInfo = getShiftForCourt(court.courtNumber, shifts);
		court.shift = shiftInfo.shift;
		court.totalShifts = shiftInfo.total;
		if (shiftInfo.shift > 1) {
			court.waitMinutes =
				(shiftInfo.shift - 1) * roundDuration +
				(shiftInfo.shift - 1) * durationConfig.transitionTimeMinutes;
			court.waitLabel = formatDuration(court.waitMinutes);
		}
	}

	return {
		tournament: tourney,
		courts,
		canCloseRound,
		isFinalRound,
		courtSizes,
		currentRound,
		physicalCourtCount,
		shifts,
		roundDuration,
		currentPlayerCount: players.length
	};
}

export const getTournamentData = query(v.number(), async (tournamentId) => {
	return fetchTournamentData(tournamentId);
});

export const getTournamentDataLive = query.live(v.number(), async function* (tournamentId) {
	while (true) {
		yield await fetchTournamentData(tournamentId);
		await new Promise((f) => setTimeout(f, 3000));
	}
});
