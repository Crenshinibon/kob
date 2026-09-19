import { command } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import { db } from '$lib/server/db';
import { player, tournament, match, courtRotation } from '$lib/server/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import * as m from '$lib/paraglide/messages';
import { requireOrganizerTournament } from '$lib/server/org-guard';
import {
	assignSeedRanks,
	calculateCourtSizes,
	getMaxSets,
	getEffectiveScoring,
	type CourtAssignment,
	type FormatType,
	type ScoringOverrides
} from '$lib/tournament-logic';
import {
	applyAssignment,
	minRoundCount,
	refillToCanonical,
	renumberSeedOrder,
	type ManualAssignmentCourt
} from '$lib/manage-logic';
import { parsePlayerLine } from '$lib/parse-players';
import { newPlayerToken } from '$lib/server/tournament-orchestration';
import {
	applyAssignmentInPlace,
	assertRoundUnlocked,
	finishTournamentEarly,
	rebuildRound1FromRoster,
	removePlayersFromRoster,
	reopenLastRound,
	resetCurrentAssignments,
	persistSeedRanks,
	rotationPlayerIds,
	currentRoundMatches
} from '$lib/server/manage-orchestration';
import { getManageData } from './manage-data.remote';
import { getTournamentData } from '../tournament-data.remote';

async function refreshAll(tournamentId: number): Promise<void> {
	await getManageData({ tournamentId }).refresh();
	await getTournamentData({ tournamentId }).refresh();
}

async function scoringOf(tourney: typeof tournament.$inferSelect) {
	return {
		pointsToWin: tourney.pointsToWin ?? 21,
		setsToWin: tourney.setsToWin ?? 1,
		decidingSetPoints: tourney.decidingSetPoints ?? 15,
		winBy: tourney.winBy ?? 2
	};
}

export const renamePlayer = command(
	v.object({
		playerId: v.pipe(v.number(), v.minValue(1)),
		name: v.pipe(v.string(), v.minLength(1))
	}),
	async ({ playerId, name }) => {
		const [row] = await db.select().from(player).where(eq(player.id, playerId));
		if (!row) error(404, m.player_not_found());
		const { tourney } = await requireOrganizerTournament(row.tournamentId);
		const others = await db.select().from(player).where(eq(player.tournamentId, tourney.id));
		const taken = others.some(
			(p) => p.id !== playerId && !p.retiredAt && p.name.toLowerCase() === name.trim().toLowerCase()
		);
		if (taken) error(400, m.err_name_taken());
		await db.update(player).set({ name: name.trim() }).where(eq(player.id, playerId));
		await refreshAll(tourney.id);
		return { success: true };
	}
);

export const updatePlayerSeed = command(
	v.object({
		playerId: v.pipe(v.number(), v.minValue(1)),
		seedPoints: v.nullable(v.number())
	}),
	async ({ playerId, seedPoints }) => {
		const [row] = await db.select().from(player).where(eq(player.id, playerId));
		if (!row) error(404, m.player_not_found());
		const { tourney } = await requireOrganizerTournament(row.tournamentId);
		if (tourney.status === 'active') {
			if ((tourney.currentRound || 0) !== 1) error(400, m.err_add_player_phase());
			await assertRoundUnlocked(tourney.id, 1);
		}
		await db.update(player).set({ seedPoints }).where(eq(player.id, playerId));
		const roster = await db.select().from(player).where(eq(player.tournamentId, tourney.id));
		const ranked = assignSeedRanks(roster.filter((p) => !p.retiredAt));
		await persistSeedRanks(tourney.id, new Map(ranked.map((p) => [p.id, p.seedRank])));
		if (tourney.status === 'active') {
			await rebuildRound1FromRoster(tourney);
		}
		await refreshAll(tourney.id);
		return { success: true };
	}
);

export const updatePlayerOrder = command(
	v.object({
		tournamentId: v.pipe(v.number(), v.minValue(1)),
		playerIds: v.array(v.pipe(v.number(), v.minValue(1)))
	}),
	async ({ tournamentId, playerIds }) => {
		const { tourney } = await requireOrganizerTournament(tournamentId);
		if (tourney.status === 'active') {
			if ((tourney.currentRound || 0) !== 1) error(400, m.err_add_player_phase());
			await assertRoundUnlocked(tourney.id, 1);
		}
		const ranks = new Map<number, number>();
		playerIds.forEach((id, i) => ranks.set(id, i + 1));
		await persistSeedRanks(tournamentId, ranks);
		if (tourney.status === 'active') {
			await rebuildRound1FromRoster(tourney);
		}
		await refreshAll(tournamentId);
		return { success: true };
	}
);

