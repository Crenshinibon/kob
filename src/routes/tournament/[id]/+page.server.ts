import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { tournament, player, courtRotation, match, courtAccess } from '$lib/server/db/schema';
import { eq, and, inArray, isNull, or } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import {
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
	type FormatType,
	type MatchData
} from '$lib/server/tournament-logic';
import crypto from 'crypto';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) throw redirect(302, '/login');

	const tournamentId = parseInt(params.id);
	const [tourney] = await db
		.select()
		.from(tournament)
		.where(and(eq(tournament.id, tournamentId), eq(tournament.orgId, user.id)));

	if (!tourney) throw error(404, 'Tournament not found');

	return {
		tournamentId,
		tournament: tourney
	};
};

export const actions: Actions = {
	retirePlayer: async ({ request, params, locals }) => {
		const user = locals.user;
		if (!user) throw error(401, 'Unauthorized');

		const tournamentId = parseInt(params.id);
		const formData = await request.formData();
		const playerId = parseInt(formData.get('playerId')?.toString() || '0');
		const reason = formData.get('reason')?.toString() || null;

		if (!playerId) throw error(400, 'Player ID required');

		const [tourney] = await db
			.select()
			.from(tournament)
			.where(and(eq(tournament.id, tournamentId), eq(tournament.orgId, user.id)));
		if (!tourney) throw error(404, 'Tournament not found');
		if (tourney.status !== 'active') throw error(400, 'Tournament not active');

		const [targetPlayer] = await db
			.select()
			.from(player)
			.where(and(eq(player.id, playerId), eq(player.tournamentId, tournamentId)));
		if (!targetPlayer) throw error(404, 'Player not found');
		if (targetPlayer.retiredAt) throw error(400, 'Player already retired');

		const currentRound = tourney.currentRound || 0;
		if (currentRound === 0) throw error(400, 'Tournament has not started');

		// Find player's current court rotation
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

		if (!playerRotation) throw error(400, 'Player is not in the current round');

		// Check if any scores have been entered for this player's court
		const rotationMatches = await db
			.select()
			.from(match)
			.where(eq(match.courtRotationId, playerRotation.id));
		const hasScores = rotationMatches.some((m) => m.teamAScore !== null);

		if (hasScores) {
			throw error(
				400,
				'Scores have already been entered for this player. Use Report Injury instead.'
			);
		}

		// Between-rounds retirement: safe to delete and regenerate current round
		const dbPlayers = await db.select().from(player).where(eq(player.tournamentId, tournamentId));
		const priorRetirees = dbPlayers.filter((p) => p.retiredAt && p.id !== playerId);
		const activePlayers = dbPlayers.filter((p) => !p.retiredAt && p.id !== playerId);
		const activeCount = activePlayers.length;

		const newConfig = recalculateCourtConfigAfterRetirement(activeCount);
		const newCourtSizes = newConfig.courtSizes;

		// Compute final standing
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
			// Resolve conflicts with prior random-seed retirees
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

		// Mark player as retired
		await db
			.update(player)
			.set({
				retiredAt: new Date(),
				retiredRound: currentRound,
				retiredCourt: playerRotation.courtNumber,
				retirementReason: reason,
				finalStanding
			})
			.where(eq(player.id, playerId));

		// Update tournament player count and court sizes
		await db
			.update(tournament)
			.set({
				playerCount: activeCount,
				courtSizes: JSON.stringify(newCourtSizes)
			})
			.where(eq(tournament.id, tournamentId));

		// Delete current round data
		const currentRotationIds = currentRotations.map((r) => r.id);
		if (currentRotationIds.length > 0) {
			await db.delete(match).where(inArray(match.courtRotationId, currentRotationIds));
			await db.delete(courtAccess).where(inArray(courtAccess.courtRotationId, currentRotationIds));
		}
		await db
			.delete(courtRotation)
			.where(
				and(
					eq(courtRotation.tournamentId, tournamentId),
					eq(courtRotation.roundNumber, currentRound)
				)
			);

		// Regenerate current round from previous round results
		const prevRound = currentRound - 1;
		let nextAssignments: { courtNumber: number; playerIds: readonly number[] }[];

		if (prevRound === 0) {
			// Round 1 regeneration: just redistribute active players like startRound
			const formatType = tourney.formatType as FormatType;
			const allActivePlayerIds = activePlayers.map((p) => p.id);
			// Shuffle for random seed, sort for preseed
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

			// Simple snake-like distribution
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
			// Round 2+ regeneration: compute previous round results and redistribute
			const prevRotations = await db
				.select()
				.from(courtRotation)
				.where(
					and(
						eq(courtRotation.tournamentId, tournamentId),
						eq(courtRotation.roundNumber, prevRound)
					)
				);

			const courtResults = prevRotations.map((rotation) => {
				const prevMatches = db.select().from(match).where(eq(match.courtRotationId, rotation.id));
				// We need to await this but we're in a map... we'll restructure below
				return { rotation, matches: prevMatches };
			});

			// Await all match queries
			const resolved = await Promise.all(
				courtResults.map(async (cr) => ({
					...cr,
					matchData: (await cr.matches) as MatchData[]
				}))
			);

			const results = resolved.map((cr) => {
				const playerIds = [
					cr.rotation.player1Id,
					cr.rotation.player2Id,
					...(cr.rotation.player3Id ? [cr.rotation.player3Id] : []),
					...(cr.rotation.player4Id ? [cr.rotation.player4Id] : []),
					...(cr.rotation.player5Id ? [cr.rotation.player5Id] : []),
					...(cr.rotation.player6Id ? [cr.rotation.player6Id] : [])
				].filter((id): id is number => id !== null);
				return {
					courtNumber: cr.rotation.courtNumber,
					standings: calculateCourtStandings(cr.matchData, playerIds)
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

		// Flatten, sort by standing, and reassign to ensure valid court sizes
		const allPlayerIds = nextAssignments.flatMap((a) => a.playerIds);
		// Deduplicate and ensure we have exactly activeCount players
		const uniquePlayerIds = [...new Set(allPlayerIds)];
		// Sort by ID for deterministic assignment (or we could sort by cumulative points)
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

		// Insert regenerated round data
		for (const assignment of finalAssignments) {
			const idx = assignment.courtNumber - 1;
			const size = newCourtSizes[idx] ?? 4;

			const [newRotation] = await db
				.insert(courtRotation)
				.values({
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
					decidingSetPoints: tourney.decidingSetPoints ?? 15
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

			const token = crypto.randomBytes(16).toString('hex');
			await db.insert(courtAccess).values({
				courtRotationId: newRotation.id,
				token,
				isActive: true
			});
		}

		return { success: true };
	},

	reportInjury: async ({ request, params, locals }) => {
		const user = locals.user;
		if (!user) throw error(401, 'Unauthorized');

		const tournamentId = parseInt(params.id);
		const formData = await request.formData();
		const playerId = parseInt(formData.get('playerId')?.toString() || '0');
		const option = formData.get('option')?.toString(); // 'substitute' or 'cancel'
		const reason = formData.get('reason')?.toString() || 'injury';

		if (!playerId) throw error(400, 'Player ID required');
		if (!option || (option !== 'substitute' && option !== 'cancel')) {
			throw error(400, 'Invalid injury option');
		}

		const [tourney] = await db
			.select()
			.from(tournament)
			.where(and(eq(tournament.id, tournamentId), eq(tournament.orgId, user.id)));
		if (!tourney) throw error(404, 'Tournament not found');
		if (tourney.status !== 'active') throw error(400, 'Tournament not active');

		const [targetPlayer] = await db
			.select()
			.from(player)
			.where(and(eq(player.id, playerId), eq(player.tournamentId, tournamentId)));
		if (!targetPlayer) throw error(404, 'Player not found');
		if (targetPlayer.retiredAt) throw error(400, 'Player already retired');

		const currentRound = tourney.currentRound || 0;
		if (currentRound === 0) throw error(400, 'Tournament has not started');

		// Find player's current court rotation
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

		if (!playerRotation) throw error(400, 'Player is not in the current round');

		// Check that some scores have been entered (it's mid-round)
		const rotationMatches = await db
			.select()
			.from(match)
			.where(eq(match.courtRotationId, playerRotation.id));
		const hasScores = rotationMatches.some((m) => m.teamAScore !== null);

		if (!hasScores) {
			throw error(400, 'No scores entered yet. Use Retire Player instead.');
		}

		if (option === 'cancel') {
			// Cancel remaining unplayed matches involving the injured player
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
			// Mark the injured player in remaining unplayed matches
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

		// Mark player as retired
		await db
			.update(player)
			.set({
				retiredAt: new Date(),
				retiredRound: currentRound,
				retiredCourt: playerRotation.courtNumber,
				retirementReason: reason
			})
			.where(eq(player.id, playerId));

		return { success: true };
	}
};
