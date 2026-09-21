import {
	MIN_TOURNAMENT_PLAYERS,
	calculateCourtSizes,
	recalculateCourtConfigAfterRetirement
} from '$lib/tournament-logic';
import type { tournament } from '$lib/server/db/schema';

type TourneyCourtConfig = Pick<typeof tournament.$inferSelect, 'courtSizes' | 'playerCount'>;

export function parseStoredCourtSizes(tourney: TourneyCourtConfig): number[] {
	if (tourney.courtSizes) return JSON.parse(tourney.courtSizes) as number[];
	if (tourney.playerCount >= MIN_TOURNAMENT_PLAYERS) {
		return calculateCourtSizes(tourney.playerCount);
	}
	return recalculateCourtConfigAfterRetirement(tourney.playerCount).courtSizes;
}

/** Bracket/frozen-court sizing when playerCount may have dropped below 8. */
export function bracketCourtSizes(
	tourney: TourneyCourtConfig,
	virtualCourtCount: number
): number[] {
	const parsed = parseStoredCourtSizes(tourney);
	if (parsed.length === virtualCourtCount) return parsed;
	if (tourney.playerCount >= MIN_TOURNAMENT_PLAYERS) {
		const fromCount = calculateCourtSizes(tourney.playerCount);
		if (fromCount.length === virtualCourtCount) return fromCount;
	}
	return parsed;
}
