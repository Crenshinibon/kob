import * as v from 'valibot';
import { error } from '@sveltejs/kit';
import { redirectLocalized } from '$lib/i18n/redirect';
import { form, command, getRequestEvent } from '$app/server';
import * as m from '$lib/paraglide/messages';
import { db } from '$lib/server/db';
import { tournament, player, courtRotation, match, court } from '$lib/server/db/schema';
import { eq, and, inArray, isNull, or, asc } from 'drizzle-orm';
import crypto from 'crypto';
import {
	createInitialState,
	addPlayers,
	startRound,
	closeRound,
	calculateCourtSizes,
	calculateCourtStandings,
	recalculateCourtConfigAfterRetirement,
	computeRetirementFinalStanding,
	buildRedistributionFromResults,
	resolveAssignmentsAfterRetirement,
	resolveAssignmentsAfterUndoRetirement,
	hasFreshScoresAfterInjury,
	generateAllMatchesForAssignment,
	getMaxSets,
	getEffectiveScoring,
	getFinalRoundCourtConfig,
	getFrozenCourts,
	resolvePreseedRetirement,
	resolveForwardRetirement,
	processPreseedTransition,
	applyReplacementSlot,
	DEFAULT_TIE_BREAK_CONFIG,
	normalizeTieBreakConfig,
	buildStandingsTieBreakContext,
	isValidManualRankOrder,
	type TieBreakConfig,
	type TieBreakFactorId,
	type FormatType,
	type MatchData,
	type CourtAssignment,
	type PreseedRetirementPolicy
} from '$lib/server/tournament-logic';
import { getTournamentData } from './tournament-data.remote';
import { buildCompletedRoundsBefore } from '$lib/server/court-standings-service';

function parseCourtSizes(tourney: typeof tournament.$inferSelect): number[] {
	return tourney.courtSizes
		? JSON.parse(tourney.courtSizes)
		: calculateCourtSizes(tourney.playerCount);
}

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

function rotationsToAssignments(
	rotations: readonly (typeof courtRotation.$inferSelect)[]
): CourtAssignment[] {
	return rotations.map((rotation) => ({
		courtNumber: rotation.courtNumber,
		playerIds: rotationPlayerIds(rotation)
	}));
}

