import { describe, it, expect } from 'vitest';
import { parsePlayerLine, parsePastedText, parseCsvText } from '$lib/parse-players';

describe('parsePlayerLine', () => {
	describe('preseed format', () => {
		it('parses name with space and points', () => {
			const result = parsePlayerLine('Patrick Abraham 176', 'preseed');
			expect(result).toEqual({ name: 'Patrick Abraham', seedPoints: 176 });
		});

		it('parses name with multiple spaces before points', () => {
			const result = parsePlayerLine('Patrick Abraham  176', 'preseed');
			expect(result).toEqual({ name: 'Patrick Abraham', seedPoints: 176 });
		});

		it('parses name with comma separator', () => {
			const result = parsePlayerLine('Patrick Abraham,176', 'preseed');
			expect(result).toEqual({ name: 'Patrick Abraham', seedPoints: 176 });
		});

		it('parses name with semicolon separator', () => {
			const result = parsePlayerLine('Patrick Abraham;176', 'preseed');
			expect(result).toEqual({ name: 'Patrick Abraham', seedPoints: 176 });
		});

		it('parses name with tab separator', () => {
			const result = parsePlayerLine('Patrick Abraham\t176', 'preseed');
			expect(result).toEqual({ name: 'Patrick Abraham', seedPoints: 176 });
		});

		it('returns name only when no points', () => {
			const result = parsePlayerLine('Patrick Abraham', 'preseed');
			expect(result).toEqual({ name: 'Patrick Abraham', seedPoints: null });
		});

		it('returns name as-is for bare number', () => {
			const result = parsePlayerLine('176', 'preseed');
			expect(result).toEqual({ name: '176', seedPoints: null });
		});

		it('returns empty for empty string', () => {
			const result = parsePlayerLine('', 'preseed');
			expect(result).toEqual({ name: '', seedPoints: null });
		});

		it('returns empty for whitespace only', () => {
			const result = parsePlayerLine('   ', 'preseed');
			expect(result).toEqual({ name: '', seedPoints: null });
		});

		it('tolerates trailing whitespace', () => {
			const result = parsePlayerLine('Patrick Abraham 176  ', 'preseed');
			expect(result).toEqual({ name: 'Patrick Abraham', seedPoints: 176 });
		});

		it('handles name with hyphen and points', () => {
			const result = parsePlayerLine('Hans-Peter Schmidt 100', 'preseed');
			expect(result).toEqual({ name: 'Hans-Peter Schmidt', seedPoints: 100 });
		});
	});

	describe('random-seed format', () => {
		it('returns entire line as name', () => {
			const result = parsePlayerLine('Patrick Abraham 176', 'random-seed');
			expect(result).toEqual({ name: 'Patrick Abraham 176', seedPoints: null });
		});

		it('returns empty for empty string', () => {
			const result = parsePlayerLine('', 'random-seed');
			expect(result).toEqual({ name: '', seedPoints: null });
		});
	});
});

describe('parsePastedText', () => {
	it('handles tab-separated 2-column paste (name + points)', () => {
		const input = 'Patrick Abraham\t176\nMarcel Redeker\t152';
		const result = parsePastedText(input);
		expect(result).toEqual(['Patrick Abraham 176', 'Marcel Redeker 152']);
	});

	it('handles tab-separated 3-column paste (nr + name + points)', () => {
		const input = '1\tPatrick Abraham\t176\n2\tMarcel Redeker\t152';
		const result = parsePastedText(input);
		expect(result).toEqual(['Patrick Abraham 176', 'Marcel Redeker 152']);
	});

	it('handles tab-separated single column (name only)', () => {
		const input = 'Patrick Abraham\nMarcel Redeker';
		const result = parsePastedText(input);
		expect(result).toEqual(['Patrick Abraham', 'Marcel Redeker']);
	});

	it('handles comma-separated text', () => {
		const input = 'Patrick Abraham,Marcel Redeker,Dirk Porsche';
		const result = parsePastedText(input);
		expect(result).toEqual(['Patrick Abraham', 'Marcel Redeker', 'Dirk Porsche']);
	});

	it('handles semicolon-separated text', () => {
		const input = 'Patrick Abraham;Marcel Redeker';
		const result = parsePastedText(input);
		expect(result).toEqual(['Patrick Abraham', 'Marcel Redeker']);
	});

	it('handles plain newline text unchanged', () => {
		const input = 'Patrick Abraham\nMarcel Redeker\nDirk Porsche';
		const result = parsePastedText(input);
		expect(result).toEqual(['Patrick Abraham', 'Marcel Redeker', 'Dirk Porsche']);
	});

	it('handles Windows-style CRLF line endings', () => {
		const input = 'Patrick Abraham\t176\r\nMarcel Redeker\t152';
		const result = parsePastedText(input);
		expect(result).toEqual(['Patrick Abraham 176', 'Marcel Redeker 152']);
	});

	it('filters empty lines', () => {
		const input = 'Patrick Abraham\n\n\nMarcel Redeker';
		const result = parsePastedText(input);
		expect(result).toEqual(['Patrick Abraham', 'Marcel Redeker']);
	});

	it('handles tab-separated with non-numeric second column (falls back to splitting)', () => {
		const input = 'Patrick Abraham\tSomeNote';
		const result = parsePastedText(input);
		expect(result).toEqual(['Patrick Abraham', 'SomeNote']);
	});

	it('handles mixed tab rows with and without numeric last column', () => {
		const input = 'Patrick Abraham\t176\nSome Header Row';
		const result = parsePastedText(input);
		expect(result).toEqual(['Patrick Abraham 176', 'Some Header Row']);
	});
});

