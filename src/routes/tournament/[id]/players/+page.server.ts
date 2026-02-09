import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { tournament, player, courtRotation, match, courtAccess } from '$lib/server/db/schema';
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

	const players = await db.select().from(player).where(eq(player.tournamentId, tournamentId));

	return { tournament: tourney, players };
};

export const actions = {
	addPlayers: async ({ request, params, locals }) => {
		const user = locals.user;
		if (!user) throw error(401, 'Unauthorized');

		const tournamentId = parseInt(params.id);
		const formData = await request.formData();
		const namesText = formData.get('names')?.toString() || '';

		const names = namesText
			.split('\n')
			.map((n) => n.trim())
			.filter((n) => n.length > 0);

		if (names.length === 0) {
			return { error: 'Please enter at least one player name' };
		}

		// Check existing players
		const existingPlayers = await db
			.select()
			.from(player)
			.where(eq(player.tournamentId, tournamentId));

		const remainingSlots = 16 - existingPlayers.length;

		if (names.length > remainingSlots) {
			return {
				error: `Only ${remainingSlots} slots remaining. You entered ${names.length} names.`
			};
		}

		// Check for duplicates
		const existingNames = new Set(existingPlayers.map((p) => p.name.toLowerCase()));
		const newNames = names.filter((n) => !existingNames.has(n.toLowerCase()));

		if (newNames.length === 0) {
			return { error: 'All entered names are already in the tournament' };
		}

		// Insert new players
		for (const name of newNames) {
			await db.insert(player).values({
				tournamentId,
				name
			});
		}

		return {
			success: `Added ${newNames.length} player${newNames.length === 1 ? '' : 's'}. ${existingPlayers.length + newNames.length}/16 total.`
		};
	},

	start: async ({ params, locals }) => {
		const user = locals.user;
		if (!user) throw error(401, 'Unauthorized');

		const tournamentId = parseInt(params.id);

		// Get all players
		const players = await db.select().from(player).where(eq(player.tournamentId, tournamentId));

		if (players.length !== 16) {
			return { error: `Need exactly 16 players. Currently have ${players.length}.` };
		}

		// Shuffle players for initial assignment
		const shuffled = [...players].sort(() => Math.random() - 0.5);

		// Create court rotations for round 1
		for (let courtNum = 1; courtNum <= 4; courtNum++) {
			const courtPlayers = shuffled.slice((courtNum - 1) * 4, courtNum * 4);

			const [rotation] = await db
				.insert(courtRotation)
				.values({
					tournamentId,
					roundNumber: 1,
					courtNumber: courtNum,
					player1Id: courtPlayers[0].id,
					player2Id: courtPlayers[1].id,
					player3Id: courtPlayers[2].id,
					player4Id: courtPlayers[3].id
				})
				.returning();

			// Create 3 matches for this court
			const p1 = courtPlayers[0].id;
			const p2 = courtPlayers[1].id;
			const p3 = courtPlayers[2].id;
			const p4 = courtPlayers[3].id;

			// Match 1: P1 & P2 vs P3 & P4
			await db.insert(match).values({
				courtRotationId: rotation.id,
				matchNumber: 1,
				teamAPlayer1Id: p1,
				teamAPlayer2Id: p2,
				teamBPlayer1Id: p3,
				teamBPlayer2Id: p4
			});

			// Match 2: P1 & P3 vs P2 & P4
			await db.insert(match).values({
				courtRotationId: rotation.id,
				matchNumber: 2,
				teamAPlayer1Id: p1,
				teamAPlayer2Id: p3,
				teamBPlayer1Id: p2,
				teamBPlayer2Id: p4
			});

			// Match 3: P1 & P4 vs P2 & P3
			await db.insert(match).values({
				courtRotationId: rotation.id,
				matchNumber: 3,
				teamAPlayer1Id: p1,
				teamAPlayer2Id: p4,
				teamBPlayer1Id: p2,
				teamBPlayer2Id: p3
			});

			// Generate access token
			const token = crypto.randomBytes(16).toString('hex');
			await db.insert(courtAccess).values({
				courtRotationId: rotation.id,
				token,
				isActive: true
			});
		}

		// Update tournament status
		await db
			.update(tournament)
			.set({ status: 'active', currentRound: 1 })
			.where(eq(tournament.id, tournamentId));

		throw redirect(302, `/tournament/${tournamentId}`);
	}
};