export const closeRoundForm = form(
	v.object({
		tournamentId: v.pipe(v.number(), v.minValue(1))
	}),
	async ({ tournamentId }) => {
		const event = getRequestEvent();
		const user = event.locals.user;
		if (!user) error(401, m.login_prompt());

		const [tourney] = await db
			.select()
			.from(tournament)
			.where(and(eq(tournament.id, tournamentId), eq(tournament.orgId, user.id)));

		if (!tourney) error(404, m.tournament_not_found());
		if (tourney.status !== 'active') error(400, m.tournament_not_active());

		const currentRound = tourney.currentRound || 1;

		const dbPlayers = await db.select().from(player).where(eq(player.tournamentId, tournamentId));
		const activeDbPlayers = dbPlayers.filter((p) => !p.retiredAt);
		const players = activeDbPlayers.map((p) => ({
			id: p.id,
			name: p.name,
			seedPoints: p.seedPoints,
			seedRank: p.seedRank
		}));

		const retiredPlayerIds = new Set(dbPlayers.filter((p) => p.retiredAt).map((p) => p.id));
		const activePlayerCount = activeDbPlayers.length;

		let courtSizes: number[] = parseCourtSizes(tourney);
		const physicalCourtCount = tourney.physicalCourtCount ?? 4;

		// If player count changed due to retirements, recalculate court sizes
		if (activePlayerCount !== tourney.playerCount) {
			const newConfig = recalculateCourtConfigAfterRetirement(activePlayerCount);
			courtSizes = newConfig.courtSizes;
			await db
				.update(tournament)
				.set({
					playerCount: activePlayerCount,
					courtSizes: JSON.stringify(courtSizes),
					lastActivityAt: new Date()
				})
				.where(eq(tournament.id, tournamentId));
		}

		const initState = createInitialState({
			tournamentId: tourney.id,
			formatType: tourney.formatType as FormatType,
			playerCount: activePlayerCount,
			numRounds: tourney.numRounds,
			physicalCourtCount,
			tieBreakConfig: tourney.tieBreakConfig ?? undefined
		});

		const stateWithPlayers = addPlayers(initState, players);

		const currentRotations = await db
			.select()
			.from(courtRotation)
			.where(
				and(
					eq(courtRotation.tournamentId, tournamentId),
					eq(courtRotation.roundNumber, currentRound)
				)
			)
			.orderBy(asc(courtRotation.courtNumber));

		const currentAssignmentsFromDb = rotationsToAssignments(currentRotations);

		const allMatches: MatchData[] = [];
		for (const rotation of currentRotations) {
			const rotationMatches = await db
				.select()
				.from(match)
				.where(eq(match.courtRotationId, rotation.id));
			for (const m of rotationMatches) {
				allMatches.push({
					teamAPlayer1Id: m.teamAPlayer1Id,
					teamAPlayer2Id: m.teamAPlayer2Id,
					teamBPlayer1Id: m.teamBPlayer1Id,
					teamBPlayer2Id: m.teamBPlayer2Id,
					teamAScore: m.teamAScore,
					teamBScore: m.teamBScore,
					isCanceled: m.isCanceled ?? false,
					injuredPlayerIds: m.injuredPlayerIds ?? undefined
				});
			}
		}

		// Compute frozen courts to determine active court sizes for closeRound
		const originalCourtSizes = calculateCourtSizes(tourney.playerCount);
		const frozenCourtsForRound =
			tourney.formatType === 'preseed'
				? getFrozenCourts(originalCourtSizes, currentRound - 1, 'preseed')
				: [];
		const frozenCourtNumbers = new Set(frozenCourtsForRound.map((f) => f.courtNumber));

		// Use only active (non-frozen) court sizes for closeRound
		const activeCourtSizes =
			frozenCourtsForRound.length > 0
				? courtSizes.filter((_, i) => !frozenCourtNumbers.has(i + 1))
				: courtSizes;

		const startedState = startRound(stateWithPlayers);

		const manualRankByCourt = new Map<number, number[]>();
		for (const rotation of currentRotations) {
			if (rotation.manualRankOrder?.length) {
				manualRankByCourt.set(rotation.courtNumber, rotation.manualRankOrder);
			}
		}

		const closedState = closeRound(
			{
				...startedState,
				roundsCompleted: currentRound - 1,
				currentAssignments: currentAssignmentsFromDb,
				currentMatches: allMatches
			},
			activeCourtSizes,
			manualRankByCourt
		);

		if (closedState.isComplete) {
			const finalRoundResults = closedState.completedRounds[closedState.completedRounds.length - 1];
			const activeIds = new Set(dbPlayers.filter((p) => !p.retiredAt).map((p) => p.id));

			let position = 1;
			const standingsByPlayer = new Map<number, number>();
			for (const court of finalRoundResults) {
				for (const cs of court.standings) {
					if (activeIds.has(cs.playerId)) {
						standingsByPlayer.set(cs.playerId, position++);
					}
				}
			}

			for (const [playerId, standing] of standingsByPlayer) {
				await db.update(player).set({ finalStanding: standing }).where(eq(player.id, playerId));
			}

			const retiredWithoutStanding = dbPlayers.filter(
				(p) => p.retiredAt && p.finalStanding === null
			);
			for (const rp of retiredWithoutStanding) {
				await db
					.update(player)
					.set({ finalStanding: activePlayerCount })
					.where(eq(player.id, rp.id));
			}

			await db
				.update(tournament)
				.set({
					status: 'completed',
					currentRound: closedState.roundsCompleted,
					lastActivityAt: new Date()
				})
				.where(eq(tournament.id, tournamentId));

			getTournamentData({ tournamentId }).refresh();

			redirectLocalized(303, `/tournament/${tournamentId}/standings`, getRequestEvent());
		}

		let nextAssignments = closedState.nextAssignments;
		let nextCourtSizes = courtSizes;
		const nextRoundNumber = closedState.roundsCompleted + 1;

		const justClosedResults =
			closedState.completedRounds[closedState.completedRounds.length - 1] ?? [];
		const formatType = tourney.formatType as FormatType;
		const forwardFrozenCourts =
			formatType === 'preseed'
				? getFrozenCourts(
						calculateCourtSizes(tourney.playerCount),
						closedState.roundsCompleted,
						'preseed'
					)
				: [];
		const forwardFrozenNumbers = new Set(forwardFrozenCourts.map((f) => f.courtNumber));
		const replacements = dbPlayers
			.filter((p) => p.replacesPlayerId !== null && !p.retiredAt)
			.map((p) => ({
				retiredPlayerId: p.replacesPlayerId!,
				replacementPlayerId: p.id
			}));
		const policy = (tourney.preseedRetirementPolicy as PreseedRetirementPolicy) ?? 'cascade';

		if (retiredPlayerIds.size > 0 && !closedState.isComplete) {
			nextAssignments = resolveForwardRetirement({
				formatType,
				policy,
				templateAssignments: nextAssignments,
				previousRoundResults: justClosedResults,
				retiredPlayerIds,
				replacements,
				newCourtSizes: courtSizes,
				originalCourtCount: calculateCourtSizes(tourney.playerCount).length,
				roundsCompleted: closedState.roundsCompleted - 1,
				frozenCourtNumbers: forwardFrozenNumbers
			});
		}

		// Exclude frozen courts (preseed format only)
		if (tourney.formatType === 'preseed') {
			const originalCourtSizes = calculateCourtSizes(tourney.playerCount);
			const frozenCourts = getFrozenCourts(
				originalCourtSizes,
				closedState.roundsCompleted,
				'preseed'
			);
			if (frozenCourts.length > 0) {
				const frozenNumbers = new Set(frozenCourts.map((f) => f.courtNumber));
				nextAssignments = nextAssignments.filter((a) => !frozenNumbers.has(a.courtNumber));
				nextCourtSizes = nextAssignments.map((a) => a.playerIds.length);
			}
		}

		// Apply final round elimination if needed
		const isFinalRound = nextRoundNumber >= tourney.numRounds;
		if (isFinalRound) {
			const playerIdsByCourt = nextAssignments.map((a) => [...a.playerIds]);
			const finalConfig = getFinalRoundCourtConfig(courtSizes, playerIdsByCourt);
			nextCourtSizes = finalConfig.courtSizes;
			if (finalConfig.eliminatedPlayerIds.length > 0) {
				// Trim assignments to 4 players for the top court
				nextAssignments = nextAssignments.map((a, i) => ({
					...a,
					playerIds: i === 0 ? a.playerIds.slice(0, Math.min(4, a.playerIds.length)) : a.playerIds
				}));
			}
		}

		// Delete any existing next round data (in case of partial state from retirement)
		const existingNextRotations = await db
			.select()
			.from(courtRotation)
			.where(
				and(
					eq(courtRotation.tournamentId, tournamentId),
					eq(courtRotation.roundNumber, nextRoundNumber)
				)
			);
		if (existingNextRotations.length > 0) {
			const existingIds = existingNextRotations.map((r) => r.id);
			await db.delete(match).where(inArray(match.courtRotationId, existingIds));
			await db
				.delete(courtRotation)
				.where(
					and(
						eq(courtRotation.tournamentId, tournamentId),
						eq(courtRotation.roundNumber, nextRoundNumber)
					)
				);
		}

		for (const assignment of nextAssignments) {
			const idx = assignment.courtNumber - 1;
			const size =
				assignment.playerIds.length > 4
					? (nextCourtSizes[idx] ?? assignment.playerIds.length)
					: assignment.playerIds.length;

			const [existingCourt] = await db
				.select()
				.from(court)
				.where(
					and(eq(court.tournamentId, tournamentId), eq(court.courtNumber, assignment.courtNumber))
				);

			const roundToken = crypto.randomBytes(16).toString('hex');
			const [rotation] = await db
				.insert(courtRotation)
				.values({
					courtId: existingCourt.id,
					tournamentId: tournamentId,
					roundNumber: nextRoundNumber,
					courtNumber: assignment.courtNumber,
					token: roundToken,
					courtSize: size,
					player1Id: assignment.playerIds[0],
					player2Id: assignment.playerIds[1],
					player3Id: assignment.playerIds.length > 2 ? assignment.playerIds[2] : null,
					player4Id: assignment.playerIds.length > 3 ? assignment.playerIds[3] : null,
					player5Id: assignment.playerIds.length > 4 ? assignment.playerIds[4] : null,
					player6Id: assignment.playerIds.length > 5 ? assignment.playerIds[5] : null
				})
				.returning();

			const allMatchesForCourt = generateAllMatchesForAssignment(assignment, nextCourtSizes);

			const effective = getEffectiveScoring(
				size,
				{
					pointsToWin: tourney.pointsToWin ?? 21,
					setsToWin: tourney.setsToWin ?? 1,
					decidingSetPoints: tourney.decidingSetPoints ?? 15,
					winBy: tourney.winBy ?? 2
				},
				tourney.scoringOverrides as Record<
					string,
					{ pointsToWin?: number; setsToWin?: number; decidingSetPoints?: number }
				>
			);
			const maxSets = getMaxSets(effective.setsToWin);

			for (let mi = 0; mi < allMatchesForCourt.length; mi++) {
				const m = allMatchesForCourt[mi];
				for (let setNum = 1; setNum <= maxSets; setNum++) {
					await db.insert(match).values({
						courtRotationId: rotation.id,
						matchNumber: mi + 1,
						setNumber: setNum,
						teamAPlayer1Id: m.teamAPlayer1Id,
						teamAPlayer2Id: m.teamAPlayer2Id,
						teamBPlayer1Id: m.teamBPlayer1Id,
						teamBPlayer2Id: m.teamBPlayer2Id
					});
				}
			}
		}

		// Deactivate all courts for current round, activate for next round
		const allCourts = await db.select().from(court).where(eq(court.tournamentId, tournamentId));

		for (const c of allCourts) {
			await db.update(court).set({ isActive: false }).where(eq(court.id, c.id));
		}

		const newRotations = await db
			.select()
			.from(courtRotation)
			.where(
				and(
					eq(courtRotation.tournamentId, tournamentId),
					eq(courtRotation.roundNumber, nextRoundNumber)
				)
			)
			.orderBy(courtRotation.courtNumber);

		for (let i = 0; i < newRotations.length; i++) {
			await db.update(court).set({ isActive: true }).where(eq(court.id, newRotations[i].courtId));
		}

		await db
			.update(tournament)
			.set({
				currentRound: nextRoundNumber,
				courtSizes: JSON.stringify(nextCourtSizes),
				lastActivityAt: new Date()
			})
			.where(eq(tournament.id, tournamentId));

		await db
			.update(tournament)
			.set({ lastActivityAt: new Date() })
			.where(eq(tournament.id, tournamentId));

		getTournamentData({ tournamentId }).refresh();

		return { success: true };
	}
);

