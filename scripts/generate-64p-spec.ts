import { processPreseedTransition, calculateRoundCount } from '../src/lib/tournament-logic.ts';
import { writeFileSync } from 'fs';

const N = 64;
const courtCount = 16;
const sizes = Array(16).fill(4);
const OUT = '/workspace/specs/088_preseed-example-64p.md';

function snake(items: number[]) {
	const courtsArr = Array.from({ length: 16 }, (_, i) => ({
		courtNumber: i + 1,
		playerIds: [] as number[]
	}));
	for (let pos = 0; pos < 4; pos++) {
		const fwd = pos % 2 === 0;
		for (let c = 0; c < 16; c++) {
			const idx = fwd ? c : 15 - c;
			const ii = pos * 16 + c;
			if (ii < items.length) courtsArr[idx].playerIds.push(items[ii]);
		}
	}
	return courtsArr;
}

function toResults(assignments: { courtNumber: number; playerIds: number[] }[]) {
	return assignments.map((a) => ({
		courtNumber: a.courtNumber,
		standings: a.playerIds.map((pid, i) => ({
			playerId: pid,
			rank: i + 1,
			points: 60 - i * 10,
			diff: 0,
			matchCount: 3
		}))
	}));
}

const name = (id: number) => `P${String(id).padStart(2, '0')}`;

function courtLabel(round: number, courtNum: number): string {
	if (round === 1) return `C${courtNum}`;
	if (round === 2) return courtNum <= 8 ? `W${courtNum}` : `L${courtNum}`;
	if (round === 3) {
		const idx = courtNum <= 8 ? courtNum : courtNum - 8;
		const tier = idx <= 4 ? 'T' : 'B';
		const half = courtNum <= 8 ? 'W' : 'L';
		return `${half}${tier}${courtNum}`;
	}
	if (round === 4) {
		const labels = [
			'WW1',
			'WL2',
			'WW3',
			'WL4',
			'WW5',
			'WL6',
			'WW7',
			'WL8',
			'LW9',
			'LL10',
			'LW11',
			'LL12',
			'LW13',
			'LL14',
			'LW15',
			'LL16'
		];
		return labels[courtNum - 1] ?? `C${courtNum}`;
	}
	if (round === 5) {
		const labels = [
			'F1',
			'F2',
			'F3',
			'F4',
			'F5',
			'F6',
			'F7',
			'F8',
			'T9',
			'T10',
			'T11',
			'T12',
			'T13',
			'T14',
			'T15',
			'T16'
		];
		return labels[courtNum - 1] ?? `C${courtNum}`;
	}
	return `C${courtNum}`;
}

function formatStartOfRound(
	assignments: { courtNumber: number; playerIds: number[] }[],
	round: number
): string {
	let md = `### At the start of round ${round}\n\n`;
	for (const a of assignments) {
		const label = courtLabel(round, a.courtNumber);
		const players = a.playerIds.map(name).join(', ');
		md += `**Court ${a.courtNumber} (${label}):** ${players}\n\n`;
	}
	return md;
}

function formatEndOfRound(
	assignments: { courtNumber: number; playerIds: number[] }[],
	round: number
): string {
	let md = `### End of round ${round}\n\n`;
	md += `Players finish in **listed order** (top player = 1st).\n\n`;
	for (const a of assignments) {
		const label = courtLabel(round, a.courtNumber);
		md += `**Court ${a.courtNumber} (${label}):**\n\n`;
		a.playerIds.forEach((pid, i) => {
			md += `${i + 1}. ${name(pid)}\n`;
		});
		md += '\n';
	}
	return md;
}

function formatTransition(fromRound: number, toRound: number): string {
	const notes: Record<number, string> = {
		1: `**Round 1 → Round 2** (first split): global tiers, \`splitSize(16)=8\` → courts 1–8 winner bracket, courts 9–16 loser bracket. Origin mixing within each bracket.

- 1sts + 2nds from all courts → winner bracket (courts 1–8)
- 3rds + 4ths from all courts → loser bracket (courts 9–16)`,
		2: `**Round 2 → Round 3** (split ×2): each half of 8 courts uses the same algorithm.

- Global finish tiers across courts 1–8 (or 9–16), \`splitSize(8)=4\` → top 4 courts get 1sts+2nds, bottom 4 get 3rds+4ths`,
		3: `**Round 3 → Round 4** (split ×4): each quarter of 4 courts uses the same algorithm.

- Global finish tiers within the quarter, \`splitSize(4)=2\` → top 2 courts get 1sts+2nds, bottom 2 get 3rds+4ths`,
		4: `**Round 4 → Round 5** (split ×8): each pair of 2 courts uses the same algorithm.

- Global finish tiers within the pair, \`splitSize(2)=1\` → top court gets 1sts+2nds, bottom court gets 3rds+4ths
- All **16 courts** (64 players) play round 5`
	};
	return `---\n\n${notes[fromRound] ?? ''}\n\n`;
}

// Build all round start assignments
let assignments = snake(Array.from({ length: N }, (_, i) => i + 1));
const roundStarts: { round: number; assignments: typeof assignments }[] = [
	{ round: 1, assignments: JSON.parse(JSON.stringify(assignments)) }
];

