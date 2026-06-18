/**
 * Tournament Logic — Immutable State Architecture
 *
 * State machine:
 *   createInitialState(config)  → state (round 0)
 *   addPlayers(state, players) → state (players set)
 *   startRound(state)          → state (round N activated, matches generated)
 *   closeRound(state)          → state (round N saved, round N+1 pre-computed)
 *
 * closeRound saves results and pre-computes NEXT round's assignments.
 * startRound activates those assignments (generates empty match data).
 */

// ============================================================================
// Types
// ============================================================================

export type TournamentId = number;

export type FormatType = 'preseed' | 'random-seed';

export type ScoringMode = 'single-21' | 'best-of-3' | 'custom';

export type TournamentConfig = {
	readonly tournamentId: TournamentId;
	readonly formatType: FormatType;
	readonly playerCount: number;
	readonly courtSizes: readonly number[];
	readonly physicalCourtCount: number;
	readonly scoringMode: ScoringMode;
	readonly pointsToWin: number;
	readonly winBy: number;
	readonly setsToWin: number;
	readonly decidingSetPoints: number;
};

export type Player = {
	readonly id: number;
	readonly name: string;
	readonly seedPoints: number | null;
	readonly seedRank: number | null;
};

export type CourtStandings = {
	readonly playerId: number;
	readonly rank: number;
	readonly points: number;
	readonly diff: number;
	readonly matchCount: number;
};

export type CourtResult = {
	readonly courtNumber: number;
	readonly standings: readonly CourtStandings[];
};

export type CourtAssignment = {
	readonly courtNumber: number;
	readonly playerIds: readonly number[];
};

export type MatchData = {
	readonly teamAScore: number | null;
	readonly teamBScore: number | null;
	readonly teamAPlayer1Id: number;
	readonly teamAPlayer2Id: number;
	readonly teamBPlayer1Id: number;
	readonly teamBPlayer2Id: number;
	readonly isCanceled?: boolean;
	readonly injuredPlayerIds?: readonly number[];
};

export type TournamentState = {
	readonly config: TournamentConfig;
	readonly players: readonly Player[];

	// How many rounds have been fully saved (0 = none yet)
	readonly roundsCompleted: number;

	// Total rounds for this tournament
	readonly totalRounds: number;

	// Tournament fully completed
	readonly isComplete: boolean;

	// Saved round results (index 0 = round 1)
	readonly completedRounds: readonly CourtResult[][];

	// Active round number (0 = not started, 1..N = active)
	readonly currentRound: number;

	// Current round's court assignments
	readonly currentAssignments: readonly CourtAssignment[];

	// Next round's pre-computed assignments (set by closeRound, consumed by startRound)
	readonly nextAssignments: readonly CourtAssignment[];

	// Current round's match data
	readonly currentMatches: readonly (MatchData | undefined)[];
};

// ============================================================================
// Court Configuration
// ============================================================================

export function getCourtConfiguration(playerCount: number): {
	totalCourts: number;
	standardCourts: number;
	bottomCourtSize: number | null;
} {
	if (playerCount < 8) throw new Error(`Player count must be at least 8, got ${playerCount}`);
	if (playerCount > 64) throw new Error(`Player count must be at most 64, got ${playerCount}`);

	const leftover = playerCount % 4;
	if (leftover === 0)
		return { totalCourts: playerCount / 4, standardCourts: playerCount / 4, bottomCourtSize: null };

	const bottomSize = leftover === 1 ? 5 : leftover === 2 ? 6 : 3;
	const standard = (playerCount - bottomSize) / 4;
	return { totalCourts: standard + 1, standardCourts: standard, bottomCourtSize: bottomSize };
}

export function calculateCourtSizes(playerCount: number): number[] {
	const { standardCourts, bottomCourtSize } = getCourtConfiguration(playerCount);
	const sizes: number[] = [];
	for (let i = 0; i < standardCourts; i++) sizes.push(4);
	if (bottomCourtSize !== null) sizes.push(bottomCourtSize);
	if (sizes.reduce((a, b) => a + b, 0) !== playerCount) {
		throw new Error(`Court sizes don't sum to ${playerCount}`);
	}
	return sizes;
}

// ============================================================================
// Round Count
// ============================================================================

export function calculateRoundCount(courtCount: number, formatType: FormatType): number {
	if (courtCount < 2) throw new Error(`Court count must be at least 2, got ${courtCount}`);
	if (formatType === 'preseed') return Math.floor(Math.log2(courtCount - 1)) + 2;
	return 4;
}

// ============================================================================
// Tournament Initialization
// ============================================================================

export type CreateTournamentOpts = {
	tournamentId: TournamentId;
	formatType: FormatType;
	playerCount: number;
	numRounds?: number;
	physicalCourtCount?: number;
	scoringMode?: ScoringMode;
	pointsToWin?: number;
	winBy?: number;
	setsToWin?: number;
	decidingSetPoints?: number;
};

export function createInitialState(opts: CreateTournamentOpts): TournamentState {
	const {
		tournamentId,
		formatType,
		playerCount,
		numRounds,
		physicalCourtCount = 4,
		scoringMode = 'single-21',
		pointsToWin = 21,
		winBy = 2,
		setsToWin = 1,
		decidingSetPoints = 15
	} = opts;
	if (playerCount < 8 || playerCount > 64)
		throw new Error(`Player count must be 8-64, got ${playerCount}`);
	const courtSizes = calculateCourtSizes(playerCount);
	return {
		config: {
			tournamentId,
			formatType,
			playerCount,
			courtSizes,
			physicalCourtCount: Math.min(physicalCourtCount, courtSizes.length),
			scoringMode,
			pointsToWin,
			winBy,
			setsToWin,
			decidingSetPoints
		},
		players: [],
		roundsCompleted: 0,
		currentRound: 0,
		totalRounds: numRounds ?? calculateRoundCount(courtSizes.length, formatType),
		isComplete: false,
		completedRounds: [],
		currentAssignments: [],
		nextAssignments: [],
		currentMatches: []
	};
}