export const setCourtLabel = command(
	v.object({
		courtId: v.pipe(v.number(), v.minValue(1)),
		label: v.string()
	}),
	async ({ courtId, label }) => {
		const event = getRequestEvent();
		const user = event.locals.user;
		if (!user) error(401, m.login_prompt());

		const [courtRecord] = await db.select().from(court).where(eq(court.id, courtId));
		if (!courtRecord) error(404, m.not_found());

		const [tourney] = await db
			.select()
			.from(tournament)
			.where(and(eq(tournament.id, courtRecord.tournamentId), eq(tournament.orgId, user.id)));
		if (!tourney) error(404, m.tournament_not_found());

		await db
			.update(court)
			.set({ label: label.trim() || null })
			.where(eq(court.id, courtId));

		getTournamentData({ tournamentId: tourney.id }).refresh();

		return { success: true };
	}
);

export const deleteTournamentForm = form(
	v.object({
		tournamentId: v.pipe(v.number(), v.minValue(1))
	}),
	async ({ tournamentId }) => {
		const event = getRequestEvent();
		const user = event.locals.user;
		if (!user) error(401, m.unauthorized());

		const [tourney] = await db
			.select()
			.from(tournament)
			.where(and(eq(tournament.id, tournamentId), eq(tournament.orgId, user.id)));

		if (!tourney) error(404, m.tournament_not_found());

		const rotations = await db
			.select()
			.from(courtRotation)
			.where(eq(courtRotation.tournamentId, tournamentId));

		for (const rotation of rotations) {
			await db.delete(match).where(eq(match.courtRotationId, rotation.id));
		}

		await db.delete(courtRotation).where(eq(courtRotation.tournamentId, tournamentId));
		await db.delete(court).where(eq(court.tournamentId, tournamentId));
		await db.delete(player).where(eq(player.tournamentId, tournamentId));
		await db.delete(tournament).where(eq(tournament.id, tournamentId));

		redirectLocalized(303, '/', getRequestEvent());
	}
);

export const updateScoringOverrides = command(
	v.object({
		tournamentId: v.pipe(v.number(), v.minValue(1)),
		overrides: v.record(
			v.string(),
			v.object({
				pointsToWin: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(50))),
				winBy: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(10))),
				setsToWin: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(5))),
				decidingSetPoints: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(50)))
			})
		)
	}),
	async ({ tournamentId, overrides }) => {
		const event = getRequestEvent();
		const user = event.locals.user;
		if (!user) error(401, m.unauthorized());

		const [tourney] = await db
			.select()
			.from(tournament)
			.where(and(eq(tournament.id, tournamentId), eq(tournament.orgId, user.id)));

		if (!tourney) error(404, m.tournament_not_found());

		await db
			.update(tournament)
			.set({ scoringOverrides: overrides, lastActivityAt: new Date() })
			.where(eq(tournament.id, tournamentId));

		getTournamentData({ tournamentId }).refresh();

		return { success: true };
	}
);

const tieBreakFactorSchema = v.picklist([
	'round_points',
	'round_diff',
	'total_points',
	'total_diff',
	'initial_order',
	'dice',
	'manual'
]);

export const updateTieBreakConfig = command(
	v.object({
		tournamentId: v.pipe(v.number(), v.minValue(1)),
		factors: v.array(
			v.object({
				id: tieBreakFactorSchema,
				enabled: v.boolean()
			})
		)
	}),
	async ({ tournamentId, factors }) => {
		const event = getRequestEvent();
		const user = event.locals.user;
		if (!user) error(401, m.unauthorized());

		const [tourney] = await db
			.select()
			.from(tournament)
			.where(and(eq(tournament.id, tournamentId), eq(tournament.orgId, user.id)));

		if (!tourney) error(404, m.tournament_not_found());

		const config: TieBreakConfig = { factors };
		await db
			.update(tournament)
			.set({ tieBreakConfig: config, lastActivityAt: new Date() })
			.where(eq(tournament.id, tournamentId));

		getTournamentData({ tournamentId }).refresh();

		return { success: true };
	}
);

export const updateManualRankOrder = command(
	v.object({
		rotationId: v.pipe(v.number(), v.minValue(1)),
		playerIds: v.array(v.pipe(v.number(), v.minValue(1)))
	}),
	async ({ rotationId, playerIds: submittedOrder }) => {
		const event = getRequestEvent();
		const user = event.locals.user;
		if (!user) error(401, m.unauthorized());

		const [rotation] = await db
			.select()
			.from(courtRotation)
			.where(eq(courtRotation.id, rotationId));

		if (!rotation) error(404, m.not_found());

		const [tourney] = await db
			.select()
			.from(tournament)
			.where(and(eq(tournament.id, rotation.tournamentId), eq(tournament.orgId, user.id)));

		if (!tourney) error(404, m.tournament_not_found());
		if (tourney.status !== 'active' || rotation.roundNumber !== (tourney.currentRound || 0)) {
			error(400, m.err_court_read_only());
		}

		const rotationPlayerIdsList = rotationPlayerIds(rotation);
		const dbPlayers = await db
			.select()
			.from(player)
			.where(eq(player.tournamentId, tourney.id));
		const courtSizes = parseCourtSizes(tourney);
		const tieBreakConfig = normalizeTieBreakConfig(tourney.tieBreakConfig ?? null);
		const completedRounds = await buildCompletedRoundsBefore(
			tourney.id,
			rotation.roundNumber,
			courtSizes,
			dbPlayers.map((p) => ({
				id: p.id,
				name: p.name,
				seedPoints: p.seedPoints,
				seedRank: p.seedRank
			})),
			tieBreakConfig
		);
		const matchRows = await db.select().from(match).where(eq(match.courtRotationId, rotationId));
		const matchData: MatchData[] = matchRows.map((m) => ({
			teamAPlayer1Id: m.teamAPlayer1Id,
			teamAPlayer2Id: m.teamAPlayer2Id,
			teamBPlayer1Id: m.teamBPlayer1Id,
			teamBPlayer2Id: m.teamBPlayer2Id,
			teamAScore: m.teamAScore,
			teamBScore: m.teamBScore,
			isCanceled: m.isCanceled ?? false,
			injuredPlayerIds: m.injuredPlayerIds ?? undefined
		}));
		const tbContext = buildStandingsTieBreakContext(matchData, rotationPlayerIdsList, {
			tieBreakConfig,
			completedRounds,
			courtSizes,
			players: dbPlayers.map((p) => ({
				id: p.id,
				name: p.name,
				seedPoints: p.seedPoints,
				seedRank: p.seedRank
			}))
		});

		if (
			!isValidManualRankOrder(
				rotationPlayerIdsList,
				submittedOrder,
				tieBreakConfig,
				tbContext.context
			)
		) {
			error(400, m.err_manual_rank_invalid());
		}

		await db
			.update(courtRotation)
			.set({ manualRankOrder: submittedOrder })
			.where(eq(courtRotation.id, rotationId));

		getTournamentData({ tournamentId: tourney.id }).refresh();

		return { success: true };
	}
);

