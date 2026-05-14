import { form } from '$app/server';
import { db } from '$lib/server/db';
import { match, courtAccess } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import * as v from 'valibot';

const baseScoreSchema = v.pipe(
	v.object({
		matchId: v.pipe(v.string(), v.nonEmpty()),
		teamAScore: v.pipe(v.string(), v.nonEmpty(), v.transform(Number)),
		teamBScore: v.pipe(v.string(), v.nonEmpty(), v.transform(Number))
	}),
	v.check((input) => {
		return (
			input.teamAScore >= 0 &&
			input.teamAScore <= 50 &&
			input.teamBScore >= 0 &&
			input.teamBScore <= 50
		);
	}, 'Scores must be between 0 and 50'),
	v.check((input) => {
		return input.teamAScore !== input.teamBScore;
	}, 'Scores cannot be tied'),
	v.check((input) => {
		const maxScore = Math.max(input.teamAScore, input.teamBScore);
		const minScore = Math.min(input.teamAScore, input.teamBScore);
		return maxScore - minScore >= 2;
	}, 'Winner must win by at least 2 points')
);

export const saveScore = form(baseScoreSchema, async (data) => {
	const matchId = parseInt(data.matchId);
	const teamAScore = data.teamAScore;
	const teamBScore = data.teamBScore;

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
