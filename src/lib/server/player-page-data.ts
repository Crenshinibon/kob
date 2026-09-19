import { error } from '@sveltejs/kit';
import * as m from '$lib/paraglide/messages';
import { db } from '$lib/server/db';
import { court, courtRotation, match, player, tournament } from '$lib/server/db/schema';
import { eq, inArray } from 'drizzle-orm';
import {
	estimateRoundDurationMinutes,
	getBatchShifts,
	getEffectiveScoring,
	getFrozenCourts,
	getScoringLabel,
	getShiftForCourt,
	isMatchComplete,
	matchCountForCourtSize,
	type DurationConfig,
	type MatchData,
	type ScoringOverrides
} from '$lib/tournament-logic';
import {
	checkInWasUsed,
	derivePlayerRoundState,
	movementFor,
	movementWhy,
	nextHintFor,
	playerMatchesView,
	reachableFinalPlaceRange,
	reachableRanksOnCourt,
	splitPlayerMatches,
	waitClock,
	type PlayerRoundState
} from '$lib/player-page-logic';
import { fetchStandingsData, rotationPlayerIds } from '$lib/server/standings-service';
import { bracketCourtSizes, parseStoredCourtSizes } from '$lib/server/court-size-config';

export type PlayerPageData = Awaited<ReturnType<typeof fetchPlayerPageData>>;

function toMatchData(
	row: typeof match.$inferSelect
): MatchData & { matchNumber: number; id: number; setNumber: number } {
	return {
		id: row.id,
		matchNumber: row.matchNumber,
		setNumber: row.setNumber,
		teamAPlayer1Id: row.teamAPlayer1Id,
		teamAPlayer2Id: row.teamAPlayer2Id,
		teamBPlayer1Id: row.teamBPlayer1Id,
		teamBPlayer2Id: row.teamBPlayer2Id,
		teamAScore: row.teamAScore,
		teamBScore: row.teamBScore,
		isCanceled: row.isCanceled ?? false,
		injuredPlayerIds: row.injuredPlayerIds ?? undefined
	};
}

function groupsComplete(
	rows: {
		matchNumber: number;
		teamAScore: number | null;
		teamBScore: number | null;
		isCanceled?: boolean | null;
	}[],
	courtSize: number
): boolean {
	const groups = new Map<number, typeof rows>();
	for (const row of rows) {
		const g = groups.get(row.matchNumber) ?? [];
		g.push(row);
		groups.set(row.matchNumber, g);
	}
	return (
		groups.size >= matchCountForCourtSize(courtSize) &&
		[...groups.values()].every((g) =>
			isMatchComplete(
				g.map((s) => ({
					teamAScore: s.teamAScore,
					teamBScore: s.teamBScore,
					isCanceled: s.isCanceled ?? false
				}))
			)
		)
	);
}

