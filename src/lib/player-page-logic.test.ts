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
	verticalTierCourtRange,
	verticalTierPlaceRange,
	neighborSeparatingFactor,
	shouldAutoCheckIn,
	checkInWasUsed,
	type NumberedMatch
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
		expect(range.best).toBe(17);
		expect(range.worst).toBe(32);
		expect(range.minCourt).toBe(5);
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
		expect(range.best).toBe(14);
		expect(range.worst).toBe(32);
		expect(range.minCourt).toBe(4);
		expect(range.maxCourt).toBe(8);
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

	it('uses the shared deciding factor when points and diff match', () => {
		expect(
			neighborSeparatingFactor(
				{ points: 12.33, diff: -1, decidingFactor: 'initial_order' },
				{ points: 12.33, diff: -1, decidingFactor: 'initial_order' }
			)
		).toBe('initial_order');
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
