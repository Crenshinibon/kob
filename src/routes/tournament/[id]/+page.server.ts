import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { tournament, courtRotation, match, courtAccess, player } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

export const load = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) throw redirect(302, '/auth/login');

	const tournamentId = parseInt(params.id);
	const [tourney] = await db
		.select()
		.from(tournament)
		.where(and(eq(tournament.id, tournamentId), eq(tournament.orgId, user.id)));

	if (!tourney) throw error(404, 'Tournament not found');

	// Get courts for current round
	const currentRound = tourney.currentRound || 1;
	const rotations = await db
		.select()
		.from(courtRotation)
		.where(
			and(eq(courtRotation.tournamentId, tournamentId), eq(courtRotation.roundNumber, currentRound))
		);

	const courts = [];
	for (const rotation of rotations) {
		const matches = await db.select().from(match).where(eq(match.courtRotationId, rotation.id));

		const access = await db
			.select()
			.from(courtAccess)
			.where(eq(courtAccess.courtRotationId, rotation.id))
			.limit(1);

		const players = await db.select().from(player).where(eq(player.tournamentId, tournamentId));

		const playerMap = new Map(players.map((p: any) => [p.id, p]));

		courts.push({
			courtNumber: rotation.courtNumber,
			matches,
			token: access[0]?.token,
			players: [
				playerMap.get(rotation.player1Id),
				playerMap.get(rotation.player2Id),
				playerMap.get(rotation.player3Id),
				playerMap.get(rotation.player4Id)
			].filter(Boolean)
		});
	}

	// Check if all matches are complete
	const allMatches = courts.flatMap((c) => c.matches);
	const canCloseRound = allMatches.length === 12 && allMatches.every((m) => m.teamAScore !== null);

	return { tournament: tourney, courts, canCloseRound };
};

export const actions = {
	closeRound: async ({ params, locals }) => {
		const user = locals.user;
		if (!user) throw error(401, 'Unauthorized');

		const tournamentId = parseInt(params.id);

		// Get tournament
		const [tourney] = await db
			.select()
			.from(tournament)
			.where(and(eq(tournament.id, tournamentId), eq(tournament.orgId, user.id)));

		if (!tourney) throw error(404, 'Not found');
		if (tourney.status !== 'active') throw error(400, 'Tournament not active');

		const currentRound = tourney.currentRound || 1;

		if (currentRound >= tourney.numRounds) {
			// Final round - mark as completed
			await db
				.update(tournament)
				.set({ status: 'completed' })
				.where(eq(tournament.id, tournamentId));
		} else {
			// Get current round data with matches
			const rotations = await db
				.select()
				.from(courtRotation)
				.where(
					and(
						eq(courtRotation.tournamentId, tournamentId),
						eq(courtRotation.roundNumber, currentRound)
					)
				);

			// Get all matches with scores for standings calculation
			const courtResults = [];
			for (const rotation of rotations) {
				const matches = await db.select().from(match).where(eq(match.courtRotationId, rotation.id));

				const playerIds = [
					rotation.player1Id,
					rotation.player2Id,
					rotation.player3Id,
					rotation.player4Id
				];

				const standings = calculateCourtStandings(matches, playerIds);

				courtResults.push({
					courtNumber: rotation.courtNumber,
					standings
				});
			}

			// Determine next round assignments
			const nextRound = currentRound + 1;
			const assignments = redistributePlayers(courtResults, currentRound === 1);

			// Create new court rotations and matches for next round
			for (const assignment of assignments) {
				const [rotation] = await db
					.insert(courtRotation)
					.values({
						tournamentId,
						roundNumber: nextRound,
						courtNumber: assignment.courtNumber,
						player1Id: assignment.playerIds[0],
						player2Id: assignment.playerIds[1],
						player3Id: assignment.playerIds[2],
						player4Id: assignment.playerIds[3]
					})
					.returning();

				const p1 = assignment.playerIds[0];
				const p2 = assignment.playerIds[1];
				const p3 = assignment.playerIds[2];
				const p4 = assignment.playerIds[3];

				// Create 3 matches for this court
				await db.insert(match).values({
					courtRotationId: rotation.id,
					matchNumber: 1,
					teamAPlayer1Id: p1,
					teamAPlayer2Id: p2,
					teamBPlayer1Id: p3,
					teamBPlayer2Id: p4
				});

				await db.insert(match).values({
					courtRotationId: rotation.id,
					matchNumber: 2,
					teamAPlayer1Id: p1,
					teamAPlayer2Id: p3,
					teamBPlayer1Id: p2,
					teamBPlayer2Id: p4
				});

				await db.insert(match).values({
					courtRotationId: rotation.id,
					matchNumber: 3,
					teamAPlayer1Id: p1,
					teamAPlayer2Id: p4,
					teamBPlayer1Id: p2,
					teamBPlayer2Id: p3
				});

				// Generate new access token
				const token = crypto.randomBytes(16).toString('hex');
				await db.insert(courtAccess).values({
					courtRotationId: rotation.id,
					token,
					isActive: true
				});
			}

			// Deactivate old tokens
			for (const rotation of rotations) {
				await db
					.update(courtAccess)
					.set({ isActive: false })
					.where(eq(courtAccess.courtRotationId, rotation.id));
			}

			// Update tournament to next round
			await db
				.update(tournament)
				.set({ currentRound: nextRound })
				.where(eq(tournament.id, tournamentId));
		}

		return { success: true };
	}
};

