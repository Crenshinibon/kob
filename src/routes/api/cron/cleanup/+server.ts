import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { tournament, player, courtRotation, match, court } from '$lib/server/db/schema';
import { eq, and, lt, inArray } from 'drizzle-orm';
import type { RequestHandler } from './$types';

const CLOSED_TOURNAMENT_MAX_AGE_DAYS = 14;
const INACTIVE_TOURNAMENT_MAX_AGE_DAYS = 31;

async function deleteTournaments(ids: number[]) {
	if (ids.length === 0) return;

	for (const id of ids) {
		const rotations = await db
			.select({ id: courtRotation.id })
			.from(courtRotation)
			.where(eq(courtRotation.tournamentId, id));
		const rotationIds = rotations.map((r) => r.id);

		if (rotationIds.length > 0) {
			await db.delete(match).where(inArray(match.courtRotationId, rotationIds));
		}

		await db.delete(courtRotation).where(eq(courtRotation.tournamentId, id));
		await db.delete(court).where(eq(court.tournamentId, id));
		await db.delete(player).where(eq(player.tournamentId, id));
	}

	await db.delete(tournament).where(inArray(tournament.id, ids));
}

export const GET: RequestHandler = async ({ request }) => {
	const authHeader = request.headers.get('authorization');
	if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	let totalDeleted = 0;

	const closedCutoff = new Date();
	closedCutoff.setDate(closedCutoff.getDate() - CLOSED_TOURNAMENT_MAX_AGE_DAYS);

	const closedTournaments = await db
		.select({ id: tournament.id })
		.from(tournament)
		.where(and(eq(tournament.status, 'completed'), lt(tournament.lastActivityAt, closedCutoff)));

	if (closedTournaments.length > 0) {
		await deleteTournaments(closedTournaments.map((t) => t.id));
		totalDeleted += closedTournaments.length;
	}

	const inactiveCutoff = new Date();
	inactiveCutoff.setDate(inactiveCutoff.getDate() - INACTIVE_TOURNAMENT_MAX_AGE_DAYS);

	const inactiveTournaments = await db
		.select({ id: tournament.id })
		.from(tournament)
		.where(lt(tournament.lastActivityAt, inactiveCutoff));

	const alreadyDeleted = new Set(closedTournaments.map((t) => t.id));
	const staleTournaments = inactiveTournaments.filter((t) => !alreadyDeleted.has(t.id));

	if (staleTournaments.length > 0) {
		await deleteTournaments(staleTournaments.map((t) => t.id));
		totalDeleted += staleTournaments.length;
	}

	return json({ deleted: totalDeleted });
};
