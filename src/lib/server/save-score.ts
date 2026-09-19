import { invalid } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { match, court, tournament, courtRotation, player } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import {
	getMinPointsForSet,
	getEffectiveScoring,
	isValidFinalScore,
	getMaxSets,
	isDecidingSet,
	matchInvolvesPlayer,
	type ScoringOverrides
} from '$lib/server/tournament-logic';
import * as m from '$lib/paraglide/messages';
import { getTournamentData } from '../../routes/tournament/[id]/tournament-data.remote';
import { getCourtData } from '../../routes/court/[token]/court-data.remote';

export type SaveScoreMode = 'court' | 'player';

export type SaveScoreInput = {
	token: string;
	matchId: number;
	teamAScore: number;
	teamBScore: number;
	setNumber?: number;
	clear?: boolean;
	mode: SaveScoreMode;
	youOnTeam?: 'a' | 'b';
};

async function resolveRotationByToken(token: string) {
	const [rotationByToken] = await db
		.select()
		.from(courtRotation)
		.where(eq(courtRotation.token, token));

	if (rotationByToken) {
		const [courtRecord] = await db
			.select()
			.from(court)
			.where(eq(court.id, rotationByToken.courtId));
		return { rotation: rotationByToken, courtRecord, playerRecord: null };
	}

	const [courtRecord] = await db.select().from(court).where(eq(court.token, token));
	if (courtRecord) {
		const [tourney] = await db
			.select()
			.from(tournament)
			.where(eq(tournament.id, courtRecord.tournamentId));
		if (!tourney) return null;
		const currentRound = tourney.currentRound || 0;
		if (currentRound === 0) return null;
		const [rotation] = await db
			.select()
			.from(courtRotation)
			.where(
				and(eq(courtRotation.courtId, courtRecord.id), eq(courtRotation.roundNumber, currentRound))
			);
		return rotation ? { rotation, courtRecord, playerRecord: null } : null;
	}

	const [playerRecord] = await db.select().from(player).where(eq(player.token, token));
	if (!playerRecord) return null;
	const [tourney] = await db
		.select()
		.from(tournament)
		.where(eq(tournament.id, playerRecord.tournamentId));
	if (!tourney) return null;
	const currentRound = tourney.currentRound || 0;
	if (currentRound === 0) return null;
	const rotations = await db
		.select()
		.from(courtRotation)
		.where(
			and(
				eq(courtRotation.tournamentId, playerRecord.tournamentId),
				eq(courtRotation.roundNumber, currentRound)
			)
		);
	const rotation = rotations.find((r) =>
		[r.player1Id, r.player2Id, r.player3Id, r.player4Id, r.player5Id, r.player6Id].includes(
			playerRecord.id
		)
	);
	if (!rotation) return null;
	const [foundCourt] = await db.select().from(court).where(eq(court.id, rotation.courtId));
	return { rotation, courtRecord: foundCourt ?? null, playerRecord };
}

async function validateDecidingSetAllowed(
	courtRotationId: number,
	matchNumber: number,
	setNumber: number,
	setsToWin: number
): Promise<boolean> {
	if (!isDecidingSet(setNumber, setsToWin)) return true;

	const rows = await db
		.select()
		.from(match)
		.where(and(eq(match.courtRotationId, courtRotationId), eq(match.matchNumber, matchNumber)));

	const set1 = rows.find((r) => r.setNumber === 1);
	const set2 = rows.find((r) => r.setNumber === 2);
	if (!set1 || !set2 || set1.teamAScore === null || set2.teamAScore === null) return false;

	const teamAWins =
		(set1.teamAScore > set1.teamBScore! ? 1 : 0) + (set2.teamAScore > set2.teamBScore! ? 1 : 0);
	const teamBWins =
		(set1.teamBScore! > set1.teamAScore ? 1 : 0) + (set2.teamBScore! > set2.teamAScore ? 1 : 0);
	return teamAWins >= 1 && teamBWins >= 1;
}

type IssueBag = {
	teamAScore: (msg: string) => unknown;
	teamBScore?: (msg: string) => unknown;
	setNumber?: (msg: string) => unknown;
};

