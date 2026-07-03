import { expect, type Page } from '@playwright/test';

export async function login(page: Page): Promise<void> {
	await page.goto('/login');
	await page.fill('input[type="email"]', 'test@example.com');
	await page.fill('input[type="password"]', 'password123');
	await page.click('button[type="submit"]');

	try {
		await page.waitForURL('/', { timeout: 3000 });
	} catch {
		await page.goto('/signup');
		await page.fill('input[type="email"]', 'test@example.com');
		await page.fill('input[type="password"]', 'password123');
		await page.fill('input#confirmPassword', 'password123');
		await page.click('button[type="submit"]');
		await page.waitForURL('/');
	}

	const dismissBtn = page.locator('button:has-text("OK")');
	if (await dismissBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
		await dismissBtn.click();
	}
	await page.evaluate(() => {
		localStorage.setItem('cookie-notice-dismissed', 'true');
	});
}

export async function createRandomSeedTournament(
	page: Page,
	name: string,
	playerCount: number,
	numRounds = 2
): Promise<string> {
	await page.goto('/');
	await page.waitForSelector('text=+ New Tournament');
	await page.click('text=+ New Tournament');
	await page.fill('input[name="name"]', name);
	await page.fill('input[name="n:numRounds"]', String(numRounds));
	const players = Array.from({ length: playerCount }, (_, i) => `P${i + 1}`);
	await page.fill('textarea[name="names"]', players.join('\n'));
	await page.click('button[type="submit"]');
	await page.waitForURL(/\/tournament\/\d+/);
	const match = page.url().match(/\/tournament\/(\d+)/);
	expect(match).toBeTruthy();
	return match![1];
}

export async function getCourtLinks(page: Page): Promise<string[]> {
	await page.waitForSelector('.qr-link a');
	return page.locator('.qr-link a').evaluateAll(
		(els) => els.map((el) => (el as HTMLAnchorElement).href).filter(Boolean)
	);
}

export async function scoreAllMatchesOnCourt(
	page: Page,
	courtUrl: string,
	aScore = 21,
	bScore = 19
): Promise<void> {
	await page.goto(courtUrl);
	const matchIds = await extractMatchIds(page);
	for (const matchId of matchIds) {
		await page.fill(`[data-testid="team-a-score-${matchId}"]`, String(aScore));
		await page.fill(`[data-testid="team-b-score-${matchId}"]`, String(bScore));
		await page.click(`[data-testid="save-score-${matchId}"]`);
		await page.waitForSelector(`[data-testid="saved-${matchId}"]`);
	}
}

export async function extractMatchIds(page: Page): Promise<string[]> {
	await page.waitForSelector('[data-testid^="match-form-"]');
	return page.locator('[data-testid^="match-form-"]').evaluateAll(
		(els) => els.map((el) => el.getAttribute('data-testid')?.replace('match-form-', '') ?? '').filter(Boolean)
	);
}

export async function scoreAllCourts(page: Page, links: string[]): Promise<void> {
	for (const link of links) {
		await scoreAllMatchesOnCourt(page, link);
	}
}

export async function closeRoundViaFetch(
	page: Page,
	tournamentId: string
): Promise<{ ok: boolean; status: number; reason?: string; body?: string }> {
	return page.evaluate(async (tid) => {
		const fd = new URLSearchParams();
		fd.set('n:tournamentId', String(tid));
		const anyInput = document.querySelector(
			'input[name="n:tournamentId"]'
		) as HTMLInputElement | null;
		if (!anyInput) return { ok: false, status: 0, reason: 'no input on page' };
		const anyForm = anyInput.closest('form') as HTMLFormElement | null;
		if (!anyForm) return { ok: false, status: 0, reason: 'no form' };
		const remoteParam = new URL(anyForm.action).searchParams.get('/remote');
		if (!remoteParam) return { ok: false, status: 0, reason: 'no remote param' };
		const hash = remoteParam.split('/')[0];
		if (!hash) return { ok: false, status: 0, reason: 'no hash' };
		const remoteUrl = '/_app/remote/' + hash + '/closeRoundForm';
		const res = await fetch(remoteUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: fd.toString()
		});
		const text = await res.text();
		try {
			const json = JSON.parse(text);
			// SvelteKit form actions respond 200 even on errors; check body.status
			const status = json?.status ?? res.status;
			return { ok: status < 400, status, body: text.slice(0, 200) };
		} catch {
			return { ok: res.ok, status: res.status, body: text.slice(0, 200) };
		}
	}, tournamentId);
}

export async function deleteTournament(page: Page, tournamentName: string): Promise<void> {
	try {
		await page.goto('/');
		const card = page.locator(`.tournament-card:has-text("${tournamentName}")`).first();
		if (await card.isVisible().catch(() => false)) {
			await card.click();
			const deleteButton = page.locator('button:has-text("Delete")');
			if (await deleteButton.isVisible().catch(() => false)) {
				await deleteButton.click();
				const confirmButton = page.locator('button:has-text("Confirm")');
				if (await confirmButton.isVisible().catch(() => false)) {
					await confirmButton.click();
				}
			}
		}
	} catch {
		// ignore cleanup errors
	}
}