export const retirePlayer = command(
	v.object({
		tournamentId: v.pipe(v.number(), v.minValue(1)),
		playerId: v.pipe(v.number(), v.minValue(1)),
		reason: v.optional(v.string()),
		useReplacement: v.optional(v.boolean()),
		replacementName: v.optional(v.string()),
		replacementSeedPoints: v.optional(v.number())
	}),
	async ({
		tournamentId,
		playerId,
		reason,
		useReplacement,
		replacementName,
		replacementSeedPoints
	}) => {
		const event = getRequestEvent();
		const user = event.locals.user;
		if (!user) error(401, m.unauthorized());

		const [tourney] = await db
			.select()
			.from(tournament)
			.where(and(eq(tournament.id, tournamentId), eq(tournament.orgId, user.id)));
		if (!tourney) error(404, m.tournament_not_found());
		if (tourney.status !== 'active') error(400, m.tournament_not_active());

		const [targetPlayer] = await db
			.select()
			.from(player)
			.where(and(eq(player.id, playerId), eq(player.tournamentId, tournamentId)));
		if (!targetPlayer) error(404, m.player_not_found());
		if (targetPlayer.retiredAt) error(400, m.err_player_already_retired());

		const currentRound = tourney.currentRound || 0;
		if (currentRound === 0) error(400, m.tournament_not_started());

		const currentRotations = await db
			.select()
			.from(courtRotation)
			.where(
				and(
					eq(courtRotation.tournamentId, tournamentId),
					eq(courtRotation.roundNumber, currentRound)
				)
			);

		const playerRotation = currentRotations.find(
			(r) =>
				r.player1Id === playerId ||
				r.player2Id === playerId ||
				r.player3Id === playerId ||
				r.player4Id === playerId ||
				r.player5Id === playerId ||
				r.player6Id === playerId
		);

		if (!playerRotation) error(400, m.err_player_not_in_round());

		const rotationMatches = await db
			.select()
			.from(match)
			.where(eq(match.courtRotationId, playerRotation.id));
		const hasScores = rotationMatches.some((m) => m.teamAScore !== null);

		if (hasScores) {
			error(400, m.err_injury_scores_entered());
		}

		const dbPlayers = await db.select().from(player).where(eq(player.tournamentId, tournamentId));
		const priorRetirees = dbPlayers.filter((p) => p.retiredAt && p.id !== playerId);
		const activePlayers = dbPlayers.filter((p) => !p.retiredAt && p.id !== playerId);

		const formatType = tourney.formatType as FormatType;
		const originalCourtSizes = calculateCourtSizes(tourney.playerCount);
		const frozenCourts =
			formatType === 'preseed'
				? getFrozenCourts(originalCourtSizes, currentRound - 1, 'preseed')
				: [];
		const frozenCourtNumbers = new Set(frozenCourts.map((f) => f.courtNumber));
		const isFrozenCourt = frozenCourtNumbers.has(playerRotation.courtNumber);

		if (useReplacement) {
			if (isFrozenCourt) error(400, m.err_replace_frozen_court());
			const name = replacementName?.trim();
			if (!name) error(400, m.err_replace_name_required());
			const duplicate = dbPlayers.some(
				(p) => p.name.toLowerCase() === name.toLowerCase() && !p.retiredAt
			);
			if (duplicate) error(400, m.err_replace_duplicate_name());
		}

		const replacing = Boolean(useReplacement && replacementName?.trim());
		const activeCount = replacing ? tourney.playerCount - 1 : activePlayers.length;
		const newConfig = replacing
			? { courtSizes: parseCourtSizes(tourney), totalCourts: parseCourtSizes(tourney).length }
			: recalculateCourtConfigAfterRetirement(activePlayers.length);
		const newCourtSizes = newConfig.courtSizes;

		const totalCourts = currentRotations.length;
		const finalStanding = computeRetirementFinalStanding({
			formatType: tourney.formatType as FormatType,
			retiredCourt: playerRotation.courtNumber,
			totalCourts,
			currentRound,
			numRounds: tourney.numRounds,
			newCourtSizes,
			priorRetirees: priorRetirees.map((p) => ({
				retiredCourt: p.retiredCourt,
				finalStanding: p.finalStanding
			}))
		});

		await db
			.update(player)
			.set({
				retiredAt: new Date(),
				retiredRound: currentRound,
				retiredCourt: playerRotation.courtNumber,
				retirementReason: reason ?? null,
				finalStanding
			})
			.where(eq(player.id, playerId));

		let replacementPlayerId: number | undefined;
		if (replacing) {
			const [replacement] = await db
				.insert(player)
				.values({
					tournamentId,
					name: replacementName!.trim(),
					seedPoints:
						formatType === 'preseed' ? (replacementSeedPoints ?? 0) : null,
					seedRank: null,
					replacesPlayerId: playerId
				})
				.returning();
			replacementPlayerId = replacement.id;
			await db
				.update(player)
				.set({ replacedByPlayerId: replacement.id })
				.where(eq(player.id, playerId));
		}

		await db
			.update(tournament)
			.set({
				playerCount: replacing ? tourney.playerCount : activeCount,
				courtSizes: JSON.stringify(newCourtSizes),
				lastActivityAt: new Date()
			})
			.where(eq(tournament.id, tournamentId));

		if (isFrozenCourt) {
			getTournamentData({ tournamentId }).refresh();
			return { success: true };
		}

		const currentAssignments = rotationsToAssignments(currentRotations);

		const currentRotationIds = currentRotations
			.filter((r) => !frozenCourtNumbers.has(r.courtNumber))
			.map((r) => r.id);

		if (currentRotationIds.length > 0) {
			await db.delete(match).where(inArray(match.courtRotationId, currentRotationIds));
			const activeCourtNumbers = currentRotations
				.filter((r) => !frozenCourtNumbers.has(r.courtNumber))
				.map((r) => r.courtNumber);
			await db
				.delete(courtRotation)
				.where(
					and(
						eq(courtRotation.tournamentId, tournamentId),
						eq(courtRotation.roundNumber, currentRound),
						inArray(courtRotation.courtNumber, activeCourtNumbers)
					)
				);
		} else if (frozenCourtNumbers.size === 0) {
			await db
				.delete(courtRotation)
				.where(
					and(
						eq(courtRotation.tournamentId, tournamentId),
						eq(courtRotation.roundNumber, currentRound)
					)
				);
		}

		const prevRound = currentRound - 1;
		let nextAssignments: { courtNumber: number; playerIds: readonly number[] }[];

		if (prevRound === 0) {
			const formatType = tourney.formatType as FormatType;
			const allActivePlayerIds = activePlayers.map((p) => p.id);
			if (formatType === 'random-seed') {
				for (let i = allActivePlayerIds.length - 1; i > 0; i--) {
					const j = Math.floor(Math.random() * (i + 1));
					[allActivePlayerIds[i], allActivePlayerIds[j]] = [
						allActivePlayerIds[j],
						allActivePlayerIds[i]
					];
				}
			} else {
				allActivePlayerIds.sort(
					(a, b) =>
						(activePlayers.find((p) => p.id === b)?.seedPoints ?? 0) -
						(activePlayers.find((p) => p.id === a)?.seedPoints ?? 0)
				);
			}

			const courts: { courtNumber: number; playerIds: number[] }[] = [];
			for (let i = 0; i < newCourtSizes.length; i++) {
				courts.push({ courtNumber: i + 1, playerIds: [] });
			}
			let idx = 0;
			for (let pos = 0; pos < 4; pos++) {
				const fwd = pos % 2 === 0;
				for (let c = 0; c < newCourtSizes.length; c++) {
					const courtIdx = fwd ? c : newCourtSizes.length - 1 - c;
					if (idx < allActivePlayerIds.length) {
						courts[courtIdx].playerIds.push(allActivePlayerIds[idx]);
						idx++;
					}
				}
			}
			nextAssignments = courts.filter((c) => c.playerIds.length > 0);
		} else {
			const prevRotations = await db
				.select()
				.from(courtRotation)
				.where(
					and(
						eq(courtRotation.tournamentId, tournamentId),
						eq(courtRotation.roundNumber, prevRound)
					)
				)
				.orderBy(asc(courtRotation.courtNumber));

			const resolved = await Promise.all(
				prevRotations.map(async (rotation) => {
					const prevMatches = await db
						.select()
						.from(match)
						.where(eq(match.courtRotationId, rotation.id));
					return { rotation, matchData: prevMatches as MatchData[] };
				})
			);

			const retiredIds = new Set([playerId, ...priorRetirees.map((p) => p.id)]);

			const results = resolved.map((cr) => {
				const pIds = rotationPlayerIds(cr.rotation);
				return {
					courtNumber: cr.rotation.courtNumber,
					standings: calculateCourtStandings(cr.matchData, pIds)
				};
			});

			if (formatType === 'preseed') {
				const policy = (tourney.preseedRetirementPolicy as PreseedRetirementPolicy) ?? 'cascade';
				nextAssignments = resolvePreseedRetirement({
					assignments: currentAssignments,
					prevResults: results,
					retiredPlayerId: playerId,
					policy,
					newCourtSizes,
					frozenCourtNumbers,
					replacementPlayerId
				});
			} else {
				nextAssignments = buildRedistributionFromResults(
					formatType,
					results,
					newCourtSizes,
					prevRound - 1,
					calculateCourtSizes(tourney.playerCount).length,
					retiredIds
				);
			}
		}

		const finalAssignments = resolveAssignmentsAfterRetirement({
			formatType: tourney.formatType as FormatType,
			redistributedAssignments: nextAssignments,
			originalPlayerCount: tourney.playerCount,
			roundsCompleted: prevRound
		});

		for (const assignment of finalAssignments) {
			const idx = assignment.courtNumber - 1;
			const size =
				assignment.playerIds.length > 4
					? (newCourtSizes[idx] ?? assignment.playerIds.length)
					: assignment.playerIds.length;

			const [existingCourt] = await db
				.select()
				.from(court)
				.where(
					and(eq(court.tournamentId, tournamentId), eq(court.courtNumber, assignment.courtNumber))
				);

			const roundToken = crypto.randomBytes(16).toString('hex');
			const [newRotation] = await db
				.insert(courtRotation)
				.values({
					courtId: existingCourt.id,
					tournamentId: tournamentId,
					roundNumber: currentRound,
					courtNumber: assignment.courtNumber,
					token: roundToken,
					courtSize: size,
					player1Id: assignment.playerIds[0],
					player2Id: assignment.playerIds[1],
					player3Id: assignment.playerIds.length > 2 ? assignment.playerIds[2] : null,
					player4Id: assignment.playerIds.length > 3 ? assignment.playerIds[3] : null,
					player5Id: assignment.playerIds.length > 4 ? assignment.playerIds[4] : null,
					player6Id: assignment.playerIds.length > 5 ? assignment.playerIds[5] : null
				})
				.returning();

			const allMatchesForCourt = generateAllMatchesForAssignment(
				{ courtNumber: assignment.courtNumber, playerIds: assignment.playerIds },
				newCourtSizes
			);

			const effective = getEffectiveScoring(
				size,
				{
					pointsToWin: tourney.pointsToWin ?? 21,
					setsToWin: tourney.setsToWin ?? 1,
					decidingSetPoints: tourney.decidingSetPoints ?? 15,
					winBy: tourney.winBy ?? 2
				},
				tourney.scoringOverrides as Record<
					string,
					{ pointsToWin?: number; setsToWin?: number; decidingSetPoints?: number }
				>
			);
			const maxSets = getMaxSets(effective.setsToWin);

			for (let mi = 0; mi < allMatchesForCourt.length; mi++) {
				const m = allMatchesForCourt[mi];
				for (let setNum = 1; setNum <= maxSets; setNum++) {
					await db.insert(match).values({
						courtRotationId: newRotation.id,
						matchNumber: mi + 1,
						setNumber: setNum,
						teamAPlayer1Id: m.teamAPlayer1Id,
						teamAPlayer2Id: m.teamAPlayer2Id,
						teamBPlayer1Id: m.teamBPlayer1Id,
						teamBPlayer2Id: m.teamBPlayer2Id
					});
				}
			}
		}

		await db
			.update(tournament)
			.set({ lastActivityAt: new Date() })
			.where(eq(tournament.id, tournamentId));

		getTournamentData({ tournamentId }).refresh();

		return { success: true };
	}
);

