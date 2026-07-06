import { query, getRequestEvent } from '$app/server';
import * as v from 'valibot';
import { fetchCourtPageData } from '$lib/server/court-page-data';

const courtDataInputSchema = v.object({
	token: v.pipe(v.string(), v.nonEmpty())
});

export const getCourtData = query(courtDataInputSchema, async ({ token }) => {
	const event = getRequestEvent();
	return fetchCourtPageData(token, !!event.locals.user);
});
