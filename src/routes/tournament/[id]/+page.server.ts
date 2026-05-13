import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { tournament, courtRotation, match, courtAccess, player } from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import crypto from 'crypto';
import {
	createInitialState,
	addPlayers,
	startRound,
	closeRound,
	calculateCourtStandings,
	getCourtConfiguration,
	matchCountForCourtSize,
	generateAllMatchesForAssignment,
	type FormatType,
	type TournamentState,
	type MatchData,
	type CourtResult,
	type CourtAssignment
} from '$lib/server/tournament-logic';

function parseCourtSizes(tourney: any): number[] {
	return tourney.courtSizes
		? JSON.parse(tourney.courtSizes)
		: getDefaultCourtSizes(tourney.playerCount);
}

function getDefaultCourtSizes(playerCount: number): number[] {
	const config = getCourtConfiguration(playerCount);
	return config.bottomCourtSize
		? [...Array(config.standardCourts).fill(4), config.bottomCourtSize]
		: Array(config.totalCourts).fill(4);
}

export const load = async ({ params, locals }: any) => {
	const user = locals.user;
	if (!user) throw redirect(302, '/login');

	const tournamentId = parseInt(params.id);
	const [tourney] = await db
		.select()
		.from(tournament)
		.where(and(eq(tournament.id, tournamentId), eq(tournament.orgId, user.id)));

	if (!tourney) throw error(404, 'Tournament not found');

	const currentRound = tourney.currentRound || 0;
	const courtSizes: number[] = parseCourtSizes(tourney);
	const isPreseed = tourney.formatType === 'preseed';

	// Load players
	const dbPlayers = await db.select().from(player).where(eq(player.tournamentId, tournamentId));
	const players = dbPlayers.map((p: any) => ({
		id: p.id,
		name: p.name,
		seedPoints: p.seedPoints,
		seedRank: p.seedRank
	}));

	let canCloseRound = false;
	let isFinalRound = false;

	if (currentRound === 0) {
		// Before tournament start — check for in-progress round from crashed state
		const existingRotations = await db
			.select()
			.from(courtRotation)
			.where(eq(courtRotation.tournamentId, tournamentId));

		if (existingRotations.length > 0) {
			// Recover: find the highest round number with rotations
			const maxRound = Math.max(...existingRotations.map((r) => r.roundNumber));
			const roundRotations = existingRotations.filter((r) => r.roundNumber === maxRound);

			const expectedMatchCount = courtSizes.reduce(
				(sum, size) => sum + matchCountForCourtSize(size),
				0
			);

			const rotationIds = roundRotations.map((r) => r.id);
			const allMatches = await db
				.select()
				.from(match)
				.where(inArray(match.courtRotationId, rotationIds));

			const scoredMatchCount = allMatches.filter(
				(m) => m.teamAScore !== null && m.teamBScore !== null
			).length;
			canCloseRound = scoredMatchCount >= expectedMatchCount;
		}
		isFinalRound = false;
	} else {
		// Check if all matches are scored for the current round
		const rotationIds = await db
			.select({ id: courtRotation.id })
			.from(courtRotation)
			.where(eq(courtRotation.roundNumber, currentRound));

		const rotationIdList = rotationIds.map((r: any) => r.id);

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
		isFinalRound = currentRound >= tourney.numRounds;
	}

	// Load courts from DB rotations for the current round
	const displayRound = currentRound === 0 ? 1 : currentRound;
	const rotations = await db
		.select()
		.from(courtRotation)
		.where(
			and(eq(courtRotation.tournamentId, tournamentId), eq(courtRotation.roundNumber, displayRound))
		);

	const playerMap = new Map(players.map((p: any) => [p.id, p]));

	const courts: any[] = [];
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
			rotation.player3Id,
			rotation.player4Id,
			rotation.player5Id,
			rotation.player6Id
		].filter((id): id is number => id !== null);

		const rotationPlayers = playerIds.map((id) => playerMap.get(id)).filter(Boolean);

		const size = courtSizes[rotation.courtNumber - 1] ?? 4;

		courts.push({
			courtNumber: rotation.courtNumber,
			courtSize: size,
			matches,
			token: access[0]?.token,
			players: rotationPlayers
		});
	}

	return {
		tournament: tourney,
		courts,
		canCloseRound,
		isFinalRound,
		courtSizes,
		currentRound,
		physicalCourtCount: tourney.physicalCourtCount ?? 4
	};
};

