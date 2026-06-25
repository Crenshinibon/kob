import { db } from '$lib/server/db';
import {
	courtRotation,
	match,
	type CourtStandingSnapshot,
	type tournament,
	type player
} from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import {
	calculateCourtStandings,
	explainCourtStandings,
	buildStandingsTieBreakContext,
	normalizeTieBreakConfig,
	type CourtResult,
	type CourtStandings,
	type CourtStandingExplanation,
	type MatchData,
	type Player,
	type TieBreakConfig,
	type TieBreakDecidingOutcome,
	type TieBreakFactorId
} from '$lib/tournament-logic';

export type ExplainedCourtStanding = CourtStandings & {
	name: string;
	tiedFactors: TieBreakFactorId[];
	decidingFactor: TieBreakFactorId | null;
	decidingOutcome: TieBreakDecidingOutcome;
};

export type ResolveRotationStandingsResult = {
	standings: ExplainedCourtStanding[];
	diceRolls: Record<string, number>;
	tieBreakConfig: TieBreakConfig;
	fromSnapshot: boolean;
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

export function snapshotToExplainedStandings(
	snapshot: readonly CourtStandingSnapshot[],
	playerNames: Map<number, string>
): ExplainedCourtStanding[] {
	return snapshot.map((s) => ({
		playerId: s.playerId,
		rank: s.rank,
		points: s.points,
		diff: s.diff,
		matchCount: s.matchCount,
		rawPoints: s.rawPoints,
		rawDiff: s.rawDiff,
		name: playerNames.get(s.playerId) ?? String(s.playerId),
		tiedFactors: [...s.tiedFactors],
		decidingFactor: s.decidingFactor,
		decidingOutcome: s.decidingOutcome ?? null
	}));
}

export function explainedToSnapshot(standings: readonly ExplainedCourtStanding[]): CourtStandingSnapshot[] {
	return standings.map((s) => ({
		playerId: s.playerId,
		rank: s.rank,
		points: s.points,
		diff: s.diff,
		matchCount: s.matchCount,
		rawPoints: s.rawPoints,
		rawDiff: s.rawDiff,
		tiedFactors: [...s.tiedFactors],
		decidingFactor: s.decidingFactor,
		decidingOutcome: s.decidingOutcome ?? null
	}));
}

export function snapshotToCourtStandings(
	snapshot: readonly CourtStandingSnapshot[]
): CourtStandings[] {
	return snapshot.map((s) => ({
		playerId: s.playerId,
		rank: s.rank,
		points: s.points,
		diff: s.diff,
		matchCount: s.matchCount,
		rawPoints: s.rawPoints,
		rawDiff: s.rawDiff
	}));
}

export function hasStandingsSnapshot(rotation: typeof courtRotation.$inferSelect): boolean {
	return (rotation.standingsSnapshot?.length ?? 0) > 0 && rotation.roundClosedAt != null;
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
			if (hasStandingsSnapshot(rotation) && rotation.standingsSnapshot) {
				courtResults.push({
					courtNumber: rotation.courtNumber,
					standings: snapshotToCourtStandings(rotation.standingsSnapshot)
				});
				continue;
			}

			const rows = await db.select().from(match).where(eq(match.courtRotationId, rotation.id));
			const playerIds = rotationPlayerIds(rotation);
			const matchData = toMatchData(rows);
			const config = normalizeTieBreakConfig(
				rotation.tieBreakConfigSnapshot ?? tieBreakConfig ?? null
			);
			const diceRolls = { ...(rotation.diceRolls ?? {}) };
			const standings = calculateCourtStandings(matchData, playerIds, {
				tieBreakConfig: config,
				completedRounds: completed,
				courtSizes,
				players,
				manualRankOrder: rotation.manualRankOrder ?? undefined,
				mutableDiceRolls: diceRolls
			});
			courtResults.push({ courtNumber: rotation.courtNumber, standings });
		}

		completed.push(courtResults);
	}

	return completed;
}

