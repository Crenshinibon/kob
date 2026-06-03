import { test, expect, type Page } from '@playwright/test';

async function enterSingleSet(
	page: Page,
	matchGroupIndex: number,
	scoreA: number,
	scoreB: number
): Promise<void> {
	const matchGroup = page.locator('.match-run').nth(matchGroupIndex);
	// Pick the first unscores form — it has visible score inputs, not "Saved" text
	const form = matchGroup
		.locator('[data-testid^="set-form-"]')
		.filter({ has: page.locator('[data-testid^="team-a-score-"]') })
		.first();
	const testId = await form.getAttribute('data-testid');
	const matchId = testId?.replace('set-form-', '');
	if (!matchId) throw new Error('Could not find unscores set form');

	await page.fill(`[data-testid="team-a-score-${matchId}"]`, String(scoreA));
	await page.fill(`[data-testid="team-b-score-${matchId}"]`, String(scoreB));
	await page.click(`[data-testid="save-score-${matchId}"]`);
	await expect(matchGroup.locator('.saved').first()).toBeVisible({ timeout: 15000 });
	await page.waitForTimeout(500);
}

async function fillCourtBestOf3(page: Page): Promise<void> {
	// Wait for score forms
	await page.waitForSelector('[data-testid^="set-form-"]', { timeout: 15000 });

	// Match 1: 2-0 (team A wins both sets, no deciding set needed)
	await enterSingleSet(page, 0, 21, 19);
	await enterSingleSet(page, 0, 21, 17);

	// Match 2: 2-1 (full 3 sets, team B wins)
	await enterSingleSet(page, 1, 18, 21);
	await enterSingleSet(page, 1, 21, 19);
	await enterSingleSet(page, 1, 13, 15);

	// Match 3: 2-0 (team B wins both sets, no deciding set needed)
	await enterSingleSet(page, 2, 17, 21);
	await enterSingleSet(page, 2, 19, 21);
}

test.describe('Best-of-3 Round Transition', () => {
	const testTournamentNames: string[] = [];

	test.beforeEach(async ({ page }) => {
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
		if (await dismissBtn.isVisible().catch(() => false)) {
			await dismissBtn.click();
			await page.waitForTimeout(300);
		}
	});

	test.afterEach(async ({ page }) => {
		for (const tournamentName of testTournamentNames) {
			try {
				await page.goto('/');
				const tournamentCard = page
					.locator(`.tournament-card:has-text("${tournamentName}")`)
					.first();
				if (await tournamentCard.isVisible().catch(() => false)) {
					await tournamentCard.click();
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
				// ignore
			}
		}
		testTournamentNames.length = 0;
	});

	test('round closes when best-of-3 matches end 2-0 (no deciding set)', async ({ page }) => {
		test.slow();
		test.setTimeout(180000);
		const tournamentName = `Bo3Complete ${Date.now()}`;
		testTournamentNames.push(tournamentName);

		// Create best-of-3 tournament with 16 players, 2 rounds
		await page.waitForSelector('text=+ New Tournament');
		await page.click('text=+ New Tournament');
		await page.fill('input[name="name"]', tournamentName);
		await page.click('input[value="best-of-3"]');
		await page.fill('#numRounds', '2');

		const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1}`);
		await page.fill('textarea[name="names"]', players.join('\n'));
		await page.click('button[type="submit"]');

		await page.waitForURL(/\/tournament\/\d+/);
		const tournamentUrl = page.url();

		// Score round 1 — all 4 courts
		for (let courtIdx = 0; courtIdx < 4; courtIdx++) {
			await page.goto(tournamentUrl);
			await page.waitForSelector('.qr-link a', { timeout: 15000 });
			const courtLinks = page.locator('.qr-link a');
			const count = await courtLinks.count();
			const link = courtLinks.nth(Math.min(courtIdx, count - 1));
			const courtUrl = await link.getAttribute('href');
			expect(courtUrl).toBeTruthy();
			await page.goto(courtUrl!);
			await page.waitForURL(/\/court\//, { timeout: 10000 });
			await fillCourtBestOf3(page);
		}

		// Go back to tournament and close round
		await page.goto(tournamentUrl);
		await page.waitForURL(/\/tournament\/\d+/);
		await page.waitForTimeout(5000); // Let live query poll

		// Wait for either close button or check if waiting button is showing
		const closeBtn = page.locator('button:has-text("Close Round")').first();
		await expect(closeBtn).toBeVisible({ timeout: 25000 });

		await closeBtn.click();

		// Close round returns success inline, live query reconnects
		await page.waitForTimeout(5000);
		// Navigate away and back to force refresh
		await page.goto(tournamentUrl);
		await expect(page.locator('.court-card').first()).toBeVisible({ timeout: 10000 });
		await expect(page.locator('text=Round 2 of 2')).toBeVisible({ timeout: 10000 });

		// Score round 2
		for (let courtIdx = 0; courtIdx < 4; courtIdx++) {
			await page.goto(tournamentUrl);
			await page.waitForSelector('.qr-link a', { timeout: 15000 });
			const courtLinks = page.locator('.qr-link a');
			const count = await courtLinks.count();
			const link = courtLinks.nth(Math.min(courtIdx, count - 1));
			const courtUrl = await link.getAttribute('href');
			expect(courtUrl).toBeTruthy();
			await page.goto(courtUrl!);
			await page.waitForURL(/\/court\//, { timeout: 10000 });
			await fillCourtBestOf3(page);
		}

		// Finalize tournament
		await page.goto(tournamentUrl);
		await page.waitForURL(/\/tournament\/\d+/);
		await page.waitForTimeout(5000);

		const finalizeBtn = page.locator('button:has-text("Finalize")').first();
		await expect(finalizeBtn).toBeVisible({ timeout: 25000 });

		await finalizeBtn.click();
		// Finalize redirects to standings page
		await page.waitForURL(/\/standings/, { timeout: 15000 });

		// Verify standings page loads
		await expect(page.locator('text=Final Standings').first()).toBeVisible({ timeout: 10000 });
	});
});
