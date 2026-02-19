import { describe, it, expect } from 'vitest';
import {
	calculateCourtStandings,
	redistributePreseed16,
	redistributePreseed32,
	redistributeLadder,
	getTop2,
	getBottom2,
	type CourtResult,
	type MatchData
} from './tournament-logic';

function createMockCourtResult(
	courtNumber: number,
	playerIds: number[],
	points: number[]
): CourtResult {
	return {
		courtNumber,
		standings: playerIds.map((id, i) => ({
			playerId: id,
			rank: i + 1,
			points: points[i] || 0,
			diff: 0
		}))
	};
}

function createMockMatchData(
	teamA: [number, number],
	teamB: [number, number],
	scoreA: number,
	scoreB: number
): MatchData {
	return {
		teamAPlayer1Id: teamA[0],
		teamAPlayer2Id: teamA[1],
		teamBPlayer1Id: teamB[0],
		teamBPlayer2Id: teamB[1],
		teamAScore: scoreA,
		teamBScore: scoreB
	};
}

describe('calculateCourtStandings', () => {
	it('should calculate standings correctly for 3 matches', () => {
		const playerIds = [1, 2, 3, 4];
		const matches: MatchData[] = [
			createMockMatchData([1, 2], [3, 4], 21, 19),
			createMockMatchData([1, 3], [2, 4], 25, 23),
			createMockMatchData([1, 4], [2, 3], 22, 20)
		];

		const result = calculateCourtStandings(matches, playerIds);

		expect(result).toHaveLength(4);
		expect(result[0].playerId).toBe(1);
		expect(result[0].points).toBe(68);
		expect(result[0].rank).toBe(1);
	});

	it('should use deterministic tiebreaker when points and diff are equal', () => {
		const playerIds = [1, 2, 3, 4];
		const matches: MatchData[] = [
			createMockMatchData([1, 2], [3, 4], 21, 21),
			createMockMatchData([1, 3], [2, 4], 21, 21),
			createMockMatchData([1, 4], [2, 3], 21, 21)
		];

		const result1 = calculateCourtStandings(matches, playerIds);
		const result2 = calculateCourtStandings(matches, playerIds);

		expect(result1.map((s) => s.playerId)).toEqual(result2.map((s) => s.playerId));
	});

	it('should sort by points then by differential', () => {
		const playerIds = [1, 2, 3, 4];
		const matches: MatchData[] = [createMockMatchData([1, 3], [2, 4], 21, 19)];

		const result = calculateCourtStandings(matches, playerIds);

		expect(result[0].points).toBe(21);
		expect(result[1].points).toBe(21);
	});
});

describe('getTop2 and getBottom2', () => {
	it('should extract top 2 players', () => {
		const court = {
			standings: [
				{ playerId: 1, rank: 1 },
				{ playerId: 2, rank: 2 },
				{ playerId: 3, rank: 3 },
				{ playerId: 4, rank: 4 }
			]
		};

		expect(getTop2(court)).toEqual([1, 2]);
	});

	it('should extract bottom 2 players', () => {
		const court = {
			standings: [
				{ playerId: 1, rank: 1 },
				{ playerId: 2, rank: 2 },
				{ playerId: 3, rank: 3 },
				{ playerId: 4, rank: 4 }
			]
		};

		expect(getBottom2(court)).toEqual([3, 4]);
	});
});

describe('redistributePreseed16', () => {
	it('should redistribute correctly for Round 1 (winner/loser split)', () => {
		const courtResults: CourtResult[] = [
			createMockCourtResult(1, [1, 2, 3, 4], [0, 0, 0, 0]),
			createMockCourtResult(2, [5, 6, 7, 8], [0, 0, 0, 0]),
			createMockCourtResult(3, [9, 10, 11, 12], [0, 0, 0, 0]),
			createMockCourtResult(4, [13, 14, 15, 16], [0, 0, 0, 0])
		];

		const result = redistributePreseed16(courtResults, 1);

		expect(result).toHaveLength(4);
		expect(result[0].courtNumber).toBe(1);
		expect(result[0].playerIds).toEqual([1, 5, 9, 13]);
		expect(result[1].courtNumber).toBe(2);
		expect(result[1].playerIds).toEqual([2, 6, 10, 14]);
		expect(result[2].courtNumber).toBe(3);
		expect(result[2].playerIds).toEqual([3, 7, 11, 15]);
		expect(result[3].courtNumber).toBe(4);
		expect(result[3].playerIds).toEqual([4, 8, 12, 16]);
	});

	it('should redistribute correctly for Round 2 (tier consolidation)', () => {
		const courtResults: CourtResult[] = [
			createMockCourtResult(1, [1, 2, 3, 4], [0, 0, 0, 0]),
			createMockCourtResult(2, [5, 6, 7, 8], [0, 0, 0, 0]),
			createMockCourtResult(3, [9, 10, 11, 12], [0, 0, 0, 0]),
			createMockCourtResult(4, [13, 14, 15, 16], [0, 0, 0, 0])
		];

		const result = redistributePreseed16(courtResults, 2);

		expect(result).toHaveLength(4);
		expect(result[0].playerIds).toEqual([1, 2, 5, 6]);
		expect(result[1].playerIds).toEqual([3, 4, 7, 8]);
		expect(result[2].playerIds).toEqual([9, 10, 13, 14]);
		expect(result[3].playerIds).toEqual([11, 12, 15, 16]);
	});
});

