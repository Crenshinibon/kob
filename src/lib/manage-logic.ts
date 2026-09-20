import { calculateCourtSizes, getBracketGroups, type FormatType } from '$lib/tournament-logic';

export type ManualAssignmentCourt = {
	courtNumber: number;
	playerIds: number[];
	isFrozen?: boolean;
};

export type AssignmentValidation = {
	errors: string[];
	warnings: string[];
};

export function deriveLockState(matches: readonly { teamAScore: number | null }[]): {
	roundHasScores: boolean;
} {
	return { roundHasScores: matches.some((m) => m.teamAScore != null) };
}

export function minRoundCount(currentRound: number, roundHasScores: boolean): number {
	if (currentRound <= 0) return 1;
	return roundHasScores ? currentRound + 1 : currentRound;
}

export function refillToCanonical(
	assignments: readonly ManualAssignmentCourt[],
	playerCount: number
): ManualAssignmentCourt[] {
	const flat: number[] = [];
	const ordered = [...assignments].sort((a, b) => a.courtNumber - b.courtNumber);
	for (const court of ordered) {
		for (const id of court.playerIds) {
			if (id != null) flat.push(id);
		}
	}
	const sizes = calculateCourtSizes(playerCount);
	const result: ManualAssignmentCourt[] = [];
	let offset = 0;
	for (let i = 0; i < sizes.length; i++) {
		const size = sizes[i];
		result.push({
			courtNumber: i + 1,
			playerIds: flat.slice(offset, offset + size)
		});
		offset += size;
	}
	return result;
}

