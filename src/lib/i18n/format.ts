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

/** Round to at most 2 decimal places, avoiding floating-point noise */
export function roundToMax2Decimals(value: number): number {
	return Math.round(value * 100) / 100;
}

/** Format a point value for display (max 2 decimals, strip trailing zeros) */
export function formatPoints(value: number): string {
	const rounded = roundToMax2Decimals(value);
	if (Number.isInteger(rounded)) return String(rounded);
	return rounded.toFixed(2).replace(/\.?0+$/, '');
}

/** Format a differential value with + prefix for positive values */
export function formatDiff(value: number): string {
	const formatted = formatPoints(value);
	if (value > 0) return `+${formatted}`;
	return formatted;
}
