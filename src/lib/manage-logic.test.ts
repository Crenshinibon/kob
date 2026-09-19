import { describe, expect, it } from 'vitest';
import {
	applyAssignment,
	deriveLockState,
	minRoundCount,
	refillToCanonical,
	renumberSeedOrder,
	validateManualAssignment
} from './manage-logic';
import { calculateCourtSizes } from './tournament-logic';

describe('deriveLockState / minRoundCount', () => {
	it('locks when any score exists', () => {
		expect(deriveLockState([{ teamAScore: null }, { teamAScore: 21 }]).roundHasScores).toBe(true);
		expect(deriveLockState([{ teamAScore: null }]).roundHasScores).toBe(false);
	});

	it('minRoundCount', () => {
		expect(minRoundCount(2, false)).toBe(2);
		expect(minRoundCount(2, true)).toBe(3);
		expect(minRoundCount(0, false)).toBe(1);
	});
});

describe('refillToCanonical', () => {
	it('flattens court 1-N then fills calculateCourtSizes', () => {
		const filled = refillToCanonical(
			[
				{ courtNumber: 1, playerIds: [1, 2, 3, 4] },
				{ courtNumber: 2, playerIds: [5, 6, 7] },
				{ courtNumber: 3, playerIds: [8, 9, 10, 11, 12] }
			],
			12
		);
		expect(filled.map((c) => c.playerIds.length)).toEqual(calculateCourtSizes(12));
		expect(filled.flatMap((c) => c.playerIds)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
	});
});

describe('validateManualAssignment / applyAssignment', () => {
	const base = {
		roundHasScores: false,
		isFinalRound: false,
		formatType: 'random-seed' as const,
		courtCount: 4,
		currentRound: 1,
		singleCourtTournament: false
	};
	const before = [
		{ courtNumber: 1, playerIds: [1, 2, 3, 4] },
		{ courtNumber: 2, playerIds: [5, 6, 7, 8] }
	];

	it('rejects source below 3 and target above 6', () => {
		expect(
			validateManualAssignment({
				...base,
				before,
				after: [
					{ courtNumber: 1, playerIds: [1, 2] },
					{ courtNumber: 2, playerIds: [3, 4, 5, 6, 7, 8] }
				]
			}).errors
		).toContain('err_court_too_small');
		expect(
			validateManualAssignment({
				...base,
				before,
				after: [
					{ courtNumber: 1, playerIds: [1, 2, 3, 4, 5, 6, 7] },
					{ courtNumber: 2, playerIds: [8] }
				]
			}).errors
		).toContain('err_court_too_large');
	});

	it('rejects frozen courts and scored rounds', () => {
		expect(
			validateManualAssignment({
				...base,
				roundHasScores: true,
				before,
				after: before
			}).errors
		).toContain('err_round_locked');
		expect(
			validateManualAssignment({
				...base,
				before: [{ courtNumber: 1, playerIds: [1, 2, 3, 4], isFrozen: true }],
				after: [{ courtNumber: 1, playerIds: [1, 2, 3, 5], isFrozen: true }]
			}).errors
		).toContain('err_court_frozen');
	});

	it('rejects final court 1 not 4 unless single court', () => {
		expect(
			validateManualAssignment({
				...base,
				isFinalRound: true,
				before,
				after: [
					{ courtNumber: 1, playerIds: [1, 2, 3, 4, 5] },
					{ courtNumber: 2, playerIds: [6, 7, 8] }
				]
			}).errors
		).toContain('err_final_court_must_be_4');
		expect(
			validateManualAssignment({
				...base,
				isFinalRound: true,
				singleCourtTournament: true,
				courtCount: 1,
				before: [{ courtNumber: 1, playerIds: [1, 2, 3, 4] }],
				after: [{ courtNumber: 1, playerIds: [1, 2, 3, 4] }]
			}).errors
		).not.toContain('err_final_court_must_be_4');
	});

	it('warns on multiple uneven courts and ladder jumps', () => {
		const result = applyAssignment(
			[
				{ courtNumber: 1, playerIds: [1, 2, 3, 4] },
				{ courtNumber: 2, playerIds: [5, 6, 7, 8] },
				{ courtNumber: 3, playerIds: [9, 10, 11, 12] }
			],
			[
				{ courtNumber: 1, playerIds: [1, 2, 3] },
				{ courtNumber: 2, playerIds: [5, 6, 7] },
				{ courtNumber: 3, playerIds: [9, 10, 11, 12, 4, 8] }
			],
			{ ...base, courtCount: 3 }
		);
		expect(result.warnings).toContain('manage_warn_uneven');
		expect(result.warnings).toContain('manage_warn_ladder_jump');
	});
});

describe('renumberSeedOrder', () => {
	it('moves a player and keeps a permutation', () => {
		const ranks = renumberSeedOrder([10, 20, 30, 40], 40, 1);
		expect([...ranks.entries()].sort((a, b) => a[1] - b[1]).map(([id]) => id)).toEqual([
			40, 10, 20, 30
		]);
	});
});
