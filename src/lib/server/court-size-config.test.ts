import { describe, expect, it } from 'vitest';
import { bracketCourtSizes, parseStoredCourtSizes } from './court-size-config';

describe('court-size-config', () => {
	it('parseStoredCourtSizes uses recalculateCourtConfigAfterRetirement below 8 players', () => {
		expect(parseStoredCourtSizes({ courtSizes: null, playerCount: 7 })).toEqual([4, 3]);
	});

	it('parseStoredCourtSizes uses stored courtSizes when present', () => {
		expect(parseStoredCourtSizes({ courtSizes: JSON.stringify([4, 3]), playerCount: 7 })).toEqual([
			4, 3
		]);
	});

	it('bracketCourtSizes does not throw for shrunken tournaments', () => {
		const tourney = { courtSizes: JSON.stringify([4, 3]), playerCount: 7 };
		expect(bracketCourtSizes(tourney, 2)).toEqual([4, 3]);
	});
});
