import { redirect, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { tournament } from '$lib/server/db/schema';

export const load = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}
	return {};
};

export const actions = {
	create: async ({ request, locals }) => {
		const user = locals.user;

		if (!user) {
			throw error(401, 'Unauthorized');
		}

		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim();
		const formatType = formData.get('formatType')?.toString() || 'random-seed';
		const playerCount = parseInt(formData.get('playerCount')?.toString() || '16');
		let numRounds = parseInt(formData.get('numRounds')?.toString() || '3');

		if (!name) {
			return { error: 'Tournament name is required' };
		}

		if (formatType !== 'random-seed' && formatType !== 'preseed') {
			return { error: 'Invalid format type' };
		}

		if (playerCount !== 16 && playerCount !== 32) {
			return { error: 'Player count must be 16 or 32' };
		}

		if (formatType === 'preseed') {
			numRounds = playerCount === 16 ? 3 : 4;
		} else {
			if (numRounds < 1 || numRounds > 10) {
				return { error: 'Number of rounds must be 1-10' };
			}
		}

		const [newTournament] = await db
			.insert(tournament)
			.values({
				orgId: user.id,
				name,
				numRounds,
				formatType,
				playerCount,
				status: 'draft',
				currentRound: 0
			})
			.returning();

		throw redirect(302, `/tournament/${newTournament.id}/players`);
	}
};