describe('redistributePreseed32', () => {
	it('should redistribute correctly for Round 1 (winner/loser split)', () => {
		const courtResults: CourtResult[] = Array.from({ length: 8 }, (_, i) =>
			createMockCourtResult(i + 1, [i * 4 + 1, i * 4 + 2, i * 4 + 3, i * 4 + 4], [0, 0, 0, 0])
		);

		const result = redistributePreseed32(courtResults, 1);

		expect(result).toHaveLength(8);
		expect(result[0].courtNumber).toBe(1);
		expect(result[0].playerIds).toEqual([1, 5, 9, 13]);
		expect(result[1].courtNumber).toBe(2);
		expect(result[1].playerIds).toEqual([17, 21, 25, 29]);
		expect(result[2].courtNumber).toBe(3);
		expect(result[2].playerIds).toEqual([2, 6, 10, 14]);
		expect(result[3].courtNumber).toBe(4);
		expect(result[3].playerIds).toEqual([18, 22, 26, 30]);
		expect(result[4].courtNumber).toBe(5);
		expect(result[4].playerIds).toEqual([3, 7, 11, 15]);
		expect(result[5].courtNumber).toBe(6);
		expect(result[5].playerIds).toEqual([19, 23, 27, 31]);
		expect(result[6].courtNumber).toBe(7);
		expect(result[6].playerIds).toEqual([4, 8, 12, 16]);
		expect(result[7].courtNumber).toBe(8);
		expect(result[7].playerIds).toEqual([20, 24, 28, 32]);
	});

	it('should redistribute correctly for Round 2', () => {
		const courtResults: CourtResult[] = Array.from({ length: 8 }, (_, i) =>
			createMockCourtResult(i + 1, [i * 4 + 1, i * 4 + 2, i * 4 + 3, i * 4 + 4], [0, 0, 0, 0])
		);

		const result = redistributePreseed32(courtResults, 2);

		expect(result).toHaveLength(8);
		expect(result[0].playerIds).toEqual([1, 2, 5, 6]);
		expect(result[1].playerIds).toEqual([3, 4, 7, 8]);
	});

	it('should redistribute correctly for Round 3', () => {
		const courtResults: CourtResult[] = Array.from({ length: 8 }, (_, i) =>
			createMockCourtResult(i + 1, [i * 4 + 1, i * 4 + 2, i * 4 + 3, i * 4 + 4], [0, 0, 0, 0])
		);

		const result = redistributePreseed32(courtResults, 3);

		expect(result).toHaveLength(8);
		expect(result[0].playerIds).toEqual([1, 2, 5, 6]);
		expect(result[1].playerIds).toEqual([3, 4, 7, 8]);
	});
});

describe('redistributeLadder', () => {
	it('should redistribute correctly for first round (16 players)', () => {
		const courtResults: CourtResult[] = [
			createMockCourtResult(1, [1, 2, 3, 4], [68, 60, 52, 40]),
			createMockCourtResult(2, [5, 6, 7, 8], [65, 58, 50, 42]),
			createMockCourtResult(3, [9, 10, 11, 12], [70, 55, 48, 38]),
			createMockCourtResult(4, [13, 14, 15, 16], [62, 56, 45, 35])
		];

		const result = redistributeLadder(courtResults, true, 4);

		expect(result).toHaveLength(4);
		expect(result[0].courtNumber).toBe(1);
		expect(result[0].playerIds).toEqual([1, 5, 9, 13]);
		expect(result[1].courtNumber).toBe(2);
		expect(result[1].playerIds).toEqual([2, 6, 10, 14]);
		expect(result[2].courtNumber).toBe(3);
		expect(result[2].playerIds).toEqual([3, 7, 11, 15]);
		expect(result[3].courtNumber).toBe(4);
		expect(result[3].playerIds).toEqual([4, 8, 12, 16]);
	});

	it('should redistribute correctly for subsequent rounds (16 players, ladder)', () => {
		const courtResults: CourtResult[] = [
			createMockCourtResult(1, [1, 2, 3, 4], [0, 0, 0, 0]),
			createMockCourtResult(2, [5, 6, 7, 8], [0, 0, 0, 0]),
			createMockCourtResult(3, [9, 10, 11, 12], [0, 0, 0, 0]),
			createMockCourtResult(4, [13, 14, 15, 16], [0, 0, 0, 0])
		];

		const result = redistributeLadder(courtResults, false, 4);

		expect(result).toHaveLength(4);
		expect(result[0].playerIds).toEqual([1, 2, 5, 6]);
		expect(result[1].playerIds).toEqual([3, 4, 9, 10]);
		expect(result[2].playerIds).toEqual([7, 8, 13, 14]);
		expect(result[3].playerIds).toEqual([11, 12, 15, 16]);
	});

	it('should redistribute correctly for first round (32 players)', () => {
		const courtResults: CourtResult[] = Array.from({ length: 8 }, (_, i) =>
			createMockCourtResult(
				i + 1,
				[i * 4 + 1, i * 4 + 2, i * 4 + 3, i * 4 + 4],
				[100 - i * 4, 80 - i * 2, 60 - i, 40]
			)
		);

		const result = redistributeLadder(courtResults, true, 8);

		expect(result).toHaveLength(8);
		expect(result[0].playerIds).toEqual([1, 5, 9, 13]);
		expect(result[1].playerIds).toEqual([17, 21, 25, 29]);
	});
});
