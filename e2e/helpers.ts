import type { Page } from '@playwright/test';

/** Delete a tournament from its detail page (uses browser confirm dialog). */
export async function deleteTournamentByName(page: Page, tournamentName: string): Promise<void> {
	await page.goto('/');
	await page.waitForLoadState('domcontentloaded');

	const tournamentCard = page.locator(`.tournament-card:has-text("${tournamentName}")`).first();
	if (!(await tournamentCard.isVisible().catch(() => false))) return;

	await tournamentCard.click();
	await page.waitForLoadState('domcontentloaded');

	const deleteButton = page.locator('button:has-text("Delete")');
	if (!(await deleteButton.isVisible().catch(() => false))) return;

	page.once('dialog', (dialog) => dialog.accept());
	await deleteButton.click();
	await page.waitForURL('/').catch(() => {});
}

/** Discover the SvelteKit remote form URL (hash changes between builds). */
export async function discoverCloseRoundFormUrl(page: Page): Promise<string> {
	const remoteUrl = await page.evaluate(() => {
		const html = document.documentElement.innerHTML;
		const match = html.match(/\/_app\/remote\/[a-z0-9]+\/closeRoundForm/);
		return match?.[0] ?? null;
	});
	if (!remoteUrl) {
		throw new Error('closeRoundForm remote URL not found on page');
	}
	return remoteUrl;
}

/**
 * Close the current round via UI button, or fall back to remote form submit when
 * canCloseRound is false (e.g. canceled matches with averaged standings).
 */
export async function closeRound(page: Page): Promise<void> {
	const closeBtn = page.locator(
		'button:has-text("Close Round & Advance"), button:has-text("Finalize Tournament")'
	);
	if ((await closeBtn.count()) > 0) {
		await closeBtn.first().click();
		return;
	}

	const remoteUrl = await discoverCloseRoundFormUrl(page);
	await page.evaluate(async (url) => {
		const tdId = location.pathname.split('/').pop();
		const fd = new URLSearchParams();
		fd.append('n:tournamentId', tdId || '');
		const res = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'x-sveltekit-pathname': location.pathname,
				'x-sveltekit-search': location.search
			},
			body: fd.toString()
		});
		if (!res.ok) {
			throw new Error(`closeRoundForm failed: ${res.status}`);
		}
	}, remoteUrl);
	await page.reload();
}
