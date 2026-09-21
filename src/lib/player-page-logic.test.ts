import { describe, expect, it } from 'vitest';
import {
	derivePlayerRoundState,
	movementFor,
	nextHintFor,
	ladderDestination,
	matchRun,
	orientMatchForPlayer,
	playerMatchesView,
	splitPlayerMatches,
	waitClock,
	placeForCourtRank,
	reachableRanksOnCourt,
	reachableFinalPlaceRange,
	playerPlacement,
	verticalTierCourtRange,
	verticalTierPlaceRange,
	neighborSeparatingFactor,
	shouldAutoCheckIn,
	checkInWasUsed,
	type NumberedMatch,
	type PlayerPlacementInput
} from './player-page-logic';

function match(
	partial: Partial<NumberedMatch> &
		Pick<NumberedMatch, 'teamAPlayer1Id' | 'teamAPlayer2Id' | 'teamBPlayer1Id' | 'teamBPlayer2Id'>
): NumberedMatch {
	return {
		matchNumber: 1,
		id: 1,
		setNumber: 1,
		teamAScore: null,
		teamBScore: null,
		isCanceled: false,
		...partial
	};
}

describe('derivePlayerRoundState', () => {
	const base = {
		currentRound: 1,
		player: { retiredAt: null, retiredRound: null, injuredAt: null },
		rotation: { courtNumber: 2 },
		isFrozen: false,
		isFinalRound: false,
		courtComplete: false,
		shiftPlaying: true
	};

	it('maps completed / setup / active', () => {
		expect(derivePlayerRoundState({ ...base, tournamentStatus: 'completed' })).toBe('completed');
		expect(derivePlayerRoundState({ ...base, tournamentStatus: 'setup' })).toBe('not_started');
		expect(derivePlayerRoundState({ ...base, tournamentStatus: 'active' })).toBe('active');
	});

	it('maps waiting, court_done, retired', () => {
		expect(
			derivePlayerRoundState({ ...base, tournamentStatus: 'active', shiftPlaying: false })
		).toBe('waiting');
		expect(
			derivePlayerRoundState({ ...base, tournamentStatus: 'active', courtComplete: true })
		).toBe('court_done');
		expect(
			derivePlayerRoundState({
				...base,
				tournamentStatus: 'active',
				player: { retiredAt: new Date(), retiredRound: 1, injuredAt: null },
				rotation: null
			})
		).toBe('retired');
	});
});

describe('movement and hints', () => {
	it('movementFor compares courts', () => {
		expect(movementFor(4, 3)).toBe('up');
		expect(movementFor(3, 4)).toBe('down');
		expect(movementFor(2, 2)).toBe('same');
		expect(movementFor(null, 2)).toBe(null);
	});

	it('ladderDestination clamps at ends', () => {
		expect(ladderDestination(1, 1, 4)).toBe(1);
		expect(ladderDestination(2, 1, 4)).toBe(1);
		expect(ladderDestination(2, 3, 4)).toBe(3);
		expect(ladderDestination(4, 4, 4)).toBe(4);
	});

	it('nextHintFor ladder and preseed', () => {
		expect(nextHintFor('random-seed', 1, 1, 3, 4, 4)).toBe(null);
		expect(nextHintFor('random-seed', 2, 1, 3, 4, 4)).toEqual({
			courtNumber: 2,
			group: null,
			direction: 'up'
		});
		expect(nextHintFor('preseed', 1, 1, 3, 4, 4)?.group).toBe('winners');
		expect(nextHintFor('preseed', 1, 3, 3, 4, 4)?.group).toBe('losers');
	});
});

