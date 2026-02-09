import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { tournament, courtRotation, match, courtAccess, player } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const load = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) throw redirect(302, '/demo/better-auth/login');

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

		// TODO: Implement promotion/relegation logic
		// For now, just mark as completed if it's the last round
		const currentRound = tourney.currentRound || 1;
		if (currentRound >= tourney.numRounds) {
			await db
				.update(tournament)
				.set({ status: 'completed' })
				.where(eq(tournament.id, tournamentId));
		} else {
			// Advance to next round (simplified - just increment for now)
			await db
				.update(tournament)
				.set({ currentRound: currentRound + 1 })
				.where(eq(tournament.id, tournamentId));
		}

		return { success: true };
	}
};
