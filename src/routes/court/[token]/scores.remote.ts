import { form } from '$app/server';
import { invalid } from '@sveltejs/kit';
import * as v from 'valibot';
import { saveMatchScore } from '$lib/server/save-score';

const baseScoreSchema = v.pipe(
	v.object({
		token: v.pipe(v.string(), v.nonEmpty()),
		matchId: v.pipe(v.string(), v.nonEmpty()),
		teamAScore: v.pipe(v.string(), v.nonEmpty(), v.transform(Number)),
		teamBScore: v.pipe(v.string(), v.nonEmpty(), v.transform(Number))
	}),
	v.check((input) => input.teamAScore >= 0 && input.teamBScore >= 0),
	v.check((input) => input.teamAScore !== input.teamBScore)
);

const setScoreSchema = v.pipe(
	v.object({
		token: v.pipe(v.string(), v.nonEmpty()),
		matchId: v.pipe(v.string(), v.nonEmpty()),
		setNumber: v.pipe(v.string(), v.nonEmpty(), v.transform(Number)),
		teamAScore: v.pipe(v.string(), v.nonEmpty(), v.transform(Number)),
		teamBScore: v.pipe(v.string(), v.nonEmpty(), v.transform(Number))
	}),
	v.check((input) => input.teamAScore >= 0 && input.teamBScore >= 0),
	v.check((input) => input.teamAScore !== input.teamBScore)
);

const clearScoreSchema = v.object({
	token: v.pipe(v.string(), v.nonEmpty()),
	matchId: v.pipe(v.string(), v.nonEmpty())
});

export const saveScore = form(baseScoreSchema, async (data, issue) => {
	return saveMatchScore(
		{
			token: data.token,
			matchId: parseInt(data.matchId),
			teamAScore: data.teamAScore,
			teamBScore: data.teamBScore,
			mode: 'court'
		},
		issue
	);
});

export const saveSetScore = form(setScoreSchema, async (data, issue) => {
	return saveMatchScore(
		{
			token: data.token,
			matchId: parseInt(data.matchId),
			teamAScore: data.teamAScore,
			teamBScore: data.teamBScore,
			setNumber: data.setNumber,
			mode: 'court'
		},
		issue
	);
});

export const clearScore = form(clearScoreSchema, async (data, issue) => {
	return saveMatchScore(
		{
			token: data.token,
			matchId: parseInt(data.matchId),
			teamAScore: 0,
			teamBScore: 1,
			clear: true,
			mode: 'court'
		},
		issue
	);
});
