import * as v from 'valibot';
import * as m from '$lib/paraglide/messages';
import { error } from '@sveltejs/kit';
import { redirectLocalized } from '$lib/i18n/redirect';
import { form, getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { tournament, player } from '$lib/server/db/schema';
import { assignSeedRanks, type FormatType } from '$lib/server/tournament-logic';
import { newPlayerToken } from '$lib/server/tournament-orchestration';
import { parsePlayerLine, type ParsedPlayer } from '$lib/parse-players';

export const createTournamentForm = form(
	v.object({
		name: v.pipe(v.string(), v.minLength(1)),
		formatType: v.picklist(['random-seed', 'preseed']),
		names: v.optional(v.string(), ''),
		physicalCourts: v.pipe(v.number(), v.minValue(1), v.maxValue(16)),
		scoringMode: v.picklist(['single-21', 'best-of-3', 'custom']),
		pointsToWin: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(50))),
		winBy: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(10))),
		setsToWin: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(5))),
		decidingSetPoints: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(50))),
		numRounds: v.pipe(v.number(), v.minValue(1), v.maxValue(10)),
		preseedRetirementPolicy: v.optional(v.picklist(['shrink', 'cascade']))
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
		numRounds: submittedNumRounds,
		preseedRetirementPolicy
	}) => {
		const event = getRequestEvent();
		const user = event.locals.user;
		if (!user) error(401, m.unauthorized());

		let pointsToWin: number;
		let winBy: number;
		let setsToWin: number;
		let decidingSetPoints: number;

		if (scoringMode === 'single-21') {
			pointsToWin = 21;
			winBy = 2;
			setsToWin = 1;
			decidingSetPoints = 15;
		} else if (scoringMode === 'best-of-3') {
			pointsToWin = 21;
			winBy = 2;
			setsToWin = 2;
			decidingSetPoints = 15;
		} else {
			pointsToWin = pointsToWinRaw ?? 21;
			winBy = winByRaw ?? 2;
			setsToWin = setsToWinRaw ?? 1;
			decidingSetPoints = decidingSetPointsRaw ?? 15;
		}

		const lines: string[] = (namesText ?? '')
			.split('\n')
			.map((l: string) => l.trim())
			.filter((l: string) => l.length > 0);

		if (lines.length > 64) {
			error(400, m.err_max_players({ count: 64, entered: lines.length }));
		}

		const parsed: ParsedPlayer[] = lines.map((line: string) => parsePlayerLine(line, formatType));

		if (formatType === 'preseed') {
			for (const p of parsed) {
				if (p.seedPoints === null) {
					p.seedPoints = 0;
				}
			}
		}

		const playerCount: number = parsed.length;

		const [newTournament] = await db
			.insert(tournament)
			.values({
				orgId: user.id,
				name,
				numRounds: submittedNumRounds,
				formatType,
				scoringMode,
				pointsToWin,
				winBy,
				setsToWin,
				decidingSetPoints,
				schedulingMode: 'batch',
				playerCount,
				preseedRetirementPolicy:
					formatType === 'preseed' ? (preseedRetirementPolicy ?? 'cascade') : 'cascade',
				physicalCourtCount,
				courtSizes: null,
				status: 'setup',
				currentRound: 0
			})
			.returning();

		if (parsed.length > 0) {
			const ranked = assignSeedRanks(parsed.map((p, listIndex) => ({ ...p, listIndex })));
			const inListOrder = [...ranked].sort((a, b) => a.listIndex - b.listIndex);

			for (const p of inListOrder) {
				await db.insert(player).values({
					tournamentId: newTournament.id,
					name: p.name,
					seedPoints: p.seedPoints,
					seedRank: p.seedRank,
					token: newPlayerToken()
				});
			}
		}

		void (formatType as FormatType);
		redirectLocalized(303, `/tournament/${newTournament.id}`, getRequestEvent());
	}
);