export const reportInjury = command(
	v.object({
		tournamentId: v.pipe(v.number(), v.minValue(1)),
		playerId: v.pipe(v.number(), v.minValue(1)),
		option: v.picklist(['substitute', 'cancel']),
		reason: v.optional(v.string()),
		useReplacement: v.optional(v.boolean()),
		replacementName: v.optional(v.string()),
		replacementSeedPoints: v.optional(v.number())
	}),
	async ({
		tournamentId,
		playerId,
		option,
		reason,
		useReplacement,
		replacementName,
		replacementSeedPoints
	}) => {
		const event = getRequestEvent();
		const user = event.locals.user;
		if (!user) error(401, m.unauthorized());

		const [tourney] = await db
			.select()
			.from(tournament)
			.where(and(eq(tournament.id, tournamentId), eq(tournament.orgId, user.id)));
		if (!tourney) error(404, m.tournament_not_found());
		if (tourney.status !== 'active') error(400, m.tournament_not_active());

		const [targetPlayer] = await db
			.select()
			.from(player)
			.where(and(eq(player.id, playerId), eq(player.tournamentId, tournamentId)));
		if (!targetPlayer) error(404, m.player_not_found());
		if (targetPlayer.retiredAt) error(400, m.err_player_already_retired());

		const currentRound = tourney.currentRound || 0;
		if (currentRound === 0) error(400, m.tournament_not_started());

		const currentRotations = await db
			.select()
			.from(courtRotation)
			.where(
				and(
					eq(courtRotation.tournamentId, tournamentId),
					eq(courtRotation.roundNumber, currentRound)
				)
			);

		const playerRotation = currentRotations.find(
			(r) =>
				r.player1Id === playerId ||
				r.player2Id === playerId ||
				r.player3Id === playerId ||
				r.player4Id === playerId ||
				r.player5Id === playerId ||
				r.player6Id === playerId
		);

		if (!playerRotation) error(400, m.err_player_not_in_round());

		const rotationMatches = await db
			.select()
			.from(match)
			.where(eq(match.courtRotationId, playerRotation.id));
		const hasScores = rotationMatches.some((m) => m.teamAScore !== null);

		if (!hasScores) {
			error(400, m.err_retire_scores_entered());
		}

		const formatType = tourney.formatType as FormatType;
		const originalCourtSizes = calculateCourtSizes(tourney.playerCount);
		const frozenCourts =
			formatType === 'preseed'
				? getFrozenCourts(originalCourtSizes, currentRound - 1, 'preseed')
				: [];
		const isFrozenCourt = frozenCourts.some((f) => f.courtNumber === playerRotation.courtNumber);

		if (useReplacement) {
			if (isFrozenCourt) error(400, m.err_replace_frozen_court());
			const name = replacementName?.trim();
			if (!name) error(400, m.err_replace_name_required());
			const dbPlayers = await db
				.select()
				.from(player)
				.where(eq(player.tournamentId, tournamentId));
			const duplicate = dbPlayers.some(
				(p) => p.name.toLowerCase() === name.toLowerCase() && !p.retiredAt
			);
			if (duplicate) error(400, m.err_replace_duplicate_name());
		}

		const replacing = Boolean(useReplacement && replacementName?.trim());

		if (option === 'cancel') {
			await db
				.update(match)
				.set({ isCanceled: true })
				.where(
					and(
						eq(match.courtRotationId, playerRotation.id),
						isNull(match.teamAScore),
						or(
							eq(match.teamAPlayer1Id, playerId),
							eq(match.teamAPlayer2Id, playerId),
							eq(match.teamBPlayer1Id, playerId),
							eq(match.teamBPlayer2Id, playerId)
						)
					)
				);
		} else if (option === 'substitute') {
			await db
				.update(match)
				.set({ injuredPlayerIds: [playerId] })
				.where(
					and(
						eq(match.courtRotationId, playerRotation.id),
						isNull(match.teamAScore),
						or(
							eq(match.teamAPlayer1Id, playerId),
							eq(match.teamAPlayer2Id, playerId),
							eq(match.teamBPlayer1Id, playerId),
							eq(match.teamBPlayer2Id, playerId)
						)
					)
				);
		}

		await db
			.update(player)
			.set({
				injuredAt: new Date(),
				retiredAt: new Date(),
				retiredRound: currentRound,
				retiredCourt: playerRotation.courtNumber,
				retirementReason: reason ?? 'injury'
			})
			.where(eq(player.id, playerId));

		if (replacing) {
			const [replacement] = await db
				.insert(player)
				.values({
					tournamentId,
					name: replacementName!.trim(),
					seedPoints:
						formatType === 'preseed' ? (replacementSeedPoints ?? 0) : null,
					seedRank: null,
					replacesPlayerId: playerId
				})
				.returning();
			await db
				.update(player)
				.set({ replacedByPlayerId: replacement.id })
				.where(eq(player.id, playerId));
		}

		await db
			.update(tournament)
			.set({ lastActivityAt: new Date() })
			.where(eq(tournament.id, tournamentId));

		getTournamentData({ tournamentId }).refresh();

		return { success: true };
	}
);