export function validateManualAssignment(input: {
	before: readonly ManualAssignmentCourt[];
	after: readonly ManualAssignmentCourt[];
	roundHasScores: boolean;
	isFinalRound: boolean;
	formatType: FormatType;
	courtCount: number;
	currentRound: number;
	singleCourtTournament: boolean;
}): AssignmentValidation {
	const errors: string[] = [];
	const warnings: string[] = [];

	if (input.roundHasScores) {
		errors.push('err_round_locked');
		return { errors, warnings };
	}

	for (const court of input.after) {
		if (court.isFrozen) {
			const before = input.before.find((c) => c.courtNumber === court.courtNumber);
			if (before && before.playerIds.join(',') !== court.playerIds.join(',')) {
				errors.push('err_court_frozen');
			}
		}
		if (court.playerIds.length < 3) errors.push('err_court_too_small');
		if (court.playerIds.length > 6) errors.push('err_court_too_large');
	}

	if (input.isFinalRound && !input.singleCourtTournament) {
		const court1 = input.after.find((c) => c.courtNumber === 1);
		if (court1 && court1.playerIds.length !== 4) {
			errors.push('err_final_court_must_be_4');
		}
	}

	const canonical = calculateCourtSizes(input.after.reduce((n, c) => n + c.playerIds.length, 0));
	const uneven = input.after.filter((c) => {
		const expected = canonical[c.courtNumber - 1];
		return expected != null && c.playerIds.length !== expected;
	});
	if (uneven.length > 1) warnings.push('manage_warn_uneven');

	if (input.formatType === 'preseed') {
		const groups = getBracketGroups(input.courtCount, Math.max(0, input.currentRound - 1));
		const beforeCourt = new Map<number, number>();
		for (const court of input.before) {
			for (const id of court.playerIds) beforeCourt.set(id, court.courtNumber);
		}
		for (const court of input.after) {
			for (const id of court.playerIds) {
				const from = beforeCourt.get(id);
				if (from == null || from === court.courtNumber) continue;
				const fromGroup = groups.findIndex((g) => g.includes(from));
				const toGroup = groups.findIndex((g) => g.includes(court.courtNumber));
				if (fromGroup !== toGroup) warnings.push('manage_warn_bracket_cross');
			}
		}
	}

	if (input.formatType === 'random-seed') {
		const beforeCourt = new Map<number, number>();
		for (const court of input.before) {
			for (const id of court.playerIds) beforeCourt.set(id, court.courtNumber);
		}
		for (const court of input.after) {
			for (const id of court.playerIds) {
				const from = beforeCourt.get(id);
				if (from != null && Math.abs(from - court.courtNumber) >= 2) {
					warnings.push('manage_warn_ladder_jump');
				}
			}
		}
	}

	return { errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
}

export function applyAssignment(
	before: readonly ManualAssignmentCourt[],
	after: readonly ManualAssignmentCourt[],
	opts: {
		roundHasScores: boolean;
		isFinalRound: boolean;
		formatType: FormatType;
		courtCount: number;
		currentRound: number;
		singleCourtTournament: boolean;
	}
): AssignmentValidation & { resultingCourts: ManualAssignmentCourt[] } {
	const validation = validateManualAssignment({
		before,
		after,
		...opts
	});
	return { ...validation, resultingCourts: sortCourts(after) };
}

export function sortCourts<T extends { courtNumber: number }>(courts: readonly T[]): T[] {
	return [...courts].sort((a, b) => a.courtNumber - b.courtNumber);
}

export function proposedMove(
	courts: readonly ManualAssignmentCourt[],
	playerId: number,
	toCourt: number
): ManualAssignmentCourt[] {
	const next = courts.map((c) => ({
		courtNumber: c.courtNumber,
		playerIds: c.playerIds.filter((id) => id !== playerId),
		isFrozen: c.isFrozen
	}));
	const target = next.find((c) => c.courtNumber === toCourt);
	if (target) target.playerIds = [...target.playerIds, playerId];
	return sortCourts(next);
}

export function isValidPlayerMove(
	courts: readonly ManualAssignmentCourt[],
	playerId: number,
	toCourt: number
): boolean {
	const from = courts.find((c) => c.playerIds.includes(playerId));
	if (!from || from.courtNumber === toCourt) return false;
	const to = courts.find((c) => c.courtNumber === toCourt);
	if (!to || to.isFrozen || from.isFrozen) return false;
	const after = proposedMove(courts, playerId, toCourt);
	return after.every((c) => c.playerIds.length >= 3 && c.playerIds.length <= 6);
}

export function renumberSeedOrder(
	playerIds: number[],
	movedId: number,
	newRank: number
): Map<number, number> {
	const without = playerIds.filter((id) => id !== movedId);
	const clamped = Math.max(1, Math.min(newRank, playerIds.length));
	without.splice(clamped - 1, 0, movedId);
	const ranks = new Map<number, number>();
	without.forEach((id, i) => ranks.set(id, i + 1));
	return ranks;
}

export type SeedOrderMove = 'up' | 'down' | 'top' | 'bottom';

export function sortPlayersBySeed<T extends { id: number; seedRank: number | null }>(
	players: readonly T[]
): T[] {
	return [...players].sort((a, b) => {
		const ar = a.seedRank ?? a.id;
		const br = b.seedRank ?? b.id;
		if (ar !== br) return ar - br;
		return a.id - b.id;
	});
}

export function movePlayerInOrder(
	playerIds: readonly number[],
	movedId: number,
	move: SeedOrderMove
): number[] {
	const ids = [...playerIds];
	const from = ids.indexOf(movedId);
	if (from < 0) return ids;
	ids.splice(from, 1);
	let to: number;
	if (move === 'up') to = Math.max(0, from - 1);
	else if (move === 'down') to = Math.min(ids.length, from + 1);
	else if (move === 'top') to = 0;
	else to = ids.length;
	ids.splice(to, 0, movedId);
	return ids;
}

export function orderPlayersByIds<T extends { id: number }>(
	players: readonly T[],
	orderedIds: readonly number[]
): T[] {
	const byId = new Map(players.map((p) => [p.id, p]));
	const seen = new Set<number>();
	const result: T[] = [];
	for (const id of orderedIds) {
		const player = byId.get(id);
		if (player) {
			result.push(player);
			seen.add(id);
		}
	}
	for (const player of players) {
		if (!seen.has(player.id)) result.push(player);
	}
	return result;
}
