import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { tournament, player, courtRotation, match, courtAccess } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import {
	getCourtConfiguration,
	createInitialState,
	addPlayers,
	startRound,
	generate4pMatches,
	generate3pMatches,
	generateAllMatchesForAssignment,
	type FormatType
} from '$lib/server/tournament-logic';
import type { TournamentState } from '$lib/server/tournament-logic';

type PlayerWithPoints = {
	name: string;
	seedPoints: number | null;
};

export const load = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) throw redirect(302, '/login');

	const tournamentId = parseInt(params.id);
	const [tourney] = await db
		.select()
		.from(tournament)
		.where(and(eq(tournament.id, tournamentId), eq(tournament.orgId, user.id)));

	if (!tourney) throw error(404, 'Tournament not found');

	const maxPlayers = tourney.playerCount;
	const players = await db.select().from(player).where(eq(player.tournamentId, tournamentId));

	const config = getCourtConfiguration(maxPlayers);
	const courtSizes: number[] = config.bottomCourtSize
		? [...Array(config.standardCourts).fill(4), config.bottomCourtSize]
		: Array(config.totalCourts).fill(4);
	const physicalCourtCount = tourney.physicalCourtCount ?? Math.min(4, courtSizes.length);

	return {
		tournament: tourney,
		players,
		courtPreview: {
			courts: courtSizes.length,
			sizes: courtSizes,
			physical: physicalCourtCount
		}
	};
};

function parsePreseedInput(text: string): PlayerWithPoints[] {
	const lines = text
		.split('\n')
		.map((l) => l.trim())
		.filter((l) => l.length > 0);
	const result: PlayerWithPoints[] = [];

	for (const line of lines) {
		const match = line.match(/^(.+?)\s+(\d+)$/);
		if (match) {
			const name = match[1].trim();
			const points = parseInt(match[2], 10);
			if (name && !isNaN(points)) {
				result.push({ name, seedPoints: points });
				continue;
			}
		}
		result.push({ name: line, seedPoints: null });
	}

	return result;
}