export const addPlayer = command(
	v.object({
		tournamentId: v.pipe(v.number(), v.minValue(1)),
		name: v.pipe(v.string(), v.minLength(1)),
		seedPoints: v.optional(v.nullable(v.number())),
		seedRank: v.optional(v.number())
	}),
	async ({ tournamentId, name, seedPoints, seedRank }) => {
		const { tourney } = await requireOrganizerTournament(tournamentId);
		if (tourney.status === 'completed') error(400, m.err_add_player_phase());
		if (tourney.status === 'active') {
			if ((tourney.currentRound || 0) !== 1) error(400, m.err_add_player_phase());
			await assertRoundUnlocked(tourney.id, 1);
		}
		const existing = await db.select().from(player).where(eq(player.tournamentId, tournamentId));
		const active = existing.filter((p) => !p.retiredAt);
		if (active.length >= 64)
			error(400, m.err_max_players({ count: 64, entered: active.length + 1 }));
		if (active.some((p) => p.name.toLowerCase() === name.trim().toLowerCase())) {
			error(400, m.err_name_taken());
		}
		const [created] = await db
			.insert(player)
			.values({
				tournamentId,
				name: name.trim(),
				seedPoints: seedPoints ?? null,
				seedRank: seedRank ?? active.length + 1,
				token: newPlayerToken()
			})
			.returning();
		const roster = [...active, created];
		const ordered = [...roster].sort((a, b) => (a.seedRank ?? a.id) - (b.seedRank ?? b.id));
		if (seedRank != null) {
			const ranks = renumberSeedOrder(
				ordered.map((p) => p.id),
				created.id,
				seedRank
			);
			await persistSeedRanks(tournamentId, ranks);
		} else {
			const ranked = assignSeedRanks(roster);
			await persistSeedRanks(tournamentId, new Map(ranked.map((p) => [p.id, p.seedRank])));
		}
		if (tourney.status === 'active') {
			await rebuildRound1FromRoster(tourney);
		} else {
			await db
				.update(tournament)
				.set({ playerCount: roster.length, lastActivityAt: new Date() })
				.where(eq(tournament.id, tournamentId));
		}
		await refreshAll(tournamentId);
		return { success: true, playerId: created.id };
	}
);

export const addPlayersBulk = command(
	v.object({
		tournamentId: v.pipe(v.number(), v.minValue(1)),
		names: v.pipe(v.string(), v.minLength(1))
	}),
	async ({ tournamentId, names }) => {
		const { tourney } = await requireOrganizerTournament(tournamentId);
		if (tourney.status !== 'setup') error(400, m.err_add_player_phase());
		const existing = await db.select().from(player).where(eq(player.tournamentId, tournamentId));
		const taken = new Set(existing.filter((p) => !p.retiredAt).map((p) => p.name.toLowerCase()));
		const lines = names
			.split('\n')
			.map((l) => l.trim())
			.filter(Boolean);
		for (const line of lines) {
			const parsed = parsePlayerLine(line, tourney.formatType as FormatType);
			if (taken.has(parsed.name.toLowerCase())) continue;
			if (existing.length + 1 > 64) break;
			await db.insert(player).values({
				tournamentId,
				name: parsed.name,
				seedPoints: parsed.seedPoints,
				token: newPlayerToken()
			});
			taken.add(parsed.name.toLowerCase());
		}
		const roster = await db.select().from(player).where(eq(player.tournamentId, tournamentId));
		const ranked = assignSeedRanks(roster.filter((p) => !p.retiredAt));
		await persistSeedRanks(tournamentId, new Map(ranked.map((p) => [p.id, p.seedRank])));
		await db
			.update(tournament)
			.set({ playerCount: ranked.length, lastActivityAt: new Date() })
			.where(eq(tournament.id, tournamentId));
		await refreshAll(tournamentId);
		return { success: true };
	}
);

