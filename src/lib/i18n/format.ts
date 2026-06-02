import * as msg from '$lib/paraglide/messages';

export function formatDuration(totalMinutes: number): string {
	const hours = Math.floor(totalMinutes / 60);
	const mins = totalMinutes % 60;
	if (hours > 0) return `~${hours}${msg.duration_hours()} ${mins}${msg.duration_minutes()}`;
	return `~${mins}${msg.duration_minutes()}`;
}

export function formatDate(date: Date, locale: string): string {
	return date.toLocaleDateString(locale);
}

export function formatNumber(num: number, locale: string): string {
	return new Intl.NumberFormat(locale).format(num);
}
