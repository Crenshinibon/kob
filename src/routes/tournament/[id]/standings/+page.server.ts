import { error } from '@sveltejs/kit';
import * as m from '$lib/paraglide/messages';
import { db } from '$lib/server/db';
import { tournament } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const tournamentId = parseInt(params.id);
	const [tourney] = await db.select().from(tournament).where(eq(tournament.id, tournamentId));

	if (!tourney) throw error(404, m.tournament_not_found());

	return { tournamentId, tournament: tourney };
};
