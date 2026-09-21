import { error } from '@sveltejs/kit';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { court, courtRotation, match, player, tournament } from '$lib/server/db/schema';
import {
	assignSeedRanks,
	buildRedistributionFromResults,
	calculateCourtSizes,
	calculateCourtStandings,
	computeFinalStandingMap,
	getFrozenCourts,
	MIN_TOURNAMENT_PLAYERS,
	type CourtAssignment,
	type CourtResult,
	type FormatType,
	type ScoringOverrides
} from '$lib/tournament-logic';
import { deriveLockState } from '$lib/manage-logic';
import * as m from '$lib/paraglide/messages';
import {
	assignmentCourtSize,
	buildMatchInsertRows,
	buildRound1AssignmentsFromPlayers,
	dropSurplusCourts,
	ensureCourtsExist,
	newPlayerToken,
	rebuildCurrentRound,
	type RebuildScoring
} from '$lib/server/tournament-orchestration';
import {
	getCompletedRoundCourtResults,
	snapshotToCourtStandings
} from '$lib/server/court-standings-service';
import { parseStoredCourtSizes } from '$lib/server/court-size-config';

export function rotationPlayerIds(rotation: typeof courtRotation.$inferSelect): number[] {
	return [
		rotation.player1Id,
		rotation.player2Id,
		...(rotation.player3Id !== null ? [rotation.player3Id] : []),
		...(rotation.player4Id !== null ? [rotation.player4Id] : []),
		...(rotation.player5Id !== null ? [rotation.player5Id] : []),
		...(rotation.player6Id !== null ? [rotation.player6Id] : [])
	];
}

export function assignmentSlots(playerIds: readonly number[]): {
	player1Id: number;
	player2Id: number;
	player3Id: number | null;
	player4Id: number | null;
	player5Id: number | null;
	player6Id: number | null;
	courtSize: number;
} {
	return {
		player1Id: playerIds[0],
		player2Id: playerIds[1] ?? playerIds[0],
		player3Id: playerIds[2] ?? null,
		player4Id: playerIds[3] ?? null,
		player5Id: playerIds[4] ?? null,
		player6Id: playerIds[5] ?? null,
		courtSize: playerIds.length
	};
}

export async function currentRoundMatches(tournamentId: number, roundNumber: number) {
	const rotations = await db
		.select()
		.from(courtRotation)
		.where(
			and(eq(courtRotation.tournamentId, tournamentId), eq(courtRotation.roundNumber, roundNumber))
		)
		.orderBy(asc(courtRotation.courtNumber));
	const ids = rotations.map((r) => r.id);
	const matches =
		ids.length > 0 ? await db.select().from(match).where(inArray(match.courtRotationId, ids)) : [];
	return { rotations, matches };
}

export async function assertRoundUnlocked(
	tournamentId: number,
	roundNumber: number
): Promise<void> {
	const { matches } = await currentRoundMatches(tournamentId, roundNumber);
	if (deriveLockState(matches).roundHasScores) {
		error(400, m.err_round_locked());
	}
}

function scoringFrom(tourney: typeof tournament.$inferSelect): RebuildScoring {
	return {
		pointsToWin: tourney.pointsToWin ?? 21,
		setsToWin: tourney.setsToWin ?? 1,
		decidingSetPoints: tourney.decidingSetPoints ?? 15,
		winBy: tourney.winBy ?? 2
	};
}