export const undoRetirement = command(
	v.object({
		tournamentId: v.pipe(v.number(), v.minValue(1)),
		playerId: v.pipe(v.number(), v.minValue(1))
	}),
	async ({ tournamentId, playerId }) => {
		const event = getRequestEvent();
		const user = event.locals.user;
		if (!user) error(401, m.unauthorized());

		const [tourney] = await db
			.select()
			.from(tournament)
			.where(and(eq(tournament.id, tournamentId), eq(tournament.orgId, user.id)));
		if (!tourney) error(404, m.tournament_not_found());
		if (tourney.status !== 'active') error(400, m.tournament_not_active());

		const [targetPlayer] = await db
			.select()
			.from(player)
			.where(and(eq(player.id, playerId), eq(player.tournamentId, tournamentId)));
		if (!targetPlayer) error(404, m.player_not_found());
		if (!targetPlayer.retiredAt) error(400, 'Player is not retired');
		if (targetPlayer.injuredAt) error(400, m.err_wrong_undo_type_injury());

		const currentRound = tourney.currentRound || 0;
		if (currentRound === 0) error(400, m.tournament_not_started());

		// 5-minute undo window
		const FIVE_MIN_MS = 5 * 60 * 1000;
		const elapsed = Date.now() - new Date(targetPlayer.retiredAt).getTime();
		if (elapsed > FIVE_MIN_MS) error(400, m.err_undo_window_expired());

		// Check no scores have been entered on ANY court this round
		const currentRotations = await db
			.select()
			.from(courtRotation)
			.where(
				and(
					eq(courtRotation.tournamentId, tournamentId),
					eq(courtRotation.roundNumber, currentRound)
				)
			);

		const allRotationIds = currentRotations.map((r) => r.id);
		if (allRotationIds.length > 0) {
			const allMatches = await db
				.select()
				.from(match)
				.where(inArray(match.courtRotationId, allRotationIds));
			if (allMatches.some((m) => m.teamAScore !== null)) {
				error(400, m.err_undo_retire_scores_entered());
			}
		}

		const formatType = tourney.formatType as FormatType;
		const originalCourtSizes = calculateCourtSizes(tourney.playerCount);
		const frozenCourts =
			formatType === 'preseed'
				? getFrozenCourts(originalCourtSizes, currentRound - 1, 'preseed')
				: [];
		const frozenCourtNumbers = new Set(frozenCourts.map((f) => f.courtNumber));
		const currentAssignmentsBeforeDelete = rotationsToAssignments(currentRotations);

		const replacementId = targetPlayer.replacedByPlayerId;
		if (replacementId) {
			await db.delete(player).where(eq(player.id, replacementId));
		}

		// Clear retirement fields on player
		await db
			.update(player)
			.set({
				retiredAt: null,
				retiredRound: null,
				retiredCourt: null,
				retirementReason: null,
				finalStanding: null,
				replacedByPlayerId: null
			})
			.where(eq(player.id, playerId));

		const activeRotationIds = currentRotations
			.filter((r) => !frozenCourtNumbers.has(r.courtNumber))
			.map((r) => r.id);

		// Delete current round data (no scores, safe to delete)
		if (activeRotationIds.length > 0) {
			await db.delete(match).where(inArray(match.courtRotationId, activeRotationIds));
			const activeCourtNumbers = currentRotations
				.filter((r) => !frozenCourtNumbers.has(r.courtNumber))
				.map((r) => r.courtNumber);
			await db
				.delete(courtRotation)
				.where(
					and(
						eq(courtRotation.tournamentId, tournamentId),
						eq(courtRotation.roundNumber, currentRound),
						inArray(courtRotation.courtNumber, activeCourtNumbers)
					)
				);
		} else if (frozenCourtNumbers.size === 0 && allRotationIds.length > 0) {
			await db.delete(match).where(inArray(match.courtRotationId, allRotationIds));
			await db
				.delete(courtRotation)
				.where(
					and(
						eq(courtRotation.tournamentId, tournamentId),
						eq(courtRotation.roundNumber, currentRound)
					)
				);
		}

		// Re-run redistribution for current round with player included
		const dbPlayers = await db.select().from(player).where(eq(player.tournamentId, tournamentId));
		const activePlayers = dbPlayers.filter((p) => !p.retiredAt);
		const activeCount = activePlayers.length;

		const prevRound = currentRound - 1;
		const restoredCount = activeCount;
		const restoredConfig = recalculateCourtConfigAfterRetirement(restoredCount);
		const restoredCourtSizes = replacementId
			? parseCourtSizes(tourney)
			: restoredConfig.courtSizes;

		await db
			.update(tournament)
			.set({
				playerCount: restoredCount,
				courtSizes: JSON.stringify(restoredCourtSizes),
				lastActivityAt: new Date()
			})
			.where(eq(tournament.id, tournamentId));

		let assignCourtSizes = restoredCourtSizes;
		let nextAssignments: { courtNumber: number; playerIds: readonly number[] }[];

		if (replacementId && prevRound > 0) {
			nextAssignments = applyReplacementSlot(
				currentAssignmentsBeforeDelete,
				replacementId,
				playerId
			);
		} else if (prevRound === 0) {
			const allActivePlayerIds = activePlayers.map((p) => p.id);
			if (formatType === 'random-seed') {
				for (let i = allActivePlayerIds.length - 1; i > 0; i--) {
					const j = Math.floor(Math.random() * (i + 1));
					[allActivePlayerIds[i], allActivePlayerIds[j]] = [
						allActivePlayerIds[j],
						allActivePlayerIds[i]
					];
				}
			} else {
				allActivePlayerIds.sort(
					(a, b) =>
						(activePlayers.find((p) => p.id === b)?.seedPoints ?? 0) -
						(activePlayers.find((p) => p.id === a)?.seedPoints ?? 0)
				);
			}

			const courts: { courtNumber: number; playerIds: number[] }[] = [];
			for (let i = 0; i < assignCourtSizes.length; i++) {
				courts.push({ courtNumber: i + 1, playerIds: [] });
			}
			let idx = 0;
			for (let pos = 0; pos < 4; pos++) {
				const fwd = pos % 2 === 0;
				for (let c = 0; c < assignCourtSizes.length; c++) {
					const courtIdx = fwd ? c : assignCourtSizes.length - 1 - c;
					if (idx < allActivePlayerIds.length) {
						courts[courtIdx].playerIds.push(allActivePlayerIds[idx]);
						idx++;
					}
				}
			}
			nextAssignments = courts.filter((c) => c.playerIds.length > 0);
		} else {
			const prevRotations = await db
				.select()
				.from(courtRotation)
				.where(
					and(
						eq(courtRotation.tournamentId, tournamentId),
						eq(courtRotation.roundNumber, prevRound)
					)
				)
				.orderBy(asc(courtRotation.courtNumber));

			const resolved = await Promise.all(
				prevRotations.map(async (rotation) => {
					const prevMatches = await db
						.select()
						.from(match)
						.where(eq(match.courtRotationId, rotation.id));
					return { rotation, matchData: prevMatches as MatchData[] };
				})
			);

			const stillRetiredIds = new Set(
				dbPlayers.filter((p) => p.retiredAt && p.id !== playerId).map((p) => p.id)
			);

			const results = resolved.map((cr) => {
				const pIds = rotationPlayerIds(cr.rotation);
				return {
					courtNumber: cr.rotation.courtNumber,
					standings: calculateCourtStandings(cr.matchData, pIds)
				};
			});

			if (formatType === 'preseed') {
				nextAssignments = processPreseedTransition(
					results,
					assignCourtSizes,
					prevRound - 1,
					calculateCourtSizes(restoredCount).length
				);
				if (stillRetiredIds.size > 0) {
					nextAssignments = nextAssignments.map((a) => ({
						courtNumber: a.courtNumber,
						playerIds: a.playerIds.filter((id) => !stillRetiredIds.has(id))
					}));
				}
			} else {
				nextAssignments = buildRedistributionFromResults(
					formatType,
					results,
					assignCourtSizes,
					prevRound - 1,
					calculateCourtSizes(restoredCount).length,
					stillRetiredIds.size > 0 ? stillRetiredIds : undefined
				);
			}
		}

		const finalAssignments = targetPlayer.retiredCourt
			? resolveAssignmentsAfterUndoRetirement({
					formatType: tourney.formatType as FormatType,
					redistributedAssignments: nextAssignments,
					restoredPlayerCount: restoredCount,
					roundsCompleted: prevRound
				})
			: resolveAssignmentsAfterRetirement({
					formatType: tourney.formatType as FormatType,
					redistributedAssignments: nextAssignments,
					originalPlayerCount: restoredCount,
					roundsCompleted: prevRound
				});

		// Recreate court rotations and matches
		for (const assignment of finalAssignments) {
			const idx = assignment.courtNumber - 1;
			const size =
				assignment.playerIds.length > 4
					? (assignCourtSizes[idx] ?? assignment.playerIds.length)
					: assignment.playerIds.length;

			const [existingCourt] = await db
				.select()
				.from(court)
				.where(
					and(eq(court.tournamentId, tournamentId), eq(court.courtNumber, assignment.courtNumber))
				);

			const roundToken = crypto.randomBytes(16).toString('hex');
			const [newRotation] = await db
				.insert(courtRotation)
				.values({
					courtId: existingCourt.id,
					tournamentId: tournamentId,
					roundNumber: currentRound,
					courtNumber: assignment.courtNumber,
					token: roundToken,
					courtSize: size,
					player1Id: assignment.playerIds[0],
					player2Id: assignment.playerIds[1],
					player3Id: assignment.playerIds.length > 2 ? assignment.playerIds[2] : null,
					player4Id: assignment.playerIds.length > 3 ? assignment.playerIds[3] : null,
					player5Id: assignment.playerIds.length > 4 ? assignment.playerIds[4] : null,
					player6Id: assignment.playerIds.length > 5 ? assignment.playerIds[5] : null
				})
				.returning();

			const allMatchesForCourt = generateAllMatchesForAssignment(
				{ courtNumber: assignment.courtNumber, playerIds: assignment.playerIds },
				assignCourtSizes
			);

			const effective = getEffectiveScoring(
				size,
				{
					pointsToWin: tourney.pointsToWin ?? 21,
					setsToWin: tourney.setsToWin ?? 1,
					decidingSetPoints: tourney.decidingSetPoints ?? 15,
					winBy: tourney.winBy ?? 2
				},
				tourney.scoringOverrides as Record<
					string,
					{ pointsToWin?: number; setsToWin?: number; decidingSetPoints?: number }
				>
			);
			const maxSets = getMaxSets(effective.setsToWin);

			for (let mi = 0; mi < allMatchesForCourt.length; mi++) {
				const m = allMatchesForCourt[mi];
				for (let setNum = 1; setNum <= maxSets; setNum++) {
					await db.insert(match).values({
						courtRotationId: newRotation.id,
						matchNumber: mi + 1,
						setNumber: setNum,
						teamAPlayer1Id: m.teamAPlayer1Id,
						teamAPlayer2Id: m.teamAPlayer2Id,
						teamBPlayer1Id: m.teamBPlayer1Id,
						teamBPlayer2Id: m.teamBPlayer2Id
					});
				}
			}
		}

		await db
			.update(tournament)
			.set({ lastActivityAt: new Date() })
			.where(eq(tournament.id, tournamentId));

		getTournamentData({ tournamentId }).refresh();

		return { success: true };
	}
);

