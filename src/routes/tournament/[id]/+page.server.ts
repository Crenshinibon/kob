import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { tournament, courtRotation, match, courtAccess, player } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

export const load = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) throw redirect(302, '/login');

	const tournamentId = parseInt(params.id);
	const [tourney] = await db
		.select()
		.from(tournament)
		.where(and(eq(tournament.id, tournamentId), eq(tournament.orgId, user.id)));

	if (!tourney) throw error(404, 'Tournament not found');

	const currentRound = tourney.currentRound || 1;
	const courtCount = tourney.playerCount / 4;
	const rotations = await db
		.select()
		.from(courtRotation)
		.where(
			and(eq(courtRotation.tournamentId, tournamentId), eq(courtRotation.roundNumber, currentRound))
		);

	const courts = [];
	for (const rotation of rotations) {
		const matches = await db.select().from(match).where(eq(match.courtRotationId, rotation.id));

		const access = await db
			.select()
			.from(courtAccess)
			.where(eq(courtAccess.courtRotationId, rotation.id))
			.limit(1);

		const players = await db.select().from(player).where(eq(player.tournamentId, tournamentId));

		const playerMap = new Map(players.map((p: any) => [p.id, p]));

		courts.push({
			courtNumber: rotation.courtNumber,
			matches,
			token: access[0]?.token,
			players: [
				playerMap.get(rotation.player1Id),
				playerMap.get(rotation.player2Id),
				playerMap.get(rotation.player3Id),
				playerMap.get(rotation.player4Id)
			].filter(Boolean)
		});
	}

	const allMatches = courts.flatMap((c) => c.matches);
	const expectedMatches = courtCount * 3;
	const canCloseRound =
		allMatches.length === expectedMatches && allMatches.every((m) => m.teamAScore !== null);
	const isFinalRound = currentRound >= tourney.numRounds;

	return { tournament: tourney, courts, canCloseRound, isFinalRound, courtCount };
};

export const actions = {
	closeRound: async ({ params, locals }) => {
		const user = locals.user;
		if (!user) throw error(401, 'Unauthorized');

		const tournamentId = parseInt(params.id);

		const [tourney] = await db
			.select()
			.from(tournament)
			.where(and(eq(tournament.id, tournamentId), eq(tournament.orgId, user.id)));

		if (!tourney) throw error(404, 'Not found');
		if (tourney.status !== 'active') throw error(400, 'Tournament not active');

		const currentRound = tourney.currentRound || 1;
		const courtCount = tourney.playerCount / 4;
		const isPreseed = tourney.formatType === 'preseed';

		if (currentRound >= tourney.numRounds) {
			await db
				.update(tournament)
				.set({ status: 'completed' })
				.where(eq(tournament.id, tournamentId));

			throw redirect(303, `/tournament/${tournamentId}/standings`);
		} else {
			const rotations = await db
				.select()
				.from(courtRotation)
				.where(
					and(
						eq(courtRotation.tournamentId, tournamentId),
						eq(courtRotation.roundNumber, currentRound)
					)
				);

			const courtResults = [];
			for (const rotation of rotations) {
				const matches = await db.select().from(match).where(eq(match.courtRotationId, rotation.id));

				const playerIds = [
					rotation.player1Id,
					rotation.player2Id,
					rotation.player3Id,
					rotation.player4Id
				];

				const standings = calculateCourtStandings(matches, playerIds);

				courtResults.push({
					courtNumber: rotation.courtNumber,
					standings
				});
			}

			const nextRound = currentRound + 1;
			const assignments = redistributePlayers(
				courtResults,
				currentRound === 1,
				courtCount,
				isPreseed
			);

			for (const assignment of assignments) {
				const [rotation] = await db
					.insert(courtRotation)
					.values({
						tournamentId,
						roundNumber: nextRound,
						courtNumber: assignment.courtNumber,
						player1Id: assignment.playerIds[0],
						player2Id: assignment.playerIds[1],
						player3Id: assignment.playerIds[2],
						player4Id: assignment.playerIds[3]
					})
					.returning();

				const p1 = assignment.playerIds[0];
				const p2 = assignment.playerIds[1];
				const p3 = assignment.playerIds[2];
				const p4 = assignment.playerIds[3];

				await db.insert(match).values({
					courtRotationId: rotation.id,
					matchNumber: 1,
					teamAPlayer1Id: p1,
					teamAPlayer2Id: p2,
					teamBPlayer1Id: p3,
					teamBPlayer2Id: p4
				});

				await db.insert(match).values({
					courtRotationId: rotation.id,
					matchNumber: 2,
					teamAPlayer1Id: p1,
					teamAPlayer2Id: p3,
					teamBPlayer1Id: p2,
					teamBPlayer2Id: p4
				});

				await db.insert(match).values({
					courtRotationId: rotation.id,
					matchNumber: 3,
					teamAPlayer1Id: p1,
					teamAPlayer2Id: p4,
					teamBPlayer1Id: p2,
					teamBPlayer2Id: p3
				});

				const token = crypto.randomBytes(16).toString('hex');
				await db.insert(courtAccess).values({
					courtRotationId: rotation.id,
					token,
					isActive: true
				});
			}

			for (const rotation of rotations) {
				await db
					.update(courtAccess)
					.set({ isActive: false })
					.where(eq(courtAccess.courtRotationId, rotation.id));
			}

			await db
				.update(tournament)
				.set({ currentRound: nextRound })
				.where(eq(tournament.id, tournamentId));
		}

		return { success: true };
	}
};

