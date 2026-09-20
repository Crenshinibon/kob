import { query } from '$app/server';
import * as v from 'valibot';
import { db } from '$lib/server/db';
import { player, court, courtRotation, match } from '$lib/server/db/schema';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { deriveLockState, minRoundCount, sortCourts } from '$lib/manage-logic';
import { requireOrganizerTournament } from '$lib/server/org-guard';
import { checkInWasUsed } from '$lib/player-page-logic';
import { getFrozenCourts, getBracketGroups, type FormatType } from '$lib/tournament-logic';
import { parseStoredCourtSizes, bracketCourtSizes } from '$lib/server/court-size-config';
import { rotationPlayerIds } from '$lib/server/manage-orchestration';

const idSchema = v.object({
	tournamentId: v.pipe(v.number(), v.minValue(1))
});

export const getManageData = query(idSchema, async ({ tournamentId }) => {
	const { tourney } = await requireOrganizerTournament(tournamentId);
	const players = await db.select().from(player).where(eq(player.tournamentId, tournamentId));
	const courts = await db.select().from(court).where(eq(court.tournamentId, tournamentId));
	const currentRound = tourney.currentRound || 0;
	const rotations =
		currentRound > 0
			? await db
					.select()
					.from(courtRotation)
					.where(
						and(
							eq(courtRotation.tournamentId, tournamentId),
							eq(courtRotation.roundNumber, currentRound)
						)
					)
					.orderBy(asc(courtRotation.courtNumber))
			: [];
	const rotIds = rotations.map((r) => r.id);
	const matches =
		rotIds.length > 0
			? await db.select().from(match).where(inArray(match.courtRotationId, rotIds))
			: [];
	const lock = deriveLockState(matches);
	const courtSizes = tourney.status === 'setup' ? [] : parseStoredCourtSizes(tourney);
	const frozen =
		tourney.formatType === 'preseed' && courtSizes.length > 0
			? getFrozenCourts(
					bracketCourtSizes(tourney, courtSizes.length),
					Math.max(0, currentRound - 1),
					'preseed'
				)
			: [];
	const frozenNumbers = new Set(frozen.map((f) => f.courtNumber));
	const groups =
		tourney.formatType === 'preseed' && courtSizes.length > 0
			? getBracketGroups(courtSizes.length, Math.max(0, currentRound - 1))
			: [];
	const now = Date.now();
	const playerCourt = new Map<number, { courtNumber: number; position: number }>();
	for (const rotation of rotations) {
		rotationPlayerIds(rotation).forEach((id, i) => {
			playerCourt.set(id, { courtNumber: rotation.courtNumber, position: i });
		});
	}

	const matchesByRotation = new Map<number, typeof matches>();
	for (const row of matches) {
		const list = matchesByRotation.get(row.courtRotationId) ?? [];
		list.push(row);
		matchesByRotation.set(row.courtRotationId, list);
	}

	return {
		tournament: {
			id: tourney.id,
			name: tourney.name,
			status: tourney.status,
			currentRound,
			numRounds: tourney.numRounds,
			formatType: tourney.formatType as FormatType,
			playerCount: tourney.playerCount,
			scoringMode: tourney.scoringMode,
			pointsToWin: tourney.pointsToWin,
			winBy: tourney.winBy,
			setsToWin: tourney.setsToWin,
			decidingSetPoints: tourney.decidingSetPoints,
			physicalCourtCount: tourney.physicalCourtCount,
			preseedRetirementPolicy: tourney.preseedRetirementPolicy,
			setupTimeMinutes: tourney.setupTimeMinutes,
			transitionTimeMinutes: tourney.transitionTimeMinutes,
			avgRallyDurationSeconds: tourney.avgRallyDurationSeconds,
			timeBetweenRalliesSeconds: tourney.timeBetweenRalliesSeconds,
			timeBetweenMatchesMinutes: tourney.timeBetweenMatchesMinutes,
			finishedEarly: tourney.finishedEarly,
			scoringOverrides: tourney.scoringOverrides,
			tieBreakConfig: tourney.tieBreakConfig
		},
		lock: {
			roundHasScores: lock.roundHasScores,
			isFinalRound: currentRound >= tourney.numRounds && tourney.status === 'active',
			lockedCourts: lock.roundHasScores ? rotations.map((r) => r.courtNumber) : [],
			openCourts: lock.roundHasScores ? [] : rotations.map((r) => r.courtNumber)
		},
		checkInUsed: checkInWasUsed(players, tourney.checkInClosedAt),
		minRounds: minRoundCount(currentRound, lock.roundHasScores),
		canonicalCourtSizes: courtSizes,
		players: players.map((p) => {
			const loc = playerCourt.get(p.id);
			const status = p.injuredAt
				? 'injured'
				: p.retiredAt
					? 'retired'
					: loc
						? 'active'
						: tourney.status === 'active' && currentRound >= tourney.numRounds
							? 'eliminated'
							: 'active';
			const canUndoUntil =
				p.retiredAt && now - new Date(p.retiredAt).getTime() < 5 * 60 * 1000
					? new Date(new Date(p.retiredAt).getTime() + 5 * 60 * 1000)
					: null;
			return {
				id: p.id,
				name: p.name,
				token: p.token,
				seedPoints: p.seedPoints,
				seedRank: p.seedRank,
				courtNumber: loc?.courtNumber ?? null,
				position: loc?.position ?? null,
				status,
				retiredRound: p.retiredRound,
				retirementReason: p.retirementReason,
				injuredAt: p.injuredAt,
				retiredAt: p.retiredAt,
				replacesPlayerId: p.replacesPlayerId,
				replacedByPlayerId: p.replacedByPlayerId,
				joinedRound: p.joinedRound,
				checkedInAt: p.checkedInAt,
				checkInSource: p.checkInSource,
				canUndoUntil
			};
		}),
		courts: sortCourts(
			rotations.map((rotation) => {
				const rotMatches = matchesByRotation.get(rotation.id) ?? [];
				const group = groups.find((g) => g.includes(rotation.courtNumber));
				return {
					courtNumber: rotation.courtNumber,
					label: courts.find((c) => c.id === rotation.courtId)?.label ?? null,
					courtId: rotation.courtId,
					rotationId: rotation.id,
					courtSize: rotation.courtSize,
					hasScores: rotMatches.some((x) => x.teamAScore != null),
					isFrozen: frozenNumbers.has(rotation.courtNumber),
					bracketRole: group ? `courts ${Math.min(...group)}–${Math.max(...group)}` : null,
					manualAdjustedAt: rotation.manualAdjustedAt,
					playerIds: rotationPlayerIds(rotation),
					token: courts.find((c) => c.id === rotation.courtId)?.token ?? null
				};
			})
		)
	};
});
