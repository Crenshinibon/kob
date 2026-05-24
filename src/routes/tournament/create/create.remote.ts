import * as v from 'valibot';
import { error, redirect } from '@sveltejs/kit';
import { form, getRequestEvent } from '$app/server';
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
	getMaxSets,
	type FormatType
} from '$lib/server/tournament-logic';

type ParsedPlayer = { name: string; seedPoints: number | null };

function parsePlayerLine(line: string, formatType: string): ParsedPlayer {
	const trimmed = line.trim();
	if (!trimmed) return { name: '', seedPoints: null };

	if (formatType === 'preseed') {
		const playerMatch = trimmed.match(/^(.+?)\s+(\d+)$/);
		if (playerMatch) {
			return { name: playerMatch[1].trim(), seedPoints: parseInt(playerMatch[2], 10) };
		}
		return { name: trimmed, seedPoints: null };
	}

	return { name: trimmed, seedPoints: null };
}

export const createTournamentForm = form(
	v.object({
		name: v.pipe(v.string(), v.minLength(1)),
		formatType: v.picklist(['random-seed', 'preseed']),
		names: v.pipe(v.string(), v.minLength(1)),
		physicalCourts: v.pipe(v.number(), v.minValue(1), v.maxValue(16)),
		scoringMode: v.picklist(['single-21', 'best-of-3', 'custom']),
		pointsToWin: v.pipe(v.number(), v.minValue(1), v.maxValue(50)),
		winBy: v.pipe(v.number(), v.minValue(1), v.maxValue(10)),
		setsToWin: v.pipe(v.number(), v.minValue(1), v.maxValue(5)),
		decidingSetPoints: v.pipe(v.number(), v.minValue(1), v.maxValue(50)),
		numRounds: v.pipe(v.number(), v.minValue(1), v.maxValue(10))
	}),
	async ({
		name,
		formatType,
		names: namesText,
		physicalCourts: physicalCourtCount,
		scoringMode,
		pointsToWin: pointsToWinRaw,
		winBy: winByRaw,
		setsToWin: setsToWinRaw,
		decidingSetPoints: decidingSetPointsRaw,
		numRounds: submittedNumRounds
	}) => {
		const event = getRequestEvent();
		const user = event.locals.user;
		if (!user) error(401, 'Unauthorized');

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

		const lines: string[] = namesText
			.split('\n')
			.map((l: string) => l.trim())
			.filter((l: string) => l.length > 0);

		if (lines.length < 8) {
			error(400, `At least 8 players required. You entered ${lines.length}.`);
		}

		if (lines.length > 64) {
			error(400, `Maximum 64 players allowed. You entered ${lines.length}.`);
		}

		const parsed: ParsedPlayer[] = lines.map((line: string) => parsePlayerLine(line, formatType));

		if (formatType === 'preseed') {
			const missingPoints: ParsedPlayer[] = parsed.filter(
				(p: ParsedPlayer) => p.seedPoints === null
			);
			if (missingPoints.length > 0) {
				error(
					400,
					`Preseed format requires points for all players. Missing points for: ${missingPoints.map((p: ParsedPlayer) => p.name).join(', ')}`
				);
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

		for (const p of parsed) {
			await db.insert(player).values({
				tournamentId: newTournament.id,
				name: p.name,
				seedPoints: p.seedPoints,
				seedRank: null
			});
		}

		const allPlayers = await db
			.select()
			.from(player)
			.where(eq(player.tournamentId, newTournament.id));

		if (formatType === 'preseed') {
			const sorted = [...allPlayers].sort((a, b) => (b.seedPoints ?? 0) - (a.seedPoints ?? 0));
			for (let i = 0; i < sorted.length; i++) {
				await db
					.update(player)
					.set({ seedRank: i + 1 })
					.where(eq(player.id, sorted[i].id));
			}
		}

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

			const maxSets = getMaxSets(newTournament.setsToWin);

			for (let mi = 0; mi < allMatchesForCourt.length; mi++) {
				const m = allMatchesForCourt[mi];
				for (let setNum = 1; setNum <= maxSets; setNum++) {
					await db.insert(match).values({
						courtRotationId: rotation.id,
						matchNumber: mi + 1,
						setNumber: setNum,
						teamAPlayer1Id: m.teamAPlayer1Id,
						teamAPlayer2Id: m.teamAPlayer2Id,
						teamBPlayer1Id: m.teamBPlayer1Id,
						teamBPlayer2Id: m.teamBPlayer2Id
					});
				}
			}

			const token = crypto.randomBytes(16).toString('hex');
			await db.insert(courtAccess).values({
				courtRotationId: rotation.id,
				token,
				isActive: true
			});
		}

		redirect(303, `/tournament/${newTournament.id}`);
	}
);