interface MatchData {
	teamAScore: number | null;
	teamBScore: number | null;
	teamAPlayer1Id: number;
	teamAPlayer2Id: number;
	teamBPlayer1Id: number;
	teamBPlayer2Id: number;
}

function calculateCourtStandings(matches: MatchData[], playerIds: number[]) {
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

function redistributePlayers(
	courtResults: {
		courtNumber: number;
		standings: { playerId: number; rank: number; points: number; diff: number }[];
	}[],
	isFirstRound: boolean,
	courtCount: number,
	isPreseed: boolean
) {
	if (isPreseed) {
		return redistributePreseed(courtResults, isFirstRound, courtCount);
	} else {
		return redistributeLadder(courtResults, isFirstRound, courtCount);
	}
}

function redistributePreseed(
	courtResults: { courtNumber: number; standings: { playerId: number; rank: number }[] }[],
	isFirstRound: boolean,
	courtCount: number
) {
	if (courtCount === 8) {
		return redistributePreseed32(courtResults, isFirstRound);
	} else {
		return redistributePreseed16(courtResults, isFirstRound);
	}
}

function redistributePreseed32(
	courtResults: { courtNumber: number; standings: { playerId: number; rank: number }[] }[],
	isFirstRound: boolean
) {
	const sorted = courtResults.sort((a, b) => a.courtNumber - b.courtNumber);

	if (isFirstRound) {
		const byPosition: { [pos: number]: number[] } = { 1: [], 2: [], 3: [], 4: [] };
		for (const court of sorted) {
			byPosition[1].push(court.standings[0].playerId);
			byPosition[2].push(court.standings[1].playerId);
			byPosition[3].push(court.standings[2].playerId);
			byPosition[4].push(court.standings[3].playerId);
		}

		return [
			{
				courtNumber: 1,
				playerIds: [byPosition[1][0], byPosition[1][1], byPosition[1][4], byPosition[1][5]]
			},
			{
				courtNumber: 2,
				playerIds: [byPosition[1][2], byPosition[1][3], byPosition[1][6], byPosition[1][7]]
			},
			{
				courtNumber: 3,
				playerIds: [byPosition[2][0], byPosition[2][1], byPosition[2][4], byPosition[2][5]]
			},
			{
				courtNumber: 4,
				playerIds: [byPosition[2][2], byPosition[2][3], byPosition[2][6], byPosition[2][7]]
			},
			{
				courtNumber: 5,
				playerIds: [byPosition[3][0], byPosition[3][1], byPosition[3][4], byPosition[3][5]]
			},
			{
				courtNumber: 6,
				playerIds: [byPosition[3][2], byPosition[3][3], byPosition[3][6], byPosition[3][7]]
			},
			{
				courtNumber: 7,
				playerIds: [byPosition[4][0], byPosition[4][1], byPosition[4][4], byPosition[4][5]]
			},
			{
				courtNumber: 8,
				playerIds: [byPosition[4][2], byPosition[4][3], byPosition[4][6], byPosition[4][7]]
			}
		];
	}

	const isRound2 = sorted.length === 8 && sorted.every((c) => c.standings.length === 4);

	if (isRound2) {
		return [
			{ courtNumber: 1, playerIds: [...getTop2(sorted[0]), ...getTop2(sorted[1])] },
			{ courtNumber: 2, playerIds: [...getBottom2(sorted[0]), ...getBottom2(sorted[1])] },
			{ courtNumber: 3, playerIds: [...getTop2(sorted[2]), ...getTop2(sorted[3])] },
			{ courtNumber: 4, playerIds: [...getBottom2(sorted[2]), ...getBottom2(sorted[3])] },
			{ courtNumber: 5, playerIds: [...getTop2(sorted[4]), ...getTop2(sorted[5])] },
			{ courtNumber: 6, playerIds: [...getBottom2(sorted[4]), ...getBottom2(sorted[5])] },
			{ courtNumber: 7, playerIds: [...getTop2(sorted[6]), ...getTop2(sorted[7])] },
			{ courtNumber: 8, playerIds: [...getBottom2(sorted[6]), ...getBottom2(sorted[7])] }
		];
	}

	return [
		{ courtNumber: 1, playerIds: [...getTop2(sorted[0]), ...getTop2(sorted[1])] },
		{ courtNumber: 2, playerIds: [...getBottom2(sorted[0]), ...getBottom2(sorted[1])] },
		{ courtNumber: 3, playerIds: [...getTop2(sorted[2]), ...getTop2(sorted[3])] },
		{ courtNumber: 4, playerIds: [...getBottom2(sorted[2]), ...getBottom2(sorted[3])] },
		{ courtNumber: 5, playerIds: [...getTop2(sorted[4]), ...getTop2(sorted[5])] },
		{ courtNumber: 6, playerIds: [...getBottom2(sorted[4]), ...getBottom2(sorted[5])] },
		{ courtNumber: 7, playerIds: [...getTop2(sorted[6]), ...getTop2(sorted[7])] },
		{ courtNumber: 8, playerIds: [...getBottom2(sorted[6]), ...getBottom2(sorted[7])] }
	];
}

function redistributePreseed16(
	courtResults: { courtNumber: number; standings: { playerId: number; rank: number }[] }[],
	isFirstRound: boolean
) {
	const sorted = courtResults.sort((a, b) => a.courtNumber - b.courtNumber);

	if (isFirstRound) {
		const byPosition: { [pos: number]: number[] } = { 1: [], 2: [], 3: [], 4: [] };
		for (const court of sorted) {
			byPosition[1].push(court.standings[0].playerId);
			byPosition[2].push(court.standings[1].playerId);
			byPosition[3].push(court.standings[2].playerId);
			byPosition[4].push(court.standings[3].playerId);
		}

		return [
			{ courtNumber: 1, playerIds: byPosition[1] },
			{ courtNumber: 2, playerIds: byPosition[2] },
			{ courtNumber: 3, playerIds: byPosition[3] },
			{ courtNumber: 4, playerIds: byPosition[4] }
		];
	}

	return [
		{ courtNumber: 1, playerIds: [...getTop2(sorted[0]), ...getTop2(sorted[1])] },
		{ courtNumber: 2, playerIds: [...getBottom2(sorted[0]), ...getBottom2(sorted[1])] },
		{ courtNumber: 3, playerIds: [...getTop2(sorted[2]), ...getTop2(sorted[3])] },
		{ courtNumber: 4, playerIds: [...getBottom2(sorted[2]), ...getBottom2(sorted[3])] }
	];
}

function redistributeLadder(
	courtResults: {
		courtNumber: number;
		standings: { playerId: number; rank: number; points: number; diff: number }[];
	}[],
	isFirstRound: boolean,
	courtCount: number
) {
	const sorted = courtResults.sort((a, b) => a.courtNumber - b.courtNumber);

	if (isFirstRound) {
		const byRank: { [rank: number]: { playerId: number; points: number; diff: number }[] } = {};
		for (let i = 1; i <= 4; i++) byRank[i] = [];

		for (const court of sorted) {
			for (const standing of court.standings) {
				byRank[standing.rank].push({
					playerId: standing.playerId,
					points: standing.points,
					diff: standing.diff
				});
			}
		}

		if (courtCount === 4) {
			return Array.from({ length: 4 }, (_, i) => ({
				courtNumber: i + 1,
				playerIds: byRank[i + 1].map((s) => s.playerId)
			}));
		}

		for (let rank = 1; rank <= 4; rank++) {
			byRank[rank].sort((a, b) => {
				if (b.points !== a.points) return b.points - a.points;
				if (b.diff !== a.diff) return b.diff - a.diff;
				return Math.random() - 0.5;
			});
		}

		return [
			{ courtNumber: 1, playerIds: byRank[1].slice(0, 4).map((s) => s.playerId) },
			{ courtNumber: 2, playerIds: byRank[1].slice(4, 8).map((s) => s.playerId) },
			{ courtNumber: 3, playerIds: byRank[2].slice(0, 4).map((s) => s.playerId) },
			{ courtNumber: 4, playerIds: byRank[2].slice(4, 8).map((s) => s.playerId) },
			{ courtNumber: 5, playerIds: byRank[3].slice(0, 4).map((s) => s.playerId) },
			{ courtNumber: 6, playerIds: byRank[3].slice(4, 8).map((s) => s.playerId) },
			{ courtNumber: 7, playerIds: byRank[4].slice(0, 4).map((s) => s.playerId) },
			{ courtNumber: 8, playerIds: byRank[4].slice(4, 8).map((s) => s.playerId) }
		];
	}

	if (courtCount === 4) {
		return [
			{
				courtNumber: 1,
				playerIds: [
					...sorted[0].standings.slice(0, 2).map((s) => s.playerId),
					...sorted[1].standings.slice(0, 2).map((s) => s.playerId)
				]
			},
			{
				courtNumber: 2,
				playerIds: [
					...sorted[0].standings.slice(2, 4).map((s) => s.playerId),
					...sorted[2].standings.slice(0, 2).map((s) => s.playerId)
				]
			},
			{
				courtNumber: 3,
				playerIds: [
					...sorted[1].standings.slice(2, 4).map((s) => s.playerId),
					...sorted[3].standings.slice(0, 2).map((s) => s.playerId)
				]
			},
			{
				courtNumber: 4,
				playerIds: [
					...sorted[2].standings.slice(2, 4).map((s) => s.playerId),
					...sorted[3].standings.slice(2, 4).map((s) => s.playerId)
				]
			}
		];
	}

	const assignments: { courtNumber: number; playerIds: number[] }[] = [];

	for (let i = 0; i < courtCount; i++) {
		const playerIds = (() => {
			if (i === 0) {
				return [
					...sorted[i].standings.slice(0, 2).map((s) => s.playerId),
					...sorted[i + 1].standings.slice(0, 2).map((s) => s.playerId)
				];
			} else if (i === courtCount - 1) {
				return [
					...sorted[i - 1].standings.slice(2, 4).map((s) => s.playerId),
					...sorted[i].standings.slice(2, 4).map((s) => s.playerId)
				];
			} else {
				return [
					...sorted[i - 1].standings.slice(2, 4).map((s) => s.playerId),
					...sorted[i + 1].standings.slice(0, 2).map((s) => s.playerId)
				];
			}
		})();

		assignments.push({ courtNumber: i + 1, playerIds });
	}

	return assignments;
}

function getTop2(court: { standings: { playerId: number; rank: number }[] }): number[] {
	return court.standings.slice(0, 2).map((s) => s.playerId);
}

function getBottom2(court: { standings: { playerId: number; rank: number }[] }): number[] {
	return court.standings.slice(2, 4).map((s) => s.playerId);
}