let results = toResults(assignments);
for (const rc of [0, 1, 2, 3]) {
	const next = processPreseedTransition(results, sizes, rc, courtCount);
	assignments = next.map((a) => ({ courtNumber: a.courtNumber, playerIds: [...a.playerIds] }));
	results = toResults(assignments);
	roundStarts.push({ round: rc + 2, assignments: JSON.parse(JSON.stringify(assignments)) });
}

// Player path summary
const paths = new Map<number, Record<string, string>>();
for (const a of roundStarts[0].assignments) {
	for (let i = 0; i < a.playerIds.length; i++) {
		paths.set(a.playerIds[i], { r1: `C${a.courtNumber} #${i + 1}` });
	}
}
for (let ri = 1; ri < roundStarts.length; ri++) {
	const round = roundStarts[ri].round;
	for (const a of roundStarts[ri].assignments) {
		for (let i = 0; i < a.playerIds.length; i++) {
			const p = paths.get(a.playerIds[i])!;
			p[`r${round}`] = `${courtLabel(round, a.courtNumber)} #${i + 1}`;
		}
	}
}
for (let id = 1; id <= N; id++) {
	const p = paths.get(id)!;
	if (p.r4 && !p.r5) p.r5 = '—';
}

let md = `# Preseed Example: 64 Players (16 Courts, 5 Rounds)

## Overview

64 players on 16 courts. \`calculateRoundCount(16, 'preseed') = ${calculateRoundCount(16, 'preseed')}\` rounds.

**Players:** P01 (highest seed) through P64 (lowest seed).

**Assumption:** On every court, players finish in the **order they are listed** at the start of the round (1st = top line, 4th = bottom line).

### Gold-race rule

- **1st or 2nd** → stay in the upper court when the bracket pair splits.
- **3rd or 4th** → drop to the lower court permanently within that subtree.
- **Every split:** global finish tiers → \`splitSize(N)\` winner/loser courts → 1sts+2nds fill top court numbers, 3rds+4ths fill bottom court numbers.

### Bracket tree

\`\`\`
R1:  [C1]…[C16]
       ↓ first split (8W + 8L)
R2:  [W1]…[W8] | [L9]…[L16]
       ↓ split within each half (8→4+4)
R3:  [WT×4][WB×4] | [LT×4][LB×4]
       ↓ split within each quarter (4→2+2)
R4:  [WW/WL × 8] | [LW/LL × 8]
       ↓ split within each pair (2→1+1)
R5:  [F1]…[F8] | [T9]…[T16]   (64 players)
\`\`\`

---

`;

for (let r = 1; r <= 5; r++) {
	const start = roundStarts.find((x) => x.round === r)!.assignments;
	md += `## Round ${r}\n\n`;
	if (r === 1) {
		md += `Round 1 assignments come from **snake seeding** across 16 courts.\n\n`;
	}
	if (r === 5) {
		md += `All **16 courts** (64 players) play round 5.\n\n`;
	}
	md += formatStartOfRound(start, r);
	md += formatEndOfRound(start, r);
	if (r < 5) {
		md += formatTransition(r, r + 1);
	}
}

md += `---

## Final standings (overview)

| Place range | Determined by |
| ----------- | ------------- |
| 1–4 | R5 Court 1 (F1) finish order |
| 5–8 | R5 Courts 2–4 (F2–F4) + R4 WL courts |
| 9–16 | R5 Courts 5–8 (F5–F8) + settled WL courts |
| 17–32 | R5 T9–T16 + R4 LW/LL courts |
| 33–64 | Loser subtree from R2 onward |

---

## Player path summary

Compact view: **court label #finish** per round.

| Player | R1 | R2 | R3 | R4 | R5 |
| ------ | -- | -- | -- | -- | -- |
`;

for (let id = 1; id <= N; id++) {
	const p = paths.get(id)!;
	md += `| ${name(id)} | ${p.r1} | ${p.r2 ?? ''} | ${p.r3 ?? ''} | ${p.r4 ?? ''} | ${p.r5 ?? ''} |\n`;
}

md += `
---

## Spot checks

| Player | Path | Note |
| ------ | ---- | ---- |
| P01 | ${paths.get(1)!.r1} → ${paths.get(1)!.r2} → ${paths.get(1)!.r3} → ${paths.get(1)!.r4} → ${paths.get(1)!.r5} | Always 1st on gold path |
| P09 | ${paths.get(9)!.r1} → ${paths.get(9)!.r2} → ${paths.get(9)!.r3} → ${paths.get(9)!.r4} → ${paths.get(9)!.r5} | 3rd in R2→R3 pair → out of gold bracket by R4 |
| P33 | ${paths.get(33)!.r1} → ${paths.get(33)!.r2} → ${paths.get(33)!.r3} → ${paths.get(33)!.r4} → ${paths.get(33)!.r5} | Tops loser bracket, plays T9 in R5 |

Regenerate this file: \`bun scripts/generate-64p-spec.ts\`
`;

writeFileSync(OUT, md);
console.log('Wrote', OUT);