describe('player match views', () => {
	it('orients YOU on the left', () => {
		const m = match({
			teamAPlayer1Id: 1,
			teamAPlayer2Id: 2,
			teamBPlayer1Id: 3,
			teamBPlayer2Id: 4,
			teamAScore: 21,
			teamBScore: 18
		});
		expect(orientMatchForPlayer(m, 3)).toEqual({ youOnTeam: 'b', a: 18, b: 21 });
		const names = new Map([
			[1, 'A'],
			[2, 'B'],
			[3, 'You'],
			[4, 'D']
		]);
		const views = playerMatchesView([m], 3, 4, names);
		expect(views[0].partnerName).toBe('D');
		expect(views[0].sets[0]).toEqual({ id: 1, a: 18, b: 21 });
		expect(views[0].diffForGame).toBe(-3);
	});

	it('splitPlayerMatches puts the first open match as current', () => {
		const names = new Map([
			[1, 'You'],
			[2, 'B'],
			[3, 'C'],
			[4, 'D']
		]);
		const matches: NumberedMatch[] = [
			match({
				id: 10,
				matchNumber: 1,
				teamAPlayer1Id: 1,
				teamAPlayer2Id: 2,
				teamBPlayer1Id: 3,
				teamBPlayer2Id: 4,
				teamAScore: 21,
				teamBScore: 19
			}),
			match({
				id: 11,
				matchNumber: 2,
				teamAPlayer1Id: 1,
				teamAPlayer2Id: 3,
				teamBPlayer1Id: 2,
				teamBPlayer2Id: 4
			})
		];
		const split = splitPlayerMatches(matches, 1, 4, names);
		expect(split.current?.matchNumber).toBe(2);
		expect(split.upcoming).toHaveLength(0);
	});

	it('matchRun groups 5p games', () => {
		expect(matchRun(1, 5)).toBe(1);
		expect(matchRun(2, 5)).toBe(1);
		expect(matchRun(3, 5)).toBe(2);
		expect(matchRun(1, 4)).toBe(1);
	});

	it('marks matches the player is not in as sit-out', () => {
		const names = new Map([
			[5, 'E'],
			[6, 'F'],
			[7, 'G'],
			[8, 'H']
		]);
		const views = playerMatchesView(
			[
				match({
					teamAPlayer1Id: 5,
					teamAPlayer2Id: 6,
					teamBPlayer1Id: 7,
					teamBPlayer2Id: 8,
					teamAScore: 21,
					teamBScore: 15
				})
			],
			1,
			4,
			names
		);
		expect(views[0].sitOut).toBe(true);
		expect(views[0].diffForGame).toBeNull();
	});
});

describe('waitClock and places', () => {
	it('uses 0.75 remaining and hides past times', () => {
		const facts = new Date('2026-01-01T10:00:00Z');
		const now = new Date('2026-01-01T10:10:00Z');
		const beAt = waitClock(facts, 20 * 60_000, now);
		expect(beAt?.toISOString()).toBe('2026-01-01T10:15:00.000Z');
		expect(waitClock(facts, 5 * 60_000, now)).toBe(null);
	});

	it('placeForCourtRank accumulates sizes', () => {
		expect(placeForCourtRank([4, 4, 4, 4], 3, 2)).toBe(10);
		expect(placeForCourtRank([4, 5], 2, 5)).toBe(9);
	});
});

