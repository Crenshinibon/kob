import { db } from '../src/lib/server/db';
import { tournament, player, courtRotation, match, courtAccess } from '../src/lib/server/db/schema';
import { eq, inArray } from 'drizzle-orm';

async function wipeAllTournaments() {
	console.log('🗑️ Wiping ALL tournaments from database...');

	const allTournaments = await db.select({ id: tournament.id }).from(tournament);

	if (allTournaments.length === 0) {
		console.log('✅ No tournaments to delete');
		return;
	}

	const tournamentIds = allTournaments.map((t) => t.id);
	console.log(`📊 Found ${tournamentIds.length} tournaments`);

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

	console.log(`✅ Successfully deleted ${tournamentIds.length} tournaments`);
}

wipeAllTournaments().catch((err) => {
	console.error('❌ Failed to wipe tournaments:', err);
	process.exit(1);
});
