import { form, getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { match, courtAccess, tournament, courtRotation } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import * as v from 'valibot';

function getScoreCapForSet(setNumber: number, courtSize: number, tourney: typeof tournament.$inferSelect): number {
	const setsToWin = tourney.setsToWin ?? 1;
	const pointsToWin = tourney.pointsToWin ?? 21;
	const decidingSetPoints = tourney.decidingSetPoints ?? 15;

	if (setsToWin >= 2) {
		const isDecidingSet = setNumber === setsToWin * 2 - 1;
		return isDecidingSet ? decidingSetPoints : pointsToWin;
	}
	if (courtSize >= 5) {
		return pointsToWin === 21 ? 15 : pointsToWin;
	}
	return pointsToWin;
}

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

	const [matchRecord] = await db.select().from(match).where(eq(match.id, matchId));

	if (!matchRecord) {
		return { error: 'Invalid match' };
	}

	const [access] = await db
		.select()
		.from(courtAccess)
		.where(eq(courtAccess.courtRotationId, matchRecord.courtRotationId));

	if (!access || !access.isActive) {
		return { error: 'Court is not active' };
	}

	const [rotation] = await db
		.select()
		.from(courtRotation)
		.where(eq(courtRotation.id, matchRecord.courtRotationId));

	const [tourney] = await db
		.select()
		.from(tournament)
		.where(eq(tournament.id, rotation.tournamentId));

	const scoreCap = getScoreCapForSet(1, rotation.courtSize, tourney);
	const maxScore = Math.max(teamAScore, teamBScore);

	if (maxScore < scoreCap) {
		return { error: `Winner must have at least ${scoreCap} points` };
	}

	await db.update(match).set({ teamAScore, teamBScore }).where(eq(match.id, matchId));

	return { success: true, matchId, teamAScore, teamBScore };
});

export const saveSetScore = form(setScoreSchema, async (data) => {
	const matchId = parseInt(data.matchId);
	const setNumber = data.setNumber;
	const teamAScore = data.teamAScore;
	const teamBScore = data.teamBScore;

	const [matchRecord] = await db.select().from(match).where(eq(match.id, matchId));

	if (!matchRecord) {
		return { error: 'Invalid match' };
	}

	const [access] = await db
		.select()
		.from(courtAccess)
		.where(eq(courtAccess.courtRotationId, matchRecord.courtRotationId));

	if (!access || !access.isActive) {
		return { error: 'Court is not active' };
	}

	const [rotation] = await db
		.select()
		.from(courtRotation)
		.where(eq(courtRotation.id, matchRecord.courtRotationId));

	const [tourney] = await db
		.select()
		.from(tournament)
		.where(eq(tournament.id, rotation.tournamentId));

	const scoreCap = getScoreCapForSet(setNumber, rotation.courtSize, tourney);
	const maxScore = Math.max(teamAScore, teamBScore);

	if (maxScore < scoreCap) {
		return { error: `Winner must have at least ${scoreCap} points` };
	}

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
		await db
			.update(match)
			.set({ teamAScore, teamBScore })
			.where(eq(match.id, existingSet.id));
	} else {
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
