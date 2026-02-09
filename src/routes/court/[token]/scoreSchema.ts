import * as v from 'valibot';

export const scoreSchema = v.pipe(
	v.object({
		matchId: v.pipe(v.string(), v.nonEmpty()),
		teamAScore: v.pipe(v.string(), v.nonEmpty()),
		teamBScore: v.pipe(v.string(), v.nonEmpty())
	}),
	v.check((input) => {
		const teamAScore = parseInt(input.teamAScore);
		const teamBScore = parseInt(input.teamBScore);
		return teamAScore >= 0 && teamAScore <= 50 && teamBScore >= 0 && teamBScore <= 50;
	}, 'Scores must be between 0 and 50'),
	v.check((input) => {
		const teamAScore = parseInt(input.teamAScore);
		const teamBScore = parseInt(input.teamBScore);
		return teamAScore !== teamBScore;
	}, 'Scores cannot be tied'),
	v.check((input) => {
		const teamAScore = parseInt(input.teamAScore);
		const teamBScore = parseInt(input.teamBScore);
		const maxScore = Math.max(teamAScore, teamBScore);
		return maxScore >= 21;
	}, 'Winner must have at least 21 points'),
	v.check((input) => {
		const teamAScore = parseInt(input.teamAScore);
		const teamBScore = parseInt(input.teamBScore);
		const maxScore = Math.max(teamAScore, teamBScore);
		const minScore = Math.min(teamAScore, teamBScore);
		return maxScore - minScore >= 2;
	}, 'Winner must win by at least 2 points'),
	v.check((input) => {
		const teamAScore = parseInt(input.teamAScore);
		const teamBScore = parseInt(input.teamBScore);
		const maxScore = Math.max(teamAScore, teamBScore);
		const minScore = Math.min(teamAScore, teamBScore);
		return maxScore <= 21 || maxScore - minScore === 2;
	}, 'Points difference can only be 2 with >21 points played')
);
