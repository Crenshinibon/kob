import { query } from '$app/server';
import { db } from '$lib/server/db';
import { tournament, courtRotation, match, player, court } from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import * as v from 'valibot';
import * as m from '$lib/paraglide/messages';
import {
	calculateCourtSizes,
	matchCountForCourtSize,
	expectedMatchCountForRotations,
	isMatchComplete,
	getBatchShifts,
	getShiftForCourt,
	estimateRoundDurationMinutes,
	getFrozenCourts,
	type DurationConfig,
	type MatchSetScore,
	type FrozenCourt
} from '$lib/server/tournament-logic';
import {
	buildCompletedRoundsBefore,
	computeExplainedStandings,
	type ExplainedCourtStanding
} from '$lib/server/court-standings-service';
import {
	buildStandingsTieBreakContext,
	getManualTieGroups,
	normalizeTieBreakConfig,
	type ManualTieGroupDisplay
} from '$lib/tournament-logic';
import { formatDuration } from '$lib/i18n/format';

export interface CourtDisplayData {
	courtNumber: number;
	courtSize: number;
	matches: (typeof match.$inferSelect)[];
	token: string | null;
	label: string | null;
	players: { id: number; name: string; retired?: boolean }[];
	shift?: number;
	totalShifts?: number;
	waitMinutes?: number;
	waitLabel?: string;
	isComplete: boolean;
	courtId: number;
	rotationId: number;
	manualRankOrder: number[] | null;
	manualTieGroups: ManualTieGroupDisplay[];
	standings: ExplainedCourtStanding[];
}

export interface TournamentDisplayData {
	tournament: typeof tournament.$inferSelect;
	courts: CourtDisplayData[];
	canCloseRound: boolean;
	isFinalRound: boolean;
	hasScores: boolean;
	courtSizes: number[];
	currentRound: number;
	viewRound: number;
	isViewingPastRound: boolean;
	isViewingCurrentRound: boolean;
	totalRounds: number;
	physicalCourtCount: number;
	shifts: number[][];
	roundDuration: number;
	currentPlayerCount: number;
	activePlayerCount: number;
	retiredPlayers: {
		id: number;
		name: string;
		retiredRound: number | null;
		retirementReason: string | null;
		retiredAt: Date | null;
		injuredAt: Date | null;
	}[];
	allCourtsComplete: boolean;
	frozenCourts: FrozenCourt[];
	error?: string;
}

function parseCourtSizes(tourney: typeof tournament.$inferSelect): number[] {
	return tourney.courtSizes
		? JSON.parse(tourney.courtSizes)
		: calculateCourtSizes(tourney.playerCount);
}

