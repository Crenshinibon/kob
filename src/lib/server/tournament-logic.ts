export type CourtResult = {
	courtNumber: number;
	standings: { playerId: number; rank: number; points: number; diff: number }[];
};

export type CourtAssignment = {
	courtNumber: number;
	playerIds: number[];
};

export type MatchData = {
	teamAScore: number | null;
	teamBScore: number | null;
	teamAPlayer1Id: number;
	teamAPlayer2Id: number;
	teamBPlayer1Id: number;
	teamBPlayer2Id: number;
};

export function calculateCourtStandings(
	matches: MatchData[],
	playerIds: number[]
): { playerId: number; rank: number; points: number; diff: number }[] {
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
			return a.playerId - b.playerId;
		})
		.map((s, i) => ({ ...s, rank: i + 1 }));
}

export function redistributePlayers(
	courtResults: CourtResult[],
	currentRound: number,
	courtCount: number,
	isPreseed: boolean
): CourtAssignment[] {
	if (isPreseed) {
		return redistributePreseed(courtResults, currentRound, courtCount);
	} else {
		return redistributeLadder(courtResults, currentRound === 1, courtCount);
	}
}

export function redistributePreseed(
	courtResults: CourtResult[],
	currentRound: number,
	courtCount: number
): CourtAssignment[] {
	if (courtCount === 8) {
		return redistributePreseed32(courtResults, currentRound);
	} else {
		return redistributePreseed16(courtResults, currentRound);
	}
}

export function redistributePreseed32(
	courtResults: CourtResult[],
	currentRound: number
): CourtAssignment[] {
	const sorted = courtResults.sort((a, b) => a.courtNumber - b.courtNumber);

	if (currentRound === 1) {
		const byPosition: { [pos: number]: number[] } = { 1: [], 2: [], 3: [], 4: [] };
		for (const court of sorted) {
			byPosition[1].push(court.standings[0].playerId);
			byPosition[2].push(court.standings[1].playerId);
			byPosition[3].push(court.standings[2].playerId);
			byPosition[4].push(court.standings[3].playerId);
		}

		return [
			{ courtNumber: 1, playerIds: byPosition[1].slice(0, 4) },
			{ courtNumber: 2, playerIds: byPosition[1].slice(4, 8) },
			{ courtNumber: 3, playerIds: byPosition[2].slice(0, 4) },
			{ courtNumber: 4, playerIds: byPosition[2].slice(4, 8) },
			{ courtNumber: 5, playerIds: byPosition[3].slice(0, 4) },
			{ courtNumber: 6, playerIds: byPosition[3].slice(4, 8) },
			{ courtNumber: 7, playerIds: byPosition[4].slice(0, 4) },
			{ courtNumber: 8, playerIds: byPosition[4].slice(4, 8) }
		];
	}

	if (currentRound === 2) {
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

	if (currentRound === 3) {
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

	return [];
}

export function redistributePreseed16(
	courtResults: CourtResult[],
	currentRound: number
): CourtAssignment[] {
	const sorted = courtResults.sort((a, b) => a.courtNumber - b.courtNumber);

	if (currentRound === 1) {
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

	if (currentRound === 2) {
		return [
			{ courtNumber: 1, playerIds: [...getTop2(sorted[0]), ...getTop2(sorted[1])] },
			{ courtNumber: 2, playerIds: [...getBottom2(sorted[0]), ...getBottom2(sorted[1])] },
			{ courtNumber: 3, playerIds: [...getTop2(sorted[2]), ...getTop2(sorted[3])] },
			{ courtNumber: 4, playerIds: [...getBottom2(sorted[2]), ...getBottom2(sorted[3])] }
		];
	}

	return [];
}

export function redistributeLadder(
	courtResults: CourtResult[],
	isFirstRound: boolean,
	courtCount: number
): CourtAssignment[] {
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
				return a.playerId - b.playerId;
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

	const assignments: CourtAssignment[] = [];

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

export function getTop2(court: { standings: { playerId: number; rank: number }[] }): number[] {
	return court.standings.slice(0, 2).map((s) => s.playerId);
}

export function getBottom2(court: { standings: { playerId: number; rank: number }[] }): number[] {
	return court.standings.slice(2, 4).map((s) => s.playerId);
}