export async function applyAssignmentInPlace(opts: {
	tournamentId: number;
	roundNumber: number;
	assignments: readonly CourtAssignment[];
	scoring: RebuildScoring;
	scoringOverrides: ScoringOverrides | null | undefined;
}): Promise<void> {
	const current = await db
		.select()
		.from(courtRotation)
		.where(
			and(
				eq(courtRotation.tournamentId, opts.tournamentId),
				eq(courtRotation.roundNumber, opts.roundNumber)
			)
		)
		.orderBy(asc(courtRotation.courtNumber));

	const maxCourt = Math.max(...opts.assignments.map((a) => a.courtNumber), 0);
	await ensureCourtsExist(opts.tournamentId, maxCourt);

	const keepNumbers = new Set(opts.assignments.map((a) => a.courtNumber));
	const toDrop = current.filter((r) => !keepNumbers.has(r.courtNumber));
	if (toDrop.length > 0) {
		await db.delete(match).where(
			inArray(
				match.courtRotationId,
				toDrop.map((r) => r.id)
			)
		);
		await db.delete(courtRotation).where(
			inArray(
				courtRotation.id,
				toDrop.map((r) => r.id)
			)
		);
	}

	const byNumber = new Map(
		(
			await db
				.select()
				.from(courtRotation)
				.where(
					and(
						eq(courtRotation.tournamentId, opts.tournamentId),
						eq(courtRotation.roundNumber, opts.roundNumber)
					)
				)
		).map((r) => [r.courtNumber, r])
	);

	const courtSizes: number[] = [];
	for (const assignment of opts.assignments) {
		courtSizes[assignment.courtNumber - 1] = assignment.playerIds.length;
	}

	for (const assignment of opts.assignments) {
		const size = assignment.playerIds.length;
		const slots = assignmentSlots(assignment.playerIds);
		const existing = byNumber.get(assignment.courtNumber);
		if (existing) {
			const before = rotationPlayerIds(existing);
			const changed =
				before.join(',') !== assignment.playerIds.join(',') || existing.courtSize !== size;
			if (!changed) continue;
			await db.delete(match).where(eq(match.courtRotationId, existing.id));
			await db
				.update(courtRotation)
				.set({
					...slots,
					manualAdjustedAt: new Date()
				})
				.where(eq(courtRotation.id, existing.id));
			const rows = buildMatchInsertRows(
				assignment,
				courtSizes,
				existing.id,
				opts.scoring,
				opts.scoringOverrides
			);
			if (rows.length > 0) await db.insert(match).values(rows);
		} else {
			const [courtRow] = await db
				.select()
				.from(court)
				.where(
					and(
						eq(court.tournamentId, opts.tournamentId),
						eq(court.courtNumber, assignment.courtNumber)
					)
				);
			if (!courtRow) {
				throw new Error(`Court ${assignment.courtNumber} missing for ${opts.tournamentId}`);
			}
			const [created] = await db
				.insert(courtRotation)
				.values({
					courtId: courtRow.id,
					tournamentId: opts.tournamentId,
					roundNumber: opts.roundNumber,
					courtNumber: assignment.courtNumber,
					token: newPlayerToken(),
					...slots,
					manualAdjustedAt: new Date()
				})
				.returning();
			const rows = buildMatchInsertRows(
				assignment,
				courtSizes,
				created.id,
				opts.scoring,
				opts.scoringOverrides
			);
			if (rows.length > 0) await db.insert(match).values(rows);
		}
	}

	await db
		.update(tournament)
		.set({ lastActivityAt: new Date() })
		.where(eq(tournament.id, opts.tournamentId));
}

export async function rebuildRound1FromRoster(
	tourney: typeof tournament.$inferSelect
): Promise<void> {
	const players = await db
		.select()
		.from(player)
		.where(eq(player.tournamentId, tourney.id))
		.orderBy(player.id);
	const active = players.filter((p) => !p.retiredAt);
	const courtSizes = calculateCourtSizes(active.length);
	const ranked = assignSeedRanks(active);
	for (const p of ranked) {
		await db.update(player).set({ seedRank: p.seedRank }).where(eq(player.id, p.id));
	}
	const assignments = buildRound1AssignmentsFromPlayers(
		tourney.formatType as FormatType,
		ranked,
		courtSizes
	);
	await rebuildCurrentRound({
		tournamentId: tourney.id,
		roundNumber: 1,
		assignments,
		courtSizes,
		scoring: scoringFrom(tourney),
		scoringOverrides: tourney.scoringOverrides
	});
	await dropSurplusCourts(tourney.id, courtSizes.length);
	await db
		.update(tournament)
		.set({
			playerCount: active.length,
			courtSizes: JSON.stringify(courtSizes),
			lastActivityAt: new Date()
		})
		.where(eq(tournament.id, tourney.id));
}

