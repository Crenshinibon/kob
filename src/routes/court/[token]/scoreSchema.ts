import * as v from 'valibot';
import * as m from '$lib/paraglide/messages';
import { isDecidingSet, isValidFinalScore } from '$lib/tournament-logic';

export function createScoreSchema(minPoints: number, winBy: number = 2) {
	return v.pipe(
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
		}, m.err_score_tied()),
		v.check((input) => {
			const winner = Math.max(input.teamAScore, input.teamBScore);
			const loser = Math.min(input.teamAScore, input.teamBScore);
			return isValidFinalScore(winner, loser, minPoints, winBy);
		}, m.err_score_invalid({ minPoints, winBy }))
	);
}

export function createSetScoreSchema(
	regularPoints: number,
	decidingPoints: number,
	setNumber: number,
	setsToWin: number,
	winBy: number = 2
) {
	const minPoints = isDecidingSet(setNumber, setsToWin) ? decidingPoints : regularPoints;

	return v.pipe(
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
		}, m.err_score_tied()),
		v.check((input) => {
			const winner = Math.max(input.teamAScore, input.teamBScore);
			const loser = Math.min(input.teamAScore, input.teamBScore);
			return isValidFinalScore(winner, loser, minPoints, winBy);
		}, m.err_score_invalid({ minPoints, winBy }))
	);
}
