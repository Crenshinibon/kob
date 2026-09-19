import {
	calculateCourtStandings,
	getBracketGroups,
	getFrozenCourts,
	isMatchComplete,
	matchInvolvesPlayer,
	verticalSeeding,
	type CourtResult,
	type FormatType,
	type MatchData,
	type MatchSetScore
} from '$lib/tournament-logic';

export type PlayerRoundState =
	| 'completed'
	| 'retired'
	| 'injured'
	| 'frozen'
	| 'eliminated'
	| 'court_done'
	| 'waiting'
	| 'active'
	| 'not_started';

export type PlayerMovement = 'up' | 'down' | 'same' | null;

export function derivePlayerRoundState(input: {
	tournamentStatus: string;
	currentRound: number;
	player: {
		retiredAt: Date | null;
		retiredRound: number | null;
		injuredAt: Date | null;
	};
	rotation: { courtNumber: number } | null;
	isFrozen: boolean;
	isFinalRound: boolean;
	courtComplete: boolean;
	shiftPlaying: boolean;
}): PlayerRoundState {
	if (input.tournamentStatus === 'completed') return 'completed';
	if (input.tournamentStatus === 'setup' || input.currentRound === 0) return 'not_started';
	if (
		input.player.retiredAt &&
		((input.player.retiredRound ?? 0) < input.currentRound || !input.rotation)
	) {
		return 'retired';
	}
	if (input.player.injuredAt && input.rotation) return 'injured';
	if (input.isFrozen) return 'frozen';
	if (input.isFinalRound && !input.rotation) return 'eliminated';
	if (input.rotation && input.courtComplete) return 'court_done';
	if (input.rotation && !input.shiftPlaying) return 'waiting';
	if (input.rotation) return 'active';
	return 'not_started';
}

export function movementFor(prevCourt: number | null, currentCourt: number | null): PlayerMovement {
	if (prevCourt == null || currentCourt == null) return null;
	if (currentCourt < prevCourt) return 'up';
	if (currentCourt > prevCourt) return 'down';
	return 'same';
}

export type NextHint = {
	courtNumber: number | null;
	group: 'winners' | 'losers' | null;
	direction: 'up' | 'down' | 'same';
};

export function nextHintFor(
	formatType: FormatType,
	round: number,
	rank: number,
	courtNumber: number,
	courtCount: number,
	_courtSize: number
): NextHint | null {
	if (formatType === 'random-seed' && round === 1) return null;
	if (formatType === 'preseed') {
		return {
			courtNumber: null,
			group: rank <= 2 ? 'winners' : 'losers',
			direction: rank <= 2 ? 'up' : 'down'
		};
	}
	const dest = ladderDestination(courtNumber, rank, courtCount);
	const direction = dest < courtNumber ? 'up' : dest > courtNumber ? 'down' : 'same';
	return { courtNumber: dest, group: null, direction };
}

export function ladderDestination(courtNumber: number, rank: number, courtCount: number): number {
	if (rank <= 2) return Math.max(1, courtNumber - 1);
	return Math.min(courtCount, courtNumber + 1);
}

export function matchRun(matchNumber: number, courtSize: number): number {
	if (courtSize >= 5) return matchNumber <= 2 ? 1 : 2;
	return matchNumber;
}

export type NumberedMatch = MatchData & {
	matchNumber?: number;
	id?: number;
	setNumber?: number;
};

export type OrientedSetView = { id: number; a: number | null; b: number | null };

export type OrientedMatchView = {
	matchNumber: number;
	matchIds: number[];
	setNumbers: number[];
	youOnTeam: 'a' | 'b' | null;
	partnerName: string | null;
	opponentNames: string[];
	solo: boolean;
	sitOut: boolean;
	sets: OrientedSetView[];
	diffForGame: number | null;
	isCanceled: boolean;
	hasSubstitute: boolean;
	run: number;
};

export function teamOfPlayer(
	m: Pick<MatchData, 'teamAPlayer1Id' | 'teamAPlayer2Id' | 'teamBPlayer1Id' | 'teamBPlayer2Id'>,
	playerId: number
): 'a' | 'b' | null {
	if (m.teamAPlayer1Id === playerId || m.teamAPlayer2Id === playerId) return 'a';
	if (m.teamBPlayer1Id === playerId || m.teamBPlayer2Id === playerId) return 'b';
	return null;
}

