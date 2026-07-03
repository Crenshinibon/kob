import { query } from '$app/server';
import { db } from '$lib/server/db';
import { tournament, courtRotation, match, player } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import * as v from 'valibot';
import * as m from '$lib/paraglide/messages';
import {
	calculateCourtSizes,
	matchCountForCourtSize,
	isMatchComplete,
	getFrozenCourts,
	normalizeTieBreakConfig,
	type MatchData,
	type MatchSetScore,
	type CourtStandings
} from '$lib/server/tournament-logic';
import {
	buildCompletedRoundsBefore,
	hasStandingsSnapshot,
	resolveRotationStandings,
	snapshotToCourtStandings
} from '$lib/server/court-standings-service';

const STANDARD_GAMES_PER_ROUND = 3;

function roundPointsContribution(standing: CourtStandings, courtSize: number): number {
	if (courtSize >= 5) {
		const raw = standing.rawPoints ?? standing.points * (standing.matchCount || 1);
		return raw / STANDARD_GAMES_PER_ROUND;
	}
	return standing.rawPoints ?? standing.points;
}

function rotationPlayerIds(rotation: typeof courtRotation.$inferSelect): number[] {
	return [
		rotation.player1Id,
		rotation.player2Id,
		...(rotation.player3Id !== null ? [rotation.player3Id] : []),
		...(rotation.player4Id !== null ? [rotation.player4Id] : []),
		...(rotation.player5Id !== null ? [rotation.player5Id] : []),
		...(rotation.player6Id !== null ? [rotation.player6Id] : [])
	];
}

function courtSizesForRound(
	roundRotations: readonly (typeof courtRotation.$inferSelect)[],
	defaultCourtSizes: readonly number[]
): number[] {
	const maxCourt = Math.max(...roundRotations.map((r) => r.courtNumber), defaultCourtSizes.length);
	const sizes: number[] = [];
	for (let i = 0; i < maxCourt; i++) {
		const rotation = roundRotations.find((r) => r.courtNumber === i + 1);
		sizes.push(rotation?.courtSize ?? defaultCourtSizes[i] ?? 4);
	}
	return sizes;
}

