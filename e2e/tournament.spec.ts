import { test, expect, type Page } from '@playwright/test';

async function findPlayerCourt(page: Page, playerName: string): Promise<number> {
	const courtCards = await page.locator('.court-card').all();
	for (let i = 0; i < courtCards.length; i++) {
		const text = await courtCards[i].textContent();
		if (text && new RegExp(`\\b${playerName}\\b`).test(text)) return i + 1;
	}
	throw new Error(`Player ${playerName} not found on any court`);
}

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

		// Dismiss cookie notice if present and persist consent
		const dismissBtn = page.locator('button:has-text("OK")');
		if (await dismissBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
			await dismissBtn.click();
			await dismissBtn.waitFor({ state: 'hidden', timeout: 2000 }).catch(() => {});
		}
		await page.evaluate(() => {
			localStorage.setItem('cookie-notice-dismissed', 'true');
		});
	});

	test.afterEach(async ({ page }) => {
		// Clean up test tournaments
		for (const tournamentName of testTournamentNames) {
			try {
				await page.goto('/');

				// Find and click on the tournament card to go to its detail page
				const tournamentCard = page
					.locator(`.tournament-card:has-text("${tournamentName}")`)
					.first();
				if (await tournamentCard.isVisible().catch(() => false)) {
					await tournamentCard.click();

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
		test.slow(); // This is a long integration test (4 courts × 6 matches + round closures)
		const tournamentName = `Integration Test Tournament ${Date.now()}`;
		testTournamentNames.push(tournamentName);

		// 1. Create tournament with players
		await page.click('text=+ New Tournament');
		await page.fill('input[name="name"]', tournamentName);
		await page.fill('input[name="n:numRounds"]', '2');
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

		// Tournament is already started, verify it shows courts
		await page.waitForURL(/\/tournament\/\d+/);
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

				await page.waitForSelector(`[data-testid="saved-${matchIds[matchIdx]}"]`);
			}

			// Verify standings are calculated
			await page.waitForSelector('.standings tbody tr');
			const playerRows = await page.locator('.standings tbody tr').count();
			expect(playerRows).toBe(4);
		}

		// 6. Close Round 1
		await page.goto('/');
		await page.click(`text=${tournamentName}`);
		await page.waitForURL(/\/tournament\/\d+/);
		await page.waitForSelector('button:has-text("Close Round & Advance")', { timeout: 20000 });
		await page.click('button:has-text("Close Round & Advance")');

		// 7. Verify Round 2 started - live query updates automatically
		await page.waitForSelector('text=Round 2 of 2');
		// Wait for court cards with QR links to render
		await page.waitForSelector('.qr-link a', { timeout: 10000 });

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
				await page.waitForSelector(`[data-testid="saved-${matchIds[i]}"]`);
			}
		}

		// 9. Close final round
		await page.goto('/');
		await page.click(`text=${tournamentName}`);
		await page.waitForSelector('button:has-text("Finalize Tournament")', { timeout: 20000 });
		await page.click('button:has-text("Finalize Tournament")');

		// Wait for the redirect to standings (confirms form action completed)
		await page.waitForURL(/\/tournament\/\d+\/standings/);

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
		await publicPage.waitForSelector(`[data-testid="saved-${matchIds[0]}"]`);

		await publicContext!.close();
	});

	test('dashboard shows active tournaments', async ({ page }) => {
		// Generate unique tournament name
		const tournamentName = `Active Dashboard Test ${Date.now()}`;
		testTournamentNames.push(tournamentName);

		// Create tournament with players
		await page.click('text=+ New Tournament');
		await page.fill('input[name="name"]', tournamentName);
		const players = Array.from({ length: 16 }, (_, i) => `A${i + 1}`);
		await page.fill('textarea[name="names"]', players.join('\n'));
		await page.click('button[type="submit"]');

		await page.waitForURL(/\/tournament\/\d+/);

		// Go back to dashboard
		await page.goto('/');
		await page.waitForSelector(`text=${tournamentName}`);

		// Verify tournament appears in active section
		const activeSection = await page
			.locator(
				`h2:has-text("Active Tournaments") + .tournament-list .tournament-card:has-text("${tournamentName}")`
			)
			.count();
		expect(activeSection).toBe(1);
	});

	test('smart paste converts comma-separated names to lines', async ({ page, context }) => {
		// Grant clipboard permissions
		await context.grantPermissions(['clipboard-read', 'clipboard-write']);

		// Generate unique tournament name
		const tournamentName = `Paste Test Tournament ${Date.now()}`;
		testTournamentNames.push(tournamentName);

		await page.click('text=+ New Tournament');
		await page.waitForSelector('input[name="name"]');
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
			await expect(page.locator('input[name="scoringMode"][value="best-of-3"]')).toBeVisible();
			await expect(page.locator('label:has-text("Best of 3")').first()).toBeVisible();
		});

		test('custom scoring mode reveals advanced options', async ({ page }) => {
			await page.click('text=+ New Tournament');

			// Select custom scoring
			await page.click('input[value="custom"]');

			// Advanced section should be visible
			await expect(page.locator('.advanced-section')).toBeVisible();

			// Should show match format radio buttons
			await expect(page.locator('input[name="n:setsToWin"][value="1"]')).toBeVisible();
			await expect(page.locator('input[name="n:setsToWin"][value="2"]')).toBeVisible();

			// Should show win by radio buttons
			await expect(page.locator('input[name="n:winBy"][value="1"]')).toBeVisible();
			await expect(page.locator('input[name="n:winBy"][value="2"]')).toBeVisible();

			// Should show points to win input
			await expect(page.locator('input[name="n:pointsToWin"]')).toBeVisible();
		});

		test('custom best-of-3 shows deciding set points', async ({ page }) => {
			await page.click('text=+ New Tournament');
			await page.click('input[value="custom"]');

			// Change to best-of-3 via radio button
			await page.click('input[name="n:setsToWin"][value="2"]');

			// Should show deciding set points input
			await expect(page.locator('input[name="n:decidingSetPoints"]')).toBeVisible();
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
			await page.fill('input[name="n:numRounds"]', '1');

			// Enter 21 players on the create page
			const players = Array.from({ length: 21 }, (_, i) => `Player${i + 1}`);
			await page.fill('textarea[name="names"]', players.join('\n'));

			await page.click('button[type="submit"]');

			await page.waitForURL(/\/tournament\/\d+/);

			// Navigate to 5p court
			const courtLink = page.locator('.qr-link a').last();
			const courtUrl = await courtLink.getAttribute('href');
			await page.goto(courtUrl || '');

			// Should show 15-point target hint in format explanation
			await expect(page.locator('text=to 15')).toBeVisible();
		});

		test('best-of-3 tournament enforces per-set score entry', async ({ page }) => {
			const tournamentName = `Bo3Score ${Date.now()}`;
			testTournamentNames.push(tournamentName);

			await page.waitForSelector('text=+ New Tournament');
			await page.click('text=+ New Tournament');
			await page.fill('input[name="name"]', tournamentName);

			// Select best-of-3
			await page.click('input[value="best-of-3"]');

			const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1}`);
			await page.fill('textarea[name="names"]', players.join('\n'));
			await page.click('button[type="submit"]');

			await page.waitForURL(/\/tournament\/\d+/);
			await page.waitForSelector('.qr-link a');

			// Go to first court
			const courtLink = page.locator('.qr-link a').first();
			const courtUrl = await courtLink.getAttribute('href');
			expect(courtUrl).toBeTruthy();
			expect(courtUrl).toContain('/court/');
			await page.goto(courtUrl!);
			await page.waitForURL(/\/court\//, { timeout: 10000 });
			await page.waitForSelector('[data-testid^="set-form-"]', { timeout: 15000 });

			// Should show sets UI with "Set 1" and "Set 2"
			const setTexts = await page.locator('.set-card h4').allTextContents();
			expect(setTexts.length).toBeGreaterThanOrEqual(2);
			expect(setTexts[0]).toContain('Set 1');
			expect(setTexts[1]).toContain('Set 2');

			// Set 3 should NOT be visible initially (no results yet)
			await expect(page.locator('h4:has-text("Set 3")')).not.toBeVisible();

			// Get the first match group's set forms
			const firstMatchGroup = page.locator('.match-run').first();
			const set1Form = firstMatchGroup.locator('[data-testid^="set-form-"]').first();
			const set1TestId = await set1Form.getAttribute('data-testid');
			const set1MatchId = set1TestId?.replace('set-form-', '');

			// Enter scores for Set 1 — below minimum 21 should fail
			await page.fill(`[data-testid="team-a-score-${set1MatchId}"]`, '19');
			await page.fill(`[data-testid="team-b-score-${set1MatchId}"]`, '17');
			await page.click(`[data-testid="save-score-${set1MatchId}"]`);

			// Should show error about minimum 21 points
			await expect(page.locator('.error')).toContainText('21');

			// Enter valid set 1 scores
			await page.fill(`[data-testid="team-a-score-${set1MatchId}"]`, '21');
			await page.fill(`[data-testid="team-b-score-${set1MatchId}"]`, '19');
			await page.click(`[data-testid="save-score-${set1MatchId}"]`);

			// Wait for save and page data refresh
			await page.waitForLoadState('networkidle');
			await page.waitForTimeout(1000);

			// Set 3 still should NOT be visible (only one set completed)
			await expect(page.locator('h4:has-text("Set 3")')).not.toBeVisible();

			// Enter set 2 scores within the SAME match group (team B wins to split 1-1)
			const set2Form = firstMatchGroup.locator('[data-testid^="set-form-"]').first();
			const set2TestId = await set2Form.getAttribute('data-testid');
			const set2MatchId = set2TestId?.replace('set-form-', '');

			await page.fill(`[data-testid="team-a-score-${set2MatchId}"]`, '19');
			await page.fill(`[data-testid="team-b-score-${set2MatchId}"]`, '21');
			await page.click(`[data-testid="save-score-${set2MatchId}"]`);

			// Wait for save and page data refresh
			await page.waitForLoadState('networkidle');
			await page.waitForTimeout(1000);

			// Set 3 should NOW be visible (match is split 1-1)
			await expect(page.locator('h4:has-text("Set 3")')).toBeVisible({ timeout: 10000 });

			// Deciding set should show hint about 15 points
			await expect(page.locator('.deciding-hint')).toContainText('15', { timeout: 5000 });

			// Enter set 3 scores — below deciding set minimum 15 should fail
			// Set 3 is now the only remaining form in the first match group
			// (sets 1 and 2 are completed)
			const set3Form = firstMatchGroup.locator('[data-testid^="set-form-"]').first();
			const set3TestId = await set3Form.getAttribute('data-testid');
			const set3MatchId = set3TestId?.replace('set-form-', '');

			await page.fill(`[data-testid="team-a-score-${set3MatchId}"]`, '13');
			await page.fill(`[data-testid="team-b-score-${set3MatchId}"]`, '11');
			await page.click(`[data-testid="save-score-${set3MatchId}"]`);

			// Server-side validation should reject scores below deciding set minimum (15)
			await expect(firstMatchGroup.locator('.error p').first()).toContainText('15', {
				timeout: 5000
			});

			// Valid deciding set scores
			await page.fill(`[data-testid="team-a-score-${set3MatchId}"]`, '15');
			await page.fill(`[data-testid="team-b-score-${set3MatchId}"]`, '13');
			await page.click(`[data-testid="save-score-${set3MatchId}"]`);
			await expect(firstMatchGroup.locator('.saved').first()).toBeVisible({ timeout: 10000 });
		});

		test('single-set tournament rejects scores below minimum', async ({ page }) => {
			const tournamentName = `SingleScore ${Date.now()}`;
			testTournamentNames.push(tournamentName);

			await page.waitForSelector('text=+ New Tournament');
			await page.click('text=+ New Tournament');
			await page.fill('input[name="name"]', tournamentName);

			const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1}`);
			await page.fill('textarea[name="names"]', players.join('\n'));
			await page.click('button[type="submit"]');

			await page.waitForURL(/\/tournament\/\d+/);
			await page.waitForSelector('.qr-link a');

			const courtUrl = await page.locator('.qr-link a').first().getAttribute('href');
			await page.goto(courtUrl || '');

			await page.waitForSelector('[data-testid^="match-form-"]');

			// Should NOT show sets UI
			await expect(page.locator('text=Set 1')).not.toBeVisible();

			// Enter scores below minimum 21
			const form = page.locator('[data-testid^="match-form-"]').first();
			const testId = await form.getAttribute('data-testid');
			const matchId = testId?.replace('match-form-', '');

			await page.fill(`[data-testid="team-a-score-${matchId}"]`, '18');
			await page.fill(`[data-testid="team-b-score-${matchId}"]`, '16');
			await page.click(`[data-testid="save-score-${matchId}"]`);

			await expect(page.locator('.error')).toContainText('21');

			// Valid scores
			await page.fill(`[data-testid="team-a-score-${matchId}"]`, '21');
			await page.fill(`[data-testid="team-b-score-${matchId}"]`, '19');
			await page.click(`[data-testid="save-score-${matchId}"]`);
			await page.waitForSelector(`[data-testid="saved-${matchId}"]`);
		});

		test('5p court rejects scores below 15-point minimum', async ({ page }) => {
			const tournamentName = `5pValidation ${Date.now()}`;
			testTournamentNames.push(tournamentName);

			await page.waitForSelector('text=+ New Tournament');
			await page.click('text=+ New Tournament');
			await page.fill('input[name="name"]', tournamentName);
			await page.fill('input[name="n:numRounds"]', '1');

			const players = Array.from({ length: 21 }, (_, i) => `Player${i + 1}`);
			await page.fill('textarea[name="names"]', players.join('\n'));
			await page.click('button[type="submit"]');

			await page.waitForURL(/\/tournament\/\d+/);
			await page.waitForSelector('.qr-link a');

			// Navigate to 5p court (last one)
			const courtUrl = await page.locator('.qr-link a').last().getAttribute('href');
			await page.goto(courtUrl || '');

			await page.waitForSelector('[data-testid^="match-form-"]');

			const form = page.locator('[data-testid^="match-form-"]').first();
			const testId = await form.getAttribute('data-testid');
			const matchId = testId?.replace('match-form-', '');

			// Enter scores below 5p minimum (15)
			await page.fill(`[data-testid="team-a-score-${matchId}"]`, '13');
			await page.fill(`[data-testid="team-b-score-${matchId}"]`, '11');
			await page.click(`[data-testid="save-score-${matchId}"]`);

			await expect(page.locator('.error')).toContainText('15');

			// Valid 15-point scores
			await page.fill(`[data-testid="team-a-score-${matchId}"]`, '15');
			await page.fill(`[data-testid="team-b-score-${matchId}"]`, '13');
			await page.click(`[data-testid="save-score-${matchId}"]`);
			await page.waitForSelector(`[data-testid="saved-${matchId}"]`);
		});
	});

	test('rejects blowout scores (deuce-aware validation)', async ({ page }) => {
		const tournamentName = `BlowoutValidation ${Date.now()}`;
		testTournamentNames.push(tournamentName);

		await page.waitForSelector('text=+ New Tournament');
		await page.click('text=+ New Tournament');
		await page.fill('input[name="name"]', tournamentName);

		const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1}`);
		await page.fill('textarea[name="names"]', players.join('\n'));
		await page.click('button[type="submit"]');

		await page.waitForURL(/\/tournament\/\d+/);
		await page.waitForSelector('.qr-link a');

		const courtUrl = await page.locator('.qr-link a').first().getAttribute('href');
		await page.goto(courtUrl || '');
		await page.waitForSelector('[data-testid^="match-form-"]');

		const allForms = await page.locator('[data-testid^="match-form-"]').all();
		expect(allForms.length).toBe(3);

		const matchIds = await Promise.all(
			allForms.map(async (f) => {
				const tid = await f.getAttribute('data-testid');
				return tid?.replace('match-form-', '');
			})
		);
		const [m1, m2, m3] = matchIds;

		// 1. Blowout: 25-11 should be rejected (game should have ended at 21-11)
		await page.fill(`[data-testid="team-a-score-${m1}"]`, '25');
		await page.fill(`[data-testid="team-b-score-${m1}"]`, '11');
		await page.click(`[data-testid="save-score-${m1}"]`);
		await expect(page.locator('.error')).toContainText('deuce', { timeout: 5000 });

		// 2. Blowout: 22-11 should be rejected (game should have ended at 21-11)
		await page.fill(`[data-testid="team-a-score-${m1}"]`, '22');
		await page.fill(`[data-testid="team-b-score-${m1}"]`, '11');
		await page.click(`[data-testid="save-score-${m1}"]`);
		await expect(page.locator('.error')).toContainText('deuce', { timeout: 5000 });

		// 3. Deuce: 22-20 should be accepted (valid extended play)
		await page.fill(`[data-testid="team-a-score-${m1}"]`, '22');
		await page.fill(`[data-testid="team-b-score-${m1}"]`, '20');
		await page.click(`[data-testid="save-score-${m1}"]`);
		await page.waitForSelector(`[data-testid="saved-${m1}"]`);

		// 4. Extended deuce: 30-28 should be accepted on second match
		await page.fill(`[data-testid="team-a-score-${m2}"]`, '30');
		await page.fill(`[data-testid="team-b-score-${m2}"]`, '28');
		await page.click(`[data-testid="save-score-${m2}"]`);
		await page.waitForSelector(`[data-testid="saved-${m2}"]`);

		// 5. Standard valid: 21-19 should be accepted on third match
		await page.fill(`[data-testid="team-a-score-${m3}"]`, '21');
		await page.fill(`[data-testid="team-b-score-${m3}"]`, '19');
		await page.click(`[data-testid="save-score-${m3}"]`);
		await page.waitForSelector(`[data-testid="saved-${m3}"]`);
	});

	test.describe('Virtual Courts (Physical < Virtual)', () => {
		test('shows virtual court info when physical courts < virtual courts', async ({ page }) => {
			await page.click('text=+ New Tournament');

			// Add 32 players (8 virtual courts)
			const players = Array.from({ length: 32 }, (_, i) => `Player${i + 1}`);
			await page.fill('textarea[name="names"]', players.join('\n'));

			// Set physical courts to 4 (less than 8 virtual)
			await page.locator('input[name="n:physicalCourts"]').fill('4');

			// Should show virtual court info
			await expect(page.locator('.info:has-text("Virtual courts")')).toBeVisible();
			await expect(page.locator('.info:has-text("batch shifts")')).toBeVisible();
		});

		test('physical courts slider ranges from 1 to 16', async ({ page }) => {
			await page.click('text=+ New Tournament');

			const slider = page.locator('input[name="n:physicalCourts"]');
			await expect(slider).toHaveAttribute('min', '1');
			await expect(slider).toHaveAttribute('max', '16');
		});

		test('duration estimate accounts for physical court shifts', async ({ page }) => {
			await page.click('text=+ New Tournament');

			// Add 32 players (8 virtual courts)
			const players = Array.from({ length: 32 }, (_, i) => `Player${i + 1}`);
			await page.fill('textarea[name="names"]', players.join('\n'));

			// With 4 physical courts, should show 2 shifts per round
			await page.locator('input[name="n:physicalCourts"]').fill('4');

			// Duration estimate should reflect shifts
			await expect(page.locator('.duration-estimate')).toBeVisible();
		});
	});

	test.describe('Court Labeling', () => {
		test('organizer can set and view physical court labels', async ({ page }) => {
			const tournamentName = `CourtLabel ${Date.now()}`;
			testTournamentNames.push(tournamentName);

			await page.click('text=+ New Tournament');
			await page.fill('input[name="name"]', tournamentName);
			const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1}`);
			await page.fill('textarea[name="names"]', players.join('\n'));
			await page.click('button[type="submit"]');

			await page.waitForURL(/\/tournament\/\d+/);
			await page.waitForSelector('.court-card', { timeout: 10000 });

			// Set label on first court
			const labelInput = page.locator('.court-label-input').first();
			await labelInput.fill('Court A');
			await labelInput.blur();
			// Wait for blur-triggered save to complete
			await page.waitForTimeout(3000);

			// Open court page and verify label shown
			const courtLink = page.locator('.qr-link a').first();
			const courtUrl = await courtLink.getAttribute('href');
			expect(courtUrl).toBeTruthy();
			await page.goto(courtUrl!);
			await page.waitForURL(/\/court\//, { timeout: 10000 });

			await expect(page.locator('.court-physical-label')).toContainText('Court A');
		});

		test('court page shows no label when not set', async ({ page }) => {
			const tournamentName = `CourtNoLabel ${Date.now()}`;
			testTournamentNames.push(tournamentName);

			await page.click('text=+ New Tournament');
			await page.fill('input[name="name"]', tournamentName);
			const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1}`);
			await page.fill('textarea[name="names"]', players.join('\n'));
			await page.click('button[type="submit"]');

			await page.waitForURL(/\/tournament\/\d+/);
			await page.waitForSelector('.qr-link a', { timeout: 10000 });

			const courtLink = page.locator('.qr-link a').first();
			const courtUrl = await courtLink.getAttribute('href');
			expect(courtUrl).toBeTruthy();
			await page.goto(courtUrl!);
			await page.waitForURL(/\/court\//, { timeout: 10000 });

			await expect(page.locator('.court-physical-label')).not.toBeAttached();
		});
	});

	test.describe('Tournament Deletion', () => {
		test('deletes tournament from detail page', async ({ page }) => {
			const tournamentName = `Delete Test ${Date.now()}`;
			testTournamentNames.push(tournamentName);

			// Create tournament
			await page.click('text=+ New Tournament');
			await page.fill('input[name="name"]', tournamentName);
			const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1}`);
			await page.fill('textarea[name="names"]', players.join('\n'));
			await page.click('button[type="submit"]');

			await page.waitForURL(/\/tournament\/\d+/);
			await page.waitForSelector('text=Round 1');

			// Set up dialog handler BEFORE clicking delete
			page.on('dialog', (dialog) => dialog.accept());

			// Click delete button
			await page.click('button:has-text("Delete")');

			// Wait for redirect to dashboard
			await page.waitForURL('/');

			// Verify tournament no longer appears
			await page.waitForLoadState('domcontentloaded');
			await page.waitForTimeout(1000);
			const deletedTournament = page.locator(`text=${tournamentName}`);
			await expect(deletedTournament).not.toBeVisible();
		});

		test('cancelling delete keeps tournament', async ({ page }) => {
			const tournamentName = `Cancel Delete Test ${Date.now()}`;
			testTournamentNames.push(tournamentName);

			// Create tournament
			await page.click('text=+ New Tournament');
			await page.fill('input[name="name"]', tournamentName);
			const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1}`);
			await page.fill('textarea[name="names"]', players.join('\n'));
			await page.click('button[type="submit"]');

			await page.waitForURL(/\/tournament\/\d+/);

			// Set up dialog handler BEFORE clicking delete
			page.on('dialog', (dialog) => dialog.dismiss());

			// Click delete button
			await page.click('button:has-text("Delete")');

			// Should stay on same page
			await page.waitForTimeout(500);
			await expect(page).toHaveURL(/\/tournament\/\d+/);

			// Tournament should still exist
			await expect(page.locator('h1', { hasText: tournamentName })).toBeVisible();
		});
	});

	test.describe('Player Retirement', () => {
		test('retire a player between rounds and continue tournament', async ({ page }) => {
			test.setTimeout(60000);
			const tournamentName = `Retire Test ${Date.now()}`;
			testTournamentNames.push(tournamentName);

			// Create 16-player tournament with 2 rounds
			await page.click('text=+ New Tournament');
			await page.fill('input[name="name"]', tournamentName);
			await page.fill('input[name="n:numRounds"]', '2');
			const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1}`);
			await page.fill('textarea[name="names"]', players.join('\n'));
			await page.click('button[type="submit"]');

			await page.waitForURL(/\/tournament\/\d+/);
			await page.waitForSelector('text=Round 1 of 2');
			const tournamentUrl = page.url();

			// Complete Round 1 on all 4 courts
			const courtLinksSel = await page.locator('.qr-link a').all();
			const courtLinks: string[] = [];
			for (const cl of courtLinksSel) {
				const url = await cl.getAttribute('href');
				if (url) courtLinks.push(url);
			}
			expect(courtLinks.length).toBe(4);

			for (const url of courtLinks) {
				await page.goto(url);
				await page.waitForSelector('[data-testid^="match-form-"]');
				await page.waitForTimeout(800);
				const matchForms = await page.locator('[data-testid^="match-form-"]').all();
				const matchIds: string[] = [];
				for (const form of matchForms) {
					const testId = await form.getAttribute('data-testid');
					const matchId = testId?.replace('match-form-', '');
					if (matchId) matchIds.push(matchId);
				}
				for (const matchId of matchIds) {
					await page.fill(`[data-testid="team-a-score-${matchId}"]`, '21');
					await page.fill(`[data-testid="team-b-score-${matchId}"]`, '19');
					await page.click(`[data-testid="save-score-${matchId}"]`);
					await page.waitForSelector(`[data-testid="saved-${matchId}"]`);
				}
			}

			// Close Round 1
			await page.goto(tournamentUrl);
			await expect(page).toHaveURL(/\/tournament\/\d+/);
			await page.waitForTimeout(2000);
			await page.waitForSelector('button:has-text("Close Round & Advance")', { timeout: 20000 });
			await page.click('button:has-text("Close Round & Advance")');
			await page.waitForSelector('text=Round 2 of 2');

			// Retire a player before Round 2 scores are entered
			// Wait for live query to settle before interacting (re-renders can detach DOM elements)
			await page.waitForTimeout(1500);
			await page.click('summary:has-text("Retire a Player")');
			await page.waitForSelector('.retire-form');
			await page.waitForTimeout(500);
			const retireOptions = await page.locator('#retirePlayerId option').allTextContents();
			const player1RetireOption = retireOptions.find((opt) => opt.match(/\bPlayer1\b/));
			if (!player1RetireOption) {
				throw new Error(`Player1 not found in retire options`);
			}
			await page.selectOption('#retirePlayerId', { label: player1RetireOption.trim() });
			await page.selectOption('#retireReason', { value: 'injury' });
			await page.waitForTimeout(500);
			await page.click('.retire-form button', { timeout: 10000 });

			// Wait for retirement to process and live query to refresh fully
			await page.waitForTimeout(2000);
			await page.waitForSelector('text=Round 2 of 2');
			await page.waitForSelector('.court-card', { timeout: 10000 });
			const courtCards = await page.locator('.court-card').count();
			expect(courtCards).toBe(4);

			// Get court links (tokens are now stable across retirements)
			const round2LinksSel = await page.locator('.qr-link a').all();
			const round2Links: string[] = [];
			for (const cl of round2LinksSel) {
				const url = await cl.getAttribute('href');
				if (url) round2Links.push(url);
			}

			for (const url of round2Links) {
				await page.goto(url);
				await page.waitForSelector('[data-testid^="match-form-"]');
				await page.waitForTimeout(800);
				const matchForms = await page.locator('[data-testid^="match-form-"]').all();
				const matchIds: string[] = [];
				for (const form of matchForms) {
					const testId = await form.getAttribute('data-testid');
					const matchId = testId?.replace('match-form-', '');
					if (matchId) matchIds.push(matchId);
				}
				for (const matchId of matchIds) {
					await page.fill(`[data-testid="team-a-score-${matchId}"]`, '21');
					await page.fill(`[data-testid="team-b-score-${matchId}"]`, '19');
					await page.click(`[data-testid="save-score-${matchId}"]`);
					await page.waitForSelector(`[data-testid="saved-${matchId}"]`);
				}
			}

			// Close final round
			await page.goto(tournamentUrl);
			await expect(page).toHaveURL(/\/tournament\/\d+/);
			await page.waitForTimeout(2000);
			await page.waitForSelector('button:has-text("Finalize Tournament")', { timeout: 20000 });
			await page.click('button:has-text("Finalize Tournament")');
			await page.waitForTimeout(1000);

			// Verify tournament completed
			await page.goto('/');
			await page.waitForSelector(`text=${tournamentName}`);
			const statusBadge = page
				.locator(`.tournament-card:has-text("${tournamentName}") .status.completed`)
				.first();
			await expect(statusBadge).toBeVisible();
		});

		test('report mid-round injury with Cancel & Average option', async ({ page }) => {
			const tournamentName = `Injury Cancel Test ${Date.now()}`;
			testTournamentNames.push(tournamentName);

			// Create 16-player tournament with 2 rounds
			await page.click('text=+ New Tournament');
			await page.fill('input[name="name"]', tournamentName);
			await page.fill('input[name="n:numRounds"]', '2');
			const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1}`);
			await page.fill('textarea[name="names"]', players.join('\n'));
			await page.click('button[type="submit"]');

			await page.waitForURL(/\/tournament\/\d+/);
			await page.waitForSelector('text=Round 1 of 2');
			const tournamentUrl = page.url();

			// Find which court Player1 is on and score a partial match there
			const player1Court = await findPlayerCourt(page, 'Player1');
			const courtCards = await page.locator('.qr-link a').all();
			const courtUrl = await courtCards[player1Court - 1].getAttribute('href');
			await page.goto(courtUrl || '');
			await page.waitForSelector('[data-testid^="match-form-"]');
			const forms = await page.locator('[data-testid^="match-form-"]').all();
			expect(forms.length).toBe(3);

			// Score only first match
			const testId = await forms[0].getAttribute('data-testid');
			const matchId = testId?.replace('match-form-', '');
			await page.fill(`[data-testid="team-a-score-${matchId}"]`, '21');
			await page.fill(`[data-testid="team-b-score-${matchId}"]`, '19');
			await page.click(`[data-testid="save-score-${matchId}"]`);
			await page.waitForSelector(`[data-testid="saved-${matchId}"]`);

			// Report injury for Player1 on this court
			await page.goto(tournamentUrl);
			await expect(page).toHaveURL(/\/tournament\/\d+/);
			await page.waitForTimeout(1000);

			await page.click('summary:has-text("Report Injury")');
			await page.waitForSelector('.injury-form');
			// Find Player1 option by text content and select by value
			const options = await page.locator('#injuryPlayerId option').allTextContents();
			const player1Option = options.find((opt) => opt.match(/\bPlayer1\b/));
			if (!player1Option) {
				throw new Error(`Player1 not found in injury options. Available: ${options.join(', ')}`);
			}
			await page.selectOption('#injuryPlayerId', { label: player1Option.trim() });
			await page.click('input[value="cancel"]');
			await page.click('.injury-form button');

			// Verify Player1 shows as retired on the court
			await page.waitForSelector('.player.retired', { timeout: 10000 });
			// Wait for live query to settle after reporting injury
			await page.waitForTimeout(2000);

			// Complete remaining matches on all courts
			const allCourtLinks = await page.locator('.qr-link a').all();
			const courtUrls: string[] = [];
			for (const cl of allCourtLinks) {
				const url = await cl.getAttribute('href');
				if (url) courtUrls.push(url);
			}
			for (const url of courtUrls) {
				const hasMatchForms = (await page.locator('[data-testid^="match-form-"]').count()) > 0;
				if (!hasMatchForms) continue;
				await page.goto(url);
				await page.waitForSelector('[data-testid^="match-form-"]');
				await page.waitForTimeout(800);
				const matchForms = await page.locator('[data-testid^="match-form-"]').all();
				const matchIds: string[] = [];
				for (const form of matchForms) {
					const mTestId = await form.getAttribute('data-testid');
					const mId = mTestId?.replace('match-form-', '');
					if (mId) matchIds.push(mId);
				}
				for (const mId of matchIds) {
					await page.fill(`[data-testid="team-a-score-${mId}"]`, '21');
					await page.fill(`[data-testid="team-b-score-${mId}"]`, '19');
					await page.click(`[data-testid="save-score-${mId}"]`);
					await page.waitForSelector(`[data-testid="saved-${mId}"]`);
				}
			}

			// Close Round 1 — navigate directly, with canCloseRound fallback
			await page.goto(tournamentUrl);
			await expect(page).toHaveURL(/\/tournament\/\d+/);
			await page.waitForTimeout(5000);
			const btnCount = await page.locator('button:has-text("Close Round & Advance")').count();
			if (btnCount > 0) {
				await page.click('button:has-text("Close Round & Advance")');
			} else {
				// canCloseRound is sometimes false for canceled matches.
				// Submit closeRoundForm via fetch (n: prefix needed for number coercion).
				await page.evaluate(async () => {
					const tdId = location.pathname.split('/').pop();
					const fd = new URLSearchParams();
					fd.append('n:tournamentId', tdId || '');
					await fetch('/_app/remote/1vtu491/closeRoundForm', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/x-www-form-urlencoded',
							'x-sveltekit-pathname': location.pathname,
							'x-sveltekit-search': location.search
						},
						body: fd.toString()
					});
				});
				await page.goto(tournamentUrl);
				await page.waitForTimeout(2000);
			}
			await page.waitForSelector('text=Round 2 of 2');
		});

		test('report mid-round injury with Substitute option', async ({ page }) => {
			test.setTimeout(60000);
			const tournamentName = `Injury Sub Test ${Date.now()}`;
			testTournamentNames.push(tournamentName);

			await page.click('text=+ New Tournament');
			await page.fill('input[name="name"]', tournamentName);
			await page.fill('input[name="n:numRounds"]', '2');
			const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1}`);
			await page.fill('textarea[name="names"]', players.join('\n'));
			await page.click('button[type="submit"]');
			await page.waitForURL(/\/tournament\/\d+/);
			await page.waitForSelector('text=Round 1 of 2');
			const tournamentUrl = page.url();

			// Find which court Player1 is on and score a partial match there
			const player1Court = await findPlayerCourt(page, 'Player1');
			const courtCards = await page.locator('.qr-link a').all();
			const courtUrl = await courtCards[player1Court - 1].getAttribute('href');
			await page.goto(courtUrl || '');
			await page.waitForSelector('[data-testid^="match-form-"]');
			const forms = await page.locator('[data-testid^="match-form-"]').all();
			expect(forms.length).toBe(3);

			// Score only first match so injury option is available
			const testId = await forms[0].getAttribute('data-testid');
			const matchId = testId?.replace('match-form-', '');
			await page.fill(`[data-testid="team-a-score-${matchId}"]`, '21');
			await page.fill(`[data-testid="team-b-score-${matchId}"]`, '19');
			await page.click(`[data-testid="save-score-${matchId}"]`);
			await page.waitForSelector(`[data-testid="saved-${matchId}"]`);

			// Report injury with substitute option
			await page.goto(tournamentUrl);
			await expect(page).toHaveURL(/\/tournament\/\d+/);
			await page.waitForTimeout(1000);

			await page.click('summary:has-text("Report Injury")');
			await page.waitForSelector('.injury-form');
			const options = await page.locator('#injuryPlayerId option').allTextContents();
			const player1Option = options.find((opt) => opt.match(/\bPlayer1\b/));
			if (!player1Option) {
				throw new Error(`Player1 not found in injury options. Available: ${options.join(', ')}`);
			}
			await page.selectOption('#injuryPlayerId', { label: player1Option.trim() });
			await page.click('input[value="substitute"]');
			await page.click('.injury-form button');

			// Verify Player1 shows as retired
			await page.waitForTimeout(2000);
			const retiredPlayer = page.locator('.player.retired').first();
			await expect(retiredPlayer).toBeVisible();

			// Visit the injured player's court and verify "SUBST" label
			const subCourtLinks = await page.locator('.qr-link a').all();
			const subTargetLink = subCourtLinks[player1Court - 1] || subCourtLinks[0];
			const subCourtUrl = await subTargetLink.getAttribute('href');
			await page.goto(subCourtUrl || '');
			await page.waitForSelector('.player-card.injured');
			const substNames = page.locator('.player-card.injured .player-name');
			await expect(substNames).toHaveText('SUBST');
			const subTags = page.locator('.injured-tag');
			await expect(subTags).toHaveText('Sub');

			// Navigate back to tournament page before collecting court links
			await page.goto(tournamentUrl);
			await expect(page).toHaveURL(/\/tournament\/\d+/);
			await page.waitForTimeout(1000);
			const allCourtLinks = await page.locator('.qr-link a').all();
			const courtUrls: string[] = [];
			for (const cl of allCourtLinks) {
				const url = await cl.getAttribute('href');
				if (url) courtUrls.push(url);
			}
			for (const url of courtUrls) {
				const hasMatchForms = (await page.locator('[data-testid^="match-form-"]').count()) > 0;
				if (!hasMatchForms) continue;
				await page.goto(url);
				await page.waitForSelector('[data-testid^="match-form-"]');
				await page.waitForTimeout(800);
				const matchForms = await page.locator('[data-testid^="match-form-"]').all();
				const matchIds: string[] = [];
				for (const form of matchForms) {
					const mTestId = await form.getAttribute('data-testid');
					const mId = mTestId?.replace('match-form-', '');
					if (mId) matchIds.push(mId);
				}
				for (const mId of matchIds) {
					await page.fill(`[data-testid="team-a-score-${mId}"]`, '21');
					await page.fill(`[data-testid="team-b-score-${mId}"]`, '19');
					await page.click(`[data-testid="save-score-${mId}"]`);
					await page.waitForSelector(`[data-testid="saved-${mId}"]`);
				}
			}

			// Close Round 1 — navigate directly, with canCloseRound fallback
			await page.goto(tournamentUrl);
			await expect(page).toHaveURL(/\/tournament\/\d+/);
			await page.waitForTimeout(5000);
			const sBtnCount = await page.locator('button:has-text("Close Round & Advance")').count();
			if (sBtnCount > 0) {
				await page.click('button:has-text("Close Round & Advance")');
			} else {
				await page.evaluate(async () => {
					const tdId = location.pathname.split('/').pop();
					const fd = new URLSearchParams();
					fd.append('n:tournamentId', tdId || '');
					await fetch('/_app/remote/1vtu491/closeRoundForm', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/x-www-form-urlencoded',
							'x-sveltekit-pathname': location.pathname,
							'x-sveltekit-search': location.search
						},
						body: fd.toString()
					});
				});
				await page.goto(tournamentUrl);
				await page.waitForTimeout(2000);
			}
			await page.waitForSelector('text=Round 2 of 2');
		});

		test('undo retirement within 5 min window', async ({ page }) => {
			test.setTimeout(60000);
			const tournamentName = `Undo Retire ${Date.now()}`;
			testTournamentNames.push(tournamentName);

			await page.click('text=+ New Tournament');
			await page.fill('input[name="name"]', tournamentName);
			await page.fill('input[name="n:numRounds"]', '2');
			const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1}`);
			await page.fill('textarea[name="names"]', players.join('\n'));
			await page.click('button[type="submit"]');

			await page.waitForURL(/\/tournament\/\d+/);
			await page.waitForSelector('text=Round 1 of 2');
			const tournamentUrl = page.url();

			// Complete Round 1 on all courts
			const courtLinksSel = await page.locator('.qr-link a').all();
			const courtLinks: string[] = [];
			for (const cl of courtLinksSel) {
				const url = await cl.getAttribute('href');
				if (url) courtLinks.push(url);
			}
			for (const url of courtLinks) {
				await page.goto(url);
				await page.waitForSelector('[data-testid^="match-form-"]');
				await page.waitForTimeout(800);
				const matchForms = await page.locator('[data-testid^="match-form-"]').all();
				const matchIds: string[] = [];
				for (const form of matchForms) {
					const testId = await form.getAttribute('data-testid');
					const matchId = testId?.replace('match-form-', '');
					if (matchId) matchIds.push(matchId);
				}
				for (const matchId of matchIds) {
					await page.fill(`[data-testid="team-a-score-${matchId}"]`, '21');
					await page.fill(`[data-testid="team-b-score-${matchId}"]`, '19');
					await page.click(`[data-testid="save-score-${matchId}"]`);
					await page.waitForSelector(`[data-testid="saved-${matchId}"]`);
				}
			}

			// Close Round 1
			await page.goto(tournamentUrl);
			await expect(page).toHaveURL(/\/tournament\/\d+/);
			await page.waitForTimeout(2000);
			await page.waitForSelector('button:has-text("Close Round & Advance")', { timeout: 20000 });
			await page.click('button:has-text("Close Round & Advance")');
			await page.waitForSelector('text=Round 2 of 2');

			// Wait for live query
			await page.waitForTimeout(1500);

			// Retire Player1
			await page.click('summary:has-text("Retire a Player")');
			await page.waitForSelector('.retire-form');
			await page.waitForTimeout(500);
			const retireOpts = await page.locator('#retirePlayerId option').allTextContents();
			const p1Opt = retireOpts.find((opt) => opt.match(/\bPlayer1\b/));
			if (!p1Opt) throw new Error(`Player1 not found. Options: ${retireOpts.join(', ')}`);
			await page.selectOption('#retirePlayerId', { label: p1Opt.trim() });
			await page.selectOption('#retireReason', { value: 'injury' });
			await page.waitForTimeout(500);
			await page.click('.retire-form button');

			// Wait for live query to refresh (the retire section may collapse and reopen)
			await page.waitForTimeout(3000);

			// Re-open retire section (details close after live query refresh)
			await page.click('summary:has-text("Retire a Player")', { force: true });
			await page.waitForSelector('.retire-form', { state: 'visible' });

			// Verify undo button is visible for Player1
			const undoRetireBtn = page.locator('.btn-undo');
			await expect(undoRetireBtn).toBeVisible({ timeout: 10000 });

			// Click undo
			await undoRetireBtn.click();

			// Wait for undo to process and live query to refresh
			await page.waitForTimeout(3000);

			// Re-open retire section
			await page.click('summary:has-text("Retire a Player")');
			await page.waitForSelector('.retire-form', { state: 'visible' });

			// Verify undo list is gone
			const undoList = page.locator('.undo-list');
			await expect(undoList).toHaveCount(0);
		});

		test('undo injury report with Cancel option', async ({ page }) => {
			test.setTimeout(60000);
			const tournamentName = `Undo Inj Cancel ${Date.now()}`;
			testTournamentNames.push(tournamentName);

			// Capture page errors
			const pageErrors: string[] = [];
			page.on('pageerror', (err) => pageErrors.push(err.message));

			await page.click('text=+ New Tournament');
			await page.fill('input[name="name"]', tournamentName);
			await page.fill('input[name="n:numRounds"]', '2');
			const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1}`);
			await page.fill('textarea[name="names"]', players.join('\n'));
			await page.click('button[type="submit"]');

			await page.waitForURL(/\/tournament\/\d+/);
			await page.waitForSelector('text=Round 1 of 2');
			const tournamentUrl = page.url();

			// Find Player1's court and score a partial match there
			const player1Court = await findPlayerCourt(page, 'Player1');
			const courtCards = await page.locator('.qr-link a').all();
			const courtUrl = await courtCards[player1Court - 1].getAttribute('href');
			await page.goto(courtUrl || '');
			await page.waitForSelector('[data-testid^="match-form-"]');
			const forms = await page.locator('[data-testid^="match-form-"]').all();
			const testId = await forms[0].getAttribute('data-testid');
			const matchId = testId?.replace('match-form-', '');
			await page.fill(`[data-testid="team-a-score-${matchId}"]`, '21');
			await page.fill(`[data-testid="team-b-score-${matchId}"]`, '19');
			await page.click(`[data-testid="save-score-${matchId}"]`);
			await page.waitForSelector(`[data-testid="saved-${matchId}"]`);

			// Report injury with Cancel
			await page.goto(tournamentUrl);
			await expect(page).toHaveURL(/\/tournament\/\d+/);
			await page.waitForTimeout(1000);

			await page.click('summary:has-text("Report Injury")');
			await page.waitForSelector('.injury-form');
			const opts = await page.locator('#injuryPlayerId option').allTextContents();
			const p1Option = opts.find((opt) => /\bPlayer1\b/.test(opt));
			if (!p1Option) throw new Error(`Player1 not found. Options: ${opts.join(', ')}`);
			await page.selectOption('#injuryPlayerId', { label: p1Option.trim() });
			await page.waitForTimeout(500);
			await page.click('input[value="cancel"]');
			await page.waitForTimeout(500);
			await page.click('.injury-form button');
			await page.waitForTimeout(2000);

			// Navigate to a fresh page to ensure clean state
			await page.goto(tournamentUrl);
			await expect(page).toHaveURL(/\/tournament\/\d+/);
			await page.waitForTimeout(2000);

			// Verify Player1 is shown as retired on the fresh page
			const retiredTexts = await page.locator('.player.retired').allTextContents();
			const player1Retired = retiredTexts.some((t) => /\bPlayer1\b/.test(t));
			if (!player1Retired) {
				throw new Error(
					`Player1 not retired after injury. Retired players: ${retiredTexts.join(', ')}`
				);
			}

			// Wait for live query
			await page.waitForTimeout(3000);

			// Re-open injury section
			await page.click('summary:has-text("Report Injury")');
			await page.waitForSelector('.injury-form', { state: 'visible' });

			// Verify undo button visible
			const undoInjBtn = page.locator('.btn-undo');
			await expect(undoInjBtn).toBeVisible({ timeout: 10000 });

			// Click undo
			await undoInjBtn.click();
			await page.waitForTimeout(1000);

			// Navigate fresh to verify Player1 is no longer retired
			await page.goto(tournamentUrl);
			await expect(page).toHaveURL(/\/tournament\/\d+/);
			await page.waitForTimeout(2000);

			const undoRetiredTexts = await page.locator('.player.retired').allTextContents();
			const player1StillRetired = undoRetiredTexts.some((t) => /\bPlayer1\b/.test(t));
			if (player1StillRetired) {
				throw new Error(
					`Player1 still retired after undo. Retired: ${undoRetiredTexts.join(', ')}`
				);
			}

			// Check no undo buttons exist
			const undoBtns = await page.locator('.btn-undo').count();
			expect(undoBtns).toBe(0);
		});

		test('undo injury report with Substitute option', async ({ page }) => {
			test.setTimeout(60000);
			const tournamentName = `Undo Inj Sub ${Date.now()}`;
			testTournamentNames.push(tournamentName);

			await page.click('text=+ New Tournament');
			await page.fill('input[name="name"]', tournamentName);
			await page.fill('input[name="n:numRounds"]', '2');
			const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1}`);
			await page.fill('textarea[name="names"]', players.join('\n'));
			await page.click('button[type="submit"]');

			await page.waitForURL(/\/tournament\/\d+/);
			await page.waitForSelector('text=Round 1 of 2');
			const tournamentUrl = page.url();

			// Find Player1's court and score a partial match there
			const player1Court = await findPlayerCourt(page, 'Player1');
			const courtCards = await page.locator('.qr-link a').all();
			const courtUrl = await courtCards[player1Court - 1].getAttribute('href');
			await page.goto(courtUrl || '');
			await page.waitForSelector('[data-testid^="match-form-"]');
			const forms = await page.locator('[data-testid^="match-form-"]').all();
			const testId = await forms[0].getAttribute('data-testid');
			const matchId = testId?.replace('match-form-', '');
			await page.fill(`[data-testid="team-a-score-${matchId}"]`, '21');
			await page.fill(`[data-testid="team-b-score-${matchId}"]`, '19');
			await page.click(`[data-testid="save-score-${matchId}"]`);
			await page.waitForSelector(`[data-testid="saved-${matchId}"]`);

			// Report injury with Substitute
			await page.goto(tournamentUrl);
			await expect(page).toHaveURL(/\/tournament\/\d+/);
			await page.waitForTimeout(1000);

			await page.click('summary:has-text("Report Injury")');
			await page.waitForSelector('.injury-form');
			const opts = await page.locator('#injuryPlayerId option').allTextContents();
			const p1Option = opts.find((opt) => /\bPlayer1\b/.test(opt));
			if (!p1Option) throw new Error(`Player1 not found. Options: ${opts.join(', ')}`);
			await page.selectOption('#injuryPlayerId', { label: p1Option.trim() });
			await page.waitForTimeout(500);
			await page.click('input[value="substitute"]');
			await page.waitForTimeout(500);
			await page.click('.injury-form button');

			// Wait for command to complete before navigating fresh
			await page.waitForTimeout(2000);

			// Navigate to a fresh page to ensure clean state
			await page.goto(tournamentUrl);
			await expect(page).toHaveURL(/\/tournament\/\d+/);
			await page.waitForTimeout(2000);

			// Verify Player1 is shown as retired on the fresh page
			const subInjRetiredTexts = await page.locator('.player.retired').allTextContents();
			const subInjPlayer1Retired = subInjRetiredTexts.some((t) => /\bPlayer1\b/.test(t));
			if (!subInjPlayer1Retired) {
				throw new Error(
					`Player1 not retired after injury. Retired players: ${subInjRetiredTexts.join(', ')}`
				);
			}

			// Wait for live query
			await page.waitForTimeout(3000);

			// Re-open injury section
			await page.click('summary:has-text("Report Injury")');
			await page.waitForSelector('.injury-form', { state: 'visible' });

			// Verify undo button visible and click it
			const subUndoBtn = page.locator('.btn-undo');
			await expect(subUndoBtn).toBeVisible({ timeout: 10000 });
			await subUndoBtn.click();
			await page.waitForTimeout(1000);

			// Navigate fresh and verify Player1 is no longer retired
			await page.goto(tournamentUrl);
			await expect(page).toHaveURL(/\/tournament\/\d+/);
			await page.waitForTimeout(2000);

			const subPostUndoRetiredTexts = await page.locator('.player.retired').allTextContents();
			const subPlayer1StillRetired = subPostUndoRetiredTexts.some((t) => /\bPlayer1\b/.test(t));
			if (subPlayer1StillRetired) {
				throw new Error(
					`Player1 still retired after undo. Retired: ${subPostUndoRetiredTexts.join(', ')}`
				);
			}

			// Check no undo buttons exist
			const subPostUndoBtns = await page.locator('.btn-undo').count();
			expect(subPostUndoBtns).toBe(0);
		});

		test('retire a player causing non-standard bottom court and complete tournament', async ({
			page
		}) => {
			test.setTimeout(60000);
			const tournamentName = `Retire NonStd ${Date.now()}`;
			testTournamentNames.push(tournamentName);

			await page.click('text=+ New Tournament');
			await page.fill('input[name="name"]', tournamentName);
			await page.fill('input[name="n:numRounds"]', '2');
			// Start with 16 players → retire 1 → 15 → 4×4p + 1×3p
			const players = Array.from({ length: 16 }, (_, i) => `R${i + 1}`);
			await page.fill('textarea[name="names"]', players.join('\n'));
			await page.click('button[type="submit"]');
			await page.waitForURL(/\/tournament\/\d+/);
			await page.waitForSelector('text=Round 1 of 2');
			const tournamentUrl = page.url();

			// Complete Round 1 on all courts
			const courtLinksSel = await page.locator('.qr-link a').all();
			const courtLinks: string[] = [];
			for (const cl of courtLinksSel) {
				const url = await cl.getAttribute('href');
				if (url) courtLinks.push(url);
			}
			expect(courtLinks.length).toBe(4);

			for (const url of courtLinks) {
				await page.goto(url);
				await page.waitForSelector('[data-testid^="match-form-"]');
				const matchForms = await page.locator('[data-testid^="match-form-"]').all();
				const matchIds: string[] = [];
				for (const form of matchForms) {
					const testId = await form.getAttribute('data-testid');
					const matchId = testId?.replace('match-form-', '');
					if (matchId) matchIds.push(matchId);
				}
				for (const matchId of matchIds) {
					await page.fill(`[data-testid="team-a-score-${matchId}"]`, '21');
					await page.fill(`[data-testid="team-b-score-${matchId}"]`, '19');
					await page.click(`[data-testid="save-score-${matchId}"]`);
					await page.waitForSelector(`[data-testid="saved-${matchId}"]`);
				}
			}

			// Close Round 1
			await page.goto(tournamentUrl);
			await expect(page).toHaveURL(/\/tournament\/\d+/);
			await page.waitForTimeout(2000);
			await page.waitForSelector('button:has-text("Close Round & Advance")', { timeout: 20000 });
			await page.click('button:has-text("Close Round & Advance")');
			await page.waitForSelector('text=Round 2 of 2');

			// Retire a player between rounds
			await page.waitForTimeout(1500);
			await page.click('summary:has-text("Retire a Player")');
			await page.waitForSelector('.retire-form');
			await page.waitForTimeout(500);
			const retireOptions = await page.locator('#retirePlayerId option').allTextContents();
			const r1Option = retireOptions.find((opt) => opt.includes('R1'));
			if (!r1Option) {
				throw new Error(`R1 not found in retire options. Available: ${retireOptions.join(', ')}`);
			}
			await page.selectOption('#retirePlayerId', { label: r1Option.trim() });
			await page.selectOption('#retireReason', { value: 'schedule' });
			await page.waitForTimeout(500);
			await page.click('.retire-form button', { timeout: 10000 });

			// Wait for retirement — should now have 15 players on 3×4p + 1×3p = 4 courts
			await page.waitForTimeout(2000);
			await page.waitForSelector('text=Round 2 of 2');
			const courtCardsAfter = await page.locator('.court-card').count();
			expect(courtCardsAfter).toBe(4);

			// Verify 3-player court exists
			const courtSizes = await page.locator('.court-card .court-size-badge').allTextContents();
			const has3pCourt = courtSizes.some((s) => s.includes('3p'));
			expect(has3pCourt).toBeTruthy();

			// Score Round 2 on all courts (including the 3p court)
			const round2LinksSel = await page.locator('.qr-link a').all();
			const round2Links: string[] = [];
			for (const cl of round2LinksSel) {
				const url = await cl.getAttribute('href');
				if (url) round2Links.push(url);
			}
			for (const url of round2Links) {
				await page.goto(url);
				await page.waitForSelector('[data-testid^="match-form-"]');
				const matchForms = await page.locator('[data-testid^="match-form-"]').all();
				const matchIds: string[] = [];
				for (const form of matchForms) {
					const mTestId = await form.getAttribute('data-testid');
					const mId = mTestId?.replace('match-form-', '');
					if (mId) matchIds.push(mId);
				}
				for (const mId of matchIds) {
					await page.fill(`[data-testid="team-a-score-${mId}"]`, '21');
					await page.fill(`[data-testid="team-b-score-${mId}"]`, '19');
					await page.click(`[data-testid="save-score-${mId}"]`);
					await page.waitForSelector(`[data-testid="saved-${mId}"]`);
				}
			}

			// Finalize tournament
			await page.goto(tournamentUrl);
			await expect(page).toHaveURL(/\/tournament\/\d+/);
			await page.waitForTimeout(2000);
			await page.waitForSelector('button:has-text("Finalize Tournament")', { timeout: 20000 });
			await page.click('button:has-text("Finalize Tournament")');
			await page.waitForTimeout(1000);

			await page.goto('/');
			await page.waitForSelector(`text=${tournamentName}`);
			const statusBadge = page
				.locator(`.tournament-card:has-text("${tournamentName}") .status.completed`)
				.first();
			await expect(statusBadge).toBeVisible();
		});
	});

	test.describe('Scoring Overrides', () => {
		test('override 5p court points-to-win and verify score entry', async ({ page }) => {
			test.setTimeout(90000);
			const tournamentName = `ScoreOvrd5p ${Date.now()}`;
			testTournamentNames.push(tournamentName);

			// Create 21-player tournament (5×4p + 1×5p)
			await page.click('text=+ New Tournament');
			await page.fill('input[name="name"]', tournamentName);
			await page.fill('input[name="n:numRounds"]', '2');
			const players = Array.from({ length: 21 }, (_, i) => `P${i + 1}`);
			await page.fill('textarea[name="names"]', players.join('\n'));
			await page.click('button[type="submit"]');
			await page.waitForURL(/\/tournament\/\d+/);
			await page.waitForSelector('text=Round 1 of 2');

			// Override 5p court scoring: change pointsToWin from 15 to 10
			await page.click('summary:has-text("Court Scoring Configuration")');
			await page.waitForSelector('.scoring-summary');
			await page.click('.btn-edit');
			await page.waitForSelector('.scoring-grid');

			// Find the 5p fieldset and change points to win to 10
			const fieldset = page.locator('fieldset.scoring-fieldset:has(legend:text("5p"))');
			await expect(fieldset).toBeVisible();
			const pointsInput = fieldset.locator('label:has-text("Points to win") input');
			await pointsInput.fill('10');
			await page.click('button:has-text("Save Scoring")');
			await page.waitForTimeout(1500);

			// Verify the summary badge shows the new scoring
			const badge5p = page.locator('.scoring-badge:has-text("5p")');
			await expect(badge5p).toContainText('1 set to 10');

			// Navigate to the 5p court (the 5th court link)
			const allLinks = await page.locator('.qr-link a').all();
			expect(allLinks.length).toBe(5);
			const link5 = await allLinks[4].getAttribute('href');
			await page.goto(link5 || '');
			await page.waitForSelector('[data-testid^="match-form-"]');

			// Verify label shows the overridden scoring
			const formatInfo = page.locator('.format-detail').filter({ hasText: 'Scoring' });
			await expect(formatInfo).toContainText('to 10');

			// Enter a score of 10-8 (would fail with default 15-point min but valid with override)
			const forms = await page.locator('[data-testid^="match-form-"]').all();
			expect(forms.length).toBe(4);
			const firstTestId = await forms[0].getAttribute('data-testid');
			const firstMatchId = firstTestId?.replace('match-form-', '');
			await page.fill(`[data-testid="team-a-score-${firstMatchId}"]`, '10');
			await page.fill(`[data-testid="team-b-score-${firstMatchId}"]`, '8');
			await page.click(`[data-testid="save-score-${firstMatchId}"]`);
			await page.waitForSelector(`[data-testid="saved-${firstMatchId}"]`);
		});

		test('override 3p court to best-of-3 and verify set entry', async ({ page }) => {
			test.setTimeout(90000);
			const tournamentName = `ScoreOvrd3p ${Date.now()}`;
			testTournamentNames.push(tournamentName);

			// Create 11-player tournament (2×4p + 1×3p)
			await page.click('text=+ New Tournament');
			await page.fill('input[name="name"]', tournamentName);
			await page.fill('input[name="n:numRounds"]', '2');
			const players = Array.from({ length: 11 }, (_, i) => `Q${i + 1}`);
			await page.fill('textarea[name="names"]', players.join('\n'));
			await page.click('button[type="submit"]');
			await page.waitForURL(/\/tournament\/\d+/);
			await page.waitForSelector('text=Round 1 of 2');

			// Override 3p to best-of-3
			await page.click('summary:has-text("Court Scoring Configuration")');
			await page.waitForSelector('.scoring-summary');
			await page.click('.btn-edit');
			await page.waitForSelector('.scoring-grid');

			const fieldset = page.locator('fieldset.scoring-fieldset:has(legend:text("3p"))');
			await expect(fieldset).toBeVisible();
			const setsInput = fieldset.locator('label:has-text("Sets to win") input');
			await setsInput.fill('2');
			await page.click('button:has-text("Save Scoring")');
			await page.waitForTimeout(1500);

			// Verify badge shows best-of-3
			const badge3p = page.locator('.scoring-badge:has-text("3p")');
			await expect(badge3p).toContainText('Best of 2');

			// Navigate to the 3p court (3rd court link)
			const allLinks = await page.locator('.qr-link a').all();
			expect(allLinks.length).toBe(3);
			const link3 = await allLinks[2].getAttribute('href');
			await page.goto(link3 || '');
			await page.waitForSelector('[data-testid^="set-form-"]');

			// Verify set 1 label appears (best-of-3 shows Set 1; Set 2/3
			// appear dynamically after Set 1 scores are entered)
			await expect(page.locator('text=Set 1').first()).toBeVisible();

			// Enter score for set 1 of the first match
			const forms = await page.locator('[data-testid^="set-form-"]').all();
			expect(forms.length).toBe(3);
			const firstTestId = await forms[0].getAttribute('data-testid');
			const firstMatchId = firstTestId?.replace(/^(set|match)-form-/, '');
			await page.fill(`[data-testid="team-a-score-${firstMatchId}"]`, '21');
			await page.fill(`[data-testid="team-b-score-${firstMatchId}"]`, '19');
			await page.click(`[data-testid="save-score-${firstMatchId}"]`);
			await page.waitForSelector(`[data-testid="saved-${firstMatchId}"]`);
		});
	});
});
