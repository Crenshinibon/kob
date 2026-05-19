import { redirect, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { tournament, player, courtRotation, match, courtAccess } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import {
	getCourtConfiguration,
	calculateRoundCount,
	createInitialState,
	addPlayers,
	startRound,
	generateAllMatchesForAssignment,
	type FormatType
} from '$lib/server/tournament-logic';

type ParsedPlayer = { name: string; seedPoints: number | null };

function parsePlayerLine(line: string, formatType: string): ParsedPlayer {
	const trimmed = line.trim();
	if (!trimmed) return { name: '', seedPoints: null };

	if (formatType === 'preseed') {
		const match = trimmed.match(/^(.+?)\s+(\d+)$/);
		if (match) {
			return { name: match[1].trim(), seedPoints: parseInt(match[2], 10) };
		}
		return { name: trimmed, seedPoints: null };
	}

	return { name: trimmed, seedPoints: null };
}

export const load = async ({ locals }: any) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}
	return {};
};

export const actions = {
	create: async ({ request, locals }: any) => {
		const user = locals.user;

		if (!user) {
			throw error(401, 'Unauthorized');
		}

		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim();
		const formatType = formData.get('formatType')?.toString() || 'random-seed';
		const namesText = formData.get('names')?.toString() || '';
		const physicalCourtCount = parseInt(formData.get('physicalCourts')?.toString() || '4');
		const scoringMode = formData.get('scoringMode')?.toString() || 'single-21';
		const pointsToWinRaw = parseInt(formData.get('pointsToWin')?.toString() || '21');
		const winByRaw = parseInt(formData.get('winBy')?.toString() || '2');
		const setsToWinRaw = parseInt(formData.get('setsToWin')?.toString() || '1');
		const decidingSetPointsRaw = parseInt(formData.get('decidingSetPoints')?.toString() || '15');
		const submittedNumRounds = parseInt(formData.get('numRounds')?.toString() || '3');

		let pointsToWin = pointsToWinRaw;
		let winBy = winByRaw;
		let setsToWin = setsToWinRaw;
		let decidingSetPoints = decidingSetPointsRaw;

		if (scoringMode === 'single-21') {
			pointsToWin = 21;
			winBy = 2;
			setsToWin = 1;
		} else if (scoringMode === 'best-of-3') {
			pointsToWin = 21;
			winBy = 2;
			setsToWin = 2;
			decidingSetPoints = 15;
		}
		if (!name) {
			return { error: 'Tournament name is required' };
		}

		if (formatType !== 'random-seed' && formatType !== 'preseed') {
			return { error: 'Invalid format type' };
		}

		const lines: string[] = namesText
			.split('\n')
			.map((l: string) => l.trim())
			.filter((l: string) => l.length > 0);

		if (lines.length < 8) {
			return { error: `At least 8 players required. You entered ${lines.length}.` };
		}

		if (lines.length > 64) {
			return { error: `Maximum 64 players allowed. You entered ${lines.length}.` };
		}

		const parsed: ParsedPlayer[] = lines.map((line: string) => parsePlayerLine(line, formatType));

		if (formatType === 'preseed') {
			const missingPoints: ParsedPlayer[] = parsed.filter(
				(p: ParsedPlayer) => p.seedPoints === null
			);
			if (missingPoints.length > 0) {
				return {
					error: `Preseed format requires points for all players. Missing points for: ${missingPoints.map((p: ParsedPlayer) => p.name).join(', ')}`
				};
			}
		}

		const playerCount: number = parsed.length;
		const config = getCourtConfiguration(playerCount);
		const courtSizes: number[] = config.bottomCourtSize
			? [...Array(config.standardCourts).fill(4), config.bottomCourtSize]
			: Array(config.totalCourts).fill(4);

		const numRounds: number =
			formatType === 'preseed'
				? calculateRoundCount(config.totalCourts, formatType)
				: submittedNumRounds;

		// Create tournament with active status
		const [newTournament] = await db
			.insert(tournament)
			.values({
				orgId: user.id,
				name,
				numRounds,
				formatType,
				scoringMode,
				pointsToWin,
				winBy,
				setsToWin,
				decidingSetPoints,
				schedulingMode: 'batch',
				playerCount,
				physicalCourtCount,
				courtSizes: JSON.stringify(courtSizes),
				status: 'active',
				currentRound: 1
			})
			.returning();

		// Insert players
		for (const p of parsed) {
			await db.insert(player).values({
				tournamentId: newTournament.id,
				name: p.name,
				seedPoints: p.seedPoints,
				seedRank: null
			});
		}

		// Get all players for tournament start
		const allPlayers = await db
			.select()
			.from(player)
			.where(eq(player.tournamentId, newTournament.id));

		// Update seed ranks for preseed
		if (formatType === 'preseed') {
			const sorted = [...allPlayers].sort((a, b) => (b.seedPoints ?? 0) - (a.seedPoints ?? 0));
			for (let i = 0; i < sorted.length; i++) {
				await db
					.update(player)
					.set({ seedRank: i + 1 })
					.where(eq(player.id, sorted[i].id));
			}
		}

		// Build tournament state and generate Round 1
		const initState = createInitialState({
			tournamentId: newTournament.id,
			formatType: formatType as FormatType,
			playerCount,
			physicalCourtCount
		});

		const players = allPlayers.map((p) => ({
			id: p.id,
			name: p.name,
			seedPoints: p.seedPoints,
			seedRank: p.seedRank
		}));

		const stateWithPlayers = addPlayers(initState, players);
		const startedState = startRound(stateWithPlayers);
		const assignments = startedState.currentAssignments;

		for (let courtNum = 0; courtNum < assignments.length; courtNum++) {
			const assignment = assignments[courtNum];
			const size = courtSizes[courtNum] ?? 4;

			const [rotation] = await db
				.insert(courtRotation)
				.values({
					tournamentId: newTournament.id,
					roundNumber: 1,
					courtNumber: assignment.courtNumber,
					courtSize: size,
					player1Id: assignment.playerIds[0],
					player2Id: assignment.playerIds[1],
					player3Id: assignment.playerIds.length > 2 ? assignment.playerIds[2] : null,
					player4Id: assignment.playerIds.length > 3 ? assignment.playerIds[3] : null,
					player5Id: size >= 5 ? assignment.playerIds[4] : null,
					player6Id: size >= 6 ? assignment.playerIds[5] : null
				})
				.returning();

			const allMatchesForCourt = generateAllMatchesForAssignment(assignment, courtSizes);
			for (let mi = 0; mi < allMatchesForCourt.length; mi++) {
				const m = allMatchesForCourt[mi];
				await db.insert(match).values({
					courtRotationId: rotation.id,
					matchNumber: mi + 1,
					teamAPlayer1Id: m.teamAPlayer1Id,
					teamAPlayer2Id: m.teamAPlayer2Id,
					teamBPlayer1Id: m.teamBPlayer1Id,
					teamBPlayer2Id: m.teamBPlayer2Id
				});
			}

			const token = crypto.randomBytes(16).toString('hex');
			await db.insert(courtAccess).values({
				courtRotationId: rotation.id,
				token,
				isActive: true
			});
		}

		throw redirect(302, `/tournament/${newTournament.id}`);
	}
};