export function orientMatchForPlayer(
	m: MatchData,
	playerId: number
): { youOnTeam: 'a' | 'b' | null; a: number | null; b: number | null } {
	const youOnTeam = teamOfPlayer(m, playerId);
	if (youOnTeam === 'b') {
		return { youOnTeam, a: m.teamBScore, b: m.teamAScore };
	}
	return { youOnTeam, a: m.teamAScore, b: m.teamBScore };
}

function uniqueNames(ids: number[], names: Map<number, string>, except: number): string[] {
	const seen = new Set<number>();
	const result: string[] = [];
	for (const id of ids) {
		if (id === except || seen.has(id)) continue;
		seen.add(id);
		result.push(names.get(id) ?? `#${id}`);
	}
	return result;
}

export function playerMatchesView(
	matches: readonly NumberedMatch[],
	playerId: number,
	courtSize: number,
	names: Map<number, string>
): OrientedMatchView[] {
	const byNumber = new Map<number, NumberedMatch[]>();
	matches.forEach((m, i) => {
		const num = m.matchNumber ?? i + 1;
		const list = byNumber.get(num) ?? [];
		list.push(m);
		byNumber.set(num, list);
	});

	const views: OrientedMatchView[] = [];
	for (const [matchNumber, sets] of [...byNumber.entries()].sort((a, b) => a[0] - b[0])) {
		const first = sets[0];
		const youOnTeam = teamOfPlayer(first, playerId);
		const sitOut = youOnTeam === null;
		const teamAIds = [first.teamAPlayer1Id, first.teamAPlayer2Id];
		const teamBIds = [first.teamBPlayer1Id, first.teamBPlayer2Id];
		const yourTeam = youOnTeam === 'b' ? teamBIds : teamAIds;
		const oppTeam = youOnTeam === 'b' ? teamAIds : teamBIds;
		const partnerName = sitOut ? null : (uniqueNames(yourTeam, names, playerId)[0] ?? null);
		const opponentNames = sitOut
			? uniqueNames([...teamAIds, ...teamBIds], names, playerId)
			: uniqueNames(oppTeam, names, -1);
		const orientedSets = sets.map((s) => {
			const o = orientMatchForPlayer(s, playerId);
			return { id: s.id ?? 0, a: o.a, b: o.b };
		});
		const scored = orientedSets.filter((s) => s.a != null && s.b != null);
		const diffForGame = sitOut
			? null
			: scored.length === 0
				? null
				: scored.reduce((sum, s) => sum + ((s.a ?? 0) - (s.b ?? 0)), 0);
		const solo = !sitOut && yourTeam[0] === yourTeam[1];
		views.push({
			matchNumber,
			matchIds: sets.map((s) => s.id ?? 0),
			setNumbers: sets.map((s) => s.setNumber ?? 1),
			youOnTeam,
			partnerName: solo ? null : partnerName,
			opponentNames,
			solo,
			sitOut,
			sets: orientedSets,
			diffForGame,
			isCanceled: sets.some((s) => s.isCanceled),
			hasSubstitute: sets.some((s) => (s.injuredPlayerIds ?? []).length > 0),
			run: matchRun(matchNumber, courtSize)
		});
	}
	return views;
}

export type SplitPlayerMatches = {
	current: OrientedMatchView | null;
	parallel: OrientedMatchView[];
	upcoming: OrientedMatchView[];
};

function setsComplete(sets: readonly MatchSetScore[]): boolean {
	return isMatchComplete(sets);
}

export function splitPlayerMatches(
	matches: readonly NumberedMatch[],
	playerId: number,
	courtSize: number,
	names: Map<number, string> = new Map()
): SplitPlayerMatches {
	const views = playerMatchesView(matches, playerId, courtSize, names);
	const byRun = new Map<number, OrientedMatchView[]>();
	for (const v of views) {
		const list = byRun.get(v.run) ?? [];
		list.push(v);
		byRun.set(v.run, list);
	}

	let current: OrientedMatchView | null = null;
	const parallel: OrientedMatchView[] = [];
	const upcoming: OrientedMatchView[] = [];

	for (const run of [...byRun.keys()].sort((a, b) => a - b)) {
		const group = byRun.get(run)!;
		const open = group.filter(
			(g) =>
				!g.isCanceled &&
				!setsComplete(
					g.sets.map((s) => ({
						teamAScore: s.a,
						teamBScore: s.b,
						isCanceled: false
					}))
				)
		);
		const playerOpen = open.filter((g) => !g.sitOut);
		const playerFinishedAll = group
			.filter((g) => !g.sitOut)
			.every(
				(g) =>
					g.isCanceled ||
					setsComplete(
						g.sets.map((s) => ({
							teamAScore: s.a,
							teamBScore: s.b,
							isCanceled: false
						}))
					)
			);

		if (open.length === 0) continue;

		if (!current) {
			if (playerOpen.length > 0) {
				current = playerOpen[0];
				parallel.push(...group.filter((g) => g !== current && open.includes(g)));
				continue;
			}
			if (!playerFinishedAll) {
				current = { ...group[0], sitOut: true, youOnTeam: null };
				parallel.push(...open);
				continue;
			}
		}

		upcoming.push(...playerOpen);
	}

	return { current, parallel, upcoming };
}