export async function removePlayersFromRoster(
	tourney: typeof tournament.$inferSelect,
	playerIds: number[]
): Promise<void> {
	if (playerIds.length === 0) return;
	const roundNumber = tourney.currentRound || 0;
	if (tourney.status === 'active') {
		if (roundNumber !== 1) error(400, m.err_add_player_phase());
		await assertRoundUnlocked(tourney.id, 1);
	}

	const remaining = (
		await db.select().from(player).where(eq(player.tournamentId, tourney.id))
	).filter((p) => !p.retiredAt && !playerIds.includes(p.id));

	if (tourney.status === 'active' && remaining.length < MIN_TOURNAMENT_PLAYERS) {
		error(400, m.err_roster_min_after_remove());
	}

	await db.delete(player).where(inArray(player.id, playerIds));

	if (tourney.status === 'setup') {
		await db
			.update(tournament)
			.set({ playerCount: remaining.length, lastActivityAt: new Date() })
			.where(eq(tournament.id, tourney.id));
		return;
	}

	await rebuildRound1FromRoster({ ...tourney, playerCount: remaining.length });
}

export async function persistSeedRanks(
	tournamentId: number,
	ranks: Map<number, number>
): Promise<void> {
	for (const [id, seedRank] of ranks) {
		await db.update(player).set({ seedRank }).where(eq(player.id, id));
	}
	await db
		.update(tournament)
		.set({ lastActivityAt: new Date() })
		.where(eq(tournament.id, tournamentId));
}

async function writeFinalStandingsFromResults(
	tourney: typeof tournament.$inferSelect,
	results: readonly CourtResult[],
	activeIds: Set<number>,
	players: (typeof player.$inferSelect)[]
): Promise<void> {
	const courtSizes = parseStoredCourtSizes(tourney);
	const frozen =
		tourney.formatType === 'preseed'
			? getFrozenCourts(courtSizes, tourney.currentRound ?? 1, 'preseed')
			: [];
	const frozenCourtStandings = frozen.map((fc) => ({
		courtNumber: fc.courtNumber,
		standings: [] as CourtResult['standings']
	}));
	const map = computeFinalStandingMap({
		finalRoundResults: results,
		frozenCourtStandings,
		eliminatedPlayerIds: [],
		activePlayerIds: activeIds,
		retirees: players
			.filter((p) => p.retiredAt)
			.map((p) => ({
				playerId: p.id,
				finalStanding: p.finalStanding,
				retiredRound: p.retiredRound,
				retiredCourt: p.retiredCourt
			}))
	});
	for (const [playerId, standing] of map) {
		await db.update(player).set({ finalStanding: standing }).where(eq(player.id, playerId));
	}
}

