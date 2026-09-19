import { describe, expect, it } from 'vitest';
import { calculateRoundCount } from './tournament-logic';
import { newPlayerToken, planTournamentStart, StartTournamentError } from './tournament-start';

function players(
	count: number,
	seedPoints: Array<number | null> = []
): { id: number; seedPoints: number | null }[] {
	return Array.from({ length: count }, (_, i) => ({
		id: i + 1,
		seedPoints: seedPoints[i] ?? null
	}));
}

describe('newPlayerToken', () => {
	it('returns 32 hex chars', () => {
		expect(newPlayerToken()).toMatch(/^[0-9a-f]{32}$/);
		expect(newPlayerToken()).not.toBe(newPlayerToken());
	});
});

describe('planTournamentStart', () => {
	it('4–6 players → one court and one round', () => {
		for (const n of [4, 5, 6]) {
			const plan = planTournamentStart({
				formatType: 'random-seed',
				players: players(n),
				storedNumRounds: 4
			});
			expect(plan.courtSizes).toHaveLength(1);
			expect(plan.numRounds).toBe(1);
			expect(plan.rankedPlayers.map((p) => p.seedRank)).toEqual(
				Array.from({ length: n }, (_, i) => i + 1)
			);
		}
	});

	it('7 random-seed default/stored rounds and [4,3] courts', () => {
		const def = planTournamentStart({
			formatType: 'random-seed',
			players: players(7),
			storedNumRounds: 2
		});
		expect(def.courtSizes).toEqual([4, 3]);
		expect(def.numRounds).toBe(2);

		const raised = planTournamentStart({
			formatType: 'random-seed',
			players: players(7),
			storedNumRounds: 10
		});
		expect(raised.numRounds).toBe(10);
	});

	it('random-seed uses stored rounds except one-court force-1', () => {
		const sixteen = planTournamentStart({
			formatType: 'random-seed',
			players: players(16),
			storedNumRounds: 3
		});
		expect(sixteen.courtSizes).toEqual([4, 4, 4, 4]);
		expect(sixteen.numRounds).toBe(3);
	});

	it('preseed derives rounds from court count', () => {
		const four = planTournamentStart({
			formatType: 'preseed',
			players: players(4),
			storedNumRounds: 9
		});
		expect(four.numRounds).toBe(1);

		const sixteen = planTournamentStart({
			formatType: 'preseed',
			players: players(16),
			storedNumRounds: 9
		});
		expect(sixteen.numRounds).toBe(calculateRoundCount(4, 'preseed'));
	});

	it('assigns seedRank by points then list order', () => {
		const plan = planTournamentStart({
			formatType: 'preseed',
			players: players(4, [10, null, 10, 50]),
			storedNumRounds: 1
		});
		expect(plan.rankedPlayers.map((p) => p.id)).toEqual([4, 1, 3, 2]);
		expect(plan.rankedPlayers.map((p) => p.seedRank)).toEqual([1, 2, 3, 4]);
	});

	it('rejects fewer than 4 or more than 64', () => {
		expect(() =>
			planTournamentStart({
				formatType: 'random-seed',
				players: players(3),
				storedNumRounds: 1
			})
		).toThrow(StartTournamentError);
		expect(() =>
			planTournamentStart({
				formatType: 'random-seed',
				players: players(65),
				storedNumRounds: 1
			})
		).toThrow(StartTournamentError);
	});
});
