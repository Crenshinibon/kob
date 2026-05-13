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
export type SchedulingMode = 'batch' | 'rolling';

export type TournamentConfig = {
	readonly tournamentId: TournamentId;
	readonly formatType: FormatType;
	readonly playerCount: number;
	readonly schedulingMode: SchedulingMode;
	readonly courtSizes: readonly number[];
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
	if (leftover === 0) return { totalCourts: playerCount / 4, standardCourts: playerCount / 4, bottomCourtSize: null };

	const bottomSize = leftover === 1 ? 5 : leftover === 2 ? 6 : 3;
	const standard = (playerCount - bottomSize) / 4;
	return { totalCourts: standard + 1, standardCourts: standard, bottomCourtSize: bottomSize };
}

export function calculateCourtSizes(playerCount: number): number[] {
	const { totalCourts, standardCourts, bottomCourtSize } = getCourtConfiguration(playerCount);
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
	if (courtCount <= 4) return 3;
	if (courtCount <= 8) return 4;
	if (courtCount <= 16) return 5;
	return 6;
}

// ============================================================================
// Tournament Initialization
// ============================================================================

export type CreateTournamentOpts = {
	tournamentId: TournamentId;
	formatType: FormatType;
	playerCount: number;
	schedulingMode?: SchedulingMode;
};

export function createInitialState(opts: CreateTournamentOpts): TournamentState {
	const { tournamentId, formatType, playerCount, schedulingMode = 'batch' } = opts;
	if (playerCount < 8 || playerCount > 64) throw new Error(`Player count must be 8-64, got ${playerCount}`);
	const courtSizes = calculateCourtSizes(playerCount);
	return {
		config: { tournamentId, formatType, playerCount, schedulingMode, courtSizes },
		players: [], roundsCompleted: 0, currentRound: 0,
		totalRounds: calculateRoundCount(courtSizes.length, formatType),
		isComplete: false, completedRounds: [], currentAssignments: [], nextAssignments: [], currentMatches: []
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
		const assignments = state.config.formatType === 'preseed'
			? generatePreseedRound1(state.config.courtSizes, state.players)
			: generateRandomRound1(state.config.courtSizes, state.players);
		return { ...state, currentRound: 1, currentAssignments: assignments,
			currentMatches: assignments.map((a) => genMatchForAssignment(state.config.courtSizes, a)) };
	}

	// Subsequent rounds: use pre-computed assignments from closeRound
	if (state.nextAssignments.length === 0) throw new Error('Call closeRound first.');
	return { ...state, currentRound: nextRound,
		currentAssignments: state.nextAssignments,
		currentMatches: state.nextAssignments.map((a) => genMatchForAssignment(state.config.courtSizes, a)),
		nextAssignments: [], isComplete: nextRound >= state.totalRounds };
}

// ============================================================================
// Snake Distribution
// ============================================================================

