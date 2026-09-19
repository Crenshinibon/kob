import { form, query } from '$app/server';
import * as v from 'valibot';
import { fetchPlayerPageData } from '$lib/server/player-page-data';
import { saveMatchScore } from '$lib/server/save-score';

const tokenSchema = v.object({
	token: v.pipe(v.string(), v.nonEmpty())
});

export const getPlayerData = query(tokenSchema, async ({ token }) => {
	return fetchPlayerPageData(token);
});

const playerScoreSchema = v.pipe(
	v.object({
		token: v.pipe(v.string(), v.nonEmpty()),
		matchId: v.pipe(v.string(), v.nonEmpty()),
		teamAScore: v.pipe(v.string(), v.nonEmpty(), v.transform(Number)),
		teamBScore: v.pipe(v.string(), v.nonEmpty(), v.transform(Number)),
		youOnTeam: v.optional(v.picklist(['a', 'b']))
	}),
	v.check((input) => input.teamAScore >= 0 && input.teamBScore >= 0),
	v.check((input) => input.teamAScore !== input.teamBScore)
);

const playerSetScoreSchema = v.pipe(
	v.object({
		token: v.pipe(v.string(), v.nonEmpty()),
		matchId: v.pipe(v.string(), v.nonEmpty()),
		setNumber: v.pipe(v.string(), v.nonEmpty(), v.transform(Number)),
		teamAScore: v.pipe(v.string(), v.nonEmpty(), v.transform(Number)),
		teamBScore: v.pipe(v.string(), v.nonEmpty(), v.transform(Number)),
		youOnTeam: v.optional(v.picklist(['a', 'b']))
	}),
	v.check((input) => input.teamAScore >= 0 && input.teamBScore >= 0),
	v.check((input) => input.teamAScore !== input.teamBScore)
);

export const savePlayerScore = form(playerScoreSchema, async (data, issue) => {
	const result = await saveMatchScore(
		{
			token: data.token,
			matchId: parseInt(data.matchId),
			teamAScore: data.teamAScore,
			teamBScore: data.teamBScore,
			mode: 'player',
			youOnTeam: data.youOnTeam
		},
		issue
	);
	await getPlayerData({ token: data.token }).refresh();
	return result;
});

export const savePlayerSetScore = form(playerSetScoreSchema, async (data, issue) => {
	const result = await saveMatchScore(
		{
			token: data.token,
			matchId: parseInt(data.matchId),
			teamAScore: data.teamAScore,
			teamBScore: data.teamBScore,
			setNumber: data.setNumber,
			mode: 'player',
			youOnTeam: data.youOnTeam
		},
		issue
	);
	await getPlayerData({ token: data.token }).refresh();
	return result;
});
