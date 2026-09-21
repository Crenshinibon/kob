import crypto from 'crypto';
import {
	assignSeedRanks,
	calculateCourtSizes,
	MIN_TOURNAMENT_PLAYERS,
	type FormatType
} from '$lib/tournament-logic';

export type StartPlan = {
	courtSizes: number[];
	numRounds: number;
	rankedPlayers: { id: number; seedPoints: number | null; seedRank: number }[];
};

export class StartTournamentError extends Error {
	constructor(
		public readonly code: 'min_players' | 'max_players' | 'not_setup' | 'conflict' | 'not_found',
		public readonly entered?: number
	) {
		super(code);
	}
}

export function newPlayerToken(): string {
	return crypto.randomBytes(16).toString('hex');
}

export function planTournamentStart(opts: {
	formatType: FormatType;
	players: readonly { id: number; seedPoints: number | null }[];
	storedNumRounds: number;
}): StartPlan {
	const playerCount = opts.players.length;
	if (playerCount < MIN_TOURNAMENT_PLAYERS) {
		throw new StartTournamentError('min_players', playerCount);
	}
	if (playerCount > 64) {
		throw new StartTournamentError('max_players', playerCount);
	}
	const courtSizes = calculateCourtSizes(playerCount);
	const courtCount = courtSizes.length;
	let numRounds: number;
	if (courtCount === 1) {
		numRounds = 1;
	} else {
		numRounds = Math.min(10, Math.max(1, opts.storedNumRounds));
	}
	return {
		courtSizes,
		numRounds,
		rankedPlayers: assignSeedRanks(opts.players)
	};
}