export const removePlayer = command(
	v.object({ playerId: v.pipe(v.number(), v.minValue(1)) }),
	async ({ playerId }) => {
		const [row] = await db.select().from(player).where(eq(player.id, playerId));
		if (!row) error(404, m.player_not_found());
		const { tourney } = await requireOrganizerTournament(row.tournamentId);
		await removePlayersFromRoster(tourney, [playerId]);
		await refreshAll(tourney.id);
		return { success: true };
	}
);

export const removeUncheckedPlayers = command(
	v.object({ tournamentId: v.pipe(v.number(), v.minValue(1)) }),
	async ({ tournamentId }) => {
		const { tourney } = await requireOrganizerTournament(tournamentId);
		const players = await db.select().from(player).where(eq(player.tournamentId, tournamentId));
		const ids = players.filter((p) => !p.retiredAt && !p.checkedInAt).map((p) => p.id);
		await removePlayersFromRoster(tourney, ids);
		await refreshAll(tournamentId);
		return { success: true };
	}
);

export const regeneratePlayerToken = command(
	v.object({ playerId: v.pipe(v.number(), v.minValue(1)) }),
	async ({ playerId }) => {
		const [row] = await db.select().from(player).where(eq(player.id, playerId));
		if (!row) error(404, m.player_not_found());
		const { tourney } = await requireOrganizerTournament(row.tournamentId);
		if (tourney.status === 'completed') error(400, m.err_add_player_phase());
		const token = newPlayerToken();
		await db.update(player).set({ token }).where(eq(player.id, playerId));
		await refreshAll(tourney.id);
		return { success: true, token };
	}
);

export const applyAssignmentCommand = command(
	v.object({
		tournamentId: v.pipe(v.number(), v.minValue(1)),
		courts: v.array(
			v.object({
				courtNumber: v.pipe(v.number(), v.minValue(1)),
				playerIds: v.array(v.pipe(v.number(), v.minValue(1)))
			})
		)
	}),
	async ({ tournamentId, courts }) => {
		const { tourney } = await requireOrganizerTournament(tournamentId);
		if (tourney.status !== 'active') error(400, m.tournament_not_active());
		const currentRound = tourney.currentRound || 0;
		await assertRoundUnlocked(tournamentId, currentRound);
		const { rotations } = await currentRoundMatches(tournamentId, currentRound);
		const before: ManualAssignmentCourt[] = rotations.map((r) => ({
			courtNumber: r.courtNumber,
			playerIds: rotationPlayerIds(r)
		}));
		const after: ManualAssignmentCourt[] = courts;
		const result = applyAssignment(before, after, {
			roundHasScores: false,
			isFinalRound: currentRound >= tourney.numRounds,
			formatType: tourney.formatType as FormatType,
			courtCount: Math.max(before.length, after.length),
			currentRound,
			singleCourtTournament: before.length === 1 && after.length === 1
		});
		if (result.errors.length > 0) {
			error(400, result.errors[0]);
		}
		const assignments: CourtAssignment[] = after.map((c) => ({
			courtNumber: c.courtNumber,
			playerIds: c.playerIds
		}));
		await applyAssignmentInPlace({
			tournamentId,
			roundNumber: currentRound,
			assignments,
			scoring: await scoringOf(tourney),
			scoringOverrides: tourney.scoringOverrides
		});
		await refreshAll(tournamentId);
		return { success: true, warnings: result.warnings };
	}
);

export const previewAssignmentChange = command(
	v.object({
		tournamentId: v.pipe(v.number(), v.minValue(1)),
		courts: v.array(
			v.object({
				courtNumber: v.pipe(v.number(), v.minValue(1)),
				playerIds: v.array(v.pipe(v.number(), v.minValue(1)))
			})
		)
	}),
	async ({ tournamentId, courts }) => {
		const { tourney } = await requireOrganizerTournament(tournamentId);
		const currentRound = tourney.currentRound || 0;
		const { rotations, matches } = await currentRoundMatches(tournamentId, currentRound);
		const before: ManualAssignmentCourt[] = rotations.map((r) => ({
			courtNumber: r.courtNumber,
			playerIds: rotationPlayerIds(r)
		}));
		return applyAssignment(before, courts, {
			roundHasScores: matches.some((x) => x.teamAScore != null),
			isFinalRound: currentRound >= tourney.numRounds,
			formatType: tourney.formatType as FormatType,
			courtCount: Math.max(before.length, courts.length, 1),
			currentRound,
			singleCourtTournament: before.length <= 1
		});
	}
);

