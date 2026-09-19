import { query } from '$app/server';
import * as v from 'valibot';
import { fetchStandingsData } from '$lib/server/standings-service';

export const getStandingsData = query(v.number(), async (tournamentId) => {
	return fetchStandingsData(tournamentId);
});
