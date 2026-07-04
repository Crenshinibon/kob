import {
	assignmentMatchCourtSize,
	generateAllMatchesForAssignment,
	generateRound1Assignments,
	getMaxSets,
	getEffectiveScoring,
	orderPlayerIdsForRound1,
	validateAssignmentsForMatchGeneration,
	type CourtAssignment,
	type FormatType,
	type MatchData,
	type Player,
	type ScoringOverrides
} from '$lib/tournament-logic';

export type MatchInsertRow = {
	courtRotationId: number;
	matchNumber: number;
	setNumber: number;
	teamAPlayer1Id: number;
	teamAPlayer2Id: number;
	teamBPlayer1Id: number;
	teamBPlayer2Id: number;
};

export function buildRound1AssignmentsFromPlayers(
	formatType: FormatType,
	players: readonly Pick<Player, 'id' | 'seedPoints'>[],
	courtSizes: readonly number[]
): CourtAssignment[] {
	const orderedIds = orderPlayerIdsForRound1(formatType, players);
	return generateRound1Assignments(orderedIds, courtSizes);
}

export function assignmentCourtSize(
	assignment: CourtAssignment,
	courtSizes: readonly number[]
): number {
	return assignmentMatchCourtSize(assignment, courtSizes);
}

export function buildMatchInsertRows(
	assignment: CourtAssignment,
	courtSizes: readonly number[],
	rotationId: number,
	scoring: {
		pointsToWin: number;
		setsToWin: number;
		decidingSetPoints: number;
		winBy: number;
	},
	scoringOverrides: ScoringOverrides | null | undefined
): MatchInsertRow[] {
	const size = assignmentCourtSize(assignment, courtSizes);
	const allMatches = generateAllMatchesForAssignment(assignment, courtSizes);
	const effective = getEffectiveScoring(size, scoring, scoringOverrides);
	const maxSets = getMaxSets(effective.setsToWin);
	const rows: MatchInsertRow[] = [];

	for (let mi = 0; mi < allMatches.length; mi++) {
		const m = allMatches[mi];
		for (let setNum = 1; setNum <= maxSets; setNum++) {
			rows.push({
				courtRotationId: rotationId,
				matchNumber: mi + 1,
				setNumber: setNum,
				teamAPlayer1Id: m.teamAPlayer1Id,
				teamAPlayer2Id: m.teamAPlayer2Id,
				teamBPlayer1Id: m.teamBPlayer1Id,
				teamBPlayer2Id: m.teamBPlayer2Id
			});
		}
	}
	return rows;
}

export function prevalidateAssignments(
	assignments: readonly CourtAssignment[],
	courtSizes: readonly number[]
): void {
	validateAssignmentsForMatchGeneration(assignments, courtSizes);
}

export function toMatchData(
	rows: readonly {
		teamAPlayer1Id: number;
		teamAPlayer2Id: number;
		teamBPlayer1Id: number;
		teamBPlayer2Id: number;
		teamAScore: number | null;
		teamBScore: number | null;
		isCanceled: boolean | null;
		injuredPlayerIds?: number[] | null;
	}[]
): MatchData[] {
	return rows.map((m) => ({
		teamAPlayer1Id: m.teamAPlayer1Id,
		teamAPlayer2Id: m.teamAPlayer2Id,
		teamBPlayer1Id: m.teamBPlayer1Id,
		teamBPlayer2Id: m.teamBPlayer2Id,
		teamAScore: m.teamAScore,
		teamBScore: m.teamBScore,
		isCanceled: m.isCanceled ?? false,
		injuredPlayerIds: m.injuredPlayerIds ?? undefined
	}));
}
