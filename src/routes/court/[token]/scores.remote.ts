import { form } from '$app/server';
import { invalid } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { match, court, tournament, courtRotation } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { getMinPointsForSet, getEffectiveScoring } from '$lib/server/tournament-logic';
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
	}, 'Scores cannot be tied')
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
	}, 'Scores cannot be tied')
);

async function getMatchContext(matchId: number) {
	const [matchRecord] = await db.select().from(match).where(eq(match.id, matchId));
	if (!matchRecord) return null;

	const [rotation] = await db
		.select()
		.from(courtRotation)
		.where(eq(courtRotation.id, matchRecord.courtRotationId));

	if (!rotation) return null;

	const [courtRecord] = await db.select().from(court).where(eq(court.id, rotation.courtId));

	if (!courtRecord || !courtRecord.isActive) return { error: 'Court is not active' as const };

	if (matchRecord.isCanceled)
		return { error: 'Match is canceled' as const };

	const [tourney] = await db
		.select()
		.from(tournament)
		.where(eq(tournament.id, rotation.tournamentId));

	return { matchRecord, rotation, tourney };
}

export const saveScore = form(baseScoreSchema, async (data, issue) => {
	const matchId = parseInt(data.matchId);
	const teamAScore = data.teamAScore;
	const teamBScore = data.teamBScore;

	const ctx = await getMatchContext(matchId);
	if (!ctx) invalid(issue.teamAScore('Invalid match'));
	if (ctx && 'error' in ctx) invalid(issue.teamAScore(ctx.error ?? 'Court error'));

	const { matchRecord, rotation, tourney } = ctx!;
	const config = {
		pointsToWin: tourney.pointsToWin ?? 21,
		winBy: tourney.winBy ?? 2,
		setsToWin: tourney.setsToWin ?? 1,
		decidingSetPoints: tourney.decidingSetPoints ?? 15
	};
	const effective = getEffectiveScoring(
		rotation.courtSize,
		config,
		tourney.scoringOverrides as any
	);
	const minPoints = getMinPointsForSet(
		1,
		rotation.courtSize,
		config,
		tourney.scoringOverrides as any
	);
	const maxScore = Math.max(teamAScore, teamBScore);
	const minScore = Math.min(teamAScore, teamBScore);

	if (maxScore < minPoints) {
		invalid(
			issue.teamAScore(`Winner must have at least ${minPoints} points`),
			issue.teamBScore(`Winner must have at least ${minPoints} points`)
		);
	}

	if (maxScore - minScore < effective.winBy) {
		invalid(
			issue.teamAScore(`Winner must win by at least ${effective.winBy} point${effective.winBy > 1 ? 's' : ''}`),
			issue.teamBScore(`Winner must win by at least ${effective.winBy} point${effective.winBy > 1 ? 's' : ''}`)
		);
	}

	await db.update(match).set({ teamAScore, teamBScore }).where(eq(match.id, matchId));

	return { success: true, matchId, teamAScore, teamBScore };
});

export const saveSetScore = form(setScoreSchema, async (data, issue) => {
	const matchId = parseInt(data.matchId);
	const setNumber = data.setNumber;
	const teamAScore = data.teamAScore;
	const teamBScore = data.teamBScore;

	const ctx = await getMatchContext(matchId);
	if (!ctx) invalid(issue.teamAScore('Invalid match'));
	if (ctx && 'error' in ctx) invalid(issue.teamAScore(ctx.error ?? 'Court error'));

	const { matchRecord, rotation, tourney } = ctx!;
	const config = {
		pointsToWin: tourney.pointsToWin ?? 21,
		winBy: tourney.winBy ?? 2,
		setsToWin: tourney.setsToWin ?? 1,
		decidingSetPoints: tourney.decidingSetPoints ?? 15
	};
	const effective = getEffectiveScoring(
		rotation.courtSize,
		config,
		tourney.scoringOverrides as any
	);
	const minPoints = getMinPointsForSet(
		setNumber,
		rotation.courtSize,
		config,
		tourney.scoringOverrides as any
	);
	const maxScore = Math.max(teamAScore, teamBScore);
	const minScore = Math.min(teamAScore, teamBScore);

	if (maxScore < minPoints) {
		invalid(
			issue.teamAScore(`Winner must have at least ${minPoints} points`),
			issue.teamBScore(`Winner must have at least ${minPoints} points`)
		);
	}

	if (maxScore - minScore < effective.winBy) {
		invalid(
			issue.teamAScore(`Winner must win by at least ${effective.winBy} point${effective.winBy > 1 ? 's' : ''}`),
			issue.teamBScore(`Winner must win by at least ${effective.winBy} point${effective.winBy > 1 ? 's' : ''}`)
		);
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
		await db.update(match).set({ teamAScore, teamBScore }).where(eq(match.id, existingSet.id));
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
