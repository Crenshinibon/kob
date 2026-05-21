import { form } from '$app/server';
import { db } from '$lib/server/db';
import { match, courtAccess } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
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

const setScoreSchema = v.pipe(
	v.object({
		matchId: v.pipe(v.string(), v.nonEmpty()),
		setNumber: v.pipe(v.string(), v.nonEmpty(), v.transform(Number)),
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

export const saveSetScore = form(setScoreSchema, async (data) => {
	const matchId = parseInt(data.matchId);
	const setNumber = data.setNumber;
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

	// Check if this set already has a score
	const [existingSet] = await db
		.select()
		.from(match)
		.where(
			and(
				eq(match.courtRotationId, matchRecord.courtRotationId),
				eq(match.matchNumber, matchRecord.matchNumber),
				eq(match.setNumber, setNumber)
			)
		);

	if (existingSet) {
		// Update existing set score
		await db
			.update(match)
			.set({ teamAScore, teamBScore })
			.where(eq(match.id, existingSet.id));
	} else {
		// Create new set score row
		await db.insert(match).values({
			courtRotationId: matchRecord.courtRotationId,
			matchNumber: matchRecord.matchNumber,
			setNumber,
			teamAPlayer1Id: matchRecord.teamAPlayer1Id,
			teamAPlayer2Id: matchRecord.teamAPlayer2Id,
			teamBPlayer1Id: matchRecord.teamBPlayer1Id,
			teamBPlayer2Id: matchRecord.teamBPlayer2Id,
			teamAScore,
			teamBScore
		});
	}

	return { success: true, matchId, setNumber, teamAScore, teamBScore };
});
