import { form } from '$app/server';
import { invalid } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { match, court, tournament, courtRotation } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import {
	getMinPointsForSet,
	getEffectiveScoring,
	isValidFinalScore,
	getMaxSets,
	isDecidingSet,
	type ScoringOverrides
} from '$lib/server/tournament-logic';
import * as v from 'valibot';
import * as m from '$lib/paraglide/messages';

const baseScoreSchema = v.pipe(
	v.object({
		token: v.pipe(v.string(), v.nonEmpty()),
		matchId: v.pipe(v.string(), v.nonEmpty()),
		teamAScore: v.pipe(v.string(), v.nonEmpty(), v.transform(Number)),
		teamBScore: v.pipe(v.string(), v.nonEmpty(), v.transform(Number))
	}),
	v.check((input) => {
		return input.teamAScore >= 0 && input.teamBScore >= 0;
	}, m.err_score_range()),
	v.check((input) => {
		return input.teamAScore !== input.teamBScore;
	}, m.err_score_tied())
);

const setScoreSchema = v.pipe(
	v.object({
		token: v.pipe(v.string(), v.nonEmpty()),
		matchId: v.pipe(v.string(), v.nonEmpty()),
		setNumber: v.pipe(v.string(), v.nonEmpty(), v.transform(Number)),
		teamAScore: v.pipe(v.string(), v.nonEmpty(), v.transform(Number)),
		teamBScore: v.pipe(v.string(), v.nonEmpty(), v.transform(Number))
	}),
	v.check((input) => {
		return input.teamAScore >= 0 && input.teamBScore >= 0;
	}, m.err_score_range()),
	v.check((input) => {
		return input.teamAScore !== input.teamBScore;
	}, m.err_score_tied())
);

async function resolveRotationByToken(token: string) {
	const [rotationByToken] = await db
		.select()
		.from(courtRotation)
		.where(eq(courtRotation.token, token));

	if (rotationByToken) {
		const [courtRecord] = await db.select().from(court).where(eq(court.id, rotationByToken.courtId));
		return { rotation: rotationByToken, courtRecord };
	}

	const [courtRecord] = await db.select().from(court).where(eq(court.token, token));
	if (!courtRecord) return null;

	const [tourney] = await db
		.select()
		.from(tournament)
		.where(eq(tournament.id, courtRecord.tournamentId));
	if (!tourney) return null;

	const currentRound = tourney.currentRound || 0;
	if (currentRound === 0) return null;

	const [rotation] = await db
		.select()
		.from(courtRotation)
		.where(
			and(eq(courtRotation.courtId, courtRecord.id), eq(courtRotation.roundNumber, currentRound))
		);

	return rotation ? { rotation, courtRecord } : null;
}

async function getMatchContext(matchId: number, token: string) {
	const resolved = await resolveRotationByToken(token);
	if (!resolved) return { error: m.err_invalid_match() };

	const { rotation, courtRecord } = resolved;
	if (!courtRecord || !courtRecord.isActive) return { error: m.err_court_not_active() };

	const [matchRecord] = await db.select().from(match).where(eq(match.id, matchId));
	if (!matchRecord) return { error: m.err_invalid_match() };

	if (matchRecord.courtRotationId !== rotation.id) {
		return { error: m.err_invalid_match() };
	}

	if (matchRecord.isCanceled) return { error: m.err_match_canceled() };

	const [tourney] = await db
		.select()
		.from(tournament)
		.where(eq(tournament.id, rotation.tournamentId));

	if (!tourney) return { error: m.tournament_not_found() };

	const currentRound = tourney.currentRound || 0;
	if (rotation.roundNumber !== currentRound || tourney.status !== 'active') {
		return { error: m.err_court_read_only() };
	}

	return { matchRecord, rotation, tourney };
}

async function validateDecidingSetAllowed(
	courtRotationId: number,
	matchNumber: number,
	setNumber: number,
	setsToWin: number
): Promise<boolean> {
	if (!isDecidingSet(setNumber, setsToWin)) return true;

	const rows = await db
		.select()
		.from(match)
		.where(and(eq(match.courtRotationId, courtRotationId), eq(match.matchNumber, matchNumber)));

	const set1 = rows.find((r) => r.setNumber === 1);
	const set2 = rows.find((r) => r.setNumber === 2);
	if (!set1 || !set2 || set1.teamAScore === null || set2.teamAScore === null) return false;

	const teamAWins = (set1.teamAScore > set1.teamBScore! ? 1 : 0) + (set2.teamAScore > set2.teamBScore! ? 1 : 0);
	const teamBWins = (set1.teamBScore! > set1.teamAScore ? 1 : 0) + (set2.teamBScore! > set2.teamAScore ? 1 : 0);
	return teamAWins >= 1 && teamBWins >= 1;
}

