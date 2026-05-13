import { describe, it, expect, vi } from 'vitest';
import {
	type CourtResult,
	type MatchData,
	getCourtConfiguration,
	calculateCourtSizes,
	calculateRoundCount,
	createInitialState,
	addPlayers,
	startRound,
	closeRound,
	redistributePreseedRecursive,
	redistributeLadder,
	verticalSeeding,
	ladderRedistribute,
	calculateCourtStandings,
	generate4pMatches,
	generate3pMatches,
	matchCountForCourtSize,
	countScoredMatches
} from './tournament-logic';

// ============================================================================
// Helpers
// ============================================================================

function mockCourtResult(
	courtNumber: number,
	standings: { playerId: number; rank: number; points: number; diff: number }[]
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

function mockPlayer(id: number, seedPoints: number | null = null): {
	id: number;
	name: string;
	seedPoints: number | null;
	seedRank: number | null;
} {
	return { id, name: `Player${id}`, seedPoints, seedRank: null };
}

function scoreAllMatches(
	state: any,
	scores: { winner: 'A' | 'B'; scoreA: number; scoreB: number } | ((courtIdx: number) => { winner: 'A' | 'B'; scoreA: number; scoreB: number })
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
		expect(getCourtConfiguration(8)).toEqual({ totalCourts: 2, standardCourts: 2, bottomCourtSize: null });
	});
	it('16 players → 4 courts', () => {
		expect(getCourtConfiguration(16)).toEqual({ totalCourts: 4, standardCourts: 4, bottomCourtSize: null });
	});
	it('32 players → 8 courts', () => {
		expect(getCourtConfiguration(32)).toEqual({ totalCourts: 8, standardCourts: 8, bottomCourtSize: null });
	});
	it('25 players → 5 standard + 1 5p', () => {
		expect(getCourtConfiguration(25)).toEqual({ totalCourts: 6, standardCourts: 5, bottomCourtSize: 5 });
	});
	it('26 players → 5 standard + 1 6p', () => {
		expect(getCourtConfiguration(26)).toEqual({ totalCourts: 6, standardCourts: 5, bottomCourtSize: 6 });
	});
	it('27 players → 6 standard + 1 3p', () => {
		expect(getCourtConfiguration(27)).toEqual({ totalCourts: 7, standardCourts: 6, bottomCourtSize: 3 });
	});
	it('64 players → 16 courts', () => {
		expect(getCourtConfiguration(64)).toEqual({ totalCourts: 16, standardCourts: 16, bottomCourtSize: null });
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
		[2, 'random-seed', 3],
		[4, 'random-seed', 3],
		[5, 'random-seed', 4],
		[8, 'random-seed', 4],
		[9, 'random-seed', 5],
		[16, 'random-seed', 5]
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
	});

	it('tiebreaker: diff then playerId', () => {
		const matches: MatchData[] = [
			mockMatch([1, 2], [3, 4], 21, 21),
			mockMatch([1, 3], [2, 4], 21, 21),
			mockMatch([1, 4], [2, 3], 21, 21)
		];
		expect(calculateCourtStandings(matches, [1, 2, 3, 4]).map((s) => s.playerId)).toEqual([1, 2, 3, 4]);
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
		s = addPlayers(s, Array.from({ length: 8 }, (_, i) => mockPlayer(i + 1)));
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
		s = addPlayers(s, Array.from({ length: 8 }, (_, i) => mockPlayer(i + 1)));
		s = startRound(s);
		s = closeRound({ ...s, currentMatches: scoreAllMatches(s, { winner: 'A', scoreA: 21, scoreB: 15 }) });
		s = startRound(s);
		s = closeRound({ ...s, currentMatches: scoreAllMatches(s, { winner: 'A', scoreA: 21, scoreB: 15 }) });
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
		s = addPlayers(s, Array.from({ length: 16 }, (_, i) => mockPlayer(i + 1, 16 - i)));
		s = startRound(s);
		s = closeRound({ ...s, currentMatches: scoreAllMatches(s, { winner: 'A', scoreA: 21, scoreB: 15 }) });

		expect(s.roundsCompleted).toBe(1);
		expect(s.completedRounds).toHaveLength(1);
		expect(s.currentAssignments).toEqual([]);
		expect(s.currentMatches).toEqual([]);
		expect(s.isComplete).toBe(false);
	});

	it('marks complete when all rounds done (8 players, 2 rounds)', () => {
		let s = createInitialState({ tournamentId: 1, formatType: 'preseed', playerCount: 8 });
		s = addPlayers(s, Array.from({ length: 8 }, (_, i) => mockPlayer(i + 1, 8 - i)));

		// Round 1
		s = startRound(s); // currentRound: 1
		s = closeRound({ ...s, currentMatches: scoreAllMatches(s, { winner: 'A', scoreA: 21, scoreB: 15 }) });
		expect(s.roundsCompleted).toBe(1);
		expect(s.isComplete).toBe(false); // 2 rounds total, 1 completed

		// Start+close Round 2
		s = startRound(s);
		s = closeRound({ ...s, currentMatches: scoreAllMatches(s, { winner: 'A', scoreA: 21, scoreB: 15 }) });
		expect(s.isComplete).toBe(true);
		expect(s.roundsCompleted).toBe(2);
	});

	it('throws when no active round', () => {
		const s = createInitialState({ tournamentId: 1, formatType: 'preseed', playerCount: 8 });
		expect(() => closeRound(s)).toThrow();
	});

	it('throws when no scored matches', () => {
		let s = createInitialState({ tournamentId: 1, formatType: 'preseed', playerCount: 8 });
		s = addPlayers(s, Array.from({ length: 8 }, (_, i) => mockPlayer(i + 1)));
		s = startRound(s);
		expect(() => closeRound(s)).toThrow('No scored matches');
	});
});

