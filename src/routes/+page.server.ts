import { db } from '$lib/server/db';
import { tournament } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export const load = async ({ locals }) => {
	const user = locals.user;

	if (!user) {
		return { user: null, active: [], finished: [], archived: [] };
	}

	// Get all tournaments for this user
	const allTournaments = await db
		.select()
		.from(tournament)
		.where(eq(tournament.orgId, user.id))
		.orderBy(desc(tournament.createdAt));

	// Split by status
	const active = allTournaments.filter((t) => t.status === 'active');
	const finished = allTournaments.filter((t) => t.status === 'completed');
	const archived = allTournaments.filter((t) => t.status === 'archived').slice(0, 5);

	return { user, active, finished, archived };
};