export const refillCourts = command(
	v.object({ tournamentId: v.pipe(v.number(), v.minValue(1)) }),
	async ({ tournamentId }) => {
		const { tourney } = await requireOrganizerTournament(tournamentId);
		if (tourney.status !== 'active') error(400, m.tournament_not_active());
		const currentRound = tourney.currentRound || 0;
		await assertRoundUnlocked(tournamentId, currentRound);
		const { rotations } = await currentRoundMatches(tournamentId, currentRound);
		const before = rotations.map((r) => ({
			courtNumber: r.courtNumber,
			playerIds: rotationPlayerIds(r)
		}));
		const playerCount = before.reduce((n, c) => n + c.playerIds.length, 0);
		const filled = refillToCanonical(before, playerCount);
		await applyAssignmentInPlace({
			tournamentId,
			roundNumber: currentRound,
			assignments: filled,
			scoring: await scoringOf(tourney),
			scoringOverrides: tourney.scoringOverrides
		});
		await refreshAll(tournamentId);
		return { success: true };
	}
);

export const resetRoundAssignments = command(
	v.object({ tournamentId: v.pipe(v.number(), v.minValue(1)) }),
	async ({ tournamentId }) => {
		const { tourney } = await requireOrganizerTournament(tournamentId);
		await resetCurrentAssignments(tourney);
		await refreshAll(tournamentId);
		return { success: true };
	}
);

export const reshuffleRound1 = command(
	v.object({ tournamentId: v.pipe(v.number(), v.minValue(1)) }),
	async ({ tournamentId }) => {
		const { tourney } = await requireOrganizerTournament(tournamentId);
		if (tourney.formatType !== 'random-seed') error(400, m.err_add_player_phase());
		if ((tourney.currentRound || 0) !== 1) error(400, m.err_add_player_phase());
		await assertRoundUnlocked(tournamentId, 1);
		await rebuildRound1FromRoster(tourney);
		await refreshAll(tournamentId);
		return { success: true };
	}
);

export const updateTournamentSettings = command(
	v.object({
		tournamentId: v.pipe(v.number(), v.minValue(1)),
		name: v.optional(v.pipe(v.string(), v.minLength(1))),
		physicalCourtCount: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(16))),
		preseedRetirementPolicy: v.optional(v.picklist(['shrink', 'cascade'])),
		setupTimeMinutes: v.optional(v.number()),
		transitionTimeMinutes: v.optional(v.number()),
		avgRallyDurationSeconds: v.optional(v.number()),
		timeBetweenRalliesSeconds: v.optional(v.number()),
		timeBetweenMatchesMinutes: v.optional(v.number())
	}),
	async (input) => {
		const { tourney } = await requireOrganizerTournament(input.tournamentId);
		const patch: Partial<typeof tournament.$inferInsert> = { lastActivityAt: new Date() };
		if (input.name) patch.name = input.name;
		if (input.physicalCourtCount != null) patch.physicalCourtCount = input.physicalCourtCount;
		if (input.preseedRetirementPolicy)
			patch.preseedRetirementPolicy = input.preseedRetirementPolicy;
		if (input.setupTimeMinutes != null) patch.setupTimeMinutes = input.setupTimeMinutes;
		if (input.transitionTimeMinutes != null)
			patch.transitionTimeMinutes = input.transitionTimeMinutes;
		if (input.avgRallyDurationSeconds != null)
			patch.avgRallyDurationSeconds = input.avgRallyDurationSeconds;
		if (input.timeBetweenRalliesSeconds != null)
			patch.timeBetweenRalliesSeconds = input.timeBetweenRalliesSeconds;
		if (input.timeBetweenMatchesMinutes != null)
			patch.timeBetweenMatchesMinutes = input.timeBetweenMatchesMinutes;
		await db.update(tournament).set(patch).where(eq(tournament.id, tourney.id));
		await refreshAll(tourney.id);
		return { success: true };
	}
);

