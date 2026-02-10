import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { tournament, courtRotation, match, player } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

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

	// Get all completed rounds (rounds with matches that have scores)
	const rotations = await db
		.select()
		.from(courtRotation)
		.where(eq(courtRotation.tournamentId, tournamentId));

	// Calculate total standings
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
			roundHistory: []
		};
	});

	// Process each round
	for (let roundNum = 1; roundNum <= (tourney.currentRound || 1); roundNum++) {
		const roundRotations = rotations.filter((r) => r.roundNumber === roundNum);

		for (const rotation of roundRotations) {
			const matches = await db.select().from(match).where(eq(match.courtRotationId, rotation.id));

			// Check if all matches in this court have scores
			const allMatchesComplete =
				matches.length === 3 && matches.every((m) => m.teamAScore !== null);
			if (!allMatchesComplete) continue;

			// Calculate court standings for this round
			const courtStandings = calculateCourtStandings(matches, [
				rotation.player1Id,
				rotation.player2Id,
				rotation.player3Id,
				rotation.player4Id
			]);

			// Update player stats
			courtStandings.forEach((standing) => {
				const stats = playerStats[standing.playerId];
				if (stats) {
					stats.totalPoints += standing.points;
					stats.totalDiff += standing.diff;
					stats.roundsPlayed++;
					stats.matchesPlayed += 3;
					stats.roundHistory.push({
						round: roundNum,
						court: rotation.courtNumber,
						rankOnCourt: standing.rank,
						points: standing.points,
						diff: standing.diff
					});
				}
			});
		}
	}

	// Sort by total points, then differential
	const standings = Object.values(playerStats)
		.filter((s) => s.roundsPlayed > 0)
		.sort((a, b) => {
			if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
			return b.totalDiff - a.totalDiff;
		})
		.map((s, i) => ({ ...s, overallRank: i + 1 }));

	return { tournament: tourney, standings, players };
};

interface Match {
	teamAScore: number | null;
	teamBScore: number | null;
	teamAPlayer1Id: number;
	teamAPlayer2Id: number;
	teamBPlayer1Id: number;
	teamBPlayer2Id: number;
}

function calculateCourtStandings(matches: Match[], playerIds: number[]) {
	const stats: Record<number, { playerId: number; points: number; for: number; against: number }> =
		{};

	playerIds.forEach((id) => {
		stats[id] = { playerId: id, points: 0, for: 0, against: 0 };
	});

	matches.forEach((m) => {
		if (m.teamAScore === null || m.teamBScore === null) return;

		stats[m.teamAPlayer1Id].points += m.teamAScore;
		stats[m.teamAPlayer1Id].for += m.teamAScore;
		stats[m.teamAPlayer1Id].against += m.teamBScore;

		stats[m.teamAPlayer2Id].points += m.teamAScore;
		stats[m.teamAPlayer2Id].for += m.teamAScore;
		stats[m.teamAPlayer2Id].against += m.teamBScore;

		stats[m.teamBPlayer1Id].points += m.teamBScore;
		stats[m.teamBPlayer1Id].for += m.teamBScore;
		stats[m.teamBPlayer1Id].against += m.teamAScore;

		stats[m.teamBPlayer2Id].points += m.teamBScore;
		stats[m.teamBPlayer2Id].for += m.teamBScore;
		stats[m.teamBPlayer2Id].against += m.teamAScore;
	});

	return Object.values(stats)
		.map((s) => ({ ...s, diff: s.for - s.against }))
		.sort((a, b) => {
			if (b.points !== a.points) return b.points - a.points;
			if (b.diff !== a.diff) return b.diff - a.diff;
			return Math.random() - 0.5;
		})
		.map((s, i) => ({ ...s, rank: i + 1 }));
}