export function addPlayers(state: TournamentState, playerList: readonly Player[]): TournamentState {
	if (state.roundsCompleted > 0) throw new Error('Cannot add players after tournament started');
	if (playerList.length !== state.config.playerCount) {
		throw new Error(`Expected ${state.config.playerCount} players, got ${playerList.length}`);
	}
	return { ...state, players: playerList };
}

// ============================================================================
// startRound
// ============================================================================

export function startRound(state: TournamentState): TournamentState {
	if (state.isComplete) throw new Error('Tournament is already complete');
	const nextRound = state.roundsCompleted + 1;

	// Round 1: generate from players
	if (nextRound === 1) {
		if (state.players.length === 0) throw new Error('Call addPlayers() first.');
		const assignments =
			state.config.formatType === 'preseed'
				? generatePreseedRound1(state.config.courtSizes, state.players)
				: generateRandomRound1(state.config.courtSizes, state.players);
		return {
			...state,
			currentRound: 1,
			currentAssignments: assignments,
			currentMatches: assignments.map((a) => genMatchForAssignment(state.config.courtSizes, a))
		};
	}

	// Subsequent rounds: use pre-computed assignments from closeRound
	if (state.nextAssignments.length === 0) throw new Error('Call closeRound first.');
	return {
		...state,
		currentRound: nextRound,
		currentAssignments: state.nextAssignments,
		currentMatches: state.nextAssignments.map((a) =>
			genMatchForAssignment(state.config.courtSizes, a)
		),
		nextAssignments: [],
		isComplete: nextRound >= state.totalRounds
	};
}

// ============================================================================
// Snake Distribution
// ============================================================================

function snakeDistribute(items: number[], courtSizes: readonly number[]): CourtAssignment[] {
	const courtCount = courtSizes.length;
	const stdCourts = courtSizes.filter((s) => s === 4).length;
	const courts = Array.from({ length: courtCount }, (_, i) => ({
		courtNumber: i + 1,
		playerIds: [] as number[]
	}));

	for (let pos = 0; pos < 4; pos++) {
		const fwd = pos % 2 === 0;
		for (let c = 0; c < stdCourts; c++) {
			const idx = fwd ? c : stdCourts - 1 - c;
			const ii = pos * stdCourts + c;
			if (ii < items.length) courts[idx].playerIds.push(items[ii]);
		}
	}

	const leftover = items.slice(stdCourts * 4);
	if (leftover.length) courts[courtCount - 1].playerIds.push(...leftover);
	return courts;
}

function generatePreseedRound1(
	courtSizes: readonly number[],
	players: readonly Player[]
): CourtAssignment[] {
	const sorted = [...players].sort((a, b) => {
		if (a.seedPoints !== null && b.seedPoints !== null) return b.seedPoints - a.seedPoints;
		if (a.seedPoints !== null) return -1;
		if (b.seedPoints !== null) return 1;
		return a.id - b.id;
	});
	return snakeDistribute(
		sorted.map((p) => p.id),
		courtSizes
	);
}

function generateRandomRound1(
	courtSizes: readonly number[],
	players: readonly Player[]
): CourtAssignment[] {
	const items = players.map((p) => p.id);
	for (let i = items.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[items[i], items[j]] = [items[j], items[i]];
	}
	return snakeDistribute(items, courtSizes);
}

// ============================================================================
// Preseed Recursive Splitting
// ============================================================================

function splitSize(n: number): number {
	if (n <= 1) return 0;
	const p = 1 << Math.floor(Math.log2(n));
	return p === n ? n / 2 : p;
}

export { splitSize };

// ============================================================================
// Frozen Courts (Preseed)
// ============================================================================

export type FrozenCourt = {
	courtNumber: number;
	freezeAfterRound: number;
};

/**
 * For preseed format, determines which courts are "frozen" — single-court bracket
 * leaves that have completed a round-robin and no longer need to play.
 *
 * Simulates the preseed bracket tree using splitSize() and tracks when each
 * court becomes a leaf node. A court freezes after the round where it first
 * appears as a single-court bracket.
 *
 * @param courtSizes Current court size configuration (only used for length)
 * @param roundsCompleted Number of completed rounds (1-indexed)
 * @param formatType Tournament format; only 'preseed' produces frozen courts
 * @returns Array of frozen courts with their freeze round
 */
export function getFrozenCourts(
	courtSizes: readonly number[],
	roundsCompleted: number,
	formatType: FormatType
): FrozenCourt[] {
	if (formatType !== 'preseed') return [];
	if (roundsCompleted < 2) return [];

	const totalCourts = courtSizes.length;
	if (totalCourts < 3) return [];

	const frozen: FrozenCourt[] = [];
	const frozenSet = new Set<number>();

	// Simulate bracket tree from round 1 forward
	let brackets: number[][] = [Array.from({ length: totalCourts }, (_, i) => i + 1)];

	for (let round = 1; round <= roundsCompleted; round++) {
		const nextBrackets: number[][] = [];

		for (const bracket of brackets) {
			if (bracket.length <= 1) {
				continue;
			}

			const w = splitSize(bracket.length);
			const winnerCourts = bracket.slice(0, w);
			const loserCourts = bracket.slice(w);

			if (winnerCourts.length === 1 && !frozenSet.has(winnerCourts[0])) {
				frozen.push({ courtNumber: winnerCourts[0], freezeAfterRound: round + 1 });
				frozenSet.add(winnerCourts[0]);
			} else if (winnerCourts.length > 1) {
				nextBrackets.push(winnerCourts);
			}

			if (loserCourts.length === 1 && !frozenSet.has(loserCourts[0])) {
				frozen.push({ courtNumber: loserCourts[0], freezeAfterRound: round + 1 });
				frozenSet.add(loserCourts[0]);
			} else if (loserCourts.length > 1) {
				nextBrackets.push(loserCourts);
			}
		}

		brackets = nextBrackets;
		if (brackets.length === 0) break;
	}

	return frozen
		.filter((f) => f.freezeAfterRound <= roundsCompleted)
		.sort((a, b) => a.freezeAfterRound - b.freezeAfterRound || a.courtNumber - b.courtNumber);
}

