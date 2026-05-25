import { describe, it, expect, vi } from 'vitest';
import {
	getCourtConfiguration,
	calculateCourtSizes,
	calculateRoundCount,
	createInitialState,
	addPlayers,
	startRound,
	closeRound,
	redistributePreseedRecursive,
	verticalSeeding,
	ladderRedistribute,
	calculateCourtStandings,
	generate4pMatches,
	generate3pMatches,
	generate5pMatches,
	generate6pMatches,
	matchCountForCourtSize,
	countScoredMatches,
	isDecidingSet,
	getMaxSets,
	getMinPointsForSet,
	getScoringLabel,
	recalculateCourtConfigAfterRetirement,
	getPreseedBracketRange,
	calculateRetiredStanding,
	getFinalRoundCourtConfig,
	type FormatType,
	type TournamentState,
	type CourtResult,
	type MatchData
} from './tournament-logic';

// ============================================================================
// Helpers
// ============================================================================

function mockCourtResult(
	courtNumber: number,
	standings: { playerId: number; rank: number; points: number; diff: number; matchCount: number }[]
): CourtResult {
	return { courtNumber, standings };
}

function mockMatch(
	teamA: [number, number],
	teamB: [number, number],
	scoreA: number | null,
	scoreB: number | null
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

function mockPlayer(
	id: number,
	seedPoints: number | null = null
): {
	id: number;
	name: string;
	seedPoints: number | null;
	seedRank: number | null;
} {
	return { id, name: `Player${id}`, seedPoints, seedRank: null };
}

function scoreAllMatches(
	state: TournamentState,
	scores:
		| { winner: 'A' | 'B'; scoreA: number; scoreB: number }
		| ((courtIdx: number) => { winner: 'A' | 'B'; scoreA: number; scoreB: number })
): MatchData[] {
	return state.currentAssignments.map((a, i) => {
		const s = typeof scores === 'function' ? scores(i) : scores;
		return {
			teamAPlayer1Id: a.playerIds[0],
			teamAPlayer2Id: a.playerIds[1],
			teamBPlayer1Id: a.playerIds[2],
			teamBPlayer2Id: a.playerIds[3],
			teamAScore: s.winner === 'A' ? s.scoreA : s.scoreB,
			teamBScore: s.winner === 'A' ? s.scoreB : s.scoreA
		};
	});
}

// ============================================================================
// getCourtConfiguration
// ============================================================================

describe('getCourtConfiguration', () => {
	it('8 players → 2 courts', () => {
		expect(getCourtConfiguration(8)).toEqual({
			totalCourts: 2,
			standardCourts: 2,
			bottomCourtSize: null
		});
	});
	it('16 players → 4 courts', () => {
		expect(getCourtConfiguration(16)).toEqual({
			totalCourts: 4,
			standardCourts: 4,
			bottomCourtSize: null
		});
	});
	it('32 players → 8 courts', () => {
		expect(getCourtConfiguration(32)).toEqual({
			totalCourts: 8,
			standardCourts: 8,
			bottomCourtSize: null
		});
	});
	it('25 players → 5 standard + 1 5p', () => {
		expect(getCourtConfiguration(25)).toEqual({
			totalCourts: 6,
			standardCourts: 5,
			bottomCourtSize: 5
		});
	});
	it('26 players → 5 standard + 1 6p', () => {
		expect(getCourtConfiguration(26)).toEqual({
			totalCourts: 6,
			standardCourts: 5,
			bottomCourtSize: 6
		});
	});
	it('27 players → 6 standard + 1 3p', () => {
		expect(getCourtConfiguration(27)).toEqual({
			totalCourts: 7,
			standardCourts: 6,
			bottomCourtSize: 3
		});
	});
	it('64 players → 16 courts', () => {
		expect(getCourtConfiguration(64)).toEqual({
			totalCourts: 16,
			standardCourts: 16,
			bottomCourtSize: null
		});
	});

	it.each([
		[9, { totalCourts: 2, standardCourts: 1, bottomCourtSize: 5 }],
		[10, { totalCourts: 2, standardCourts: 1, bottomCourtSize: 6 }],
		[11, { totalCourts: 3, standardCourts: 2, bottomCourtSize: 3 }],
		[12, { totalCourts: 3, standardCourts: 3, bottomCourtSize: null }],
		[13, { totalCourts: 3, standardCourts: 2, bottomCourtSize: 5 }],
		[14, { totalCourts: 3, standardCourts: 2, bottomCourtSize: 6 }],
		[15, { totalCourts: 4, standardCourts: 3, bottomCourtSize: 3 }],
		[16, { totalCourts: 4, standardCourts: 4, bottomCourtSize: null }]
	])('playerCount=%d', (players, expected) => {
		expect(getCourtConfiguration(players)).toEqual(expected);
	});

	it('throws <8 or >64', () => {
		expect(() => getCourtConfiguration(7)).toThrow();
		expect(() => getCourtConfiguration(65)).toThrow();
	});
});

// ============================================================================
// calculateCourtSizes
// ============================================================================

describe('calculateCourtSizes', () => {
	it.each([
		[8, [4, 4]],
		[9, [4, 5]],
		[10, [4, 6]],
		[11, [4, 4, 3]],
		[12, [4, 4, 4]],
		[13, [4, 4, 5]],
		[14, [4, 4, 6]],
		[15, [4, 4, 4, 3]],
		[16, [4, 4, 4, 4]],
		[25, [4, 4, 4, 4, 4, 5]],
		[64, Array(16).fill(4)]
	])('playerCount=%d → %j', (players, expected) => {
		expect(calculateCourtSizes(players)).toEqual(expected);
	});

	it('sum equals player count for all 8-64', () => {
		for (let p = 8; p <= 64; p++) {
			expect(calculateCourtSizes(p).reduce((a, b) => a + b, 0)).toBe(p);
		}
	});
});

// ============================================================================
// calculateRoundCount
// ============================================================================

describe('calculateRoundCount', () => {
	const cases: [number, FormatType, number][] = [
		[2, 'preseed', 2],
		[3, 'preseed', 3],
		[4, 'preseed', 3],
		[5, 'preseed', 4],
		[6, 'preseed', 4],
		[7, 'preseed', 4],
		[8, 'preseed', 4],
		[9, 'preseed', 5],
		[10, 'preseed', 5],
		[16, 'preseed', 5],
		[2, 'random-seed', 4],
		[4, 'random-seed', 4],
		[5, 'random-seed', 4],
		[8, 'random-seed', 4],
		[9, 'random-seed', 4],
		[16, 'random-seed', 4]
	];
	cases.forEach(([courts, fmt, expected]) => {
		it(`${courts} courts (${fmt}) → ${expected} rounds`, () => {
			expect(calculateRoundCount(courts, fmt)).toBe(expected);
		});
	});
});

// ============================================================================
// calculateCourtStandings
// ============================================================================

describe('calculateCourtStandings', () => {
	it('ranks 4 players by points', () => {
		const matches: MatchData[] = [
			mockMatch([1, 2], [3, 4], 21, 19),
			mockMatch([1, 3], [2, 4], 25, 23),
			mockMatch([1, 4], [2, 3], 22, 20)
		];
		const result = calculateCourtStandings(matches, [1, 2, 3, 4]);
		expect(result[0].playerId).toBe(1);
		expect(result[0].points).toBe(68);
		expect(result[0].rank).toBe(1);
		expect(result[0].matchCount).toBe(3);
	});

	it('tiebreaker: diff then playerId', () => {
		const matches: MatchData[] = [
			mockMatch([1, 2], [3, 4], 21, 21),
			mockMatch([1, 3], [2, 4], 21, 21),
			mockMatch([1, 4], [2, 3], 21, 21)
		];
		expect(calculateCourtStandings(matches, [1, 2, 3, 4]).map((s) => s.playerId)).toEqual([
			1, 2, 3, 4
		]);
	});

	it('unscored matches contribute 0 points', () => {
		const matches: MatchData[] = [
			mockMatch([1, 2], [3, 4], 21, 19),
			mockMatch([1, 3], [2, 4], null, null),
			mockMatch([1, 4], [2, 3], null, null)
		];
		const result = calculateCourtStandings(matches, [1, 2, 3, 4]);
		expect(result[0].points).toBe(21);
		expect(result[1].points).toBe(21);
		expect(result[2].points).toBe(19);
		expect(result[3].points).toBe(19);
		expect(result.every((s) => s.matchCount === 1)).toBe(true);
	});

	it('matchCount reflects number of scored matches per player', () => {
		const matches: MatchData[] = [
			mockMatch([1, 2], [3, 4], 21, 19),
			mockMatch([1, 3], [2, 4], 25, 23),
			mockMatch([1, 4], [2, 3], 22, 20)
		];
		const result = calculateCourtStandings(matches, [1, 2, 3, 4]);
		expect(result.every((s) => s.matchCount === 3)).toBe(true);
	});
});

// ============================================================================
// createInitialState
// ============================================================================

describe('createInitialState', () => {
	it('creates empty state for 16 players', () => {
		const s = createInitialState({ tournamentId: 1, formatType: 'preseed', playerCount: 16 });
		expect(s.config.playerCount).toBe(16);
		expect(s.roundsCompleted).toBe(0);
		expect(s.currentRound).toBe(0);
		expect(s.isComplete).toBe(false);
		expect(s.players).toEqual([]);
		expect(s.totalRounds).toBe(3);
	});

	it('creates state with correct sizes for 25 players', () => {
		const s = createInitialState({ tournamentId: 1, formatType: 'preseed', playerCount: 25 });
		expect(s.config.courtSizes).toEqual([4, 4, 4, 4, 4, 5]);
	});
});

// ============================================================================
// addPlayers
// ============================================================================

describe('addPlayers', () => {
	it('adds players to state', () => {
		let s = createInitialState({ tournamentId: 1, formatType: 'preseed', playerCount: 8 });
		const players = Array.from({ length: 8 }, (_, i) => mockPlayer(i + 1, 8 - i));
		s = addPlayers(s, players);
		expect(s.players).toEqual(players);
	});

	it('rejects wrong count', () => {
		const s = createInitialState({ tournamentId: 1, formatType: 'preseed', playerCount: 8 });
		expect(() => addPlayers(s, [mockPlayer(1)])).toThrow();
	});

	it('rejects adding after start', () => {
		let s = createInitialState({ tournamentId: 1, formatType: 'preseed', playerCount: 8 });
		s = addPlayers(
			s,
			Array.from({ length: 8 }, (_, i) => mockPlayer(i + 1))
		);
		s = startRound(s);
		expect(() => addPlayers(s, [])).toThrow();
	});
});

// ============================================================================
// startRound
// ============================================================================

describe('startRound', () => {
	it('generates Round 1 for preseed (snake distribution)', () => {
		let s = createInitialState({ tournamentId: 1, formatType: 'preseed', playerCount: 16 });
		const players = Array.from({ length: 16 }, (_, i) => mockPlayer(i + 1, 16 - i));
		s = addPlayers(s, players);
		s = startRound(s);

		expect(s.currentRound).toBe(1);
		expect(s.currentAssignments).toHaveLength(4);
		expect(s.currentMatches).toHaveLength(4);

		// Snake verification: C1 = [1, 8, 9, 16]
		expect(s.currentAssignments[0].playerIds).toEqual([1, 8, 9, 16]);
		// C2 = [2, 7, 10, 15]
		expect(s.currentAssignments[1].playerIds).toEqual([2, 7, 10, 15]);
		// C3 = [3, 6, 11, 14]
		expect(s.currentAssignments[2].playerIds).toEqual([3, 6, 11, 14]);
		// C4 = [4, 5, 12, 13]
		expect(s.currentAssignments[3].playerIds).toEqual([4, 5, 12, 13]);
	});

	it('generates Round 1 for random seed', () => {
		vi.spyOn(global.Math, 'random').mockReturnValue(0.5);
		let s = createInitialState({ tournamentId: 2, formatType: 'random-seed', playerCount: 16 });
		const players = Array.from({ length: 16 }, (_, i) => mockPlayer(i + 1));
		s = addPlayers(s, players);
		s = startRound(s);
		vi.restoreAllMocks();

		expect(s.currentRound).toBe(1);
		expect(s.currentAssignments).toHaveLength(4);
		const allIds = s.currentAssignments.flatMap((a) => a.playerIds);
		expect(new Set(allIds).size).toBe(16);
	});

	it('generates Round 1 for 11 players (3 courts, last is 3p)', () => {
		let s = createInitialState({ tournamentId: 3, formatType: 'preseed', playerCount: 11 });
		const players = Array.from({ length: 11 }, (_, i) => mockPlayer(i + 1, 11 - i));
		s = addPlayers(s, players);
		s = startRound(s);

		expect(s.currentAssignments).toHaveLength(3);
		expect(s.currentAssignments[0].playerIds.length).toBe(4);
		expect(s.currentAssignments[1].playerIds.length).toBe(4);
		expect(s.currentAssignments[2].playerIds.length).toBe(3);
	});

	it('requires players for Round 1', () => {
		const s = createInitialState({ tournamentId: 1, formatType: 'preseed', playerCount: 8 });
		expect(() => startRound(s)).toThrow('addPlayers');
	});

	it('throws when complete', () => {
		let s = createInitialState({ tournamentId: 1, formatType: 'preseed', playerCount: 8 });
		s = addPlayers(
			s,
			Array.from({ length: 8 }, (_, i) => mockPlayer(i + 1))
		);
		s = startRound(s);
		s = closeRound({
			...s,
			currentMatches: scoreAllMatches(s, { winner: 'A', scoreA: 21, scoreB: 15 })
		});
		s = startRound(s);
		s = closeRound({
			...s,
			currentMatches: scoreAllMatches(s, { winner: 'A', scoreA: 21, scoreB: 15 })
		});
		expect(s.isComplete).toBe(true);
		expect(() => startRound(s)).toThrow('complete');
	});
});

// ============================================================================
// closeRound
// ============================================================================

describe('closeRound', () => {
	it('saves results and pre-computes next round', () => {
		let s = createInitialState({ tournamentId: 1, formatType: 'preseed', playerCount: 16 });
		s = addPlayers(
			s,
			Array.from({ length: 16 }, (_, i) => mockPlayer(i + 1, 16 - i))
		);
		s = startRound(s);
		s = closeRound({
			...s,
			currentMatches: scoreAllMatches(s, { winner: 'A', scoreA: 21, scoreB: 15 })
		});

		expect(s.roundsCompleted).toBe(1);
		expect(s.completedRounds).toHaveLength(1);
		expect(s.currentAssignments).toEqual([]);
		expect(s.currentMatches).toEqual([]);
		expect(s.isComplete).toBe(false);
	});

	it('marks complete when all rounds done (8 players, 2 rounds)', () => {
		let s = createInitialState({ tournamentId: 1, formatType: 'preseed', playerCount: 8 });
		s = addPlayers(
			s,
			Array.from({ length: 8 }, (_, i) => mockPlayer(i + 1, 8 - i))
		);

		// Round 1
		s = startRound(s); // currentRound: 1
		s = closeRound({
			...s,
			currentMatches: scoreAllMatches(s, { winner: 'A', scoreA: 21, scoreB: 15 })
		});
		expect(s.roundsCompleted).toBe(1);
		expect(s.isComplete).toBe(false); // 2 rounds total, 1 completed

		// Start+close Round 2
		s = startRound(s);
		s = closeRound({
			...s,
			currentMatches: scoreAllMatches(s, { winner: 'A', scoreA: 21, scoreB: 15 })
		});
		expect(s.isComplete).toBe(true);
		expect(s.roundsCompleted).toBe(2);
	});

	it('throws when no active round', () => {
		const s = createInitialState({ tournamentId: 1, formatType: 'preseed', playerCount: 8 });
		expect(() => closeRound(s)).toThrow();
	});

	it('throws when no scored matches', () => {
		let s = createInitialState({ tournamentId: 1, formatType: 'preseed', playerCount: 8 });
		s = addPlayers(
			s,
			Array.from({ length: 8 }, (_, i) => mockPlayer(i + 1))
		);
		s = startRound(s);
		expect(() => closeRound(s)).toThrow('No scored matches');
	});
});

// ============================================================================
// redistributePreseedRecursive
// ============================================================================

describe('redistributePreseedRecursive', () => {
	it('single court returns same assignment', () => {
		expect(
			redistributePreseedRecursive([
				mockCourtResult(1, [{ playerId: 1, rank: 1, points: 63, diff: 5, matchCount: 3 }])
			])
		).toEqual([{ courtNumber: 1, playerIds: [1] }]);
	});

	it('handles 3 courts (2W + 1L)', () => {
		const results = [1, 5, 9].map((id, i) =>
			mockCourtResult(i + 1, [
				{ playerId: id, rank: 1, points: 63 - i * 5, diff: 0, matchCount: 3 }
			])
		);
		const a = redistributePreseedRecursive(results);
		expect(a.length).toBe(3);
		expect(a[0].playerIds).toEqual([1]);
		expect(a[1].playerIds).toEqual([5]);
		expect(a[2].playerIds).toEqual([9]);
	});

	it('handles 5 courts (4W + 1L)', () => {
		const results = Array.from({ length: 5 }, (_, i) =>
			mockCourtResult(i + 1, [
				{ playerId: i * 4 + 1, rank: 1, points: 100 - i * 5, diff: 0, matchCount: 3 }
			])
		);
		const a = redistributePreseedRecursive(results);
		expect(a.length).toBe(5);
		expect(a[0].playerIds).toEqual([1]);
		expect(a[4].playerIds).toEqual([17]);
	});

	it('preserves all players', () => {
		const results = Array.from({ length: 8 }, (_, i) =>
			mockCourtResult(
				i + 1,
				Array.from({ length: 4 }, (_, j) => ({
					playerId: i * 4 + j + 1,
					rank: j + 1,
					points: 0,
					diff: 0,
					matchCount: 3
				}))
			)
		);
		const a = redistributePreseedRecursive(results);
		const total = a.reduce((s, c) => s + c.playerIds.length, 0);
		expect(total).toBe(32);
	});
});

// ============================================================================
// Vertical Seeding
// ============================================================================

describe('verticalSeeding', () => {
	it('redistributes 4 courts correctly', () => {
		const results = [
			mockCourtResult(1, [
				{ playerId: 1, rank: 1, points: 63, diff: 5, matchCount: 3 },
				{ playerId: 2, rank: 2, points: 50, diff: 3, matchCount: 3 },
				{ playerId: 3, rank: 3, points: 40, diff: 1, matchCount: 3 },
				{ playerId: 4, rank: 4, points: 30, diff: -2, matchCount: 3 }
			]),
			mockCourtResult(2, [
				{ playerId: 5, rank: 1, points: 58, diff: 4, matchCount: 3 },
				{ playerId: 6, rank: 2, points: 45, diff: 2, matchCount: 3 },
				{ playerId: 7, rank: 3, points: 35, diff: 0, matchCount: 3 },
				{ playerId: 8, rank: 4, points: 25, diff: -3, matchCount: 3 }
			]),
			mockCourtResult(3, [
				{ playerId: 9, rank: 1, points: 55, diff: 3, matchCount: 3 },
				{ playerId: 10, rank: 2, points: 42, diff: 1, matchCount: 3 },
				{ playerId: 11, rank: 3, points: 32, diff: -1, matchCount: 3 },
				{ playerId: 12, rank: 4, points: 22, diff: -4, matchCount: 3 }
			]),
			mockCourtResult(4, [
				{ playerId: 13, rank: 1, points: 50, diff: 2, matchCount: 3 },
				{ playerId: 14, rank: 2, points: 40, diff: 0, matchCount: 3 },
				{ playerId: 15, rank: 3, points: 30, diff: -2, matchCount: 3 },
				{ playerId: 16, rank: 4, points: 20, diff: -5, matchCount: 3 }
			])
		];
		const a = verticalSeeding(results, 4);
		expect(a[0].playerIds).toEqual([1, 5, 9, 13]);
		expect(a.length).toBe(4);
	});

	it('redistributes 8 courts', () => {
		const results = Array.from({ length: 8 }, (_, i) =>
			mockCourtResult(
				i + 1,
				Array.from({ length: 4 }, (_, j) => ({
					playerId: i * 4 + j + 1,
					rank: j + 1,
					points: (8 - i) * 10,
					diff: 0,
					matchCount: 3
				}))
			)
		);
		const a = verticalSeeding(results, 8);
		expect(a.length).toBe(8);
		expect(a.flatMap((x) => x.playerIds).length).toBe(32);
		expect(new Set(a.flatMap((x) => x.playerIds)).size).toBe(32);
	});

	it('handles 3 courts, 12 players', () => {
		const results = [1, 5, 9].map((start, ci) =>
			mockCourtResult(
				ci + 1,
				Array.from({ length: 4 }, (_, j) => ({
					playerId: start + j,
					rank: j + 1,
					points: 40 - j * 5,
					diff: 0,
					matchCount: 3
				}))
			)
		);
		const a = verticalSeeding(results, 3);
		expect(a.length).toBe(3);
		expect(a.flatMap((x) => x.playerIds).length).toBe(12);
		expect(new Set(a.flatMap((x) => x.playerIds)).size).toBe(12);
	});
});

// ============================================================================
// ladderRedistribute
// ============================================================================

describe('ladderRedistribute', () => {
	it('4 courts: 2-up/2-down', () => {
		const results = [
			mockCourtResult(1, [
				{ playerId: 1, rank: 1, points: 63, diff: 5, matchCount: 3 },
				{ playerId: 2, rank: 2, points: 50, diff: 3, matchCount: 3 },
				{ playerId: 3, rank: 3, points: 40, diff: 1, matchCount: 3 },
				{ playerId: 4, rank: 4, points: 30, diff: -2, matchCount: 3 }
			]),
			mockCourtResult(2, [
				{ playerId: 5, rank: 1, points: 58, diff: 4, matchCount: 3 },
				{ playerId: 6, rank: 2, points: 45, diff: 2, matchCount: 3 },
				{ playerId: 7, rank: 3, points: 35, diff: 0, matchCount: 3 },
				{ playerId: 8, rank: 4, points: 25, diff: -3, matchCount: 3 }
			]),
			mockCourtResult(3, [
				{ playerId: 9, rank: 1, points: 55, diff: 3, matchCount: 3 },
				{ playerId: 10, rank: 2, points: 42, diff: 1, matchCount: 3 },
				{ playerId: 11, rank: 3, points: 32, diff: -1, matchCount: 3 },
				{ playerId: 12, rank: 4, points: 22, diff: -4, matchCount: 3 }
			]),
			mockCourtResult(4, [
				{ playerId: 13, rank: 1, points: 50, diff: 2, matchCount: 3 },
				{ playerId: 14, rank: 2, points: 40, diff: 0, matchCount: 3 },
				{ playerId: 15, rank: 3, points: 30, diff: -2, matchCount: 3 },
				{ playerId: 16, rank: 4, points: 20, diff: -5, matchCount: 3 }
			])
		];
		const a = ladderRedistribute(results, 4);
		expect(a[0].playerIds).toEqual([1, 2, 5, 6]);
		expect(a[1].playerIds).toEqual([3, 4, 9, 10]);
		expect(a[2].playerIds).toEqual([7, 8, 13, 14]);
		expect(a[3].playerIds).toEqual([11, 12, 15, 16]);
	});

	it('2 courts: swap halves', () => {
		const results = [
			mockCourtResult(1, [
				{ playerId: 1, rank: 1, points: 63, diff: 5, matchCount: 3 },
				{ playerId: 2, rank: 2, points: 50, diff: 3, matchCount: 3 },
				{ playerId: 3, rank: 3, points: 40, diff: 1, matchCount: 3 },
				{ playerId: 4, rank: 4, points: 30, diff: -2, matchCount: 3 }
			]),
			mockCourtResult(2, [
				{ playerId: 5, rank: 1, points: 58, diff: 4, matchCount: 3 },
				{ playerId: 6, rank: 2, points: 45, diff: 2, matchCount: 3 },
				{ playerId: 7, rank: 3, points: 35, diff: 0, matchCount: 3 },
				{ playerId: 8, rank: 4, points: 25, diff: -3, matchCount: 3 }
			])
		];
		const a = ladderRedistribute(results, 2);
		expect(a[0].playerIds).toEqual([1, 2, 5, 6]);
		expect(a[1].playerIds).toEqual([3, 4, 7, 8]);
	});

	it('8 courts preserves all players', () => {
		const results = Array.from({ length: 8 }, (_, i) =>
			mockCourtResult(
				i + 1,
				Array.from({ length: 4 }, (_, j) => ({
					playerId: i * 4 + j + 1,
					rank: j + 1,
					points: (8 - i) * 10,
					diff: 0,
					matchCount: 3
				}))
			)
		);
		const a = ladderRedistribute(results, 8);
		expect(a.length).toBe(8);
		expect(new Set(a.flatMap((x) => x.playerIds)).size).toBe(32);
	});
});

// ============================================================================
// Match Generation
// ============================================================================

describe('generate4pMatches', () => {
	it('generates 3 matches: [1+2 vs 3+4], [1+3 vs 2+4], [1+4 vs 2+3]', () => {
		const m = generate4pMatches([1, 2, 3, 4]);
		expect(m).toHaveLength(3);
		expect(m[0].teamAPlayer1Id).toBe(1);
		expect(m[1].teamBPlayer1Id).toBe(2);
		expect(m[2].teamBPlayer1Id).toBe(2);
	});
});

describe('generate3pMatches', () => {
	it('each player takes a solo turn', () => {
		const m = generate3pMatches([1, 2, 3]);
		expect(m).toHaveLength(3);
		expect(m[0].teamBPlayer1Id).toBe(3);
		expect(m[1].teamBPlayer1Id).toBe(2);
		expect(m[2].teamBPlayer1Id).toBe(1);
	});
});

describe('generate5pMatches', () => {
	it('generates 4 matches for 5 players', () => {
		const m = generate5pMatches([1, 2, 3, 4, 5]);
		expect(m).toHaveLength(4);
	});

	it('no player appears twice in the same match', () => {
		const m = generate5pMatches([1, 2, 3, 4, 5]);
		for (const match of m) {
			const players = new Set([
				match.teamAPlayer1Id,
				match.teamAPlayer2Id,
				match.teamBPlayer1Id,
				match.teamBPlayer2Id
			]);
			expect(players.size).toBe(4);
		}
	});

	it('each player plays at least 3 matches', () => {
		const m = generate5pMatches([1, 2, 3, 4, 5]);
		const allPlayers = [1, 2, 3, 4, 5];
		for (const playerId of allPlayers) {
			const matchesPlayed = m.filter(
				(match) =>
					match.teamAPlayer1Id === playerId ||
					match.teamAPlayer2Id === playerId ||
					match.teamBPlayer1Id === playerId ||
					match.teamBPlayer2Id === playerId
			).length;
			expect(matchesPlayed).toBeGreaterThanOrEqual(3);
		}
	});

	it('Run 1 has fixed team A+B on side X', () => {
		const m = generate5pMatches([1, 2, 3, 4, 5]);
		// Games 1 and 2 should have same team A (p1+p2)
		expect(m[0].teamAPlayer1Id).toBe(1);
		expect(m[0].teamAPlayer2Id).toBe(2);
		expect(m[1].teamAPlayer1Id).toBe(1);
		expect(m[1].teamAPlayer2Id).toBe(2);
	});

	it('Run 1 has fixed player C on side Y', () => {
		const m = generate5pMatches([1, 2, 3, 4, 5]);
		// Games 1 and 2 should have same player p3 on team B
		expect(m[0].teamBPlayer1Id).toBe(3);
		expect(m[1].teamBPlayer1Id).toBe(3);
	});

	it('Run 2 has fixed team D+E on side X', () => {
		const m = generate5pMatches([1, 2, 3, 4, 5]);
		// Games 3 and 4 should have same team A (p4+p5)
		expect(m[2].teamAPlayer1Id).toBe(4);
		expect(m[2].teamAPlayer2Id).toBe(5);
		expect(m[3].teamAPlayer1Id).toBe(4);
		expect(m[3].teamAPlayer2Id).toBe(5);
	});

	it('Run 2 has fixed player B on side Y', () => {
		const m = generate5pMatches([1, 2, 3, 4, 5]);
		// Games 3 and 4 should have same player p2 on team B
		expect(m[2].teamBPlayer1Id).toBe(2);
		expect(m[3].teamBPlayer1Id).toBe(2);
	});
});

describe('generate6pMatches', () => {
	it('generates 4 matches for 6 players', () => {
		const m = generate6pMatches([1, 2, 3, 4, 5, 6]);
		expect(m).toHaveLength(4);
	});

	it('no player appears twice in the same match', () => {
		const m = generate6pMatches([1, 2, 3, 4, 5, 6]);
		for (const match of m) {
			const players = new Set([
				match.teamAPlayer1Id,
				match.teamAPlayer2Id,
				match.teamBPlayer1Id,
				match.teamBPlayer2Id
			]);
			expect(players.size).toBe(4);
		}
	});

	it('each player plays at least 2 matches', () => {
		const m = generate6pMatches([1, 2, 3, 4, 5, 6]);
		const allPlayers = [1, 2, 3, 4, 5, 6];
		for (const playerId of allPlayers) {
			const matchesPlayed = m.filter(
				(match) =>
					match.teamAPlayer1Id === playerId ||
					match.teamAPlayer2Id === playerId ||
					match.teamBPlayer1Id === playerId ||
					match.teamBPlayer2Id === playerId
			).length;
			expect(matchesPlayed).toBeGreaterThanOrEqual(2);
		}
	});

	it('game count diff is max 1', () => {
		const m = generate6pMatches([1, 2, 3, 4, 5, 6]);
		const allPlayers = [1, 2, 3, 4, 5, 6];
		const counts = allPlayers.map(
			(playerId) =>
				m.filter(
					(match) =>
						match.teamAPlayer1Id === playerId ||
						match.teamAPlayer2Id === playerId ||
						match.teamBPlayer1Id === playerId ||
						match.teamBPlayer2Id === playerId
				).length
		);
		const max = Math.max(...counts);
		const min = Math.min(...counts);
		expect(max - min).toBeLessThanOrEqual(1);
	});

	it('Run 1 has fixed team p1+p2 on side X', () => {
		const m = generate6pMatches([1, 2, 3, 4, 5, 6]);
		expect(m[0].teamAPlayer1Id).toBe(1);
		expect(m[0].teamAPlayer2Id).toBe(2);
		expect(m[1].teamAPlayer1Id).toBe(1);
		expect(m[1].teamAPlayer2Id).toBe(2);
	});

	it('Run 1 has rotating pairs p3+p5 and p4+p6 on side Y', () => {
		const m = generate6pMatches([1, 2, 3, 4, 5, 6]);
		expect(m[0].teamBPlayer1Id).toBe(3);
		expect(m[0].teamBPlayer2Id).toBe(5);
		expect(m[1].teamBPlayer1Id).toBe(4);
		expect(m[1].teamBPlayer2Id).toBe(6);
	});

	it('Run 2 has fixed team p3+p4 on side X', () => {
		const m = generate6pMatches([1, 2, 3, 4, 5, 6]);
		expect(m[2].teamAPlayer1Id).toBe(3);
		expect(m[2].teamAPlayer2Id).toBe(4);
		expect(m[3].teamAPlayer1Id).toBe(3);
		expect(m[3].teamAPlayer2Id).toBe(4);
	});

	it('Run 2 has rotating pairs p1+p5 and p2+p6 on side Y', () => {
		const m = generate6pMatches([1, 2, 3, 4, 5, 6]);
		expect(m[2].teamBPlayer1Id).toBe(1);
		expect(m[2].teamBPlayer2Id).toBe(5);
		expect(m[3].teamBPlayer1Id).toBe(2);
		expect(m[3].teamBPlayer2Id).toBe(6);
	});

	it('no partnership repeats across runs', () => {
		const m = generate6pMatches([1, 2, 3, 4, 5, 6]);
		// Collect partnerships from Run 1 (games 0-1)
		const run1Partnerships = new Set<string>();
		for (let i = 0; i < 2; i++) {
			const match = m[i];
			const pairA = [match.teamAPlayer1Id, match.teamAPlayer2Id].sort().join('-');
			const pairB = [match.teamBPlayer1Id, match.teamBPlayer2Id].sort().join('-');
			run1Partnerships.add(pairA);
			run1Partnerships.add(pairB);
		}

		// Check Run 2 (games 2-3) partnerships don't overlap with Run 1
		for (let i = 2; i < 4; i++) {
			const match = m[i];
			const pairA = [match.teamAPlayer1Id, match.teamAPlayer2Id].sort().join('-');
			const pairB = [match.teamBPlayer1Id, match.teamBPlayer2Id].sort().join('-');
			expect(run1Partnerships.has(pairA)).toBe(false);
			expect(run1Partnerships.has(pairB)).toBe(false);
		}
	});
});

describe('matchCountForCourtSize', () => {
	it.each([
		[3, 3],
		[4, 3],
		[5, 4],
		[6, 4]
	])('%dp → %d matches', (size, exp) => {
		expect(matchCountForCourtSize(size)).toBe(exp);
	});
});

describe('countScoredMatches', () => {
	it('counts only scored', () => {
		expect(
			countScoredMatches([mockMatch([1, 2], [3, 4], 21, 19), mockMatch([1, 3], [2, 4], null, null)])
		).toBe(1);
		expect(countScoredMatches([])).toBe(0);
	});
});

// ============================================================================
// Full Tournament Integration
// ============================================================================

describe('Full 16-player preseed tournament', () => {
	it('completes 3 rounds', () => {
		let s = createInitialState({ tournamentId: 1, formatType: 'preseed', playerCount: 16 });
		s = addPlayers(
			s,
			Array.from({ length: 16 }, (_, i) => mockPlayer(i + 1, 16 - i))
		);

		// Round 1
		s = startRound(s);
		expect(s.currentRound).toBe(1);
		s = closeRound({
			...s,
			currentMatches: scoreAllMatches(s, { winner: 'A', scoreA: 21, scoreB: 15 })
		});

		// Round 2
		s = startRound(s);
		expect(s.currentRound).toBe(2);
		s = closeRound({
			...s,
			currentMatches: scoreAllMatches(s, { winner: 'A', scoreA: 21, scoreB: 18 })
		});

		// Round 3
		s = startRound(s);
		expect(s.currentRound).toBe(3);
		expect(s.isComplete).toBe(true);
		s = closeRound({
			...s,
			currentMatches: scoreAllMatches(s, { winner: 'A', scoreA: 21, scoreB: 19 })
		});
		expect(s.isComplete).toBe(true);
		expect(s.completedRounds).toHaveLength(3);
	});
});

describe('Full 8-player random seed tournament', () => {
	it('completes 4 rounds', () => {
		let s = createInitialState({ tournamentId: 2, formatType: 'random-seed', playerCount: 8 });
		s = addPlayers(
			s,
			Array.from({ length: 8 }, (_, i) => mockPlayer(i + 1))
		);

		s = startRound(s);
		expect(s.currentRound).toBe(1);
		s = closeRound({
			...s,
			currentMatches: scoreAllMatches(s, { winner: 'A', scoreA: 21, scoreB: 15 })
		});

		s = startRound(s);
		expect(s.currentRound).toBe(2);
		s = closeRound({
			...s,
			currentMatches: scoreAllMatches(s, { winner: 'A', scoreA: 21, scoreB: 18 })
		});

		s = startRound(s);
		expect(s.currentRound).toBe(3);
		expect(s.isComplete).toBe(false);
		s = closeRound({
			...s,
			currentMatches: scoreAllMatches(s, { winner: 'A', scoreA: 21, scoreB: 19 })
		});
		expect(s.isComplete).toBe(false);

		s = startRound(s);
		expect(s.currentRound).toBe(4);
		expect(s.isComplete).toBe(true);
		s = closeRound({
			...s,
			currentMatches: scoreAllMatches(s, { winner: 'A', scoreA: 21, scoreB: 17 })
		});
		expect(s.isComplete).toBe(true);
		expect(s.completedRounds).toHaveLength(4);
	});
});

describe('Non-standard rosters', () => {
	it('9 players → 2 courts (4p + 5p)', () => {
		expect(calculateCourtSizes(9)).toEqual([4, 5]);
	});
	it('6 courts for 25 players', () => {
		expect(calculateCourtSizes(25)).toEqual([4, 4, 4, 4, 4, 5]);
	});
});

describe('Scoring logic', () => {
	const defaultConfig = { pointsToWin: 21, setsToWin: 1, decidingSetPoints: 15 };
	const bestOf3Config = { pointsToWin: 21, setsToWin: 2, decidingSetPoints: 15 };
	const customConfig = { pointsToWin: 25, setsToWin: 2, decidingSetPoints: 20 };

	describe('isDecidingSet', () => {
		it('single set: no deciding set', () => {
			expect(isDecidingSet(1, 1)).toBe(false);
		});
		it('best-of-3: set 3 is deciding', () => {
			expect(isDecidingSet(1, 2)).toBe(false);
			expect(isDecidingSet(2, 2)).toBe(false);
			expect(isDecidingSet(3, 2)).toBe(true);
		});
		it('best-of-5: set 5 is deciding', () => {
			expect(isDecidingSet(5, 3)).toBe(true);
			expect(isDecidingSet(4, 3)).toBe(false);
		});
	});

	describe('getMaxSets', () => {
		it('single set returns 1', () => {
			expect(getMaxSets(1)).toBe(1);
		});
		it('best-of-3 returns 3', () => {
			expect(getMaxSets(2)).toBe(3);
		});
		it('best-of-5 returns 5', () => {
			expect(getMaxSets(3)).toBe(5);
		});
	});

	describe('getMinPointsForSet', () => {
		it('4p single set: 21', () => {
			expect(getMinPointsForSet(1, 4, defaultConfig)).toBe(21);
		});
		it('5p single set: 15 (auto-adjusted from 21)', () => {
			expect(getMinPointsForSet(1, 5, defaultConfig)).toBe(15);
		});
		it('6p single set: 15', () => {
			expect(getMinPointsForSet(1, 6, defaultConfig)).toBe(15);
		});
		it('3p single set: 21', () => {
			expect(getMinPointsForSet(1, 3, defaultConfig)).toBe(21);
		});
		it('best-of-3 set 1: 21', () => {
			expect(getMinPointsForSet(1, 4, bestOf3Config)).toBe(21);
		});
		it('best-of-3 set 2: 21', () => {
			expect(getMinPointsForSet(2, 4, bestOf3Config)).toBe(21);
		});
		it('best-of-3 deciding set: 15', () => {
			expect(getMinPointsForSet(3, 4, bestOf3Config)).toBe(15);
		});
		it('5p best-of-3 set 1: 21 (not auto-adjusted for best-of-3)', () => {
			expect(getMinPointsForSet(1, 5, bestOf3Config)).toBe(21);
		});
		it('5p best-of-3 deciding set: 15', () => {
			expect(getMinPointsForSet(3, 5, bestOf3Config)).toBe(15);
		});
		it('custom pointsToWin=25, decidingSetPoints=20', () => {
			expect(getMinPointsForSet(1, 4, customConfig)).toBe(25);
			expect(getMinPointsForSet(2, 4, customConfig)).toBe(25);
			expect(getMinPointsForSet(3, 4, customConfig)).toBe(20);
		});
		it('custom pointsToWin=25 on 5p court, single set: 25 (not 15)', () => {
			const customSingle = { pointsToWin: 25, setsToWin: 1, decidingSetPoints: 15 };
			expect(getMinPointsForSet(1, 5, customSingle)).toBe(25);
		});
	});

	describe('getScoringLabel', () => {
		it('single set 4p', () => {
			expect(getScoringLabel(defaultConfig, 4)).toBe('1 set to 21');
		});
		it('single set 5p', () => {
			expect(getScoringLabel(defaultConfig, 5)).toBe('1 set to 15');
		});
		it('best-of-3', () => {
			expect(getScoringLabel(bestOf3Config, 4)).toBe('Best of 2 (21pt, deciding: 15pt)');
		});
		it('custom', () => {
			expect(getScoringLabel(customConfig, 4)).toBe('Best of 2 (25pt, deciding: 20pt)');
		});
	});
});

// ============================================================================
// Player Retirement
// ============================================================================

describe('calculateCourtStandings with canceled matches', () => {
	it('uses averages when any match is canceled', () => {
		const matches = [
			mockMatch([1, 2], [3, 4], 21, 19),
			{ ...mockMatch([1, 3], [2, 4], 25, 23), isCanceled: true },
			{ ...mockMatch([1, 4], [2, 3], 22, 20), isCanceled: true }
		];
		const result = calculateCourtStandings(matches, [1, 2, 3, 4]);
		// Only 1 completed match. Averages = same as totals for 1 match.
		expect(result[0].playerId).toBe(1);
		expect(result[0].points).toBe(21);
		expect(result[0].diff).toBe(2);
	});

	it('uses averages for 5p courts even without canceled matches', () => {
		// 5 players, 4 matches (p2 plays 4, others play 3)
		const matches = [
			mockMatch([1, 2], [3, 4], 21, 19),
			mockMatch([1, 2], [3, 5], 22, 20),
			mockMatch([4, 5], [2, 1], 18, 25),
			mockMatch([4, 5], [2, 3], 20, 23)
		];
		const result = calculateCourtStandings(matches, [1, 2, 3, 4, 5]);
		// p1 played 3 matches: scores 21, 22, 25 = 68 total, avg = 22.67
		// p2 played 4 matches: scores 21, 22, 25, 23 = 91 total, avg = 22.75
		expect(result[0].playerId).toBe(2);
		expect(result[0].points).toBeCloseTo(22.75, 1);
	});

	it('injured player gets 0 points in substitute matches', () => {
		const matches = [
			mockMatch([1, 2], [3, 4], 21, 19),
			{ ...mockMatch([1, 3], [2, 4], 25, 23), injuredPlayerIds: [2] },
			mockMatch([1, 4], [2, 3], 22, 20)
		];
		const result = calculateCourtStandings(matches, [1, 2, 3, 4]);
		// p2 should have 21 + 0 + 20 = 41
		// p1 should have 21 + 25 + 22 = 68
		const p2 = result.find((s) => s.playerId === 2);
		expect(p2?.points).toBe(41);
	});
});

describe('recalculateCourtConfigAfterRetirement', () => {
	it('23 players → 5×4p + 1×3p', () => {
		expect(recalculateCourtConfigAfterRetirement(23)).toEqual({
			courtSizes: [4, 4, 4, 4, 4, 3],
			totalCourts: 6
		});
	});

	it('22 players → 4×4p + 1×6p', () => {
		expect(recalculateCourtConfigAfterRetirement(22)).toEqual({
			courtSizes: [4, 4, 4, 4, 6],
			totalCourts: 5
		});
	});

	it('3 players → 1×3p', () => {
		expect(recalculateCourtConfigAfterRetirement(3)).toEqual({
			courtSizes: [3],
			totalCourts: 1
		});
	});
});

describe('getPreseedBracketRange', () => {
	it('4 courts: C1 → 1-8, C3 → 9-16', () => {
		expect(getPreseedBracketRange(1, 4)).toEqual({ min: 1, max: 8 });
		expect(getPreseedBracketRange(2, 4)).toEqual({ min: 1, max: 8 });
		expect(getPreseedBracketRange(3, 4)).toEqual({ min: 9, max: 16 });
		expect(getPreseedBracketRange(4, 4)).toEqual({ min: 9, max: 16 });
	});

	it('8 courts: recursive split into 4 leaves', () => {
		expect(getPreseedBracketRange(1, 8)).toEqual({ min: 1, max: 16 });
		expect(getPreseedBracketRange(5, 8)).toEqual({ min: 17, max: 32 });
	});
});

describe('calculateRetiredStanding', () => {
	it('preseed: returns bracket max', () => {
		const standing = calculateRetiredStanding(3, 4, 1, 3, 'preseed', [4, 4, 4, 4], {
			min: 9,
			max: 16
		});
		expect(standing).toBe(16);
	});

	it('random seed: worst court after full relegation', () => {
		// 24 players, 6 courts, retired after round 2 on court 3
		// remainingRounds = 1, worstCourt = min(3 + 1, 6) = 4
		// places on courts 1-3: 12, court 4 has 4 players → worst = 16
		const standing = calculateRetiredStanding(3, 6, 2, 3, 'random-seed', [4, 4, 4, 4, 4, 4]);
		expect(standing).toBe(16);
	});

	it('random seed with non-standard bottom court', () => {
		// 23 players, 6 courts [4,4,4,4,4,3]
		// worstCourt = min(3 + 1, 6) = 4
		// places = 4*3 + 4 = 16
		const standing = calculateRetiredStanding(3, 6, 2, 3, 'random-seed', [4, 4, 4, 4, 4, 3]);
		expect(standing).toBe(16);
	});
});

describe('getFinalRoundCourtConfig', () => {
	it('5 players: eliminate 1, top 4 play', () => {
		const result = getFinalRoundCourtConfig(
			[4, 4, 4, 4, 5],
			[
				[1, 2, 3, 4],
				[5, 6, 7, 8],
				[9, 10, 11, 12],
				[13, 14, 15, 16],
				[17, 18, 19, 20, 21]
			]
		);
		expect(result.courtSizes).toEqual([4, 4, 4, 4, 5]);
		expect(result.eliminatedPlayerIds).toEqual([]);
	});

	it('5 players with 1 court: trim to 4', () => {
		const result = getFinalRoundCourtConfig([5], [[1, 2, 3, 4, 5]]);
		expect(result.courtSizes).toEqual([4]);
		expect(result.eliminatedPlayerIds).toEqual([5]);
	});

	it('7 players: 4 + 3', () => {
		const result = getFinalRoundCourtConfig(
			[4, 3],
			[
				[1, 2, 3, 4],
				[5, 6, 7]
			]
		);
		expect(result.courtSizes).toEqual([4, 3]);
		expect(result.eliminatedPlayerIds).toEqual([]);
	});
});
