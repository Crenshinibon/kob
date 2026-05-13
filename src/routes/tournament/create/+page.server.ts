import { redirect, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { tournament } from '$lib/server/db/schema';
import {
	getCourtConfiguration,
	calculateRoundCount,
	matchCountForCourtSize
} from '$lib/server/tournament-logic';

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
		const schedulingMode = formData.get('schedulingMode')?.toString() || 'batch';

		if (!name) {
			return { error: 'Tournament name is required' };
		}

		if (formatType !== 'random-seed' && formatType !== 'preseed') {
			return { error: 'Invalid format type' };
		}

		if (playerCount < 8 || playerCount > 64) {
			return { error: 'Player count must be between 8 and 64' };
		}

		const config = getCourtConfiguration(playerCount);
		const courtSizes = config.bottomCourtSize
			? [...Array(config.standardCourts).fill(4), config.bottomCourtSize]
			: Array(config.totalCourts).fill(4);

		const numRounds = calculateRoundCount(config.totalCourts, formatType);

		const [newTournament] = await db
			.insert(tournament)
			.values({
				orgId: user.id,
				name,
				numRounds,
				formatType,
				schedulingMode,
				playerCount,
				courtSizes: JSON.stringify(courtSizes),
				status: 'draft',
				currentRound: 0
			})
			.returning();

		throw redirect(302, `/tournament/${newTournament.id}/players`);
	}
};