describe('reachable ranks and range', () => {
	it('reachableRanksOnCourt fills remaining matches', () => {
		const matches: NumberedMatch[] = [
			match({
				teamAPlayer1Id: 1,
				teamAPlayer2Id: 2,
				teamBPlayer1Id: 3,
				teamBPlayer2Id: 4,
				teamAScore: 21,
				teamBScore: 15
			}),
			match({
				matchNumber: 2,
				id: 2,
				teamAPlayer1Id: 1,
				teamAPlayer2Id: 3,
				teamBPlayer1Id: 2,
				teamBPlayer2Id: 4
			})
		];
		const ranks = reachableRanksOnCourt(1, matches, [1, 2, 3, 4], { pointsToWin: 21, winBy: 2 });
		expect(ranks).not.toBeNull();
		expect(ranks!.bestRank).toBeLessThanOrEqual(ranks!.safeRank);
	});

	it('random-seed last round uses court rank as place', () => {
		const range = reachableFinalPlaceRange({
			formatType: 'random-seed',
			currentRound: 4,
			numRounds: 4,
			courtNumber: 2,
			courtSizes: [4, 4, 4, 4],
			bestRankOnCourt: 1,
			safeRankOnCourt: 4,
			liveRoundResults: null,
			frozenCourtNumbers: new Set()
		});
		expect(range.best).toBe(5);
		expect(range.worst).toBe(8);
	});

	it('safe path on court 3 ranks 1-2 is 8th not 12th', () => {
		const range = reachableFinalPlaceRange({
			formatType: 'random-seed',
			currentRound: 2,
			numRounds: 4,
			courtNumber: 3,
			courtSizes: [4, 4, 4, 4],
			bestRankOnCourt: 1,
			safeRankOnCourt: 2,
			liveRoundResults: null,
			frozenCourtNumbers: new Set()
		});
		expect(range.best).toBe(1);
		expect(range.worst).toBe(8);
	});

	it('random-seed round 1 with no scores can still reach 1st', () => {
		const sizes = Array(8).fill(4);
		const dummyResults = sizes.map((_, i) => ({
			courtNumber: i + 1,
			standings: [1, 2, 3, 4].map((rank, j) => ({
				playerId: i * 4 + j + 1,
				rank,
				points: 0,
				diff: 0,
				matchCount: 0
			}))
		}));
		const range = reachableFinalPlaceRange({
			formatType: 'random-seed',
			currentRound: 1,
			numRounds: 4,
			courtNumber: 5,
			courtSizes: sizes,
			bestRankOnCourt: null,
			safeRankOnCourt: null,
			liveRoundResults: dummyResults,
			frozenCourtNumbers: new Set(),
			playerId: 17
		});
		expect(range.best).toBe(1);
		expect(range.worst).toBe(32);
	});

	it('random-seed round 1 rank-1 on court still allows 1st despite dummy other courts', () => {
		const sizes = Array(8).fill(4);
		const dummyResults = sizes.map((_, i) => ({
			courtNumber: i + 1,
			standings: [1, 2, 3, 4].map((rank, j) => ({
				playerId: i * 4 + j + 1,
				rank,
				points: 0,
				diff: 0,
				matchCount: 0
			}))
		}));
		const range = reachableFinalPlaceRange({
			formatType: 'random-seed',
			currentRound: 1,
			numRounds: 2,
			courtNumber: 5,
			courtSizes: sizes,
			bestRankOnCourt: 1,
			safeRankOnCourt: 4,
			liveRoundResults: dummyResults,
			frozenCourtNumbers: new Set(),
			playerId: 17
		});
		expect(range.best).toBe(1);
		expect(range.worst).toBe(32);
	});

	it('maps 4ths on 8×4 into courts 7–8 after vertical seeding', () => {
		expect(verticalTierCourtRange(1, Array(8).fill(4))).toEqual({ lo: 1, hi: 2 });
		expect(verticalTierCourtRange(2, Array(8).fill(4))).toEqual({ lo: 3, hi: 4 });
		expect(verticalTierCourtRange(3, Array(8).fill(4))).toEqual({ lo: 5, hi: 6 });
		expect(verticalTierCourtRange(4, Array(8).fill(4))).toEqual({ lo: 7, hi: 8 });
		expect(verticalTierCourtRange(4, [5, 4, 4, 4, 4, 4, 4, 3])).toEqual({ lo: 6, hi: 8 });
		expect(verticalTierPlaceRange(4, Array(8).fill(4))).toEqual({ best: 25, worst: 32 });
		expect(verticalTierPlaceRange(4, [5, 4, 4, 4, 4, 4, 4, 3])).toEqual({ best: 25, worst: 31 });
	});

	it('random-seed round 1 court-done 4th is the 4ths band, not dummy slot order', () => {
		const sizes = Array(8).fill(4);
		const dummyResults = sizes.map((_, i) => ({
			courtNumber: i + 1,
			standings: [1, 2, 3, 4].map((rank, j) => ({
				playerId: i * 4 + j + 1,
				rank: i === 0 ? rank : j + 1,
				points: i === 0 ? [15, 13, 12, 12][j]! : 0,
				diff: i === 0 ? [4, 1, -1, -1][j]! : 0,
				matchCount: 3
			}))
		}));
		const range = reachableFinalPlaceRange({
			formatType: 'random-seed',
			currentRound: 1,
			numRounds: 4,
			courtNumber: 1,
			courtSizes: sizes,
			bestRankOnCourt: 4,
			safeRankOnCourt: 4,
			liveRankOnCourt: 4,
			liveRoundResults: dummyResults,
			frozenCourtNumbers: new Set(),
			playerId: 4
		});
		expect(range.current).toBe(25);
		expect(range.best).toBe(13);
		expect(range.worst).toBe(32);
		expect(range.minCourt).toBe(4);
		expect(range.maxCourt).toBe(8);
	});

	it('random-seed round 1 5p court-done 4th uses mixed court sizes', () => {
		const sizes = [5, 4, 4, 4, 4, 4, 4, 3];
		const dummyResults = sizes.map((size, i) => ({
			courtNumber: i + 1,
			standings: Array.from({ length: size }, (_, j) => ({
				playerId: 100 * (i + 1) + j + 1,
				rank: j + 1,
				points: i === 0 ? [15, 13.33, 12.33, 12.33, 11.75][j]! : 0,
				diff: i === 0 ? [4, 1, -1, -1, -2.25][j]! : 0,
				matchCount: 3
			}))
		}));
		const range = reachableFinalPlaceRange({
			formatType: 'random-seed',
			currentRound: 1,
			numRounds: 4,
			courtNumber: 1,
			courtSizes: sizes,
			bestRankOnCourt: 4,
			safeRankOnCourt: 4,
			liveRankOnCourt: 4,
			liveRoundResults: dummyResults,
			frozenCourtNumbers: new Set(),
			playerId: 104
		});
		expect(range.current).toBe(25);
		expect(range.best).toBe(10);
		expect(range.worst).toBe(32);
		expect(range.minCourt).toBe(3);
		expect(range.maxCourt).toBe(8);
	});

	it('random-seed round 1 court-8 1st is the 1sts band, not seed-court 29th', () => {
		const sizes = Array(8).fill(4);
		const dummyResults = sizes.map((_, i) => ({
			courtNumber: i + 1,
			standings: [1, 2, 3, 4].map((rank, j) => ({
				playerId: i * 4 + j + 1,
				rank,
				points: i === 7 ? [60, 53, 53, 40][j]! : i === 0 ? [55, 50, 48, 42][j]! : 0,
				diff: i === 7 ? [17, 3, 3, -23][j]! : i === 0 ? [10, 4, 0, -14][j]! : 0,
				matchCount: i === 7 || i === 0 ? 3 : 0
			}))
		}));
		const range = reachableFinalPlaceRange({
			formatType: 'random-seed',
			currentRound: 1,
			numRounds: 4,
			courtNumber: 8,
			courtSizes: sizes,
			bestRankOnCourt: 1,
			safeRankOnCourt: 1,
			liveRankOnCourt: 1,
			liveRoundResults: dummyResults,
			frozenCourtNumbers: new Set(),
			playerId: 29
		});
		// 1sts occupy courts 1–2 after vertical. Current = first of that band (1st),
		// not place(court 8, rank 1) = 29. Safe: land on court 2, then three remaining
		// rounds of relegation → last of court 5 = 20th.
		expect(range.current).toBe(1);
		expect(range.best).toBe(1);
		expect(range.worst).toBe(20);
		expect(range.minCourt).toBe(1);
		expect(range.maxCourt).toBe(5);
	});

	it('court-8 1st stays in the 1sts band when dummy courts leak points but only 2 of 8 are done', () => {
		const sizes = Array(8).fill(4);
		const dummyResults = sizes.map((_, i) => ({
			courtNumber: i + 1,
			standings: [1, 2, 3, 4].map((rank, j) => ({
				playerId: i * 4 + j + 1,
				rank,
				points: i === 7 ? [60, 53, 53, 40][j]! : i === 0 ? [55, 50, 48, 42][j]! : 10,
				diff: i === 7 ? [17, 3, 3, -23][j]! : i === 0 ? [10, 4, 0, -14][j]! : 0,
				matchCount: 3
			}))
		}));
		const range = reachableFinalPlaceRange({
			formatType: 'random-seed',
			currentRound: 1,
			numRounds: 4,
			courtNumber: 8,
			courtSizes: sizes,
			bestRankOnCourt: 1,
			safeRankOnCourt: 1,
			liveRankOnCourt: 1,
			liveRoundResults: dummyResults,
			frozenCourtNumbers: new Set(),
			playerId: 29,
			scoredCourtCount: 2
		});
		expect(range.current).toBe(1);
		expect(range.best).toBe(1);
		expect(range.worst).toBe(20);
		expect(range.minCourt).toBe(1);
		expect(range.maxCourt).toBe(5);
	});
});

