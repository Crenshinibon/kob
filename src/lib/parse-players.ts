export type ParsedPlayer = { name: string; seedPoints: number | null };

const PLAYER_LINE_REGEX = /^(.+?)[,;\t\s]+(\d+)\s*$/;

export function parsePlayerLine(line: string, formatType: string): ParsedPlayer {
	const trimmed = line.trim();
	if (!trimmed) return { name: '', seedPoints: null };

	if (formatType === 'preseed') {
		const playerMatch = trimmed.match(PLAYER_LINE_REGEX);
		if (playerMatch) {
			const name = playerMatch[1].trim();
			if (name.length > 0) {
				return { name, seedPoints: parseInt(playerMatch[2], 10) };
			}
		}
		return { name: trimmed, seedPoints: null };
	}

	return { name: trimmed, seedPoints: null };
}

export function parsePastedText(text: string): string[] {
	const rows = text.split(/\r?\n/);

	if (rows.some((row) => row.includes('\t'))) {
		const result: string[] = [];
		for (const row of rows) {
			const trimmed = row.trim();
			if (!trimmed) continue;

			const cols = trimmed.split('\t');

			if (cols.length >= 2) {
				const lastCol = cols[cols.length - 1].trim();
				const secondLastCol = cols[cols.length - 2].trim();

				if (/^\d+$/.test(lastCol) && secondLastCol.length > 0) {
					result.push(`${secondLastCol} ${lastCol}`);
					continue;
				}

				if (cols.length >= 3) {
					const thirdLastCol = cols[cols.length - 3].trim();
					if (/^\d+$/.test(secondLastCol) && thirdLastCol.length > 0) {
						result.push(`${thirdLastCol} ${secondLastCol}`);
						continue;
					}
				}

				result.push(...cols.map((c) => c.trim()).filter((c) => c.length > 0));
			} else {
				if (/[,;]/.test(trimmed)) {
					result.push(
						...trimmed
							.split(/[,;]+/)
							.map((c) => c.trim())
							.filter((c) => c.length > 0)
					);
				} else {
					result.push(trimmed);
				}
			}
		}
		return result;
	}

	if (/[,;]/.test(text)) {
		return text
			.split(/[,;]+/)
			.map((n) => n.trim())
			.filter((n) => n.length > 0);
	}

	return rows.map((r) => r.trim()).filter((r) => r.length > 0);
}

export type CsvParseResult =
	| { ok: true; lines: string[]; hasWvvPoints: boolean }
	| { ok: false; error: string };

function stripQuotes(val: string): string {
	const trimmed = val.trim();
	if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
		return trimmed.slice(1, -1);
	}
	return trimmed;
}

export function parseCsvText(text: string): CsvParseResult {
	const content = text.replace(/^\uFEFF/, '');
	const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
	if (lines.length === 0) return { ok: true, lines: [], hasWvvPoints: false };

	const delimiter = lines[0].includes(';') ? ';' : ',';
	const headerCols = lines[0].split(delimiter).map((c) => stripQuotes(c).toLowerCase());

	const spieler1Idx = headerCols.findIndex((h) => h === 'spieler1' || h === 'spieler 1');
	if (spieler1Idx === -1) return { ok: false, error: 'no_spieler1' };

	const wvvIdx = headerCols.findIndex((h) => h === 'wvv');
	const hasWvvColumn = wvvIdx !== -1;

	const result: string[] = [];
	let hasWvvPoints = false;

	for (let i = 1; i < lines.length; i++) {
		const cols = lines[i].split(delimiter);
		const name = stripQuotes(cols[spieler1Idx] ?? '').trim();
		if (!name) continue;

		if (hasWvvColumn) {
			const points = stripQuotes(cols[wvvIdx] ?? '').trim();
			const pointsNum = parseInt(points, 10);
			if (!isNaN(pointsNum)) {
				result.push(`${name} ${pointsNum}`);
				if (pointsNum > 0) hasWvvPoints = true;
			} else {
				result.push(name);
			}
		} else {
			result.push(name);
		}
	}

	return { ok: true, lines: result, hasWvvPoints };
}