describe('parseCsvText', () => {
	it('parses WVV CSV with semicolons and quoted strings', () => {
		const csv = `liste;nr;spieler1;wvv;dvv
"hauptfeld";1;"Patrick Abraham";176;0
"hauptfeld";2;"Marcel Redeker";152;0`;
		const result = parseCsvText(csv);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.lines).toEqual(['Patrick Abraham 176', 'Marcel Redeker 152']);
			expect(result.hasWvvPoints).toBe(true);
		}
	});

	it('parses CSV with comma delimiter', () => {
		const csv = `liste,nr,spieler1,wvv,dvv
hauptfeld,1,Patrick Abraham,176,0
hauptfeld,2,Marcel Redeker,152,0`;
		const result = parseCsvText(csv);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.lines).toEqual(['Patrick Abraham 176', 'Marcel Redeker 152']);
			expect(result.hasWvvPoints).toBe(true);
		}
	});

	it('returns error when spieler1 column missing', () => {
		const csv = `liste;nr;dvv
"hauptfeld";1;0`;
		const result = parseCsvText(csv);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toBe('no_spieler1');
		}
	});

	it('parses CSV with only spieler1, no wvv', () => {
		const csv = `liste;nr;spieler1
"hauptfeld";1;"Patrick Abraham"
"hauptfeld";2;"Marcel Redeker"`;
		const result = parseCsvText(csv);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.lines).toEqual(['Patrick Abraham', 'Marcel Redeker']);
			expect(result.hasWvvPoints).toBe(false);
		}
	});

	it('returns empty result for empty CSV', () => {
		const result = parseCsvText('');
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.lines).toEqual([]);
			expect(result.hasWvvPoints).toBe(false);
		}
	});

	it('handles UTF-8 BOM', () => {
		const csv = `\uFEFFliste;nr;spieler1;wvv;dvv
"hauptfeld";1;"Patrick Abraham";176;0`;
		const result = parseCsvText(csv);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.lines).toEqual(['Patrick Abraham 176']);
		}
	});

	it('handles wvv=0 as points (shows 0)', () => {
		const csv = `liste;nr;spieler1;wvv;dvv
"hauptfeld";1;"Lennart Köttig";0;0`;
		const result = parseCsvText(csv);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.lines).toEqual(['Lennart Köttig 0']);
			expect(result.hasWvvPoints).toBe(false);
		}
	});

	it('handles "spieler 1" header variant (with space)', () => {
		const csv = `liste;nr;"spieler 1";wvv;dvv
"hauptfeld";1;"Patrick Abraham";176;0`;
		const result = parseCsvText(csv);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.lines).toEqual(['Patrick Abraham 176']);
		}
	});

	it('skips rows with empty spieler1', () => {
		const csv = `liste;nr;spieler1;wvv;dvv
"hauptfeld";1;"";176;0
"hauptfeld";2;"Patrick Abraham";152;0`;
		const result = parseCsvText(csv);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.lines).toEqual(['Patrick Abraham 152']);
		}
	});

	it('handles full setzliste.csv from WVV', () => {
		const csv = `liste;nr;spieler1;wvv;dvv
"hauptfeld";1;"Patrick Abraham";176;0
"hauptfeld";2;"Marcel Redeker";152;0
"hauptfeld";3;"Dirk Porsche";112;0
"hauptfeld";4;"Max Wellm";112;0
"hauptfeld";5;"Christoph Gormanns";100;0
"hauptfeld";6;"Kent Barthel";98;0
"hauptfeld";7;"Frederik Heimerdinger";50;0
"hauptfeld";8;"Sebastian Zimmer";50;0`;
		const result = parseCsvText(csv);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.lines).toHaveLength(8);
			expect(result.lines[0]).toBe('Patrick Abraham 176');
			expect(result.lines[7]).toBe('Sebastian Zimmer 50');
			expect(result.hasWvvPoints).toBe(true);
		}
	});
});