export const WAIT_CLOCK_FAST_ROUND_FACTOR = 0.75;

export function waitClock(
	factsUpdatedAt: Date,
	remainingMs: number,
	now: Date,
	factor: number = WAIT_CLOCK_FAST_ROUND_FACTOR
): Date | null {
	const beAt = new Date(factsUpdatedAt.getTime() + Math.max(0, remainingMs) * factor);
	if (beAt.getTime() <= now.getTime()) return null;
	return beAt;
}

export function placeForCourtRank(
	courtSizes: readonly number[],
	courtNumber: number,
	rank: number
): number {
	let place = 0;
	for (let i = 0; i < courtNumber - 1; i++) place += courtSizes[i] ?? 4;
	return place + rank;
}

export type MovementWhy = {
	key: string;
	params: Record<string, string | number>;
};

export function movementWhy(input: {
	formatType: FormatType;
	round: number;
	rank: number;
	courtNumber: number;
	courtCount: number;
	nextCourt: number | null;
	frozen: boolean;
	manualAdjusted: boolean;
	joinedRound: number | null;
	winnersRole?: string;
	losersRole?: string;
	winnersMin?: number;
	winnersMax?: number;
	losersMin?: number;
	losersMax?: number;
}): MovementWhy | null {
	if (input.joinedRound != null && input.joinedRound === input.round) {
		return { key: 'player_history_why_joined', params: { n: input.joinedRound } };
	}
	if (input.manualAdjusted) {
		return { key: 'player_history_why_manual', params: {} };
	}
	if (input.frozen) {
		return { key: 'player_history_why_frozen', params: {} };
	}
	if (input.formatType === 'preseed') {
		if (input.rank <= 2) {
			return {
				key: 'player_history_why_preseed_winners',
				params: {
					role: input.winnersRole ?? "winners' group",
					min: input.winnersMin ?? 1,
					max: input.winnersMax ?? 8
				}
			};
		}
		return {
			key: 'player_history_why_preseed_losers',
			params: {
				role: input.losersRole ?? "losers' group",
				min: input.losersMin ?? 9,
				max: input.losersMax ?? 16
			}
		};
	}
	if (input.round === 1) {
		return {
			key: 'player_history_why_vertical',
			params: { nth: input.rank, court: input.nextCourt ?? input.courtNumber }
		};
	}
	if (input.rank <= 2) {
		if (input.courtNumber === 1) return { key: 'player_history_why_ladder_stay_top', params: {} };
		return { key: 'player_history_why_ladder_up', params: {} };
	}
	if (input.courtNumber === input.courtCount) {
		return { key: 'player_history_why_ladder_stay_bottom', params: {} };
	}
	return { key: 'player_history_why_ladder_down', params: {} };
}

function cloneMatch(m: MatchData): MatchData {
	return {
		teamAPlayer1Id: m.teamAPlayer1Id,
		teamAPlayer2Id: m.teamAPlayer2Id,
		teamBPlayer1Id: m.teamBPlayer1Id,
		teamBPlayer2Id: m.teamBPlayer2Id,
		teamAScore: m.teamAScore,
		teamBScore: m.teamBScore,
		isCanceled: m.isCanceled,
		injuredPlayerIds: m.injuredPlayerIds
	};
}