function applyStandingsExplanations(
	standings: readonly CourtStandings[],
	playerNames: Map<number, string>,
	tieBreakConfig: TieBreakConfig,
	tbContext: ReturnType<typeof buildStandingsTieBreakContext>
): ExplainedCourtStanding[] {
	const explanations = explainCourtStandings(standings, tieBreakConfig, tbContext.context);

	return standings.map((s) => {
		const exp: CourtStandingExplanation = explanations.get(s.playerId) ?? {
			tiedFactors: [],
			decidingFactor: null,
			decidingOutcome: null
		};
		return {
			...s,
			name: playerNames.get(s.playerId) ?? String(s.playerId),
			tiedFactors: [...exp.tiedFactors],
			decidingFactor: exp.decidingFactor,
			decidingOutcome: exp.decidingOutcome
		};
	});
}

export function computeExplainedStandings(opts: {
	matchData: MatchData[];
	playerIds: readonly number[];
	playerNames: Map<number, string>;
	tourney: typeof tournament.$inferSelect;
	players: readonly (typeof player.$inferSelect)[];
	completedRounds: readonly CourtResult[][];
	courtSizes: readonly number[];
	manualRankOrder?: readonly number[] | null;
	diceRolls?: Record<string, number> | null;
	tieBreakConfigOverride?: TieBreakConfig | null;
}): ResolveRotationStandingsResult {
	const {
		matchData,
		playerIds,
		playerNames,
		tourney,
		players,
		completedRounds,
		courtSizes,
		manualRankOrder,
		diceRolls: initialDiceRolls,
		tieBreakConfigOverride
	} = opts;

	const logicPlayers: Player[] = players.map((p) => ({
		id: p.id,
		name: p.name,
		seedPoints: p.seedPoints,
		seedRank: p.seedRank
	}));

	const tieBreakConfig = normalizeTieBreakConfig(
		tieBreakConfigOverride ?? tourney.tieBreakConfig ?? null
	);
	const mutableDiceRolls = { ...(initialDiceRolls ?? {}) };
	const standingsOptions = {
		tieBreakConfig,
		completedRounds,
		courtSizes,
		players: logicPlayers,
		manualRankOrder: manualRankOrder ?? undefined,
		mutableDiceRolls
	};

	const standings = calculateCourtStandings(matchData, playerIds, standingsOptions);
	const tbContext = buildStandingsTieBreakContext(matchData, playerIds, standingsOptions);

	return {
		standings: applyStandingsExplanations(standings, playerNames, tieBreakConfig, tbContext),
		diceRolls: mutableDiceRolls,
		tieBreakConfig,
		fromSnapshot: false
	};
}

export function resolveRotationStandings(opts: {
	rotation: typeof courtRotation.$inferSelect;
	matchData: MatchData[];
	playerIds: readonly number[];
	playerNames: Map<number, string>;
	players: readonly (typeof player.$inferSelect)[];
	completedRounds: readonly CourtResult[][];
	courtSizes: readonly number[];
	tourney: typeof tournament.$inferSelect;
	useSnapshot: boolean;
}): ResolveRotationStandingsResult {
	const {
		rotation,
		matchData,
		playerIds,
		playerNames,
		players,
		completedRounds,
		courtSizes,
		tourney,
		useSnapshot
	} = opts;

	if (useSnapshot && hasStandingsSnapshot(rotation) && rotation.standingsSnapshot) {
		const tieBreakConfig = normalizeTieBreakConfig(
			rotation.tieBreakConfigSnapshot ?? tourney.tieBreakConfig ?? null
		);
		const logicPlayers: Player[] = players.map((p) => ({
			id: p.id,
			name: p.name,
			seedPoints: p.seedPoints,
			seedRank: p.seedRank
		}));
		const mutableDiceRolls = { ...(rotation.diceRolls ?? {}) };
		const standingsOptions = {
			tieBreakConfig,
			completedRounds,
			courtSizes,
			players: logicPlayers,
			manualRankOrder: rotation.manualRankOrder ?? undefined,
			mutableDiceRolls
		};
		const baseStandings = snapshotToCourtStandings(rotation.standingsSnapshot);
		const tbContext = buildStandingsTieBreakContext(matchData, playerIds, standingsOptions);

		return {
			standings: applyStandingsExplanations(
				baseStandings,
				playerNames,
				tieBreakConfig,
				tbContext
			),
			diceRolls: mutableDiceRolls,
			tieBreakConfig,
			fromSnapshot: true
		};
	}

	if (!matchData.some((m) => m.teamAScore !== null)) {
		return {
			standings: [],
			diceRolls: { ...(rotation.diceRolls ?? {}) },
			tieBreakConfig: normalizeTieBreakConfig(tourney.tieBreakConfig ?? null),
			fromSnapshot: false
		};
	}

	return computeExplainedStandings({
		matchData,
		playerIds,
		playerNames,
		tourney,
		players,
		completedRounds,
		courtSizes,
		manualRankOrder: rotation.manualRankOrder,
		diceRolls: rotation.diceRolls,
		tieBreakConfigOverride: useSnapshot ? rotation.tieBreakConfigSnapshot : undefined
	});
}