type PlayerWithOrigin = {
	playerId: number;
	originCourt: number;
	points: number;
	diff: number;
};

/**
 * Flat redistribution: builds global tiers by finish position, splits by splitSize,
 * then distributes each group with origin-mixing (no same-origin 1st+2nd on same court).
 *
 * This is called per-bracket-group by processPreseedTransition.
 * For the first transition (all courts equal), it handles origin mixing.
 * For subsequent transitions (sub-brackets), the within-bracket tier split already
 * ensures origin mixing is inherent (all 1sts from different origin courts go to
 * different sub-brackets).
 */
export function redistributePreseedRecursive(
	courtResults: readonly CourtResult[],
	courtSizes?: readonly number[]
): CourtAssignment[] {
	const sorted = [...courtResults].sort((a, b) => a.courtNumber - b.courtNumber);
	const N = sorted.length;
	if (N === 0) return [];

	const sizes = courtSizes ?? Array(N).fill(4);

	if (N === 1) return [{ courtNumber: 1, playerIds: sorted[0].standings.map((s) => s.playerId) }];

	// Build tiers grouped by finish position across ALL input courts
	const maxRank = Math.max(...sorted.map((c) => c.standings.length));
	const tiers: PlayerWithOrigin[][] = [];

	for (let rank = 0; rank < maxRank; rank++) {
		const tier: PlayerWithOrigin[] = [];
		for (const c of sorted) {
			const s = c.standings[rank];
			if (s) {
				tier.push({
					playerId: s.playerId,
					originCourt: c.courtNumber,
					points: s.points,
					diff: s.diff
				});
			}
		}
		tier.sort((a, b) => b.points - a.points || b.diff - a.diff || a.playerId - b.playerId);
		tiers.push(tier);
	}

	// Flatten by finish tier: all 1sts, then all 2nds, then all 3rds, then all 4ths
	const allPlayers = tiers.flat();

	// Split into winner and loser brackets
	const W = splitSize(N);
	const winnerSizes = sizes.slice(0, W);
	const loserSizes = sizes.slice(W);
	const totalWinnerSlots = winnerSizes.reduce((s, sz) => s + sz, 0);

	const winnerPlayers = allPlayers.slice(0, totalWinnerSlots);
	const loserPlayers = allPlayers.slice(totalWinnerSlots);

	const assignments: CourtAssignment[] = [];
	let courtNumber = 1;

	if (winnerPlayers.length > 0) {
		const w = distributeGroup(winnerPlayers, winnerSizes);
		for (const pids of w) {
			assignments.push({ courtNumber: courtNumber++, playerIds: pids });
		}
	}

	if (loserPlayers.length > 0) {
		const l = distributeGroup(loserPlayers, loserSizes);
		for (const pids of l) {
			assignments.push({ courtNumber: courtNumber++, playerIds: pids });
		}
	}

	return assignments;
}

/**
 * Distribute players into a set of courts, avoiding same-origin pairs.
 * This is a flat distribution (no recursive bracket splitting).
 * Each court gets its specified size.
 */
function distributeGroup(players: PlayerWithOrigin[], courtSizes: number[]): number[][] {
	const courtCount = courtSizes.length;
	if (courtCount <= 1) return [players.map((p) => p.playerId)];

	const slots = courtSizes.map(() => ({ playerIds: [] as number[], origins: new Set<number>() }));

	for (const p of players) {
		let best = -1;
		let minLoad = Infinity;

		for (let i = 0; i < courtCount; i++) {
			if (slots[i].playerIds.length >= courtSizes[i]) continue;
			if (slots[i].origins.has(p.originCourt)) continue;
			if (slots[i].playerIds.length < minLoad) {
				minLoad = slots[i].playerIds.length;
				best = i;
			}
		}

		if (best === -1) {
			minLoad = Infinity;
			for (let i = 0; i < courtCount; i++) {
				if (slots[i].playerIds.length >= courtSizes[i]) continue;
				if (slots[i].playerIds.length < minLoad) {
					minLoad = slots[i].playerIds.length;
					best = i;
				}
			}
		}

		if (best === -1) {
			minLoad = Infinity;
			for (let i = 0; i < courtCount; i++) {
				if (slots[i].playerIds.length < minLoad) {
					minLoad = slots[i].playerIds.length;
					best = i;
				}
			}
		}

		slots[best].playerIds.push(p.playerId);
		slots[best].origins.add(p.originCourt);
	}

	return slots.map((s) => s.playerIds);
}

function advanceBracketTree(brackets: readonly number[][]): number[][] {
	const nextBrackets: number[][] = [];
	for (const bracket of brackets) {
		if (bracket.length <= 1) continue;
		const w = splitSize(bracket.length);
		const winnerCourts = bracket.slice(0, w);
		const loserCourts = bracket.slice(w);
		if (winnerCourts.length > 1) nextBrackets.push(winnerCourts);
		if (loserCourts.length > 1) nextBrackets.push(loserCourts);
	}
	return nextBrackets;
}

/**
 * Bracket groups that subdivide together this transition. After R1→R2 the global
 * split is applied once; each further round advances the tree one level.
 */
export function getBracketGroups(totalCourts: number, roundsCompleted: number): number[][] {
	return getSubdivisionPlan(totalCourts, roundsCompleted);
}

function getSubdivisionPlan(totalCourts: number, roundsCompleted: number): number[][] {
	let brackets: number[][] = [Array.from({ length: totalCourts }, (_, i) => i + 1)];

	if (totalCourts > 2) {
		brackets = advanceBracketTree(brackets);
	}

	for (let i = 1; i < roundsCompleted; i++) {
		brackets = advanceBracketTree(brackets);
	}

	return brackets;
}

function subdivideBracketGroup(
	courtNumbers: readonly number[],
	resultMap: ReadonlyMap<number, CourtResult>,
	sizes: readonly number[]
): readonly { playerIds: readonly number[] }[] {
	const courtResults = courtNumbers.map((n) => resultMap.get(n)!);
	const groupSizes = courtNumbers.map((n) => sizes[n - 1] ?? 4);
	return redistributePreseedRecursive(courtResults, groupSizes).map((a) => ({
		playerIds: a.playerIds
	}));
}