export const updateScoringRules = command(
	v.object({
		tournamentId: v.pipe(v.number(), v.minValue(1)),
		scoringMode: v.picklist(['single-21', 'best-of-3', 'custom']),
		pointsToWin: v.pipe(v.number(), v.minValue(1)),
		winBy: v.pipe(v.number(), v.minValue(1)),
		setsToWin: v.pipe(v.number(), v.minValue(1)),
		decidingSetPoints: v.pipe(v.number(), v.minValue(1))
	}),
	async (input) => {
		const { tourney } = await requireOrganizerTournament(input.tournamentId);
		if (tourney.status === 'active') {
			await assertRoundUnlocked(tourney.id, tourney.currentRound || 0);
		}
		await db
			.update(tournament)
			.set({
				scoringMode: input.scoringMode,
				pointsToWin: input.pointsToWin,
				winBy: input.winBy,
				setsToWin: input.setsToWin,
				decidingSetPoints: input.decidingSetPoints,
				lastActivityAt: new Date()
			})
			.where(eq(tournament.id, tourney.id));
		if (tourney.status === 'active' && (tourney.currentRound || 0) > 0) {
			const { rotations } = await currentRoundMatches(tourney.id, tourney.currentRound || 0);
			const assignments: CourtAssignment[] = rotations.map((r) => ({
				courtNumber: r.courtNumber,
				playerIds: rotationPlayerIds(r)
			}));
			const updated = { ...tourney, ...input };
			const ids = rotations.map((r) => r.id);
			if (ids.length > 0) {
				await db.delete(match).where(inArray(match.courtRotationId, ids));
			}
			for (const rotation of rotations) {
				const assignment = assignments.find((a) => a.courtNumber === rotation.courtNumber);
				if (!assignment) continue;
				const rows = (await import('$lib/server/tournament-orchestration')).buildMatchInsertRows(
					assignment,
					assignments.map((a) => a.playerIds.length),
					rotation.id,
					{
						pointsToWin: input.pointsToWin,
						setsToWin: input.setsToWin,
						decidingSetPoints: input.decidingSetPoints,
						winBy: input.winBy
					},
					updated.scoringOverrides as ScoringOverrides | null
				);
				if (rows.length > 0) await db.insert(match).values(rows);
			}
			void getMaxSets;
			void getEffectiveScoring;
		}
		await refreshAll(tourney.id);
		return { success: true };
	}
);

export const updateRoundCount = command(
	v.object({
		tournamentId: v.pipe(v.number(), v.minValue(1)),
		numRounds: v.pipe(v.number(), v.minValue(1), v.maxValue(10))
	}),
	async ({ tournamentId, numRounds }) => {
		const { tourney } = await requireOrganizerTournament(tournamentId);
		if (tourney.formatType === 'preseed') error(400, m.manage_rounds_preseed_fixed());
		const { matches } = await currentRoundMatches(tournamentId, tourney.currentRound || 0);
		const min = minRoundCount(
			tourney.currentRound || 0,
			matches.some((x) => x.teamAScore != null)
		);
		if (numRounds < min) error(400, m.err_rounds_below_current());
		if (numRounds === (tourney.currentRound || 0) && tourney.status === 'active') {
			const { rotations } = await currentRoundMatches(tournamentId, tourney.currentRound || 0);
			const court1 = rotations.find((r) => r.courtNumber === 1);
			if (rotations.length > 1 && court1 && rotationPlayerIds(court1).length !== 4) {
				error(400, m.err_rounds_final_court_size());
			}
		}
		await db
			.update(tournament)
			.set({ numRounds, lastActivityAt: new Date() })
			.where(eq(tournament.id, tournamentId));
		await refreshAll(tournamentId);
		return { success: true };
	}
);

export const finishTournamentEarlyCommand = command(
	v.object({ tournamentId: v.pipe(v.number(), v.minValue(1)) }),
	async ({ tournamentId }) => {
		const { tourney } = await requireOrganizerTournament(tournamentId);
		await finishTournamentEarly(tourney);
		await refreshAll(tournamentId);
		return { success: true };
	}
);

export const reopenLastRoundCommand = command(
	v.object({ tournamentId: v.pipe(v.number(), v.minValue(1)) }),
	async ({ tournamentId }) => {
		const { tourney } = await requireOrganizerTournament(tournamentId);
		await reopenLastRound(tourney);
		await refreshAll(tournamentId);
		return { success: true };
	}
);
