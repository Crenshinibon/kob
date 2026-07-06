import type { PageServerLoad } from './$types';
import { fetchCourtPageData } from '$lib/server/court-page-data';

export const load: PageServerLoad = async ({ params, locals }) => {
	const courtPageData = await fetchCourtPageData(params.token, !!locals.user);
	return { token: params.token, courtPageData };
};