function processSubsequentPreseedSplit(
	courtResults: readonly CourtResult[],
	courtSizes: readonly number[],
	totalCourts: number,
	roundsCompleted: number
): CourtAssignment[] {
	const sorted = [...courtResults].sort((a, b) => a.courtNumber - b.courtNumber);
	const resultMap = new Map(sorted.map((c) => [c.courtNumber, c]));
	const plan = getSubdivisionPlan(totalCourts, roundsCompleted);
	const activeCourts = new Set(plan.flat());

	const assignments: CourtAssignment[] = [];
	let courtNumber = 1;

	for (const group of plan) {
		const groupAssignments = subdivideBracketGroup(group, resultMap, courtSizes);
		for (const a of groupAssignments) {
			assignments.push({ courtNumber: courtNumber++, playerIds: [...a.playerIds] });
		}
	}

	for (const c of sorted) {
		if (!activeCourts.has(c.courtNumber)) {
			assignments.push({
				courtNumber: courtNumber++,
				playerIds: c.standings.map((s) => s.playerId)
			});
		}
	}

	return assignments;
}

/**
 * Preseed redistribution between rounds.
 *
 * Every split uses the same algorithm: global finish-position tiers across the
 * bracket group, `splitSize(N)` winner/loser court split, then origin-mixing
 * within each half. R1→R2 applies this to all courts; later rounds apply it
 * independently to each bracket subtree. Frozen overflow courts are unchanged.
 */
export function processPreseedTransition(
	courtResults: readonly CourtResult[],
	courtSizes: readonly number[],
	roundsCompleted: number,
	totalCourts: number = courtSizes.length
): CourtAssignment[] {
	const sorted = [...courtResults].sort((a, b) => a.courtNumber - b.courtNumber);
	if (sorted.length === 0) return [];
	if (sorted.length === 1)
		return [{ courtNumber: 1, playerIds: sorted[0].standings.map((s) => s.playerId) }];

	if (roundsCompleted === 0) {
		return redistributePreseedRecursive(sorted, courtSizes);
	}

	return processSubsequentPreseedSplit(sorted, courtSizes, totalCourts, roundsCompleted);
}

// ============================================================================
// Vertical Seeding
// ============================================================================

export function verticalSeeding(
	courtResults: readonly CourtResult[],
	targetCourtCount: number,
	courtSizes?: readonly number[]
): CourtAssignment[] {
	const sorted = [...courtResults].sort((a, b) => a.courtNumber - b.courtNumber);
	const maxRank = sorted.reduce((m, c) => Math.max(m, c.standings.length), 0);

	const flattened: number[] = [];

	for (let r = 0; r < maxRank; r++) {
		const tier: { playerId: number; points: number; diff: number }[] = [];
		for (const c of sorted) {
			const s = c.standings[r];
			if (s) tier.push({ playerId: s.playerId, points: s.points, diff: s.diff });
		}
		tier.sort((a, b) => b.points - a.points || b.diff - a.diff || a.playerId - b.playerId);
		for (const t of tier) flattened.push(t.playerId);
	}

	const assignments: CourtAssignment[] = [];
	let idx = 0;

	for (let c = 0; c < targetCourtCount; c++) {
		const targetSize = courtSizes?.[c] ?? 4;
		const pids = flattened.slice(idx, idx + targetSize);
		idx += targetSize;
		if (pids.length > 0) assignments.push({ courtNumber: c + 1, playerIds: pids });
	}
	return assignments;
}

// ============================================================================
// Ladder Redistribution (2-up/2-down)
// ============================================================================

export function ladderRedistribute(
	courtResults: readonly CourtResult[],
	targetCourtCount: number,
	courtSizes?: readonly number[]
): CourtAssignment[] {
	const sorted = [...courtResults].sort((a, b) => a.courtNumber - b.courtNumber);
	const sizes = courtSizes ?? Array(targetCourtCount).fill(4);
	const assignments: CourtAssignment[] = [];

	for (let i = 0; i < targetCourtCount; i++) {
		const targetSize = sizes[i];
		const pids: number[] = [];

		if (i === 0) {
			takeN(sorted[0], 0, 2, pids);
			if (sorted[1]) takeN(sorted[1], 0, 2, pids);
		} else if (i === targetCourtCount - 1) {
			if (sorted[i - 1]) {
				const bottomFrom = Math.max(0, sorted[i - 1].standings.length - 2);
				takeN(sorted[i - 1], bottomFrom, sorted[i - 1].standings.length, pids);
			}
			takeN(sorted[i], 2, sorted[i].standings.length, pids);
		} else {
			if (sorted[i - 1]) {
				const bottomFrom = Math.max(0, sorted[i - 1].standings.length - 2);
				takeN(sorted[i - 1], bottomFrom, sorted[i - 1].standings.length, pids);
			}
			if (sorted[i + 1]) takeN(sorted[i + 1], 0, 2, pids);
		}

		const trimmedPids = pids.slice(0, targetSize);

		if (trimmedPids.length > 0) assignments.push({ courtNumber: i + 1, playerIds: trimmedPids });
	}
	return assignments;
}

function takeN(court: CourtResult, from: number, to: number, target: number[]): void {
	for (let i = from; i < Math.min(to, court.standings.length); i++)
		target.push(court.standings[i].playerId);
}

export function redistributeLadder(
	courtResults: readonly CourtResult[],
	isFirstRound: boolean,
	courtCount: number,
	courtSizes?: readonly number[]
): CourtAssignment[] {
	if (isFirstRound) return verticalSeeding(courtResults, courtCount, courtSizes);
	return ladderRedistribute(courtResults, courtCount, courtSizes);
}

// ============================================================================
// Standings Calculation
// ============================================================================
// Close Round
// ============================================================================

