import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { player, tournament } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import * as m from '$lib/paraglide/messages';
import { shouldAutoCheckIn } from '$lib/player-page-logic';
import { fetchPlayerPageData } from '$lib/server/player-page-data';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const [row] = await db.select().from(player).where(eq(player.token, params.token));
	if (!row) error(404, m.player_not_found());

	const [tourney] = await db.select().from(tournament).where(eq(tournament.id, row.tournamentId));
	if (!tourney) error(404, m.tournament_not_found());

	if (
		shouldAutoCheckIn(
			{ status: tourney.status, orgId: tourney.orgId },
			{ checkedInAt: row.checkedInAt, checkInSource: row.checkInSource },
			locals.user?.id ?? null
		)
	) {
		await db
			.update(player)
			.set({ checkedInAt: new Date(), checkInSource: 'scan' })
			.where(eq(player.id, row.id));
	}

	const playerPageData = await fetchPlayerPageData(params.token);
	return { token: params.token, playerPageData };
};
