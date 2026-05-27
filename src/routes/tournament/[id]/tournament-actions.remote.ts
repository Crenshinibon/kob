import * as v from 'valibot';
import { error, redirect } from '@sveltejs/kit';
import { form, command, getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { tournament, player, courtRotation, match, court } from '$lib/server/db/schema';
import { eq, and, inArray, isNull, or } from 'drizzle-orm';
import {
	createInitialState,
	addPlayers,
	startRound,
	closeRound,
	calculateCourtSizes,
	calculateCourtStandings,
	recalculateCourtConfigAfterRetirement,
	redistributePreseedRecursive,
	verticalSeeding,
	ladderRedistribute,
	generateAllMatchesForAssignment,
	getMaxSets,
	getEffectiveScoring,
	getPreseedBracketRange,
	calculateRetiredStanding,
	getFinalRoundCourtConfig,
	type FormatType,
	type MatchData
} from '$lib/server/tournament-logic';
import { getTournamentDataLive } from './tournament-data.remote';

function parseCourtSizes(tourney: typeof tournament.$inferSelect): number[] {
	return tourney.courtSizes
		? JSON.parse(tourney.courtSizes)
		: calculateCourtSizes(tourney.playerCount);
}

export const closeRoundForm = form(
	v.object({
		tournamentId: v.pipe(v.number(), v.minValue(1))
	}),
	async ({ tournamentId }) => {
		const event = getRequestEvent();
		const user = event.locals.user;
		if (!user) error(401, 'Unauthorized');

		const [tourney] = await db
			.select()
			.from(tournament)
			.where(and(eq(tournament.id, tournamentId), eq(tournament.orgId, user.id)));

		if (!tourney) error(404, 'Not found');
		if (tourney.status !== 'active') error(400, 'Tournament not active');

		const currentRound = tourney.currentRound || 1;

		if (currentRound >= tourney.numRounds) {
			await db
				.update(tournament)
				.set({ status: 'completed' })
				.where(eq(tournament.id, tournamentId));

			getTournamentDataLive(tournamentId).reconnect();

			redirect(303, `/tournament/${tournamentId}/standings`);
		}

		const dbPlayers = await db.select().from(player).where(eq(player.tournamentId, tournamentId));
		const players = dbPlayers.map((p) => ({
			id: p.id,
			name: p.name,
			seedPoints: p.seedPoints,
			seedRank: p.seedRank
		}));

		const retiredPlayerIds = new Set(dbPlayers.filter((p) => p.retiredAt).map((p) => p.id));
		const activePlayerCount = dbPlayers.length - retiredPlayerIds.size;

		let courtSizes: number[] = parseCourtSizes(tourney);
		const physicalCourtCount = tourney.physicalCourtCount ?? 4;

		// If player count changed due to retirements, recalculate court sizes
		if (activePlayerCount !== tourney.playerCount) {
			const newConfig = recalculateCourtConfigAfterRetirement(activePlayerCount);
			courtSizes = newConfig.courtSizes;
			await db
				.update(tournament)
				.set({ playerCount: activePlayerCount, courtSizes: JSON.stringify(courtSizes) })
				.where(eq(tournament.id, tournamentId));
		}

		const initState = createInitialState({
			tournamentId: tourney.id,
			formatType: tourney.formatType as FormatType,
			playerCount: tourney.playerCount,
			physicalCourtCount
		});

		const stateWithPlayers = addPlayers(initState, players);

		const currentRotations = await db
			.select()
			.from(courtRotation)
			.where(
				and(
					eq(courtRotation.tournamentId, tournamentId),
					eq(courtRotation.roundNumber, currentRound)
				)
			);

		const currentAssignmentsFromDb = currentRotations.map((rotation) => ({
			courtNumber: rotation.courtNumber,
			playerIds: [
				rotation.player1Id,
				rotation.player2Id,
				...(rotation.player3Id !== null ? [rotation.player3Id] : []),
				...(rotation.player4Id !== null ? [rotation.player4Id] : []),
				...(rotation.player5Id !== null ? [rotation.player5Id] : []),
				...(rotation.player6Id !== null ? [rotation.player6Id] : [])
			].filter((id): id is number => id !== null && !retiredPlayerIds.has(id))
		}));

		const allMatches: MatchData[] = [];
		for (const rotation of currentRotations) {
			const rotationMatches = await db
				.select()
				.from(match)
				.where(eq(match.courtRotationId, rotation.id));
			for (const m of rotationMatches) {
				allMatches.push({
					teamAPlayer1Id: m.teamAPlayer1Id,
					teamAPlayer2Id: m.teamAPlayer2Id,
					teamBPlayer1Id: m.teamBPlayer1Id,
					teamBPlayer2Id: m.teamBPlayer2Id,
					teamAScore: m.teamAScore,
					teamBScore: m.teamBScore,
					isCanceled: m.isCanceled ?? false,
					injuredPlayerIds: m.injuredPlayerIds ?? undefined
				});
			}
		}

		const startedState = startRound(stateWithPlayers);

		const closedState = closeRound(
			{
				...startedState,
				roundsCompleted: currentRound - 1,
				currentAssignments: currentAssignmentsFromDb,
				currentMatches: allMatches
			},
			courtSizes
		);

		if (closedState.isComplete) {
			// Compute final standings for any retired players without one
			const retiredWithoutStanding = dbPlayers.filter(
				(p) => p.retiredAt && p.finalStanding === null
			);
			for (const rp of retiredWithoutStanding) {
				// Simple fallback: place at the bottom
				const fallbackStanding = activePlayerCount;
				await db
					.update(player)
					.set({ finalStanding: fallbackStanding })
					.where(eq(player.id, rp.id));
			}

			await db
				.update(tournament)
				.set({ status: 'completed', currentRound: closedState.roundsCompleted })
				.where(eq(tournament.id, tournamentId));

			getTournamentDataLive(tournamentId).reconnect();

			redirect(303, `/tournament/${tournamentId}/standings`);
		}

		let nextAssignments = closedState.nextAssignments;
		let nextCourtSizes = courtSizes;
		const nextRoundNumber = closedState.roundsCompleted + 1;

		// Apply final round elimination if needed
		const isFinalRound = nextRoundNumber >= tourney.numRounds;
		if (isFinalRound) {
			const playerIdsByCourt = nextAssignments.map((a) => [...a.playerIds]);
			const finalConfig = getFinalRoundCourtConfig(courtSizes, playerIdsByCourt);
			nextCourtSizes = finalConfig.courtSizes;
			if (finalConfig.eliminatedPlayerIds.length > 0) {
				// Trim assignments to 4 players for the top court
				nextAssignments = nextAssignments.map((a, i) => ({
					...a,
					playerIds: i === 0 ? a.playerIds.slice(0, Math.min(4, a.playerIds.length)) : a.playerIds
				}));
			}
		}

		// Delete any existing next round data (in case of partial state from retirement)
		const existingNextRotations = await db
			.select()
			.from(courtRotation)
			.where(
				and(
					eq(courtRotation.tournamentId, tournamentId),
					eq(courtRotation.roundNumber, nextRoundNumber)
				)
			);
		if (existingNextRotations.length > 0) {
			const existingIds = existingNextRotations.map((r) => r.id);
			await db.delete(match).where(inArray(match.courtRotationId, existingIds));
			await db
				.delete(courtRotation)
				.where(
					and(
						eq(courtRotation.tournamentId, tournamentId),
						eq(courtRotation.roundNumber, nextRoundNumber)
					)
				);
		}

		for (const assignment of nextAssignments) {
			const idx = assignment.courtNumber - 1;
			const size =
				assignment.playerIds.length > 4
					? (nextCourtSizes[idx] ?? assignment.playerIds.length)
					: assignment.playerIds.length;

			const [existingCourt] = await db
				.select()
				.from(court)
				.where(
					and(eq(court.tournamentId, tournamentId), eq(court.courtNumber, assignment.courtNumber))
				);

			const [rotation] = await db
				.insert(courtRotation)
				.values({
					courtId: existingCourt.id,
					tournamentId: tournamentId,
					roundNumber: nextRoundNumber,
					courtNumber: assignment.courtNumber,
					courtSize: size,
					player1Id: assignment.playerIds[0],
					player2Id: assignment.playerIds[1],
					player3Id: assignment.playerIds.length > 2 ? assignment.playerIds[2] : null,
					player4Id: assignment.playerIds.length > 3 ? assignment.playerIds[3] : null,
					player5Id: assignment.playerIds.length > 4 ? assignment.playerIds[4] : null,
					player6Id: assignment.playerIds.length > 5 ? assignment.playerIds[5] : null
				})
				.returning();

			const allMatchesForCourt = generateAllMatchesForAssignment(assignment, nextCourtSizes);

			const effective = getEffectiveScoring(
				size,
				{
					pointsToWin: tourney.pointsToWin ?? 21,
					setsToWin: tourney.setsToWin ?? 1,
					decidingSetPoints: tourney.decidingSetPoints ?? 15,
					winBy: tourney.winBy ?? 2
				},
				tourney.scoringOverrides as Record<
					string,
					{ pointsToWin?: number; setsToWin?: number; decidingSetPoints?: number }
				>
			);
			const maxSets = getMaxSets(effective.setsToWin);

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
		}

		// Deactivate all courts for current round, activate for next round
		const allCourts = await db.select().from(court).where(eq(court.tournamentId, tournamentId));

		for (const c of allCourts) {
			await db.update(court).set({ isActive: false }).where(eq(court.id, c.id));
		}

		const newRotations = await db
			.select()
			.from(courtRotation)
			.where(
				and(
					eq(courtRotation.tournamentId, tournamentId),
					eq(courtRotation.roundNumber, nextRoundNumber)
				)
			)
			.orderBy(courtRotation.courtNumber);

		for (let i = 0; i < newRotations.length; i++) {
			await db.update(court).set({ isActive: true }).where(eq(court.id, newRotations[i].courtId));
		}

		await db
			.update(tournament)
			.set({
				currentRound: nextRoundNumber,
				courtSizes: JSON.stringify(nextCourtSizes)
			})
			.where(eq(tournament.id, tournamentId));

		getTournamentDataLive(tournamentId).reconnect();

		return { success: true, nextRound: nextRoundNumber };
	}
);

export const deleteTournamentForm = form(
	v.object({
		tournamentId: v.pipe(v.number(), v.minValue(1))
	}),
	async ({ tournamentId }) => {
		const event = getRequestEvent();
		const user = event.locals.user;
		if (!user) error(401, 'Unauthorized');

		const [tourney] = await db
			.select()
			.from(tournament)
			.where(and(eq(tournament.id, tournamentId), eq(tournament.orgId, user.id)));

		if (!tourney) error(404, 'Tournament not found');

		const rotations = await db
			.select()
			.from(courtRotation)
			.where(eq(courtRotation.tournamentId, tournamentId));

		for (const rotation of rotations) {
			await db.delete(match).where(eq(match.courtRotationId, rotation.id));
		}

		await db.delete(courtRotation).where(eq(courtRotation.tournamentId, tournamentId));
		await db.delete(court).where(eq(court.tournamentId, tournamentId));
		await db.delete(player).where(eq(player.tournamentId, tournamentId));
		await db.delete(tournament).where(eq(tournament.id, tournamentId));

		redirect(303, '/');
	}
);

export const updateScoringOverrides = command(
	v.object({
		tournamentId: v.pipe(v.number(), v.minValue(1)),
		overrides: v.record(
			v.string(),
			v.object({
				pointsToWin: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(50))),
				winBy: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(10))),
				setsToWin: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(5))),
				decidingSetPoints: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(50)))
			})
		)
	}),
	async ({ tournamentId, overrides }) => {
		const event = getRequestEvent();
		const user = event.locals.user;
		if (!user) error(401, 'Unauthorized');

		const [tourney] = await db
			.select()
			.from(tournament)
			.where(and(eq(tournament.id, tournamentId), eq(tournament.orgId, user.id)));

		if (!tourney) error(404, 'Tournament not found');

		await db
			.update(tournament)
			.set({ scoringOverrides: overrides })
			.where(eq(tournament.id, tournamentId));

		getTournamentDataLive(tournamentId).reconnect();

		return { success: true };
	}
);