export function closeRound(
	state: TournamentState,
	overrideCourtSizes?: readonly number[]
): TournamentState {
	if (state.currentRound === 0) throw new Error('No active round to close');
	if (state.currentMatches.length === 0)
		throw new Error('No matches have been generated for this round');
	const scoredCount = state.currentMatches.filter(
		(m): m is MatchData => m !== undefined && m.teamAScore !== null && m.teamBScore !== null
	).length;
	if (scoredCount === 0) throw new Error('No scored matches in this round');

	// Calculate standings for each court
	const courtResults: CourtResult[] = state.currentAssignments.map((assign) => {
		const matches = state.currentMatches.filter(
			(m): m is MatchData =>
				m !== undefined &&
				assign.playerIds.some(
					(pid) =>
						pid === m.teamAPlayer1Id ||
						pid === m.teamAPlayer2Id ||
						pid === m.teamBPlayer1Id ||
						pid === m.teamBPlayer2Id
				)
		);
		return {
			courtNumber: assign.courtNumber,
			standings: calculateCourtStandings(matches, assign.playerIds)
		};
	});

	const updated = [...state.completedRounds, courtResults];
	const nextRound = state.roundsCompleted + 1;

	if (nextRound >= state.totalRounds) {
		return {
			...state,
			completedRounds: updated,
			roundsCompleted: nextRound,
			currentAssignments: [],
			currentMatches: [],
			isComplete: true,
			currentRound: state.currentRound
		};
	}

	// Generate next round assignments using override court sizes if provided
	const courtSizes = overrideCourtSizes ?? state.config.courtSizes;
	const courtCount = courtSizes.length;
	let nextAssignments: CourtAssignment[];
	if (state.config.formatType === 'preseed') {
		nextAssignments = processPreseedTransition(
			courtResults,
			courtSizes,
			state.roundsCompleted,
			state.config.courtSizes.length
		);
	} else if (state.roundsCompleted === 0) {
		nextAssignments = verticalSeeding(courtResults, courtCount, courtSizes);
	} else {
		nextAssignments = ladderRedistribute(courtResults, courtCount, courtSizes);
	}

	return {
		...state,
		completedRounds: updated,
		roundsCompleted: nextRound,
		isComplete: false,
		currentAssignments: [],
		currentMatches: [],
		nextAssignments,
		currentRound: state.currentRound
	};
}

// ============================================================================

export function calculateCourtStandings(
	matches: MatchData[],
	playerIds: readonly number[]
): CourtStandings[] {
	const stats: Record<
		number,
		{ playerId: number; points: number; for: number; against: number; matchCount: number }
	> = {};
	playerIds.forEach((id) => {
		stats[id] = { playerId: id, points: 0, for: 0, against: 0, matchCount: 0 };
	});

	const hasCanceled = matches.some((m) => m.isCanceled);
	const useAverages = hasCanceled || playerIds.length >= 5;

	const injuredSet = new Set<number>();
	matches.forEach((m) => {
		if (m.injuredPlayerIds) {
			for (const pid of m.injuredPlayerIds) injuredSet.add(pid);
		}
	});

	matches.forEach((m) => {
		if (m.isCanceled) return;
		if (m.teamAScore === null || m.teamBScore === null) return;

		const injured = new Set(m.injuredPlayerIds ?? []);

		// Team A players
		for (const pid of [m.teamAPlayer1Id, m.teamAPlayer2Id]) {
			if (!stats[pid]) continue;
			const points = injured.has(pid) ? 0 : m.teamAScore;
			stats[pid].points += points;
			stats[pid].for += m.teamAScore;
			stats[pid].against += m.teamBScore;
			stats[pid].matchCount += 1;
		}

		// Team B players
		for (const pid of [m.teamBPlayer1Id, m.teamBPlayer2Id]) {
			if (!stats[pid]) continue;
			const points = injured.has(pid) ? 0 : m.teamBScore;
			stats[pid].points += points;
			stats[pid].for += m.teamBScore;
			stats[pid].against += m.teamAScore;
			stats[pid].matchCount += 1;
		}
	});

	return Object.values(stats)
		.map((s) => {
			const diff = s.for - s.against;
			if (useAverages && s.matchCount > 0) {
				return {
					...s,
					points: Math.round((s.points / s.matchCount) * 100) / 100,
					diff: Math.round((diff / s.matchCount) * 100) / 100
				};
			}
			return { ...s, diff };
		})
		.sort((a, b) => b.points - a.points || b.diff - a.diff || a.playerId - b.playerId)
		.map((s, i) => ({
			playerId: s.playerId,
			rank: i + 1,
			points: s.points,
			diff: s.diff,
			matchCount: s.matchCount
		}));
}

// ============================================================================
// Match Generation
// ============================================================================

export function generate4pMatches(playerIds: readonly number[]): MatchData[] {
	if (playerIds.length !== 4) throw new Error(`Expected 4 players, got ${playerIds.length}`);
	const [p1, p2, p3, p4] = playerIds;
	return [
		{
			teamAPlayer1Id: p1,
			teamAPlayer2Id: p2,
			teamBPlayer1Id: p3,
			teamBPlayer2Id: p4,
			teamAScore: null,
			teamBScore: null
		},
		{
			teamAPlayer1Id: p1,
			teamAPlayer2Id: p3,
			teamBPlayer1Id: p2,
			teamBPlayer2Id: p4,
			teamAScore: null,
			teamBScore: null
		},
		{
			teamAPlayer1Id: p1,
			teamAPlayer2Id: p4,
			teamBPlayer1Id: p2,
			teamBPlayer2Id: p3,
			teamAScore: null,
			teamBScore: null
		}
	];
}

export function generate3pMatches(playerIds: readonly number[]): MatchData[] {
	if (playerIds.length !== 3) throw new Error(`Expected 3 players, got ${playerIds.length}`);
	const [p1, p2, p3] = playerIds;
	return [
		{
			teamAPlayer1Id: p1,
			teamAPlayer2Id: p2,
			teamBPlayer1Id: p3,
			teamBPlayer2Id: p3,
			teamAScore: null,
			teamBScore: null
		},
		{
			teamAPlayer1Id: p1,
			teamAPlayer2Id: p3,
			teamBPlayer1Id: p2,
			teamBPlayer2Id: p2,
			teamAScore: null,
			teamBScore: null
		},
		{
			teamAPlayer1Id: p2,
			teamAPlayer2Id: p3,
			teamBPlayer1Id: p1,
			teamBPlayer2Id: p1,
			teamAScore: null,
			teamBScore: null
		}
	];
}

