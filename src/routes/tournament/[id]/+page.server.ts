import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { tournament, courtRotation, match, courtAccess, player } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import {
	calculateCourtStandings,
	redistributePlayers,
	type MatchData
} from '$lib/server/tournament-logic';

export const load = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) throw redirect(302, '/login');

	const tournamentId = parseInt(params.id);
	const [tourney] = await db
		.select()
		.from(tournament)
		.where(and(eq(tournament.id, tournamentId), eq(tournament.orgId, user.id)));

	if (!tourney) throw error(404, 'Tournament not found');

	const currentRound = tourney.currentRound || 1;
	const courtCount = tourney.playerCount / 4;
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

	const allMatches = courts.flatMap((c) => c.matches);
	const expectedMatches = courtCount * 3;
	const canCloseRound =
		allMatches.length === expectedMatches && allMatches.every((m) => m.teamAScore !== null);
	const isFinalRound = currentRound >= tourney.numRounds;

	return { tournament: tourney, courts, canCloseRound, isFinalRound, courtCount };
};

export const actions = {
	closeRound: async ({ params, locals }) => {
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
		const courtCount = tourney.playerCount / 4;
		const isPreseed = tourney.formatType === 'preseed';

		if (currentRound >= tourney.numRounds) {
			await db
				.update(tournament)
				.set({ status: 'completed' })
				.where(eq(tournament.id, tournamentId));

			throw redirect(303, `/tournament/${tournamentId}/standings`);
		} else {
			const rotations = await db
				.select()
				.from(courtRotation)
				.where(
					and(
						eq(courtRotation.tournamentId, tournamentId),
						eq(courtRotation.roundNumber, currentRound)
					)
				);

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

			const nextRound = currentRound + 1;
			const assignments = redistributePlayers(courtResults, currentRound, courtCount, isPreseed);

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

				const token = crypto.randomBytes(16).toString('hex');
				await db.insert(courtAccess).values({
					courtRotationId: rotation.id,
					token,
					isActive: true
				});
			}

			for (const rotation of rotations) {
				await db
					.update(courtAccess)
					.set({ isActive: false })
					.where(eq(courtAccess.courtRotationId, rotation.id));
			}

			await db
				.update(tournament)
				.set({ currentRound: nextRound })
				.where(eq(tournament.id, tournamentId));
		}

		return { success: true };
	},

	deleteTournament: async ({ params, locals }) => {
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
	}
};
