import { test, expect } from '@playwright/test';

/**
 * Integration tests for complete tournament workflows
 *
 * These tests verify end-to-end scenarios:
 * 1. Full tournament from creation to completion
 * 2. Player access via QR codes
 * 3. Score entry and real-time updates
 * 4. Tournament state transitions
 * 5. Scoring modes (single set, best-of-3, custom)
 */

test.describe('Tournament Integration Tests', () => {
	const testTournamentNames: string[] = [];

	test.beforeEach(async ({ page }) => {
		// Try logging in first (most common case)
		await page.goto('/login');
		await page.fill('input[type="email"]', 'test@example.com');
		await page.fill('input[type="password"]', 'password123');
		await page.click('button[type="submit"]');

		try {
			await page.waitForURL('/', { timeout: 3000 });
		} catch {
			// Login failed, try signing up
			await page.goto('/signup');
			await page.fill('input[type="email"]', 'test@example.com');
			await page.fill('input[type="password"]', 'password123');
			await page.fill('input#confirmPassword', 'password123');
			await page.click('button[type="submit"]');
			await page.waitForURL('/');
		}
	});

	test.afterEach(async ({ page }) => {
		// Clean up test tournaments
		for (const tournamentName of testTournamentNames) {
			try {
				await page.goto('/');
				await page.waitForLoadState('networkidle');

				// Find and click on the tournament card to go to its detail page
				const tournamentCard = page
					.locator(`.tournament-card:has-text("${tournamentName}")`)
					.first();
				if (await tournamentCard.isVisible().catch(() => false)) {
					await tournamentCard.click();
					await page.waitForLoadState('networkidle');

					// Try to find and click a delete button if it exists
					const deleteButton = page.locator('button:has-text("Delete")');
					if (await deleteButton.isVisible().catch(() => false)) {
						await deleteButton.click();
						// Confirm deletion if there's a confirmation dialog
						const confirmButton = page.locator('button:has-text("Confirm")');
						if (await confirmButton.isVisible().catch(() => false)) {
							await confirmButton.click();
						}
					}
				}
			} catch {
				// Ignore cleanup errors
			}
		}
		// Clear the array for next test
		testTournamentNames.length = 0;
	});

	test('complete 2-round tournament with score entry', async ({ page }) => {
		// Generate unique tournament name
		const tournamentName = `Integration Test Tournament ${Date.now()}`;
		testTournamentNames.push(tournamentName);

		// 1. Create tournament with players
		await page.click('text=+ New Tournament');
		await page.fill('input[name="name"]', tournamentName);
		await page.fill('input[name="numRounds"]', '2');
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
		await page.click('button[type="submit"]');

		// 2. Start tournament
		await page.waitForURL(/\/tournament\/\d+/);
		await page.waitForSelector('button:has-text("Start Tournament")', { timeout: 5000 });
		await page.click('button:has-text("Start Tournament")');
		await page.waitForURL(/\/tournament\/\d+/);

		// 4. Verify tournament is active and shows 4 courts
		await page.waitForSelector('text=Round 1 of 2');
		const courtCards = await page.locator('.court-card').count();
		expect(courtCards).toBe(4);

		// 5. Complete all matches for Round 1
		// Get all court URLs first
		const courtLinksSel = await page.locator('.qr-link a').all();
		const courtLinks: string[] = [];
		for (const cl of courtLinksSel) {
			const url = await cl.getAttribute('href');
			if (url) courtLinks.push(url);
		}
		expect(courtLinks.length).toBe(4);

		for (let courtIdx = 0; courtIdx < 4; courtIdx++) {
			await page.goto(courtLinks[courtIdx]);

			// Verify court page loads with QR code
			await page.waitForSelector('.qr-section img');
			await page.waitForSelector('text=Share Court Access');

			// Get all match IDs on this court
			await page.waitForSelector('[data-testid^="match-form-"]');
			const matchForms = await page.locator('[data-testid^="match-form-"]').all();
			const matchIds = await Promise.all(
				matchForms.map(async (form) => {
					const testId = await form.getAttribute('data-testid');
					return testId?.replace('match-form-', '');
				})
			);
			expect(matchIds.length).toBe(3);

			// Complete all 3 matches with realistic scores
			const scores = [
				{ a: 21, b: 19 },
				{ a: 25, b: 23 },
				{ a: 22, b: 20 }
			];

			for (let matchIdx = 0; matchIdx < 3; matchIdx++) {
				await page.fill(
					`[data-testid="team-a-score-${matchIds[matchIdx]}"]`,
					String(scores[matchIdx].a)
				);
				await page.fill(
					`[data-testid="team-b-score-${matchIds[matchIdx]}"]`,
					String(scores[matchIdx].b)
				);
				await page.click(`[data-testid="save-score-${matchIds[matchIdx]}"]`);

				// Wait for success message
				await page.waitForSelector('.saved');
			}
			await page.waitForLoadState('networkidle');

			// Verify standings are calculated
			await page.waitForSelector('.standings tbody tr');
			const playerRows = await page.locator('.standings tbody tr').count();
			expect(playerRows).toBe(4);
		}

		// 6. Close Round 1
		await page.goto('/');
		await page.click(`text=${tournamentName}`);
		await page.waitForSelector('button:has-text("Close Round")');
		await page.click('button:has-text("Close Round")');
		await page.waitForTimeout(1000);

		// 7. Verify Round 2 started
		await page.waitForSelector('text=Round 2 of 2');

		// 8. Complete Round 2
		// Get all court URLs first
		const round2LinksSel = await page.locator('.qr-link a').all();
		const round2Links: string[] = [];
		for (const cl of round2LinksSel) {
			const url = await cl.getAttribute('href');
			if (url) round2Links.push(url);
		}
		expect(round2Links.length).toBe(4);

		for (const courtUrl of round2Links) {
			await page.goto(courtUrl);

			// Get all match IDs on this court
			await page.waitForSelector('[data-testid^="match-form-"]');
			const matchForms = await page.locator('[data-testid^="match-form-"]').all();
			const matchIds = await Promise.all(
				matchForms.map(async (form) => {
					const testId = await form.getAttribute('data-testid');
					return testId?.replace('match-form-', '');
				})
			);
			expect(matchIds.length).toBe(3);

			for (let i = 0; i < 3; i++) {
				await page.fill(`[data-testid="team-a-score-${matchIds[i]}"]`, '21');
				await page.fill(`[data-testid="team-b-score-${matchIds[i]}"]`, '19');
				await page.click(`[data-testid="save-score-${matchIds[i]}"]`);
				// Wait for save to complete
				await page.waitForSelector('.saved');
			}
		}

		// 9. Close final round
		await page.goto('/');
		await page.click(`text=${tournamentName}`);
		await page.waitForSelector('button:has-text("Finalize Tournament")');
		await page.click('button:has-text("Finalize Tournament")');
		await page.waitForTimeout(1000);

		// 10. Verify tournament completed
		await page.goto('/');
		await page.waitForSelector(`text=${tournamentName}`);
		const statusBadge = page
			.locator(`.tournament-card:has-text("${tournamentName}") .status.completed`)
			.first();
		await expect(statusBadge).toBeVisible();
	});

	test('players can access court via direct URL without login', async ({ page, context }) => {
		// Generate unique tournament name
		const tournamentName = `Public Access Test ${Date.now()}`;
		testTournamentNames.push(tournamentName);

		// Create tournament with players
		await page.click('text=+ New Tournament');
		await page.fill('input[name="name"]', tournamentName);
		const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1}`);
		await page.fill('textarea[name="names"]', players.join('\n'));
		await page.click('button[type="submit"]');

		await page.waitForURL(/\/tournament\/\d+/);
		await page.waitForSelector('button:has-text("Start Tournament")', { timeout: 5000 });
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

		// Get all match IDs on this court
		await publicPage.waitForSelector('[data-testid^="match-form-"]');
		const matchForms = await publicPage.locator('[data-testid^="match-form-"]').all();
		const matchIds = await Promise.all(
			matchForms.map(async (form) => {
				const testId = await form.getAttribute('data-testid');
				return testId?.replace('match-form-', '');
			})
		);
		expect(matchIds.length).toBeGreaterThan(0);

		// Should be able to view and enter scores
		await publicPage.waitForSelector(`[data-testid="team-a-score-${matchIds[0]}"]`);
		await publicPage.waitForSelector(`[data-testid="team-b-score-${matchIds[0]}"]`);
		await publicPage.waitForSelector(`[data-testid="save-score-${matchIds[0]}"]`);

		// Can enter scores
		await publicPage.fill(`[data-testid="team-a-score-${matchIds[0]}"]`, '21');
		await publicPage.fill(`[data-testid="team-b-score-${matchIds[0]}"]`, '19');
		await publicPage.click(`[data-testid="save-score-${matchIds[0]}"]`);

		// Should see success
		await publicPage.waitForSelector('.saved');

		await publicContext!.close();
	});

	test('dashboard shows tournaments in correct sections', async ({ page }) => {
		// Generate unique tournament names
		const activeTournamentName = `Active Tournament ${Date.now()}`;
		const draftTournamentName = `Draft Tournament ${Date.now()}`;
		testTournamentNames.push(activeTournamentName, draftTournamentName);

		// Create active tournament with players
		await page.click('text=+ New Tournament');
		await page.fill('input[name="name"]', activeTournamentName);
		const players1 = Array.from({ length: 16 }, (_, i) => `A${i + 1}`);
		await page.fill('textarea[name="names"]', players1.join('\n'));
		await page.click('button[type="submit"]');

		await page.waitForURL(/\/tournament\/\d+/);
		await page.waitForSelector('button:has-text("Start Tournament")', { timeout: 5000 });
		await page.click('button:has-text("Start Tournament")');

		// Go back to dashboard
		await page.goto('/');

		// Create draft tournament (no players added)
		await page.click('text=+ New Tournament');
		await page.fill('input[name="name"]', draftTournamentName);
		// Enter minimum players so form can submit, but don't start it
		const players2 = Array.from({ length: 8 }, (_, i) => `D${i + 1}`);
		await page.fill('textarea[name="names"]', players2.join('\n'));
		await page.click('button[type="submit"]');
		// Don't click "Start Tournament" - leave it in draft

		// Go back to dashboard
		await page.goto('/');
		await page.waitForSelector(`text=${activeTournamentName}`);
		await page.waitForSelector(`text=${draftTournamentName}`);

		// Verify sections
		const activeSection = await page
			.locator(
				`h2:has-text("Active Tournaments") + .tournament-list .tournament-card:has-text("${activeTournamentName}")`
			)
			.count();
		expect(activeSection).toBe(1);

		// Verify draft tournament appears in draft section
		const draftSection = await page
			.locator(
				`h2:has-text("Draft Tournaments") + .tournament-list .tournament-card:has-text("${draftTournamentName}")`
			)
			.count();
		expect(draftSection).toBe(1);
	});

	test('smart paste converts comma-separated names to lines', async ({ page, context }) => {
		// Grant clipboard permissions
		await context.grantPermissions(['clipboard-read', 'clipboard-write']);

		// Generate unique tournament name
		const tournamentName = `Paste Test Tournament ${Date.now()}`;
		testTournamentNames.push(tournamentName);

		await page.click('text=+ New Tournament');
		await page.fill('input[name="name"]', tournamentName);

		// Test comma-separated paste
		const commaSeparated = 'Alice, Bob, Carol, David, Eve, Frank, Grace, Henry';
		await page.evaluate((text) => navigator.clipboard.writeText(text), commaSeparated);
		await page.locator('textarea[name="names"]').focus();
		await page.keyboard.press('ControlOrMeta+V');

		// Check that counter shows 8 names
		await page.waitForSelector('text=8 names entered');

		// Clear and test semicolon-separated
		await page.fill('textarea[name="names"]', '');
		const semicolonSeparated = 'Ivy; Jack; Kate; Leo; Mia; Noah; Olivia; Paul';
		await page.evaluate((text) => navigator.clipboard.writeText(text), semicolonSeparated);
		await page.locator('textarea[name="names"]').focus();
		await page.keyboard.press('ControlOrMeta+V');

		await page.waitForSelector('text=8 names entered');
	});

	test.describe('Scoring Modes', () => {
		test('best-of-3 scoring mode is selectable', async ({ page }) => {
			await page.click('text=+ New Tournament');

			// Best of 3 radio should be visible
			await expect(page.locator('input[value="best-of-3"]')).toBeVisible();
			await expect(page.locator('label:has-text("Best of 3")')).toBeVisible();
		});

		test('custom scoring mode reveals advanced options', async ({ page }) => {
			await page.click('text=+ New Tournament');

			// Select custom scoring
			await page.click('input[value="custom"]');

			// Advanced section should be visible
			await expect(page.locator('.advanced-section')).toBeVisible();

			// Should show match format select
			await expect(page.locator('select[name="setsToWin"]')).toBeVisible();

			// Should show win by select
			await expect(page.locator('select[name="winBy"]')).toBeVisible();

			// Should show points to win input
			await expect(page.locator('input[name="pointsToWin"]')).toBeVisible();
		});

		test('custom best-of-3 shows deciding set points', async ({ page }) => {
			await page.click('text=+ New Tournament');
			await page.click('input[value="custom"]');

			// Change to best-of-3
			await page.selectOption('select[name="setsToWin"]', '2');

			// Should show deciding set points input
			await expect(page.locator('input[name="decidingSetPoints"]')).toBeVisible();
		});

		test('duration estimate updates based on scoring mode', async ({ page }) => {
			await page.click('text=+ New Tournament');

			// Add 16 players to trigger duration estimate
			const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1}`);
			await page.fill('textarea[name="names"]', players.join('\n'));

			// Duration estimate should appear
			await expect(page.locator('.duration-estimate')).toBeVisible();
			await expect(page.locator('.duration-total')).toBeVisible();
		});

		test('5p/6p courts use 15-point scoring by default', async ({ page }) => {
			const tournamentName = `5pScoring ${Date.now()}`;
			testTournamentNames.push(tournamentName);

			await page.click('text=+ New Tournament');
			await page.fill('input[name="name"]', tournamentName);
			await page.fill('input[name="numRounds"]', '1');

			// Enter 21 players on the create page
			const players = Array.from({ length: 21 }, (_, i) => `Player${i + 1}`);
			await page.fill('textarea[name="names"]', players.join('\n'));

			await page.click('button[type="submit"]');

			await page.waitForURL(/\/tournament\/\d+/);
			await page.waitForSelector('button:has-text("Start Tournament")', { timeout: 5000 });
			await page.click('button:has-text("Start Tournament")');
			await page.waitForURL(/\/tournament\/\d+/);

			// Navigate to 5p court
			const courtLink = page.locator('.qr-link a').last();
			const courtUrl = await courtLink.getAttribute('href');
			await page.goto(courtUrl || '');

			// Should show 15-point target hint
			await expect(page.locator('text=15')).toBeVisible();
		});
	});

	test.describe('Virtual Courts (Physical < Virtual)', () => {
		test('shows virtual court info when physical courts < virtual courts', async ({ page }) => {
			await page.click('text=+ New Tournament');

			// Add 32 players (8 virtual courts)
			const players = Array.from({ length: 32 }, (_, i) => `Player${i + 1}`);
			await page.fill('textarea[name="names"]', players.join('\n'));

			// Set physical courts to 4 (less than 8 virtual)
			await page.locator('input[name="physicalCourts"]').fill('4');

			// Should show virtual court info
			await expect(page.locator('.info:has-text("Virtual courts")')).toBeVisible();
			await expect(page.locator('.info:has-text("batch shifts")')).toBeVisible();
		});

		test('physical courts slider ranges from 1 to 16', async ({ page }) => {
			await page.click('text=+ New Tournament');

			const slider = page.locator('input[name="physicalCourts"]');
			await expect(slider).toHaveAttribute('min', '1');
			await expect(slider).toHaveAttribute('max', '16');
		});

		test('duration estimate accounts for physical court shifts', async ({ page }) => {
			await page.click('text=+ New Tournament');

			// Add 32 players (8 virtual courts)
			const players = Array.from({ length: 32 }, (_, i) => `Player${i + 1}`);
			await page.fill('textarea[name="names"]', players.join('\n'));

			// With 4 physical courts, should show 2 shifts per round
			await page.locator('input[name="physicalCourts"]').fill('4');

			// Duration estimate should reflect shifts
			await expect(page.locator('.duration-estimate')).toBeVisible();
		});
	});
});
