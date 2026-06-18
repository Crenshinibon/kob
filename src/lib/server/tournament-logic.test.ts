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
	processPreseedTransition,
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
	getEffectiveScoring,
	recalculateCourtConfigAfterRetirement,
	getPreseedBracketRange,
	calculateRetiredStanding,
	getFinalRoundCourtConfig,
	isValidFinalScore,
	getFrozenCourts,
	type FormatType,
	type TournamentState,
	type CourtResult,
	type CourtAssignment,
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

function topFinishers(results: readonly CourtResult[], courtNums: readonly number[]): number[] {
	const ids: number[] = [];
	for (const courtNum of courtNums) {
		const court = results.find((r) => r.courtNumber === courtNum);
		if (!court) continue;
		for (const s of court.standings) {
			if (s.rank <= 2) ids.push(s.playerId);
		}
	}
	return ids;
}

function bottomFinishers(results: readonly CourtResult[], courtNums: readonly number[]): number[] {
	const ids: number[] = [];
	for (const courtNum of courtNums) {
		const court = results.find((r) => r.courtNumber === courtNum);
		if (!court) continue;
		for (const s of court.standings) {
			if (s.rank >= 3) ids.push(s.playerId);
		}
	}
	return ids;
}

function expectSamePlayerSet(actual: readonly number[], expected: readonly number[]): void {
	expect([...actual].sort((a, b) => a - b)).toEqual([...expected].sort((a, b) => a - b));
}

function mockRankedCourts(courtCount: number): CourtResult[] {
	return Array.from({ length: courtCount }, (_, i) =>
		mockCourtResult(i + 1, [
			{ playerId: i * 4 + 1, rank: 1, points: 60, diff: 0, matchCount: 3 },
			{ playerId: i * 4 + 2, rank: 2, points: 50, diff: 0, matchCount: 3 },
			{ playerId: i * 4 + 3, rank: 3, points: 40, diff: 0, matchCount: 3 },
			{ playerId: i * 4 + 4, rank: 4, points: 30, diff: 0, matchCount: 3 }
		])
	);
}

function expectTierSplit(
	input: readonly CourtResult[],
	output: readonly CourtAssignment[],
	sourceCourtNums: readonly number[],
	winnerOutputIndices: readonly number[],
	loserOutputIndices: readonly number[]
): void {
	const winners = topFinishers(input, sourceCourtNums);
	const losers = bottomFinishers(input, sourceCourtNums);
	const winnerPlayers = winnerOutputIndices.flatMap((i) => output[i].playerIds);
	const loserPlayers = loserOutputIndices.flatMap((i) => output[i].playerIds);
	expectSamePlayerSet(winnerPlayers, winners);
	expectSamePlayerSet(loserPlayers, losers);
}

function expectPairFinishSplit(
	input: readonly CourtResult[],
	output: readonly CourtAssignment[],
	pairIndex: number,
	courtA: number,
	courtB: number
): void {
	const topIdx = pairIndex * 2;
	const botIdx = pairIndex * 2 + 1;
	expectSamePlayerSet(output[topIdx].playerIds, topFinishers(input, [courtA, courtB]));
	expectSamePlayerSet(output[botIdx].playerIds, bottomFinishers(input, [courtA, courtB]));
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

	it('3 courts: 2W+1L, all 1st/2nd in winners, best 3rds promoted', () => {
		const results = [1, 2, 3].map((c) =>
			mockCourtResult(c, [
				{ playerId: 4 * c - 3, rank: 1, points: 68 - c * 5, diff: 0, matchCount: 3 },
				{ playerId: 4 * c - 2, rank: 2, points: 55 - c * 5, diff: 0, matchCount: 3 },
				{ playerId: 4 * c - 1, rank: 3, points: 45 - c * 5, diff: 0, matchCount: 3 },
				{ playerId: 4 * c, rank: 4, points: 35 - c * 5, diff: 0, matchCount: 3 }
			])
		);
		const a = redistributePreseedRecursive(results);

		expect(a).toHaveLength(3);
		for (const c of a) expect(c.playerIds).toHaveLength(4);

		const winnerPlayers = [...a[0].playerIds, ...a[1].playerIds];
		const loserPlayers = a[2].playerIds;

		// All 1sts (1,5,9) and 2nds (2,6,10) in winners
		for (const p of [1, 5, 9, 2, 6, 10]) expect(winnerPlayers).toContain(p);
		// Best 3rds (3,7) promoted to winners, worst 3rd (11) to losers
		expect(winnerPlayers).toContain(3);
		expect(winnerPlayers).toContain(7);
		expect(loserPlayers).toContain(11);
		// All 4ths go to losers
		for (const p of [4, 8, 12]) expect(loserPlayers).toContain(p);

		// No 1st+2nd from same original court on the same new court
		for (const court of a) {
			const ids = court.playerIds;
			// If court has a 1st from origin C, it must not have the 2nd from same origin C
			const c1First = ids.includes(1);
			const c1Second = ids.includes(2);
			expect(c1First && c1Second).toBe(false);
			const c2First = ids.includes(5);
			const c2Second = ids.includes(6);
			expect(c2First && c2Second).toBe(false);
			const c3First = ids.includes(9);
			const c3Second = ids.includes(10);
			expect(c3First && c3Second).toBe(false);
		}

		// Each winner court has a mix (not all 1sts on one court)
		const c1Firsts = a[0].playerIds.filter((id) => [1, 5, 9].includes(id)).length;
		const c2Firsts = a[1].playerIds.filter((id) => [1, 5, 9].includes(id)).length;
		expect(c1Firsts).toBeGreaterThanOrEqual(1);
		expect(c2Firsts).toBeGreaterThanOrEqual(1);
	});

	it('4 courts: 2W+2L', () => {
		const results = [1, 2, 3, 4].map((c) =>
			mockCourtResult(c, [
				{ playerId: 4 * c - 3, rank: 1, points: 70 - c * 3, diff: 0, matchCount: 3 },
				{ playerId: 4 * c - 2, rank: 2, points: 55 - c * 3, diff: 0, matchCount: 3 },
				{ playerId: 4 * c - 1, rank: 3, points: 40 - c * 3, diff: 0, matchCount: 3 },
				{ playerId: 4 * c, rank: 4, points: 25 - c * 3, diff: 0, matchCount: 3 }
			])
		);
		const a = redistributePreseedRecursive(results);

		expect(a).toHaveLength(4);
		for (const c of a) expect(c.playerIds).toHaveLength(4);

		const winnerPlayers = [...a[0].playerIds, ...a[1].playerIds];
		const loserPlayers = [...a[2].playerIds, ...a[3].playerIds];

		for (const p of [1, 5, 9, 13, 2, 6, 10, 14]) expect(winnerPlayers).toContain(p);
		for (const p of [3, 7, 11, 15, 4, 8, 12, 16]) expect(loserPlayers).toContain(p);

		// No 1st+2nd from the same original court on the same new court
		for (const court of a) {
			const ids = court.playerIds;
			for (let c = 0; c < 4; c++) {
				const first = ids.includes(4 * c + 1);
				const second = ids.includes(4 * c + 2);
				expect(first && second).toBe(false);
			}
		}
	});

	it('8 courts: 4W+4L, preserves all 32 players, no same-origin 1st+2nd', () => {
		const results = Array.from({ length: 8 }, (_, i) =>
			mockCourtResult(
				i + 1,
				Array.from({ length: 4 }, (_, j) => ({
					playerId: i * 4 + j + 1,
					rank: j + 1,
					points: 60 - i * 5 - j * 10,
					diff: 0,
					matchCount: 3
				}))
			)
		);
		const a = redistributePreseedRecursive(results);
		const allIds = a.flatMap((c) => c.playerIds);
		expect(allIds).toHaveLength(32);
		expect([...new Set(allIds)]).toHaveLength(32);

		expect(a).toHaveLength(8);
		for (const c of a) expect(c.playerIds).toHaveLength(4);

		const winnerPlayers = a.slice(0, 4).flatMap((c) => c.playerIds);
		for (let i = 0; i < 8; i++) expect(winnerPlayers).toContain(i * 4 + 1);
		for (let i = 0; i < 8; i++) expect(winnerPlayers).toContain(i * 4 + 2);

		// No 1st+2nd from same original court on the same new winner court
		for (const court of a.slice(0, 4)) {
			const ids = court.playerIds;
			for (let c = 0; c < 8; c++) {
				const first = ids.includes(c * 4 + 1);
				const second = ids.includes(c * 4 + 2);
				expect(first && second).toBe(false);
			}
		}
	});
});

// ============================================================================
// processPreseedTransition
// ============================================================================