// ============================================================================
// redistributePreseedRecursive
// ============================================================================

describe('redistributePreseedRecursive', () => {
	it('single court returns same assignment', () => {
		expect(redistributePreseedRecursive([mockCourtResult(1, [{ playerId: 1, rank: 1, points: 63, diff: 5 }])]))
			.toEqual([{ courtNumber: 1, playerIds: [1] }]);
	});

	it('handles 3 courts (2W + 1L)', () => {
		const results = [1, 5, 9].map((id, i) => mockCourtResult(i + 1, [{ playerId: id, rank: 1, points: 63 - i * 5, diff: 0 }]));
		const a = redistributePreseedRecursive(results);
		expect(a.length).toBe(3);
		expect(a[0].playerIds).toEqual([1]);
		expect(a[1].playerIds).toEqual([5]);
		expect(a[2].playerIds).toEqual([9]);
	});

	it('handles 5 courts (4W + 1L)', () => {
		const results = Array.from({ length: 5 }, (_, i) =>
			mockCourtResult(i + 1, [{ playerId: i * 4 + 1, rank: 1, points: 100 - i * 5, diff: 0 }])
		);
		const a = redistributePreseedRecursive(results);
		expect(a.length).toBe(5);
		expect(a[0].playerIds).toEqual([1]);
		expect(a[4].playerIds).toEqual([17]);
	});

	it('preserves all players', () => {
		const results = Array.from({ length: 8 }, (_, i) =>
			mockCourtResult(i + 1, Array.from({ length: 4 }, (_, j) => ({
				playerId: i * 4 + j + 1, rank: j + 1, points: 0, diff: 0
			})))
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
				{ playerId: 1, rank: 1, points: 63, diff: 5 },
				{ playerId: 2, rank: 2, points: 50, diff: 3 },
				{ playerId: 3, rank: 3, points: 40, diff: 1 },
				{ playerId: 4, rank: 4, points: 30, diff: -2 }
			]),
			mockCourtResult(2, [
				{ playerId: 5, rank: 1, points: 58, diff: 4 },
				{ playerId: 6, rank: 2, points: 45, diff: 2 },
				{ playerId: 7, rank: 3, points: 35, diff: 0 },
				{ playerId: 8, rank: 4, points: 25, diff: -3 }
			]),
			mockCourtResult(3, [
				{ playerId: 9, rank: 1, points: 55, diff: 3 },
				{ playerId: 10, rank: 2, points: 42, diff: 1 },
				{ playerId: 11, rank: 3, points: 32, diff: -1 },
				{ playerId: 12, rank: 4, points: 22, diff: -4 }
			]),
			mockCourtResult(4, [
				{ playerId: 13, rank: 1, points: 50, diff: 2 },
				{ playerId: 14, rank: 2, points: 40, diff: 0 },
				{ playerId: 15, rank: 3, points: 30, diff: -2 },
				{ playerId: 16, rank: 4, points: 20, diff: -5 }
			])
		];
		const a = verticalSeeding(results, 4);
		expect(a[0].playerIds).toEqual([1, 5, 9, 13]);
		expect(a.length).toBe(4);
	});

	it('redistributes 8 courts', () => {
		const results = Array.from({ length: 8 }, (_, i) =>
			mockCourtResult(i + 1, Array.from({ length: 4 }, (_, j) => ({
				playerId: i * 4 + j + 1, rank: j + 1,
				points: (8 - i) * 10, diff: 0
			})))
		);
		const a = verticalSeeding(results, 8);
		expect(a.length).toBe(8);
		expect(a.flatMap(x => x.playerIds).length).toBe(32);
		expect(new Set(a.flatMap(x => x.playerIds)).size).toBe(32);
	});

	it('handles 3 courts, 12 players', () => {
		const results = [1, 5, 9].map((start, ci) =>
			mockCourtResult(ci + 1, Array.from({ length: 4 }, (_, j) => ({
				playerId: start + j, rank: j + 1, points: 40 - j * 5, diff: 0
			})))
		);
		const a = verticalSeeding(results, 3);
		expect(a.length).toBe(3);
		expect(a.flatMap(x => x.playerIds).length).toBe(12);
		expect(new Set(a.flatMap(x => x.playerIds)).size).toBe(12);
	});
});

// ============================================================================
// ladderRedistribute
// ============================================================================

