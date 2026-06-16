import { redirect } from '@sveltejs/kit';
import { localizeHref } from '$lib/paraglide/runtime';

export const load = async ({ locals }: { locals: App.Locals }) => {
	if (locals.user) {
		throw redirect(302, localizeHref('/'));
	}
	return {};
};