export async function persistRotationStandingsSnapshot(
	rotationId: number,
	snapshot: {
		standings: readonly ExplainedCourtStanding[];
		tieBreakConfig: TieBreakConfig;
		diceRolls: Record<string, number>;
	}
): Promise<void> {
	await db
		.update(courtRotation)
		.set({
			standingsSnapshot: explainedToSnapshot(snapshot.standings),
			tieBreakConfigSnapshot: snapshot.tieBreakConfig,
			diceRolls: snapshot.diceRolls,
			roundClosedAt: new Date()
		})
		.where(eq(courtRotation.id, rotationId));
}

export async function persistRotationDiceRolls(
	rotationId: number,
	diceRolls: Record<string, number>
): Promise<void> {
	await db.update(courtRotation).set({ diceRolls }).where(eq(courtRotation.id, rotationId));
}

export async function snapshotClosedRoundRotations(opts: {
	rotations: readonly (typeof courtRotation.$inferSelect)[];
	closedRoundResults: readonly CourtResult[];
	completedRoundsBefore: readonly CourtResult[][];
	tourney: typeof tournament.$inferSelect;
	players: readonly (typeof player.$inferSelect)[];
	courtSizes: readonly number[];
	tieBreakConfig: TieBreakConfig;
	diceRollsByCourt: ReadonlyMap<number, Record<string, number>>;
	matchesByRotationId: ReadonlyMap<number, MatchData[]>;
}): Promise<void> {
	const {
		rotations,
		closedRoundResults,
		completedRoundsBefore,
		tourney,
		players,
		courtSizes,
		tieBreakConfig,
		diceRollsByCourt,
		matchesByRotationId
	} = opts;

	const logicPlayers: Player[] = players.map((p) => ({
		id: p.id,
		name: p.name,
		seedPoints: p.seedPoints,
		seedRank: p.seedRank
	}));
	const playerNames = new Map(players.map((p) => [p.id, p.name]));

	for (const rotation of rotations) {
		const courtResult = closedRoundResults.find((c) => c.courtNumber === rotation.courtNumber);
		if (!courtResult) continue;

		const playerIds = rotationPlayerIds(rotation);
		const matchData = matchesByRotationId.get(rotation.id) ?? [];
		const diceRolls = { ...(diceRollsByCourt.get(rotation.courtNumber) ?? {}) };
		const standingsOptions = {
			tieBreakConfig,
			completedRounds: completedRoundsBefore,
			courtSizes,
			players: logicPlayers,
			manualRankOrder: rotation.manualRankOrder ?? undefined,
			mutableDiceRolls: diceRolls
		};
		const tbContext = buildStandingsTieBreakContext(matchData, playerIds, standingsOptions);
		const explanations = explainCourtStandings(
			courtResult.standings,
			tieBreakConfig,
			tbContext.context
		);

		const explained: ExplainedCourtStanding[] = courtResult.standings.map((s) => {
			const exp = explanations.get(s.playerId) ?? {
				tiedFactors: [],
				decidingFactor: null,
				decidingOutcome: null
			};
			return {
				...s,
				name: playerNames.get(s.playerId) ?? String(s.playerId),
				tiedFactors: [...exp.tiedFactors],
				decidingFactor: exp.decidingFactor,
				decidingOutcome: exp.decidingOutcome
			};
		});

		await persistRotationStandingsSnapshot(rotation.id, {
			standings: explained,
			tieBreakConfig,
			diceRolls
		});
	}
}