export async function finishTournamentEarly(
	tourney: typeof tournament.$inferSelect
): Promise<void> {
	if (tourney.status !== 'active') error(400, m.tournament_not_active());
	const currentRound = tourney.currentRound || 0;
	if (currentRound < 2) error(400, m.err_reopen_round1());

	const { rotations, matches } = await currentRoundMatches(tourney.id, currentRound);
	const hasScores = deriveLockState(matches).roundHasScores;
	const players = await db.select().from(player).where(eq(player.tournamentId, tourney.id));
	const activeIds = new Set(players.filter((p) => !p.retiredAt).map((p) => p.id));

	if (!hasScores) {
		const ids = rotations.map((r) => r.id);
		if (ids.length > 0) {
			await db.delete(match).where(inArray(match.courtRotationId, ids));
			await db.delete(courtRotation).where(inArray(courtRotation.id, ids));
		}
		const prevRound = currentRound - 1;
		const prev = await db
			.select()
			.from(courtRotation)
			.where(
				and(eq(courtRotation.tournamentId, tourney.id), eq(courtRotation.roundNumber, prevRound))
			);
		const results: CourtResult[] = prev.map((r) => ({
			courtNumber: r.courtNumber,
			standings: r.standingsSnapshot
				? snapshotToCourtStandings(r.standingsSnapshot)
				: calculateCourtStandings([], rotationPlayerIds(r))
		}));
		await writeFinalStandingsFromResults(tourney, results, activeIds, players);
		await db
			.update(tournament)
			.set({
				status: 'completed',
				currentRound: prevRound,
				numRounds: prevRound,
				completedAt: new Date(),
				finishedEarly: true,
				lastActivityAt: new Date()
			})
			.where(and(eq(tournament.id, tourney.id), eq(tournament.status, 'active')));
		return;
	}

	for (const row of matches) {
		if (row.teamAScore == null || row.teamBScore == null) {
			await db.update(match).set({ isCanceled: true }).where(eq(match.id, row.id));
		}
	}
	const refreshed = await currentRoundMatches(tourney.id, currentRound);
	const results: CourtResult[] = [];
	for (const rotation of refreshed.rotations) {
		const rotMatches = refreshed.matches.filter((x) => x.courtRotationId === rotation.id);
		const standings = calculateCourtStandings(
			rotMatches.map((x) => ({
				teamAPlayer1Id: x.teamAPlayer1Id,
				teamAPlayer2Id: x.teamAPlayer2Id,
				teamBPlayer1Id: x.teamBPlayer1Id,
				teamBPlayer2Id: x.teamBPlayer2Id,
				teamAScore: x.teamAScore,
				teamBScore: x.teamBScore,
				isCanceled: x.isCanceled ?? false
			})),
			rotationPlayerIds(rotation)
		);
		results.push({ courtNumber: rotation.courtNumber, standings });
		await db
			.update(courtRotation)
			.set({
				standingsSnapshot: standings.map((s) => ({
					playerId: s.playerId,
					rank: s.rank,
					points: s.points,
					diff: s.diff,
					matchCount: s.matchCount,
					tiedFactors: [],
					decidingFactor: null
				})),
				roundClosedAt: new Date()
			})
			.where(eq(courtRotation.id, rotation.id));
	}
	await writeFinalStandingsFromResults(tourney, results, activeIds, players);
	await db
		.update(tournament)
		.set({
			status: 'completed',
			numRounds: currentRound,
			completedAt: new Date(),
			finishedEarly: true,
			lastActivityAt: new Date()
		})
		.where(and(eq(tournament.id, tourney.id), eq(tournament.status, 'active')));
}