function fillRemainingMatch(
	m: MatchData,
	playerId: number,
	mode: 'win' | 'lose',
	target: number,
	winBy: number
): MatchData {
	const team = teamOfPlayer(m, playerId);
	if (!team) return m;
	if (m.isCanceled) return m;
	if (m.teamAScore != null && m.teamBScore != null) return m;
	const winner = target;
	const loser = Math.max(0, target - winBy);
	if (mode === 'win') {
		return team === 'a'
			? { ...m, teamAScore: winner, teamBScore: loser }
			: { ...m, teamAScore: loser, teamBScore: winner };
	}
	return team === 'a'
		? { ...m, teamAScore: 0, teamBScore: target }
		: { ...m, teamAScore: target, teamBScore: 0 };
}

export function reachableRanksOnCourt(
	playerId: number,
	matches: readonly MatchData[],
	playerIds: readonly number[],
	scoring: { pointsToWin: number; winBy: number }
): { bestRank: number; safeRank: number } | null {
	const anyScore = matches.some((m) => m.teamAScore != null && m.teamBScore != null);
	if (!anyScore) return null;

	const bestFilled = matches.map((m) =>
		fillRemainingMatch(cloneMatch(m), playerId, 'win', scoring.pointsToWin, scoring.winBy)
	);
	const safeFilled = matches.map((m) =>
		fillRemainingMatch(cloneMatch(m), playerId, 'lose', scoring.pointsToWin, scoring.winBy)
	);
	const bestStandings = calculateCourtStandings(bestFilled, playerIds);
	const safeStandings = calculateCourtStandings(safeFilled, playerIds);
	const bestRank = bestStandings.find((s) => s.playerId === playerId)?.rank ?? playerIds.length;
	const safeRank = safeStandings.find((s) => s.playerId === playerId)?.rank ?? playerIds.length;
	return { bestRank, safeRank };
}

export type ReachableFinalPlaceContext = {
	formatType: FormatType;
	currentRound: number;
	numRounds: number;
	courtNumber: number;
	courtSizes: readonly number[];
	bestRankOnCourt: number | null;
	safeRankOnCourt: number | null;
	liveRoundResults: CourtResult[] | null;
	frozenCourtNumbers: ReadonlySet<number>;
	playerId?: number;
};

function remainingTransitions(currentRound: number, numRounds: number): number {
	return Math.max(0, numRounds - currentRound);
}

function walkBestLadder(
	courtNumber: number,
	rank: number,
	steps: number,
	courtCount: number
): { court: number; rank: number } {
	let k = courtNumber;
	let r = rank;
	for (let i = 0; i < steps; i++) {
		k = ladderDestination(k, r, courtCount);
		r = 1;
	}
	return { court: k, rank: r };
}

function walkSafeLadder(
	courtNumber: number,
	rank: number,
	courtCount: number,
	courtSizes: readonly number[]
): { court: number; rank: number } {
	const dest = ladderDestination(courtNumber, rank, courtCount);
	const last = courtSizes[dest - 1] ?? 4;
	return { court: dest, rank: last };
}

function preseedGroupRange(
	courtNumber: number,
	courtSizes: readonly number[],
	roundsCompleted: number
): { lo: number; hi: number; minPlace: number; maxPlace: number } {
	const groups = getBracketGroups(courtSizes.length, Math.max(0, roundsCompleted));
	const group = groups.find((g) => g.includes(courtNumber)) ?? [courtNumber];
	const lo = Math.min(...group);
	const hi = Math.max(...group);
	return {
		lo,
		hi,
		minPlace: placeForCourtRank(courtSizes, lo, 1),
		maxPlace: placeForCourtRank(courtSizes, hi, courtSizes[hi - 1] ?? 4)
	};
}

