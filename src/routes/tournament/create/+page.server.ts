import { redirect, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { tournament, player } from '$lib/server/db/schema';
import { getCourtConfiguration, calculateRoundCount } from '$lib/server/tournament-logic';

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
		const pointsToWin = parseInt(formData.get('pointsToWin')?.toString() || '21');
		const winBy = parseInt(formData.get('winBy')?.toString() || '2');
		const setsToWin = parseInt(formData.get('setsToWin')?.toString() || '1');
		const pointsToWinSet2 = formData.get('pointsToWinSet2')?.toString()
			? parseInt(formData.get('pointsToWinSet2')!.toString())
			: 15;

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

		const numRounds: number = calculateRoundCount(config.totalCourts, formatType);

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
				pointsToWinSet2,
				schedulingMode: 'batch',
				playerCount,
				physicalCourtCount,
				courtSizes: JSON.stringify(courtSizes),
				status: 'draft',
				currentRound: 0
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

		throw redirect(302, `/tournament/${newTournament.id}/players`);
	}
};