export async function saveMatchScore(input: SaveScoreInput, issue: IssueBag) {
	const resolved = await resolveRotationByToken(input.token);
	if (!resolved?.rotation) return invalid(issue.teamAScore(m.err_invalid_match()));

	const { rotation, courtRecord, playerRecord } = resolved;
	if (input.mode === 'court' && (!courtRecord || !courtRecord.isActive)) {
		return invalid(issue.teamAScore(m.err_court_not_active()));
	}

	const [matchRecord] = await db.select().from(match).where(eq(match.id, input.matchId));
	if (!matchRecord) return invalid(issue.teamAScore(m.err_invalid_match()));
	if (matchRecord.courtRotationId !== rotation.id) {
		return invalid(issue.teamAScore(m.err_invalid_match()));
	}
	if (matchRecord.isCanceled) return invalid(issue.teamAScore(m.err_match_canceled()));

	const [tourney] = await db
		.select()
		.from(tournament)
		.where(eq(tournament.id, rotation.tournamentId));
	if (!tourney) return invalid(issue.teamAScore(m.tournament_not_found()));

	const currentRound = tourney.currentRound || 0;
	if (rotation.roundNumber !== currentRound || tourney.status !== 'active') {
		return invalid(issue.teamAScore(m.err_court_read_only()));
	}

	if (input.mode === 'player') {
		if (!playerRecord) return invalid(issue.teamAScore(m.player_not_found()));
		if (!matchInvolvesPlayer(matchRecord, playerRecord.id)) {
			return invalid(issue.teamAScore(m.err_invalid_match()));
		}
		const alreadySaved =
			matchRecord.teamAScore != null ||
			matchRecord.teamBScore != null ||
			(input.setNumber != null &&
				matchRecord.setNumber === input.setNumber &&
				matchRecord.teamAScore != null);
		if (alreadySaved && !input.clear) {
			return invalid(issue.teamAScore(m.err_score_already_saved()));
		}
	}

	if (input.clear) {
		if (input.mode !== 'court') {
			return invalid(issue.teamAScore(m.err_score_already_saved()));
		}
		await db
			.update(match)
			.set({ teamAScore: null, teamBScore: null })
			.where(eq(match.id, input.matchId));
		await db
			.update(tournament)
			.set({ lastActivityAt: new Date() })
			.where(eq(tournament.id, rotation.tournamentId));
		await getTournamentData({ tournamentId: rotation.tournamentId }).refresh();
		if (courtRecord?.token) await getCourtData({ token: courtRecord.token }).refresh();
		return { success: true, matchId: input.matchId, cleared: true };
	}

	let teamAScore = input.teamAScore;
	let teamBScore = input.teamBScore;
	if (input.mode === 'player' && input.youOnTeam === 'b') {
		teamAScore = input.teamBScore;
		teamBScore = input.teamAScore;
	}

	const config = {
		pointsToWin: tourney.pointsToWin ?? 21,
		winBy: tourney.winBy ?? 2,
		setsToWin: tourney.setsToWin ?? 1,
		decidingSetPoints: tourney.decidingSetPoints ?? 15
	};
	const effective = getEffectiveScoring(
		rotation.courtSize,
		config,
		tourney.scoringOverrides as ScoringOverrides | null
	);

	if (input.setNumber != null) {
		const maxSets = getMaxSets(effective.setsToWin);
		if (input.setNumber < 1 || input.setNumber > maxSets) {
			return invalid(
				(issue.setNumber ?? issue.teamAScore)(
					m.err_score_invalid({ minPoints: 1, winBy: effective.winBy })
				)
			);
		}
		if (
			!(await validateDecidingSetAllowed(
				matchRecord.courtRotationId,
				matchRecord.matchNumber,
				input.setNumber,
				effective.setsToWin
			))
		) {
			return invalid(
				(issue.setNumber ?? issue.teamAScore)(
					m.err_score_invalid({ minPoints: 1, winBy: effective.winBy })
				)
			);
		}
	}

	const minPoints = getMinPointsForSet(
		input.setNumber ?? matchRecord.setNumber,
		rotation.courtSize,
		config,
		tourney.scoringOverrides as ScoringOverrides | null
	);
	const winner = Math.max(teamAScore, teamBScore);
	const loser = Math.min(teamAScore, teamBScore);

	if (!isValidFinalScore(winner, loser, minPoints, effective.winBy)) {
		if (teamAScore > teamBScore) {
			return invalid(issue.teamAScore(m.err_score_invalid({ minPoints, winBy: effective.winBy })));
		}
		return invalid(
			(issue.teamBScore ?? issue.teamAScore)(
				m.err_score_invalid({ minPoints, winBy: effective.winBy })
			)
		);
	}

	if (input.mode === 'player') {
		const [existing] = await db.select().from(match).where(eq(match.id, input.matchId));
		if (existing && (existing.teamAScore != null || existing.teamBScore != null)) {
			return invalid(issue.teamAScore(m.err_score_already_saved()));
		}
	}

	const targetSetNumber = input.setNumber ?? matchRecord.setNumber;
	const [existingSet] = await db
		.select()
		.from(match)
		.where(
			and(
				eq(match.courtRotationId, matchRecord.courtRotationId),
				eq(match.matchNumber, matchRecord.matchNumber),
				eq(match.setNumber, targetSetNumber)
			)
		);

	if (existingSet) {
		if (
			input.mode === 'player' &&
			(existingSet.teamAScore != null || existingSet.teamBScore != null)
		) {
			return invalid(issue.teamAScore(m.err_score_already_saved()));
		}
		await db.update(match).set({ teamAScore, teamBScore }).where(eq(match.id, existingSet.id));
	} else {
		await db.insert(match).values({
			courtRotationId: matchRecord.courtRotationId,
			matchNumber: matchRecord.matchNumber,
			setNumber: targetSetNumber,
			teamAPlayer1Id: matchRecord.teamAPlayer1Id,
			teamAPlayer2Id: matchRecord.teamAPlayer2Id,
			teamBPlayer1Id: matchRecord.teamBPlayer1Id,
			teamBPlayer2Id: matchRecord.teamBPlayer2Id,
			teamAScore,
			teamBScore
		});
	}

	await db
		.update(tournament)
		.set({ lastActivityAt: new Date() })
		.where(eq(tournament.id, rotation.tournamentId));

	await getTournamentData({ tournamentId: rotation.tournamentId }).refresh();
	if (courtRecord?.token) await getCourtData({ token: courtRecord.token }).refresh();

	return {
		success: true,
		matchId: input.matchId,
		teamAScore,
		teamBScore,
		setNumber: input.setNumber
	};
}