describe('processPreseedTransition', () => {
	it('first split (isFirstSplit=true): same as redistributePreseedRecursive for 4 courts', () => {
		const results = [1, 2, 3, 4].map((c) =>
			mockCourtResult(c, [
				{ playerId: 4 * c - 3, rank: 1, points: 70 - c * 3, diff: 0, matchCount: 3 },
				{ playerId: 4 * c - 2, rank: 2, points: 55 - c * 3, diff: 0, matchCount: 3 },
				{ playerId: 4 * c - 1, rank: 3, points: 40 - c * 3, diff: 0, matchCount: 3 },
				{ playerId: 4 * c, rank: 4, points: 25 - c * 3, diff: 0, matchCount: 3 }
			])
		);
		const sizes = [4, 4, 4, 4];
		const a = processPreseedTransition(results, sizes, 0);

		expect(a).toHaveLength(4);
		for (const c of a) expect(c.playerIds).toHaveLength(4);

		const winnerPlayers = [...a[0].playerIds, ...a[1].playerIds];
		const loserPlayers = [...a[2].playerIds, ...a[3].playerIds];

		for (const p of [1, 5, 9, 13, 2, 6, 10, 14]) expect(winnerPlayers).toContain(p);
		for (const p of [3, 7, 11, 15, 4, 8, 12, 16]) expect(loserPlayers).toContain(p);

		// No 1st+2nd from the same original court on the same new court
		for (const court of a) {
			const ids = court.playerIds;
			for (let c = 0; c < 4; c++) {
				const first = ids.includes(4 * c + 1);
				const second = ids.includes(4 * c + 2);
				expect(first && second).toBe(false);
			}
		}
	});

	it('subsequent split for 4 courts: pairs split by finish position within bracket', () => {
		const results = [
			mockCourtResult(1, [
				{ playerId: 1, rank: 1, points: 50, diff: 5, matchCount: 3 },
				{ playerId: 6, rank: 2, points: 40, diff: 3, matchCount: 3 },
				{ playerId: 11, rank: 3, points: 30, diff: 1, matchCount: 3 },
				{ playerId: 16, rank: 4, points: 20, diff: -2, matchCount: 3 }
			]),
			mockCourtResult(2, [
				{ playerId: 2, rank: 1, points: 48, diff: 4, matchCount: 3 },
				{ playerId: 5, rank: 2, points: 42, diff: 2, matchCount: 3 },
				{ playerId: 12, rank: 3, points: 28, diff: 0, matchCount: 3 },
				{ playerId: 15, rank: 4, points: 22, diff: -1, matchCount: 3 }
			]),
			mockCourtResult(3, [
				{ playerId: 3, rank: 1, points: 35, diff: 2, matchCount: 3 },
				{ playerId: 8, rank: 2, points: 30, diff: 1, matchCount: 3 },
				{ playerId: 10, rank: 3, points: 25, diff: 0, matchCount: 3 },
				{ playerId: 14, rank: 4, points: 15, diff: -2, matchCount: 3 }
			]),
			mockCourtResult(4, [
				{ playerId: 4, rank: 1, points: 32, diff: 1, matchCount: 3 },
				{ playerId: 7, rank: 2, points: 28, diff: 0, matchCount: 3 },
				{ playerId: 9, rank: 3, points: 22, diff: -1, matchCount: 3 },
				{ playerId: 13, rank: 4, points: 18, diff: -3, matchCount: 3 }
			])
		];
		const sizes = [4, 4, 4, 4];
		const a = processPreseedTransition(results, sizes, 1);

		expect(a).toHaveLength(4);
		for (const c of a) expect(c.playerIds).toHaveLength(4);

		expect(a[0].playerIds).toEqual([1, 2, 5, 6]);
		expect(a[1].playerIds).toEqual([11, 12, 15, 16]);
		expect(a[2].playerIds).toEqual([3, 4, 8, 7]);
		expect(a[3].playerIds).toEqual([10, 9, 13, 14]);
	});

	it('4p walkthrough: R2→R3 peer splits match A–P letter example', () => {
		// A=1 B=2 C=3 D=4 E=5 F=6 G=7 H=8 I=9 J=10 K=11 L=12 M=13 N=14 O=15 P=16
		const r2Results = [
			mockCourtResult(1, [
				{ playerId: 1, rank: 1, points: 60, diff: 0, matchCount: 3 },
				{ playerId: 6, rank: 2, points: 50, diff: 0, matchCount: 3 },
				{ playerId: 9, rank: 3, points: 40, diff: 0, matchCount: 3 },
				{ playerId: 13, rank: 4, points: 30, diff: 0, matchCount: 3 }
			]),
			mockCourtResult(2, [
				{ playerId: 14, rank: 1, points: 60, diff: 0, matchCount: 3 },
				{ playerId: 5, rank: 2, points: 50, diff: 0, matchCount: 3 },
				{ playerId: 10, rank: 3, points: 40, diff: 0, matchCount: 3 },
				{ playerId: 2, rank: 4, points: 30, diff: 0, matchCount: 3 }
			]),
			mockCourtResult(3, [
				{ playerId: 15, rank: 1, points: 60, diff: 0, matchCount: 3 },
				{ playerId: 8, rank: 2, points: 50, diff: 0, matchCount: 3 },
				{ playerId: 11, rank: 3, points: 40, diff: 0, matchCount: 3 },
				{ playerId: 3, rank: 4, points: 30, diff: 0, matchCount: 3 }
			]),
			mockCourtResult(4, [
				{ playerId: 16, rank: 1, points: 60, diff: 0, matchCount: 3 },
				{ playerId: 7, rank: 2, points: 50, diff: 0, matchCount: 3 },
				{ playerId: 12, rank: 3, points: 40, diff: 0, matchCount: 3 },
				{ playerId: 4, rank: 4, points: 30, diff: 0, matchCount: 3 }
			])
		];

		const r3 = processPreseedTransition(r2Results, [4, 4, 4, 4], 1);

		expectSamePlayerSet(r3[0].playerIds, [1, 6, 14, 5]);
		expectSamePlayerSet(r3[1].playerIds, [9, 13, 10, 2]);
		expectSamePlayerSet(r3[2].playerIds, [15, 8, 16, 7]);
		expectSamePlayerSet(r3[3].playerIds, [11, 3, 12, 4]);
	});

	it('16p walkthrough: R1→R2 brackets and R2→R3 finals convergence', () => {
		const Alex = 1;
		const Ben = 2;
		const Chris = 3;
		const Dan = 4;
		const Eli = 5;
		const Finn = 6;
		const Greg = 7;
		const Hugo = 8;
		const Ian = 9;
		const Jack = 10;
		const Karl = 11;
		const Leo = 12;
		const Max = 13;
		const Noah = 14;
		const Owen = 15;
		const Paul = 16;

		const r1 = [
			mockCourtResult(1, [
				{ playerId: Alex, rank: 1, points: 63, diff: 0, matchCount: 3 },
				{ playerId: Ian, rank: 2, points: 50, diff: 0, matchCount: 3 },
				{ playerId: Hugo, rank: 3, points: 40, diff: 0, matchCount: 3 },
				{ playerId: Paul, rank: 4, points: 30, diff: 0, matchCount: 3 }
			]),
			mockCourtResult(2, [
				{ playerId: Ben, rank: 1, points: 63, diff: 0, matchCount: 3 },
				{ playerId: Greg, rank: 2, points: 50, diff: 0, matchCount: 3 },
				{ playerId: Jack, rank: 3, points: 40, diff: 0, matchCount: 3 },
				{ playerId: Owen, rank: 4, points: 30, diff: 0, matchCount: 3 }
			]),
			mockCourtResult(3, [
				{ playerId: Finn, rank: 1, points: 63, diff: 0, matchCount: 3 },
				{ playerId: Chris, rank: 2, points: 50, diff: 0, matchCount: 3 },
				{ playerId: Karl, rank: 3, points: 40, diff: 0, matchCount: 3 },
				{ playerId: Noah, rank: 4, points: 30, diff: 0, matchCount: 3 }
			]),
			mockCourtResult(4, [
				{ playerId: Dan, rank: 1, points: 63, diff: 0, matchCount: 3 },
				{ playerId: Eli, rank: 2, points: 50, diff: 0, matchCount: 3 },
				{ playerId: Max, rank: 3, points: 40, diff: 0, matchCount: 3 },
				{ playerId: Leo, rank: 4, points: 30, diff: 0, matchCount: 3 }
			])
		];

		const r2 = processPreseedTransition(r1, [4, 4, 4, 4], 0);
		const winners = [...r2[0].playerIds, ...r2[1].playerIds];
		const losers = [...r2[2].playerIds, ...r2[3].playerIds];

		for (const p of [Alex, Ben, Finn, Dan, Ian, Greg, Chris, Eli]) {
			expect(winners).toContain(p);
			expect(losers).not.toContain(p);
		}
		for (const p of [Hugo, Jack, Karl, Max, Paul, Owen, Noah, Leo]) {
			expect(losers).toContain(p);
			expect(winners).not.toContain(p);
		}

		const r2Results = [
			mockCourtResult(1, [
				{ playerId: Alex, rank: 1, points: 63, diff: 0, matchCount: 3 },
				{ playerId: Finn, rank: 2, points: 50, diff: 0, matchCount: 3 },
				{ playerId: Eli, rank: 3, points: 40, diff: 0, matchCount: 3 },
				{ playerId: Greg, rank: 4, points: 30, diff: 0, matchCount: 3 }
			]),
			mockCourtResult(2, [
				{ playerId: Dan, rank: 1, points: 63, diff: 0, matchCount: 3 },
				{ playerId: Ben, rank: 2, points: 50, diff: 0, matchCount: 3 },
				{ playerId: Ian, rank: 3, points: 40, diff: 0, matchCount: 3 },
				{ playerId: Chris, rank: 4, points: 30, diff: 0, matchCount: 3 }
			]),
			mockCourtResult(3, [
				{ playerId: Karl, rank: 1, points: 63, diff: 0, matchCount: 3 },
				{ playerId: Hugo, rank: 2, points: 50, diff: 0, matchCount: 3 },
				{ playerId: Leo, rank: 3, points: 40, diff: 0, matchCount: 3 },
				{ playerId: Owen, rank: 4, points: 30, diff: 0, matchCount: 3 }
			]),
			mockCourtResult(4, [
				{ playerId: Max, rank: 1, points: 63, diff: 0, matchCount: 3 },
				{ playerId: Noah, rank: 2, points: 50, diff: 0, matchCount: 3 },
				{ playerId: Jack, rank: 3, points: 40, diff: 0, matchCount: 3 },
				{ playerId: Paul, rank: 4, points: 30, diff: 0, matchCount: 3 }
			])
		];

		const r3 = processPreseedTransition(r2Results, [4, 4, 4, 4], 1);

		const sameSet = (a: readonly number[], b: readonly number[]) =>
			expect([...a].sort((x, y) => x - y)).toEqual([...b].sort((x, y) => x - y));

		// Gold Final: top 2 from Winners A + top 2 from Winners B
		sameSet(r3[0].playerIds, [Alex, Finn, Dan, Ben]);
		// Silver Final: bottom 2 from Winners A + bottom 2 from Winners B
		sameSet(r3[1].playerIds, [Eli, Ian, Chris, Greg]);
		// Bronze Final: top 2 from Losers A + top 2 from Losers B
		sameSet(r3[2].playerIds, [Karl, Hugo, Max, Noah]);
		// Iron Final: bottom 2 from Losers A + bottom 2 from Losers B
		sameSet(r3[3].playerIds, [Leo, Jack, Owen, Paul]);
	});

	it('subsequent split for 2 courts: halves to 1F+1L(W)', () => {
		// Simulate a 2-court bracket (e.g. winner bracket from R2)
		const results = [
			mockCourtResult(1, [
				{ playerId: 1, rank: 1, points: 50, diff: 5, matchCount: 3 },
				{ playerId: 6, rank: 2, points: 40, diff: 3, matchCount: 3 },
				{ playerId: 11, rank: 3, points: 30, diff: 1, matchCount: 3 },
				{ playerId: 12, rank: 4, points: 20, diff: -2, matchCount: 3 }
			]),
			mockCourtResult(2, [
				{ playerId: 2, rank: 1, points: 48, diff: 4, matchCount: 3 },
				{ playerId: 5, rank: 2, points: 42, diff: 2, matchCount: 3 },
				{ playerId: 10, rank: 3, points: 28, diff: 0, matchCount: 3 },
				{ playerId: 9, rank: 4, points: 22, diff: -1, matchCount: 3 }
			])
		];
		const sizes = [4, 4];
		const a = processPreseedTransition(results, sizes, 1);

		expect(a).toHaveLength(2);
		for (const c of a) expect(c.playerIds).toHaveLength(4);

		// Re-ranked across both courts
		// Tiers: 1sts=[1(50),2(48)], 2nds=[5(42),6(40)], 3rds=[11(30),10(28)], 4ths=[9(22),12(20)]
		// Flattened: [1,2,5,6,11,10,9,12]
		// splitSize(2)=1 → Final(top 4)=[1,2,5,6], L(W)=[11,10,9,12]
		expect(a[0].playerIds).toEqual([1, 2, 5, 6]);
		expect(a[1].playerIds).toEqual([11, 10, 9, 12]);
	});

	it('single court returns players as-is', () => {
		const a = processPreseedTransition(
			[mockCourtResult(1, [{ playerId: 1, rank: 1, points: 63, diff: 5, matchCount: 3 }])],
			[1],
			0
		);
		expect(a).toEqual([{ courtNumber: 1, playerIds: [1] }]);
	});

	it('empty input returns empty', () => {
		expect(processPreseedTransition([], [], 0)).toEqual([]);
	});
});

// ============================================================================
// Preseed redistribution: explicit pair-subdivision behaviour
// ============================================================================

describe('preseed redistribution: pair subdivision', () => {
	const eightCourtSizes = Array.from({ length: 8 }, () => 4);

	it('R1→R2 (8 courts): all 1sts+2nds to courts 1-4, all 3rds+4ths to courts 5-8', () => {
		const r1 = mockRankedCourts(8);
		const r2 = processPreseedTransition(r1, eightCourtSizes, 0);

		expect(r2).toHaveLength(8);
		const winners = r2.slice(0, 4).flatMap((c) => c.playerIds);
		const losers = r2.slice(4).flatMap((c) => c.playerIds);

		for (let c = 1; c <= 8; c++) {
			expect(winners).toContain(c * 4 - 3);
			expect(winners).toContain(c * 4 - 2);
			expect(losers).toContain(c * 4 - 1);
			expect(losers).toContain(c * 4);
		}
	});

	it('R1→R2 (4 courts): 3rd on court 1 goes to loser bracket (courts 3-4), not court 2', () => {
		const r1 = mockRankedCourts(4);
		const r2 = processPreseedTransition(r1, [4, 4, 4, 4], 0);

		const winners = r2.slice(0, 2).flatMap((c) => c.playerIds);
		const losers = r2.slice(2).flatMap((c) => c.playerIds);

		// Player 3 finished 3rd on C1 in R1 → loser bracket
		expect(losers).toContain(3);
		expect(winners).not.toContain(3);
		// Player 1 finished 1st on C1 → winner bracket
		expect(winners).toContain(1);
		expect(losers).not.toContain(1);
	});

	it('R1→R2 (8 courts): 3rd on court 1 goes to loser bracket (courts 5-8), not courts 1-4', () => {
		const r1 = mockRankedCourts(8);
		const r2 = processPreseedTransition(r1, eightCourtSizes, 0);

		const winners = r2.slice(0, 4).flatMap((c) => c.playerIds);
		const losers = r2.slice(4).flatMap((c) => c.playerIds);

		// Player 3 finished 3rd on C1 in R1 → loser bracket (courts 5-8)
		expect(losers).toContain(3);
		expect(winners).not.toContain(3);
	});

	it('R2→R3 (8 courts): each half splits by global finish tiers', () => {
		const r2 = mockRankedCourts(8);
		const r3 = processPreseedTransition(r2, eightCourtSizes, 1);

		expect(r3).toHaveLength(8);
		expectTierSplit(r2, r3, [1, 2, 3, 4], [0, 1], [2, 3]);
		expectTierSplit(r2, r3, [5, 6, 7, 8], [4, 5], [6, 7]);
	});

	it('R3→R4 (8 courts): each pair splits by global finish tiers', () => {
		const r3 = mockRankedCourts(8);
		const r4 = processPreseedTransition(r3, eightCourtSizes, 2);

		expect(r4).toHaveLength(8);
		expect(new Set(r4.flatMap((c) => c.playerIds)).size).toBe(32);
		expectPairFinishSplit(r3, r4, 0, 1, 2);
		expectPairFinishSplit(r3, r4, 1, 3, 4);
		expectPairFinishSplit(r3, r4, 2, 5, 6);
		expectPairFinishSplit(r3, r4, 3, 7, 8);
	});

	it('R3 top-4 (64p gold quarter): first-split matches 4-court preseed R1→R2', () => {
		const r3Top4 = [
			mockCourtResult(1, [
				{ playerId: 1, rank: 1, points: 60, diff: 0, matchCount: 3 },
				{ playerId: 3, rank: 2, points: 50, diff: 0, matchCount: 3 },
				{ playerId: 10, rank: 3, points: 40, diff: 0, matchCount: 3 },
				{ playerId: 12, rank: 4, points: 30, diff: 0, matchCount: 3 }
			]),
			mockCourtResult(2, [
				{ playerId: 2, rank: 1, points: 60, diff: 0, matchCount: 3 },
				{ playerId: 4, rank: 2, points: 50, diff: 0, matchCount: 3 },
				{ playerId: 9, rank: 3, points: 40, diff: 0, matchCount: 3 },
				{ playerId: 11, rank: 4, points: 30, diff: 0, matchCount: 3 }
			]),
			mockCourtResult(3, [
				{ playerId: 17, rank: 1, points: 60, diff: 0, matchCount: 3 },
				{ playerId: 19, rank: 2, points: 50, diff: 0, matchCount: 3 },
				{ playerId: 26, rank: 3, points: 40, diff: 0, matchCount: 3 },
				{ playerId: 28, rank: 4, points: 30, diff: 0, matchCount: 3 }
			]),
			mockCourtResult(4, [
				{ playerId: 18, rank: 1, points: 60, diff: 0, matchCount: 3 },
				{ playerId: 20, rank: 2, points: 50, diff: 0, matchCount: 3 },
				{ playerId: 25, rank: 3, points: 40, diff: 0, matchCount: 3 },
				{ playerId: 27, rank: 4, points: 30, diff: 0, matchCount: 3 }
			])
		];

		const r4 = redistributePreseedRecursive(r3Top4);

		expect(r4).toHaveLength(4);
		expectSamePlayerSet(r4[0].playerIds, [1, 4, 17, 20]);
		expectSamePlayerSet(r4[1].playerIds, [2, 3, 18, 19]);
		expectSamePlayerSet(r4[2].playerIds, [9, 12, 25, 28]);
		expectSamePlayerSet(r4[3].playerIds, [10, 11, 26, 27]);
	});

	it('R2→R3 (8 courts): 3rd on winner court 1 drops to loser half of its bracket, not other half', () => {
		// Player 102 finished 3rd on C1 during Round 2 — in the winner bracket half [C1–C4].
		const r2 = [
			mockCourtResult(1, [
				{ playerId: 100, rank: 1, points: 60, diff: 0, matchCount: 3 },
				{ playerId: 101, rank: 2, points: 50, diff: 0, matchCount: 3 },
				{ playerId: 102, rank: 3, points: 40, diff: 0, matchCount: 3 },
				{ playerId: 103, rank: 4, points: 30, diff: 0, matchCount: 3 }
			]),
			mockCourtResult(2, [
				{ playerId: 104, rank: 1, points: 60, diff: 0, matchCount: 3 },
				{ playerId: 105, rank: 2, points: 50, diff: 0, matchCount: 3 },
				{ playerId: 106, rank: 3, points: 40, diff: 0, matchCount: 3 },
				{ playerId: 107, rank: 4, points: 30, diff: 0, matchCount: 3 }
			]),
			...mockRankedCourts(6).map((c) => ({
				...c,
				courtNumber: c.courtNumber + 2
			}))
		];
		const r3 = processPreseedTransition(r2, eightCourtSizes, 1);

		const winnerHalf = r3.slice(0, 2).flatMap((c) => c.playerIds);
		const loserHalf = r3.slice(2, 4).flatMap((c) => c.playerIds);

		expect(winnerHalf).toContain(100);
		expect(winnerHalf).toContain(104);
		expect(winnerHalf).not.toContain(102);
		expect(loserHalf).toContain(102);
		expect(loserHalf).toContain(103);
		expect(loserHalf).toContain(106);
		expect(loserHalf).toContain(107);
		expect(r3.slice(4).flatMap((c) => c.playerIds)).not.toContain(102);
	});

	it('32p chain: R1→R2→R3→R4 preserves all players and pair bracket structure', () => {
		const sizes = eightCourtSizes;
		let results = mockRankedCourts(8);

		const r2 = processPreseedTransition(results, sizes, 0);
		expect(new Set(r2.flatMap((c) => c.playerIds)).size).toBe(32);

		results = r2.map((a) => ({
			courtNumber: a.courtNumber,
			standings: a.playerIds.map((playerId, i) => ({
				playerId,
				rank: i + 1,
				points: 60 - i * 10,
				diff: 0,
				matchCount: 3
			}))
		}));

		const r3 = processPreseedTransition(results, sizes, 1);
		expect(new Set(r3.flatMap((c) => c.playerIds)).size).toBe(32);
		expectTierSplit(results, r3, [1, 2, 3, 4], [0, 1], [2, 3]);
		expectTierSplit(results, r3, [5, 6, 7, 8], [4, 5], [6, 7]);

		results = r3.map((a) => ({
			courtNumber: a.courtNumber,
			standings: a.playerIds.map((playerId, i) => ({
				playerId,
				rank: i + 1,
				points: 60 - i * 10,
				diff: 0,
				matchCount: 3
			}))
		}));

		const r4 = processPreseedTransition(results, sizes, 2);
		expect(new Set(r4.flatMap((c) => c.playerIds)).size).toBe(32);
		expect(r4).toHaveLength(8);
		for (const c of r4) expect(c.playerIds).toHaveLength(4);

		const r3Results = results;
		expectPairFinishSplit(r3Results, r4, 0, 1, 2);
		expectPairFinishSplit(r3Results, r4, 1, 3, 4);
		expectPairFinishSplit(r3Results, r4, 2, 5, 6);
		expectPairFinishSplit(r3Results, r4, 3, 7, 8);
	});

	it('64p (spec 088): all 64 players play round 5; gold-race elimination preserved', () => {
		const sizes = Array.from({ length: 16 }, () => 4);
		const courts = 16;

		function snake(items: number[]) {
			const courtsArr = Array.from({ length: 16 }, (_, i) => ({
				courtNumber: i + 1,
				playerIds: [] as number[]
			}));
			for (let pos = 0; pos < 4; pos++) {
				const fwd = pos % 2 === 0;
				for (let c = 0; c < 16; c++) {
					const idx = fwd ? c : 15 - c;
					const ii = pos * 16 + c;
					if (ii < items.length) courtsArr[idx].playerIds.push(items[ii]);
				}
			}
			return courtsArr;
		}

		function toResults(assignments: { courtNumber: number; playerIds: number[] }[]) {
			return assignments.map((a) => ({
				courtNumber: a.courtNumber,
				standings: a.playerIds.map((pid, i) => ({
					playerId: pid,
					rank: i + 1,
					points: 60 - i * 10,
					diff: 0,
					matchCount: 3
				}))
			}));
		}

		let assignments = snake(Array.from({ length: 64 }, (_, i) => i + 1));
		let results = toResults(assignments);

		for (const rc of [0, 1, 2, 3]) {
			const next = processPreseedTransition(results, sizes, rc, courts);
			assignments = next.map((a) => ({ courtNumber: a.courtNumber, playerIds: [...a.playerIds] }));
			results = toResults(assignments);
		}

		expect(assignments).toHaveLength(16);
		expect(assignments.flatMap((a) => a.playerIds)).toHaveLength(64);

		const courtOf = (pid: number) => assignments.find((a) => a.playerIds.includes(pid))!.courtNumber;

		// P01: gold path → top court in R5
		expect(courtOf(1)).toBe(1);
		// P09: 3rd on court 2 in R2 (snake path) → not on WW courts 1 or 3 after R3→R4
		let trace = snake(Array.from({ length: 64 }, (_, i) => i + 1));
		let traceResults = toResults(trace);
		for (const rc of [0, 1, 2]) {
			const next = processPreseedTransition(traceResults, sizes, rc, courts);
			trace = next.map((a) => ({ courtNumber: a.courtNumber, playerIds: [...a.playerIds] }));
			traceResults = toResults(trace);
		}
		const r4TopHalf = trace.slice(0, 2).flatMap((a) => a.playerIds);
		const r4BottomHalf = trace.slice(2, 4).flatMap((a) => a.playerIds);
		expect(r4TopHalf).not.toContain(9);
		expect(r4BottomHalf).toContain(9);
		// P64: lowest seed stays in loser subtree (courts 9+)
		expect(courtOf(64)).toBeGreaterThan(8);
		// P33: tops loser bracket, still plays R5
		expect(courtOf(33)).toBeGreaterThanOrEqual(9);
		expect(courtOf(33)).toBeLessThanOrEqual(16);
	});
});

