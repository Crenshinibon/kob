import { form } from '$app/server';
import { invalid } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { match, court, tournament, courtRotation } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import {
	getMinPointsForSet,
	getEffectiveScoring,
	isValidFinalScore,
	type ScoringOverrides
} from '$lib/server/tournament-logic';
import * as v from 'valibot';
import * as m from '$lib/paraglide/messages';

const baseScoreSchema = v.pipe(
	v.object({
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

async function getMatchContext(matchId: number) {
	const [matchRecord] = await db.select().from(match).where(eq(match.id, matchId));
	if (!matchRecord) return null;

	const [rotation] = await db
		.select()
		.from(courtRotation)
		.where(eq(courtRotation.id, matchRecord.courtRotationId));

	if (!rotation) return null;

	const [courtRecord] = await db.select().from(court).where(eq(court.id, rotation.courtId));

	if (!courtRecord || !courtRecord.isActive) return { error: m.err_court_not_active() };

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

export const saveScore = form(baseScoreSchema, async (data, issue) => {
	const matchId = parseInt(data.matchId);
	const teamAScore = data.teamAScore;
	const teamBScore = data.teamBScore;

	const ctx = await getMatchContext(matchId);
	if (!ctx) return invalid(issue.teamAScore(m.err_invalid_match()));
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

	const ctx = await getMatchContext(matchId);
	if (!ctx) return invalid(issue.teamAScore(m.err_invalid_match()));
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
