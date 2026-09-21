import { error } from '@sveltejs/kit';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { tournament } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import * as m from '$lib/paraglide/messages';

export async function requireOrganizerTournament(tournamentId: number) {
	const event = getRequestEvent();
	const user = event.locals.user;
	if (!user) error(401, m.login_prompt());

	const [tourney] = await db
		.select()
		.from(tournament)
		.where(and(eq(tournament.id, tournamentId), eq(tournament.orgId, user.id)));

	if (!tourney) error(404, m.tournament_not_found());
	return { user, tourney };
}
