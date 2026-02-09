import { form } from '$app/server';
import { db } from '$lib/server/db';
import { match, courtAccess } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { scoreSchema } from './scoreSchema';

export const saveScore = form(scoreSchema, async (data) => {
	const matchId = parseInt(data.matchId);
	const teamAScore = parseInt(data.teamAScore);
	const teamBScore = parseInt(data.teamBScore);

	// Get match and verify it exists
	const [matchRecord] = await db.select().from(match).where(eq(match.id, matchId));

	if (!matchRecord) {
		return { error: 'Invalid match' };
	}

	// Check if court is still active
	const [access] = await db
		.select()
		.from(courtAccess)
		.where(eq(courtAccess.courtRotationId, matchRecord.courtRotationId));

	if (!access || !access.isActive) {
		return { error: 'Court is not active' };
	}

	// Save score
	await db.update(match).set({ teamAScore, teamBScore }).where(eq(match.id, matchId));

	return { success: true, matchId, teamAScore, teamBScore };
});