function genMatchForAssignment(
	courtSizes: readonly number[],
	assignment: CourtAssignment
): MatchData {
	const idx = assignment.courtNumber - 1;
	const size = courtSizes[idx] ?? 4;
	switch (size) {
		case 3:
			return generate3pMatches(assignment.playerIds)[0];
		case 4:
			return generate4pMatches(assignment.playerIds)[0];
		case 5:
			return generate5pMatches(assignment.playerIds)[0];
		case 6:
			return generate6pMatches(assignment.playerIds)[0];
		default:
			return generate4pMatches(assignment.playerIds)[0];
	}
}

export function generate5pMatches(playerIds: readonly number[]): MatchData[] {
	if (playerIds.length !== 5) throw new Error(`Expected 5 players, got ${playerIds.length}`);
	const [p1, p2, p3, p4, p5] = playerIds;
	// 5p format: 2 runs × 2 parallel games = 4 games
	// Run 1: A+B fixed on side X, C fixed on side Y, D/E rotate
	// Run 2: D+E fixed on side X, B fixed on side Y, A/C rotate
	return [
		// Run 1, Game 1: A+B vs C+D
		{
			teamAPlayer1Id: p1,
			teamAPlayer2Id: p2,
			teamBPlayer1Id: p3,
			teamBPlayer2Id: p4,
			teamAScore: null,
			teamBScore: null
		},
		// Run 1, Game 2: A+B vs C+E (parallel with Game 1, same fixed teams)
		{
			teamAPlayer1Id: p1,
			teamAPlayer2Id: p2,
			teamBPlayer1Id: p3,
			teamBPlayer2Id: p5,
			teamAScore: null,
			teamBScore: null
		},
		// Run 2, Game 3: D+E vs B+A
		{
			teamAPlayer1Id: p4,
			teamAPlayer2Id: p5,
			teamBPlayer1Id: p2,
			teamBPlayer2Id: p1,
			teamAScore: null,
			teamBScore: null
		},
		// Run 2, Game 4: D+E vs B+C (parallel with Game 3, same fixed teams)
		{
			teamAPlayer1Id: p4,
			teamAPlayer2Id: p5,
			teamBPlayer1Id: p2,
			teamBPlayer2Id: p3,
			teamAScore: null,
			teamBScore: null
		}
	];
}

export function generate6pMatches(playerIds: readonly number[]): MatchData[] {
	if (playerIds.length !== 6) throw new Error(`Expected 6 players, got ${playerIds.length}`);
	const [p1, p2, p3, p4, p5, p6] = playerIds;
	// 6p format: 2 runs × 2 parallel games = 4 games
	// Run 1: p1+p2 fixed on side X, p3+p5 and p4+p6 rotate
	// Run 2: p3+p4 fixed on side X, p1+p5 and p2+p6 rotate
	// No partnership repeats across runs. Game count diff ≤ 1 (4 players × 3 games, 2 players × 2 games).
	return [
		// Run 1, Game 1: p1+p2 vs p3+p5
		{
			teamAPlayer1Id: p1,
			teamAPlayer2Id: p2,
			teamBPlayer1Id: p3,
			teamBPlayer2Id: p5,
			teamAScore: null,
			teamBScore: null
		},
		// Run 1, Game 2: p1+p2 vs p4+p6 (parallel with Game 1, same fixed team)
		{
			teamAPlayer1Id: p1,
			teamAPlayer2Id: p2,
			teamBPlayer1Id: p4,
			teamBPlayer2Id: p6,
			teamAScore: null,
			teamBScore: null
		},
		// Run 2, Game 3: p3+p4 vs p1+p5
		{
			teamAPlayer1Id: p3,
			teamAPlayer2Id: p4,
			teamBPlayer1Id: p1,
			teamBPlayer2Id: p5,
			teamAScore: null,
			teamBScore: null
		},
		// Run 2, Game 4: p3+p4 vs p2+p6 (parallel with Game 3, same fixed team)
		{
			teamAPlayer1Id: p3,
			teamAPlayer2Id: p4,
			teamBPlayer1Id: p2,
			teamBPlayer2Id: p6,
			teamAScore: null,
			teamBScore: null
		}
	];
}

export function matchCountForCourtSize(courtSize: number): number {
	switch (courtSize) {
		case 3:
			return 3;
		case 4:
			return 3;
		case 5:
		case 6:
			return 4;
		default:
			throw new Error(`Invalid court size: ${courtSize}`);
	}
}

export function expectedMatchCountForRotations(
	rotations: readonly { courtNumber: number; courtSize: number | null }[],
	defaultCourtSizes: readonly number[]
): number {
	return rotations.reduce((sum, rotation) => {
		const size = rotation.courtSize ?? defaultCourtSizes[rotation.courtNumber - 1] ?? 4;
		return sum + matchCountForCourtSize(size);
	}, 0);
}

export function generateAllMatchesForAssignment(
	assignment: CourtAssignment,
	courtSizes: readonly number[]
): MatchData[] {
	const idx = assignment.courtNumber - 1;
	const size = courtSizes[idx] ?? assignment.playerIds.length;
	switch (size) {
		case 3:
			return generate3pMatches(assignment.playerIds);
		case 4:
			return generate4pMatches(assignment.playerIds);
		case 5:
			return generate5pMatches(assignment.playerIds);
		case 6:
			return generate6pMatches(assignment.playerIds);
		default:
			return generate4pMatches(assignment.playerIds);
	}
}

export function countScoredMatches(courtMatches: readonly (MatchData | undefined)[]): number {
	return courtMatches.filter(
		(m) => m !== undefined && m.teamAScore !== null && m.teamBScore !== null
	).length;
}

// ============================================================================
// Utilities
// ============================================================================

export function getTop2(court: {
	standings: readonly { playerId: number; rank: number }[];
}): number[] {
	return court.standings.filter((s) => s.rank <= 2).map((s) => s.playerId);
}