describe('ladderRedistribute', () => {
	it('4 courts: 2-up/2-down', () => {
		const results = [
			mockCourtResult(1, [{ playerId: 1, rank: 1 }, { playerId: 2, rank: 2 }, { playerId: 3, rank: 3 }, { playerId: 4, rank: 4 }]),
			mockCourtResult(2, [{ playerId: 5, rank: 1 }, { playerId: 6, rank: 2 }, { playerId: 7, rank: 3 }, { playerId: 8, rank: 4 }]),
			mockCourtResult(3, [{ playerId: 9, rank: 1 }, { playerId: 10, rank: 2 }, { playerId: 11, rank: 3 }, { playerId: 12, rank: 4 }]),
			mockCourtResult(4, [{ playerId: 13, rank: 1 }, { playerId: 14, rank: 2 }, { playerId: 15, rank: 3 }, { playerId: 16, rank: 4 }])
		];
		const a = ladderRedistribute(results, 4);
		expect(a[0].playerIds).toEqual([1, 2, 5, 6]);
		expect(a[1].playerIds).toEqual([3, 4, 9, 10]);
		expect(a[2].playerIds).toEqual([7, 8, 13, 14]);
		expect(a[3].playerIds).toEqual([11, 12, 15, 16]);
	});

	it('2 courts: swap halves', () => {
		const results = [
			mockCourtResult(1, [{ playerId: 1, rank: 1 }, { playerId: 2, rank: 2 }, { playerId: 3, rank: 3 }, { playerId: 4, rank: 4 }]),
			mockCourtResult(2, [{ playerId: 5, rank: 1 }, { playerId: 6, rank: 2 }, { playerId: 7, rank: 3 }, { playerId: 8, rank: 4 }])
		];
		const a = ladderRedistribute(results, 2);
		expect(a[0].playerIds).toEqual([1, 2, 5, 6]);
		expect(a[1].playerIds).toEqual([3, 4, 7, 8]);
	});

	it('8 courts preserves all players', () => {
		const results = Array.from({ length: 8 }, (_, i) =>
			mockCourtResult(i + 1, Array.from({ length: 4 }, (_, j) => ({
				playerId: i * 4 + j + 1, rank: j + 1
			})))
		);
		const a = ladderRedistribute(results, 8);
		expect(a.length).toBe(8);
		expect(new Set(a.flatMap(x => x.playerIds)).size).toBe(32);
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

describe('matchCountForCourtSize', () => {
	it.each([[3, 3], [4, 3], [5, 4], [6, 4]])('%dp → %d matches', (size, exp) => {
		expect(matchCountForCourtSize(size)).toBe(exp);
	});
});

describe('countScoredMatches', () => {
	it('counts only scored', () => {
		expect(countScoredMatches([mockMatch([1,2],[3,4],21,19), mockMatch([1,3],[2,4],null,null)])).toBe(1);
		expect(countScoredMatches([])).toBe(0);
	});
});

// ============================================================================
// Full Tournament Integration
// ============================================================================

describe('Full 16-player preseed tournament', () => {
	it('completes 3 rounds', () => {
		let s = createInitialState({ tournamentId: 1, formatType: 'preseed', playerCount: 16 });
		s = addPlayers(s, Array.from({ length: 16 }, (_, i) => mockPlayer(i + 1, 16 - i)));

		// Round 1
		s = startRound(s);
		expect(s.currentRound).toBe(1);
		s = closeRound({ ...s, currentMatches: scoreAllMatches(s, { winner: 'A', scoreA: 21, scoreB: 15 }) });

		// Round 2
		s = startRound(s);
		expect(s.currentRound).toBe(2);
		s = closeRound({ ...s, currentMatches: scoreAllMatches(s, { winner: 'A', scoreA: 21, scoreB: 18 }) });

		// Round 3
		s = startRound(s);
		expect(s.currentRound).toBe(3);
		expect(s.isComplete).toBe(true);
		s = closeRound({ ...s, currentMatches: scoreAllMatches(s, { winner: 'A', scoreA: 21, scoreB: 19 }) });
		expect(s.isComplete).toBe(true);
		expect(s.completedRounds).toHaveLength(3);
	});
});

describe('Full 8-player random seed tournament', () => {
	it('completes 3 rounds', () => {
		let s = createInitialState({ tournamentId: 2, formatType: 'random-seed', playerCount: 8 });
		s = addPlayers(s, Array.from({ length: 8 }, (_, i) => mockPlayer(i + 1)));

		s = startRound(s);
		expect(s.currentRound).toBe(1);
		s = closeRound({ ...s, currentMatches: scoreAllMatches(s, { winner: 'A', scoreA: 21, scoreB: 15 }) });

		s = startRound(s);
		expect(s.currentRound).toBe(2);
		s = closeRound({ ...s, currentMatches: scoreAllMatches(s, { winner: 'A', scoreA: 21, scoreB: 18 }) });

		s = startRound(s);
		expect(s.currentRound).toBe(3);
		expect(s.isComplete).toBe(true);
		s = closeRound({ ...s, currentMatches: scoreAllMatches(s, { winner: 'A', scoreA: 21, scoreB: 19 }) });
		expect(s.isComplete).toBe(true);
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