// ============================================================================
// Vertical Seeding
// ============================================================================

describe('verticalSeeding', () => {
	it('fills courts sequentially by rank tier sorted by points', () => {
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

		expect(a.length).toBe(4);

		expect(a[0].playerIds).toEqual([1, 5, 9, 13]);
		expect(a[1].playerIds).toEqual([2, 6, 10, 14]);
		expect(a[2].playerIds).toEqual([3, 7, 11, 15]);
		expect(a[3].playerIds).toEqual([4, 8, 12, 16]);
	});

	it('sorts tiers by points desc with tiebreaker diff then playerId', () => {
		const results = [
			mockCourtResult(1, [
				{ playerId: 10, rank: 1, points: 60, diff: 0, matchCount: 3 },
				{ playerId: 20, rank: 2, points: 30, diff: 0, matchCount: 3 },
				{ playerId: 30, rank: 3, points: 10, diff: 0, matchCount: 3 },
				{ playerId: 40, rank: 4, points: 0, diff: 0, matchCount: 3 }
			]),
			mockCourtResult(2, [
				{ playerId: 50, rank: 1, points: 60, diff: 2, matchCount: 3 },
				{ playerId: 60, rank: 2, points: 35, diff: 0, matchCount: 3 },
				{ playerId: 70, rank: 3, points: 15, diff: 0, matchCount: 3 },
				{ playerId: 80, rank: 4, points: 5, diff: 0, matchCount: 3 }
			]),
			mockCourtResult(3, [
				{ playerId: 90, rank: 1, points: 55, diff: 0, matchCount: 3 },
				{ playerId: 100, rank: 2, points: 25, diff: 0, matchCount: 3 },
				{ playerId: 110, rank: 3, points: 5, diff: 0, matchCount: 3 },
				{ playerId: 120, rank: 4, points: -5, diff: 0, matchCount: 3 }
			]),
			mockCourtResult(4, [
				{ playerId: 130, rank: 1, points: 60, diff: 0, matchCount: 3 },
				{ playerId: 140, rank: 2, points: 20, diff: 0, matchCount: 3 },
				{ playerId: 150, rank: 3, points: 0, diff: 0, matchCount: 3 },
				{ playerId: 160, rank: 4, points: -10, diff: 0, matchCount: 3 }
			])
		];

		const a = verticalSeeding(results, 4);

		expect(a.length).toBe(4);

		expect(a[0].playerIds).toEqual([50, 10, 130, 90]);
		expect(a[1].playerIds).toEqual([60, 20, 100, 140]);
		expect(a[2].playerIds).toEqual([70, 30, 110, 150]);
		expect(a[3].playerIds).toEqual([80, 40, 120, 160]);
	});

	it('handles 3 courts with mixed tiers across courts', () => {
		const results = [
			mockCourtResult(1, [
				{ playerId: 1, rank: 1, points: 30, diff: 0, matchCount: 3 },
				{ playerId: 2, rank: 2, points: 20, diff: 0, matchCount: 3 },
				{ playerId: 3, rank: 3, points: 10, diff: 0, matchCount: 3 },
				{ playerId: 4, rank: 4, points: 0, diff: 0, matchCount: 3 }
			]),
			mockCourtResult(2, [
				{ playerId: 5, rank: 1, points: 28, diff: 0, matchCount: 3 },
				{ playerId: 6, rank: 2, points: 18, diff: 0, matchCount: 3 },
				{ playerId: 7, rank: 3, points: 8, diff: 0, matchCount: 3 },
				{ playerId: 8, rank: 4, points: -2, diff: 0, matchCount: 3 }
			]),
			mockCourtResult(3, [
				{ playerId: 9, rank: 1, points: 26, diff: 0, matchCount: 3 },
				{ playerId: 10, rank: 2, points: 16, diff: 0, matchCount: 3 },
				{ playerId: 11, rank: 3, points: 6, diff: 0, matchCount: 3 },
				{ playerId: 12, rank: 4, points: -4, diff: 0, matchCount: 3 }
			])
		];

		const a = verticalSeeding(results, 3);

		expect(a.length).toBe(3);

		expect(a[0].playerIds).toEqual([1, 5, 9, 2]);
		expect(a[1].playerIds).toEqual([6, 10, 3, 7]);
		expect(a[2].playerIds).toEqual([11, 4, 8, 12]);
	});

	it('redistributes 8 courts preserving all players', () => {
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

	it('handles 5 courts, 20 players (mixed tier sizes)', () => {
		const results = Array.from({ length: 5 }, (_, i) =>
			mockCourtResult(
				i + 1,
				Array.from({ length: 4 }, (_, j) => ({
					playerId: i * 4 + j + 1,
					rank: j + 1,
					points: 40 - j * 10 - i * 2,
					diff: 0,
					matchCount: 3
				}))
			)
		);

		const a = verticalSeeding(results, 5);
		expect(a.length).toBe(5);
		expect(a.flatMap((x) => x.playerIds).length).toBe(20);
		expect(new Set(a.flatMap((x) => x.playerIds)).size).toBe(20);

		expect(a[0].playerIds).toEqual([1, 5, 9, 13]);
		expect(a[1].playerIds).toEqual([17, 2, 6, 10]);
		expect(a[2].playerIds).toEqual([14, 18, 3, 7]);
		expect(a[3].playerIds).toEqual([11, 15, 19, 4]);
		expect(a[4].playerIds).toEqual([8, 12, 16, 20]);
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
// Vertical Seeding: Non-Standard Courts & Extended Coverage
// ============================================================================

describe('verticalSeeding: non-standard courts', () => {
	it('9 players (4+5): fills 4p court then 5p court', () => {
		const results = [
			mockCourtResult(1, [
				{ playerId: 1, rank: 1, points: 60, diff: 10, matchCount: 3 },
				{ playerId: 2, rank: 2, points: 40, diff: 5, matchCount: 3 },
				{ playerId: 3, rank: 3, points: 20, diff: 0, matchCount: 3 },
				{ playerId: 4, rank: 4, points: 10, diff: -5, matchCount: 3 }
			]),
			mockCourtResult(2, [
				{ playerId: 5, rank: 1, points: 50, diff: 8, matchCount: 3 },
				{ playerId: 6, rank: 2, points: 30, diff: 2, matchCount: 3 },
				{ playerId: 7, rank: 3, points: 15, diff: -3, matchCount: 3 },
				{ playerId: 8, rank: 4, points: 5, diff: -7, matchCount: 3 },
				{ playerId: 9, rank: 5, points: 0, diff: -10, matchCount: 3 }
			])
		];

		const a = verticalSeeding(results, 2, [4, 5]);

		expect(a[0].playerIds).toEqual([1, 5, 2, 6]);
		expect(a[1].playerIds).toEqual([3, 7, 4, 8, 9]);
	});

	it('11 players (4+4+3): fills standard courts first, bottom court gets remainder', () => {
		const results = [
			mockCourtResult(1, [
				{ playerId: 1, rank: 1, points: 60, diff: 10, matchCount: 3 },
				{ playerId: 2, rank: 2, points: 40, diff: 5, matchCount: 3 },
				{ playerId: 3, rank: 3, points: 20, diff: 0, matchCount: 3 },
				{ playerId: 4, rank: 4, points: 10, diff: -5, matchCount: 3 }
			]),
			mockCourtResult(2, [
				{ playerId: 5, rank: 1, points: 50, diff: 8, matchCount: 3 },
				{ playerId: 6, rank: 2, points: 35, diff: 3, matchCount: 3 },
				{ playerId: 7, rank: 3, points: 15, diff: -2, matchCount: 3 },
				{ playerId: 8, rank: 4, points: 5, diff: -8, matchCount: 3 }
			]),
			mockCourtResult(3, [
				{ playerId: 9, rank: 1, points: 45, diff: 6, matchCount: 3 },
				{ playerId: 10, rank: 2, points: 25, diff: 1, matchCount: 3 },
				{ playerId: 11, rank: 3, points: 10, diff: -5, matchCount: 3 }
			])
		];

		const a = verticalSeeding(results, 3, [4, 4, 3]);

		expect(a.length).toBe(3);
		expect(a.flatMap((x) => x.playerIds).length).toBe(11);
		expect(new Set(a.flatMap((x) => x.playerIds)).size).toBe(11);

		expect(a[0].playerIds).toEqual([1, 5, 9, 2]);
		expect(a[1].playerIds).toEqual([6, 10, 3, 7]);
		expect(a[2].playerIds).toEqual([11, 4, 8]);
	});
});

describe('verticalSeeding: tiebreaking', () => {
	it('sorts by points desc, then diff desc, then playerId asc', () => {
		const results = [
			mockCourtResult(1, [
				{ playerId: 10, rank: 1, points: 50, diff: 5, matchCount: 3 },
				{ playerId: 20, rank: 2, points: 30, diff: 0, matchCount: 3 },
				{ playerId: 30, rank: 3, points: 10, diff: -3, matchCount: 3 },
				{ playerId: 40, rank: 4, points: 0, diff: -5, matchCount: 3 }
			]),
			mockCourtResult(2, [
				{ playerId: 11, rank: 1, points: 50, diff: 2, matchCount: 3 },
				{ playerId: 21, rank: 2, points: 30, diff: 0, matchCount: 3 },
				{ playerId: 31, rank: 3, points: 10, diff: -3, matchCount: 3 },
				{ playerId: 41, rank: 4, points: 0, diff: -5, matchCount: 3 }
			]),
			mockCourtResult(3, [
				{ playerId: 12, rank: 1, points: 50, diff: 2, matchCount: 3 },
				{ playerId: 22, rank: 2, points: 25, diff: -1, matchCount: 3 },
				{ playerId: 32, rank: 3, points: 5, diff: -5, matchCount: 3 },
				{ playerId: 42, rank: 4, points: -10, diff: -8, matchCount: 3 }
			]),
			mockCourtResult(4, [
				{ playerId: 13, rank: 1, points: 45, diff: 1, matchCount: 3 },
				{ playerId: 23, rank: 2, points: 35, diff: 3, matchCount: 3 },
				{ playerId: 33, rank: 3, points: 15, diff: -2, matchCount: 3 },
				{ playerId: 43, rank: 4, points: -5, diff: -6, matchCount: 3 }
			])
		];

		const a = verticalSeeding(results, 4);

		expect(a[0].playerIds).toEqual([10, 11, 12, 13]);

		expect(a[1].playerIds).toEqual([23, 20, 21, 22]);
	});

	it('resolves all-3-way tie with diff then playerId', () => {
		const results = [
			mockCourtResult(1, [{ playerId: 1, rank: 1, points: 40, diff: 0, matchCount: 3 }]),
			mockCourtResult(2, [{ playerId: 2, rank: 1, points: 40, diff: 0, matchCount: 3 }]),
			mockCourtResult(3, [{ playerId: 3, rank: 1, points: 40, diff: 0, matchCount: 3 }])
		];

		const a = verticalSeeding(results, 3, [1, 1, 1]);

		expect(a[0].playerIds).toEqual([1]);
		expect(a[1].playerIds).toEqual([2]);
		expect(a[2].playerIds).toEqual([3]);
	});
});

// ============================================================================
// Ladder Redistribution: Extended Coverage
// ============================================================================

describe('ladderRedistribute: extended coverage', () => {
	it('3 courts: middle court pulls from neighbors', () => {
		const results = [
			mockCourtResult(1, [
				{ playerId: 1, rank: 1, points: 60, diff: 10, matchCount: 3 },
				{ playerId: 2, rank: 2, points: 50, diff: 5, matchCount: 3 },
				{ playerId: 3, rank: 3, points: 20, diff: 0, matchCount: 3 },
				{ playerId: 4, rank: 4, points: 10, diff: -5, matchCount: 3 }
			]),
			mockCourtResult(2, [
				{ playerId: 5, rank: 1, points: 55, diff: 8, matchCount: 3 },
				{ playerId: 6, rank: 2, points: 45, diff: 3, matchCount: 3 },
				{ playerId: 7, rank: 3, points: 25, diff: -2, matchCount: 3 },
				{ playerId: 8, rank: 4, points: 15, diff: -6, matchCount: 3 }
			]),
			mockCourtResult(3, [
				{ playerId: 9, rank: 1, points: 40, diff: 2, matchCount: 3 },
				{ playerId: 10, rank: 2, points: 30, diff: 0, matchCount: 3 },
				{ playerId: 11, rank: 3, points: 10, diff: -5, matchCount: 3 },
				{ playerId: 12, rank: 4, points: 5, diff: -8, matchCount: 3 }
			])
		];

		const a = ladderRedistribute(results, 3);

		expect(a[0].playerIds).toEqual([1, 2, 5, 6]);
		expect(a[1].playerIds).toEqual([3, 4, 9, 10]);
		expect(a[2].playerIds).toEqual([7, 8, 11, 12]);
	});

	it('5 courts: full ladder chain', () => {
		const results = Array.from({ length: 5 }, (_, i) =>
			mockCourtResult(i + 1, [
				{ playerId: i * 4 + 1, rank: 1, points: 80 - i * 10, diff: 0, matchCount: 3 },
				{ playerId: i * 4 + 2, rank: 2, points: 60 - i * 10, diff: 0, matchCount: 3 },
				{ playerId: i * 4 + 3, rank: 3, points: 40 - i * 10, diff: 0, matchCount: 3 },
				{ playerId: i * 4 + 4, rank: 4, points: 20 - i * 10, diff: 0, matchCount: 3 }
			])
		);

		const a = ladderRedistribute(results, 5);

		expect(a.length).toBe(5);
		expect(new Set(a.flatMap((x) => x.playerIds)).size).toBe(20);

		expect(a[0].playerIds).toEqual([1, 2, 5, 6]);
		expect(a[1].playerIds).toEqual([3, 4, 9, 10]);
		expect(a[2].playerIds).toEqual([7, 8, 13, 14]);
		expect(a[3].playerIds).toEqual([11, 12, 17, 18]);
		expect(a[4].playerIds).toEqual([15, 16, 19, 20]);
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
});

// ============================================================================
// Ladder Redistribution: Non-Standard Court Sizes
// ============================================================================

describe('ladderRedistribute: non-standard courts', () => {
	it('9 players (4+5): top 2 go up, bottom stay on C2 with 5 slots', () => {
		const results = [
			mockCourtResult(1, [
				{ playerId: 1, rank: 1, points: 60, diff: 10, matchCount: 3 },
				{ playerId: 2, rank: 2, points: 50, diff: 5, matchCount: 3 },
				{ playerId: 3, rank: 3, points: 30, diff: 0, matchCount: 3 },
				{ playerId: 4, rank: 4, points: 20, diff: -5, matchCount: 3 }
			]),
			mockCourtResult(2, [
				{ playerId: 5, rank: 1, points: 55, diff: 8, matchCount: 3 },
				{ playerId: 6, rank: 2, points: 45, diff: 3, matchCount: 3 },
				{ playerId: 7, rank: 3, points: 25, diff: -2, matchCount: 3 },
				{ playerId: 8, rank: 4, points: 15, diff: -6, matchCount: 3 },
				{ playerId: 9, rank: 5, points: 5, diff: -8, matchCount: 3 }
			])
		];

		const a = ladderRedistribute(results, 2, [4, 5]);

		expect(a[0].playerIds).toEqual([1, 2, 5, 6]);
		expect(a[0].playerIds).toHaveLength(4);

		expect(a[1].playerIds).toEqual([3, 4, 7, 8, 9]);
		expect(a[1].playerIds).toHaveLength(5);

		expect(new Set(a.flatMap((x) => x.playerIds)).size).toBe(9);
	});

	it('11 players (4+4+3): bottom court keeps 1, receives 2 from above', () => {
		const results = [
			mockCourtResult(1, [
				{ playerId: 1, rank: 1, points: 60, diff: 10, matchCount: 3 },
				{ playerId: 2, rank: 2, points: 50, diff: 5, matchCount: 3 },
				{ playerId: 3, rank: 3, points: 30, diff: 0, matchCount: 3 },
				{ playerId: 4, rank: 4, points: 20, diff: -5, matchCount: 3 }
			]),
			mockCourtResult(2, [
				{ playerId: 5, rank: 1, points: 55, diff: 8, matchCount: 3 },
				{ playerId: 6, rank: 2, points: 45, diff: 3, matchCount: 3 },
				{ playerId: 7, rank: 3, points: 25, diff: -2, matchCount: 3 },
				{ playerId: 8, rank: 4, points: 15, diff: -6, matchCount: 3 }
			]),
			mockCourtResult(3, [
				{ playerId: 9, rank: 1, points: 40, diff: 2, matchCount: 3 },
				{ playerId: 10, rank: 2, points: 35, diff: 0, matchCount: 3 },
				{ playerId: 11, rank: 3, points: 10, diff: -5, matchCount: 3 }
			])
		];

		const a = ladderRedistribute(results, 3, [4, 4, 3]);

		expect(a[0].playerIds).toEqual([1, 2, 5, 6]);
		expect(a[0].playerIds).toHaveLength(4);

		expect(a[1].playerIds).toEqual([3, 4, 9, 10]);
		expect(a[1].playerIds).toHaveLength(4);

		expect(a[2].playerIds).toEqual([7, 8, 11]);
		expect(a[2].playerIds).toHaveLength(3);

		expect(new Set(a.flatMap((x) => x.playerIds)).size).toBe(11);
	});

	it('10 players (4+6): top 2 from 6p court go up, bottom 4 stay on 6p court', () => {
		const results = [
			mockCourtResult(1, [
				{ playerId: 1, rank: 1, points: 70, diff: 15, matchCount: 3 },
				{ playerId: 2, rank: 2, points: 60, diff: 10, matchCount: 3 },
				{ playerId: 3, rank: 3, points: 40, diff: 0, matchCount: 3 },
				{ playerId: 4, rank: 4, points: 30, diff: -5, matchCount: 3 }
			]),
			mockCourtResult(2, [
				{ playerId: 5, rank: 1, points: 55, diff: 8, matchCount: 3 },
				{ playerId: 6, rank: 2, points: 50, diff: 5, matchCount: 3 },
				{ playerId: 7, rank: 3, points: 35, diff: -2, matchCount: 3 },
				{ playerId: 8, rank: 4, points: 25, diff: -6, matchCount: 3 },
				{ playerId: 9, rank: 5, points: 20, diff: -10, matchCount: 3 },
				{ playerId: 10, rank: 6, points: 10, diff: -12, matchCount: 3 }
			])
		];

		const a = ladderRedistribute(results, 2, [4, 6]);

		expect(a[0].playerIds).toEqual([1, 2, 5, 6]);
		expect(a[0].playerIds).toHaveLength(4);

		expect(a[1].playerIds).toEqual([3, 4, 7, 8, 9, 10]);
		expect(a[1].playerIds).toHaveLength(6);

		expect(new Set(a.flatMap((x) => x.playerIds)).size).toBe(10);
	});
});

// ============================================================================
// Multi-Round Random Seed Progression
// ============================================================================

describe('Random seed multi-round progression', () => {
	function runRandomRoundTrip(
		playerCount: number,
		courtSizes: number[],
		scoreWins: { winner: 'A' | 'B'; scoreA: number; scoreB: number }[]
	): TournamentState {
		let s = createInitialState({
			tournamentId: 1,
			formatType: 'random-seed',
			playerCount
		});
		s = addPlayers(
			s,
			Array.from({ length: playerCount }, (_, i) => mockPlayer(i + 1))
		);

		const totalRounds = s.totalRounds;
		let scoreIdx = 0;

		for (let r = 0; r < totalRounds; r++) {
			s = startRound(s);
			const score = scoreWins[scoreIdx % scoreWins.length];
			scoreIdx++;
			s = closeRound({
				...s,
				currentMatches: scoreAllMatches(s, score)
			});
		}
		return s;
	}

	it('8 players completes 4 rounds', () => {
		const s = runRandomRoundTrip(
			8,
			[4, 4],
			[
				{ winner: 'A', scoreA: 21, scoreB: 15 },
				{ winner: 'A', scoreA: 21, scoreB: 18 },
				{ winner: 'A', scoreA: 21, scoreB: 19 },
				{ winner: 'A', scoreA: 21, scoreB: 17 }
			]
		);
		expect(s.isComplete).toBe(true);
		expect(s.completedRounds).toHaveLength(4);
		expect(s.roundsCompleted).toBe(4);
	});

	it('12 players completes 4 rounds', () => {
		const s = runRandomRoundTrip(
			12,
			[4, 4, 4],
			[
				{ winner: 'A', scoreA: 21, scoreB: 15 },
				{ winner: 'A', scoreA: 21, scoreB: 18 },
				{ winner: 'A', scoreA: 21, scoreB: 19 },
				{ winner: 'A', scoreA: 21, scoreB: 17 }
			]
		);
		expect(s.isComplete).toBe(true);
		expect(s.completedRounds).toHaveLength(4);

		const allPlayers = new Set(
			s.completedRounds[3].flatMap((cr) => cr.standings.map((s) => s.playerId))
		);
		expect(allPlayers.size).toBe(12);
	});

	it('16 players completes 4 rounds', () => {
		const s = runRandomRoundTrip(
			16,
			[4, 4, 4, 4],
			[
				{ winner: 'A', scoreA: 21, scoreB: 15 },
				{ winner: 'A', scoreA: 21, scoreB: 18 },
				{ winner: 'A', scoreA: 21, scoreB: 19 },
				{ winner: 'A', scoreA: 21, scoreB: 17 }
			]
		);
		expect(s.isComplete).toBe(true);
		expect(s.completedRounds).toHaveLength(4);
	});

	it('20 players completes 4 rounds', () => {
		const s = runRandomRoundTrip(
			20,
			[4, 4, 4, 4, 4],
			[
				{ winner: 'A', scoreA: 21, scoreB: 15 },
				{ winner: 'A', scoreA: 21, scoreB: 18 },
				{ winner: 'A', scoreA: 21, scoreB: 19 },
				{ winner: 'A', scoreA: 21, scoreB: 17 }
			]
		);
		expect(s.isComplete).toBe(true);
		expect(s.completedRounds).toHaveLength(4);
	});

	it('9 players (4+5) completes 4 rounds', () => {
		const s = runRandomRoundTrip(
			9,
			[4, 5],
			[
				{ winner: 'A', scoreA: 21, scoreB: 15 },
				{ winner: 'A', scoreA: 21, scoreB: 18 },
				{ winner: 'A', scoreA: 21, scoreB: 19 },
				{ winner: 'A', scoreA: 21, scoreB: 17 }
			]
		);
		expect(s.isComplete).toBe(true);
		expect(s.completedRounds).toHaveLength(4);

		for (const round of s.completedRounds) {
			const allPlayers = round.flatMap((cr) => cr.standings.map((st) => st.playerId));
			expect(allPlayers.length).toBe(9);
			expect(new Set(allPlayers).size).toBe(9);
		}
	});

	it('32 players completes 4 rounds', () => {
		const s = runRandomRoundTrip(32, Array(8).fill(4), [
			{ winner: 'A', scoreA: 21, scoreB: 15 },
			{ winner: 'A', scoreA: 21, scoreB: 18 },
			{ winner: 'A', scoreA: 21, scoreB: 19 },
			{ winner: 'A', scoreA: 21, scoreB: 17 }
		]);
		expect(s.isComplete).toBe(true);
		expect(s.completedRounds).toHaveLength(4);
	});

	it('every player appears exactly once per round after redistribution', () => {
		const s = runRandomRoundTrip(
			12,
			[4, 4, 4],
			[
				{ winner: 'A', scoreA: 21, scoreB: 15 },
				{ winner: 'A', scoreA: 21, scoreB: 18 },
				{ winner: 'A', scoreA: 21, scoreB: 19 },
				{ winner: 'A', scoreA: 21, scoreB: 17 }
			]
		);

		for (const round of s.completedRounds) {
			const allPlayers = round.flatMap((cr) => cr.standings.map((st) => st.playerId));
			expect(allPlayers.length).toBe(12);
			expect(new Set(allPlayers).size).toBe(12);
		}
	});
});

// ============================================================================
// Multi-Round Preseed Progression
// ============================================================================

describe('Preseed multi-round progression', () => {
	it('8 players completes 2 rounds', () => {
		let s = createInitialState({ tournamentId: 1, formatType: 'preseed', playerCount: 8 });
		s = addPlayers(
			s,
			Array.from({ length: 8 }, (_, i) => mockPlayer(i + 1, 8 - i))
		);

		s = startRound(s);
		s = closeRound({
			...s,
			currentMatches: scoreAllMatches(s, { winner: 'A', scoreA: 21, scoreB: 15 })
		});

		s = startRound(s);
		s = closeRound({
			...s,
			currentMatches: scoreAllMatches(s, { winner: 'A', scoreA: 21, scoreB: 18 })
		});

		expect(s.isComplete).toBe(true);
		expect(s.completedRounds).toHaveLength(2);
	});

	it('12 players completes 3 rounds', () => {
		let s = createInitialState({ tournamentId: 1, formatType: 'preseed', playerCount: 12 });
		s = addPlayers(
			s,
			Array.from({ length: 12 }, (_, i) => mockPlayer(i + 1, 12 - i))
		);

		s = startRound(s);
		s = closeRound({
			...s,
			currentMatches: scoreAllMatches(s, { winner: 'A', scoreA: 21, scoreB: 15 })
		});

		s = startRound(s);
		s = closeRound({
			...s,
			currentMatches: scoreAllMatches(s, { winner: 'A', scoreA: 21, scoreB: 18 })
		});

		s = startRound(s);
		s = closeRound({
			...s,
			currentMatches: scoreAllMatches(s, { winner: 'A', scoreA: 21, scoreB: 19 })
		});

		expect(s.isComplete).toBe(true);
		expect(s.completedRounds).toHaveLength(3);
	});

	it('20 players completes 4 rounds', () => {
		let s = createInitialState({ tournamentId: 1, formatType: 'preseed', playerCount: 20 });
		s = addPlayers(
			s,
			Array.from({ length: 20 }, (_, i) => mockPlayer(i + 1, 20 - i))
		);

		for (let r = 0; r < 4; r++) {
			s = startRound(s);
			s = closeRound({
				...s,
				currentMatches: scoreAllMatches(s, { winner: 'A', scoreA: 21, scoreB: 15 })
			});
		}

		expect(s.isComplete).toBe(true);
		expect(s.completedRounds).toHaveLength(4);
	});

	it('every player appears exactly once per round after preseed redistribution', () => {
		let s = createInitialState({ tournamentId: 1, formatType: 'preseed', playerCount: 16 });
		s = addPlayers(
			s,
			Array.from({ length: 16 }, (_, i) => mockPlayer(i + 1, 16 - i))
		);

		for (let r = 0; r < 3; r++) {
			s = startRound(s);
			s = closeRound({
				...s,
				currentMatches: scoreAllMatches(s, { winner: 'A', scoreA: 21, scoreB: 15 })
			});
		}

		for (const round of s.completedRounds) {
			const allPlayers = round.flatMap((cr) => cr.standings.map((st) => st.playerId));
			expect(allPlayers.length).toBe(16);
			expect(new Set(allPlayers).size).toBe(16);
		}
	});
});

// ============================================================================
// redistributePreseedRecursive: Non-Standard Courts
// ============================================================================

describe('redistributePreseedRecursive: non-standard courts', () => {
	it('9 players (4+5) first split preserves all players', () => {
		const results = [
			mockCourtResult(1, [
				{ playerId: 1, rank: 1, points: 60, diff: 10, matchCount: 3 },
				{ playerId: 2, rank: 2, points: 40, diff: 5, matchCount: 3 },
				{ playerId: 3, rank: 3, points: 20, diff: 0, matchCount: 3 },
				{ playerId: 4, rank: 4, points: 10, diff: -5, matchCount: 3 }
			]),
			mockCourtResult(2, [
				{ playerId: 5, rank: 1, points: 50, diff: 8, matchCount: 3 },
				{ playerId: 6, rank: 2, points: 30, diff: 2, matchCount: 3 },
				{ playerId: 7, rank: 3, points: 15, diff: -3, matchCount: 3 },
				{ playerId: 8, rank: 4, points: 5, diff: -7, matchCount: 3 },
				{ playerId: 9, rank: 5, points: 0, diff: -10, matchCount: 3 }
			])
		];

		const a = redistributePreseedRecursive(results, [4, 5]);
		expect(a.length).toBe(2);
		const allPlayers = a.flatMap((x) => x.playerIds);
		expect(new Set(allPlayers).size).toBe(9);
	});
});

// ============================================================================
// processPreseedTransition: Non-Standard Courts
// ============================================================================

describe('processPreseedTransition: non-standard courts', () => {
	it('9 players (4+5) subsequent split preserves all players', () => {
		const results = [
			mockCourtResult(1, [
				{ playerId: 1, rank: 1, points: 60, diff: 10, matchCount: 3 },
				{ playerId: 2, rank: 2, points: 40, diff: 5, matchCount: 3 },
				{ playerId: 3, rank: 3, points: 20, diff: 0, matchCount: 3 },
				{ playerId: 4, rank: 4, points: 10, diff: -5, matchCount: 3 }
			]),
			mockCourtResult(2, [
				{ playerId: 5, rank: 1, points: 50, diff: 8, matchCount: 3 },
				{ playerId: 6, rank: 2, points: 30, diff: 2, matchCount: 3 },
				{ playerId: 7, rank: 3, points: 15, diff: -3, matchCount: 3 },
				{ playerId: 8, rank: 4, points: 5, diff: -7, matchCount: 3 },
				{ playerId: 9, rank: 5, points: 0, diff: -10, matchCount: 3 }
			])
		];

		const a = processPreseedTransition(results, [4, 5], 1);
		expect(a.length).toBe(2);
		const allPlayers = a.flatMap((x) => x.playerIds);
		expect(new Set(allPlayers).size).toBe(9);
	});
});

// ============================================================================
// Regression: Unsorted courtResults must not corrupt bracket splitting
// ============================================================================

describe('regression: unsorted courtResults in preseed', () => {
	it('5 courts (20p) subsequent split: courts 1-4 in winner bracket regardless of input order', () => {
		// R1 results for 5 courts, players finish in seed order
		// Intentionally provided in NON-sequential order: [3, 5, 1, 4, 2]
		const results = [
			mockCourtResult(3, [
				{ playerId: 9, rank: 1, points: 54, diff: 6, matchCount: 3 },
				{ playerId: 10, rank: 2, points: 42, diff: 2, matchCount: 3 },
				{ playerId: 11, rank: 3, points: 18, diff: -2, matchCount: 3 },
				{ playerId: 12, rank: 4, points: 6, diff: -6, matchCount: 3 }
			]),
			mockCourtResult(5, [
				{ playerId: 17, rank: 1, points: 46, diff: 2, matchCount: 3 },
				{ playerId: 18, rank: 2, points: 34, diff: 0, matchCount: 3 },
				{ playerId: 19, rank: 3, points: 14, diff: -4, matchCount: 3 },
				{ playerId: 20, rank: 4, points: 2, diff: -8, matchCount: 3 }
			]),
			mockCourtResult(1, [
				{ playerId: 1, rank: 1, points: 60, diff: 10, matchCount: 3 },
				{ playerId: 2, rank: 2, points: 48, diff: 4, matchCount: 3 },
				{ playerId: 3, rank: 3, points: 24, diff: 0, matchCount: 3 },
				{ playerId: 4, rank: 4, points: 12, diff: -4, matchCount: 3 }
			]),
			mockCourtResult(4, [
				{ playerId: 13, rank: 1, points: 52, diff: 5, matchCount: 3 },
				{ playerId: 14, rank: 2, points: 40, diff: 1, matchCount: 3 },
				{ playerId: 15, rank: 3, points: 16, diff: -3, matchCount: 3 },
				{ playerId: 16, rank: 4, points: 4, diff: -7, matchCount: 3 }
			]),
			mockCourtResult(2, [
				{ playerId: 5, rank: 1, points: 56, diff: 8, matchCount: 3 },
				{ playerId: 6, rank: 2, points: 44, diff: 3, matchCount: 3 },
				{ playerId: 7, rank: 3, points: 22, diff: -1, matchCount: 3 },
				{ playerId: 8, rank: 4, points: 8, diff: -5, matchCount: 3 }
			])
		];

		const sizes = [4, 4, 4, 4, 4];
		const a = processPreseedTransition(results, sizes, 1);

		// splitSize(5) = 4, so winner bracket = courts 1-4, loser bracket = court 5
		// Winner bracket should contain players from courts 1-4 only (ids 1-16)
		// Loser bracket should contain players from court 5 only (ids 17-20)
		expect(a).toHaveLength(5);
		for (const c of a) expect(c.playerIds).toHaveLength(4);

		const winnerPlayers = [
			...a[0].playerIds,
			...a[1].playerIds,
			...a[2].playerIds,
			...a[3].playerIds
		];
		const loserPlayers = [...a[4].playerIds];

		// All court 1-4 players (1-16) must be in the winner bracket
		for (const pid of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]) {
			expect(winnerPlayers).toContain(pid);
		}
		// All court 5 players (17-20) must be in the loser bracket
		for (const pid of [17, 18, 19, 20]) {
			expect(loserPlayers).toContain(pid);
		}

		// Winner bracket players should NOT leak into loser bracket
		for (const pid of winnerPlayers) {
			expect(loserPlayers).not.toContain(pid);
		}
		for (const pid of loserPlayers) {
			expect(winnerPlayers).not.toContain(pid);
		}
	});

	it('5 courts (20p) first split: unsorted input produces correct winner/loser distribution', () => {
		// Same data but isFirstSplit=true (R1→R2 transition)
		const results = [
			mockCourtResult(5, [
				{ playerId: 17, rank: 1, points: 46, diff: 2, matchCount: 3 },
				{ playerId: 18, rank: 2, points: 34, diff: 0, matchCount: 3 },
				{ playerId: 19, rank: 3, points: 14, diff: -4, matchCount: 3 },
				{ playerId: 20, rank: 4, points: 2, diff: -8, matchCount: 3 }
			]),
			mockCourtResult(2, [
				{ playerId: 5, rank: 1, points: 56, diff: 8, matchCount: 3 },
				{ playerId: 6, rank: 2, points: 44, diff: 3, matchCount: 3 },
				{ playerId: 7, rank: 3, points: 22, diff: -1, matchCount: 3 },
				{ playerId: 8, rank: 4, points: 8, diff: -5, matchCount: 3 }
			]),
			mockCourtResult(1, [
				{ playerId: 1, rank: 1, points: 60, diff: 10, matchCount: 3 },
				{ playerId: 2, rank: 2, points: 48, diff: 4, matchCount: 3 },
				{ playerId: 3, rank: 3, points: 24, diff: 0, matchCount: 3 },
				{ playerId: 4, rank: 4, points: 12, diff: -4, matchCount: 3 }
			]),
			mockCourtResult(4, [
				{ playerId: 13, rank: 1, points: 52, diff: 5, matchCount: 3 },
				{ playerId: 14, rank: 2, points: 40, diff: 1, matchCount: 3 },
				{ playerId: 15, rank: 3, points: 16, diff: -3, matchCount: 3 },
				{ playerId: 16, rank: 4, points: 4, diff: -7, matchCount: 3 }
			]),
			mockCourtResult(3, [
				{ playerId: 9, rank: 1, points: 54, diff: 6, matchCount: 3 },
				{ playerId: 10, rank: 2, points: 42, diff: 2, matchCount: 3 },
				{ playerId: 11, rank: 3, points: 18, diff: -2, matchCount: 3 },
				{ playerId: 12, rank: 4, points: 6, diff: -6, matchCount: 3 }
			])
		];

		const sizes = [4, 4, 4, 4, 4];
		const a = processPreseedTransition(results, sizes, 0);

		expect(a).toHaveLength(5);
		for (const c of a) expect(c.playerIds).toHaveLength(4);

		// 16 slots in winner bracket (courts 1-4), 4 in loser bracket (court 5)
		const winnerPlayers = [
			...a[0].playerIds,
			...a[1].playerIds,
			...a[2].playerIds,
			...a[3].playerIds
		];
		const loserPlayers = [...a[4].playerIds];

		// All 20 players present
		expect(new Set(a.flatMap((c) => c.playerIds)).size).toBe(20);

		// Winner bracket should be the top 16 by tier (all 1sts, all 2nds, all 3rds, best 4th)
		// At minimum, all 1st-place players should be in the winner bracket
		for (const pid of [1, 5, 9, 13, 17]) {
			expect(winnerPlayers).toContain(pid);
		}

		// The 4th-place players with lowest points should be in the loser bracket
		// 4ths sorted by points: 12(6), 4(12), 16(4), 8(8), 20(2)
		// Bottom 4 by tier order: worst 4ths go to loser bracket
		expect(loserPlayers.length).toBe(4);
	});

	it('3 courts (12p) subsequent split: unsorted input preserves bracket integrity', () => {
		// R2 results for 3 courts, provided in reverse order [3, 2, 1]
		// splitSize(3)=2, so winner bracket = courts 1-2, loser = court 3
		const results = [
			mockCourtResult(3, [
				{ playerId: 9, rank: 1, points: 44, diff: 4, matchCount: 3 },
				{ playerId: 10, rank: 2, points: 36, diff: 0, matchCount: 3 },
				{ playerId: 11, rank: 3, points: 16, diff: -4, matchCount: 3 },
				{ playerId: 12, rank: 4, points: 4, diff: -8, matchCount: 3 }
			]),
			mockCourtResult(2, [
				{ playerId: 5, rank: 1, points: 56, diff: 8, matchCount: 3 },
				{ playerId: 6, rank: 2, points: 40, diff: 2, matchCount: 3 },
				{ playerId: 7, rank: 3, points: 24, diff: -2, matchCount: 3 },
				{ playerId: 8, rank: 4, points: 8, diff: -6, matchCount: 3 }
			]),
			mockCourtResult(1, [
				{ playerId: 1, rank: 1, points: 60, diff: 10, matchCount: 3 },
				{ playerId: 2, rank: 2, points: 48, diff: 4, matchCount: 3 },
				{ playerId: 3, rank: 3, points: 32, diff: 0, matchCount: 3 },
				{ playerId: 4, rank: 4, points: 16, diff: -4, matchCount: 3 }
			])
		];

		const sizes = [4, 4, 4];
		const a = processPreseedTransition(results, sizes, 1);

		// splitSize(3)=2 → winner bracket (courts 1-2) splits into 2 courts,
		// loser bracket (court 3) stays as 1 court
		expect(a).toHaveLength(3);
		for (const c of a) expect(c.playerIds).toHaveLength(4);

		// Courts 1-2 should only contain players from original courts 1-2 (ids 1-8)
		const topBracketPlayers = [...a[0].playerIds, ...a[1].playerIds];
		const bottomPlayerIds = [...a[2].playerIds];

		for (const pid of topBracketPlayers) {
			expect([1, 2, 3, 4, 5, 6, 7, 8]).toContain(pid);
		}
		for (const pid of bottomPlayerIds) {
			expect([9, 10, 11, 12]).toContain(pid);
		}
	});
});

// ============================================================================
// Vertical Seeding → Ladder Chain (Manual R1→R2→R3)
// ============================================================================

describe('random seed vertical seeding → ladder chain', () => {
	it('4 courts: vertical seeding output feeds correctly into ladder', () => {
		const r1 = [
			mockCourtResult(1, [
				{ playerId: 1, rank: 1, points: 24, diff: 10, matchCount: 3 },
				{ playerId: 2, rank: 2, points: 20, diff: 5, matchCount: 3 },
				{ playerId: 3, rank: 3, points: 14, diff: 0, matchCount: 3 },
				{ playerId: 4, rank: 4, points: 10, diff: -5, matchCount: 3 }
			]),
			mockCourtResult(2, [
				{ playerId: 5, rank: 1, points: 22, diff: 8, matchCount: 3 },
				{ playerId: 6, rank: 2, points: 18, diff: 3, matchCount: 3 },
				{ playerId: 7, rank: 3, points: 12, diff: -2, matchCount: 3 },
				{ playerId: 8, rank: 4, points: 8, diff: -7, matchCount: 3 }
			]),
			mockCourtResult(3, [
				{ playerId: 9, rank: 1, points: 16, diff: 6, matchCount: 3 },
				{ playerId: 10, rank: 2, points: 12, diff: 1, matchCount: 3 },
				{ playerId: 11, rank: 3, points: 6, diff: -3, matchCount: 3 },
				{ playerId: 12, rank: 4, points: 2, diff: -8, matchCount: 3 }
			]),
			mockCourtResult(4, [
				{ playerId: 13, rank: 1, points: 14, diff: 4, matchCount: 3 },
				{ playerId: 14, rank: 2, points: 10, diff: 0, matchCount: 3 },
				{ playerId: 15, rank: 3, points: 4, diff: -4, matchCount: 3 },
				{ playerId: 16, rank: 4, points: 0, diff: -10, matchCount: 3 }
			])
		];

		const seeded = verticalSeeding(r1, 4);
		expect(seeded.length).toBe(4);
		expect(new Set(seeded.flatMap((s) => s.playerIds)).size).toBe(16);

		expect(seeded[0].playerIds).toEqual([1, 5, 9, 13]);
		expect(seeded[1].playerIds).toEqual([2, 6, 10, 14]);
		expect(seeded[2].playerIds).toEqual([3, 7, 11, 15]);
		expect(seeded[3].playerIds).toEqual([4, 8, 12, 16]);

		const r2 = seeded.map((assignment, i) =>
			mockCourtResult(
				i + 1,
				assignment.playerIds.map((pid, j) => ({
					playerId: pid,
					rank: j + 1,
					points: 30 - j * 5 - i,
					diff: 10 - j * 3,
					matchCount: 3
				}))
			)
		);

		const afterLadder = ladderRedistribute(r2, 4);
		expect(afterLadder.length).toBe(4);
		expect(new Set(afterLadder.flatMap((a) => a.playerIds)).size).toBe(16);
	});

	it('3 courts: vertical → ladder chain preserves all 12 players', () => {
		const r1 = [
			mockCourtResult(1, [
				{ playerId: 1, rank: 1, points: 30, diff: 10, matchCount: 3 },
				{ playerId: 2, rank: 2, points: 20, diff: 5, matchCount: 3 },
				{ playerId: 3, rank: 3, points: 10, diff: 0, matchCount: 3 },
				{ playerId: 4, rank: 4, points: 0, diff: -5, matchCount: 3 }
			]),
			mockCourtResult(2, [
				{ playerId: 5, rank: 1, points: 28, diff: 8, matchCount: 3 },
				{ playerId: 6, rank: 2, points: 18, diff: 3, matchCount: 3 },
				{ playerId: 7, rank: 3, points: 8, diff: -2, matchCount: 3 },
				{ playerId: 8, rank: 4, points: -2, diff: -7, matchCount: 3 }
			]),
			mockCourtResult(3, [
				{ playerId: 9, rank: 1, points: 26, diff: 6, matchCount: 3 },
				{ playerId: 10, rank: 2, points: 16, diff: 1, matchCount: 3 },
				{ playerId: 11, rank: 3, points: 6, diff: -3, matchCount: 3 },
				{ playerId: 12, rank: 4, points: -4, diff: -8, matchCount: 3 }
			])
		];

		const seeded = verticalSeeding(r1, 3);
		expect(new Set(seeded.flatMap((s) => s.playerIds)).size).toBe(12);

		expect(seeded[0].playerIds).toEqual([1, 5, 9, 2]);
		expect(seeded[1].playerIds).toEqual([6, 10, 3, 7]);
		expect(seeded[2].playerIds).toEqual([11, 4, 8, 12]);

		const r2 = seeded.map((assignment, i) =>
			mockCourtResult(
				i + 1,
				assignment.playerIds.map((pid, j) => ({
					playerId: pid,
					rank: j + 1,
					points: 30 - j * 5 - i,
					diff: 10 - j * 3,
					matchCount: 3
				}))
			)
		);

		const afterLadder = ladderRedistribute(r2, 3);
		expect(new Set(afterLadder.flatMap((a) => a.playerIds)).size).toBe(12);
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
	const defaultConfig = { pointsToWin: 21, winBy: 2, setsToWin: 1, decidingSetPoints: 15 };
	const bestOf3Config = { pointsToWin: 21, winBy: 2, setsToWin: 2, decidingSetPoints: 15 };
	const customConfig = { pointsToWin: 25, winBy: 2, setsToWin: 2, decidingSetPoints: 20 };

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
			const customSingle = { pointsToWin: 25, winBy: 2, setsToWin: 1, decidingSetPoints: 15 };
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

	describe('getEffectiveScoring', () => {
		const baseConfig = { pointsToWin: 21, winBy: 2, setsToWin: 1, decidingSetPoints: 15 };

		it('returns base config when no overrides', () => {
			const result = getEffectiveScoring(4, baseConfig, null);
			expect(result).toEqual({ pointsToWin: 21, winBy: 2, setsToWin: 1, decidingSetPoints: 15 });
		});

		it('returns base config when overrides is undefined', () => {
			const result = getEffectiveScoring(4, baseConfig, undefined);
			expect(result).toEqual({ pointsToWin: 21, winBy: 2, setsToWin: 1, decidingSetPoints: 15 });
		});

		it('returns base config when overrides has no entry for the court size', () => {
			const overrides = { '5': { pointsToWin: 15 } };
			const result = getEffectiveScoring(4, baseConfig, overrides);
			expect(result.pointsToWin).toBe(21);
		});

		it('applies override for matching court size', () => {
			const overrides = { '5': { pointsToWin: 15 } };
			const result = getEffectiveScoring(5, baseConfig, overrides);
			expect(result.pointsToWin).toBe(15);
		});

		it('partial override: only changes specified fields', () => {
			const overrides = { '3': { setsToWin: 2, decidingSetPoints: 20 } };
			const result = getEffectiveScoring(3, baseConfig, overrides);
			expect(result.pointsToWin).toBe(21); // unchanged
			expect(result.winBy).toBe(2); // unchanged
			expect(result.setsToWin).toBe(2); // overridden
			expect(result.decidingSetPoints).toBe(20); // overridden
		});

		it('applies to all court sizes independently', () => {
			const overrides = {
				'3': { pointsToWin: 25 },
				'5': { pointsToWin: 10 },
				'6': { pointsToWin: 18 }
			};
			expect(getEffectiveScoring(3, baseConfig, overrides).pointsToWin).toBe(25);
			expect(getEffectiveScoring(5, baseConfig, overrides).pointsToWin).toBe(10);
			expect(getEffectiveScoring(6, baseConfig, overrides).pointsToWin).toBe(18);
			expect(getEffectiveScoring(4, baseConfig, overrides).pointsToWin).toBe(21); // no override
		});
	});

	describe('getMinPointsForSet with overrides', () => {
		const baseConfig = { pointsToWin: 21, winBy: 2, setsToWin: 1, decidingSetPoints: 15 };

		it('override changes 5p from 15 to 10', () => {
			const overrides = { '5': { pointsToWin: 10 } };
			expect(getMinPointsForSet(1, 5, baseConfig, overrides)).toBe(10);
		});

		it('override changes 3p to best-of-3 with custom deciding set', () => {
			const overrides = { '3': { setsToWin: 2, decidingSetPoints: 10 } };
			expect(getMinPointsForSet(1, 3, baseConfig, overrides)).toBe(21);
			expect(getMinPointsForSet(3, 3, baseConfig, overrides)).toBe(10);
		});

		it('override on 6p changes pointsToWin', () => {
			const overrides = { '6': { pointsToWin: 10 } };
			expect(getMinPointsForSet(1, 6, baseConfig, overrides)).toBe(10);
		});
	});

	describe('getScoringLabel with overrides', () => {
		const baseConfig = { pointsToWin: 21, winBy: 2, setsToWin: 1, decidingSetPoints: 15 };

		it('override changes 5p label', () => {
			const overrides = { '5': { pointsToWin: 10 } };
			expect(getScoringLabel(baseConfig, 5, overrides)).toBe('1 set to 10');
		});

		it('override changes 3p to best-of-3', () => {
			const overrides = { '3': { setsToWin: 2, decidingSetPoints: 10 } };
			expect(getScoringLabel(baseConfig, 3, overrides)).toBe('Best of 2 (21pt, deciding: 10pt)');
		});

		it('no override falls through to default', () => {
			expect(getScoringLabel(baseConfig, 5)).toBe('1 set to 15');
			expect(getScoringLabel(baseConfig, 4)).toBe('1 set to 21');
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

	it('all matches canceled: averages used, all get 0 points', () => {
		const matches = [
			{ ...mockMatch([1, 2], [3, 4], null, null), isCanceled: true },
			{ ...mockMatch([1, 3], [2, 4], null, null), isCanceled: true },
			{ ...mockMatch([1, 4], [2, 3], null, null), isCanceled: true }
		];
		const result = calculateCourtStandings(matches, [1, 2, 3, 4]);
		for (const s of result) {
			expect(s.points).toBe(0);
			expect(s.matchCount).toBe(0);
		}
	});

	it('multiple injured players on same court', () => {
		const matches = [
			mockMatch([1, 2], [3, 4], 21, 19),
			{ ...mockMatch([1, 3], [2, 4], 25, 23), injuredPlayerIds: [2, 3] },
			mockMatch([1, 4], [2, 3], 22, 20)
		];
		const result = calculateCourtStandings(matches, [1, 2, 3, 4]);
		// p2: 21 + 0 + 20 = 41
		// p3: 19 + 0 + 20 = 39
		const p2 = result.find((s) => s.playerId === 2);
		const p3 = result.find((s) => s.playerId === 3);
		expect(p2?.points).toBe(41);
		expect(p3?.points).toBe(39);
	});

	it('mix of scored, canceled, and substitute matches', () => {
		const matches = [
			mockMatch([1, 2], [3, 4], 21, 19),
			{ ...mockMatch([1, 3], [2, 4], null, null), isCanceled: true },
			{ ...mockMatch([1, 4], [2, 3], 25, 23), injuredPlayerIds: [2] }
		];
		const result = calculateCourtStandings(matches, [1, 2, 3, 4]);
		// p1: 1 scored match → 21 pts (avg mode: 21/1 = 21)
		// p2: scored match 21 + substitute match 0 = 21, matchCount=2 → avg 10.5
		// p3: scored 19 (vs p1) = 19, matchCount=1 → avg 19
		// p4: scored 19 (vs p1) = 19, matchCount=1 → avg 19, but wait p4 also in canceled match - canceled matches are skipped entirely
		// Actually let me trace more carefully:
		// Match 1: (1,2) vs (3,4) 21-19 → p1:+21, p2:+21, p3:+19, p4:+19
		// Match 2: canceled → skipped
		// Match 3: (1,4) vs (2,3) 25-23, injuredPlayerIds=[2]
		//   p1: +25, p2: 0 (injured), p3: +23, p4: +25
		// Totals:
		//   p1: 21+25=46, 2 matches, avg=23
		//   p2: 21+0=21, 2 matches, avg=10.5
		//   p3: 19+23=42, 2 matches, avg=21
		//   p4: 19+25=44, 2 matches, avg=22
		// But with canceled match → use averages for ALL players
		// The useAverages flag is set when any match is canceled
		// So all are averages
		expect(result[0].playerId).toBe(1);
		expect(result[0].points).toBe(23);
		expect(result[0].matchCount).toBe(2);
		const p2 = result.find((s) => s.playerId === 2);
		expect(p2?.points).toBe(10.5);
		expect(p2?.matchCount).toBe(2);
	});

	it('already scored match unaffected by injuredPlayerIds', () => {
		const matches = [
			{ ...mockMatch([1, 2], [3, 4], 21, 19), injuredPlayerIds: [2] },
			mockMatch([1, 3], [2, 4], 25, 23),
			mockMatch([1, 4], [2, 3], 22, 20)
		];
		const result = calculateCourtStandings(matches, [1, 2, 3, 4]);
		// Even though match 1 has injuredPlayerIds=[2], the match is already scored
		// The injured player check only zeros out points if match is null
		// Wait - looking at the code: injured.has(pid) ? 0 : m.teamAScore
		// It applies for ALL matches where injuredPlayerIds includes the player
		// regardless of whether the match was already scored
		// p2: 0 (injured in match 1) + 23 + 20 = 43
		const p2 = result.find((s) => s.playerId === 2);
		expect(p2?.points).toBe(43);
	});
});

// ============================================================================
// isValidFinalScore
// ============================================================================

describe('isValidFinalScore', () => {
	const WB2 = { minPoints: 21, winBy: 2 };
	const WB1 = { minPoints: 21, winBy: 1 };
	const DS15 = { minPoints: 15, winBy: 2 };
	const DS10 = { minPoints: 10, winBy: 2 };

	// ===== winBy=2, minPoints=21 =====

	it('21-19: valid (target reached, win by 2)', () => {
		expect(isValidFinalScore(21, 19, WB2.minPoints, WB2.winBy)).toBe(true);
	});

	it('21-11: valid (winner at 21, loser not in striking distance)', () => {
		expect(isValidFinalScore(21, 11, WB2.minPoints, WB2.winBy)).toBe(true);
	});

	it('21-0: valid (winner at 21)', () => {
		expect(isValidFinalScore(21, 0, WB2.minPoints, WB2.winBy)).toBe(true);
	});

	it('25-11: INVALID (should have ended at 21-11)', () => {
		expect(isValidFinalScore(25, 11, WB2.minPoints, WB2.winBy)).toBe(false);
	});

	it('22-11: INVALID (should have ended at 21-11)', () => {
		expect(isValidFinalScore(22, 11, WB2.minPoints, WB2.winBy)).toBe(false);
	});

	it('30-11: INVALID (blowout, should have ended at 21-11)', () => {
		expect(isValidFinalScore(30, 11, WB2.minPoints, WB2.winBy)).toBe(false);
	});

	it('22-20: valid (deuce, winner = loser + 2)', () => {
		expect(isValidFinalScore(22, 20, WB2.minPoints, WB2.winBy)).toBe(true);
	});

	it('23-21: valid (deuce extended)', () => {
		expect(isValidFinalScore(23, 21, WB2.minPoints, WB2.winBy)).toBe(true);
	});

	it('30-28: valid (extended deuce)', () => {
		expect(isValidFinalScore(30, 28, WB2.minPoints, WB2.winBy)).toBe(true);
	});

	it('21-20: INVALID (only win by 1, needs 2)', () => {
		expect(isValidFinalScore(21, 20, WB2.minPoints, WB2.winBy)).toBe(false);
	});

	it('20-18: INVALID (winner below minPoints)', () => {
		expect(isValidFinalScore(20, 18, WB2.minPoints, WB2.winBy)).toBe(false);
	});

	it('21-21: INVALID (tied — can never be a final score)', () => {
		expect(isValidFinalScore(21, 21, WB2.minPoints, WB2.winBy)).toBe(false);
	});

	// ===== winBy=1, minPoints=21 =====

	it('21-20: valid (win by 1, target reached)', () => {
		expect(isValidFinalScore(21, 20, WB1.minPoints, WB1.winBy)).toBe(true);
	});

	it('21-0: valid (win by 1, target reached)', () => {
		expect(isValidFinalScore(21, 0, WB1.minPoints, WB1.winBy)).toBe(true);
	});

	it('22-21: INVALID (winBy=1, game always ends at exactly minPoints)', () => {
		expect(isValidFinalScore(22, 21, WB1.minPoints, WB1.winBy)).toBe(false);
	});

	it('21-19: valid (winBy=1, reached 21 with 2-point lead)', () => {
		expect(isValidFinalScore(21, 19, WB1.minPoints, WB1.winBy)).toBe(true);
	});

	it('25-11: INVALID (should have ended at 21-11)', () => {
		expect(isValidFinalScore(25, 11, WB1.minPoints, WB1.winBy)).toBe(false);
	});

	// ===== deciding set to 15, winBy=2 =====

	it('15-13: valid (deciding set, target reached)', () => {
		expect(isValidFinalScore(15, 13, DS15.minPoints, DS15.winBy)).toBe(true);
	});

	it('16-14: valid (deciding set deuce)', () => {
		expect(isValidFinalScore(16, 14, DS15.minPoints, DS15.winBy)).toBe(true);
	});

	it('17-11: INVALID (deciding set, should have ended at 15-11)', () => {
		expect(isValidFinalScore(17, 11, DS15.minPoints, DS15.winBy)).toBe(false);
	});

	it('15-14: INVALID (deciding set, only win by 1)', () => {
		expect(isValidFinalScore(15, 14, DS15.minPoints, DS15.winBy)).toBe(false);
	});

	it('13-11: INVALID (deciding set, winner below minPoints)', () => {
		expect(isValidFinalScore(13, 11, DS15.minPoints, DS15.winBy)).toBe(false);
	});

	// ===== custom minPoints=10, winBy=2 =====

	it('10-8: valid (custom 10pt target)', () => {
		expect(isValidFinalScore(10, 8, DS10.minPoints, DS10.winBy)).toBe(true);
	});

	it('11-9: valid (custom 10pt deuce)', () => {
		expect(isValidFinalScore(11, 9, DS10.minPoints, DS10.winBy)).toBe(true);
	});

	it('12-6: INVALID (custom 10pt, should have ended at 10-6)', () => {
		expect(isValidFinalScore(12, 6, DS10.minPoints, DS10.winBy)).toBe(false);
	});

	// ===== edge cases =====

	it('can never have winner below minPoints', () => {
		expect(isValidFinalScore(1, 0, 21, 2)).toBe(false);
		expect(isValidFinalScore(0, 0, 21, 2)).toBe(false);
	});

	it('negative scores are invalid (caller should handle)', () => {
		// isValidFinalScore assumes non-negative input from caller
		expect(isValidFinalScore(-1, 0, 21, 2)).toBe(false);
	});

	it('identical high scores not valid (caller checks tie separately)', () => {
		expect(isValidFinalScore(30, 30, 21, 2)).toBe(false);
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

	it('1 player → 1×1p', () => {
		expect(recalculateCourtConfigAfterRetirement(1)).toEqual({
			courtSizes: [1],
			totalCourts: 1
		});
	});

	it('2 players → 1×2p', () => {
		expect(recalculateCourtConfigAfterRetirement(2)).toEqual({
			courtSizes: [2],
			totalCourts: 1
		});
	});

	it('25 players → 6×4p + 1×1p becomes 5×4p + 1×5p', () => {
		// 25 % 4 = 1 → bottomSize = 5
		const result = recalculateCourtConfigAfterRetirement(25);
		expect(result.totalCourts).toBe(6);
		expect(result.courtSizes.filter((s) => s === 4).length).toBe(5);
		expect(result.courtSizes[5]).toBe(5);
	});

	it('26 players → 6×4p + 1×2p becomes 5×4p + 1×6p', () => {
		// 26 % 4 = 2 → bottomSize = 6
		const result = recalculateCourtConfigAfterRetirement(26);
		expect(result.totalCourts).toBe(6);
		expect(result.courtSizes.filter((s) => s === 4).length).toBe(5);
		expect(result.courtSizes[5]).toBe(6);
	});

	it('27 players → 6×4p + 1×3p', () => {
		// 27 % 4 = 3 → bottomSize = 3
		const result = recalculateCourtConfigAfterRetirement(27);
		expect(result.totalCourts).toBe(7);
		expect(result.courtSizes.filter((s) => s === 4).length).toBe(6);
		expect(result.courtSizes[6]).toBe(3);
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

	it('preseed: auto-computes bracketRange when not provided', () => {
		// Court 3 of 4 preseed → bracket range should be auto-computed by getPreseedBracketRange
		// splitSize(4)=2, winner courts = 1-2 (max 8), loser courts = 3-4 (max 16)
		const standing = calculateRetiredStanding(3, 4, 1, 3, 'preseed', [4, 4, 4, 4]);
		expect(standing).toBe(16);
	});

	it('preseed on final round: still returns bracket max', () => {
		// Even on the final round, preseed uses bracket max
		const standing = calculateRetiredStanding(1, 4, 3, 3, 'preseed', [4, 4, 4, 4], {
			min: 1,
			max: 8
		});
		expect(standing).toBe(8);
	});

	it('random seed on final round: same court, no relegation', () => {
		// 16 players, 4 courts, retired on round 3 of 3 (final round)
		// remainingRounds = 0, worstCourt = min(2 + 0, 4) = 2
		// places = 4*1 + 4 = 8
		const standing = calculateRetiredStanding(2, 4, 3, 3, 'random-seed', [4, 4, 4, 4]);
		expect(standing).toBe(8);
	});

	it('random seed: retired on top court stays there', () => {
		// 16 players, 4 courts, retired on court 1 final round
		// remainingRounds = 0, worstCourt = min(1, 4) = 1
		// places = 0 + 4 = 4
		const standing = calculateRetiredStanding(1, 4, 3, 3, 'random-seed', [4, 4, 4, 4]);
		expect(standing).toBe(4);
	});

	it('preseed 8 courts: auto-compute bracket range for winner bracket', () => {
		// splitSize(8)=4, winner courts = 1-4 (max 16), loser courts = 5-8 (max 32)
		const standing = calculateRetiredStanding(2, 8, 1, 4, 'preseed', Array(8).fill(4));
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

// ============================================================================
// getFrozenCourts
// ============================================================================

describe('getFrozenCourts', () => {
	it('returns empty for random-seed format', () => {
		expect(getFrozenCourts([4, 4, 4, 4], 2, 'random-seed')).toEqual([]);
	});

	it('returns empty for fewer than 2 completed rounds', () => {
		expect(getFrozenCourts([4, 4, 4, 4, 4], 0, 'preseed')).toEqual([]);
		expect(getFrozenCourts([4, 4, 4, 4, 4], 1, 'preseed')).toEqual([]);
	});

	it('returns empty for fewer than 3 courts', () => {
		expect(getFrozenCourts([4, 4], 2, 'preseed')).toEqual([]);
	});

	// 5 courts (20p): C5 freezes after R2
	it('5 courts: loser court freezes after R2', () => {
		const result = getFrozenCourts([4, 4, 4, 4, 4], 2, 'preseed');
		expect(result).toEqual([{ courtNumber: 5, freezeAfterRound: 2 }]);
	});

	it('5 courts: no new freezes after R2 (winner bracket still active)', () => {
		const r3 = getFrozenCourts([4, 4, 4, 4, 4], 3, 'preseed');
		expect(r3).toEqual([{ courtNumber: 5, freezeAfterRound: 2 }]);
	});

	// 3 courts (12p): C3 freezes after R2
	it('3 courts: loser court freezes after R2', () => {
		const result = getFrozenCourts([4, 4, 4], 2, 'preseed');
		expect(result).toEqual([{ courtNumber: 3, freezeAfterRound: 2 }]);
	});

	// 4 courts (16p): no early freezes (balanced)
	it('4 courts: no early freezes before final round', () => {
		expect(getFrozenCourts([4, 4, 4, 4], 2, 'preseed')).toEqual([]);
	});

	// 8 courts (32p): no early freezes
	it('8 courts: no early freezes (balanced bracket)', () => {
		expect(getFrozenCourts([4, 4, 4, 4, 4, 4, 4, 4], 2, 'preseed')).toEqual([]);
	});

	// 6 courts (24p): C5, C6 freeze after R3
	it('6 courts: two loser courts freeze after R3', () => {
		const result = getFrozenCourts([4, 4, 4, 4, 4, 4], 3, 'preseed');
		expect(result).toEqual([
			{ courtNumber: 5, freezeAfterRound: 3 },
			{ courtNumber: 6, freezeAfterRound: 3 }
		]);
	});

	it('6 courts: no freezes before R3', () => {
		expect(getFrozenCourts([4, 4, 4, 4, 4, 4], 2, 'preseed')).toEqual([]);
	});

	// 7 courts (28p): C7 freezes after R3
	it('7 courts: single loser court freezes after R3', () => {
		const result = getFrozenCourts([4, 4, 4, 4, 4, 4, 4], 3, 'preseed');
		expect(result).toEqual([{ courtNumber: 7, freezeAfterRound: 3 }]);
	});

	// 9 courts (36p): C9 freezes after R2
	it('9 courts: single loser court freezes after R2', () => {
		const result = getFrozenCourts([4, 4, 4, 4, 4, 4, 4, 4, 4], 2, 'preseed');
		expect(result).toEqual([{ courtNumber: 9, freezeAfterRound: 2 }]);
	});

	// 11 courts (44p): cascade — C11 after R3, C9+C10 after R4
	it('11 courts: cascade freeze — C11 after R3, C9+C10 after R4', () => {
		const r3 = getFrozenCourts([4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4], 3, 'preseed');
		expect(r3).toEqual([{ courtNumber: 11, freezeAfterRound: 3 }]);

		const r4 = getFrozenCourts([4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4], 4, 'preseed');
		expect(r4).toEqual([
			{ courtNumber: 11, freezeAfterRound: 3 },
			{ courtNumber: 9, freezeAfterRound: 4 },
			{ courtNumber: 10, freezeAfterRound: 4 }
		]);
	});
});

// ============================================================================
// Frozen courts + redistribution: #3/#4 finishers must not end up on top court
// ============================================================================

describe('Preseed redistribution: bracket correctness with frozen courts', () => {
	it('20p (5 courts): after R2 freeze, R2→R3 with 4 active courts places #3/#4 in lower brackets', () => {
		const results = [
			mockCourtResult(1, [
				{ playerId: 1, rank: 1, points: 60, diff: 20, matchCount: 3 },
				{ playerId: 5, rank: 2, points: 45, diff: 10, matchCount: 3 },
				{ playerId: 9, rank: 3, points: 30, diff: 0, matchCount: 3 },
				{ playerId: 13, rank: 4, points: 15, diff: -15, matchCount: 3 }
			]),
			mockCourtResult(2, [
				{ playerId: 2, rank: 1, points: 55, diff: 18, matchCount: 3 },
				{ playerId: 6, rank: 2, points: 40, diff: 8, matchCount: 3 },
				{ playerId: 10, rank: 3, points: 25, diff: -5, matchCount: 3 },
				{ playerId: 14, rank: 4, points: 10, diff: -18, matchCount: 3 }
			]),
			mockCourtResult(3, [
				{ playerId: 3, rank: 1, points: 50, diff: 15, matchCount: 3 },
				{ playerId: 7, rank: 2, points: 35, diff: 5, matchCount: 3 },
				{ playerId: 11, rank: 3, points: 20, diff: -10, matchCount: 3 },
				{ playerId: 15, rank: 4, points: 5, diff: -20, matchCount: 3 }
			]),
			mockCourtResult(4, [
				{ playerId: 4, rank: 1, points: 48, diff: 12, matchCount: 3 },
				{ playerId: 8, rank: 2, points: 33, diff: 3, matchCount: 3 },
				{ playerId: 12, rank: 3, points: 18, diff: -8, matchCount: 3 },
				{ playerId: 16, rank: 4, points: 3, diff: -22, matchCount: 3 }
			])
		];
		const sizes = [4, 4, 4, 4];
		const assignments = processPreseedTransition(results, sizes, 1);

		expect(assignments).toHaveLength(4);
		for (const c of assignments) expect(c.playerIds).toHaveLength(4);

		const topCourt = assignments[0].playerIds;
		const secondCourt = assignments[1].playerIds;
		const thirdCourt = assignments[2].playerIds;
		const fourthCourt = assignments[3].playerIds;

		// #3 and #4 from winner bracket (C1/C2) must NOT be on top court
		expect(topCourt).not.toContain(9);
		expect(topCourt).not.toContain(13);
		expect(topCourt).not.toContain(10);
		expect(topCourt).not.toContain(14);

		// #3s and #4s from C1/C2 must be on second court (Silver within winners pair)
		for (const pid of [9, 10, 13, 14]) {
			expect(secondCourt).toContain(pid);
		}
		// #1s and #2s from C3/C4 must be on third court (Bronze within losers pair)
		for (const pid of [3, 4, 7, 8]) {
			expect(thirdCourt).toContain(pid);
		}
		// #3s and #4s from C3/C4 must be on fourth court (Iron within losers pair)
		for (const pid of [11, 12, 15, 16]) {
			expect(fourthCourt).toContain(pid);
		}
	});

	it('20p: 4th on C2 in R2 drops to WL court in R3; 1st on WL reaches top court of pair in R4', () => {
		const gavin = 2;
		const r2Results = [
			mockCourtResult(1, [
				{ playerId: 1, rank: 1, points: 60, diff: 20, matchCount: 3 },
				{ playerId: 8, rank: 2, points: 50, diff: 10, matchCount: 3 },
				{ playerId: 5, rank: 3, points: 40, diff: 0, matchCount: 3 },
				{ playerId: 6, rank: 4, points: 30, diff: -10, matchCount: 3 }
			]),
			mockCourtResult(2, [
				{ playerId: 3, rank: 1, points: 60, diff: 20, matchCount: 3 },
				{ playerId: 7, rank: 2, points: 50, diff: 10, matchCount: 3 },
				{ playerId: 4, rank: 3, points: 40, diff: 0, matchCount: 3 },
				{ playerId: gavin, rank: 4, points: 30, diff: -10, matchCount: 3 }
			]),
			mockCourtResult(3, [
				{ playerId: 10, rank: 1, points: 60, diff: 20, matchCount: 3 },
				{ playerId: 12, rank: 2, points: 50, diff: 10, matchCount: 3 },
				{ playerId: 13, rank: 3, points: 40, diff: 0, matchCount: 3 },
				{ playerId: 11, rank: 4, points: 30, diff: -10, matchCount: 3 }
			]),
			mockCourtResult(4, [
				{ playerId: 15, rank: 1, points: 60, diff: 20, matchCount: 3 },
				{ playerId: 14, rank: 2, points: 50, diff: 10, matchCount: 3 },
				{ playerId: 9, rank: 3, points: 40, diff: 0, matchCount: 3 },
				{ playerId: 16, rank: 4, points: 30, diff: -10, matchCount: 3 }
			])
		];

		const r3Assignments = processPreseedTransition(r2Results, [4, 4, 4, 4], 1);
		const gavinR3Court = r3Assignments.find((a) => a.playerIds.includes(gavin))!;
		expect(gavinR3Court.courtNumber).toBe(2);
		expect(r3Assignments[0].playerIds).not.toContain(gavin);

		const r3Results = [
			mockCourtResult(1, [
				{ playerId: 1, rank: 1, points: 60, diff: 20, matchCount: 3 },
				{ playerId: 3, rank: 2, points: 50, diff: 10, matchCount: 3 },
				{ playerId: 8, rank: 3, points: 40, diff: 0, matchCount: 3 },
				{ playerId: 7, rank: 4, points: 30, diff: -10, matchCount: 3 }
			]),
			mockCourtResult(2, [
				{ playerId: gavin, rank: 1, points: 60, diff: 20, matchCount: 3 },
				{ playerId: 4, rank: 2, points: 50, diff: 10, matchCount: 3 },
				{ playerId: 6, rank: 3, points: 40, diff: 0, matchCount: 3 },
				{ playerId: 5, rank: 4, points: 30, diff: -10, matchCount: 3 }
			]),
			mockCourtResult(3, [
				{ playerId: 10, rank: 1, points: 60, diff: 20, matchCount: 3 },
				{ playerId: 12, rank: 2, points: 50, diff: 10, matchCount: 3 },
				{ playerId: 9, rank: 3, points: 40, diff: 0, matchCount: 3 },
				{ playerId: 14, rank: 4, points: 30, diff: -10, matchCount: 3 }
			]),
			mockCourtResult(4, [
				{ playerId: 15, rank: 1, points: 60, diff: 20, matchCount: 3 },
				{ playerId: 11, rank: 2, points: 50, diff: 10, matchCount: 3 },
				{ playerId: 13, rank: 3, points: 40, diff: 0, matchCount: 3 },
				{ playerId: 16, rank: 4, points: 30, diff: -10, matchCount: 3 }
			])
		];

		const r4Assignments = processPreseedTransition(r3Results, [4, 4, 4, 4], 2, 5);
		const allR4Players = r4Assignments.flatMap((a) => a.playerIds);
		expect(allR4Players).toContain(gavin);
		expect(r4Assignments[0].playerIds).toContain(1);
		expect(r4Assignments[0].playerIds).toContain(gavin);
		expect(r4Assignments[1].playerIds).not.toContain(gavin);
	});

	it('4 results with 5 sizes matches 4-court redistribution for active courts', () => {
		const results = [
			mockCourtResult(1, [
				{ playerId: 1, rank: 1, points: 60, diff: 20, matchCount: 3 },
				{ playerId: 5, rank: 2, points: 45, diff: 10, matchCount: 3 },
				{ playerId: 9, rank: 3, points: 30, diff: 0, matchCount: 3 },
				{ playerId: 13, rank: 4, points: 15, diff: -15, matchCount: 3 }
			]),
			mockCourtResult(2, [
				{ playerId: 2, rank: 1, points: 55, diff: 18, matchCount: 3 },
				{ playerId: 6, rank: 2, points: 40, diff: 8, matchCount: 3 },
				{ playerId: 10, rank: 3, points: 25, diff: -5, matchCount: 3 },
				{ playerId: 14, rank: 4, points: 10, diff: -18, matchCount: 3 }
			]),
			mockCourtResult(3, [
				{ playerId: 3, rank: 1, points: 50, diff: 15, matchCount: 3 },
				{ playerId: 7, rank: 2, points: 35, diff: 5, matchCount: 3 },
				{ playerId: 11, rank: 3, points: 20, diff: -10, matchCount: 3 },
				{ playerId: 15, rank: 4, points: 5, diff: -20, matchCount: 3 }
			]),
			mockCourtResult(4, [
				{ playerId: 4, rank: 1, points: 48, diff: 12, matchCount: 3 },
				{ playerId: 8, rank: 2, points: 33, diff: 3, matchCount: 3 },
				{ playerId: 12, rank: 3, points: 18, diff: -8, matchCount: 3 },
				{ playerId: 16, rank: 4, points: 3, diff: -22, matchCount: 3 }
			])
		];

		const correct = processPreseedTransition(results, [4, 4, 4, 4], 1, 5);
		expect(correct).toHaveLength(4);

		const withExtraSize = processPreseedTransition(results, [4, 4, 4, 4, 4], 1, 5);
		expect(withExtraSize).toHaveLength(4);
		expect(withExtraSize.map((a) => a.playerIds)).toEqual(correct.map((a) => a.playerIds));
	});

	it('#4 finisher from top court goes to lower court in next round', () => {
		const results = [
			mockCourtResult(1, [
				{ playerId: 100, rank: 1, points: 60, diff: 20, matchCount: 3 },
				{ playerId: 200, rank: 2, points: 45, diff: 10, matchCount: 3 },
				{ playerId: 300, rank: 3, points: 30, diff: 0, matchCount: 3 },
				{ playerId: 400, rank: 4, points: 15, diff: -15, matchCount: 3 }
			]),
			mockCourtResult(2, [
				{ playerId: 101, rank: 1, points: 55, diff: 18, matchCount: 3 },
				{ playerId: 201, rank: 2, points: 40, diff: 8, matchCount: 3 },
				{ playerId: 301, rank: 3, points: 25, diff: -5, matchCount: 3 },
				{ playerId: 401, rank: 4, points: 10, diff: -18, matchCount: 3 }
			]),
			mockCourtResult(3, [
				{ playerId: 102, rank: 1, points: 50, diff: 15, matchCount: 3 },
				{ playerId: 202, rank: 2, points: 35, diff: 5, matchCount: 3 },
				{ playerId: 302, rank: 3, points: 20, diff: -10, matchCount: 3 },
				{ playerId: 402, rank: 4, points: 5, diff: -20, matchCount: 3 }
			]),
			mockCourtResult(4, [
				{ playerId: 103, rank: 1, points: 48, diff: 12, matchCount: 3 },
				{ playerId: 203, rank: 2, points: 33, diff: 3, matchCount: 3 },
				{ playerId: 303, rank: 3, points: 18, diff: -8, matchCount: 3 },
				{ playerId: 403, rank: 4, points: 3, diff: -22, matchCount: 3 }
			])
		];

		const assignments = processPreseedTransition(results, [4, 4, 4, 4], 1);

		// #4 on C1 must NOT be on C1 (top of winners pair)
		expect(assignments[0].playerIds).not.toContain(400);
		// #3 on C1 must NOT be on C1 (top of winners pair)
		expect(assignments[0].playerIds).not.toContain(300);
		// #1s from C1/C2 must be on C1
		expect(assignments[0].playerIds).toContain(100);
		expect(assignments[0].playerIds).toContain(101);
	});
});

// ============================================================================
// Preseed Frozen Courts: full round-by-round court count verification
// ============================================================================

describe('Preseed frozen courts: court count per round', () => {
	it('20 players (5 courts): R1=5, R2=5, R3=4 (C5 frozen), R4=4', () => {
		const originalSizes = calculateCourtSizes(20);
		expect(originalSizes).toEqual([4, 4, 4, 4, 4]);
		expect(calculateRoundCount(5, 'preseed')).toBe(4);

		// After R2: C5 freezes
		const frozenR2 = getFrozenCourts(originalSizes, 2, 'preseed');
		expect(frozenR2).toEqual([{ courtNumber: 5, freezeAfterRound: 2 }]);
		const activeR3 = originalSizes.filter((_, i) => !frozenR2.some((f) => f.courtNumber === i + 1));
		expect(activeR3).toEqual([4, 4, 4, 4]);

		// After R3: same frozen set, no new freezes
		const frozenR3 = getFrozenCourts(originalSizes, 3, 'preseed');
		expect(frozenR3).toEqual([{ courtNumber: 5, freezeAfterRound: 2 }]);
		const activeR4 = originalSizes.filter((_, i) => !frozenR3.some((f) => f.courtNumber === i + 1));
		expect(activeR4).toEqual([4, 4, 4, 4]);

		// Verify that using DB-modified sizes would be WRONG
		// (this was the bug: getFrozenCourts([4,4,4,4], 3, 'preseed') freezes all courts)
		const wrongResult = getFrozenCourts(activeR3, 3, 'preseed');
		expect(wrongResult.length).toBeGreaterThan(0);
	});

	it('24 players (6 courts): R1=6, R2=6, R3=4 (C5+C6 frozen), R4=4', () => {
		const originalSizes = calculateCourtSizes(24);
		expect(originalSizes).toEqual([4, 4, 4, 4, 4, 4]);
		expect(calculateRoundCount(6, 'preseed')).toBe(4);

		// After R2: no freezes yet
		const frozenR2 = getFrozenCourts(originalSizes, 2, 'preseed');
		expect(frozenR2).toEqual([]);
		expect(originalSizes.filter((_, i) => !frozenR2.some((f) => f.courtNumber === i + 1))).toEqual([
			4, 4, 4, 4, 4, 4
		]);

		// After R3: C5, C6 freeze
		const frozenR3 = getFrozenCourts(originalSizes, 3, 'preseed');
		expect(frozenR3).toEqual([
			{ courtNumber: 5, freezeAfterRound: 3 },
			{ courtNumber: 6, freezeAfterRound: 3 }
		]);
		const activeR4 = originalSizes.filter((_, i) => !frozenR3.some((f) => f.courtNumber === i + 1));
		expect(activeR4).toEqual([4, 4, 4, 4]);
	});

	it('16 players (4 courts): R1=4, R2=4, R3=4 (no freezes, balanced bracket)', () => {
		const originalSizes = calculateCourtSizes(16);
		expect(originalSizes).toEqual([4, 4, 4, 4]);
		expect(calculateRoundCount(4, 'preseed')).toBe(3);

		// Balanced bracket — no mid-tournament freezes
		const frozenR1 = getFrozenCourts(originalSizes, 1, 'preseed');
		expect(frozenR1).toEqual([]);
		const frozenR2 = getFrozenCourts(originalSizes, 2, 'preseed');
		expect(frozenR2).toEqual([]);
	});

	it('12 players (3 courts): R1=3, R2=2 (C3 frozen), R3=2', () => {
		const originalSizes = calculateCourtSizes(12);
		expect(originalSizes).toEqual([4, 4, 4]);
		expect(calculateRoundCount(3, 'preseed')).toBe(3);

		// After R2: C3 freezes
		const frozenR2 = getFrozenCourts(originalSizes, 2, 'preseed');
		expect(frozenR2).toEqual([{ courtNumber: 3, freezeAfterRound: 2 }]);
		const activeR3 = originalSizes.filter((_, i) => !frozenR2.some((f) => f.courtNumber === i + 1));
		expect(activeR3).toEqual([4, 4]);
	});

	it('28 players (7 courts): R1=7, R2=7, R3=6 (C7 frozen), R4=6', () => {
		const originalSizes = calculateCourtSizes(28);
		expect(originalSizes).toEqual([4, 4, 4, 4, 4, 4, 4]);
		expect(calculateRoundCount(7, 'preseed')).toBe(4);

		// After R3: C7 freezes
		const frozenR3 = getFrozenCourts(originalSizes, 3, 'preseed');
		expect(frozenR3).toEqual([{ courtNumber: 7, freezeAfterRound: 3 }]);
		const activeR4 = originalSizes.filter((_, i) => !frozenR3.some((f) => f.courtNumber === i + 1));
		expect(activeR4).toEqual([4, 4, 4, 4, 4, 4]);
	});
});