export const retirePlayer = command(
	v.object({
		tournamentId: v.pipe(v.number(), v.minValue(1)),
		playerId: v.pipe(v.number(), v.minValue(1)),
		reason: v.optional(v.string())
	}),
	async ({ tournamentId, playerId, reason }) => {
		const event = getRequestEvent();
		const user = event.locals.user;
		if (!user) error(401, 'Unauthorized');

		const [tourney] = await db
			.select()
			.from(tournament)
			.where(and(eq(tournament.id, tournamentId), eq(tournament.orgId, user.id)));
		if (!tourney) error(404, 'Tournament not found');
		if (tourney.status !== 'active') error(400, 'Tournament not active');

		const [targetPlayer] = await db
			.select()
			.from(player)
			.where(and(eq(player.id, playerId), eq(player.tournamentId, tournamentId)));
		if (!targetPlayer) error(404, 'Player not found');
		if (targetPlayer.retiredAt) error(400, 'Player already retired');

		const currentRound = tourney.currentRound || 0;
		if (currentRound === 0) error(400, 'Tournament has not started');

		const currentRotations = await db
			.select()
			.from(courtRotation)
			.where(
				and(
					eq(courtRotation.tournamentId, tournamentId),
					eq(courtRotation.roundNumber, currentRound)
				)
			);

		const playerRotation = currentRotations.find(
			(r) =>
				r.player1Id === playerId ||
				r.player2Id === playerId ||
				r.player3Id === playerId ||
				r.player4Id === playerId ||
				r.player5Id === playerId ||
				r.player6Id === playerId
		);

		if (!playerRotation) error(400, 'Player is not in the current round');

		const rotationMatches = await db
			.select()
			.from(match)
			.where(eq(match.courtRotationId, playerRotation.id));
		const hasScores = rotationMatches.some((m) => m.teamAScore !== null);

		if (hasScores) {
			error(400, 'Scores have already been entered. Use Report Injury instead.');
		}

		const dbPlayers = await db.select().from(player).where(eq(player.tournamentId, tournamentId));
		const priorRetirees = dbPlayers.filter((p) => p.retiredAt && p.id !== playerId);
		const activePlayers = dbPlayers.filter((p) => !p.retiredAt && p.id !== playerId);
		const activeCount = activePlayers.length;

		const newConfig = recalculateCourtConfigAfterRetirement(activeCount);
		const newCourtSizes = newConfig.courtSizes;

		const totalCourts = currentRotations.length;
		let finalStanding: number | null;

		if (tourney.formatType === 'preseed') {
			const bracketRange = getPreseedBracketRange(playerRotation.courtNumber, totalCourts);
			const sameBracketCount = priorRetirees.filter((p) => {
				if (!p.retiredCourt) return false;
				const pRange = getPreseedBracketRange(p.retiredCourt, totalCourts);
				return pRange.min === bracketRange.min && pRange.max === bracketRange.max;
			}).length;
			finalStanding = bracketRange.max - sameBracketCount;
		} else {
			const numRounds = tourney.numRounds;
			const standing = calculateRetiredStanding(
				playerRotation.courtNumber,
				totalCourts,
				currentRound - 1,
				numRounds,
				'random-seed',
				newCourtSizes
			);
			const sameStandingRetirees = priorRetirees.filter(
				(p) => p.finalStanding === standing || p.finalStanding === standing - 1
			);
			let adjusted = standing;
			for (const r of sameStandingRetirees) {
				if (r.retiredCourt && r.retiredCourt > playerRotation.courtNumber) {
					adjusted = standing - 1;
					break;
				}
			}
			finalStanding = adjusted;
		}

		await db
			.update(player)
			.set({
				retiredAt: new Date(),
				retiredRound: currentRound,
				retiredCourt: playerRotation.courtNumber,
				retirementReason: reason ?? null,
				finalStanding
			})
			.where(eq(player.id, playerId));

		await db
			.update(tournament)
			.set({
				playerCount: activeCount,
				courtSizes: JSON.stringify(newCourtSizes)
			})
			.where(eq(tournament.id, tournamentId));

		const currentRotationIds = currentRotations.map((r) => r.id);
		if (currentRotationIds.length > 0) {
			await db.delete(match).where(inArray(match.courtRotationId, currentRotationIds));
		}
		await db
			.delete(courtRotation)
			.where(
				and(
					eq(courtRotation.tournamentId, tournamentId),
					eq(courtRotation.roundNumber, currentRound)
				)
			);

		const prevRound = currentRound - 1;
		let nextAssignments: { courtNumber: number; playerIds: readonly number[] }[];

		if (prevRound === 0) {
			const formatType = tourney.formatType as FormatType;
			const allActivePlayerIds = activePlayers.map((p) => p.id);
			if (formatType === 'random-seed') {
				for (let i = allActivePlayerIds.length - 1; i > 0; i--) {
					const j = Math.floor(Math.random() * (i + 1));
					[allActivePlayerIds[i], allActivePlayerIds[j]] = [
						allActivePlayerIds[j],
						allActivePlayerIds[i]
					];
				}
			} else {
				allActivePlayerIds.sort(
					(a, b) =>
						(activePlayers.find((p) => p.id === b)?.seedPoints ?? 0) -
						(activePlayers.find((p) => p.id === a)?.seedPoints ?? 0)
				);
			}

			const courts: { courtNumber: number; playerIds: number[] }[] = [];
			for (let i = 0; i < newCourtSizes.length; i++) {
				courts.push({ courtNumber: i + 1, playerIds: [] });
			}
			let idx = 0;
			for (let pos = 0; pos < 4; pos++) {
				const fwd = pos % 2 === 0;
				for (let c = 0; c < newCourtSizes.length; c++) {
					const courtIdx = fwd ? c : newCourtSizes.length - 1 - c;
					if (idx < allActivePlayerIds.length) {
						courts[courtIdx].playerIds.push(allActivePlayerIds[idx]);
						idx++;
					}
				}
			}
			nextAssignments = courts.filter((c) => c.playerIds.length > 0);
		} else {
			const prevRotations = await db
				.select()
				.from(courtRotation)
				.where(
					and(
						eq(courtRotation.tournamentId, tournamentId),
						eq(courtRotation.roundNumber, prevRound)
					)
				);

			const resolved = await Promise.all(
				prevRotations.map(async (rotation) => {
					const prevMatches = await db
						.select()
						.from(match)
						.where(eq(match.courtRotationId, rotation.id));
					return { rotation, matchData: prevMatches as MatchData[] };
				})
			);

			const results = resolved.map((cr) => {
				const pIds = [
					cr.rotation.player1Id,
					cr.rotation.player2Id,
					...(cr.rotation.player3Id ? [cr.rotation.player3Id] : []),
					...(cr.rotation.player4Id ? [cr.rotation.player4Id] : []),
					...(cr.rotation.player5Id ? [cr.rotation.player5Id] : []),
					...(cr.rotation.player6Id ? [cr.rotation.player6Id] : [])
				].filter((id): id is number => id !== null);
				return {
					courtNumber: cr.rotation.courtNumber,
					standings: calculateCourtStandings(cr.matchData, pIds)
				};
			});

			const formatType = tourney.formatType as FormatType;
			if (formatType === 'preseed') {
				nextAssignments = redistributePreseedRecursive(results);
			} else if (prevRound === 1) {
				nextAssignments = verticalSeeding(results, newCourtSizes.length, newCourtSizes);
			} else {
				nextAssignments = ladderRedistribute(results, newCourtSizes.length, newCourtSizes);
			}
		}

		const allPlayerIds = nextAssignments.flatMap((a) => a.playerIds);
		const uniquePlayerIds = [...new Set(allPlayerIds)];
		uniquePlayerIds.sort((a, b) => a - b);

		const finalAssignments: { courtNumber: number; playerIds: number[] }[] = [];
		let offset = 0;
		for (let i = 0; i < newCourtSizes.length; i++) {
			finalAssignments.push({
				courtNumber: i + 1,
				playerIds: uniquePlayerIds.slice(offset, offset + newCourtSizes[i])
			});
			offset += newCourtSizes[i];
		}

		for (const assignment of finalAssignments) {
			const idx = assignment.courtNumber - 1;
			const size = newCourtSizes[idx] ?? 4;

			const [existingCourt] = await db
				.select()
				.from(court)
				.where(
					and(eq(court.tournamentId, tournamentId), eq(court.courtNumber, assignment.courtNumber))
				);

			const [newRotation] = await db
				.insert(courtRotation)
				.values({
					courtId: existingCourt.id,
					tournamentId: tournamentId,
					roundNumber: currentRound,
					courtNumber: assignment.courtNumber,
					courtSize: size,
					player1Id: assignment.playerIds[0],
					player2Id: assignment.playerIds[1],
					player3Id: assignment.playerIds.length > 2 ? assignment.playerIds[2] : null,
					player4Id: assignment.playerIds.length > 3 ? assignment.playerIds[3] : null,
					player5Id: assignment.playerIds.length > 4 ? assignment.playerIds[4] : null,
					player6Id: assignment.playerIds.length > 5 ? assignment.playerIds[5] : null
				})
				.returning();

			const allMatchesForCourt = generateAllMatchesForAssignment(
				{ courtNumber: assignment.courtNumber, playerIds: assignment.playerIds },
				newCourtSizes
			);

			const effective = getEffectiveScoring(
				size,
				{
					pointsToWin: tourney.pointsToWin ?? 21,
					setsToWin: tourney.setsToWin ?? 1,
					decidingSetPoints: tourney.decidingSetPoints ?? 15,
					winBy: tourney.winBy ?? 2
				},
				tourney.scoringOverrides as Record<
					string,
					{ pointsToWin?: number; setsToWin?: number; decidingSetPoints?: number }
				>
			);
			const maxSets = getMaxSets(effective.setsToWin);

			for (let mi = 0; mi < allMatchesForCourt.length; mi++) {
				const m = allMatchesForCourt[mi];
				for (let setNum = 1; setNum <= maxSets; setNum++) {
					await db.insert(match).values({
						courtRotationId: newRotation.id,
						matchNumber: mi + 1,
						setNumber: setNum,
						teamAPlayer1Id: m.teamAPlayer1Id,
						teamAPlayer2Id: m.teamAPlayer2Id,
						teamBPlayer1Id: m.teamBPlayer1Id,
						teamBPlayer2Id: m.teamBPlayer2Id
					});
				}
			}
		}

		getTournamentDataLive(tournamentId).reconnect();

		return { success: true };
	}
);