function calculateCourtStandings(matches: any[], playerIds: number[]) {
	const stats: Record<number, { playerId: number; points: number; for: number; against: number }> =
		{};

	playerIds.forEach((id) => {
		stats[id] = { playerId: id, points: 0, for: 0, against: 0 };
	});

	matches.forEach((m) => {
		if (m.teamAScore === null) return;

		stats[m.teamAPlayer1Id].points += m.teamAScore;
		stats[m.teamAPlayer1Id].for += m.teamAScore;
		stats[m.teamAPlayer1Id].against += m.teamBScore;

		stats[m.teamAPlayer2Id].points += m.teamAScore;
		stats[m.teamAPlayer2Id].for += m.teamAScore;
		stats[m.teamAPlayer2Id].against += m.teamBScore;

		stats[m.teamBPlayer1Id].points += m.teamBScore;
		stats[m.teamBPlayer1Id].for += m.teamBScore;
		stats[m.teamBPlayer1Id].against += m.teamAScore;

		stats[m.teamBPlayer2Id].points += m.teamBScore;
		stats[m.teamBPlayer2Id].for += m.teamBScore;
		stats[m.teamBPlayer2Id].against += m.teamAScore;
	});

	return Object.values(stats)
		.map((s) => ({ ...s, diff: s.for - s.against }))
		.sort((a, b) => {
			if (b.points !== a.points) return b.points - a.points;
			if (b.diff !== a.diff) return b.diff - a.diff;
			return Math.random() - 0.5;
		})
		.map((s, i) => ({ ...s, rank: i + 1 }));
}

function redistributePlayers(courtResults: any[], isFirstRound: boolean) {
	if (isFirstRound) {
		// Round 1 -> Round 2: Vertical redistribution by rank
		const byRank: { [rank: number]: number[] } = { 1: [], 2: [], 3: [], 4: [] };

		for (const court of courtResults) {
			for (const standing of court.standings) {
				byRank[standing.rank].push(standing.playerId);
			}
		}

		return [
			{ courtNumber: 1, playerIds: byRank[1] },
			{ courtNumber: 2, playerIds: byRank[2] },
			{ courtNumber: 3, playerIds: byRank[3] },
			{ courtNumber: 4, playerIds: byRank[4] }
		];
	} else {
		// Round 2+: Ladder system
		const courts = courtResults.sort((a, b) => a.courtNumber - b.courtNumber);

		return [
			{
				courtNumber: 1,
				playerIds: [
					...courts[0].standings.slice(0, 2).map((s: any) => s.playerId),
					...courts[1].standings.slice(0, 2).map((s: any) => s.playerId)
				]
			},
			{
				courtNumber: 2,
				playerIds: [
					...courts[0].standings.slice(2, 4).map((s: any) => s.playerId),
					...courts[2].standings.slice(0, 2).map((s: any) => s.playerId)
				]
			},
			{
				courtNumber: 3,
				playerIds: [
					...courts[1].standings.slice(2, 4).map((s: any) => s.playerId),
					...courts[3].standings.slice(0, 2).map((s: any) => s.playerId)
				]
			},
			{
				courtNumber: 4,
				playerIds: [
					...courts[2].standings.slice(2, 4).map((s: any) => s.playerId),
					...courts[3].standings.slice(2, 4).map((s: any) => s.playerId)
				]
			}
		];
	}
}