export const undoInjury = command(
	v.object({
		tournamentId: v.pipe(v.number(), v.minValue(1)),
		playerId: v.pipe(v.number(), v.minValue(1))
	}),
	async ({ tournamentId, playerId }) => {
		const event = getRequestEvent();
		const user = event.locals.user;
		if (!user) error(401, m.unauthorized());

		const [tourney] = await db
			.select()
			.from(tournament)
			.where(and(eq(tournament.id, tournamentId), eq(tournament.orgId, user.id)));
		if (!tourney) error(404, m.tournament_not_found());
		if (tourney.status !== 'active') error(400, m.tournament_not_active());

		const [targetPlayer] = await db
			.select()
			.from(player)
			.where(and(eq(player.id, playerId), eq(player.tournamentId, tournamentId)));
		if (!targetPlayer) error(404, m.player_not_found());
		if (!targetPlayer.retiredAt) error(400, 'Player is not retired');
		if (!targetPlayer.injuredAt) error(400, m.err_wrong_undo_type_retire());

		const currentRound = tourney.currentRound || 0;
		if (currentRound === 0) error(400, m.tournament_not_started());

		// 5-minute undo window
		const FIVE_MIN_MS = 5 * 60 * 1000;
		const elapsed = Date.now() - new Date(targetPlayer.injuredAt).getTime();
		if (elapsed > FIVE_MIN_MS) error(400, m.err_undo_window_expired());

		// Find the player's court rotation for this round
		const currentRotations = await db
			.select()
			.from(courtRotation)
			.where(
				and(
					eq(courtRotation.tournamentId, tournamentId),
					eq(courtRotation.roundNumber, currentRound)
				)
			);

		const playerRotation = currentRotations.find(
			(r) =>
				r.player1Id === playerId ||
				r.player2Id === playerId ||
				r.player3Id === playerId ||
				r.player4Id === playerId ||
				r.player5Id === playerId ||
				r.player6Id === playerId
		);

		if (!playerRotation) error(400, m.err_player_not_in_round());

		const rotationMatches = await db
			.select()
			.from(match)
			.where(eq(match.courtRotationId, playerRotation.id));

		const matchData = rotationMatches.map((m) => ({
			teamAPlayer1Id: m.teamAPlayer1Id,
			teamAPlayer2Id: m.teamAPlayer2Id,
			teamBPlayer1Id: m.teamBPlayer1Id,
			teamBPlayer2Id: m.teamBPlayer2Id,
			teamAScore: m.teamAScore,
			teamBScore: m.teamBScore,
			isCanceled: m.isCanceled ?? false,
			injuredPlayerIds: m.injuredPlayerIds ?? undefined
		}));

		if (hasFreshScoresAfterInjury(matchData, playerId)) {
			error(400, m.err_undo_injury_scores_entered());
		}

		const replacementId = targetPlayer.replacedByPlayerId;
		if (replacementId) {
			await db.delete(player).where(eq(player.id, replacementId));
		}

		const hasCanceled = rotationMatches.some((m) => m.isCanceled);
		const hasInjuredFlag = rotationMatches.some((m) => m.injuredPlayerIds?.includes(playerId));

		// Determine injury type and revert

		if (hasCanceled) {
			// Undo cancel: revert isCanceled on the player's unmatched matches
			await db
				.update(match)
				.set({ isCanceled: false })
				.where(
					and(
						eq(match.courtRotationId, playerRotation.id),
						isNull(match.teamAScore),
						or(
							eq(match.teamAPlayer1Id, playerId),
							eq(match.teamAPlayer2Id, playerId),
							eq(match.teamBPlayer1Id, playerId),
							eq(match.teamBPlayer2Id, playerId)
						)
					)
				);
		}

		if (hasInjuredFlag) {
			// Undo substitute: clear injuredPlayerIds marker
			await db
				.update(match)
				.set({ injuredPlayerIds: [] })
				.where(
					and(
						eq(match.courtRotationId, playerRotation.id),
						or(
							eq(match.teamAPlayer1Id, playerId),
							eq(match.teamAPlayer2Id, playerId),
							eq(match.teamBPlayer1Id, playerId),
							eq(match.teamBPlayer2Id, playerId)
						)
					)
				);
		}

		// Clear retirement and injury fields on player
		await db
			.update(player)
			.set({
				injuredAt: null,
				retiredAt: null,
				retiredRound: null,
				retiredCourt: null,
				retirementReason: null,
				finalStanding: null,
				replacedByPlayerId: null
			})
			.where(eq(player.id, playerId));

		getTournamentData({ tournamentId }).refresh();

		return { success: true };
	}
);
