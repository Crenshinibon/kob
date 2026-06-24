import { describe, it, expect } from 'vitest';
import { formatDiff, formatPoints, roundToMax2Decimals } from './format';

describe('roundToMax2Decimals', () => {
	it('rounds to at most 2 decimal places', () => {
		expect(roundToMax2Decimals(10.567)).toBe(10.57);
		expect(roundToMax2Decimals(22.754)).toBe(22.75);
	});

	it('keeps integers unchanged', () => {
		expect(roundToMax2Decimals(68)).toBe(68);
	});
});

describe('formatPoints', () => {
	it('formats integers without decimals', () => {
		expect(formatPoints(68)).toBe('68');
		expect(formatPoints(0)).toBe('0');
	});

	it('formats up to 2 decimals and strips trailing zeros', () => {
		expect(formatPoints(22.75)).toBe('22.75');
		expect(formatPoints(10.5)).toBe('10.5');
		expect(formatPoints(10.567)).toBe('10.57');
	});

	it('handles floating-point noise', () => {
		expect(formatPoints(0.1 + 0.2)).toBe('0.3');
	});
});

describe('formatDiff', () => {
	it('adds + prefix for positive values', () => {
		expect(formatDiff(3)).toBe('+3');
		expect(formatDiff(0.5)).toBe('+0.5');
	});

	it('keeps negative values without + prefix', () => {
		expect(formatDiff(-3)).toBe('-3');
		expect(formatDiff(-0.5)).toBe('-0.5');
	});

	it('formats zero without + prefix', () => {
		expect(formatDiff(0)).toBe('0');
	});
});
