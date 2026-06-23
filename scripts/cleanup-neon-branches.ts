/**
 * Delete stale Neon preview branches created by the Vercel integration.
 *
 * Preview branches use the naming pattern: preview/<git-branch-name>
 *
 * Usage:
 *   NEON_API_KEY=... NEON_PROJECT_ID=... bun scripts/cleanup-neon-branches.ts --dry-run
 *   NEON_API_KEY=... NEON_PROJECT_ID=... bun scripts/cleanup-neon-branches.ts
 *   NEON_API_KEY=... NEON_PROJECT_ID=... bun scripts/cleanup-neon-branches.ts --branch preview/cursor/fix-sign-out-3d6e
 *
 * Requires NEON_API_KEY (Account Settings → API Keys) and NEON_PROJECT_ID
 * (Project Settings in Neon Console).
 */

const API_BASE = 'https://console.neon.tech/api/v2';

const apiKey = process.env.NEON_API_KEY;
const projectId = process.env.NEON_PROJECT_ID;

if (!apiKey) throw new Error('NEON_API_KEY is not set');
if (!projectId) throw new Error('NEON_PROJECT_ID is not set');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const branchArgIdx = args.indexOf('--branch');
const singleBranch = branchArgIdx >= 0 ? args[branchArgIdx + 1] : undefined;
const keepGitBranches = !args.includes('--include-active-git-branches');

type NeonBranch = {
	id: string;
	name: string;
	primary?: boolean;
	default?: boolean;
	created_at?: string;
};

type ListBranchesResponse = {
	branches: NeonBranch[];
	pagination?: { next?: string };
};

async function neonFetch<T>(path: string, init?: RequestInit): Promise<T> {
	const res = await fetch(`${API_BASE}${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
			Accept: 'application/json',
			...(init?.headers ?? {})
		}
	});
	if (!res.ok) {
		const body = await res.text();
		throw new Error(`Neon API ${init?.method ?? 'GET'} ${path} failed (${res.status}): ${body}`);
	}
	if (res.status === 204) return undefined as T;
	return res.json() as Promise<T>;
}

async function listBranches(): Promise<NeonBranch[]> {
	const branches: NeonBranch[] = [];
	let cursor: string | undefined;

	do {
		const params = new URLSearchParams({ limit: '100', sort_by: 'created_at', sort_order: 'asc' });
		if (cursor) params.set('cursor', cursor);
		const data = await neonFetch<ListBranchesResponse>(
			`/projects/${projectId}/branches?${params}`
		);
		branches.push(...data.branches);
		cursor = data.pagination?.next;
	} while (cursor);

	return branches;
}

async function deleteBranch(branch: NeonBranch): Promise<void> {
	if (dryRun) {
		console.log(`[dry-run] would delete ${branch.name} (${branch.id})`);
		return;
	}
	await neonFetch(`/projects/${projectId}/branches/${branch.id}`, { method: 'DELETE' });
	console.log(`Deleted ${branch.name} (${branch.id})`);
}

async function listRemoteGitBranches(): Promise<Set<string>> {
	const proc = Bun.spawn(['git', 'branch', '-r'], { stdout: 'pipe' });
	const output = await new Response(proc.stdout).text();
	const exit = await proc.exited;
	if (exit !== 0) throw new Error('git branch -r failed');

	const names = new Set<string>();
	for (const line of output.split('\n')) {
		const trimmed = line.trim().replace(/^origin\//, '');
		if (trimmed && trimmed !== 'HEAD') names.add(trimmed);
	}
	return names;
}

function isProtectedBranch(branch: NeonBranch): boolean {
	return branch.primary === true || branch.default === true || branch.name === 'main';
}

const allBranches = await listBranches();
const previewBranches = singleBranch
	? allBranches.filter((b) => b.name === singleBranch)
	: allBranches.filter((b) => b.name.startsWith('preview/'));

if (singleBranch && previewBranches.length === 0) {
	throw new Error(`Branch not found: ${singleBranch}`);
}

const gitBranches = keepGitBranches ? await listRemoteGitBranches() : new Set<string>();
const toDelete: NeonBranch[] = [];

for (const branch of previewBranches) {
	if (isProtectedBranch(branch)) {
		console.log(`Skip protected branch: ${branch.name}`);
		continue;
	}

	const gitBranch = branch.name.replace(/^preview\//, '');
	if (keepGitBranches && gitBranches.has(gitBranch)) {
		console.log(`Skip active git branch: ${branch.name}`);
		continue;
	}

	toDelete.push(branch);
}

console.log(`Found ${previewBranches.length} preview branches, deleting ${toDelete.length}`);

for (const branch of toDelete) {
	await deleteBranch(branch);
}

if (toDelete.length === 0) {
	console.log('Nothing to delete.');
} else if (dryRun) {
	console.log('Dry run complete. Re-run without --dry-run to delete.');
}