async function fetchStandingsData(tournamentId: number) {
	const [tourney] = await db.select().from(tournament).where(eq(tournament.id, tournamentId));

	if (!tourney) return { error: m.tournament_not_found() };

	const players = await db.select().from(player).where(eq(player.tournamentId, tournamentId));

	const courtSizes: number[] = tourney.courtSizes ? JSON.parse(tourney.courtSizes) : [4, 4, 4, 4];
	const originalCourtSizes = calculateCourtSizes(tourney.playerCount);

	const roundsCompleted = (tourney.currentRound ?? 1) - 1;
	const frozenCourts =
		tourney.formatType === 'preseed'
			? getFrozenCourts(originalCourtSizes, roundsCompleted, 'preseed')
			: [];

	const rotations = await db
		.select()
		.from(courtRotation)
		.where(eq(courtRotation.tournamentId, tournamentId));

	const currentRound = tourney.currentRound || 1;
	const currentRotations = rotations.filter((r) => r.roundNumber === currentRound);
	const courtAssignment: Record<number, { court: number; rank: number | null }> = {};
	for (const cr of currentRotations) {
		const pIds = rotationPlayerIds(cr);
		pIds.forEach((pid) => {
			courtAssignment[pid] = { court: cr.courtNumber, rank: null };
		});
	}

	for (const fc of frozenCourts) {
		const frozenRotations = rotations.filter(
			(r) => r.roundNumber === fc.freezeAfterRound && r.courtNumber === fc.courtNumber
		);
		for (const fr of frozenRotations) {
			const pIds = rotationPlayerIds(fr);
			for (const pid of pIds) {
				if (pid != null && courtAssignment[pid] === undefined) {
					courtAssignment[pid] = { court: fc.courtNumber, rank: null };
				}
			}
		}
	}

	const logicPlayers = players.map((p) => ({
		id: p.id,
		name: p.name,
		seedPoints: p.seedPoints,
		seedRank: p.seedRank
	}));
	const tieBreakConfig = normalizeTieBreakConfig(tourney.tieBreakConfig ?? null);
	const playerNames = new Map(players.map((p) => [p.id, p.name]));

	const playerStats: Record<
		number,
		{
			playerId: number;
			playerName: string;
			totalPoints: number;
			totalDiff: number;
			roundsPlayed: number;
			matchesPlayed: number;
			roundHistory: Array<{
				round: number;
				court: number;
				rankOnCourt: number;
				points: number;
				diff: number;
			}>;
			currentRoundPoints: number;
			currentRoundDiff: number;
		}
	> = {};

	players.forEach((p) => {
		playerStats[p.id] = {
			playerId: p.id,
			playerName: p.name,
			totalPoints: 0,
			totalDiff: 0,
			roundsPlayed: 0,
			matchesPlayed: 0,
			roundHistory: [],
			currentRoundPoints: 0,
			currentRoundDiff: 0
		};
	});

	for (let roundNum = 1; roundNum <= currentRound; roundNum++) {
		const roundRotations = rotations
			.filter((r) => r.roundNumber === roundNum)
			.sort((a, b) => a.courtNumber - b.courtNumber);
		const completedBeforeThisRound = await buildCompletedRoundsBefore(
			tournamentId,
			roundNum,
			courtSizes,
			logicPlayers,
			tieBreakConfig,
			rotations
		);
		const roundCourtSizes = courtSizesForRound(roundRotations, courtSizes);

		for (const rotation of roundRotations) {
			const courtSize = rotation.courtSize ?? courtSizes[rotation.courtNumber - 1] ?? 4;
			const requiredMatches = matchCountForCourtSize(courtSize);
			const matches = await db.select().from(match).where(eq(match.courtRotationId, rotation.id));

			const matchGroups = new Map<number, MatchSetScore[]>();
			for (const row of matches) {
				const group = matchGroups.get(row.matchNumber);
				const scoreRow: MatchSetScore = {
					teamAScore: row.teamAScore,
					teamBScore: row.teamBScore,
					isCanceled: row.isCanceled
				};
				if (group) group.push(scoreRow);
				else matchGroups.set(row.matchNumber, [scoreRow]);
			}
			const allMatchesComplete =
				matches.length > 0 &&
				matchGroups.size >= requiredMatches &&
				[...matchGroups.values()].every((group) => isMatchComplete(group));
			if (!allMatchesComplete) continue;

			const playerIds = rotationPlayerIds(rotation);
			let courtStandings: CourtStandings[];

			if (hasStandingsSnapshot(rotation) && rotation.standingsSnapshot) {
				courtStandings = snapshotToCourtStandings(rotation.standingsSnapshot);
			} else {
				const matchData: MatchData[] = matches.map((row) => ({
					teamAPlayer1Id: row.teamAPlayer1Id,
					teamAPlayer2Id: row.teamAPlayer2Id,
					teamBPlayer1Id: row.teamBPlayer1Id,
					teamBPlayer2Id: row.teamBPlayer2Id,
					teamAScore: row.teamAScore,
					teamBScore: row.teamBScore,
					isCanceled: row.isCanceled ?? false,
					injuredPlayerIds: row.injuredPlayerIds ?? undefined
				}));
				const result = resolveRotationStandings({
					rotation,
					matchData,
					playerIds,
					playerNames,
					players,
					completedRounds: completedBeforeThisRound,
					courtSizes: roundCourtSizes,
					tourney,
					useSnapshot: false
				});
				courtStandings = result.standings;
			}

			courtStandings.forEach((standing) => {
				const stats = playerStats[standing.playerId];
				if (stats) {
					stats.totalPoints += roundPointsContribution(standing, courtSize);
					stats.totalDiff += standing.rawDiff ?? standing.diff;
					stats.roundsPlayed++;
					stats.matchesPlayed += requiredMatches;
					stats.roundHistory.push({
						round: roundNum,
						court: rotation.courtNumber,
						rankOnCourt: standing.rank,
						points: standing.points,
						diff: standing.diff
					});

					if (roundNum === currentRound) {
						stats.currentRoundPoints = standing.points;
						stats.currentRoundDiff = standing.diff;
					}
				}
			});
		}
	}

	const frozenCourtNumbers = new Set(frozenCourts.map((f) => f.courtNumber));

	const standings = Object.values(playerStats)
		.filter((s) => s.roundsPlayed > 0)
		.sort((a, b) => {
			const aHist = a.roundHistory.find((h) => h.round === tourney.currentRound);
			const bHist = b.roundHistory.find((h) => h.round === tourney.currentRound);
			const aLastRound = a.roundHistory[a.roundHistory.length - 1];
			const bLastRound = b.roundHistory[b.roundHistory.length - 1];
			const aCourt = aHist?.court ?? courtAssignment[a.playerId]?.court ?? aLastRound?.court;
			const bCourt = bHist?.court ?? courtAssignment[b.playerId]?.court ?? bLastRound?.court;
			if (aCourt != null && bCourt != null && aCourt !== bCourt) return aCourt - bCourt;
			if (aCourt == null && bCourt != null) return 1;
			if (aCourt != null && bCourt == null) return -1;
			const aFrozen = aCourt != null ? frozenCourtNumbers.has(aCourt) : false;
			const bFrozen = bCourt != null ? frozenCourtNumbers.has(bCourt) : false;
			if (aFrozen !== bFrozen) return aFrozen ? 1 : -1;
			const aRank = aHist?.rankOnCourt ?? aLastRound?.rankOnCourt;
			const bRank = bHist?.rankOnCourt ?? bLastRound?.rankOnCourt;
			if (aRank != null && bRank != null && aRank !== bRank) return aRank - bRank;
			if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
			if (b.totalDiff !== a.totalDiff) return b.totalDiff - a.totalDiff;
			return a.playerId - b.playerId;
		})
		.map((s, i) => ({ ...s, overallRank: i + 1 }));

	const retiredPlayers = players
		.filter((p) => p.retiredAt)
		.map((p) => ({
			id: p.id,
			name: p.name,
			retiredRound: p.retiredRound,
			retirementReason: p.retirementReason,
			finalStanding: p.finalStanding
		}));

	const injuredIds = new Set(players.filter((p) => p.injuredAt).map((p) => p.id));
	const retiredIds = new Set(retiredPlayers.filter((p) => !injuredIds.has(p.id)).map((p) => p.id));
	const activeStandings = standings
		.filter((s) => !retiredIds.has(s.playerId))
		.map((s, i) => ({ ...s, overallRank: i + 1 }));

	return {
		tournament: tourney,
		standings: activeStandings,
		players,
		courtSizes,
		retiredPlayers,
		injuredPlayerIds: [...injuredIds],
		courtAssignment,
		frozenCourts
	};
}

export const getStandingsData = query(v.number(), async (tournamentId) => {
	return fetchStandingsData(tournamentId);
});
