import { test, expect } from '@playwright/test';

/**
 * Integration tests for complete tournament workflows
 *
 * These tests verify end-to-end scenarios:
 * 1. Full tournament from creation to completion
 * 2. Player access via QR codes
 * 3. Score entry and real-time updates
 * 4. Tournament state transitions
 */

test.describe('Tournament Integration Tests', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/auth/login');
		await page.fill('input[type="email"]', 'test@example.com');
		await page.fill('input[type="password"]', 'password123');
		await page.click('button[type="submit"]');
		await page.waitForURL('/');
	});

	test('complete 2-round tournament with score entry', async ({ page }) => {
		// 1. Create tournament
		await page.click('text=+ New Tournament');
		await page.fill('input[name="name"]', 'Integration Test Tournament');
		await page.selectOption('select[name="numRounds"]', '2');
		await page.click('button[type="submit"]');

		// 2. Add 16 players
		await page.waitForURL(/\/tournament\/\d+\/players/);
		const players = [
			'Alice',
			'Bob',
			'Carol',
			'David',
			'Eve',
			'Frank',
			'Grace',
			'Henry',
			'Ivy',
			'Jack',
			'Kate',
			'Leo',
			'Mia',
			'Noah',
			'Olivia',
			'Paul'
		];
		await page.fill('textarea[name="names"]', players.join('\n'));
		await page.click('button:has-text("Add Players")');

		// 3. Start tournament
		await page.click('button:has-text("Start Tournament")');
		await page.waitForURL(/\/tournament\/\d+/);

		// 4. Verify tournament is active and shows 4 courts
		await page.waitForSelector('text=Round 1 of 2');
		const courtCards = await page.locator('.court-card').count();
		expect(courtCards).toBe(4);

		// 5. Complete all matches for Round 1
		const courtLinks = await page.locator('.qr-link a').all();

		for (let courtIdx = 0; courtIdx < 4; courtIdx++) {
			const courtUrl = await courtLinks[courtIdx].getAttribute('href');
			await page.goto(courtUrl || '');

			// Verify court page loads with QR code
			await page.waitForSelector('.qr-section img');
			await page.waitForSelector('text=Share Court Access');

			// Complete all 3 matches with realistic scores
			const scores = [
				{ a: 21, b: 19 },
				{ a: 25, b: 23 },
				{ a: 22, b: 20 }
			];

			for (let matchIdx = 0; matchIdx < 3; matchIdx++) {
				await page.fill('input[name="teamAScore"]', String(scores[matchIdx].a));
				await page.fill('input[name="teamBScore"]', String(scores[matchIdx].b));
				await page.click('button:has-text("Save Score")');

				// Wait for success message
				await page.waitForSelector('.success');

				if (matchIdx < 2) {
					await page.waitForTimeout(300);
					await page.reload();
				}
			}

			// Verify standings are calculated
			await page.waitForSelector('.standings tbody tr');
			const playerRows = await page.locator('.standings tbody tr').count();
			expect(playerRows).toBe(4);
		}

		// 6. Close Round 1
		await page.goto('/');
		await page.click('text=Integration Test Tournament');
		await page.waitForSelector('button:has-text("Close Round")');
		await page.click('button:has-text("Close Round")');
		await page.waitForTimeout(1000);

		// 7. Verify Round 2 started
		await page.waitForSelector('text=Round 2 of 2');

		// 8. Complete Round 2
		const round2Links = await page.locator('.qr-link a').all();

		for (const courtLink of round2Links) {
			const courtUrl = await courtLink.getAttribute('href');
			await page.goto(courtUrl || '');

			for (let i = 0; i < 3; i++) {
				await page.fill('input[name="teamAScore"]', '21');
				await page.fill('input[name="teamBScore"]', '19');
				await page.click('button:has-text("Save Score")');
				await page.waitForTimeout(300);
				if (i < 2) await page.reload();
			}
		}

		// 9. Close final round
		await page.goto('/');
		await page.click('text=Integration Test Tournament');
		await page.waitForSelector('button:has-text("Close Round")');
		await page.click('button:has-text("Close Round")');
		await page.waitForTimeout(1000);

		// 10. Verify tournament completed
		await page.goto('/');
		await page.waitForSelector('text=Integration Test Tournament');
		const statusBadge = await page.locator(
			'.tournament-card:has-text("Integration Test Tournament") .status.completed'
		);
		await expect(statusBadge).toBeVisible();
	});

	test('players can access court via direct URL without login', async ({ page, context }) => {
		// Create tournament as logged-in user
		await page.click('text=+ New Tournament');
		await page.fill('input[name="name"]', 'Public Access Test');
		await page.click('button[type="submit"]');

		await page.waitForURL(/\/tournament\/\d+\/players/);
		const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1}`);
		await page.fill('textarea[name="names"]', players.join('\n'));
		await page.click('button:has-text("Add Players")');
		await page.click('button:has-text("Start Tournament")');
		await page.waitForURL(/\/tournament\/\d+/);

		// Get court URL
		const courtLink = await page.locator('.qr-link a').first();
		const courtUrl = await courtLink.getAttribute('href');
		expect(courtUrl).toBeTruthy();

		// Open new browser context (not logged in)
		const publicContext = await context.browser()?.newContext();
		expect(publicContext).toBeTruthy();
		const publicPage = await publicContext!.newPage();

		// Access court page without authentication
		await publicPage.goto(courtUrl || '');

		// Should be able to view and enter scores
		await publicPage.waitForSelector('input[name="teamAScore"]');
		await publicPage.waitForSelector('input[name="teamBScore"]');
		await publicPage.waitForSelector('button:has-text("Save Score")');

		// Can enter scores
		await publicPage.fill('input[name="teamAScore"]', '21');
		await publicPage.fill('input[name="teamBScore"]', '19');
		await publicPage.click('button:has-text("Save Score")');

		// Should see success
		await publicPage.waitForSelector('.success');

		await publicContext!.close();
	});

	test('dashboard shows tournaments in correct sections', async ({ page }) => {
		// Create active tournament
		await page.click('text=+ New Tournament');
		await page.fill('input[name="name"]', 'Active Tournament');
		await page.click('button[type="submit"]');
		await page.waitForURL(/\/tournament\/\d+\/players/);
		const players1 = Array.from({ length: 16 }, (_, i) => `A${i + 1}`);
		await page.fill('textarea[name="names"]', players1.join('\n'));
		await page.click('button:has-text("Add Players")');
		await page.click('button:has-text("Start Tournament")');

		// Go back to dashboard
		await page.goto('/');

		// Create draft tournament
		await page.click('text=+ New Tournament');
		await page.fill('input[name="name"]', 'Draft Tournament');
		await page.click('button[type="submit"]');
		// Don't add players - leave it in draft

		// Go back to dashboard
		await page.goto('/');
		await page.waitForSelector('text=Active Tournament');
		await page.waitForSelector('text=Draft Tournament');

		// Verify sections
		const activeSection = await page
			.locator(
				'h2:has-text("Active Tournaments") + .tournament-list .tournament-card:has-text("Active Tournament")'
			)
			.count();
		expect(activeSection).toBe(1);
	});

	test('smart paste converts comma-separated names to lines', async ({ page }) => {
		await page.click('text=+ New Tournament');
		await page.fill('input[name="name"]', 'Paste Test Tournament');
		await page.click('button[type="submit"]');

		await page.waitForURL(/\/tournament\/\d+\/players/);

		// Test comma-separated paste
		const commaSeparated = 'Alice, Bob, Carol, David, Eve, Frank, Grace, Henry';
		await page.fill('textarea[name="names"]', commaSeparated);

		// Check that counter shows 8 names
		await page.waitForSelector('text=8 names entered');

		// Clear and test semicolon-separated
		await page.fill('textarea[name="names"]', '');
		const semicolonSeparated = 'Ivy; Jack; Kate; Leo; Mia; Noah; Olivia; Paul';
		await page.fill('textarea[name="names"]', semicolonSeparated);

		await page.waitForSelector('text=8 names entered');
	});
});
