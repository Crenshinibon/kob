import { test, expect } from '@playwright/test';

test.describe('Preseed Tournament', () => {
	test.setTimeout(180000);

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
		// Restore clean dashboard state for the next test
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

		// Dismiss cookie notice if present
		const dismissBtn = page.locator('button:has-text("OK")');
		if (await dismissBtn.isVisible().catch(() => false)) {
			await dismissBtn.click();
			await page.waitForTimeout(300);
		}
		// Ensure we're on a clean dashboard before the test starts
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

	async function getCourtPlayers(
		page: import('@playwright/test').Page,
		url: string
	): Promise<string[]> {
		await page.goto(url);
		await page.waitForSelector('.standings tbody tr');
		const rows = await page.locator('.standings tbody tr').all();
		const names: string[] = [];
		for (const row of rows) {
			const name = await row.locator('td:nth-child(2)').textContent();
			if (name) names.push(name);
		}
		return names;
	}

	async function getRoundPlayers(
		page: import('@playwright/test').Page,
		tid: string
	): Promise<string[][]> {
		const links = await getCourtLinks(page, tid);
		const courts: string[][] = [];
		for (const link of links) {
			courts.push(await getCourtPlayers(page, link));
		}
		return courts;
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
		await page.waitForTimeout(2000);
		await page.waitForSelector('button:has-text("Close Round & Advance")');
		await page.click('button:has-text("Close Round & Advance")');
		// Wait for round to actually close before returning
		await page.waitForTimeout(3000);
		await page.waitForSelector('.qr-link a');
	}

	async function finalize(page: import('@playwright/test').Page, tid: string): Promise<void> {
		await page.goto(`/tournament/${tid}`);
		await page.waitForTimeout(2000);
		await page.waitForSelector('button:has-text("Finalize Tournament")');
		await page.click('button:has-text("Finalize Tournament")');
		await page.waitForURL(/\/standings/);
	}

	test('16-player preseed: verify snake seeding, origin mixing, and standings', async ({
		page
	}) => {
		await login(page);
		const name = `PreseedFlow-${Date.now()}`;
		testTournamentNames.push(name);

		const players = [
			'Alice 1250',
			'Bob 1100',
			'Carol 950',
			'Dave 900',
			'Eve 850',
			'Frank 800',
			'Grace 750',
			'Hank 700',
			'Ivy 650',
			'Jack 600',
			'Kate 550',
			'Leo 500',
			'Mia 450',
			'Nick 400',
			'Oscar 350',
			'Paul 300'
		];

		const tid = await createTournament(page, name, players);

		// R1: verify snake seeding
		const r1 = await getRoundPlayers(page, tid);
		expect(r1.length).toBe(4);
		r1.forEach((c) => expect(c.length).toBe(4));
		expect(new Set(r1.flat()).size).toBe(16);
		expect(r1[0]).toEqual(['Alice', 'Hank', 'Ivy', 'Paul']);
		expect(r1[1]).toEqual(['Bob', 'Grace', 'Jack', 'Oscar']);
		expect(r1[2]).toEqual(['Carol', 'Frank', 'Kate', 'Nick']);
		expect(r1[3]).toEqual(['Dave', 'Eve', 'Leo', 'Mia']);

		// Score all courts (21-19 for clear 1st/2nd/3rd/4th tiers)
		const links = await getCourtLinks(page, tid);
		for (const link of links) {
			await scoreCourt(page, link);
		}

		// Close R1 → R2
		await closeRound(page, tid);
		await page.waitForSelector('text=Round 2 of 3');

		// R2: verify preseed structure
		const r2 = await getRoundPlayers(page, tid);
		expect(r2.length).toBe(4);
		r2.forEach((c) => expect(c.length).toBe(4));
		expect(new Set(r2.flat()).size).toBe(16);

		// Top seeds in winner bracket
		const w2 = [...r2[0], ...r2[1]];
		expect(w2).toContain('Alice');
		expect(w2).toContain('Bob');

		// Origin mixing: no pair from same R1 court on same R2 court
		const pairs = [
			['Alice', 'Hank'],
			['Bob', 'Grace'],
			['Carol', 'Frank'],
			['Dave', 'Eve']
		];
		for (const [a, b] of pairs) {
			for (const c of r2) {
				expect(c.includes(a) && c.includes(b)).toBe(false);
			}
		}

		// Score R2
		const r2links = await getCourtLinks(page, tid);
		for (const link of r2links) {
			await scoreCourt(page, link);
		}

		// Close R2 → R3
		await closeRound(page, tid);
		await page.waitForSelector('text=Round 3 of 3');

		// R3: verify final round structure
		const r3 = await getRoundPlayers(page, tid);
		expect(r3.length).toBe(4);
		r3.forEach((c) => expect(c.length).toBe(4));
		expect(new Set(r3.flat()).size).toBe(16);

		// Alice should stay in winner bracket
		const w3 = [...r3[0], ...r3[1]];
		expect(w3).toContain('Alice');

		// Score R3 and finalize
		const r3links = await getCourtLinks(page, tid);
		for (const link of r3links) {
			await scoreCourt(page, link);
		}
		await finalize(page, tid);
	});

	test('8-player preseed tournament', async ({ page }) => {
		await login(page);
		const name = `Preseed8p-${Date.now()}`;
		testTournamentNames.push(name);

		const players = [
			'Alice 1250',
			'Bob 1100',
			'Carol 950',
			'Dave 900',
			'Eve 850',
			'Frank 800',
			'Grace 750',
			'Hank 700'
		];

		const tid = await createTournament(page, name, players);

		// R1: verify snake seeding (2 courts × 4 players)
		const r1 = await getRoundPlayers(page, tid);
		expect(r1.length).toBe(2);
		r1.forEach((c) => expect(c.length).toBe(4));
		expect(new Set(r1.flat()).size).toBe(8);
		expect(r1[0]).toEqual(['Alice', 'Dave', 'Eve', 'Hank']);
		expect(r1[1]).toEqual(['Bob', 'Carol', 'Frank', 'Grace']);

		// Score R1
		const r1Links = await getCourtLinks(page, tid);
		for (const link of r1Links) {
			await scoreCourt(page, link);
		}

		// Close R1 → R2 (final round)
		await closeRound(page, tid);

		// R2: verify structure
		const r2 = await getRoundPlayers(page, tid);
		expect(r2.length).toBe(2);
		r2.forEach((c) => expect(c.length).toBe(4));
		expect(new Set(r2.flat()).size).toBe(8);

		// Score R2 and finalize
		const r2links = await getCourtLinks(page, tid);
		for (const link of r2links) {
			await scoreCourt(page, link);
		}
		await finalize(page, tid);
	});
});