// ============================================================================
// Scoring Rules
// ============================================================================

export type ScoringOverrides = Record<
	string,
	{ pointsToWin?: number; winBy?: number; setsToWin?: number; decidingSetPoints?: number }
>;

export function getEffectiveScoring(
	courtSize: number,
	config: Pick<TournamentConfig, 'pointsToWin' | 'setsToWin' | 'decidingSetPoints' | 'winBy'>,
	overrides?: ScoringOverrides | null
): { pointsToWin: number; setsToWin: number; decidingSetPoints: number; winBy: number } {
	const key = String(courtSize);
	const ovr = overrides?.[key];
	return {
		pointsToWin: ovr?.pointsToWin ?? config.pointsToWin,
		setsToWin: ovr?.setsToWin ?? config.setsToWin,
		decidingSetPoints: ovr?.decidingSetPoints ?? config.decidingSetPoints,
		winBy: ovr?.winBy ?? config.winBy
	};
}

export function isDecidingSet(setNumber: number, setsToWin: number): boolean {
	return setsToWin >= 2 && setNumber === setsToWin * 2 - 1;
}

export function getMaxSets(setsToWin: number): number {
	return setsToWin >= 2 ? setsToWin * 2 - 1 : 1;
}

export type MatchSetScore = {
	teamAScore: number | null;
	teamBScore: number | null;
	isCanceled: boolean | null;
};

export function isMatchComplete(sets: readonly MatchSetScore[]): boolean {
	if (sets.length === 0) return false;
	if (sets.some((s) => s.isCanceled)) return true;

	const scored = sets.filter((s) => s.teamAScore !== null && s.teamBScore !== null);
	if (scored.length === 0) return false;

	if (sets.length === 1) return true;

	let teamAWins = 0;
	let teamBWins = 0;
	for (const s of scored) {
		if (s.teamAScore! > s.teamBScore!) teamAWins++;
		else if (s.teamBScore! > s.teamAScore!) teamBWins++;
	}
	const needed = Math.ceil(sets.length / 2);
	return teamAWins >= needed || teamBWins >= needed;
}

/**
 * Validates a final score according to beach volleyball rules:
 * - Winner must reach exactly minPoints unless loser is within striking distance (deuce)
 * - Winner must lead by at least winBy
 *
 * @param winnerScore - The winning team's final score
 * @param loserScore - The losing team's final score
 * @param minPoints - Points needed to win a set (e.g., 21 for standard, 15 for deciding/5p)
 * @param winBy - Minimum winning margin (e.g., 2)
 */
export function isValidFinalScore(
	winnerScore: number,
	loserScore: number,
	minPoints: number,
	winBy: number
): boolean {
	if (winnerScore < minPoints) return false;
	if (winnerScore - loserScore < winBy) return false;
	// winBy=1: no deuce possible, game always ends at exactly minPoints
	if (winBy === 1) return winnerScore === minPoints;
	// If loser is not within striking distance, winner must be exactly minPoints
	if (loserScore < minPoints - winBy + 1) {
		return winnerScore === minPoints;
	}
	// Deuce: winner must have exactly loser_score + winBy
	return winnerScore === loserScore + winBy;
}

export function getMinPointsForSet(
	setNumber: number,
	courtSize: number,
	config: Pick<TournamentConfig, 'pointsToWin' | 'setsToWin' | 'decidingSetPoints' | 'winBy'>,
	overrides?: ScoringOverrides | null
): number {
	const effective = getEffectiveScoring(courtSize, config, overrides);
	if (effective.setsToWin >= 2) {
		return isDecidingSet(setNumber, effective.setsToWin)
			? effective.decidingSetPoints
			: effective.pointsToWin;
	}
	if (courtSize >= 5) {
		return effective.pointsToWin === 21 ? 15 : effective.pointsToWin;
	}
	return effective.pointsToWin;
}

export function getScoringLabel(
	config: Pick<TournamentConfig, 'pointsToWin' | 'setsToWin' | 'decidingSetPoints' | 'winBy'>,
	courtSize: number,
	overrides?: ScoringOverrides | null
): string {
	const effective = getEffectiveScoring(courtSize, config, overrides);
	if (effective.setsToWin >= 2) {
		return `Best of ${effective.setsToWin} (${effective.pointsToWin}pt, deciding: ${effective.decidingSetPoints}pt)`;
	}
	const minPoints =
		courtSize >= 5
			? effective.pointsToWin === 21
				? 15
				: effective.pointsToWin
			: effective.pointsToWin;
	return `1 set to ${minPoints}`;
}

// ============================================================================
// Duration Estimation
// ============================================================================

export type DurationConfig = {
	readonly setupTimeMinutes: number;
	readonly transitionTimeMinutes: number;
	readonly avgRallyDurationSeconds: number;
	readonly timeBetweenRalliesSeconds: number;
	readonly timeBetweenMatchesMinutes: number;
};

export function estimateCourtDurationMinutes(
	courtSize: number,
	pointsToWin: number,
	setsToWin: number,
	durationConfig: DurationConfig
): number {
	const courtPointTarget = courtSize >= 5 ? 15 : pointsToWin;
	const courtGameTime = 18 * (courtPointTarget / 21);

	let matches: number;
	switch (courtSize) {
		case 3:
			matches = 3;
			break;
		case 4:
			matches = 3;
			break;
		case 5:
			matches = 4;
			break;
		case 6:
			matches = 4;
			break;
		default:
			matches = 3;
	}

	const perGame = courtSize === 3 ? courtGameTime * 0.8 : courtGameTime;
	const matchFactor = setsToWin >= 2 ? 1.4 : 1;
	return Math.round(
		(matches * perGame + (matches - 1) * durationConfig.timeBetweenMatchesMinutes) * matchFactor
	);
}

export function estimateRoundDurationMinutes(
	courtSizes: readonly number[],
	pointsToWin: number,
	setsToWin: number,
	durationConfig: DurationConfig
): number {
	if (courtSizes.length === 0) return 0;
	let max = 0;
	for (const size of courtSizes) {
		const d = estimateCourtDurationMinutes(size, pointsToWin, setsToWin, durationConfig);
		if (d > max) max = d;
	}
	return max;
}

