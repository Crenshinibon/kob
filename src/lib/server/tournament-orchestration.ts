import crypto from 'crypto';
import { and, eq, gt, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { court, courtRotation, match, player, tournament } from '$lib/server/db/schema';
import {
	addPlayers,
	assignmentMatchCourtSize,
	createInitialState,
	generateAllMatchesForAssignment,
	generateRound1Assignments,
	getMaxSets,
	getEffectiveScoring,
	orderPlayerIdsForRound1,
	startRound,
	validateAssignmentsForMatchGeneration,
	type CourtAssignment,
	type FormatType,
	type MatchData,
	type Player,
	type ScoringOverrides
} from '$lib/tournament-logic';
import { newPlayerToken, planTournamentStart, StartTournamentError } from '$lib/tournament-start';

export { newPlayerToken, planTournamentStart, StartTournamentError };
export type { StartPlan } from '$lib/tournament-start';

export type MatchInsertRow = {
	courtRotationId: number;
	matchNumber: number;
	setNumber: number;
	teamAPlayer1Id: number;
	teamAPlayer2Id: number;
	teamBPlayer1Id: number;
	teamBPlayer2Id: number;
};

export function buildRound1AssignmentsFromPlayers(
	formatType: FormatType,
	players: readonly Pick<Player, 'id' | 'seedPoints' | 'seedRank'>[],
	courtSizes: readonly number[]
): CourtAssignment[] {
	const orderedIds = orderPlayerIdsForRound1(formatType, players);
	return generateRound1Assignments(orderedIds, courtSizes);
}

export function assignmentCourtSize(
	assignment: CourtAssignment,
	courtSizes: readonly number[]
): number {
	return assignmentMatchCourtSize(assignment, courtSizes);
}

export function buildMatchInsertRows(
	assignment: CourtAssignment,
	courtSizes: readonly number[],
	rotationId: number,
	scoring: {
		pointsToWin: number;
		setsToWin: number;
		decidingSetPoints: number;
		winBy: number;
	},
	scoringOverrides: ScoringOverrides | null | undefined
): MatchInsertRow[] {
	const size = assignmentCourtSize(assignment, courtSizes);
	const allMatches = generateAllMatchesForAssignment(assignment, courtSizes);
	const effective = getEffectiveScoring(size, scoring, scoringOverrides);
	const maxSets = getMaxSets(effective.setsToWin);
	const rows: MatchInsertRow[] = [];

	for (let mi = 0; mi < allMatches.length; mi++) {
		const m = allMatches[mi];
		for (let setNum = 1; setNum <= maxSets; setNum++) {
			rows.push({
				courtRotationId: rotationId,
				matchNumber: mi + 1,
				setNumber: setNum,
				teamAPlayer1Id: m.teamAPlayer1Id,
				teamAPlayer2Id: m.teamAPlayer2Id,
				teamBPlayer1Id: m.teamBPlayer1Id,
				teamBPlayer2Id: m.teamBPlayer2Id
			});
		}
	}
	return rows;
}

export function prevalidateAssignments(
	assignments: readonly CourtAssignment[],
	courtSizes: readonly number[]
): void {
	validateAssignmentsForMatchGeneration(assignments, courtSizes);
}

export function toMatchData(
	rows: readonly {
		teamAPlayer1Id: number;
		teamAPlayer2Id: number;
		teamBPlayer1Id: number;
		teamBPlayer2Id: number;
		teamAScore: number | null;
		teamBScore: number | null;
		isCanceled: boolean | null;
		injuredPlayerIds?: number[] | null;
	}[]
): MatchData[] {
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

export async function ensureCourtsExist(
	tournamentId: number,
	courtCount: number
): Promise<(typeof court.$inferSelect)[]> {
	const existing = await db.select().from(court).where(eq(court.tournamentId, tournamentId));
	const byNumber = new Map(existing.map((c) => [c.courtNumber, c]));
	const result: (typeof court.$inferSelect)[] = [];
	for (let n = 1; n <= courtCount; n++) {
		const found = byNumber.get(n);
		if (found) {
			result.push(found);
			continue;
		}
		const [row] = await db
			.insert(court)
			.values({
				tournamentId,
				courtNumber: n,
				token: crypto.randomBytes(16).toString('hex'),
				isActive: true
			})
			.returning();
		result.push(row);
	}
	return result;
}

export async function dropSurplusCourts(tournamentId: number, courtCount: number): Promise<void> {
	const extras = await db
		.select()
		.from(court)
		.where(and(eq(court.tournamentId, tournamentId), gt(court.courtNumber, courtCount)));
	if (extras.length === 0) return;
	const extraIds = extras.map((c) => c.id);
	const extraRotations = await db
		.select()
		.from(courtRotation)
		.where(inArray(courtRotation.courtId, extraIds));
	if (extraRotations.length > 0) {
		await db.delete(match).where(
			inArray(
				match.courtRotationId,
				extraRotations.map((r) => r.id)
			)
		);
		await db.delete(courtRotation).where(inArray(courtRotation.courtId, extraIds));
	}
	await db.delete(court).where(inArray(court.id, extraIds));
}

export type RebuildScoring = {
	pointsToWin: number;
	setsToWin: number;
	decidingSetPoints: number;
	winBy: number;
};

export async function rebuildCurrentRound(opts: {
	tournamentId: number;
	roundNumber: number;
	assignments: readonly CourtAssignment[];
	courtSizes: readonly number[];
	scoring: RebuildScoring;
	scoringOverrides: ScoringOverrides | null | undefined;
	frozenCourtNumbers?: ReadonlySet<number>;
}): Promise<void> {
	const frozen = opts.frozenCourtNumbers ?? new Set<number>();
	const currentRotations = await db
		.select()
		.from(courtRotation)
		.where(
			and(
				eq(courtRotation.tournamentId, opts.tournamentId),
				eq(courtRotation.roundNumber, opts.roundNumber)
			)
		);

	const idsToReplace = currentRotations.filter((r) => !frozen.has(r.courtNumber)).map((r) => r.id);
	if (idsToReplace.length > 0) {
		await db.delete(match).where(inArray(match.courtRotationId, idsToReplace));
		const activeCourtNumbers = currentRotations
			.filter((r) => !frozen.has(r.courtNumber))
			.map((r) => r.courtNumber);
		await db
			.delete(courtRotation)
			.where(
				and(
					eq(courtRotation.tournamentId, opts.tournamentId),
					eq(courtRotation.roundNumber, opts.roundNumber),
					inArray(courtRotation.courtNumber, activeCourtNumbers)
				)
			);
	} else if (frozen.size === 0) {
		await db
			.delete(courtRotation)
			.where(
				and(
					eq(courtRotation.tournamentId, opts.tournamentId),
					eq(courtRotation.roundNumber, opts.roundNumber)
				)
			);
	}

	const maxCourt = Math.max(...opts.assignments.map((a) => a.courtNumber), 0);
	await ensureCourtsExist(opts.tournamentId, maxCourt);

	for (const assignment of opts.assignments) {
		if (frozen.has(assignment.courtNumber)) continue;
		const size = assignmentCourtSize(assignment, opts.courtSizes);
		const [existingCourt] = await db
			.select()
			.from(court)
			.where(
				and(
					eq(court.tournamentId, opts.tournamentId),
					eq(court.courtNumber, assignment.courtNumber)
				)
			);
		if (!existingCourt) {
			throw new Error(
				`Court ${assignment.courtNumber} is missing for tournament ${opts.tournamentId}`
			);
		}
		const [newRotation] = await db
			.insert(courtRotation)
			.values({
				courtId: existingCourt.id,
				tournamentId: opts.tournamentId,
				roundNumber: opts.roundNumber,
				courtNumber: assignment.courtNumber,
				token: crypto.randomBytes(16).toString('hex'),
				courtSize: size,
				player1Id: assignment.playerIds[0],
				player2Id: assignment.playerIds[1],
				player3Id: assignment.playerIds.length > 2 ? assignment.playerIds[2] : null,
				player4Id: assignment.playerIds.length > 3 ? assignment.playerIds[3] : null,
				player5Id: assignment.playerIds.length > 4 ? assignment.playerIds[4] : null,
				player6Id: assignment.playerIds.length > 5 ? assignment.playerIds[5] : null
			})
			.returning();
		const matchRows = buildMatchInsertRows(
			assignment,
			opts.courtSizes,
			newRotation.id,
			opts.scoring,
			opts.scoringOverrides
		);
		if (matchRows.length > 0) {
			await db.insert(match).values(matchRows);
		}
	}

	await db
		.update(tournament)
		.set({ lastActivityAt: new Date() })
		.where(eq(tournament.id, opts.tournamentId));
}

export async function startTournament(opts: {
	tournamentId: number;
	orgId: string;
	checkedInOnly: boolean;
}): Promise<{ id: number }> {
	const [tourney] = await db
		.select()
		.from(tournament)
		.where(and(eq(tournament.id, opts.tournamentId), eq(tournament.orgId, opts.orgId)));
	if (!tourney) throw new StartTournamentError('not_found');
	if (tourney.status !== 'setup') throw new StartTournamentError('not_setup');

	let players = await db
		.select()
		.from(player)
		.where(eq(player.tournamentId, opts.tournamentId))
		.orderBy(player.id);

	if (opts.checkedInOnly) {
		const toDelete = players.filter((p) => !p.checkedInAt);
		if (toDelete.length > 0) {
			await db.delete(player).where(
				inArray(
					player.id,
					toDelete.map((p) => p.id)
				)
			);
		}
		players = players.filter((p) => p.checkedInAt);
	}

	const plan = planTournamentStart({
		formatType: tourney.formatType as FormatType,
		players,
		storedNumRounds: tourney.numRounds
	});

	for (const p of plan.rankedPlayers) {
		await db.update(player).set({ seedRank: p.seedRank }).where(eq(player.id, p.id));
	}

	await ensureCourtsExist(opts.tournamentId, plan.courtSizes.length);

	const initState = createInitialState({
		tournamentId: opts.tournamentId,
		formatType: tourney.formatType as FormatType,
		playerCount: players.length,
		numRounds: plan.numRounds,
		physicalCourtCount: tourney.physicalCourtCount ?? 4,
		courtSizes: plan.courtSizes
	});
	const withPlayers = addPlayers(
		initState,
		plan.rankedPlayers.map((p) => ({
			id: p.id,
			name: players.find((row) => row.id === p.id)?.name ?? String(p.id),
			seedPoints: p.seedPoints,
			seedRank: p.seedRank
		}))
	);
	const started = startRound(withPlayers);
	prevalidateAssignments(started.currentAssignments, plan.courtSizes);

	const scoring = {
		pointsToWin: tourney.pointsToWin ?? 21,
		setsToWin: tourney.setsToWin ?? 1,
		decidingSetPoints: tourney.decidingSetPoints ?? 15,
		winBy: tourney.winBy ?? 2
	};
	await rebuildCurrentRound({
		tournamentId: opts.tournamentId,
		roundNumber: 1,
		assignments: started.currentAssignments,
		courtSizes: plan.courtSizes,
		scoring,
		scoringOverrides: tourney.scoringOverrides
	});

	const claimed = await db
		.update(tournament)
		.set({
			status: 'active',
			currentRound: 1,
			numRounds: plan.numRounds,
			courtSizes: JSON.stringify(plan.courtSizes),
			playerCount: players.length,
			startedAt: new Date(),
			lastActivityAt: new Date()
		})
		.where(and(eq(tournament.id, opts.tournamentId), eq(tournament.status, 'setup')))
		.returning({ id: tournament.id });

	if (claimed.length === 0) throw new StartTournamentError('conflict');
	return claimed[0];
}
