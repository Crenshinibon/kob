import * as v from 'valibot';
import { isDecidingSet, getMinPointsForSet } from '$lib/tournament-logic';

export function createScoreSchema(minPoints: number) {
	return v.pipe(
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
			return maxScore >= minPoints;
		}, `Winner must have at least ${minPoints} points`),
		v.check((input) => {
			const maxScore = Math.max(input.teamAScore, input.teamBScore);
			const minScore = Math.min(input.teamAScore, input.teamBScore);
			return maxScore - minScore >= 2;
		}, 'Winner must win by at least 2 points')
	);
}

export function createSetScoreSchema(
	regularPoints: number,
	decidingPoints: number,
	setNumber: number,
	setsToWin: number
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
			return maxScore >= minPoints;
		}, `Winner must have at least ${minPoints} points`),
		v.check((input) => {
			const maxScore = Math.max(input.teamAScore, input.teamBScore);
			const minScore = Math.min(input.teamAScore, input.teamBScore);
			return maxScore - minScore >= 2;
		}, 'Winner must win by at least 2 points')
	);
}
