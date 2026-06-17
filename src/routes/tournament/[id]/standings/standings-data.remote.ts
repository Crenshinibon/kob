import { query } from '$app/server';
import { db } from '$lib/server/db';
import { tournament, courtRotation, match, player } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import * as v from 'valibot';
import * as m from '$lib/paraglide/messages';
import {
	calculateCourtStandings,
	calculateCourtSizes,
	matchCountForCourtSize,
	isMatchComplete,
	getFrozenCourts,
	type MatchData,
	type MatchSetScore
} from '$lib/server/tournament-logic';

async function fetchStandingsData(tournamentId: number) {
	const [tourney] = await db.select().from(tournament).where(eq(tournament.id, tournamentId));

	if (!tourney) return { error: m.tournament_not_found() };

	const players = await db.select().from(player).where(eq(player.tournamentId, tournamentId));

	const courtSizes: number[] = tourney.courtSizes ? JSON.parse(tourney.courtSizes) : [4, 4, 4, 4];
	const originalCourtSizes = calculateCourtSizes(tourney.playerCount);
	const matchCountPerCourt = courtSizes.map((s) => matchCountForCourtSize(s));

	// Compute frozen courts for preseed
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
		const pIds = [
			cr.player1Id,
			cr.player2Id,
			...(cr.player3Id ? [cr.player3Id] : []),
			...(cr.player4Id ? [cr.player4Id] : []),
			...(cr.player5Id ? [cr.player5Id] : []),
			...(cr.player6Id ? [cr.player6Id] : [])
		];
		pIds.forEach((pid) => {
			courtAssignment[pid] = { court: cr.courtNumber, rank: null };
		});
	}

	// For frozen court players not in current round, use their last round's court
	for (const fc of frozenCourts) {
		const frozenRotations = rotations.filter(
			(r) => r.roundNumber === fc.freezeAfterRound && r.courtNumber === fc.courtNumber
		);
		for (const fr of frozenRotations) {
			const pIds = [
				fr.player1Id,
				fr.player2Id,
				...(fr.player3Id ? [fr.player3Id] : []),
				...(fr.player4Id ? [fr.player4Id] : []),
				...(fr.player5Id ? [fr.player5Id] : []),
				...(fr.player6Id ? [fr.player6Id] : [])
			];
			for (const pid of pIds) {
				if (pid != null && courtAssignment[pid] === undefined) {
					courtAssignment[pid] = { court: fc.courtNumber, rank: null };
				}
			}
		}
	}

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

	for (let roundNum = 1; roundNum <= (tourney.currentRound || 1); roundNum++) {
		const roundRotations = rotations.filter((r) => r.roundNumber === roundNum);

		for (const rotation of roundRotations) {
			const matches = await db.select().from(match).where(eq(match.courtRotationId, rotation.id));

			const courtIdx = rotation.courtNumber - 1;
			const requiredMatches = matchCountPerCourt[courtIdx] ?? 3;
			const matchGroups = new Map<number, MatchSetScore[]>();
			for (const m of matches) {
				const group = matchGroups.get(m.matchNumber);
				if (group) {
					group.push(m);
				} else {
					matchGroups.set(m.matchNumber, [m]);
				}
			}
			const allMatchesComplete =
				matches.length > 0 &&
				matchGroups.size >= requiredMatches &&
				[...matchGroups.values()].every((group) => isMatchComplete(group));
			if (!allMatchesComplete) continue;

			const playerIds: number[] = [
				rotation.player1Id,
				rotation.player2Id,
				...(rotation.player3Id ? [rotation.player3Id] : []),
				...(rotation.player4Id ? [rotation.player4Id] : []),
				...(rotation.player5Id ? [rotation.player5Id] : []),
				...(rotation.player6Id ? [rotation.player6Id] : [])
			];

			const courtStandings = calculateCourtStandings(matches as MatchData[], playerIds);

			courtStandings.forEach((standing) => {
				const stats = playerStats[standing.playerId];
				if (stats) {
					stats.totalPoints += standing.points;
					stats.totalDiff += standing.diff;
					stats.roundsPlayed++;
					stats.matchesPlayed += requiredMatches;
					stats.roundHistory.push({
						round: roundNum,
						court: rotation.courtNumber,
						rankOnCourt: standing.rank,
						points: standing.points,
						diff: standing.diff
					});

					if (roundNum === tourney.currentRound) {
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
