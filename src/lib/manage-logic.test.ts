import { describe, expect, it } from 'vitest';
import {
	applyAssignment,
	canEditRound1Roster,
	deriveLockState,
	remoteErrorMessage,
	isValidPlayerMove,
	minRoundCount,
	proposedMove,
	refillToCanonical,
	movePlayerInOrder,
	orderPlayersByIds,
	renumberSeedOrder,
	sortCourts,
	sortPlayersBySeed,
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

	it('canEditRound1Roster is setup or round 1 without scores', () => {
		expect(canEditRound1Roster({ status: 'setup', currentRound: 0, roundHasScores: false })).toBe(
			true
		);
		expect(canEditRound1Roster({ status: 'active', currentRound: 1, roundHasScores: false })).toBe(
			true
		);
		expect(canEditRound1Roster({ status: 'active', currentRound: 1, roundHasScores: true })).toBe(
			false
		);
		expect(canEditRound1Roster({ status: 'active', currentRound: 2, roundHasScores: false })).toBe(
			false
		);
		expect(
			canEditRound1Roster({ status: 'completed', currentRound: 2, roundHasScores: true })
		).toBe(false);
	});

	it('remoteErrorMessage unwraps SvelteKit JSON bodies', () => {
		expect(remoteErrorMessage(new Error('plain'))).toBe('plain');
		expect(
			remoteErrorMessage(
				new Error('{"message":"Players can only be added in setup or in round 1 before scores."}')
			)
		).toBe('Players can only be added in setup or in round 1 before scores.');
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

describe('proposedMove / isValidPlayerMove', () => {
	const courts = [
		{ courtNumber: 1, playerIds: [1, 2, 3, 4] },
		{ courtNumber: 2, playerIds: [5, 6, 7, 8] },
		{ courtNumber: 3, playerIds: [9, 10, 11, 12] },
		{ courtNumber: 4, playerIds: [13, 14, 15, 16] }
	];

	it('4p to 4p becomes 3p + 5p and stays numbered 1–N', () => {
		const next = proposedMove(courts, 4, 2);
		expect(next.map((c) => c.courtNumber)).toEqual([1, 2, 3, 4]);
		expect(next.map((c) => c.playerIds.length)).toEqual([3, 5, 4, 4]);
		expect(next[1].playerIds).toContain(4);
		expect(next[0].playerIds).not.toContain(4);
		expect(isValidPlayerMove(courts, 4, 2)).toBe(true);
	});

	it('rejects a move onto a 6p court', () => {
		const leftover = [
			{ courtNumber: 1, playerIds: [1, 2, 3, 4] },
			{ courtNumber: 2, playerIds: [5, 6, 7, 8, 9, 10] }
		];
		expect(isValidPlayerMove(leftover, 1, 2)).toBe(false);
	});

	it('rejects emptying a 3p court', () => {
		const leftover = [
			{ courtNumber: 1, playerIds: [1, 2, 3] },
			{ courtNumber: 2, playerIds: [4, 5, 6, 7] }
		];
		expect(isValidPlayerMove(leftover, 1, 2)).toBe(false);
	});

	it('sortCourts restores numeric order', () => {
		expect(
			sortCourts([{ courtNumber: 5 }, { courtNumber: 1 }, { courtNumber: 2 }]).map(
				(c) => c.courtNumber
			)
		).toEqual([1, 2, 5]);
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

describe('sortPlayersBySeed / movePlayerInOrder', () => {
	it('sorts by seedRank then id', () => {
		expect(
			sortPlayersBySeed([
				{ id: 3, seedRank: 31 },
				{ id: 1, seedRank: 1 },
				{ id: 2, seedRank: 32 }
			]).map((p) => p.id)
		).toEqual([1, 3, 2]);
	});

	it('moves a player up, down, top, and bottom', () => {
		expect(movePlayerInOrder([1, 2, 3, 4], 3, 'up')).toEqual([1, 3, 2, 4]);
		expect(movePlayerInOrder([1, 2, 3, 4], 2, 'down')).toEqual([1, 3, 2, 4]);
		expect(movePlayerInOrder([1, 2, 3, 4], 4, 'top')).toEqual([4, 1, 2, 3]);
		expect(movePlayerInOrder([1, 2, 3, 4], 1, 'bottom')).toEqual([2, 3, 4, 1]);
	});

	it('is a no-op at the ends', () => {
		expect(movePlayerInOrder([1, 2, 3], 1, 'up')).toEqual([1, 2, 3]);
		expect(movePlayerInOrder([1, 2, 3], 1, 'top')).toEqual([1, 2, 3]);
		expect(movePlayerInOrder([1, 2, 3], 3, 'down')).toEqual([1, 2, 3]);
		expect(movePlayerInOrder([1, 2, 3], 3, 'bottom')).toEqual([1, 2, 3]);
	});

	it('orders a filtered roster by the pending id list', () => {
		expect(
			orderPlayersByIds(
				[
					{ id: 2, name: 'B' },
					{ id: 1, name: 'A' },
					{ id: 9, name: 'retired' }
				],
				[1, 2]
			).map((p) => p.id)
		).toEqual([1, 2, 9]);
	});
});