describe('playerPlacement', () => {
	const sizes8 = Array(8).fill(4) as number[];

	function dummyRound(
		scored: ReadonlySet<number>,
		opts?: { leakUnscored?: boolean }
	): NonNullable<PlayerPlacementInput['liveRoundResults']> {
		const pointsFor = (courtNumber: number): number[] => {
			if (courtNumber === 8) return [60, 53, 53, 40];
			if (courtNumber === 1) return [55, 50, 48, 42];
			return [15, 13, 12, 12];
		};
		const diffFor = (courtNumber: number): number[] => {
			if (courtNumber === 8) return [17, 3, 3, -23];
			if (courtNumber === 1) return [10, 4, 0, -14];
			return [4, 1, -1, -1];
		};
		return sizes8.map((_, i) => {
			const courtNumber = i + 1;
			const done = scored.has(courtNumber);
			const leak = Boolean(!done && opts?.leakUnscored);
			return {
				courtNumber,
				standings: [1, 2, 3, 4].map((rank, j) => ({
					playerId: i * 4 + j + 1,
					rank,
					points: done ? pointsFor(courtNumber)[j]! : leak ? 10 : 0,
					diff: done ? diffFor(courtNumber)[j]! : 0,
					matchCount: done || leak ? 3 : 0
				}))
			};
		});
	}

	function input(partial: Partial<PlayerPlacementInput> = {}): PlayerPlacementInput {
		return {
			formatType: 'random-seed',
			tournamentStatus: 'active',
			currentRound: 1,
			numRounds: 4,
			roundState: 'court_done',
			courtNumber: 1,
			courtSizes: sizes8,
			courtComplete: true,
			courtsDone: 1,
			courtsTotal: 8,
			bestRankOnCourt: 4,
			safeRankOnCourt: 4,
			liveRankOnCourt: 4,
			liveRoundResults: dummyRound(new Set([1])),
			frozenCourtNumbers: new Set(),
			playerId: 4,
			overallRank: 4,
			totalPlayers: 32,
			...partial
		};
	}

	it('R1 court-done 4th is Currently 25 / Best 13 / Safe 32, not overallRank 4', () => {
		const p = playerPlacement(input());
		expect(p).toMatchObject({
			current: 25,
			best: 13,
			worst: 32,
			total: 32,
			isFinal: false,
			rankCanStillChange: false
		});
	});

	it('R1 court-8 1st is Currently 1 / Safe 20 even when overallRank is seed-court 29', () => {
		const p = playerPlacement(
			input({
				courtNumber: 8,
				bestRankOnCourt: 1,
				safeRankOnCourt: 1,
				liveRankOnCourt: 1,
				courtsDone: 2,
				playerId: 29,
				overallRank: 29,
				liveRoundResults: dummyRound(new Set([1, 8]), { leakUnscored: true })
			})
		);
		expect(p.current).toBe(1);
		expect(p.best).toBe(1);
		expect(p.worst).toBe(20);
		expect(p.minCourt).toBe(1);
		expect(p.maxCourt).toBe(5);
	});

	it('does not use overallRank while the round is still open', () => {
		const p = playerPlacement(
			input({
				roundState: 'active',
				courtComplete: false,
				overallRank: 29
			})
		);
		expect(p.current).toBe(25);
		expect(p.rankCanStillChange).toBe(true);
	});

	it('uses overallRank only after the round is closed', () => {
		const p = playerPlacement(
			input({
				currentRound: 2,
				roundState: 'active',
				courtComplete: false,
				courtsDone: 8,
				courtsTotal: 8,
				bestRankOnCourt: null,
				safeRankOnCourt: null,
				liveRankOnCourt: null,
				liveRoundResults: null,
				overallRank: 12
			})
		);
		expect(p.current).toBe(12);
		expect(p.rankCanStillChange).toBe(true);
	});

	it('not_started has no current place', () => {
		const p = playerPlacement(
			input({
				tournamentStatus: 'setup',
				currentRound: 0,
				roundState: 'not_started',
				courtNumber: null,
				courtSizes: [],
				courtComplete: false,
				courtsDone: 0,
				courtsTotal: 0,
				bestRankOnCourt: null,
				safeRankOnCourt: null,
				liveRankOnCourt: null,
				liveRoundResults: null,
				overallRank: null,
				totalPlayers: 16
			})
		);
		expect(p.current).toBeNull();
		expect(p.best).toBe(1);
		expect(p.worst).toBe(16);
		expect(p.isFinal).toBe(false);
		expect(p.rankCanStillChange).toBe(false);
	});

	it('completed is final', () => {
		const p = playerPlacement(
			input({
				tournamentStatus: 'completed',
				currentRound: 4,
				roundState: 'completed',
				courtsDone: 8,
				courtsTotal: 8,
				overallRank: 3
			})
		);
		expect(p.isFinal).toBe(true);
		expect(p.rankCanStillChange).toBe(false);
	});
});

