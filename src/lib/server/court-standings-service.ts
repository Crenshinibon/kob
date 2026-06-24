import { db } from '$lib/server/db';
import { courtRotation, match, type tournament, type player } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import {
	calculateCourtStandings,
	explainCourtStandings,
	buildStandingsTieBreakContext,
	getEnabledTieBreakFactors,
	normalizeTieBreakConfig,
	type CourtResult,
	type CourtStandings,
	type CourtStandingExplanation,
	type MatchData,
	type Player,
	type TieBreakConfig,
	type TieBreakFactorId
} from '$lib/tournament-logic';

export type ExplainedCourtStanding = CourtStandings & {
	name: string;
	decidingFactor: TieBreakFactorId | null;
	winningFactors: TieBreakFactorId[];
	enabledFactors: TieBreakFactorId[];
};

function rotationPlayerIds(rotation: typeof courtRotation.$inferSelect): number[] {
	return [
		rotation.player1Id,
		rotation.player2Id,
		...(rotation.player3Id !== null ? [rotation.player3Id] : []),
		...(rotation.player4Id !== null ? [rotation.player4Id] : []),
		...(rotation.player5Id !== null ? [rotation.player5Id] : []),
		...(rotation.player6Id !== null ? [rotation.player6Id] : [])
	];
}

function toMatchData(rows: (typeof match.$inferSelect)[]): MatchData[] {
	return rows.map((m) => ({
		teamAPlayer1Id: m.teamAPlayer1Id,
		teamAPlayer2Id: m.teamAPlayer2Id,
		teamBPlayer1Id: m.teamBPlayer1Id,
		teamBPlayer2Id: m.teamBPlayer2Id,
		teamAScore: m.teamAScore,
		teamBScore: m.teamBScore,
		isCanceled: m.isCanceled ?? false,
		injuredPlayerIds: m.injuredPlayerIds ?? undefined
	}));
}

export async function buildCompletedRoundsBefore(
	tournamentId: number,
	beforeRound: number,
	courtSizes: readonly number[],
	players: readonly Player[],
	tieBreakConfig: TieBreakConfig | null | undefined,
	rotationCache?: (typeof courtRotation.$inferSelect)[]
): Promise<CourtResult[][]> {
	if (beforeRound <= 1) return [];

	const allRotations =
		rotationCache ??
		(await db.select().from(courtRotation).where(eq(courtRotation.tournamentId, tournamentId)));

	const completed: CourtResult[][] = [];

	for (let roundNum = 1; roundNum < beforeRound; roundNum++) {
		const roundRotations = allRotations
			.filter((r) => r.roundNumber === roundNum)
			.sort((a, b) => a.courtNumber - b.courtNumber);

		const courtResults: CourtResult[] = [];

		for (const rotation of roundRotations) {
			const rows = await db.select().from(match).where(eq(match.courtRotationId, rotation.id));
			const playerIds = rotationPlayerIds(rotation);
			const matchData = toMatchData(rows);
			const config = normalizeTieBreakConfig(tieBreakConfig ?? null);
			const standings = calculateCourtStandings(matchData, playerIds, {
				tieBreakConfig: config,
				completedRounds: completed,
				courtSizes,
				players,
				manualRankOrder: rotation.manualRankOrder ?? undefined
			});
			courtResults.push({ courtNumber: rotation.courtNumber, standings });
		}

		completed.push(courtResults);
	}

	return completed;
}

export function computeExplainedStandings(opts: {
	matchData: MatchData[];
	playerIds: readonly number[];
	playerNames: Map<number, string>;
	tourney: typeof tournament.$inferSelect;
	players: readonly (typeof player.$inferSelect)[];
	completedRounds: readonly CourtResult[][];
	courtSizes: readonly number[];
	courtNumber: number;
	manualRankOrder?: readonly number[] | null;
}): ExplainedCourtStanding[] {
	const {
		matchData,
		playerIds,
		playerNames,
		tourney,
		players,
		completedRounds,
		courtSizes,
		courtNumber,
		manualRankOrder
	} = opts;

	const logicPlayers: Player[] = players.map((p) => ({
		id: p.id,
		name: p.name,
		seedPoints: p.seedPoints,
		seedRank: p.seedRank
	}));

	const tieBreakConfig = normalizeTieBreakConfig(tourney.tieBreakConfig ?? null);
	const standingsOptions = {
		tieBreakConfig,
		completedRounds,
		courtSizes,
		players: logicPlayers,
		manualRankOrder: manualRankOrder ?? undefined
	};

	const standings = calculateCourtStandings(matchData, playerIds, standingsOptions);
	const tbContext = buildStandingsTieBreakContext(matchData, playerIds, standingsOptions);
	const explanations = explainCourtStandings(standings, tieBreakConfig, tbContext.context);
	const enabledFactors = getEnabledTieBreakFactors(tieBreakConfig);

	return standings.map((s) => {
		const exp: CourtStandingExplanation = explanations.get(s.playerId) ?? {
			decidingFactor: null,
			winningFactors: []
		};
		return {
			...s,
			name: playerNames.get(s.playerId) ?? String(s.playerId),
			decidingFactor: exp.decidingFactor,
			winningFactors: [...exp.winningFactors],
			enabledFactors
		};
	});
}
