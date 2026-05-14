import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { tournament, courtRotation, match, player } from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { calculateCourtStandings, matchCountForCourtSize } from '$lib/server/tournament-logic';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) throw redirect(302, '/login');

	const tournamentId = parseInt(params.id);
	const [tourney] = await db
		.select()
		.from(tournament)
		.where(and(eq(tournament.id, tournamentId), eq(tournament.orgId, user.id)));

	if (!tourney) throw error(404, 'Tournament not found');

	// Get all players
	const players = await db.select().from(player).where(eq(player.tournamentId, tournamentId));

	// Get court sizes
	const courtSizes: number[] = tourney.courtSizes ? JSON.parse(tourney.courtSizes) : [4, 4, 4, 4]; // fallback
	const matchCountPerCourt = courtSizes.map((s) => matchCountForCourtSize(s));

	// Get all rotations
	const rotations = await db
		.select()
		.from(courtRotation)
		.where(eq(courtRotation.tournamentId, tournamentId));

	// Calculate standings across all rounds
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

	// Initialize stats for all players
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

	// Process each round to build history
	for (let roundNum = 1; roundNum <= (tourney.currentRound || 1); roundNum++) {
		const roundRotations = rotations.filter((r) => r.roundNumber === roundNum);

		for (const rotation of roundRotations) {
			const matches = await db.select().from(match).where(eq(match.courtRotationId, rotation.id));

			// Check if all matches for this court have scores
			const courtIdx = rotation.courtNumber - 1;
			const requiredMatches = matchCountPerCourt[courtIdx] ?? 3;
			const allMatchesComplete =
				matches.length >= requiredMatches && matches.every((m) => m.teamAScore !== null);
			if (!allMatchesComplete) continue;

			// Get all player IDs from this court (including player5/6)
			const playerIds: number[] = [
				rotation.player1Id,
				rotation.player2Id,
				...(rotation.player3Id ? [rotation.player3Id] : []),
				...(rotation.player4Id ? [rotation.player4Id] : []),
				...(rotation.player5Id ? [rotation.player5Id] : []),
				...(rotation.player6Id ? [rotation.player6Id] : [])
			];

			// Calculate court standings
			const courtStandings = calculateCourtStandings(matches as any[], playerIds);

			// Update player stats
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

					// Track current round performance for ranking
					if (roundNum === tourney.currentRound) {
						stats.currentRoundPoints = standing.points;
						stats.currentRoundDiff = standing.diff;
					}
				}
			});
		}
	}

	// Rank players: Primary sort by total points, secondary by total differential, tertiary by playerId
	const standings = Object.values(playerStats)
		.filter((s) => s.roundsPlayed > 0)
		.sort((a, b) => {
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

	return { tournament: tourney, standings, players, courtSizes, retiredPlayers };
};

// StandingsPlayer type is implicit from usage
