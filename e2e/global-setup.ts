import { db } from '../src/lib/server/db';
import { tournament, player, courtRotation, match, courtAccess } from '../src/lib/server/db/schema';
import { lt, eq, inArray } from 'drizzle-orm';

export async function setup() {
	console.log('🧹 Cleaning up old test tournaments...');

	const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

	// Find old tournaments
	const oldTournaments = await db
		.select({ id: tournament.id })
		.from(tournament)
		.where(lt(tournament.createdAt, oneHourAgo));

	if (oldTournaments.length === 0) {
		console.log('✅ No old tournaments to clean up');
		return;
	}

	const tournamentIds = oldTournaments.map((t) => t.id);
	console.log(`🗑️ Found ${tournamentIds.length} tournaments older than 1 hour`);

	// Delete in correct order (foreign key constraints)
	for (const id of tournamentIds) {
		// Get rotations for this tournament
		const rotations = await db
			.select({ id: courtRotation.id })
			.from(courtRotation)
			.where(eq(courtRotation.tournamentId, id));
		const rotationIds = rotations.map((r) => r.id);

		if (rotationIds.length > 0) {
			// Delete court_access and matches for these rotations
			await db.delete(courtAccess).where(inArray(courtAccess.courtRotationId, rotationIds));
			await db.delete(match).where(inArray(match.courtRotationId, rotationIds));
		}

		// Delete court_rotations
		await db.delete(courtRotation).where(eq(courtRotation.tournamentId, id));

		// Delete players
		await db.delete(player).where(eq(player.tournamentId, id));
	}

	// Delete tournaments
	await db.delete(tournament).where(inArray(tournament.id, tournamentIds));

	console.log(`✅ Cleaned up ${tournamentIds.length} old tournaments`);
}

export async function teardown() {
	// Optional: cleanup after all tests
}
