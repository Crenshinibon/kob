import * as v from 'valibot';
import { error, redirect } from '@sveltejs/kit';
import { form, command, getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { tournament, courtRotation, match, courtAccess, player } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import {
	createInitialState,
	addPlayers,
	startRound,
	closeRound,
	calculateCourtSizes,
	generateAllMatchesForAssignment,
	getMaxSets,
	getEffectiveScoring,
	type FormatType,
	type MatchData
} from '$lib/server/tournament-logic';
import { getTournamentDataLive } from './tournament-data.remote';

function parseCourtSizes(tourney: typeof tournament.$inferSelect): number[] {
	return tourney.courtSizes
		? JSON.parse(tourney.courtSizes)
		: calculateCourtSizes(tourney.playerCount);
}

export const closeRoundForm = form(
	v.object({
		tournamentId: v.pipe(v.number(), v.minValue(1))
	}),
	async ({ tournamentId }) => {
		const event = getRequestEvent();
		const user = event.locals.user;
		if (!user) error(401, 'Unauthorized');

		const [tourney] = await db
			.select()
			.from(tournament)
			.where(and(eq(tournament.id, tournamentId), eq(tournament.orgId, user.id)));

		if (!tourney) error(404, 'Not found');
		if (tourney.status !== 'active') error(400, 'Tournament not active');

		const currentRound = tourney.currentRound || 1;

		if (currentRound >= tourney.numRounds) {
			await db
				.update(tournament)
				.set({ status: 'completed' })
				.where(eq(tournament.id, tournamentId));

			getTournamentDataLive(tournamentId).reconnect();

			redirect(303, `/tournament/${tournamentId}/standings`);
		}

		const dbPlayers = await db.select().from(player).where(eq(player.tournamentId, tournamentId));
		const players = dbPlayers.map((p) => ({
			id: p.id,
			name: p.name,
			seedPoints: p.seedPoints,
			seedRank: p.seedRank
		}));

		const courtSizes: number[] = parseCourtSizes(tourney);
		const physicalCourtCount = tourney.physicalCourtCount ?? 4;

		const initState = createInitialState({
			tournamentId: tourney.id,
			formatType: tourney.formatType as FormatType,
			playerCount: tourney.playerCount,
			physicalCourtCount
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
			);

		const currentAssignmentsFromDb = currentRotations.map((rotation) => ({
			courtNumber: rotation.courtNumber,
			playerIds: [
				rotation.player1Id,
				rotation.player2Id,
				...(rotation.player3Id !== null ? [rotation.player3Id] : []),
				...(rotation.player4Id !== null ? [rotation.player4Id] : []),
				...(rotation.player5Id !== null ? [rotation.player5Id] : []),
				...(rotation.player6Id !== null ? [rotation.player6Id] : [])
			].filter((id): id is number => id !== null)
		}));

		const allMatches: MatchData[] = [];
		for (const rotation of currentRotations) {
			const rotationMatches = await db
				.select()
				.from(match)
				.where(eq(match.courtRotationId, rotation.id));
			const scored = rotationMatches.filter((m) => m.teamAScore !== null && m.teamBScore !== null);
			allMatches.push(...scored);
		}

		const startedState = startRound(stateWithPlayers);

		const closedState = closeRound({
			...startedState,
			roundsCompleted: currentRound - 1,
			currentAssignments: currentAssignmentsFromDb,
			currentMatches: allMatches
		});

		if (closedState.isComplete) {
			await db
				.update(tournament)
				.set({ status: 'completed', currentRound: closedState.roundsCompleted })
				.where(eq(tournament.id, tournamentId));

			getTournamentDataLive(tournamentId).reconnect();

			redirect(303, `/tournament/${tournamentId}/standings`);
		}

		const nextAssignments = closedState.nextAssignments;
		const nextRoundNumber = closedState.roundsCompleted + 1;

		for (const assignment of nextAssignments) {
			const idx = assignment.courtNumber - 1;
			const size = courtSizes[idx] ?? 4;

			const [rotation] = await db
				.insert(courtRotation)
				.values({
					tournamentId: tournamentId,
					roundNumber: nextRoundNumber as any,
					courtNumber: assignment.courtNumber,
					courtSize: size,
					player1Id: assignment.playerIds[0],
					player2Id: assignment.playerIds[1],
					player3Id: assignment.playerIds.length > 2 ? assignment.playerIds[2] : null,
					player4Id: assignment.playerIds.length > 3 ? assignment.playerIds[3] : null,
					player5Id: assignment.playerIds.length > 4 ? assignment.playerIds[4] : null,
					player6Id: assignment.playerIds.length > 5 ? assignment.playerIds[5] : null
				})
				.returning();

			const allMatchesForCourt = generateAllMatchesForAssignment(assignment, courtSizes);

			const effective = getEffectiveScoring(
				size,
				{
					pointsToWin: tourney.pointsToWin ?? 21,
					setsToWin: tourney.setsToWin ?? 1,
					decidingSetPoints: tourney.decidingSetPoints ?? 15
				},
				tourney.scoringOverrides as any
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

			const token = crypto.randomBytes(16).toString('hex');
			await db.insert(courtAccess).values({
				courtRotationId: rotation.id,
				token,
				isActive: false
			});
		}

		// Deactivate current round courts
		for (const rotation of currentRotations) {
			await db
				.update(courtAccess)
				.set({ isActive: false })
				.where(eq(courtAccess.courtRotationId, rotation.id));
		}

		// Activate next round courts
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

		const activeCount = Math.min(physicalCourtCount, newRotations.length);
		for (let i = 0; i < activeCount; i++) {
			await db
				.update(courtAccess)
				.set({ isActive: true })
				.where(eq(courtAccess.courtRotationId, newRotations[i].id));
		}

		await db
			.update(tournament)
			.set({ currentRound: nextRoundNumber })
			.where(eq(tournament.id, tournamentId));

		getTournamentDataLive(tournamentId).reconnect();

		return { success: true, nextRound: nextRoundNumber };
	}
);

export const deleteTournamentForm = form(
	v.object({
		tournamentId: v.pipe(v.number(), v.minValue(1))
	}),
	async ({ tournamentId }) => {
		const event = getRequestEvent();
		const user = event.locals.user;
		if (!user) error(401, 'Unauthorized');

		const [tourney] = await db
			.select()
			.from(tournament)
			.where(and(eq(tournament.id, tournamentId), eq(tournament.orgId, user.id)));

		if (!tourney) error(404, 'Tournament not found');

		const rotations = await db
			.select()
			.from(courtRotation)
			.where(eq(courtRotation.tournamentId, tournamentId));

		for (const rotation of rotations) {
			await db.delete(match).where(eq(match.courtRotationId, rotation.id));
			await db.delete(courtAccess).where(eq(courtAccess.courtRotationId, rotation.id));
		}

		await db.delete(courtRotation).where(eq(courtRotation.tournamentId, tournamentId));
		await db.delete(player).where(eq(player.tournamentId, tournamentId));
		await db.delete(tournament).where(eq(tournament.id, tournamentId));

		redirect(303, '/');
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
		if (!user) error(401, 'Unauthorized');

		const [tourney] = await db
			.select()
			.from(tournament)
			.where(and(eq(tournament.id, tournamentId), eq(tournament.orgId, user.id)));

		if (!tourney) error(404, 'Tournament not found');

		await db
			.update(tournament)
			.set({ scoringOverrides: overrides })
			.where(eq(tournament.id, tournamentId));

		getTournamentDataLive(tournamentId).reconnect();

		return { success: true };
	}
);
