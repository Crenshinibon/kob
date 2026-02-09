import * as v from 'valibot';

export const scoreSchema = v.pipe(
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
		return maxScore >= 21;
	}, 'Winner must have at least 21 points'),
	v.check((input) => {
		const maxScore = Math.max(input.teamAScore, input.teamBScore);
		const minScore = Math.min(input.teamAScore, input.teamBScore);
		return maxScore - minScore >= 2;
	}, 'Winner must win by at least 2 points'),
	v.check((input) => {
		const maxScore = Math.max(input.teamAScore, input.teamBScore);
		const minScore = Math.min(input.teamAScore, input.teamBScore);
		return maxScore <= 21 || maxScore - minScore === 2;
	}, 'Points difference can only be 2 with >21 points played')
);
