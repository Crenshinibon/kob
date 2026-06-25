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

export type TieBreakFactorId =
	| 'round_points'
	| 'round_diff'
	| 'total_points'
	| 'total_diff'
	| 'initial_order'
	| 'dice'
	| 'manual';

export type TieBreakFactorConfig = {
	readonly id: TieBreakFactorId;
	readonly enabled: boolean;
};

export type TieBreakConfig = {
	readonly factors: readonly TieBreakFactorConfig[];
};

export const TIE_BREAK_CANONICAL_FACTOR_ORDER: readonly TieBreakFactorId[] = [
	'round_points',
	'round_diff',
	'total_points',
	'total_diff',
	'initial_order',
	'dice',
	'manual'
];

export const TIE_BREAK_FINAL_FACTOR_IDS: readonly TieBreakFactorId[] = [
	'initial_order',
	'dice',
	'manual'
];

export const DEFAULT_TIE_BREAK_FINAL_FACTOR: TieBreakFactorId = 'initial_order';

export function isFinalTieBreakFactor(id: TieBreakFactorId): boolean {
	return (TIE_BREAK_FINAL_FACTOR_IDS as readonly string[]).includes(id);
}

export function isStatisticalTieBreakFactor(id: TieBreakFactorId): boolean {
	return !isFinalTieBreakFactor(id);
}

export const DEFAULT_TIE_BREAK_CONFIG: TieBreakConfig = {
	factors: [
		{ id: 'round_points', enabled: true },
		{ id: 'round_diff', enabled: true },
		{ id: 'total_points', enabled: true },
		{ id: 'total_diff', enabled: true },
		{ id: 'initial_order', enabled: true },
		{ id: 'dice', enabled: false },
		{ id: 'manual', enabled: false }
	]
};

export type TieBreakContext = {
	readonly completedRounds?: readonly CourtResult[][];
	readonly currentRoundResults?: readonly CourtResult[];
	readonly courtSizes?: readonly number[];
	readonly players?: readonly Player[];
	readonly manualRankOrder?: readonly number[];
	readonly rng?: () => number;
	/** Mutable store for stable pair-wise dice rolls (key: "minId:maxId"). */
	readonly mutableDiceRolls?: Record<string, number>;
};

export type TieBreakSortOptions = {
	readonly tieBreakConfig?: TieBreakConfig;
	readonly completedRounds?: readonly CourtResult[][];
	readonly courtSizes?: readonly number[];
	readonly players?: readonly Player[];
	readonly rng?: () => number;
};

export type CourtStandingsOptions = TieBreakContext & {
	readonly tieBreakConfig?: TieBreakConfig;
};

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
	readonly tieBreakConfig?: TieBreakConfig;
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
	readonly rawPoints?: number;
	readonly rawDiff?: number;
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
	tieBreakConfig?: TieBreakConfig;
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
		decidingSetPoints = 15,
		tieBreakConfig
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
			decidingSetPoints,
			tieBreakConfig
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
	const courts = courtSizes.map((size, i) => ({
		courtNumber: i + 1,
		playerIds: [] as number[],
		capacity: size
	}));

	let itemIndex = 0;
	const maxRows = Math.max(...courtSizes);

	for (let row = 0; row < maxRows && itemIndex < items.length; row++) {
		const forward = row % 2 === 0;
		for (let c = 0; c < courtCount; c++) {
			const courtIdx = forward ? c : courtCount - 1 - c;
			if (courts[courtIdx].playerIds.length < courts[courtIdx].capacity && itemIndex < items.length) {
				courts[courtIdx].playerIds.push(items[itemIndex++]);
			}
		}
	}

	return courts.map(({ courtNumber, playerIds }) => ({ courtNumber, playerIds }));
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
	courtSizes?: readonly number[],
	tieBreak?: TieBreakSortOptions
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
		const sortedTier = sortTierByTieBreak(tier, tieBreak?.tieBreakConfig, {
			completedRounds: tieBreak?.completedRounds,
			courtSizes: tieBreak?.courtSizes ?? courtSizes,
			players: tieBreak?.players,
			rng: tieBreak?.rng
		}, courtResults);
		tiers.push(sortedTier);
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
	sizes: readonly number[],
	tieBreak?: TieBreakSortOptions
): readonly { playerIds: readonly number[] }[] {
	const courtResults = courtNumbers.map((n) => resultMap.get(n)!);
	const groupSizes = courtNumbers.map((n) => sizes[n - 1] ?? 4);
	return redistributePreseedRecursive(courtResults, groupSizes, tieBreak).map((a) => ({
		playerIds: a.playerIds
	}));
}