export async function reopenLastRound(tourney: typeof tournament.$inferSelect): Promise<void> {
	if (tourney.status === 'completed') {
		const lastRound = tourney.currentRound || tourney.numRounds;
		const rotations = await db
			.select()
			.from(courtRotation)
			.where(
				and(eq(courtRotation.tournamentId, tourney.id), eq(courtRotation.roundNumber, lastRound))
			);
		for (const rotation of rotations) {
			await db
				.update(courtRotation)
				.set({
					roundClosedAt: null,
					standingsSnapshot: null,
					tieBreakConfigSnapshot: null
				})
				.where(eq(courtRotation.id, rotation.id));
		}
		const players = await db.select().from(player).where(eq(player.tournamentId, tourney.id));
		for (const p of players) {
			if (!p.retiredAt) {
				await db.update(player).set({ finalStanding: null }).where(eq(player.id, p.id));
			}
		}
		const claimed = await db
			.update(tournament)
			.set({
				status: 'active',
				completedAt: null,
				finishedEarly: false,
				lastActivityAt: new Date()
			})
			.where(and(eq(tournament.id, tourney.id), eq(tournament.status, 'completed')))
			.returning({ id: tournament.id });
		if (claimed.length === 0) error(409, m.err_state_changed());
		return;
	}

	if (tourney.status !== 'active') error(400, m.tournament_not_active());
	const currentRound = tourney.currentRound || 0;
	if (currentRound < 2) error(400, m.err_reopen_round1());

	const { matches } = await currentRoundMatches(tourney.id, currentRound);
	if (deriveLockState(matches).roundHasScores) {
		error(400, m.err_reopen_has_scores());
	}

	const { rotations: currentRots } = await currentRoundMatches(tourney.id, currentRound);
	const ids = currentRots.map((r) => r.id);
	if (ids.length > 0) {
		await db.delete(match).where(inArray(match.courtRotationId, ids));
		await db.delete(courtRotation).where(inArray(courtRotation.id, ids));
	}

	const prevRound = currentRound - 1;
	const prevRots = await db
		.select()
		.from(courtRotation)
		.where(
			and(eq(courtRotation.tournamentId, tourney.id), eq(courtRotation.roundNumber, prevRound))
		);
	const closedAt = prevRots.map((r) => r.roundClosedAt).find((d) => d != null) ?? null;
	const players = await db.select().from(player).where(eq(player.tournamentId, tourney.id));
	if (closedAt) {
		for (const p of players) {
			if (p.retiredAt && !p.injuredAt && p.retiredAt >= closedAt) {
				if (p.replacedByPlayerId) {
					await db.delete(player).where(eq(player.id, p.replacedByPlayerId));
				}
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
					.where(eq(player.id, p.id));
			}
			if (p.joinedRound === currentRound) {
				await db.delete(player).where(eq(player.id, p.id));
			}
		}
	}

	for (const rotation of prevRots) {
		await db
			.update(courtRotation)
			.set({
				roundClosedAt: null,
				standingsSnapshot: null,
				tieBreakConfigSnapshot: null
			})
			.where(eq(courtRotation.id, rotation.id));
		await db.update(court).set({ isActive: true }).where(eq(court.id, rotation.courtId));
	}

	const claimed = await db
		.update(tournament)
		.set({
			currentRound: prevRound,
			lastActivityAt: new Date()
		})
		.where(
			and(
				eq(tournament.id, tourney.id),
				eq(tournament.currentRound, currentRound),
				eq(tournament.status, 'active')
			)
		)
		.returning({ id: tournament.id });
	if (claimed.length === 0) error(409, m.err_state_changed());
}

export async function resetCurrentAssignments(
	tourney: typeof tournament.$inferSelect
): Promise<void> {
	const currentRound = tourney.currentRound || 0;
	if (currentRound < 1) error(400, m.tournament_not_started());
	await assertRoundUnlocked(tourney.id, currentRound);
	const courtSizes = parseStoredCourtSizes(tourney);
	const players = await db.select().from(player).where(eq(player.tournamentId, tourney.id));
	const logicPlayers = players.map((p) => ({
		id: p.id,
		name: p.name,
		seedPoints: p.seedPoints,
		seedRank: p.seedRank
	}));

	let assignments: CourtAssignment[];
	if (currentRound === 1) {
		assignments = buildRound1AssignmentsFromPlayers(
			tourney.formatType as FormatType,
			logicPlayers.filter((_, i) => !players[i].retiredAt),
			courtSizes
		);
	} else {
		const results = await getCompletedRoundCourtResults(
			tourney.id,
			currentRound - 1,
			courtSizes,
			logicPlayers,
			tourney.tieBreakConfig
		);
		assignments = buildRedistributionFromResults(
			tourney.formatType as FormatType,
			results,
			courtSizes,
			currentRound - 1,
			courtSizes.length
		);
	}

	await rebuildCurrentRound({
		tournamentId: tourney.id,
		roundNumber: currentRound,
		assignments,
		courtSizes,
		scoring: scoringFrom(tourney),
		scoringOverrides: tourney.scoringOverrides
	});
}

export { scoringFrom, assignmentCourtSize };