export const actions = {
	closeRound: async ({ params, locals }: any) => {
		const user = locals.user;
		if (!user) throw error(401, 'Unauthorized');

		const tournamentId = parseInt(params.id);

		const [tourney] = await db
			.select()
			.from(tournament)
			.where(and(eq(tournament.id, tournamentId), eq(tournament.orgId, user.id)));

		if (!tourney) throw error(404, 'Not found');
		if (tourney.status !== 'active') throw error(400, 'Tournament not active');

		const currentRound = tourney.currentRound || 1;

		if (currentRound >= tourney.numRounds) {
			await db
				.update(tournament)
				.set({ status: 'completed' })
				.where(eq(tournament.id, tournamentId));

			throw redirect(303, `/tournament/${tournamentId}/standings`);
		}

		// Load players and rebuild state
		const dbPlayers = await db.select().from(player).where(eq(player.tournamentId, tournamentId));
		const players = dbPlayers.map((p: any) => ({
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

		// Build court results from the current round's DB rotations
		const currentRotations = await db
			.select()
			.from(courtRotation)
			.where(
				and(
					eq(courtRotation.tournamentId, tournamentId),
					eq(courtRotation.roundNumber, currentRound)
				)
			);

		const courtResults: CourtResult[] = [];
		for (const rotation of currentRotations) {
			const rotationMatches = await db
				.select()
				.from(match)
				.where(eq(match.courtRotationId, rotation.id));

			const playerIds: number[] = [
				rotation.player1Id,
				rotation.player2Id,
				...(rotation.player3Id !== null ? [rotation.player3Id] : []),
				...(rotation.player4Id !== null ? [rotation.player4Id] : []),
				...(rotation.player5Id !== null ? [rotation.player5Id] : []),
				...(rotation.player6Id !== null ? [rotation.player6Id] : [])
			];

			const standings = calculateCourtStandings(rotationMatches as MatchData[], playerIds);

			courtResults.push({
				courtNumber: rotation.courtNumber,
				standings
			});
		}

		// Build state with current round's results, then close it
		const startedState = startRound(stateWithPlayers);

		// Build scored matches from DB data — one scored match per court
		const scoredMatches: (MatchData | undefined)[] = await Promise.all(
			currentRotations.map(async (rotation) => {
				const rotationMatches = await db
					.select()
					.from(match)
					.where(eq(match.courtRotationId, rotation.id));
				const scored = (rotationMatches as MatchData[]).filter(
					(m) => m.teamAScore !== null && m.teamBScore !== null
				);
				return scored.length > 0 ? scored[0] : undefined;
			})
		);

		const closedState = closeRound({
			...startedState,
			currentMatches: scoredMatches
		});

		if (closedState.isComplete) {
			await db
				.update(tournament)
				.set({ status: 'completed', currentRound: closedState.roundsCompleted })
				.where(eq(tournament.id, tournamentId));
			throw redirect(303, `/tournament/${tournamentId}/standings`);
		}

		// Get the next round assignments from closed state
		const nextAssignments = closedState.nextAssignments;
		const nextRound = closedState.roundsCompleted;

		// Save next round's rotations and matches
		for (const assignment of nextAssignments) {
			const idx = assignment.courtNumber - 1;
			const size = courtSizes[idx] ?? 4;

			const [rotation] = await db
				.insert(courtRotation)
				.values({
					tournamentId: tournamentId,
					roundNumber: nextRound as any,
					courtNumber: assignment.courtNumber,
					player1Id: assignment.playerIds[0],
					player2Id: assignment.playerIds[1],
					player3Id: (assignment.playerIds.length > 2 ? assignment.playerIds[2] : null) as any,
					player4Id: (assignment.playerIds.length > 3 ? assignment.playerIds[3] : null) as any,
					player5Id: (size >= 5 ? assignment.playerIds[4] : null) as any,
					player6Id: (size >= 6 ? assignment.playerIds[5] : null) as any
				})
				.returning();

			// Generate all matches for this court based on size
			const allMatchesForCourt = generateAllMatchesForAssignment(assignment, courtSizes);

			for (let mi = 0; mi < allMatchesForCourt.length; mi++) {
				const m = allMatchesForCourt[mi];
				await db.insert(match).values({
					courtRotationId: rotation.id,
					matchNumber: mi + 1,
					teamAPlayer1Id: m.teamAPlayer1Id,
					teamAPlayer2Id: m.teamAPlayer2Id,
					teamBPlayer1Id: m.teamBPlayer1Id,
					teamBPlayer2Id: m.teamBPlayer2Id
				});
			}

			const token = crypto.randomBytes(16).toString('hex');
			await db.insert(courtAccess).values({
				courtRotationId: rotation.id,
				token,
				isActive: false
			});
		}

		// Deactivate old courts' access
		for (const rotation of currentRotations) {
			await db
				.update(courtAccess)
				.set({ isActive: false })
				.where(eq(courtAccess.courtRotationId, rotation.id));
		}

		// Activate first batch of courts for the new round
		const newRotations = await db
			.select()
			.from(courtRotation)
			.where(eq(courtRotation.roundNumber, nextRound));

		const activeCount = Math.min(physicalCourtCount, newRotations.length);
		for (let i = 0; i < activeCount; i++) {
			const accessRecords = await db
				.select()
				.from(courtAccess)
				.where(eq(courtAccess.courtRotationId, newRotations[i].id));

			if (accessRecords.length > 0) {
				await db
					.update(courtAccess)
					.set({ isActive: true })
					.where(eq(courtAccess.id, accessRecords[0].id));
			}
		}

		await db
			.update(tournament)
			.set({ currentRound: nextRound })
			.where(eq(tournament.id, tournamentId));

		return { success: true };
	},

	deleteTournament: async ({ params, locals }: any) => {
		const user = locals.user;
		if (!user) throw error(401, 'Unauthorized');

		const tournamentId = parseInt(params.id);

		const [tourney] = await db
			.select()
			.from(tournament)
			.where(and(eq(tournament.id, tournamentId), eq(tournament.orgId, user.id)));

		if (!tourney) throw error(404, 'Tournament not found');

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

		throw redirect(303, '/');
	},

	startTournament: async ({ params, locals }: any) => {
		const user = locals.user;
		if (!user) throw error(401, 'Unauthorized');

		const tournamentId = parseInt(params.id);

		const [tourney] = await db
			.select()
			.from(tournament)
			.where(and(eq(tournament.id, tournamentId), eq(tournament.orgId, user.id)));

		if (!tourney) throw error(404, 'Not found');
		if (tourney.status !== 'draft') throw error(400, 'Tournament already started');

		const dbPlayers = await db.select().from(player).where(eq(player.tournamentId, tournamentId));
		const requiredCount = tourney.playerCount;

		if (dbPlayers.length !== requiredCount) {
			throw redirect(
				303,
				`/tournament/${tournamentId}?error=Need exactly ${requiredCount} players, currently have ${dbPlayers.length}`
			);
		}

		await db.update(tournament).set({ status: 'active' }).where(eq(tournament.id, tournamentId));

		throw redirect(303, `/tournament/${tournamentId}`);
	}
};