function processSubsequentPreseedSplit(
	courtResults: readonly CourtResult[],
	courtSizes: readonly number[],
	totalCourts: number,
	roundsCompleted: number,
	tieBreak?: TieBreakSortOptions
): CourtAssignment[] {
	const sorted = [...courtResults].sort((a, b) => a.courtNumber - b.courtNumber);
	const resultMap = new Map(sorted.map((c) => [c.courtNumber, c]));
	const plan = getSubdivisionPlan(totalCourts, roundsCompleted);
	const activeCourts = new Set(plan.flat());

	const assignments: CourtAssignment[] = [];
	let courtNumber = 1;

	for (const group of plan) {
		const groupAssignments = subdivideBracketGroup(group, resultMap, courtSizes, tieBreak);
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
	totalCourts: number = courtSizes.length,
	tieBreak?: TieBreakSortOptions
): CourtAssignment[] {
	const sorted = [...courtResults].sort((a, b) => a.courtNumber - b.courtNumber);
	if (sorted.length === 0) return [];
	if (sorted.length === 1)
		return [{ courtNumber: 1, playerIds: sorted[0].standings.map((s) => s.playerId) }];

	if (roundsCompleted === 0) {
		return redistributePreseedRecursive(sorted, courtSizes, tieBreak);
	}

	return processSubsequentPreseedSplit(sorted, courtSizes, totalCourts, roundsCompleted, tieBreak);
}

// ============================================================================
// Vertical Seeding
// ============================================================================

export function verticalSeeding(
	courtResults: readonly CourtResult[],
	targetCourtCount: number,
	courtSizes?: readonly number[],
	excludedPlayerIds?: ReadonlySet<number>,
	tieBreak?: TieBreakSortOptions
): CourtAssignment[] {
	const sorted = [...courtResults].sort((a, b) => a.courtNumber - b.courtNumber);
	const maxRank = sorted.reduce((m, c) => Math.max(m, c.standings.length), 0);
	const exclude = excludedPlayerIds ?? new Set<number>();

	const flattened: number[] = [];

	for (let r = 0; r < maxRank; r++) {
		const tier: { playerId: number; points: number; diff: number }[] = [];
		for (const c of sorted) {
			const s = c.standings[r];
			if (s && !exclude.has(s.playerId))
				tier.push({ playerId: s.playerId, points: s.points, diff: s.diff });
		}
		const sortedTier = sortTierByTieBreak(tier, tieBreak?.tieBreakConfig, {
			completedRounds: tieBreak?.completedRounds,
			courtSizes: tieBreak?.courtSizes ?? courtSizes,
			players: tieBreak?.players,
			rng: tieBreak?.rng
		}, courtResults);
		for (const t of sortedTier) flattened.push(t.playerId);
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

function sourceCourtSize(court: CourtResult): number {
	return court.standings.reduce((max, s) => Math.max(max, s.rank), 0);
}

function takeByRank(
	court: CourtResult,
	minRank: number,
	maxRank: number,
	target: number[],
	exclude: ReadonlySet<number>,
	assigned: Set<number>
): void {
	for (const s of court.standings) {
		if (s.rank < minRank || s.rank > maxRank) continue;
		if (exclude.has(s.playerId) || assigned.has(s.playerId)) continue;
		target.push(s.playerId);
		assigned.add(s.playerId);
	}
}

export function ladderRedistribute(
	courtResults: readonly CourtResult[],
	targetCourtCount: number,
	courtSizes?: readonly number[],
	excludedPlayerIds?: ReadonlySet<number>
): CourtAssignment[] {
	const sorted = [...courtResults].sort((a, b) => a.courtNumber - b.courtNumber);
	const sizes = courtSizes ?? Array(targetCourtCount).fill(4);
	const exclude = excludedPlayerIds ?? new Set<number>();
	const assigned = new Set<number>();
	const sourceSizes = sorted.map(sourceCourtSize);
	const assignments: CourtAssignment[] = [];

	for (let i = 0; i < targetCourtCount; i++) {
		const targetSize = sizes[i];
		const pids: number[] = [];

		if (i === 0) {
			takeByRank(sorted[0], 1, 2, pids, exclude, assigned);
			if (sorted[1]) takeByRank(sorted[1], 1, 2, pids, exclude, assigned);
		} else if (i === targetCourtCount - 1) {
			const prevSize = sourceSizes[i - 1] ?? 4;
			if (sorted[i - 1]) takeByRank(sorted[i - 1], prevSize - 1, prevSize, pids, exclude, assigned);
			const selfSize = sourceSizes[i] ?? 4;
			if (sorted[i]) takeByRank(sorted[i], 3, selfSize, pids, exclude, assigned);
		} else {
			const prevSize = sourceSizes[i - 1] ?? 4;
			if (sorted[i - 1]) takeByRank(sorted[i - 1], prevSize - 1, prevSize, pids, exclude, assigned);
			if (sorted[i + 1]) takeByRank(sorted[i + 1], 1, 2, pids, exclude, assigned);
		}

		// Backfill short courts from relegated players on the same previous-round court
		if (pids.length < targetSize && sorted[i]) {
			const selfSize = sourceSizes[i] ?? 4;
			for (let rank = 3; rank <= selfSize && pids.length < targetSize; rank++) {
				const s = sorted[i].standings.find((st) => st.rank === rank);
				if (!s || exclude.has(s.playerId) || assigned.has(s.playerId)) continue;
				pids.push(s.playerId);
				assigned.add(s.playerId);
			}
		}

		const trimmedPids = pids.slice(0, targetSize);
		if (trimmedPids.length > 0) assignments.push({ courtNumber: i + 1, playerIds: trimmedPids });
	}
	return assignments;
}

export function redistributeLadder(
	courtResults: readonly CourtResult[],
	isFirstRound: boolean,
	courtCount: number,
	courtSizes?: readonly number[],
	tieBreak?: TieBreakSortOptions
): CourtAssignment[] {
	if (isFirstRound) return verticalSeeding(courtResults, courtCount, courtSizes, undefined, tieBreak);
	return ladderRedistribute(courtResults, courtCount, courtSizes);
}

// ============================================================================
// Tie-Break Ranking
// ============================================================================

const STANDARD_GAMES_PER_ROUND = 3;

export function normalizeTieBreakConfig(config: TieBreakConfig | null | undefined): TieBreakConfig {
	if (!config?.factors?.length) return DEFAULT_TIE_BREAK_CONFIG;

	const storedById = new Map(config.factors.map((f) => [f.id, f]));
	const orderedIds: TieBreakFactorId[] = [];

	for (const factor of config.factors) {
		if (
			(TIE_BREAK_CANONICAL_FACTOR_ORDER as readonly string[]).includes(factor.id) &&
			!orderedIds.includes(factor.id)
		) {
			orderedIds.push(factor.id);
		}
	}
	for (const id of TIE_BREAK_CANONICAL_FACTOR_ORDER) {
		if (!orderedIds.includes(id)) orderedIds.push(id);
	}

	const mergedFactors: TieBreakFactorConfig[] = orderedIds.map((id) => ({
		id,
		enabled: storedById.get(id)?.enabled ?? false
	}));

	return enforceFinalTieBreakFactorRules({ factors: mergedFactors });
}

function enforceFinalTieBreakFactorRules(config: TieBreakConfig): TieBreakConfig {
	const statsInOrder = config.factors.filter((f) => isStatisticalTieBreakFactor(f.id));
	const enabledFinalsInUserOrder = config.factors.filter(
		(f) => f.enabled && isFinalTieBreakFactor(f.id)
	);

	const activeFinal: TieBreakFactorId =
		enabledFinalsInUserOrder.length > 0
			? enabledFinalsInUserOrder[enabledFinalsInUserOrder.length - 1]!.id
			: DEFAULT_TIE_BREAK_FINAL_FACTOR;

	const normalizedFinals: TieBreakFactorConfig[] = TIE_BREAK_FINAL_FACTOR_IDS.map((id) => ({
		id,
		enabled: id === activeFinal
	}));

	return {
		factors: [...statsInOrder, ...normalizedFinals]
	};
}

export function getEnabledTieBreakFactors(config: TieBreakConfig | null | undefined): TieBreakFactorId[] {
	return normalizeTieBreakConfig(config)
		.factors.filter((f) => f.enabled)
		.map((f) => f.id);
}

export type PlayerRoundStats = {
	readonly playerId: number;
	readonly rawPoints: number;
	readonly rawDiff: number;
	readonly gamesPlayed: number;
	readonly roundPoints: number;
	readonly roundDiff: number;
};

export function buildPlayerRoundStats(
	matches: readonly MatchData[],
	playerIds: readonly number[]
): Map<number, PlayerRoundStats> {
	const stats: Record<
		number,
		{ rawPoints: number; for: number; against: number; gamesPlayed: number }
	> = {};
	playerIds.forEach((id) => {
		stats[id] = { rawPoints: 0, for: 0, against: 0, gamesPlayed: 0 };
	});

	const hasCanceled = matches.some((m) => m.isCanceled);
	const useAverages = hasCanceled || playerIds.length >= 5;

	matches.forEach((m) => {
		if (m.isCanceled) return;
		if (m.teamAScore === null || m.teamBScore === null) return;

		const injured = new Set(m.injuredPlayerIds ?? []);

		for (const pid of [m.teamAPlayer1Id, m.teamAPlayer2Id]) {
			if (!stats[pid]) continue;
			const points = injured.has(pid) ? 0 : m.teamAScore;
			stats[pid].rawPoints += points;
			stats[pid].for += m.teamAScore;
			stats[pid].against += m.teamBScore;
			stats[pid].gamesPlayed += 1;
		}

		for (const pid of [m.teamBPlayer1Id, m.teamBPlayer2Id]) {
			if (!stats[pid]) continue;
			const points = injured.has(pid) ? 0 : m.teamBScore;
			stats[pid].rawPoints += points;
			stats[pid].for += m.teamBScore;
			stats[pid].against += m.teamAScore;
			stats[pid].gamesPlayed += 1;
		}
	});

	const result = new Map<number, PlayerRoundStats>();
	for (const id of playerIds) {
		const s = stats[id];
		const rawDiff = s.for - s.against;
		if (useAverages && s.gamesPlayed > 0) {
			result.set(id, {
				playerId: id,
				rawPoints: s.rawPoints,
				rawDiff,
				gamesPlayed: s.gamesPlayed,
				roundPoints: Math.round((s.rawPoints / s.gamesPlayed) * 100) / 100,
				roundDiff: Math.round((rawDiff / s.gamesPlayed) * 100) / 100
			});
		} else {
			result.set(id, {
				playerId: id,
				rawPoints: s.rawPoints,
				rawDiff,
				gamesPlayed: s.gamesPlayed,
				roundPoints: s.rawPoints,
				roundDiff: rawDiff
			});
		}
	}
	return result;
}

function roundPointsContribution(
	standing: CourtStandings,
	courtSize: number
): number {
	if (courtSize >= 5) {
		const raw = standing.rawPoints ?? standing.points * (standing.matchCount || 1);
		return raw / STANDARD_GAMES_PER_ROUND;
	}
	return standing.rawPoints ?? standing.points;
}

export function buildPlayerTotalStats(
	completedRounds: readonly CourtResult[][],
	currentRoundResults: readonly CourtResult[] | undefined,
	courtSizes: readonly number[]
): Map<number, { totalPoints: number; totalDiff: number }> {
	const totals = new Map<number, { totalPoints: number; totalDiff: number }>();

	const addRound = (results: readonly CourtResult[]) => {
		for (const court of results) {
			const courtSize = courtSizes[court.courtNumber - 1] ?? court.standings.length;
			for (const s of court.standings) {
				const existing = totals.get(s.playerId) ?? { totalPoints: 0, totalDiff: 0 };
				const rawDiff = s.rawDiff ?? s.diff;
				totals.set(s.playerId, {
					totalPoints: existing.totalPoints + roundPointsContribution(s, courtSize),
					totalDiff: existing.totalDiff + rawDiff
				});
			}
		}
	};

	for (const round of completedRounds) addRound(round);
	if (currentRoundResults) addRound(currentRoundResults);

	return totals;
}

function getInitialOrderValue(playerId: number, players?: readonly Player[]): number {
	if (!players) return playerId;
	const p = players.find((pl) => pl.id === playerId);
	if (p?.seedRank != null) return p.seedRank;
	return playerId;
}

function manualRankIndex(playerId: number, order?: readonly number[]): number {
	if (!order?.length) return Number.MAX_SAFE_INTEGER;
	const idx = order.indexOf(playerId);
	return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
}

export function dicePairKey(playerA: number, playerB: number): string {
	return playerA < playerB ? `${playerA}:${playerB}` : `${playerB}:${playerA}`;
}

/** Stable pair-wise dice comparison; mutates `rolls` when a new pair is rolled. */
export function compareDicePairStable(
	playerA: number,
	playerB: number,
	rolls: Record<string, number>,
	rng: () => number = Math.random
): number {
	const key = dicePairKey(playerA, playerB);
	if (!(key in rolls)) {
		rolls[key] = rng();
	}
	const roll = rolls[key]!;
	const cmp = roll < 0.5 ? -1 : roll > 0.5 ? 1 : 0;
	return playerA < playerB ? cmp : -cmp;
}

export function comparePlayersForTieBreak(
	playerA: number,
	playerB: number,
	config: TieBreakConfig | null | undefined,
	context: TieBreakContext & {
		roundStats?: Map<number, PlayerRoundStats>;
		totalStats?: Map<number, { totalPoints: number; totalDiff: number }>;
	}
): number {
	const factors = getEnabledTieBreakFactors(config);
	const roundStats = context.roundStats ?? new Map();
	const totalStats = context.totalStats ?? new Map();

	for (const factor of factors) {
		if (factor === 'dice') {
			if (context.mutableDiceRolls) {
				return compareDicePairStable(
					playerA,
					playerB,
					context.mutableDiceRolls,
					context.rng ?? Math.random
				);
			}
			const rng = context.rng ?? Math.random;
			const roll = rng();
			return roll < 0.5 ? -1 : roll > 0.5 ? 1 : 0;
		}

		if (factor === 'manual') {
			const tieGroups = getManualTieGroups(
				[playerA, playerB],
				config,
				context
			);
			if (tieGroups.length === 0) continue;
			const ma = manualRankIndex(playerA, context.manualRankOrder);
			const mb = manualRankIndex(playerB, context.manualRankOrder);
			if (ma !== mb) return ma - mb;
			continue;
		}

		if (factor === 'round_points') {
			const a = roundStats.get(playerA)?.roundPoints ?? 0;
			const b = roundStats.get(playerB)?.roundPoints ?? 0;
			if (b !== a) return b - a;
			continue;
		}

		if (factor === 'round_diff') {
			const a = roundStats.get(playerA)?.roundDiff ?? 0;
			const b = roundStats.get(playerB)?.roundDiff ?? 0;
			if (b !== a) return b - a;
			continue;
		}

		if (factor === 'total_points') {
			const a = totalStats.get(playerA)?.totalPoints ?? 0;
			const b = totalStats.get(playerB)?.totalPoints ?? 0;
			if (b !== a) return b - a;
			continue;
		}

		if (factor === 'total_diff') {
			const a = totalStats.get(playerA)?.totalDiff ?? 0;
			const b = totalStats.get(playerB)?.totalDiff ?? 0;
			if (b !== a) return b - a;
			continue;
		}

		if (factor === 'initial_order') {
			const a = getInitialOrderValue(playerA, context.players);
			const b = getInitialOrderValue(playerB, context.players);
			if (a !== b) return a - b;
			return playerA - playerB;
		}
	}

	return 0;
}

/** Positive = playerA ranks above playerB on this single factor. */
export function compareSingleTieBreakFactor(
	factor: TieBreakFactorId,
	playerA: number,
	playerB: number,
	context: TieBreakContext & {
		roundStats?: Map<number, PlayerRoundStats>;
		totalStats?: Map<number, { totalPoints: number; totalDiff: number }>;
	}
): number {
	const roundStats = context.roundStats ?? new Map();
	const totalStats = context.totalStats ?? new Map();

	if (factor === 'dice' || factor === 'manual') {
		if (factor === 'manual') {
			const ma = manualRankIndex(playerA, context.manualRankOrder);
			const mb = manualRankIndex(playerB, context.manualRankOrder);
			if (ma !== mb) return mb - ma;
		}
		return 0;
	}

	if (factor === 'round_points') {
		const a = roundStats.get(playerA)?.roundPoints ?? 0;
		const b = roundStats.get(playerB)?.roundPoints ?? 0;
		if (b !== a) return a - b;
		return 0;
	}

	if (factor === 'round_diff') {
		const a = roundStats.get(playerA)?.roundDiff ?? 0;
		const b = roundStats.get(playerB)?.roundDiff ?? 0;
		if (b !== a) return a - b;
		return 0;
	}

	if (factor === 'total_points') {
		const a = totalStats.get(playerA)?.totalPoints ?? 0;
		const b = totalStats.get(playerB)?.totalPoints ?? 0;
		if (b !== a) return a - b;
		return 0;
	}

	if (factor === 'total_diff') {
		const a = totalStats.get(playerA)?.totalDiff ?? 0;
		const b = totalStats.get(playerB)?.totalDiff ?? 0;
		if (b !== a) return a - b;
		return 0;
	}

	if (factor === 'initial_order') {
		const a = getInitialOrderValue(playerA, context.players);
		const b = getInitialOrderValue(playerB, context.players);
		if (a !== b) return b - a;
	}

	return 0;
}

export function explainPairTieBreak(
	higherRankedId: number,
	lowerRankedId: number,
	config: TieBreakConfig | null | undefined,
	context: TieBreakContext & {
		roundStats?: Map<number, PlayerRoundStats>;
		totalStats?: Map<number, { totalPoints: number; totalDiff: number }>;
	}
): { tiedFactors: TieBreakFactorId[]; decidingFactor: TieBreakFactorId | null } {
	const factors = getEnabledTieBreakFactors(config);
	const tiedFactors: TieBreakFactorId[] = [];

	for (const factor of factors) {
		if (isFinalTieBreakFactor(factor)) {
			return { tiedFactors, decidingFactor: factor };
		}
		const cmp = compareSingleTieBreakFactor(factor, higherRankedId, lowerRankedId, context);
		if (cmp !== 0) {
			return { tiedFactors, decidingFactor: factor };
		}
		tiedFactors.push(factor);
	}

	return { tiedFactors, decidingFactor: null };
}

export function getDecidingTieBreakFactor(
	higherRankedId: number,
	lowerRankedId: number,
	config: TieBreakConfig | null | undefined,
	context: TieBreakContext & {
		roundStats?: Map<number, PlayerRoundStats>;
		totalStats?: Map<number, { totalPoints: number; totalDiff: number }>;
	}
): TieBreakFactorId | null {
	return explainPairTieBreak(higherRankedId, lowerRankedId, config, context).decidingFactor;
}

export type PlayerTieBreakValues = Partial<
	Record<'round_points' | 'round_diff' | 'total_points' | 'total_diff' | 'initial_order', number>
>;

export function getFactorsBeforeManual(
	config: TieBreakConfig | null | undefined
): TieBreakFactorId[] {
	const factors = getEnabledTieBreakFactors(config);
	const manualIdx = factors.indexOf('manual');
	if (manualIdx <= 0) return [];
	return factors.slice(0, manualIdx).filter((f) => f !== 'dice');
}

export function getPlayerTieBreakValues(
	playerId: number,
	factors: readonly TieBreakFactorId[],
	context: TieBreakContext & {
		roundStats?: Map<number, PlayerRoundStats>;
		totalStats?: Map<number, { totalPoints: number; totalDiff: number }>;
	}
): PlayerTieBreakValues {
	const roundStats = context.roundStats ?? new Map();
	const totalStats = context.totalStats ?? new Map();
	const values: PlayerTieBreakValues = {};

	for (const factor of factors) {
		if (factor === 'round_points') {
			values.round_points = roundStats.get(playerId)?.roundPoints ?? 0;
		} else if (factor === 'round_diff') {
			values.round_diff = roundStats.get(playerId)?.roundDiff ?? 0;
		} else if (factor === 'total_points') {
			values.total_points = totalStats.get(playerId)?.totalPoints ?? 0;
		} else if (factor === 'total_diff') {
			values.total_diff = totalStats.get(playerId)?.totalDiff ?? 0;
		} else if (factor === 'initial_order') {
			values.initial_order = getInitialOrderValue(playerId, context.players);
		}
	}

	return values;
}

function tieBreakValuesSignature(values: PlayerTieBreakValues, factors: readonly TieBreakFactorId[]): string {
	return factors.map((f) => values[f as keyof PlayerTieBreakValues] ?? 0).join('|');
}

export type ManualTieGroupDisplay = {
	readonly playerIds: readonly number[];
	readonly factors: readonly TieBreakFactorId[];
	readonly values: Readonly<Record<number, PlayerTieBreakValues>>;
};

export function getManualTieGroups(
	playerIds: readonly number[],
	config: TieBreakConfig | null | undefined,
	context: TieBreakContext & {
		roundStats?: Map<number, PlayerRoundStats>;
		totalStats?: Map<number, { totalPoints: number; totalDiff: number }>;
	}
): ManualTieGroupDisplay[] {
	if (!getEnabledTieBreakFactors(config).includes('manual')) return [];

	const factors = getFactorsBeforeManual(config);
	if (factors.length === 0) {
		if (playerIds.length < 2) return [];
		const values: Record<number, PlayerTieBreakValues> = {};
		for (const id of playerIds) values[id] = {};
		return [{ playerIds: [...playerIds], factors: [], values }];
	}

	const groups = new Map<string, number[]>();
	for (const id of playerIds) {
		const values = getPlayerTieBreakValues(id, factors, context);
		const sig = tieBreakValuesSignature(values, factors);
		const group = groups.get(sig) ?? [];
		group.push(id);
		groups.set(sig, group);
	}

	return [...groups.values()]
		.filter((g) => g.length > 1)
		.map((playerIdsInGroup) => {
			const values: Record<number, PlayerTieBreakValues> = {};
			for (const id of playerIdsInGroup) {
				values[id] = getPlayerTieBreakValues(id, factors, context);
			}
			return { playerIds: playerIdsInGroup, factors, values };
		});
}

export function configExcludingFactor(
	config: TieBreakConfig | null | undefined,
	exclude: TieBreakFactorId
): TieBreakConfig {
	const normalized = normalizeTieBreakConfig(config);
	return {
		factors: normalized.factors.map((f) =>
			f.id === exclude ? { id: f.id, enabled: false } : { id: f.id, enabled: f.enabled }
		)
	};
}

function compressedBlockOrder(order: readonly number[], tieGroups: readonly ManualTieGroupDisplay[]): string {
	const groupKey = new Map<number, string>();
	tieGroups.forEach((g, i) => {
		const key = `g${i}`;
		for (const id of g.playerIds) groupKey.set(id, key);
	});

	const parts: (number | string)[] = [];
	const seenGroups = new Set<string>();
	for (const id of order) {
		const key = groupKey.get(id);
		if (!key) {
			parts.push(id);
		} else if (!seenGroups.has(key)) {
			seenGroups.add(key);
			parts.push(key);
		}
	}
	return JSON.stringify(parts);
}

export function isValidManualRankOrder(
	playerIds: readonly number[],
	submittedOrder: readonly number[],
	config: TieBreakConfig | null | undefined,
	context: TieBreakContext & {
		roundStats?: Map<number, PlayerRoundStats>;
		totalStats?: Map<number, { totalPoints: number; totalDiff: number }>;
	}
): boolean {
	if (submittedOrder.length !== playerIds.length) return false;

	const submittedSet = new Set(submittedOrder);
	if (submittedSet.size !== playerIds.length) return false;
	for (const id of playerIds) {
		if (!submittedSet.has(id)) return false;
	}

	const tieGroups = getManualTieGroups(playerIds, config, context);
	if (tieGroups.length === 0) return false;

	const autoConfig = configExcludingFactor(config, 'manual');
	const autoOrder = sortPlayersByTieBreak(playerIds, autoConfig, context);

	if (compressedBlockOrder(submittedOrder, tieGroups) !== compressedBlockOrder(autoOrder, tieGroups)) {
		return false;
	}

	for (const group of tieGroups) {
		const inSubmitted = submittedOrder.filter((id) => group.playerIds.includes(id));
		if (inSubmitted.length !== group.playerIds.length) return false;
	}

	return true;
}

export type TieBreakDecidingOutcome = 'won' | 'middle' | 'lost' | null;

export type CourtStandingExplanation = {
	readonly tiedFactors: readonly TieBreakFactorId[];
	readonly decidingFactor: TieBreakFactorId | null;
	readonly decidingOutcome: TieBreakDecidingOutcome;
};

function areAdjacentInTieBreakGroup(
	higherId: number,
	lowerId: number,
	config: TieBreakConfig | null | undefined,
	context: TieBreakContext & {
		roundStats?: Map<number, PlayerRoundStats>;
		totalStats?: Map<number, { totalPoints: number; totalDiff: number }>;
	},
	groupDecidingFactor: TieBreakFactorId | null
): { inGroup: boolean; decidingFactor: TieBreakFactorId | null } {
	const { tiedFactors, decidingFactor } = explainPairTieBreak(
		higherId,
		lowerId,
		config,
		context
	);
	if (tiedFactors.length === 0) {
		return { inGroup: false, decidingFactor };
	}
	if (groupDecidingFactor !== null && decidingFactor !== groupDecidingFactor) {
		return { inGroup: false, decidingFactor };
	}
	return { inGroup: true, decidingFactor };
}

function decidingOutcomeForGroupIndex(
	index: number,
	groupSize: number
): TieBreakDecidingOutcome {
	if (groupSize < 2) return null;
	if (index === 0) return 'won';
	if (groupSize >= 3 && index === 1) return 'middle';
	return 'lost';
}

export function explainCourtStandings(
	standings: readonly CourtStandings[],
	config: TieBreakConfig | null | undefined,
	context: TieBreakContext & {
		roundStats?: Map<number, PlayerRoundStats>;
		totalStats?: Map<number, { totalPoints: number; totalDiff: number }>;
	}
): Map<number, CourtStandingExplanation> {
	const result = new Map<number, CourtStandingExplanation>();
	if (standings.length === 0) return result;

	const sorted = [...standings].sort((a, b) => a.rank - b.rank);
	const tieGroups: number[][] = [];
	let currentGroup = [sorted[0].playerId];
	let groupDecidingFactor: TieBreakFactorId | null = null;

	for (let i = 1; i < sorted.length; i++) {
		const prevId = sorted[i - 1].playerId;
		const currId = sorted[i].playerId;
		const { inGroup, decidingFactor } = areAdjacentInTieBreakGroup(
			prevId,
			currId,
			config,
			context,
			groupDecidingFactor
		);

		if (inGroup) {
			if (groupDecidingFactor === null) {
				groupDecidingFactor = decidingFactor;
			}
			currentGroup.push(currId);
		} else {
			tieGroups.push(currentGroup);
			currentGroup = [currId];
			groupDecidingFactor = null;
		}
	}
	tieGroups.push(currentGroup);

	let sortedIndex = 0;
	for (const group of tieGroups) {
		if (group.length >= 2) {
			const { tiedFactors, decidingFactor } = explainPairTieBreak(
				group[0],
				group[group.length - 1],
				config,
				context
			);
			for (let i = 0; i < group.length; i++) {
				result.set(group[i], {
					tiedFactors,
					decidingFactor,
					decidingOutcome: decidingOutcomeForGroupIndex(i, group.length)
				});
			}
		} else {
			const current = sorted[sortedIndex];
			if (sorted.length === 1) {
				result.set(current.playerId, {
					tiedFactors: [],
					decidingFactor: null,
					decidingOutcome: null
				});
			} else {
				let higherId: number;
				let lowerId: number;

				if (sortedIndex < sorted.length - 1) {
					higherId = current.playerId;
					lowerId = sorted[sortedIndex + 1].playerId;
				} else {
					higherId = sorted[sortedIndex - 1].playerId;
					lowerId = current.playerId;
				}

				const { tiedFactors, decidingFactor } = explainPairTieBreak(
					higherId,
					lowerId,
					config,
					context
				);
				result.set(current.playerId, { tiedFactors, decidingFactor, decidingOutcome: null });
			}
		}
		sortedIndex += group.length;
	}

	return result;
}

export const TIE_BREAK_FACTOR_GLYPHS: Record<TieBreakFactorId, string> = {
	round_points: 'P',
	round_diff: '±',
	total_points: 'Σ',
	total_diff: 'Δ',
	initial_order: '#',
	dice: '🎲',
	manual: '✋'
};

export function buildStandingsTieBreakContext(
	matches: readonly MatchData[],
	playerIds: readonly number[],
	options?: CourtStandingsOptions
): {
	roundStats: Map<number, PlayerRoundStats>;
	totalStats: Map<number, { totalPoints: number; totalDiff: number }>;
	config: TieBreakConfig | null | undefined;
	context: TieBreakContext & {
		roundStats: Map<number, PlayerRoundStats>;
		totalStats: Map<number, { totalPoints: number; totalDiff: number }>;
	};
} {
	const roundStats = buildPlayerRoundStats(matches, playerIds);
	const currentResults: CourtResult[] = [
		{
			courtNumber: 1,
			standings: playerIds.map((id) => {
				const s = roundStats.get(id)!;
				return {
					playerId: id,
					rank: 0,
					points: s.roundPoints,
					diff: s.roundDiff,
					matchCount: s.gamesPlayed,
					rawPoints: s.rawPoints,
					rawDiff: s.rawDiff
				};
			})
		}
	];
	const courtSizes = options?.courtSizes ?? [playerIds.length];
	const totalStats = buildPlayerTotalStats(
		options?.completedRounds ?? [],
		currentResults,
		courtSizes
	);
	const context = { ...options, roundStats, totalStats };
	return {
		roundStats,
		totalStats,
		config: options?.tieBreakConfig,
		context
	};
}

export function sortPlayersByTieBreak(
	playerIds: readonly number[],
	config: TieBreakConfig | null | undefined,
	context: TieBreakContext & {
		roundStats?: Map<number, PlayerRoundStats>;
		totalStats?: Map<number, { totalPoints: number; totalDiff: number }>;
	}
): number[] {
	const sorted = [...playerIds];
	sorted.sort((a, b) => comparePlayersForTieBreak(a, b, config, context));
	return sorted;
}

function sortTierByTieBreak<T extends { playerId: number; points: number; diff: number }>(
	tier: T[],
	config: TieBreakConfig | null | undefined,
	context: TieBreakContext,
	currentRoundResults?: readonly CourtResult[]
): T[] {
	const roundStats = new Map<number, PlayerRoundStats>();
	for (const t of tier) {
		roundStats.set(t.playerId, {
			playerId: t.playerId,
			rawPoints: t.points,
			rawDiff: t.diff,
			gamesPlayed: 1,
			roundPoints: t.points,
			roundDiff: t.diff
		});
	}

	const courtSizes = context.courtSizes ?? [];
	const totalStats = buildPlayerTotalStats(
		context.completedRounds ?? [],
		currentRoundResults,
		courtSizes
	);

	const sorted = [...tier];
	sorted.sort((a, b) =>
		comparePlayersForTieBreak(a.playerId, b.playerId, config, {
			...context,
			roundStats,
			totalStats
		})
	);
	return sorted;
}

// ============================================================================
// Close Round
// ============================================================================

export function closeRound(
	state: TournamentState,
	overrideCourtSizes?: readonly number[],
	manualRankByCourt?: ReadonlyMap<number, readonly number[]>,
	diceRollsByCourt?: ReadonlyMap<number, Record<string, number>>
): TournamentState {
	if (state.currentRound === 0) throw new Error('No active round to close');
	if (state.currentMatches.length === 0)
		throw new Error('No matches have been generated for this round');
	const scoredCount = state.currentMatches.filter(
		(m): m is MatchData => m !== undefined && m.teamAScore !== null && m.teamBScore !== null
	).length;
	if (scoredCount === 0) throw new Error('No scored matches in this round');

	// Calculate standings for each court
	const tieBreakOpts: CourtStandingsOptions = {
		tieBreakConfig: state.config.tieBreakConfig,
		completedRounds: state.completedRounds,
		courtSizes: state.config.courtSizes,
		players: state.players
	};

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
			standings: calculateCourtStandings(matches, assign.playerIds, {
				...tieBreakOpts,
				manualRankOrder: manualRankByCourt?.get(assign.courtNumber),
				mutableDiceRolls: diceRollsByCourt?.get(assign.courtNumber)
			})
		};
	});

	const redistributionTieBreak: TieBreakSortOptions = {
		tieBreakConfig: state.config.tieBreakConfig,
		completedRounds: state.completedRounds,
		courtSizes: state.config.courtSizes,
		players: state.players
	};

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
			state.config.courtSizes.length,
			redistributionTieBreak
		);
	} else if (state.roundsCompleted === 0) {
		nextAssignments = verticalSeeding(
			courtResults,
			courtCount,
			courtSizes,
			undefined,
			redistributionTieBreak
		);
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
	playerIds: readonly number[],
	options?: CourtStandingsOptions
): CourtStandings[] {
	const roundStats = buildPlayerRoundStats(matches, playerIds);
	const config = options?.tieBreakConfig;

	const currentResults: CourtResult[] = [
		{
			courtNumber: 1,
			standings: playerIds.map((id) => {
				const s = roundStats.get(id)!;
				return {
					playerId: id,
					rank: 0,
					points: s.roundPoints,
					diff: s.roundDiff,
					matchCount: s.gamesPlayed,
					rawPoints: s.rawPoints,
					rawDiff: s.rawDiff
				};
			})
		}
	];

	const totalStats = buildPlayerTotalStats(
		options?.completedRounds ?? [],
		currentResults,
		options?.courtSizes ?? [playerIds.length]
	);

	const sortedIds = sortPlayersByTieBreak(playerIds, config, {
		...options,
		roundStats,
		totalStats
	});

	return sortedIds.map((playerId, i) => {
		const s = roundStats.get(playerId)!;
		return {
			playerId,
			rank: i + 1,
			points: s.roundPoints,
			diff: s.roundDiff,
			matchCount: s.gamesPlayed,
			rawPoints: s.rawPoints,
			rawDiff: s.rawDiff
		};
	});
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

export type PreseedRetirementPolicy = 'shrink' | 'cascade';

export type BracketLevel = {
	readonly courtNumber: number;
	readonly level: number;
};

/**
 * Placement levels for active (non-frozen) courts in the current round.
 * Level 1 = highest bracket court; higher numbers = lower placement.
 */
export function getActiveBracketLevels(
	assignments: readonly CourtAssignment[],
	frozenCourtNumbers: ReadonlySet<number>
): readonly BracketLevel[] {
	const active = assignments
		.filter((a) => !frozenCourtNumbers.has(a.courtNumber))
		.sort((a, b) => a.courtNumber - b.courtNumber);
	return active.map((a, idx) => ({ courtNumber: a.courtNumber, level: idx + 1 }));
}

function cloneAssignments(assignments: readonly CourtAssignment[]): CourtAssignment[] {
	return assignments.map((a) => ({ courtNumber: a.courtNumber, playerIds: [...a.playerIds] }));
}

function standingRankOnCourt(
	prevResults: readonly CourtResult[],
	courtNumber: number,
	playerId: number
): number {
	const court = prevResults.find((c) => c.courtNumber === courtNumber);
	const standing = court?.standings.find((s) => s.playerId === playerId);
	return standing?.rank ?? 999;
}

function compareByPrevRoundRank(
	prevResults: readonly CourtResult[],
	courtNumber: number,
	a: number,
	b: number
): number {
	const rankA = standingRankOnCourt(prevResults, courtNumber, a);
	const rankB = standingRankOnCourt(prevResults, courtNumber, b);
	if (rankA !== rankB) return rankA - rankB;
	const court = prevResults.find((c) => c.courtNumber === courtNumber);
	const sa = court?.standings.find((s) => s.playerId === a);
	const sb = court?.standings.find((s) => s.playerId === b);
	if (sa && sb) {
		const byPoints = sb.points - sa.points;
		if (byPoints !== 0) return byPoints;
		const byDiff = sb.diff - sa.diff;
		if (byDiff !== 0) return byDiff;
	}
	return a - b;
}

function findAssignment(
	assignments: readonly CourtAssignment[],
	courtNumber: number
): CourtAssignment | undefined {
	return assignments.find((a) => a.courtNumber === courtNumber);
}

function removePlayerFromCourt(
	assignments: CourtAssignment[],
	courtNumber: number,
	playerId: number
): void {
	const courtIdx = assignments.findIndex((a) => a.courtNumber === courtNumber);
	if (courtIdx < 0) return;
	assignments[courtIdx] = {
		courtNumber,
		playerIds: assignments[courtIdx].playerIds.filter((id) => id !== playerId)
	};
}

function addPlayerToCourt(assignments: CourtAssignment[], courtNumber: number, playerId: number): void {
	const courtIdx = assignments.findIndex((a) => a.courtNumber === courtNumber);
	if (courtIdx < 0) return;
	const court = assignments[courtIdx];
	if (!court.playerIds.includes(playerId)) {
		assignments[courtIdx] = {
			courtNumber,
			playerIds: [...court.playerIds, playerId]
		};
	}
}

function pickBestPromotee(
	assignments: readonly CourtAssignment[],
	donorCourtNumber: number,
	prevResults: readonly CourtResult[],
	exclude: ReadonlySet<number>
): number | null {
	const donor = findAssignment(assignments, donorCourtNumber);
	if (!donor) return null;
	const candidates = donor.playerIds.filter((id) => !exclude.has(id));
	if (candidates.length === 0) return null;
	candidates.sort((a, b) =>
		compareByPrevRoundRank(prevResults, donorCourtNumber, a, b)
	);
	return candidates[0];
}

function targetCourtSize(
	courtNumber: number,
	newCourtSizes: readonly number[],
	defaultSize: number
): number {
	return newCourtSizes[courtNumber - 1] ?? defaultSize;
}

/**
 * Policy A: remove retiree from their court only; no promotion between bracket levels.
 */
export function applyPreseedShrink(
	assignments: readonly CourtAssignment[],
	retiredPlayerId: number,
	newCourtSizes: readonly number[],
	frozenCourtNumbers: ReadonlySet<number>
): CourtAssignment[] {
	const result = cloneAssignments(assignments);
	const retiredCourt = result.find((a) => a.playerIds.includes(retiredPlayerId));
	if (!retiredCourt || frozenCourtNumbers.has(retiredCourt.courtNumber)) {
		return result;
	}
	removePlayerFromCourt(result, retiredCourt.courtNumber, retiredPlayerId);
	return result;
}

/**
 * Policy B: remove retiree and backfill upward through bracket levels by previous-round rank.
 */
export function applyPreseedCascade(
	assignments: readonly CourtAssignment[],
	prevResults: readonly CourtResult[],
	retiredPlayerId: number,
	newCourtSizes: readonly number[],
	frozenCourtNumbers: ReadonlySet<number>
): CourtAssignment[] {
	const result = cloneAssignments(assignments);
	const retiredCourt = result.find((a) => a.playerIds.includes(retiredPlayerId));
	if (!retiredCourt || frozenCourtNumbers.has(retiredCourt.courtNumber)) {
		return result;
	}

	const levels = getActiveBracketLevels(result, frozenCourtNumbers);
	const levelByCourt = new Map(levels.map((l) => [l.courtNumber, l.level]));
	const courtByLevel = new Map(levels.map((l) => [l.level, l.courtNumber]));
	const retireLevel = levelByCourt.get(retiredCourt.courtNumber);
	if (retireLevel === undefined) return result;

	removePlayerFromCourt(result, retiredCourt.courtNumber, retiredPlayerId);

	const maxLevel = levels.length;
	const moved = new Set<number>();

	for (let level = retireLevel; level <= maxLevel; level++) {
		const courtNumber = courtByLevel.get(level);
		if (courtNumber === undefined) continue;

		const targetSize = targetCourtSize(courtNumber, newCourtSizes, 4);

		while ((findAssignment(result, courtNumber)?.playerIds.length ?? 0) < targetSize) {
			let picked: number | null = null;
			let donorCourt: number | null = null;

			for (let donorLevel = level + 1; donorLevel <= maxLevel; donorLevel++) {
				const donorCourtNumber = courtByLevel.get(donorLevel);
				if (donorCourtNumber === undefined) continue;
				const candidate = pickBestPromotee(result, donorCourtNumber, prevResults, moved);
				if (candidate !== null) {
					picked = candidate;
					donorCourt = donorCourtNumber;
					break;
				}
			}

			if (picked === null || donorCourt === null) break;

			removePlayerFromCourt(result, donorCourt, picked);
			addPlayerToCourt(result, courtNumber, picked);
			moved.add(picked);
		}
	}

	return result;
}

/** Replacement inherits the retiree's court slot; roster count unchanged. */
export function applyReplacementSlot(
	assignments: readonly CourtAssignment[],
	retiredPlayerId: number,
	replacementPlayerId: number
): CourtAssignment[] {
	return assignments.map((a) => {
		if (!a.playerIds.includes(retiredPlayerId)) {
			return { courtNumber: a.courtNumber, playerIds: [...a.playerIds] };
		}
		return {
			courtNumber: a.courtNumber,
			playerIds: a.playerIds.map((id) => (id === retiredPlayerId ? replacementPlayerId : id))
		};
	});
}

export function resolvePreseedRetirement(opts: {
	readonly assignments: readonly CourtAssignment[];
	readonly prevResults: readonly CourtResult[];
	readonly retiredPlayerId: number;
	readonly policy: PreseedRetirementPolicy;
	readonly newCourtSizes: readonly number[];
	readonly frozenCourtNumbers: ReadonlySet<number>;
	readonly replacementPlayerId?: number;
}): CourtAssignment[] {
	if (opts.replacementPlayerId !== undefined) {
		return applyReplacementSlot(
			opts.assignments,
			opts.retiredPlayerId,
			opts.replacementPlayerId
		);
	}

	const retiredCourt = opts.assignments.find((a) => a.playerIds.includes(opts.retiredPlayerId));
	if (retiredCourt && opts.frozenCourtNumbers.has(retiredCourt.courtNumber)) {
		return cloneAssignments(opts.assignments);
	}

	if (opts.policy === 'shrink') {
		return applyPreseedShrink(
			opts.assignments,
			opts.retiredPlayerId,
			opts.newCourtSizes,
			opts.frozenCourtNumbers
		);
	}

	return applyPreseedCascade(
		opts.assignments,
		opts.prevResults,
		opts.retiredPlayerId,
		opts.newCourtSizes,
		opts.frozenCourtNumbers
	);
}

export type ForwardRetirementReplacement = {
	readonly retiredPlayerId: number;
	readonly replacementPlayerId: number;
};

/**
 * Apply format-specific forward retirement policies to assignment templates.
 * Used after closeRound (injury forward) and can unify between-round preseed logic.
 */
export function resolveForwardRetirement(opts: {
	readonly formatType: FormatType;
	readonly policy: PreseedRetirementPolicy;
	readonly templateAssignments: readonly CourtAssignment[];
	readonly previousRoundResults: readonly CourtResult[];
	readonly retiredPlayerIds: ReadonlySet<number>;
	readonly replacements: readonly ForwardRetirementReplacement[];
	readonly newCourtSizes: readonly number[];
	readonly originalCourtCount: number;
	readonly roundsCompleted: number;
	readonly frozenCourtNumbers: ReadonlySet<number>;
}): CourtAssignment[] {
	if (opts.retiredPlayerIds.size === 0) {
		return cloneAssignments(opts.templateAssignments);
	}

	if (opts.formatType === 'random-seed') {
		return buildRedistributionFromResults(
			'random-seed',
			opts.previousRoundResults,
			opts.newCourtSizes,
			opts.roundsCompleted,
			opts.originalCourtCount,
			opts.retiredPlayerIds
		);
	}

	const replacementMap = new Map(
		opts.replacements.map((r) => [r.retiredPlayerId, r.replacementPlayerId])
	);
	let result = cloneAssignments(opts.templateAssignments);
	const retiredOrdered = [...opts.retiredPlayerIds].sort((a, b) => a - b);

	for (const retiredId of retiredOrdered) {
		result = resolvePreseedRetirement({
			assignments: result,
			prevResults: opts.previousRoundResults,
			retiredPlayerId: retiredId,
			policy: opts.policy,
			newCourtSizes: opts.newCourtSizes,
			frozenCourtNumbers: opts.frozenCourtNumbers,
			replacementPlayerId: replacementMap.get(retiredId)
		});
	}

	return result;
}

// ============================================================================
// Player Retirement
// ============================================================================

export type PriorRetiree = {
	readonly retiredCourt: number | null;
	readonly finalStanding: number | null;
};

export function computeRetirementFinalStanding(opts: {
	formatType: FormatType;
	retiredCourt: number;
	totalCourts: number;
	currentRound: number;
	numRounds: number;
	newCourtSizes: readonly number[];
	priorRetirees: readonly PriorRetiree[];
}): number {
	const {
		formatType,
		retiredCourt,
		totalCourts,
		currentRound,
		numRounds,
		newCourtSizes,
		priorRetirees
	} = opts;

	if (formatType === 'preseed') {
		const bracketRange = getPreseedBracketRange(retiredCourt, totalCourts);
		const sameBracketCount = priorRetirees.filter((p) => {
			if (!p.retiredCourt) return false;
			const pRange = getPreseedBracketRange(p.retiredCourt, totalCourts);
			return pRange.min === bracketRange.min && pRange.max === bracketRange.max;
		}).length;
		return bracketRange.max - sameBracketCount;
	}

	const standing = calculateRetiredStanding(
		retiredCourt,
		totalCourts,
		currentRound - 1,
		numRounds,
		'random-seed',
		newCourtSizes
	);
	const sameStandingRetirees = priorRetirees.filter(
		(p) => p.finalStanding === standing || p.finalStanding === standing - 1
	);
	let adjusted = standing;
	for (const r of sameStandingRetirees) {
		if (r.retiredCourt && r.retiredCourt > retiredCourt) {
			adjusted = standing - 1;
			break;
		}
	}
	return adjusted;
}

export function buildRedistributionFromResults(
	formatType: FormatType,
	courtResults: readonly CourtResult[],
	newCourtSizes: readonly number[],
	roundsCompleted: number,
	originalCourtCount: number,
	excludedPlayerIds?: ReadonlySet<number>,
	tieBreak?: TieBreakSortOptions
): CourtAssignment[] {
	const courtCount = newCourtSizes.length;
	if (formatType === 'preseed') {
		return processPreseedTransition(
			courtResults,
			newCourtSizes,
			roundsCompleted,
			originalCourtCount,
			tieBreak
		);
	}
	if (roundsCompleted === 0) {
		return verticalSeeding(courtResults, courtCount, newCourtSizes, excludedPlayerIds, tieBreak);
	}
	return ladderRedistribute(courtResults, courtCount, newCourtSizes, excludedPlayerIds);
}

export function resolveAssignmentsAfterRetirement(opts: {
	formatType: FormatType;
	redistributedAssignments: readonly CourtAssignment[];
	originalPlayerCount: number;
	roundsCompleted: number;
}): CourtAssignment[] {
	if (opts.formatType === 'preseed') {
		const frozenCourts = getFrozenCourts(
			calculateCourtSizes(opts.originalPlayerCount),
			opts.roundsCompleted,
			'preseed'
		);
		if (frozenCourts.length === 0) {
			return opts.redistributedAssignments.map((a) => ({
				courtNumber: a.courtNumber,
				playerIds: [...a.playerIds]
			}));
		}
		const frozenNumbers = new Set(frozenCourts.map((f) => f.courtNumber));
		return opts.redistributedAssignments
			.filter((a) => !frozenNumbers.has(a.courtNumber))
			.map((a) => ({
				courtNumber: a.courtNumber,
				playerIds: [...a.playerIds]
			}));
	}

	return opts.redistributedAssignments.map((a) => ({
		courtNumber: a.courtNumber,
		playerIds: [...a.playerIds]
	}));
}

export function resolveAssignmentsAfterUndoRetirement(opts: {
	formatType: FormatType;
	redistributedAssignments: readonly CourtAssignment[];
	restoredPlayerCount: number;
	roundsCompleted: number;
}): CourtAssignment[] {
	return resolveAssignmentsAfterRetirement({
		formatType: opts.formatType,
		redistributedAssignments: opts.redistributedAssignments,
		originalPlayerCount: opts.restoredPlayerCount,
		roundsCompleted: opts.roundsCompleted
	});
}

export function matchInvolvesPlayer(
	m: Pick<MatchData, 'teamAPlayer1Id' | 'teamAPlayer2Id' | 'teamBPlayer1Id' | 'teamBPlayer2Id'>,
	playerId: number
): boolean {
	return (
		m.teamAPlayer1Id === playerId ||
		m.teamAPlayer2Id === playerId ||
		m.teamBPlayer1Id === playerId ||
		m.teamBPlayer2Id === playerId
	);
}

export function applyInjuryToUnscoredMatch(
	match: MatchData,
	playerId: number,
	option: 'substitute' | 'cancel'
): MatchData {
	if (match.teamAScore !== null) return match;
	if (!matchInvolvesPlayer(match, playerId)) return match;
	if (option === 'cancel') {
		return { ...match, isCanceled: true };
	}
	return { ...match, injuredPlayerIds: [playerId] };
}

export function applyInjuryToGroupMatches(
	matches: readonly MatchData[],
	playerId: number,
	option: 'substitute' | 'cancel'
): MatchData[] {
	return matches.map((m) => applyInjuryToUnscoredMatch(m, playerId, option));
}

export function revertInjuryOnMatch(match: MatchData, playerId: number): MatchData {
	if (match.isCanceled && matchInvolvesPlayer(match, playerId) && match.teamAScore === null) {
		return { ...match, isCanceled: false };
	}
	if ((match.injuredPlayerIds ?? []).includes(playerId) && match.teamAScore === null) {
		return { ...match, injuredPlayerIds: [] };
	}
	return match;
}

export function revertInjuryOnGroupMatches(
	matches: readonly MatchData[],
	playerId: number
): MatchData[] {
	return matches.map((m) => revertInjuryOnMatch(m, playerId));
}

/** True when scores were entered on injury-affected matches after the injury report. */
export function hasFreshScoresAfterInjury(
	matches: readonly MatchData[],
	playerId: number
): boolean {
	const hasCanceled = matches.some((m) => m.isCanceled);
	const hasInjuredFlag = matches.some((m) => (m.injuredPlayerIds ?? []).includes(playerId));

	if (hasCanceled) {
		return matches.some((m) => m.teamAScore !== null && m.isCanceled);
	}
	if (hasInjuredFlag) {
		return matches.some(
			(m) => m.teamAScore !== null && (m.injuredPlayerIds ?? []).includes(playerId)
		);
	}
	return false;
}

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