export const actions = {
	addPlayers: async ({ request, params, locals }) => {
		const user = locals.user;
		if (!user) throw error(401, 'Unauthorized');

		const tournamentId = parseInt(params.id);
		const formData = await request.formData();
		const namesText = formData.get('names')?.toString() || '';

		const [tourney] = await db
			.select()
			.from(tournament)
			.where(and(eq(tournament.id, tournamentId), eq(tournament.orgId, user.id)));

		if (!tourney) throw error(404, 'Tournament not found');

		const maxPlayers = tourney.playerCount;
		const isPreseed = tourney.formatType === 'preseed';

		let playersToAdd: { name: string; seedPoints: number | null; seedRank: number | null }[];

		if (isPreseed) {
			const parsed = parsePreseedInput(namesText);
			if (parsed.length === 0) {
				return { error: 'Please enter at least one player (Name, Points)' };
			}

			const withoutPoints = parsed.filter((p) => p.seedPoints === null);
			if (withoutPoints.length > 0) {
				return {
					error: `Preseed format requires points for all players. Missing points for: ${withoutPoints.map((p) => p.name).join(', ')}`
				};
			}

			playersToAdd = parsed.map((p) => ({
				name: p.name,
				seedPoints: p.seedPoints,
				seedRank: null
			}));
		} else {
			const names = namesText
				.split('\n')
				.map((n) => n.trim())
				.filter((n) => n.length > 0);

			if (names.length === 0) {
				return { error: 'Please enter at least one player name' };
			}

			playersToAdd = names.map((name) => ({
				name,
				seedPoints: null,
				seedRank: null
			}));
		}

		const existingPlayers = await db
			.select()
			.from(player)
			.where(eq(player.tournamentId, tournamentId));

		const remainingSlots = maxPlayers - existingPlayers.length;

		if (playersToAdd.length > remainingSlots) {
			return {
				error: `Only ${remainingSlots} slots remaining. You entered ${playersToAdd.length} players.`
			};
		}

		const existingNames = new Set(existingPlayers.map((p) => p.name.toLowerCase()));
		const newPlayers = playersToAdd.filter((p) => !existingNames.has(p.name.toLowerCase()));

		if (newPlayers.length === 0) {
			return { error: 'All entered names are already in the tournament' };
		}

		for (const p of newPlayers) {
			await db.insert(player).values({
				tournamentId,
				name: p.name,
				seedPoints: p.seedPoints,
				seedRank: p.seedRank
			});
		}

		return {
			success: `Added ${newPlayers.length} player${newPlayers.length === 1 ? '' : 's'}. ${existingPlayers.length + newPlayers.length}/${maxPlayers} total.`
		};
	},

	start: async ({ params, locals }) => {
		const user = locals.user;
		if (!user) throw error(401, 'Unauthorized');

		const tournamentId = parseInt(params.id);

		const [tourney] = await db
			.select()
			.from(tournament)
			.where(and(eq(tournament.id, tournamentId), eq(tournament.orgId, user.id)));

		if (!tourney) throw error(404, 'Tournament not found');

		const allPlayers = await db.select().from(player).where(eq(player.tournamentId, tournamentId));
		const maxPlayers = tourney.playerCount;

		if (allPlayers.length !== maxPlayers) {
			return { error: `Need exactly ${maxPlayers} players. Currently have ${allPlayers.length}.` };
		}

		const config = getCourtConfiguration(maxPlayers);
		const courtSizes: number[] = config.bottomCourtSize
			? [...Array(config.standardCourts).fill(4), config.bottomCourtSize]
			: Array(config.totalCourts).fill(4);

		const physicalCourtCount = tourney.physicalCourtCount ?? Math.min(4, courtSizes.length);

		// Build tournament state and generate Round 1
		const initState = createInitialState({
			tournamentId: tourney.id,
			formatType: tourney.formatType as FormatType,
			playerCount: maxPlayers,

			physicalCourtCount
		});

		const players = allPlayers.map((p) => ({
			id: p.id,
			name: p.name,
			seedPoints: p.seedPoints,
			seedRank: p.seedRank
		}));

		const stateWithPlayers = addPlayers(initState, players);

		if (tourney.formatType === 'preseed') {
			// Update seed ranks in DB
			const sorted = [...players].sort((a, b) => (b.seedPoints ?? 0) - (a.seedPoints ?? 0));
			for (let i = 0; i < sorted.length; i++) {
				await db
					.update(player)
					.set({ seedRank: i + 1 })
					.where(eq(player.id, sorted[i].id));
			}
		}

		const startedState = startRound(stateWithPlayers);
		const assignments = startedState.currentAssignments;
		const matches = startedState.currentMatches;

		for (let courtNum = 0; courtNum < assignments.length; courtNum++) {
			const assignment = assignments[courtNum];
			const matchData = matches[courtNum];
			const size = courtSizes[courtNum] ?? 4;

			const [rotation] = await db
				.insert(courtRotation)
				.values({
					tournamentId,
					roundNumber: 1,
					courtNumber: assignment.courtNumber,
					player1Id: assignment.playerIds[0],
					player2Id: assignment.playerIds[1],
					player3Id: assignment.playerIds.length > 2 ? assignment.playerIds[2] : null,
					player4Id: assignment.playerIds.length > 3 ? assignment.playerIds[3] : null,
					player5Id: size >= 5 ? assignment.playerIds[4] : null,
					player6Id: size >= 6 ? assignment.playerIds[5] : null
				})
				.returning();

			if (matchData) {
				await db.insert(match).values({
					courtRotationId: rotation.id,
					matchNumber: 1,
					teamAPlayer1Id: matchData.teamAPlayer1Id,
					teamAPlayer2Id: matchData.teamAPlayer2Id,
					teamBPlayer1Id: matchData.teamBPlayer1Id,
					teamBPlayer2Id: matchData.teamBPlayer2Id
				});

				// For 4p courts, also insert matches 2 and 3
				if (size === 4) {
					const m2 = generate4pMatches(assignment.playerIds)[1];
					const m3 = generate4pMatches(assignment.playerIds)[2];

					await db.insert(match).values({
						courtRotationId: rotation.id,
						matchNumber: 2,
						teamAPlayer1Id: m2.teamAPlayer1Id,
						teamAPlayer2Id: m2.teamAPlayer2Id,
						teamBPlayer1Id: m2.teamBPlayer1Id,
						teamBPlayer2Id: m2.teamBPlayer2Id
					});

					await db.insert(match).values({
						courtRotationId: rotation.id,
						matchNumber: 3,
						teamAPlayer1Id: m3.teamAPlayer1Id,
						teamAPlayer2Id: m3.teamAPlayer2Id,
						teamBPlayer1Id: m3.teamBPlayer1Id,
						teamBPlayer2Id: m3.teamBPlayer2Id
					});
				} else if (size === 3) {
					const m2 = generate3pMatches(assignment.playerIds)[1];
					const m3 = generate3pMatches(assignment.playerIds)[2];

					await db.insert(match).values({
						courtRotationId: rotation.id,
						matchNumber: 2,
						teamAPlayer1Id: m2.teamAPlayer1Id,
						teamAPlayer2Id: m2.teamAPlayer2Id,
						teamBPlayer1Id: m2.teamBPlayer1Id,
						teamBPlayer2Id: m2.teamBPlayer2Id
					});

					await db.insert(match).values({
						courtRotationId: rotation.id,
						matchNumber: 3,
						teamAPlayer1Id: m3.teamAPlayer1Id,
						teamAPlayer2Id: m3.teamAPlayer2Id,
						teamBPlayer1Id: m3.teamBPlayer1Id,
						teamBPlayer2Id: m3.teamBPlayer2Id
					});
				} else if (size >= 5) {
					const extraMatches = generateAllMatchesForAssignment(assignment, courtSizes);
					for (let mi = 1; mi < extraMatches.length; mi++) {
						const m = extraMatches[mi];
						await db.insert(match).values({
							courtRotationId: rotation.id,
							matchNumber: mi + 1,
							teamAPlayer1Id: m.teamAPlayer1Id,
							teamAPlayer2Id: m.teamAPlayer2Id,
							teamBPlayer1Id: m.teamBPlayer1Id,
							teamBPlayer2Id: m.teamBPlayer2Id
						});
					}
				}
			}

			const token = crypto.randomBytes(16).toString('hex');
			await db.insert(courtAccess).values({
				courtRotationId: rotation.id,
				token,
				isActive: true
			});
		}

		await db
			.update(tournament)
			.set({
				status: 'active',
				currentRound: 1,
				courtSizes: JSON.stringify(courtSizes)
			})
			.where(eq(tournament.id, tournamentId));

		throw redirect(302, `/tournament/${tournamentId}`);
	}
};
