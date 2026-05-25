import { db } from './db';
import { tournament, player, courtRotation, match, court } from '../src/lib/server/db/schema';
import { eq, inArray, and, lt, sql } from 'drizzle-orm';

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

async function cleanupOldTournaments() {
	console.log('Running tournament cleanup...');
	let totalDeleted = 0;

	const closedCutoff = new Date();
	closedCutoff.setDate(closedCutoff.getDate() - CLOSED_TOURNAMENT_MAX_AGE_DAYS);

	const closedTournaments = await db
		.select({ id: tournament.id, name: tournament.name })
		.from(tournament)
		.where(and(eq(tournament.status, 'completed'), lt(tournament.createdAt, closedCutoff)));

	if (closedTournaments.length > 0) {
		console.log(
			`Deleting ${closedTournaments.length} completed tournaments older than ${CLOSED_TOURNAMENT_MAX_AGE_DAYS} days:`,
			closedTournaments.map((t) => t.name)
		);
		await deleteTournaments(closedTournaments.map((t) => t.id));
		totalDeleted += closedTournaments.length;
	}

	const inactiveCutoff = new Date();
	inactiveCutoff.setDate(inactiveCutoff.getDate() - INACTIVE_TOURNAMENT_MAX_AGE_DAYS);

	const inactiveTournaments = await db
		.select({ id: tournament.id, name: tournament.name })
		.from(tournament)
		.where(lt(tournament.createdAt, inactiveCutoff));

	const alreadyDeleted = new Set(closedTournaments.map((t) => t.id));
	const staleTournaments = inactiveTournaments.filter((t) => !alreadyDeleted.has(t.id));

	if (staleTournaments.length > 0) {
		console.log(
			`Deleting ${staleTournaments.length} inactive tournaments older than ${INACTIVE_TOURNAMENT_MAX_AGE_DAYS} days:`,
			staleTournaments.map((t) => t.name)
		);
		await deleteTournaments(staleTournaments.map((t) => t.id));
		totalDeleted += staleTournaments.length;
	}

	if (totalDeleted === 0) {
		console.log('No old tournaments to clean up');
	} else {
		console.log(`Cleanup complete: deleted ${totalDeleted} tournaments`);
	}
}

cleanupOldTournaments().catch((err) => {
	console.error('Cleanup failed:', err);
	process.exit(1);
});