export function reachableFinalPlaceRange(ctx: ReachableFinalPlaceContext): {
	best: number;
	worst: number;
	minCourt: number;
	maxCourt: number;
} {
	const courtCount = ctx.courtSizes.length;
	const size = ctx.courtSizes[ctx.courtNumber - 1] ?? 4;
	const bestRank = ctx.bestRankOnCourt ?? 1;
	const safeRank = ctx.safeRankOnCourt ?? size;
	const t = remainingTransitions(ctx.currentRound, ctx.numRounds);

	if (ctx.frozenCourtNumbers.has(ctx.courtNumber)) {
		const place = placeForCourtRank(ctx.courtSizes, ctx.courtNumber, bestRank);
		const safePlace = placeForCourtRank(ctx.courtSizes, ctx.courtNumber, safeRank);
		return {
			best: Math.min(place, safePlace),
			worst: Math.max(place, safePlace),
			minCourt: ctx.courtNumber,
			maxCourt: ctx.courtNumber
		};
	}

	if (t === 0) {
		const best = placeForCourtRank(ctx.courtSizes, ctx.courtNumber, bestRank);
		const worst = placeForCourtRank(ctx.courtSizes, ctx.courtNumber, safeRank);
		return { best, worst, minCourt: ctx.courtNumber, maxCourt: ctx.courtNumber };
	}

	if (ctx.formatType === 'preseed') {
		const group = preseedGroupRange(ctx.courtNumber, ctx.courtSizes, ctx.currentRound - 1);
		if (ctx.bestRankOnCourt == null && ctx.safeRankOnCourt == null) {
			return {
				best: group.minPlace,
				worst: group.maxPlace,
				minCourt: group.lo,
				maxCourt: group.hi
			};
		}
		const winners = bestRank <= Math.ceil(size / 2);
		const losers = safeRank > Math.floor(size / 2);
		if (winners && !losers) {
			const mid = group.lo + Math.floor((group.hi - group.lo + 1) / 2) - 1;
			const hi = Math.max(group.lo, mid);
			return {
				best: placeForCourtRank(ctx.courtSizes, group.lo, 1),
				worst: placeForCourtRank(ctx.courtSizes, hi, ctx.courtSizes[hi - 1] ?? 4),
				minCourt: group.lo,
				maxCourt: hi
			};
		}
		if (!winners && losers) {
			const split = group.lo + Math.floor((group.hi - group.lo + 1) / 2);
			return {
				best: placeForCourtRank(ctx.courtSizes, split, 1),
				worst: group.maxPlace,
				minCourt: split,
				maxCourt: group.hi
			};
		}
		return { best: group.minPlace, worst: group.maxPlace, minCourt: group.lo, maxCourt: group.hi };
	}

	if (
		ctx.formatType === 'random-seed' &&
		ctx.currentRound === 1 &&
		ctx.liveRoundResults &&
		ctx.playerId
	) {
		const nextFromVertical = (rank: number): number => {
			const results: CourtResult[] = ctx.liveRoundResults!.map((c) => {
				if (c.courtNumber !== ctx.courtNumber) return c;
				const standings = c.standings.map((s) =>
					s.playerId === ctx.playerId ? { ...s, rank } : s
				);
				return { courtNumber: c.courtNumber, standings };
			});
			const assignments = verticalSeeding(results, courtCount, ctx.courtSizes);
			const found = assignments.find((a) => a.playerIds.includes(ctx.playerId!));
			return found?.courtNumber ?? ctx.courtNumber;
		};
		const bestCourt = nextFromVertical(bestRank);
		const safeCourt = nextFromVertical(safeRank);
		const bestRest = walkBestLadder(bestCourt, 1, t - 1, courtCount);
		return {
			best: placeForCourtRank(ctx.courtSizes, bestRest.court, 1),
			worst: placeForCourtRank(ctx.courtSizes, safeCourt, ctx.courtSizes[safeCourt - 1] ?? 4),
			minCourt: bestRest.court,
			maxCourt: safeCourt
		};
	}

	const bestEnd = walkBestLadder(ctx.courtNumber, bestRank, t, courtCount);
	const safeEnd =
		t <= 1
			? walkSafeLadder(ctx.courtNumber, safeRank, courtCount, ctx.courtSizes)
			: walkSafeLadder(ctx.courtNumber, safeRank, courtCount, ctx.courtSizes);

	return {
		best: placeForCourtRank(ctx.courtSizes, bestEnd.court, bestEnd.rank),
		worst: placeForCourtRank(ctx.courtSizes, safeEnd.court, safeEnd.rank),
		minCourt: bestEnd.court,
		maxCourt: safeEnd.court
	};
}

export function shouldAutoCheckIn(
	tournament: { status: string; orgId: string },
	player: { checkedInAt: Date | null; checkInSource: string | null },
	viewerUserId: string | null
): boolean {
	if (tournament.status !== 'setup' && tournament.status !== 'active') return false;
	if (player.checkedInAt != null) return false;
	if (player.checkInSource != null) return false;
	if (viewerUserId && viewerUserId === tournament.orgId) return false;
	return true;
}

export function checkInWasUsed(
	players: readonly { checkedInAt: Date | null; checkInSource: string | null }[],
	checkInClosedAt: Date | null
): boolean {
	if (checkInClosedAt) return true;
	return players.some((p) => p.checkedInAt != null || p.checkInSource != null);
}
