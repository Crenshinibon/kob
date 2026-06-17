import { test, expect } from '@playwright/test';

test.describe('Preseed Frozen Courts (20 players, 5 courts)', () => {
	test.setTimeout(240000);

	const testTournamentNames: string[] = [];

	test.afterEach(async ({ page }) => {
		for (const name of testTournamentNames) {
			try {
				await page.goto('/');
				await page.waitForTimeout(500);
				const card = page.locator(`.tournament-card:has-text("${name}")`).first();
				if (await card.isVisible().catch(() => false)) {
					await card.click();
					const del = page.locator('button:has-text("Delete")');
					if (await del.isVisible().catch(() => false)) {
						await del.click();
						const confirm = page.locator('button:has-text("Confirm")');
						if (await confirm.isVisible().catch(() => false)) await confirm.click();
					}
				}
			} catch {
				// ignore cleanup errors
			}
		}
		testTournamentNames.length = 0;
		await page.goto('/');
		await page.waitForTimeout(500);
	});

	async function login(page: import('@playwright/test').Page) {
		await page.goto('/');
		await page.waitForTimeout(300);
		await page.goto('/login');
		await page.fill('input[type="email"]', 'test@example.com');
		await page.fill('input[type="password"]', 'password123');
		await page.click('button[type="submit"]');
		try {
			await page.waitForURL('/', { timeout: 5000 });
		} catch {
			await page.goto('/signup');
			await page.fill('input[type="email"]', 'test@example.com');
			await page.fill('input[type="password"]', 'password123');
			await page.fill('input#confirmPassword', 'password123');
			await page.click('button[type="submit"]');
			await page.waitForURL('/');
		}
		const dismissBtn = page.locator('button:has-text("OK")');
		if (await dismissBtn.isVisible().catch(() => false)) {
			await dismissBtn.click();
			await page.waitForTimeout(300);
		}
		await page.goto('/');
		await page.waitForTimeout(500);
	}

	async function createTournament(
		page: import('@playwright/test').Page,
		name: string,
		players: string[]
	): Promise<string> {
		await page.waitForSelector('text=+ New Tournament');
		await page.click('text=+ New Tournament');
		await page.fill('input[name="name"]', name);
		await page.click('input[type="radio"][value="preseed"]');
		await page.fill('textarea[name="names"]', players.join('\n'));
		await page.click('button[type="submit"]');
		await page.waitForURL(/\/tournament\/\d+/);
		await page.waitForSelector('.court-card');
		const m = page.url().match(/\/tournament\/(\d+)/);
		expect(m).toBeTruthy();
		return m![1];
	}

	async function getCourtLinks(
		page: import('@playwright/test').Page,
		tid: string
	): Promise<string[]> {
		await page.goto(`/tournament/${tid}`);
		await page.waitForSelector('.qr-link a');
		await page.waitForTimeout(1000);
		const els = await page.locator('.qr-link a').all();
		const links: string[] = [];
		for (const el of els) {
			const href = await el.getAttribute('href');
			if (href) links.push(href);
		}
		return links;
	}

	async function scoreCourt(
		page: import('@playwright/test').Page,
		url: string,
		aScore: number = 21,
		bScore: number = 19
	): Promise<void> {
		await page.goto(url);
		await page.waitForSelector('[data-testid^="match-form-"]');
		const forms = await page.locator('[data-testid^="match-form-"]').all();
		const ids = await Promise.all(
			forms.map(async (f) => {
				const tid = await f.getAttribute('data-testid');
				return tid?.replace('match-form-', '');
			})
		);
		for (const id of ids) {
			await page.fill(`[data-testid="team-a-score-${id}"]`, String(aScore));
			await page.fill(`[data-testid="team-b-score-${id}"]`, String(bScore));
			await page.click(`[data-testid="save-score-${id}"]`);
			await page.waitForSelector(`[data-testid="saved-${id}"]`);
		}
	}

	async function closeRound(page: import('@playwright/test').Page, tid: string): Promise<void> {
		await page.goto(`/tournament/${tid}`);
		await page.waitForSelector('button:has-text("Close Round & Advance")');
		await page.click('button:has-text("Close Round & Advance")');
		await page.waitForTimeout(5000);
	}

	async function finalize(page: import('@playwright/test').Page, tid: string): Promise<void> {
		await page.goto(`/tournament/${tid}`);
		await page.waitForSelector('button:has-text("Finalize Tournament")');
		await page.click('button:has-text("Finalize Tournament")');
		await page.waitForURL(/\/standings/);
	}

	test('20-player preseed: complete tournament with frozen court', async ({ page }) => {
		await login(page);
		const name = `Frozen5c-${Date.now()}`;
		testTournamentNames.push(name);

		const players = Array.from({ length: 20 }, (_, i) => `P${String(i + 1).padStart(2, '0')}`);
		const tid = await createTournament(page, name, players);

		// ---- Round 1: 5 courts, all active ----
		await page.goto(`/tournament/${tid}`);
		await page.waitForSelector('.court-card');
		const r1Links = await getCourtLinks(page, tid);
		expect(r1Links.length).toBe(5);

		// No frozen courts visible
		expect(
			await page
				.locator('.frozen-courts')
				.isVisible()
				.catch(() => false)
		).toBe(false);

		for (const link of r1Links) {
			await scoreCourt(page, link);
		}
		await closeRound(page, tid);

		// ---- Round 2: 5 courts, no courts frozen yet ----
		await page.goto(`/tournament/${tid}`);
		await page.waitForSelector('.court-card');
		await page.waitForTimeout(2000);
		const r2Links = await getCourtLinks(page, tid);
		expect(r2Links.length).toBe(5);

		expect(
			await page
				.locator('.frozen-courts')
				.isVisible()
				.catch(() => false)
		).toBe(false);

		for (const link of r2Links) {
			await scoreCourt(page, link);
		}
		await closeRound(page, tid);

		// ---- Round 3: court 5 frozen, 4 active courts ----
		await page.goto(`/tournament/${tid}`);
		await page.waitForTimeout(3000);
		await page.waitForSelector('.court-card');

		const frozenSection = page.locator('.frozen-courts');
		await expect(frozenSection).toBeVisible({ timeout: 10000 });

		const frozenBadge = page.locator('.frozen-badge');
		await expect(frozenBadge).toContainText('Court 5');

		const r3Links = await getCourtLinks(page, tid);
		expect(r3Links.length).toBe(4);

		for (const link of r3Links) {
			await scoreCourt(page, link);
		}
		await closeRound(page, tid);

		// ---- Round 4: still 4 active courts (final round) ----
		await page.goto(`/tournament/${tid}`);
		await page.waitForTimeout(3000);
		await page.waitForSelector('.court-card');

		await expect(page.locator('.frozen-courts')).toBeVisible();

		const r4Links = await getCourtLinks(page, tid);
		expect(r4Links.length).toBe(4);

		for (const link of r4Links) {
			await scoreCourt(page, link);
		}
		await finalize(page, tid);

		// ---- Verify standings page ----
		await page.goto(`/tournament/${tid}/standings`);
		await page.waitForTimeout(2000);

		// Settled badge visible for frozen court
		const settledBadge = page.locator('.settled-badge');
		await expect(settledBadge.first()).toBeVisible();
		await expect(settledBadge.first()).toContainText('Settled');

		// All 20 players in standings
		const rows = await page.locator('.standings-table tbody tr').count();
		expect(rows).toBe(20);

		// No players with "-" for all rounds (everyone played at least R1 and R2)
		const dashOnly = await page
			.locator('.standings-table tbody tr')
			.filter({
				hasText: /^—$/
			})
			.count();
		expect(dashOnly).toBe(0);
	});
});
