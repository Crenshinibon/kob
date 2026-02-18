import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { tournament, player, courtRotation, match, courtAccess } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

type PlayerWithPoints = {
	name: string;
	seedPoints: number | null;
};

export const load = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) throw redirect(302, '/login');

	const tournamentId = parseInt(params.id);
	const [tourney] = await db
		.select()
		.from(tournament)
		.where(and(eq(tournament.id, tournamentId), eq(tournament.orgId, user.id)));

	if (!tourney) throw error(404, 'Tournament not found');

	const players = await db.select().from(player).where(eq(player.tournamentId, tournamentId));

	return { tournament: tourney, players };
};

function parsePreseedInput(text: string): PlayerWithPoints[] {
	const lines = text
		.split('\n')
		.map((l) => l.trim())
		.filter((l) => l.length > 0);
	const result: PlayerWithPoints[] = [];

	for (const line of lines) {
		const commaIndex = line.lastIndexOf(',');
		if (commaIndex > 0) {
			const name = line.slice(0, commaIndex).trim();
			const pointsStr = line.slice(commaIndex + 1).trim();
			const points = parseInt(pointsStr, 10);
			if (name && !isNaN(points)) {
				result.push({ name, seedPoints: points });
				continue;
			}
		}
		result.push({ name: line, seedPoints: null });
	}

	return result;
}

function snakeDistribute<T>(items: T[], courtCount: number): T[][] {
	const courts: T[][] = Array.from({ length: courtCount }, () => []);
	const playersPerCourt = 4;

	for (let pos = 0; pos < playersPerCourt; pos++) {
		for (let court = 0; court < courtCount; court++) {
			const index = pos * courtCount + court;
			if (index < items.length) {
				courts[court].push(items[index]);
			}
		}
	}

	return courts;
}

export const actions = {
	addPlayers: async ({ request, params, locals }) => {
		const user = locals.user;
		if (!user) throw error(401, 'Unauthorized');

		const tournamentId = parseInt(params.id);
		const formData = await request.formData();
		const namesText = formData.get('names')?.toString() || '';

		const [tourney] = await db
			.select()
			.from(tournament)
			.where(and(eq(tournament.id, tournamentId), eq(tournament.orgId, user.id)));

		if (!tourney) throw error(404, 'Tournament not found');

		const maxPlayers = tourney.playerCount;
		const isPreseed = tourney.formatType === 'preseed';

		let playersToAdd: { name: string; seedPoints: number | null; seedRank: number | null }[];

		if (isPreseed) {
			const parsed = parsePreseedInput(namesText);
			if (parsed.length === 0) {
				return { error: 'Please enter at least one player (Name, Points)' };
			}

			const withoutPoints = parsed.filter((p) => p.seedPoints === null);
			if (withoutPoints.length > 0) {
				return {
					error: `Preseed format requires points for all players. Missing points for: ${withoutPoints.map((p) => p.name).join(', ')}`
				};
			}

			playersToAdd = parsed.map((p) => ({
				name: p.name,
				seedPoints: p.seedPoints,
				seedRank: null
			}));
		} else {
			const names = namesText
				.split('\n')
				.map((n) => n.trim())
				.filter((n) => n.length > 0);

			if (names.length === 0) {
				return { error: 'Please enter at least one player name' };
			}

			playersToAdd = names.map((name) => ({
				name,
				seedPoints: null,
				seedRank: null
			}));
		}

		const existingPlayers = await db
			.select()
			.from(player)
			.where(eq(player.tournamentId, tournamentId));

		const remainingSlots = maxPlayers - existingPlayers.length;

		if (playersToAdd.length > remainingSlots) {
			return {
				error: `Only ${remainingSlots} slots remaining. You entered ${playersToAdd.length} players.`
			};
		}

		const existingNames = new Set(existingPlayers.map((p) => p.name.toLowerCase()));
		const newPlayers = playersToAdd.filter((p) => !existingNames.has(p.name.toLowerCase()));

		if (newPlayers.length === 0) {
			return { error: 'All entered names are already in the tournament' };
		}

		for (const p of newPlayers) {
			await db.insert(player).values({
				tournamentId,
				name: p.name,
				seedPoints: p.seedPoints,
				seedRank: p.seedRank
			});
		}

		return {
			success: `Added ${newPlayers.length} player${newPlayers.length === 1 ? '' : 's'}. ${existingPlayers.length + newPlayers.length}/${maxPlayers} total.`
		};
	},

	start: async ({ params, locals }) => {
		const user = locals.user;
		if (!user) throw error(401, 'Unauthorized');

		const tournamentId = parseInt(params.id);

		const [tourney] = await db
			.select()
			.from(tournament)
			.where(and(eq(tournament.id, tournamentId), eq(tournament.orgId, user.id)));

		if (!tourney) throw error(404, 'Tournament not found');

		const maxPlayers = tourney.playerCount;
		const courtCount = maxPlayers / 4;
		const isPreseed = tourney.formatType === 'preseed';

		const allPlayers = await db.select().from(player).where(eq(player.tournamentId, tournamentId));

		if (allPlayers.length !== maxPlayers) {
			return { error: `Need exactly ${maxPlayers} players. Currently have ${allPlayers.length}.` };
		}

		let courtAssignments: (typeof allPlayers)[];

		if (isPreseed) {
			const sorted = [...allPlayers].sort((a, b) => (b.seedPoints ?? 0) - (a.seedPoints ?? 0));

			for (let i = 0; i < sorted.length; i++) {
				await db
					.update(player)
					.set({ seedRank: i + 1 })
					.where(eq(player.id, sorted[i].id));
			}

			courtAssignments = snakeDistribute(sorted, courtCount);
		} else {
			const shuffled = [...allPlayers].sort(() => Math.random() - 0.5);
			courtAssignments = [];
			for (let i = 0; i < courtCount; i++) {
				courtAssignments.push(shuffled.slice(i * 4, (i + 1) * 4));
			}
		}

		for (let courtNum = 1; courtNum <= courtCount; courtNum++) {
			const courtPlayers = courtAssignments[courtNum - 1];

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

			const p1 = courtPlayers[0].id;
			const p2 = courtPlayers[1].id;
			const p3 = courtPlayers[2].id;
			const p4 = courtPlayers[3].id;

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

		await db
			.update(tournament)
			.set({ status: 'active', currentRound: 1 })
			.where(eq(tournament.id, tournamentId));

		throw redirect(302, `/tournament/${tournamentId}`);
	}
};