export async function fetchPlayerPageData(token: string) {
	const [row] = await db.select().from(player).where(eq(player.token, token));
	if (!row) error(404, m.player_not_found());

	const [tourney] = await db.select().from(tournament).where(eq(tournament.id, row.tournamentId));
	if (!tourney) error(404, m.tournament_not_found());

	const players = await db.select().from(player).where(eq(player.tournamentId, tourney.id));
	const names = new Map(players.map((p) => [p.id, p.name]));
	const checkInUsed = checkInWasUsed(players, tourney.checkInClosedAt);
	const checkInOpen = checkInUsed && !tourney.checkInClosedAt && tourney.status === 'active';

	const rotations = await db
		.select()
		.from(courtRotation)
		.where(eq(courtRotation.tournamentId, tourney.id));
	const courts = await db.select().from(court).where(eq(court.tournamentId, tourney.id));
	const courtById = new Map(courts.map((c) => [c.id, c]));

	const currentRound = tourney.currentRound || 0;
	const courtSizes = tourney.status === 'setup' ? [] : parseStoredCourtSizes(tourney);
	const currentRotations = rotations.filter((r) => r.roundNumber === currentRound);
	const myRotation = currentRotations.find((r) => rotationPlayerIds(r).includes(row.id)) ?? null;
	const prevRotation =
		currentRound > 1
			? (rotations.find(
					(r) => r.roundNumber === currentRound - 1 && rotationPlayerIds(r).includes(row.id)
				) ?? null)
			: null;

	const frozen =
		tourney.formatType === 'preseed' && courtSizes.length > 0
			? getFrozenCourts(
					bracketCourtSizes(tourney, courtSizes.length),
					Math.max(0, currentRound - 1),
					'preseed'
				)
			: [];
	const frozenNumbers = new Set(frozen.map((f) => f.courtNumber));
	const isFrozen = myRotation ? frozenNumbers.has(myRotation.courtNumber) : false;

	const currentMatches = myRotation
		? (await db.select().from(match).where(eq(match.courtRotationId, myRotation.id))).map(
				toMatchData
			)
		: [];

	const matchesByRotation = new Map<number, ReturnType<typeof toMatchData>[]>();
	if (currentRotations.length > 0) {
		const currentIds = currentRotations.map((r) => r.id);
		const rows = await db.select().from(match).where(inArray(match.courtRotationId, currentIds));
		for (const r of rows) {
			const list = matchesByRotation.get(r.courtRotationId) ?? [];
			list.push(toMatchData(r));
			matchesByRotation.set(r.courtRotationId, list);
		}
	}

	const courtComplete = myRotation ? groupsComplete(currentMatches, myRotation.courtSize) : false;
	const physical = tourney.physicalCourtCount ?? 4;
	const shifts = getBatchShifts(currentRotations.length || courtSizes.length, physical);
	const shiftInfo = myRotation
		? getShiftForCourt(myRotation.courtNumber, shifts)
		: { shift: 1, total: 1 };
	const playingShift = shifts[0] ?? [];
	const playingComplete =
		playingShift.length === 0 ||
		playingShift.every((courtNumber) => {
			const rot = currentRotations.find((r) => r.courtNumber === courtNumber);
			if (!rot) return true;
			return groupsComplete(matchesByRotation.get(rot.id) ?? [], rot.courtSize);
		});
	const shiftPlaying = shiftInfo.shift <= 1 || (shiftInfo.shift === 2 && playingComplete);

	const state: PlayerRoundState = derivePlayerRoundState({
		tournamentStatus: tourney.status,
		currentRound,
		player: row,
		rotation: myRotation,
		isFrozen,
		isFinalRound: currentRound >= tourney.numRounds && tourney.status === 'active',
		courtComplete,
		shiftPlaying
	});

	const movement = movementFor(prevRotation?.courtNumber ?? null, myRotation?.courtNumber ?? null);
	const split = myRotation
		? splitPlayerMatches(currentMatches, row.id, myRotation.courtSize, names)
		: { current: null, parallel: [], upcoming: [] };

	const durationConfig: DurationConfig = {
		setupTimeMinutes: tourney.setupTimeMinutes ?? 15,
		transitionTimeMinutes: tourney.transitionTimeMinutes ?? 10,
		avgRallyDurationSeconds: tourney.avgRallyDurationSeconds ?? 35,
		timeBetweenRalliesSeconds: tourney.timeBetweenRalliesSeconds ?? 8,
		timeBetweenMatchesMinutes: tourney.timeBetweenMatchesMinutes ?? 3
	};
	const roundDur = courtSizes.length
		? estimateRoundDurationMinutes(
				courtSizes,
				tourney.pointsToWin ?? 21,
				tourney.setsToWin ?? 1,
				durationConfig
			)
		: 45;
	const factsUpdatedAt = tourney.lastActivityAt ?? tourney.startedAt ?? new Date();
	const remainingMs = !shiftPlaying
		? ((shiftInfo.shift - 1) * roundDur +
				(shiftInfo.shift - 1) * durationConfig.transitionTimeMinutes) *
			60_000
		: 0;
	const beAt = !shiftPlaying ? waitClock(factsUpdatedAt, remainingMs, new Date()) : null;

	const scoring = myRotation
		? getEffectiveScoring(
				myRotation.courtSize,
				{
					pointsToWin: tourney.pointsToWin ?? 21,
					winBy: tourney.winBy ?? 2,
					setsToWin: tourney.setsToWin ?? 1,
					decidingSetPoints: tourney.decidingSetPoints ?? 15
				},
				tourney.scoringOverrides as ScoringOverrides | null
			)
		: { pointsToWin: 21, winBy: 2, setsToWin: 1, decidingSetPoints: 15 };

	const standingsLive = await fetchStandingsData(tourney.id, { includeLiveCurrentRound: true });
	const myStanding =
		'standings' in standingsLive
			? standingsLive.standings.find((s) => s.playerId === row.id)
			: undefined;
	const rosterActive = players.filter((p) => !p.retiredAt).length;
	const activeTotal =
		tourney.status !== 'setup' && 'standings' in standingsLive && standingsLive.standings.length > 0
			? standingsLive.standings.length
			: rosterActive;

	const ranks = myRotation
		? reachableRanksOnCourt(row.id, currentMatches, rotationPlayerIds(myRotation), {
				pointsToWin: scoring.pointsToWin,
				winBy: scoring.winBy
			})
		: null;

	const liveResults =
		currentRotations.length > 0 && 'standings' in standingsLive
			? currentRotations.map((r) => ({
					courtNumber: r.courtNumber,
					standings: rotationPlayerIds(r).map((pid, i) => {
						const s = standingsLive.standings.find((st) => st.playerId === pid);
						const hist = s?.roundHistory.find((h) => h.round === currentRound);
						return {
							playerId: pid,
							rank: hist?.rankOnCourt ?? i + 1,
							points: hist?.points ?? 0,
							diff: hist?.diff ?? 0,
							matchCount: s?.matchesPlayed ?? 0
						};
					})
				}))
			: null;

	const range =
		myRotation && courtSizes.length > 0
			? reachableFinalPlaceRange({
					formatType: tourney.formatType as 'preseed' | 'random-seed',
					currentRound,
					numRounds: tourney.numRounds,
					courtNumber: myRotation.courtNumber,
					courtSizes,
					bestRankOnCourt: ranks?.bestRank ?? null,
					safeRankOnCourt: ranks?.safeRank ?? null,
					liveRoundResults: liveResults,
					frozenCourtNumbers: frozenNumbers,
					playerId: row.id
				})
			: { best: 1, worst: Math.max(1, activeTotal), minCourt: 1, maxCourt: courtSizes.length || 1 };

	const liveRank =
		myStanding?.roundHistory.find((h) => h.round === currentRound)?.rankOnCourt ??
		ranks?.bestRank ??
		null;
	const hint =
		myRotation && liveRank
			? nextHintFor(
					tourney.formatType as 'preseed' | 'random-seed',
					currentRound,
					liveRank,
					myRotation.courtNumber,
					courtSizes.length || currentRotations.length,
					myRotation.courtSize
				)
			: null;

	const courtsDone = currentRotations.filter((r) =>
		groupsComplete(matchesByRotation.get(r.id) ?? [], r.courtSize)
	).length;

	const courtStandings =
		myRotation && 'standings' in standingsLive
			? rotationPlayerIds(myRotation).map((pid) => {
					const s = standingsLive.standings.find((st) => st.playerId === pid);
					const hist = s?.roundHistory.find((h) => h.round === currentRound);
					return {
						rank: hist?.rankOnCourt ?? 0,
						name: names.get(pid) ?? '',
						points: hist?.points ?? 0,
						diff: hist?.diff ?? 0,
						isYou: pid === row.id
					};
				})
			: [];

	const history: {
		round: number;
		closed: boolean;
		isCurrentRound: boolean;
		courtNumber: number;
		label: string | null;
		courtSize: number;
		groupLabel: string;
		showWhy: boolean;
		rank: number | null;
		fromCourt: number | null;
		toCourt: number | null;
		movement: 'up' | 'down' | 'same' | null;
		whyKey: string | null;
		whyParams: Record<string, string | number> | null;
		matchNumber: number;
		partnerName: string | null;
		opponentNames: string[];
		solo: boolean;
		sitOut: boolean;
		sets: { a: number | null; b: number | null }[];
		diffForGame: number | null;
		isCanceled: boolean;
		hasSubstitute: boolean;
	}[] = [];

	const historyRotationIds = rotations.map((r) => r.id);
	const historyMatchRows =
		historyRotationIds.length > 0
			? await db.select().from(match).where(inArray(match.courtRotationId, historyRotationIds))
			: [];
	const historyByRotation = new Map<number, typeof historyMatchRows>();
	for (const hm of historyMatchRows) {
		const list = historyByRotation.get(hm.courtRotationId) ?? [];
		list.push(hm);
		historyByRotation.set(hm.courtRotationId, list);
	}

	for (const rotation of rotations) {
		const rows = historyByRotation.get(rotation.id) ?? [];
		if (rows.length === 0) continue;
		const views = playerMatchesView(rows.map(toMatchData), row.id, rotation.courtSize, names);
		const closed = rotation.roundClosedAt != null;
		const snapshotRank = rotation.standingsSnapshot?.find((s) => s.playerId === row.id);
		const nextRot = rotations.find(
			(r) => r.roundNumber === rotation.roundNumber + 1 && rotationPlayerIds(r).includes(row.id)
		);
		const prev = rotations.find(
			(r) => r.roundNumber === rotation.roundNumber - 1 && rotationPlayerIds(r).includes(row.id)
		);
		const why = closed
			? movementWhy({
					formatType: tourney.formatType as 'preseed' | 'random-seed',
					round: rotation.roundNumber,
					rank: snapshotRank?.rank ?? 0,
					courtNumber: rotation.courtNumber,
					courtCount: courtSizes.length || 1,
					nextCourt: nextRot?.courtNumber ?? null,
					frozen: frozenNumbers.has(rotation.courtNumber),
					manualAdjusted: !!rotation.manualAdjustedAt,
					joinedRound: row.joinedRound
				})
			: null;
		const finished = views.filter(
			(v) => v.isCanceled || v.sets.some((s) => s.a != null) || v.sitOut
		);
		for (const v of finished) {
			if (
				rotation.roundNumber === currentRound &&
				!v.sitOut &&
				!v.isCanceled &&
				!v.sets.some((s) => s.a != null)
			) {
				continue;
			}
			history.push({
				round: rotation.roundNumber,
				closed,
				isCurrentRound: rotation.roundNumber === currentRound,
				courtNumber: rotation.courtNumber,
				label: courtById.get(rotation.courtId)?.label ?? null,
				courtSize: rotation.courtSize,
				groupLabel: m.player_history_group({
					round: rotation.roundNumber,
					court: rotation.courtNumber
				}),
				showWhy: false,
				rank: snapshotRank?.rank ?? null,
				fromCourt: prev?.courtNumber ?? null,
				toCourt: nextRot?.courtNumber ?? null,
				movement: movementFor(prev?.courtNumber ?? null, nextRot?.courtNumber ?? null),
				whyKey: why?.key ?? null,
				whyParams: why?.params ?? null,
				matchNumber: v.matchNumber,
				partnerName: v.partnerName,
				opponentNames: v.opponentNames,
				solo: v.solo,
				sitOut: v.sitOut,
				sets: v.sets,
				diffForGame: v.diffForGame,
				isCanceled: v.isCanceled,
				hasSubstitute: v.hasSubstitute
			});
		}
	}

	history.sort((a, b) => b.round - a.round || b.matchNumber - a.matchNumber);
	const seenWhy = new Set<number>();
	for (const item of history) {
		if (item.closed && item.whyKey && !seenWhy.has(item.round)) {
			item.showWhy = true;
			seenWhy.add(item.round);
		}
	}

	const r1 = rotations.find((r) => r.roundNumber === 1 && rotationPlayerIds(r).includes(row.id));
	const usedAverages = rotations.some(
		(r) => rotationPlayerIds(r).includes(row.id) && r.courtSize >= 5
	);

	return {
		tournament: {
			id: tourney.id,
			name: tourney.name,
			status: tourney.status,
			currentRound,
			numRounds: tourney.numRounds,
			formatType: tourney.formatType,
			checkInOpen,
			checkInUsed,
			finishedEarly: tourney.finishedEarly,
			physicalCourtCount: physical
		},
		player: {
			id: row.id,
			name: row.name,
			token: row.token,
			joinedRound: row.joinedRound,
			finalStanding: row.finalStanding,
			seedRank: row.seedRank,
			seedPoints: row.seedPoints,
			checkedInAt: row.checkedInAt,
			retired: row.retiredAt
				? {
						round: row.retiredRound,
						reason: row.retirementReason,
						injured: !!row.injuredAt,
						replacedByName: row.replacedByPlayerId
							? (names.get(row.replacedByPlayerId) ?? null)
							: null
					}
				: null
		},
		state,
		movement,
		now: {
			court: myRotation
				? {
						courtNumber: myRotation.courtNumber,
						label: courtById.get(myRotation.courtId)?.label ?? null,
						courtSize: myRotation.courtSize,
						rotationId: myRotation.id,
						courtToken: courtById.get(myRotation.courtId)?.token ?? null,
						shift: shiftInfo.shift,
						totalShifts: shiftInfo.total,
						wait:
							!shiftPlaying && shiftInfo.total > 1
								? {
										beAtCourtAt: beAt?.toISOString() ?? null,
										factsUpdatedAt: factsUpdatedAt.toISOString()
									}
								: null,
						scoringLabel: getScoringLabel(
							{
								pointsToWin: tourney.pointsToWin ?? 21,
								setsToWin: tourney.setsToWin ?? 1,
								decidingSetPoints: tourney.decidingSetPoints ?? 15,
								winBy: tourney.winBy ?? 2
							},
							myRotation.courtSize,
							tourney.scoringOverrides as ScoringOverrides | null
						),
						isComplete: courtComplete,
						frozenAfterRound: isFrozen ? currentRound : null
					}
				: null,
			current: split.current,
			parallel: split.parallel,
			upcoming: split.upcoming,
			courtStandings,
			roundProgress: { courtsDone, courtsTotal: currentRotations.length },
			nextHint: hint
		},
		history,
		record: {
			seedRank: row.seedRank,
			seedPoints: row.seedPoints,
			startedCourt: r1?.courtNumber ?? null,
			totalPoints: myStanding?.totalPoints ?? 0,
			totalDiff: myStanding?.totalDiff ?? 0,
			matchesPlayed: myStanding?.matchesPlayed ?? 0,
			usedAverages
		},
		placement: {
			current: myStanding?.overallRank ?? null,
			total: activeTotal,
			best: range.best,
			worst: range.worst,
			isFinal:
				state === 'completed' ||
				state === 'retired' ||
				state === 'eliminated' ||
				(state === 'frozen' && courtComplete),
			nextCourt: hint?.courtNumber ?? null,
			minCourt: range.minCourt,
			maxCourt: range.maxCourt,
			rankCanStillChange: !courtComplete && state === 'active'
		}
	};
}