export const saveScore = form(baseScoreSchema, async (data, issue) => {
	const matchId = parseInt(data.matchId);
	const teamAScore = data.teamAScore;
	const teamBScore = data.teamBScore;

	const ctx = await getMatchContext(matchId, data.token);
	if ('error' in ctx) return invalid(issue.teamAScore(ctx.error ?? m.err_court_error()));

	const { matchRecord, rotation, tourney } = ctx;
	const config = {
		pointsToWin: tourney.pointsToWin ?? 21,
		winBy: tourney.winBy ?? 2,
		setsToWin: tourney.setsToWin ?? 1,
		decidingSetPoints: tourney.decidingSetPoints ?? 15
	};
	const effective = getEffectiveScoring(
		rotation.courtSize,
		config,
		tourney.scoringOverrides as ScoringOverrides | null
	);
	const minPoints = getMinPointsForSet(
		matchRecord.setNumber,
		rotation.courtSize,
		config,
		tourney.scoringOverrides as ScoringOverrides | null
	);
	const winner = Math.max(teamAScore, teamBScore);
	const loser = Math.min(teamAScore, teamBScore);

	if (!isValidFinalScore(winner, loser, minPoints, effective.winBy)) {
		if (teamAScore > teamBScore) {
			return invalid(issue.teamAScore(m.err_score_invalid({ minPoints, winBy: effective.winBy })));
		} else {
			return invalid(issue.teamBScore(m.err_score_invalid({ minPoints, winBy: effective.winBy })));
		}
	}

	await db.update(match).set({ teamAScore, teamBScore }).where(eq(match.id, matchId));

	await db
		.update(tournament)
		.set({ lastActivityAt: new Date() })
		.where(eq(tournament.id, rotation.tournamentId));

	return { success: true, matchId, teamAScore, teamBScore };
});

export const saveSetScore = form(setScoreSchema, async (data, issue) => {
	const matchId = parseInt(data.matchId);
	const setNumber = data.setNumber;
	const teamAScore = data.teamAScore;
	const teamBScore = data.teamBScore;

	const ctx = await getMatchContext(matchId, data.token);
	if ('error' in ctx) return invalid(issue.teamAScore(ctx.error ?? m.err_court_error()));

	const { matchRecord, rotation, tourney } = ctx;
	const config = {
		pointsToWin: tourney.pointsToWin ?? 21,
		winBy: tourney.winBy ?? 2,
		setsToWin: tourney.setsToWin ?? 1,
		decidingSetPoints: tourney.decidingSetPoints ?? 15
	};
	const effective = getEffectiveScoring(
		rotation.courtSize,
		config,
		tourney.scoringOverrides as ScoringOverrides | null
	);
	const maxSets = getMaxSets(effective.setsToWin);

	if (setNumber < 1 || setNumber > maxSets) {
		return invalid(issue.setNumber(m.err_score_invalid({ minPoints: 1, winBy: effective.winBy })));
	}

	if (!(await validateDecidingSetAllowed(matchRecord.courtRotationId, matchRecord.matchNumber, setNumber, effective.setsToWin))) {
		return invalid(issue.setNumber(m.err_score_invalid({ minPoints: 1, winBy: effective.winBy })));
	}

	const minPoints = getMinPointsForSet(
		setNumber,
		rotation.courtSize,
		config,
		tourney.scoringOverrides as ScoringOverrides | null
	);
	const winner = Math.max(teamAScore, teamBScore);
	const loser = Math.min(teamAScore, teamBScore);

	if (!isValidFinalScore(winner, loser, minPoints, effective.winBy)) {
		return invalid(
			issue.teamAScore(m.err_score_invalid({ minPoints, winBy: effective.winBy })),
			issue.teamBScore(m.err_score_invalid({ minPoints, winBy: effective.winBy }))
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

	await db
		.update(tournament)
		.set({ lastActivityAt: new Date() })
		.where(eq(tournament.id, rotation.tournamentId));

	return { success: true, matchId, setNumber, teamAScore, teamBScore };
});