async function fetchTournamentData(
	tournamentId: number,
	viewRoundInput?: number
): Promise<TournamentDisplayData> {
	const [tourney] = await db.select().from(tournament).where(eq(tournament.id, tournamentId));

	if (!tourney) {
		return { error: m.tournament_not_found() } as unknown as TournamentDisplayData;
	}

	const currentRound = tourney.currentRound || 0;
	const courtSizes: number[] = parseCourtSizes(tourney);
	const totalRounds = tourney.numRounds;
	const maxViewableRound =
		tourney.status === 'completed' ? totalRounds : Math.max(currentRound, 1);
	const viewRound = Math.min(
		Math.max(viewRoundInput ?? (currentRound === 0 ? 1 : currentRound), 1),
		maxViewableRound
	);
	const isViewingPastRound = currentRound > 0 && viewRound < currentRound;
	const isViewingCurrentRound = viewRound === currentRound && tourney.status === 'active';

	const dbPlayers = await db.select().from(player).where(eq(player.tournamentId, tournamentId));
	const players = dbPlayers.map((p) => ({
		id: p.id,
		name: p.name,
		seedPoints: p.seedPoints,
		seedRank: p.seedRank
	}));

	const retiredPlayers = dbPlayers
		.filter((p) => p.retiredAt)
		.map((p) => ({
			id: p.id,
			name: p.name,
			retiredRound: p.retiredRound,
			retirementReason: p.retirementReason,
			retiredAt: p.retiredAt,
			injuredAt: p.injuredAt
		}));
	const activePlayerCount = dbPlayers.filter((p) => !p.retiredAt).length;

	const displayRound = viewRound;
	const allRotations = await db
		.select()
		.from(courtRotation)
		.where(eq(courtRotation.tournamentId, tournamentId));

	const rotations = allRotations
		.filter((r) => r.roundNumber === displayRound)
		.sort((a, b) => a.courtNumber - b.courtNumber);

	let canCloseRound = false;
	let isFinalRound = false;
	let hasScores = false;

	if (currentRound > 0 && isViewingCurrentRound) {
		isFinalRound = currentRound >= tourney.numRounds;

		if (rotations.length > 0) {
			const rotationIdList = rotations.map((r) => r.id);
			const allMatches = await db
				.select()
				.from(match)
				.where(inArray(match.courtRotationId, rotationIdList));

			const expectedMatchCount = expectedMatchCountForRotations(rotations, courtSizes);

			const matchGroups = new Map<string, MatchSetScore[]>();
			for (const m of allMatches) {
				const key = `${m.courtRotationId}-${m.matchNumber}`;
				const group = matchGroups.get(key);
				if (group) {
					group.push(m);
				} else {
					matchGroups.set(key, [m]);
				}
			}
			const completedMatchCount = [...matchGroups.values()].filter((group) =>
				isMatchComplete(group)
			).length;
			canCloseRound = completedMatchCount >= expectedMatchCount;
			hasScores = allMatches.some((m) => m.teamAScore !== null);
		}
	}

	const playerMap = new Map<number, (typeof dbPlayers)[0]>();
	for (const p of dbPlayers) playerMap.set(p.id, p);

	const logicPlayers = dbPlayers.map((p) => ({
		id: p.id,
		name: p.name,
		seedPoints: p.seedPoints,
		seedRank: p.seedRank
	}));

	const completedRounds = await buildCompletedRoundsBefore(
		tournamentId,
		displayRound,
		courtSizes,
		logicPlayers,
		tourney.tieBreakConfig ?? null,
		allRotations
	);

	const courts: CourtDisplayData[] = [];
	for (const rotation of rotations) {
		const matches = await db.select().from(match).where(eq(match.courtRotationId, rotation.id));

		const access = await db
			.select({ label: court.label, id: court.id })
			.from(court)
			.where(eq(court.id, rotation.courtId))
			.limit(1);

		const playerIds = [
			rotation.player1Id,
			rotation.player2Id,
			...(rotation.player3Id !== null ? [rotation.player3Id] : []),
			...(rotation.player4Id !== null ? [rotation.player4Id] : []),
			...(rotation.player5Id !== null ? [rotation.player5Id] : []),
			...(rotation.player6Id !== null ? [rotation.player6Id] : [])
		].filter((id): id is number => id !== null);

		const rotationPlayers = playerIds
			.map((id) => {
				const p = playerMap.get(id);
				if (!p) return null;
				return {
					id: p.id,
					name: p.name,
					retired: !!p.retiredAt
				};
			})
			.filter(Boolean) as { id: number; name: string; retired?: boolean }[];

		const size = rotation.courtSize ?? courtSizes[rotation.courtNumber - 1] ?? 4;

		const courtMatchGroups = new Map<number, MatchSetScore[]>();
		for (const m of matches) {
			const group = courtMatchGroups.get(m.matchNumber);
			if (group) {
				group.push(m);
			} else {
				courtMatchGroups.set(m.matchNumber, [m]);
			}
		}
		const isComplete =
			matches.length > 0 &&
			courtMatchGroups.size >= matchCountForCourtSize(size) &&
			[...courtMatchGroups.values()].every((group) => isMatchComplete(group));

		const playerNameMap = new Map(playerIds.map((id) => [id, playerMap.get(id)?.name ?? '']));
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

		const standings =
			matchData.some((m) => m.teamAScore !== null)
				? computeExplainedStandings({
						matchData,
						playerIds,
						playerNames: playerNameMap,
						tourney,
						players: dbPlayers,
						completedRounds,
						courtSizes,
						courtNumber: rotation.courtNumber,
						manualRankOrder: rotation.manualRankOrder
					})
				: [];

		const tieBreakConfig = normalizeTieBreakConfig(tourney.tieBreakConfig ?? null);
		const tbContext = buildStandingsTieBreakContext(matchData, playerIds, {
			tieBreakConfig,
			completedRounds,
			courtSizes,
			players: dbPlayers.map((p) => ({
				id: p.id,
				name: p.name,
				seedPoints: p.seedPoints,
				seedRank: p.seedRank
			})),
			manualRankOrder: rotation.manualRankOrder ?? undefined
		});
		const manualTieGroups =
			matchData.some((m) => m.teamAScore !== null)
				? getManualTieGroups(playerIds, tieBreakConfig, tbContext.context)
				: [];

		courts.push({
			courtNumber: rotation.courtNumber,
			courtSize: size,
			matches,
			token: rotation.token ?? null,
			label: access[0]?.label ?? null,
			courtId: access[0]?.id ?? rotation.courtId,
			rotationId: rotation.id,
			manualRankOrder: rotation.manualRankOrder ?? null,
			manualTieGroups,
			players: rotationPlayers,
			standings,
			isComplete
		});
	}

	const allCourtsComplete = courts.length > 0 && courts.every((c) => c.isComplete);

	const physicalCourtCount = tourney.physicalCourtCount ?? 4;
	const virtualCourtCount = courts.length;
	const shifts = getBatchShifts(virtualCourtCount, physicalCourtCount);

	// Compute frozen courts for preseed format
	const roundsCompleted = currentRound > 0 ? currentRound - 1 : 0;
	const originalCourtSizes = calculateCourtSizes(tourney.playerCount);
	const frozenCourts =
		tourney.formatType === 'preseed'
			? getFrozenCourts(originalCourtSizes, roundsCompleted, 'preseed')
			: [];

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
		hasScores,
		courtSizes,
		currentRound,
		viewRound,
		isViewingPastRound,
		isViewingCurrentRound,
		totalRounds,
		physicalCourtCount,
		shifts,
		roundDuration,
		currentPlayerCount: players.length,
		activePlayerCount,
		retiredPlayers,
		allCourtsComplete,
		frozenCourts
	};
}

const tournamentDataInputSchema = v.object({
	tournamentId: v.number(),
	viewRound: v.optional(v.number())
});

export const getTournamentData = query(tournamentDataInputSchema, async ({ tournamentId, viewRound }) => {
	return fetchTournamentData(tournamentId, viewRound);
});
