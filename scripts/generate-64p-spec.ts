import {
	processPreseedTransition,
	getBracketGroups,
	calculateRoundCount
} from '../src/lib/tournament-logic.ts';
import { writeFileSync } from 'fs';

const N = 64;
const courtCount = 16;
const sizes = Array(16).fill(4);

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
		const half = courtNum <= 8 ? 'W' : 'L';
		const idx = courtNum <= 8 ? courtNum : courtNum - 8;
		const tier = idx <= 4 ? 'T' : 'B';
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
		const labels = ['F1', 'F2', 'F3', 'F4', 'T9', 'T10', 'T11', 'T12'];
		return labels[courtNum - 1] ?? `C${courtNum}`;
	}
	return `C${courtNum}`;
}

let assignments = snake(Array.from({ length: N }, (_, i) => i + 1));
const paths = new Map<number, Record<string, string>>();
for (const a of assignments) {
	for (let i = 0; i < a.playerIds.length; i++) {
		paths.set(a.playerIds[i], { r1: `${courtLabel(1, a.courtNumber)} #${i + 1}` });
	}
}

const roundSnapshots: { round: number; assignments: typeof assignments }[] = [
	{ round: 1, assignments: JSON.parse(JSON.stringify(assignments)) }
];

const transitions = [
	{ rc: 0, label: 'R1→R2' },
	{ rc: 1, label: 'R2→R3' },
	{ rc: 2, label: 'R3→R4' },
	{ rc: 3, label: 'R4→R5' }
];

let results = toResults(assignments);
for (const t of transitions) {
	const next = processPreseedTransition(results, sizes, t.rc, courtCount);
	assignments = next.map((a) => ({ courtNumber: a.courtNumber, playerIds: [...a.playerIds] }));
	results = toResults(assignments);
	const rNum = t.rc + 2;
	roundSnapshots.push({ round: rNum, assignments: JSON.parse(JSON.stringify(assignments)) });
	for (const a of assignments) {
		for (let i = 0; i < a.playerIds.length; i++) {
			const p = paths.get(a.playerIds[i])!;
			p[`r${rNum}`] = `${courtLabel(rNum, a.courtNumber)} #${i + 1}`;
		}
	}
}

for (let id = 1; id <= N; id++) {
	const p = paths.get(id)!;
	if (p.r4 && !p.r5) p.r5 = '— (settled)';
}

let md = `# Preseed Example: 64 Players (16 Courts, 5 Rounds)

## Overview

64 players on 16 courts. \`calculateRoundCount(16, 'preseed') = floor(log2(15)) + 2 = ${calculateRoundCount(16, 'preseed')}\` rounds.

**Assumption:** Players finish in **listed order** on every court (top of list = 1st). Paths are fully deterministic.

**Player IDs:** P01 (seed 1, highest) through P64 (seed 64, lowest).

### Bracket tree

\`\`\`
Round 1:   [C1]…[C16]                              snake seeding
              ↓
Round 2:   [W1]…[W8] | [L9]…[L16]                  splitSize(16)=8 → 8W+8L
              ↓              ↓
Round 3:   [WT×4] [WB×4] | [LT×4] [LB×4]           one-level within each half
              ↓              ↓
Round 4:   16 leaf courts (WW/WL/LW/LL labels)     one-level on each quarter
              ↓
Round 5:   [F1]…[F4] | [T9]…[T12]                  winner-only → 8 courts, 32 players
           (other 32 players settled after R4)
\`\`\`

### Subdivision schedule

| Transition | roundsCompleted | Groups | Mode | Courts after |
| ---------- | --------------- | ------ | ---- | ------------ |
| R1→R2 | 0 | all 16 | global first split | 16 |
| R2→R3 | 1 | [1–8], [9–16] | one-level each | 16 |
| R3→R4 | 2 | [1–4], [5–8], [9–12], [13–16] | one-level each | 16 |
| R4→R5 | 3 | [1,2], [3,4], … [15,16] | winner-only each | 8 |

### Gold-race rule

- **1st or 2nd** → stay in the upper court of the pair (remain in gold-race subtree).
- **3rd or 4th** → drop to the lower court **permanently** within that subtree.
- **Winner-only split (R4→R5):** only the top court of each pair plays R5; bottom court is settled.

---

## Round 1: Snake Seeding

| Court | 1st | 2nd | 3rd | 4th |
| ----- | --- | --- | --- | --- |
`;

const r1 = roundSnapshots[0].assignments;
for (const a of r1) {
	md += `| ${a.courtNumber} | ${a.playerIds.map(name).join(' | ')} |\n`;
}

md += `
Round 1 results = same order (listed position = finish).

---

## Round 2 (after R1→R2 first split)

Courts 1–8 = **Winner bracket (W)**. Courts 9–16 = **Loser bracket (L)**.

| Court | Label | Players |
| ----- | ----- | ------- |
`;