function snakeDistribute(items: number[], courtSizes: readonly number[]): CourtAssignment[] {
	const courtCount = courtSizes.length;
	const stdCourts = courtSizes.filter((s) => s === 4).length;
	const courts = Array.from({ length: courtCount }, (_, i) => ({ courtNumber: i + 1, playerIds: [] as number[] }));

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

function generatePreseedRound1(courtSizes: readonly number[], players: readonly Player[]): CourtAssignment[] {
	const sorted = [...players].sort((a, b) => {
		if (a.seedPoints !== null && b.seedPoints !== null) return b.seedPoints - a.seedPoints;
		if (a.seedPoints !== null) return -1;
		if (b.seedPoints !== null) return 1;
		return a.id - b.id;
	});
	return snakeDistribute(sorted.map((p) => p.id), courtSizes);
}

function generateRandomRound1(courtSizes: readonly number[], players: readonly Player[]): CourtAssignment[] {
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

export function redistributePreseedRecursive(courtResults: readonly CourtResult[]): CourtAssignment[] {
	const N = courtResults.length;
	if (N === 0) return [];
	if (N === 1) return [{ courtNumber: 1, playerIds: courtResults[0].standings.map((s) => s.playerId) }];

	const sorted = [...courtResults].sort((a, b) => a.courtNumber - b.courtNumber);
	const W = splitSize(N);
	const winners = sorted.slice(0, W);
	const losers = sorted.slice(W);

	const w = redistributePreseedRecursive(winners);
	const l = redistributePreseedRecursive(losers);

	return [...w.map((a, i) => ({ courtNumber: i + 1, playerIds: a.playerIds })),
			...l.map((a, i) => ({ courtNumber: W + i + 1, playerIds: a.playerIds }))];
}

// ============================================================================
// Vertical Seeding
// ============================================================================

export function verticalSeeding(courtResults: readonly CourtResult[], targetCourtCount: number): CourtAssignment[] {
	const sorted = [...courtResults].sort((a, b) => a.courtNumber - b.courtNumber);
	const maxRank = sorted.reduce((m, c) => Math.max(m, c.standings.length), 0);
	const groups: number[][] = [];

	for (let r = 0; r < maxRank; r++) {
		const g: number[] = [];
		for (const c of sorted) if (c.standings[r]) g.push(c.standings[r].playerId);
		g.sort((a, b) => a - b);
		groups.push(g);
	}

	const assignments: CourtAssignment[] = [];
	const pos = new Array(groups.length).fill(0);

	for (let c = 0; c < targetCourtCount; c++) {
		const pids: number[] = [];
		let gi = 0;
		while (pids.length < 4 && gi < groups.length) {
			const g = groups[gi];
			const canTake = Math.min(4 - pids.length, g.length - pos[gi]);
			for (let k = 0; k < canTake; k++) pids.push(g[pos[gi] + k]);
			pos[gi] += canTake;
			if (pos[gi] >= g.length) gi++;
			else if (pids.length >= 4) break;
			else gi++;
		}
		if (pids.length > 0) assignments.push({ courtNumber: c + 1, playerIds: pids });
	}
	return assignments;
}

// ============================================================================
// Ladder Redistribution (2-up/2-down)
// ============================================================================

export function ladderRedistribute(courtResults: readonly CourtResult[], targetCourtCount: number): CourtAssignment[] {
	const sorted = [...courtResults].sort((a, b) => a.courtNumber - b.courtNumber);
	const n = sorted.length;
	const assignments: CourtAssignment[] = [];

	for (let i = 0; i < targetCourtCount; i++) {
		const pids: number[] = [];

		if (n === 2) {
			if (i === 0) { takeN(sorted[0], 0, 2, pids); takeN(sorted[1], 0, 2, pids); }
			else { takeN(sorted[0], 2, 4, pids); takeN(sorted[1], 2, 4, pids); }
		} else if (i === 0) {
			takeN(sorted[0], 0, 2, pids);
			if (sorted[1]) takeN(sorted[1], 0, 2, pids);
		} else if (i === targetCourtCount - 1) {
			if (sorted[i - 1]) takeN(sorted[i - 1], Math.max(0, sorted[i - 1].standings.length - 2), sorted[i - 1].standings.length, pids);
			takeN(sorted[i], Math.max(0, sorted[i].standings.length - 2), sorted[i].standings.length, pids);
		} else {
			if (sorted[i - 1]) takeN(sorted[i - 1], Math.max(0, sorted[i - 1].standings.length - 2), sorted[i - 1].standings.length, pids);
			if (sorted[i + 1]) takeN(sorted[i + 1], 0, 2, pids);
		}

		if (pids.length > 0) assignments.push({ courtNumber: i + 1, playerIds: pids });
	}
	return assignments;
}

function takeN(court: CourtResult, from: number, to: number, target: number[]): void {
	for (let i = from; i < Math.min(to, court.standings.length); i++) target.push(court.standings[i].playerId);
}

export function redistributeLadder(
	courtResults: readonly CourtResult[],
	isFirstRound: boolean,
	courtCount: number
): CourtAssignment[] {
	if (isFirstRound) return verticalSeeding(courtResults, courtCount);
	return ladderRedistribute(courtResults, courtCount);
}

// ============================================================================
// Close Round
// ============================================================================

export function closeRound(state: TournamentState): TournamentState {
	if (state.currentRound === 0) throw new Error('No active round to close');
	if (state.currentMatches.length === 0) throw new Error('No matches have been generated for this round');
	const scoredCount = state.currentMatches.filter((m): m is MatchData =>
		m !== undefined && m.teamAScore !== null && m.teamBScore !== null
	).length;
	if (scoredCount === 0) throw new Error('No scored matches in this round');

	// Calculate standings for each court
	const courtResults: CourtResult[] = state.currentAssignments.map((assign) => {
		const matches = state.currentMatches.filter((m): m is MatchData =>
			m !== undefined && assign.playerIds.some((pid) =>
				pid === m.teamAPlayer1Id || pid === m.teamAPlayer2Id ||
				pid === m.teamBPlayer1Id || pid === m.teamBPlayer2Id
			));
		return { courtNumber: assign.courtNumber, standings: calculateCourtStandings(matches, assign.playerIds) };
	});

	const updated = [...state.completedRounds, courtResults];
	const nextRound = state.roundsCompleted + 1;

	if (nextRound >= state.totalRounds) {
		return { ...state, completedRounds: updated, roundsCompleted: nextRound,
			currentAssignments: [], currentMatches: [], isComplete: true, currentRound: state.currentRound };
	}

	// Generate next round assignments
	let nextAssignments: CourtAssignment[];
	if (state.config.formatType === 'preseed') {
		nextAssignments = redistributePreseedRecursive(courtResults);
	} else if (state.roundsCompleted === 0) {
		nextAssignments = verticalSeeding(courtResults, state.config.courtSizes.length);
	} else {
		nextAssignments = ladderRedistribute(courtResults, state.config.courtSizes.length);
	}

	return { ...state, completedRounds: updated, roundsCompleted: nextRound, isComplete: false,
		currentAssignments: [], currentMatches: [], nextAssignments, currentRound: state.currentRound };
}

// ============================================================================
// Standings Calculation
// ============================================================================

export function calculateCourtStandings(
	matches: MatchData[],
	playerIds: readonly number[]
): CourtStandings[] {
	const stats: Record<number, { playerId: number; points: number; for: number; against: number }> = {};
	playerIds.forEach((id) => { stats[id] = { playerId: id, points: 0, for: 0, against: 0 }; });

	matches.forEach((m) => {
		if (m.teamAScore === null || m.teamBScore === null) return;
		stats[m.teamAPlayer1Id].points += m.teamAScore; stats[m.teamAPlayer1Id].for += m.teamAScore; stats[m.teamAPlayer1Id].against += m.teamBScore;
		stats[m.teamAPlayer2Id].points += m.teamAScore; stats[m.teamAPlayer2Id].for += m.teamAScore; stats[m.teamAPlayer2Id].against += m.teamBScore;
		stats[m.teamBPlayer1Id].points += m.teamBScore; stats[m.teamBPlayer1Id].for += m.teamBScore; stats[m.teamBPlayer1Id].against += m.teamAScore;
		stats[m.teamBPlayer2Id].points += m.teamBScore; stats[m.teamBPlayer2Id].for += m.teamBScore; stats[m.teamBPlayer2Id].against += m.teamAScore;
	});

	return Object.values(stats)
		.map((s) => ({ ...s, diff: s.for - s.against }))
		.sort((a, b) => b.points - a.points || b.diff - a.diff || a.playerId - b.playerId)
		.map((s, i) => ({ ...s, rank: i + 1 }));
}

// ============================================================================
// Match Generation
// ============================================================================

export function generate4pMatches(playerIds: readonly number[]): MatchData[] {
	if (playerIds.length !== 4) throw new Error(`Expected 4 players, got ${playerIds.length}`);
	const [p1, p2, p3, p4] = playerIds;
	return [
		{ teamAPlayer1Id: p1, teamAPlayer2Id: p2, teamBPlayer1Id: p3, teamBPlayer2Id: p4, teamAScore: null, teamBScore: null },
		{ teamAPlayer1Id: p1, teamAPlayer2Id: p3, teamBPlayer1Id: p2, teamBPlayer2Id: p4, teamAScore: null, teamBScore: null },
		{ teamAPlayer1Id: p1, teamAPlayer2Id: p4, teamBPlayer1Id: p2, teamBPlayer2Id: p3, teamAScore: null, teamBScore: null }
	];
}

export function generate3pMatches(playerIds: readonly number[]): MatchData[] {
	if (playerIds.length !== 3) throw new Error(`Expected 3 players, got ${playerIds.length}`);
	const [p1, p2, p3] = playerIds;
	return [
		{ teamAPlayer1Id: p1, teamAPlayer2Id: p2, teamBPlayer1Id: p3, teamBPlayer2Id: p3, teamAScore: null, teamBScore: null },
		{ teamAPlayer1Id: p1, teamAPlayer2Id: p3, teamBPlayer1Id: p2, teamBPlayer2Id: p2, teamAScore: null, teamBScore: null },
		{ teamAPlayer1Id: p2, teamAPlayer2Id: p3, teamBPlayer1Id: p1, teamBPlayer2Id: p1, teamAScore: null, teamBScore: null }
	];
}

function genMatchForAssignment(courtSizes: readonly number[], assignment: CourtAssignment): MatchData {
	const idx = assignment.courtNumber - 1;
	const size = courtSizes[idx] ?? 4;
	switch (size) {
		case 3: return generate3pMatches(assignment.playerIds)[0];
		case 4: return generate4pMatches(assignment.playerIds)[0];
		case 5:
		case 6:
			return {
				teamAPlayer1Id: assignment.playerIds[0], teamAPlayer2Id: assignment.playerIds[1],
				teamBPlayer1Id: assignment.playerIds[2],
				teamBPlayer2Id: assignment.playerIds.length > 3 ? assignment.playerIds[3] : assignment.playerIds[2],
				teamAScore: null, teamBScore: null
			};
		default: return generate4pMatches(assignment.playerIds)[0];
	}
}

export function matchCountForCourtSize(courtSize: number): number {
	switch (courtSize) { case 3: return 3; case 4: return 3; case 5: case 6: return 4; default: throw new Error(`Invalid court size: ${courtSize}`); }
}

export function generateAllMatchesForAssignment(assignment: CourtAssignment, courtSizes: readonly number[]): MatchData[] {
	const idx = assignment.courtNumber - 1;
	const size = courtSizes[idx] ?? 4;
	switch (size) {
		case 3: return generate3pMatches(assignment.playerIds);
		case 4: return generate4pMatches(assignment.playerIds);
		case 5:
		case 6: {
			const [p1, p2, p3] = assignment.playerIds;
			const p4 = assignment.playerIds.length > 3 ? assignment.playerIds[3] : assignment.playerIds[2];
			const p5 = assignment.playerIds.length > 4 ? assignment.playerIds[4] : assignment.playerIds[0];
			const p6 = assignment.playerIds.length > 5 ? assignment.playerIds[5] : assignment.playerIds[1];
			return [
				{ teamAPlayer1Id: p1, teamAPlayer2Id: p2, teamBPlayer1Id: p3, teamBPlayer2Id: p4, teamAScore: null, teamBScore: null },
				{ teamAPlayer1Id: p1, teamAPlayer2Id: p3, teamBPlayer1Id: p5, teamBPlayer2Id: p6, teamAScore: null, teamBScore: null },
				{ teamAPlayer1Id: p1, teamAPlayer2Id: p4, teamBPlayer1Id: p5, teamBPlayer2Id: p2, teamAScore: null, teamBScore: null },
				{ teamAPlayer1Id: p2, teamAPlayer2Id: p6, teamBPlayer1Id: p3, teamBPlayer2Id: p4, teamAScore: null, teamBScore: null }
			];
		}
		default: return generate4pMatches(assignment.playerIds);
	}
}

export function countScoredMatches(courtMatches: readonly (MatchData | undefined)[]): number {
	return courtMatches.filter((m) => m !== undefined && m.teamAScore !== null && m.teamBScore !== null).length;
}

// ============================================================================
// Utilities
// ============================================================================

export function getTop2(court: { standings: readonly { playerId: number; rank: number }[] }): number[] {
	return court.standings.filter((s) => s.rank <= 2).map((s) => s.playerId);
}

export function getBottom2(court: { standings: readonly { playerId: number; rank: number }[] }): number[] {
	const len = court.standings.length;
	return court.standings.filter((s) => s.rank > len - 2).map((s) => s.playerId);
}