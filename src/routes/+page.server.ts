import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { tournament } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;

	if (!user) {
		return { user: null, tournaments: [] };
	}

	const tournaments = await db
		.select()
		.from(tournament)
		.where(eq(tournament.orgId, user.id))
		.orderBy(desc(tournament.createdAt));

	return { user, tournaments };
};