for (const a of roundSnapshots[1].assignments) {
	md += `| ${a.courtNumber} | ${courtLabel(2, a.courtNumber)} | ${a.playerIds.map(name).join(', ')} |\n`;
}

md += `
---

## Round 3 (after R2→R3 one-level split)

Within W half: courts 1,3,5,7 = top of each pair (WT); courts 2,4,6,8 = bottom (WB).
Within L half: courts 9,11,13,15 = top (LT); courts 10,12,14,16 = bottom (LB).

| Court | Label | Players |
| ----- | ----- | ------- |
`;

for (const a of roundSnapshots[2].assignments) {
	md += `| ${a.courtNumber} | ${courtLabel(3, a.courtNumber)} | ${a.playerIds.map(name).join(', ')} |\n`;
}

md += `
---

## Round 4 (after R3→R4 one-level split)

| Court | Label | Players |
| ----- | ----- | ------- |
`;

for (const a of roundSnapshots[3].assignments) {
	md += `| ${a.courtNumber} | ${courtLabel(4, a.courtNumber)} | ${a.playerIds.map(name).join(', ')} |\n`;
}

md += `
---

## Round 5 (after R4→R5 winner-only split)

Only courts 1,3,5,7,9,11,13,15 from R4 continue (renumbered 1–8). Bottom courts settled.

| Court | Label | Players |
| ----- | ----- | ------- |
`;

for (const a of roundSnapshots[4].assignments) {
	md += `| ${a.courtNumber} | ${courtLabel(5, a.courtNumber)} | ${a.playerIds.map(name).join(', ')} |\n`;
}

md += `
---

## Complete player paths

Format: **court label #finish**. \`—\` = settled after R4, no R5.

| Player | R1 | R2 | R3 | R4 | R5 |
| ------ | -- | -- | -- | -- | -- |
`;

for (let id = 1; id <= N; id++) {
	const p = paths.get(id)!;
	md += `| ${name(id)} | ${p.r1} | ${p.r2} | ${p.r3} | ${p.r4} | ${p.r5} |\n`;
}

const spotPlayers = [
	{
		id: 1,
		why: 'Always 1st every round on gold path → F1#1 (champion track)'
	},
	{
		id: 2,
		why: 'Always top-2 in gold subtree → F1#2'
	},
	{
		id: 9,
		why: 'R1 1st on C9. R3: WT2#3 (3rd in pair) drops from WW. R4: WL2#1 but pair bottom — settled, no R5'
	},
	{
		id: 16,
		why: 'R1: 1st on C16. R2: W8#2. R4: WL6#4 (bottom of pair) → settled'
	},
	{
		id: 17,
		why: 'R1: 2nd on C16 → W1#3 in R2 (3rd in tier) — drops within W half'
	},
	{
		id: 32,
		why: 'R1: 2nd on C1. R2: W8#4 (4th on W8) → drops to WB in R3, settled after R4'
	},
	{
		id: 33,
		why: 'R1: 3rd on C1 → L9#1 — tops loser bracket consolation'
	},
	{
		id: 64,
		why: 'R1: 4th on C1 — bottom overall'
	}
];

md += `
---

## Spot checks

| Player | R1 | R2 | R3 | R4 | R5 | Notes |
| ------ | -- | -- | -- | -- | -- | ----- |
`;

for (const s of spotPlayers) {
	const p = paths.get(s.id)!;
	md += `| ${name(s.id)} | ${p.r1} | ${p.r2} | ${p.r3} | ${p.r4} | ${p.r5} | ${s.why} |\n`;
}

const p09 = paths.get(9)!;
const p04 = paths.get(4)!;

md += `
### P09 — no return to gold

\`${p09.r1} → ${p09.r2} → ${p09.r3} → ${p09.r4} → ${p09.r5}\`

P09 was 1st on C9 in R1, reached W1 in R2, but finished 3rd in the R2→R3 pair split → dropped to WT2 (court 2). Even with 1st on WL2 in R4, **R5 = settled**. Bottom court of pair (1,2) never continues.

### P04 — still on gold court in R5 after WL detour

\`${p04.r1} → ${p04.r2} → ${p04.r3} → ${p04.r4} → ${p04.r5}\`

P04 was 1st on C4 through R2, then **2nd on WL4** in R3 (peer split within W quarter — not a 3rd/4th dropout). In R4, P04 lands on **WW1** via the [3,4] pair's top court. All four WW1 players continue to **F1** in R5 (winner-only passes the whole top court forward).

---

## How to verify

1. Open **Complete player paths** and pick any player.
2. At each round, note their finish (#1–#4).
3. For peer/one-level splits: **#1–#2 → top court of pair; #3–#4 → bottom court**.
4. For winner-only (R4→R5): only players on courts 1,3,5,7,9,11,13,15 in R4 play R5.
5. Players on bottom courts (2,4,6,8,10,12,14,16) in R4 show **— (settled)**.
`;

writeFileSync('/workspace/specs/084_preseed-example-64p.md', md);
console.log('Wrote specs/084_preseed-example-64p.md');
