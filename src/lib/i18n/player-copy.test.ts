import { describe, expect, it } from 'vitest';
import { playerHistoryWhy } from './player-history-why';
import { tieBreakFactorLabel } from './tie-break-label';

describe('tieBreakFactorLabel', () => {
	it('returns the English label for every factor', () => {
		expect(tieBreakFactorLabel('round_points')).toBe('Points this round');
		expect(tieBreakFactorLabel('round_diff').length).toBeGreaterThan(0);
		expect(tieBreakFactorLabel('total_points').length).toBeGreaterThan(0);
		expect(tieBreakFactorLabel('total_diff').length).toBeGreaterThan(0);
		expect(tieBreakFactorLabel('initial_order').length).toBeGreaterThan(0);
		expect(tieBreakFactorLabel('dice').length).toBeGreaterThan(0);
		expect(tieBreakFactorLabel('manual').length).toBeGreaterThan(0);
	});
});

describe('playerHistoryWhy', () => {
	it('returns an empty string when there is no key', () => {
		expect(playerHistoryWhy(null, null)).toBe('');
		expect(playerHistoryWhy('not_a_key', null)).toBe('');
	});

	it('renders ladder copy without parameters', () => {
		expect(playerHistoryWhy('player_history_why_ladder_up', null)).toBe(
			'Ladder: ranks 1 and 2 move up one court.'
		);
	});

	it('fills vertical-seeding and late-join parameters', () => {
		expect(playerHistoryWhy('player_history_why_vertical', { nth: '1st', court: 2 })).toContain(
			'Court 2'
		);
		expect(playerHistoryWhy('player_history_why_joined', { n: 3 })).toContain('3');
	});
});
