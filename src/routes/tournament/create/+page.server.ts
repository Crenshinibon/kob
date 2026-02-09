import { redirect, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { tournament } from '$lib/server/db/schema';

export const actions = {
	create: async ({ request, locals }) => {
		const user = locals.user;

		if (!user) {
			throw error(401, 'Unauthorized');
		}

		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim();
		const numRounds = parseInt(formData.get('numRounds')?.toString() || '3');

		if (!name) {
			return { error: 'Tournament name is required' };
		}

		if (numRounds < 1 || numRounds > 10) {
			return { error: 'Number of rounds must be 1-10' };
		}

		const [newTournament] = await db
			.insert(tournament)
			.values({
				orgId: user.id,
				name,
				numRounds,
				status: 'draft',
				currentRound: 0
			})
			.returning();

		throw redirect(302, `/tournament/${newTournament.id}/players`);
	}
};