describe('neighborSeparatingFactor', () => {
	it('uses points when the player below has fewer points, not seed', () => {
		expect(
			neighborSeparatingFactor(
				{ points: 12.33, diff: -1, decidingFactor: 'initial_order' },
				{ points: 11.75, diff: -2.25, decidingFactor: 'round_points' }
			)
		).toBe('round_points');
	});

	it('uses the neighbor pair factor when points look tied but seed was a different group', () => {
		expect(
			neighborSeparatingFactor(
				{ points: 12.33, diff: -1, decidingFactor: 'initial_order' },
				{ points: 12.33, diff: -1, decidingFactor: 'round_points' }
			)
		).toBe('round_points');
	});

	it('uses the shared deciding factor when points and diff match', () => {
		expect(
			neighborSeparatingFactor(
				{ points: 12.33, diff: -1, decidingFactor: 'initial_order' },
				{ points: 12.33, diff: -1, decidingFactor: 'initial_order' }
			)
		).toBe('initial_order');
	});

	it('uses rawPoints when averaged points match but sums do not', () => {
		expect(
			neighborSeparatingFactor(
				{ points: 12, diff: -1, rawPoints: 37, decidingFactor: 'initial_order' },
				{ points: 12, diff: -1, rawPoints: 35, decidingFactor: 'initial_order' }
			)
		).toBe('round_points');
	});
});

describe('check-in helpers', () => {
	it('shouldAutoCheckIn requires unused check-in and non-organizer', () => {
		const t = { status: 'setup', orgId: 'org' };
		const p = { checkedInAt: null, checkInSource: null };
		expect(shouldAutoCheckIn(t, p, null)).toBe(true);
		expect(shouldAutoCheckIn(t, p, 'org')).toBe(false);
		expect(shouldAutoCheckIn({ ...t, status: 'completed' }, p, null)).toBe(false);
		expect(shouldAutoCheckIn(t, { checkedInAt: new Date(), checkInSource: 'org' }, null)).toBe(
			false
		);
	});

	it('checkInWasUsed looks at closedAt or any source', () => {
		expect(checkInWasUsed([{ checkedInAt: null, checkInSource: null }], null)).toBe(false);
		expect(checkInWasUsed([{ checkedInAt: new Date(), checkInSource: 'scan' }], null)).toBe(true);
		expect(checkInWasUsed([], new Date())).toBe(true);
	});
});