export function estimateTournamentDuration(
	totalRounds: number,
	courtSizes: readonly number[],
	physicalCourtCount: number,
	pointsToWin: number,
	setsToWin: number,
	durationConfig: DurationConfig
): {
	total: number;
	setup: number;
	rounds: number[];
	transitions: number;
	breakdown: string;
} {
	const setup = durationConfig.setupTimeMinutes;
	const shiftsPerRound = Math.ceil(courtSizes.length / physicalCourtCount);
	const roundDur = estimateRoundDurationMinutes(courtSizes, pointsToWin, setsToWin, durationConfig);
	const adjustedRound = shiftsPerRound * roundDur;

	const rounds: number[] = [];
	for (let r = 0; r < totalRounds; r++) rounds.push(adjustedRound);

	const transitionCount = totalRounds - 1;
	const transitions = transitionCount * durationConfig.transitionTimeMinutes;
	const total = setup + rounds.reduce((a, b) => a + b, 0) + transitions;

	return {
		total,
		setup,
		rounds,
		transitions,
		breakdown: `Setup: ${setup} min, ${totalRounds} rounds x ${adjustedRound} min, ${transitionCount} transitions x ${durationConfig.transitionTimeMinutes} min`
	};
}

// ============================================================================
// Shift Scheduling & Wait Time
// ============================================================================

export function getBatchShifts(virtualCourtCount: number, physicalCourtCount: number): number[][] {
	const shifts: number[][] = [];
	const queue: number[] = [];
	for (let i = virtualCourtCount; i >= 1; i--) queue.push(i);

	while (queue.length > 0) {
		const shift: number[] = [];
		for (let i = 0; i < physicalCourtCount && queue.length > 0; i++) {
			shift.push(queue.pop()!);
		}
		shifts.push(shift);
	}
	return shifts;
}

export function getShiftForCourt(
	virtualCourtNumber: number,
	shifts: number[][]
): { shift: number; total: number } {
	for (let i = 0; i < shifts.length; i++) {
		if (shifts[i].includes(virtualCourtNumber)) return { shift: i + 1, total: shifts.length };
	}
	return { shift: 0, total: shifts.length };
}

export function estimateWaitTimeMinutes(
	shiftIndex: number,
	totalShifts: number,
	roundDurationMinutes: number,
	transitionTimeMinutes: number
): number {
	const remaining = totalShifts - shiftIndex;
	return remaining * roundDurationMinutes + remaining * transitionTimeMinutes;
}

export function formatDuration(totalMinutes: number): string {
	const h = Math.floor(totalMinutes / 60);
	const m = totalMinutes % 60;
	if (h > 0) return `~${h}h ${m}min`;
	return `~${m}min`;
}

// ============================================================================
// Player Retirement
// ============================================================================

export function recalculateCourtConfigAfterRetirement(newPlayerCount: number): {
	courtSizes: number[];
	totalCourts: number;
} {
	if (newPlayerCount < 3) return { courtSizes: [newPlayerCount], totalCourts: 1 };
	const leftover = newPlayerCount % 4;
	if (leftover === 0) {
		const count = newPlayerCount / 4;
		return { courtSizes: Array(count).fill(4), totalCourts: count };
	}
	const bottomSize = leftover === 1 ? 5 : leftover === 2 ? 6 : 3;
	const standard = (newPlayerCount - bottomSize) / 4;
	const sizes: number[] = [];
	for (let i = 0; i < standard; i++) sizes.push(4);
	sizes.push(bottomSize);
	return { courtSizes: sizes, totalCourts: standard + 1 };
}

export function getPreseedBracketRange(
	currentCourt: number,
	totalCourts: number
): { min: number; max: number } {
	const allCourts = Array.from({ length: totalCourts }, (_, i) => i + 1);
	const w = splitSize(totalCourts);
	const winnerCourts = allCourts.slice(0, w);
	const winnerMax = winnerCourts.length * 4;

	if (winnerCourts.includes(currentCourt)) {
		return { min: 1, max: winnerMax };
	}
	return { min: winnerMax + 1, max: totalCourts * 4 };
}

export function calculateRetiredStanding(
	currentCourt: number,
	totalCourts: number,
	currentRound: number,
	totalRounds: number,
	formatType: FormatType,
	courtSizes: readonly number[],
	bracketRange?: { min: number; max: number }
): number {
	if (formatType === 'preseed') {
		if (!bracketRange) {
			bracketRange = getPreseedBracketRange(currentCourt, totalCourts);
		}
		return bracketRange.max;
	}

	const remainingRounds = totalRounds - currentRound;
	const worstCourt = Math.min(currentCourt + remainingRounds, totalCourts);
	let place = 0;
	for (let i = 0; i < worstCourt - 1; i++) {
		place += courtSizes[i] ?? 4;
	}
	const lastCourtSize = courtSizes[worstCourt - 1] ?? 4;
	return place + lastCourtSize;
}

export function getFinalRoundCourtConfig(
	courtSizes: readonly number[],
	playerIdsByCourt: readonly number[][]
): {
	courtSizes: number[];
	eliminatedPlayerIds: number[];
} {
	const playerCount = courtSizes.reduce((a, b) => a + b, 0);

	if (playerCount <= 4) {
		return { courtSizes: [...courtSizes], eliminatedPlayerIds: [] };
	}

	// Top court must be exactly 4 players in the final round
	const topCourtPlayerIds = playerIdsByCourt[0] ?? [];
	if (playerCount === 5 || playerCount === 6) {
		const eliminated = topCourtPlayerIds.slice(4);
		return {
			courtSizes: [4],
			eliminatedPlayerIds: eliminated
		};
	}

	// For 7 players: 4 on top court, 3 on second court (valid 3p)
	if (playerCount === 7) {
		return { courtSizes: [4, 3], eliminatedPlayerIds: [] };
	}

	// Otherwise keep existing config
	return { courtSizes: [...courtSizes], eliminatedPlayerIds: [] };
}
