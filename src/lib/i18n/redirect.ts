import { redirect } from '@sveltejs/kit';
import { localizeHref, locales } from '$lib/paraglide/runtime';
import type { RequestEvent } from '@sveltejs/kit';

type Locale = (typeof locales)[number];

function getLocaleFromCookie(request: Request): Locale | undefined {
	const cookieLocale = request.headers
		.get('cookie')
		?.split('; ')
		.find((c) => c.startsWith('PARAGLIDE_LOCALE='))
		?.split('=')[1];
	if (!cookieLocale) return undefined;
	return (locales as readonly string[]).includes(cookieLocale)
		? (cookieLocale as Locale)
		: undefined;
}

export function redirectLocalized(status: number, path: string, event?: RequestEvent): never {
	const locale = event ? getLocaleFromCookie(event.request) : undefined;
	redirect(status, localizeHref(path, { locale }));
}
