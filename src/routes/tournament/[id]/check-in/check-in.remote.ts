import { command, query } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import { db } from '$lib/server/db';
import { player, courtRotation, match, tournament } from '$lib/server/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import * as m from '$lib/paraglide/messages';
import { requireOrganizerTournament } from '$lib/server/org-guard';
import { checkInWasUsed } from '$lib/player-page-logic';
import { deriveLockState } from '$lib/manage-logic';
import { removePlayersFromRoster } from '$lib/server/manage-orchestration';
import { startTournament, StartTournamentError } from '$lib/server/tournament-orchestration';
import { getManageData } from '../manage/manage-data.remote';
import { getTournamentData } from '../tournament-data.remote';

async function refreshCheckInSurfaces(tournamentId: number): Promise<void> {
	await Promise.all([
		getCheckInData({ tournamentId }).refresh(),
		getManageData({ tournamentId }).refresh(),
		getTournamentData({ tournamentId }).refresh()
	]);
}

const idSchema = v.object({
	tournamentId: v.pipe(v.number(), v.minValue(1))
});

export const getCheckInData = query(idSchema, async ({ tournamentId }) => {
	const { tourney } = await requireOrganizerTournament(tournamentId);
	const players = await db.select().from(player).where(eq(player.tournamentId, tournamentId));
	const active = players.filter((p) => !p.retiredAt);
	const round1 = await db
		.select()
		.from(courtRotation)
		.where(and(eq(courtRotation.tournamentId, tournamentId), eq(courtRotation.roundNumber, 1)));
	const rotIds = round1.map((r) => r.id);
	const matches =
		rotIds.length > 0
			? await db.select().from(match).where(inArray(match.courtRotationId, rotIds))
			: [];
	return {
		tournament: {
			id: tourney.id,
			name: tourney.name,
			status: tourney.status,
			checkInClosedAt: tourney.checkInClosedAt
		},
		players: active.map((p) => ({
			id: p.id,
			name: p.name,
			token: p.token,
			checkedInAt: p.checkedInAt,
			checkInSource: p.checkInSource
		})),
		checked: active.filter((p) => p.checkedInAt).length,
		total: active.length,
		round1HasScores: deriveLockState(matches).roundHasScores,
		checkInUsed: checkInWasUsed(players, tourney.checkInClosedAt)
	};
});

export const setPlayerCheckIn = command(
	v.object({
		playerId: v.pipe(v.number(), v.minValue(1)),
		checkedIn: v.boolean()
	}),
	async ({ playerId, checkedIn }) => {
		const [row] = await db.select().from(player).where(eq(player.id, playerId));
		if (!row) error(404, m.player_not_found());
		await requireOrganizerTournament(row.tournamentId);
		await db
			.update(player)
			.set({
				checkedInAt: checkedIn ? new Date() : null,
				checkInSource: 'org'
			})
			.where(eq(player.id, playerId));
		await refreshCheckInSurfaces(row.tournamentId);
		return { success: true };
	}
);

export const closeCheckIn = command(
	v.object({
		tournamentId: v.pipe(v.number(), v.minValue(1)),
		removeUnchecked: v.optional(v.boolean(), false),
		startAfter: v.optional(v.boolean(), false)
	}),
	async ({ tournamentId, removeUnchecked, startAfter }) => {
		const { user, tourney } = await requireOrganizerTournament(tournamentId);
		if (tourney.status === 'active' && removeUnchecked) {
			const players = await db.select().from(player).where(eq(player.tournamentId, tournamentId));
			const toRemove = players.filter((p) => !p.retiredAt && !p.checkedInAt).map((p) => p.id);
			await removePlayersFromRoster(tourney, toRemove);
		}
		await db
			.update(tournament)
			.set({ checkInClosedAt: new Date(), lastActivityAt: new Date() })
			.where(eq(tournament.id, tournamentId));

		if (startAfter && tourney.status === 'setup') {
			try {
				await startTournament({
					tournamentId,
					orgId: user.id,
					checkedInOnly: !!removeUnchecked
				});
			} catch (err) {
				if (err instanceof StartTournamentError) {
					if (err.code === 'min_players') {
						error(400, m.err_min_players({ count: 4, entered: err.entered ?? 0 }));
					}
					error(400, m.err_tournament_already_started());
				}
				throw err;
			}
		}

		await refreshCheckInSurfaces(tournamentId);
		return { success: true };
	}
);

export const reopenCheckIn = command(idSchema, async ({ tournamentId }) => {
	await requireOrganizerTournament(tournamentId);
	await db
		.update(tournament)
		.set({ checkInClosedAt: null, lastActivityAt: new Date() })
		.where(eq(tournament.id, tournamentId));
	await refreshCheckInSurfaces(tournamentId);
	return { success: true };
});