export const reportInjury = command(
	v.object({
		tournamentId: v.pipe(v.number(), v.minValue(1)),
		playerId: v.pipe(v.number(), v.minValue(1)),
		option: v.picklist(['substitute', 'cancel']),
		reason: v.optional(v.string())
	}),
	async ({ tournamentId, playerId, option, reason }) => {
		const event = getRequestEvent();
		const user = event.locals.user;
		if (!user) error(401, 'Unauthorized');

		const [tourney] = await db
			.select()
			.from(tournament)
			.where(and(eq(tournament.id, tournamentId), eq(tournament.orgId, user.id)));
		if (!tourney) error(404, 'Tournament not found');
		if (tourney.status !== 'active') error(400, 'Tournament not active');

		const [targetPlayer] = await db
			.select()
			.from(player)
			.where(and(eq(player.id, playerId), eq(player.tournamentId, tournamentId)));
		if (!targetPlayer) error(404, 'Player not found');
		if (targetPlayer.retiredAt) error(400, 'Player already retired');

		const currentRound = tourney.currentRound || 0;
		if (currentRound === 0) error(400, 'Tournament has not started');

		const currentRotations = await db
			.select()
			.from(courtRotation)
			.where(
				and(
					eq(courtRotation.tournamentId, tournamentId),
					eq(courtRotation.roundNumber, currentRound)
				)
			);

		const playerRotation = currentRotations.find(
			(r) =>
				r.player1Id === playerId ||
				r.player2Id === playerId ||
				r.player3Id === playerId ||
				r.player4Id === playerId ||
				r.player5Id === playerId ||
				r.player6Id === playerId
		);

		if (!playerRotation) error(400, 'Player is not in the current round');

		const rotationMatches = await db
			.select()
			.from(match)
			.where(eq(match.courtRotationId, playerRotation.id));
		const hasScores = rotationMatches.some((m) => m.teamAScore !== null);

		if (!hasScores) {
			error(400, 'No scores entered yet. Use Retire Player instead.');
		}

		if (option === 'cancel') {
			await db
				.update(match)
				.set({ isCanceled: true })
				.where(
					and(
						eq(match.courtRotationId, playerRotation.id),
						isNull(match.teamAScore),
						or(
							eq(match.teamAPlayer1Id, playerId),
							eq(match.teamAPlayer2Id, playerId),
							eq(match.teamBPlayer1Id, playerId),
							eq(match.teamBPlayer2Id, playerId)
						)
					)
				);
		} else if (option === 'substitute') {
			await db
				.update(match)
				.set({ injuredPlayerIds: [playerId] })
				.where(
					and(
						eq(match.courtRotationId, playerRotation.id),
						isNull(match.teamAScore),
						or(
							eq(match.teamAPlayer1Id, playerId),
							eq(match.teamAPlayer2Id, playerId),
							eq(match.teamBPlayer1Id, playerId),
							eq(match.teamBPlayer2Id, playerId)
						)
					)
				);
		}

		await db
			.update(player)
			.set({
				retiredAt: new Date(),
				retiredRound: currentRound,
				retiredCourt: playerRotation.courtNumber,
				retirementReason: reason ?? 'injury'
			})
			.where(eq(player.id, playerId));

		getTournamentDataLive(tournamentId).reconnect();

		return { success: true };
	}
);
