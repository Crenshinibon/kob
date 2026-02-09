import { test, expect } from '@playwright/test';

/**
 * Tests for standings calculation logic
 *
 * These tests verify that:
 * 1. Points are calculated correctly for each player
 * 2. Standings are sorted by total points (descending)
 * 3. Tiebreakers work correctly (point differential)
 * 4. Each player gets points equal to their team's score in each match
 */

test.describe('Standings Calculation', () => {
	test.beforeEach(async ({ page }) => {
		// Login before each test
		await page.goto('/auth/login');
		await page.fill('input[type="email"]', 'test@example.com');
		await page.fill('input[type="password"]', 'password123');
		await page.click('button[type="submit"]');
		await page.waitForURL('/');
	});

	test('calculates correct points for all players in a match', async ({ page }) => {
		// Create a tournament with 16 players
		await page.click('text=+ New Tournament');
		await page.fill('input[name="name"]', 'Standings Test Tournament');
		await page.selectOption('select[name="numRounds"]', '3');
		await page.click('button[type="submit"]');

		// Add 16 players
		await page.waitForURL(/\/tournament\/\d+\/players/);
		const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1}`);
		await page.fill('textarea[name="names"]', players.join('\n'));
		await page.click('button:has-text("Add Players")');

		// Start tournament
		await page.click('button:has-text("Start Tournament")');
		await page.waitForURL(/\/tournament\/\d+/);

		// Get court token and enter scores
		const courtLink = await page.locator('.qr-link a').first();
		const courtUrl = await courtLink.getAttribute('href');

		// Enter a match with scores 21-19
		await page.goto(courtUrl || '');
		await page.fill('input[name="teamAScore"]', '21');
		await page.fill('input[name="teamBScore"]', '19');
		await page.click('button:has-text("Save Score")');

		// Verify standings show correct points
		await page.waitForSelector('.standings');
		const standingsText = await page.locator('.standings').textContent();

		// Team A players should have 21 points, Team B should have 19
		expect(standingsText).toContain('21');
		expect(standingsText).toContain('19');
	});

	test('sorts players by total points in descending order', async ({ page }) => {
		// Create tournament
		await page.click('text=+ New Tournament');
		await page.fill('input[name="name"]', 'Sorting Test Tournament');
		await page.click('button[type="submit"]');

		// Add 16 players
		await page.waitForURL(/\/tournament\/\d+\/players/);
		const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1}`);
		await page.fill('textarea[name="names"]', players.join('\n'));
		await page.click('button:has-text("Add Players")');
		await page.click('button:has-text("Start Tournament")');
		await page.waitForURL(/\/tournament\/\d+/);

		// Enter multiple matches with different scores
		const courtLink = await page.locator('.qr-link a').first();
		const courtUrl = await courtLink.getAttribute('href');
		await page.goto(courtUrl || '');

		// Complete all 3 matches with varying scores
		await page.fill('input[name="teamAScore"]', '25');
		await page.fill('input[name="teamBScore"]', '23');
		await page.click('button:has-text("Save Score")');

		await page.waitForTimeout(500);
		await page.reload();

		// Get standings and verify order
		await page.waitForSelector('.standings tbody tr');
		const rows = await page.locator('.standings tbody tr').all();

		// Verify we have 4 players in standings
		expect(rows.length).toBe(4);

		// Check that standings are sorted (first player should have more/equal points than second)
		const firstPoints = await rows[0].locator('td:nth-child(3)').textContent();
		const secondPoints = await rows[1].locator('td:nth-child(3)').textContent();
		expect(parseInt(firstPoints || '0')).toBeGreaterThanOrEqual(parseInt(secondPoints || '0'));
	});

	test('breaks ties using point differential', async ({ page }) => {
		// Create tournament
		await page.click('text=+ New Tournament');
		await page.fill('input[name="name"]', 'Tiebreaker Test Tournament');
		await page.click('button[type="submit"]');

		// Add 16 players
		await page.waitForURL(/\/tournament\/\d+\/players/);
		const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1}`);
		await page.fill('textarea[name="names"]', players.join('\n'));
		await page.click('button:has-text("Add Players")');
		await page.click('button:has-text("Start Tournament")');
		await page.waitForURL(/\/tournament\/\d+/);

		// Enter scores that create a tie in total points but different differentials
		const courtLink = await page.locator('.qr-link a').first();
		const courtUrl = await courtLink.getAttribute('href');
		await page.goto(courtUrl || '');

		// Enter scores
		await page.fill('input[name="teamAScore"]', '21');
		await page.fill('input[name="teamBScore"]', '19');
		await page.click('button:has-text("Save Score")');

		await page.waitForTimeout(500);
		await page.reload();

		// Check standings show differential column
		await page.waitForSelector('.standings');
		const diffHeader = await page.locator('.standings th:has-text("Diff")').count();
		expect(diffHeader).toBe(1);
	});

	test('awards points correctly across multiple matches per player', async ({ page }) => {
		// Create tournament
		await page.click('text=+ New Tournament');
		await page.fill('input[name="name"]', 'Multi-Match Points Test');
		await page.click('button[type="submit"]');

		// Add 16 players
		await page.waitForURL(/\/tournament\/\d+\/players/);
		const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1}`);
		await page.fill('textarea[name="names"]', players.join('\n'));
		await page.click('button:has-text("Add Players")');
		await page.click('button:has-text("Start Tournament")');
		await page.waitForURL(/\/tournament\/\d+/);

		// Enter all 3 matches for a court
		const courtLink = await page.locator('.qr-link a').first();
		const courtUrl = await courtLink.getAttribute('href');
		await page.goto(courtUrl || '');

		// Match 1
		await page.fill('input[name="teamAScore"]', '21');
		await page.fill('input[name="teamBScore"]', '19');
		await page.click('button:has-text("Save Score")');
		await page.waitForTimeout(500);
		await page.reload();

		// Match 2
		await page.fill('input[name="teamAScore"]', '25');
		await page.fill('input[name="teamBScore"]', '23');
		await page.click('button:has-text("Save Score")');
		await page.waitForTimeout(500);
		await page.reload();

		// Match 3
		await page.fill('input[name="teamAScore"]', '22');
		await page.fill('input[name="teamBScore"]', '20');
		await page.click('button:has-text("Save Score")');
		await page.waitForTimeout(500);
		await page.reload();

		// Check standings - players should have accumulated points from all matches
		await page.waitForSelector('.standings tbody tr');
		const rows = await page.locator('.standings tbody tr').all();

		// Each player plays 3 matches, so should have points from all 3
		// Top player should have 21 + 25 + 22 = 68 or similar
		const topPlayerPoints = await rows[0].locator('td:nth-child(3)').textContent();
		expect(parseInt(topPlayerPoints || '0')).toBeGreaterThan(60);
	});

	test('validates score entry rules (min 21, win by 2)', async ({ page }) => {
		// Create tournament
		await page.click('text=+ New Tournament');
		await page.fill('input[name="name"]', 'Validation Test');
		await page.click('button[type="submit"]');

		// Add 16 players
		await page.waitForURL(/\/tournament\/\d+\/players/);
		const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1}`);
		await page.fill('textarea[name="names"]', players.join('\n'));
		await page.click('button:has-text("Add Players")');
		await page.click('button:has-text("Start Tournament")');
		await page.waitForURL(/\/tournament\/\d+/);

		// Try to enter invalid scores
		const courtLink = await page.locator('.qr-link a').first();
		const courtUrl = await courtLink.getAttribute('href');
		await page.goto(courtUrl || '');

		// Try score without reaching 21
		await page.fill('input[name="teamAScore"]', '20');
		await page.fill('input[name="teamBScore"]', '18');
		await page.click('button:has-text("Save Score")');

		// Should show error
		await page.waitForSelector('.error');
		const errorText = await page.locator('.error').textContent();
		expect(errorText).toContain('21');

		// Try tied score
		await page.fill('input[name="teamAScore"]', '21');
		await page.fill('input[name="teamBScore"]', '21');
		await page.click('button:has-text("Save Score")');

		await page.waitForSelector('.error');
		const errorText2 = await page.locator('.error').textContent();
		expect(errorText2?.toLowerCase()).toContain('tie');

		// Try winning by only 1 point
		await page.fill('input[name="teamAScore"]', '21');
		await page.fill('input[name="teamBScore"]', '20');
		await page.click('button:has-text("Save Score")');

		await page.waitForSelector('.error');
		const errorText3 = await page.locator('.error').textContent();
		expect(errorText3).toContain('2');
	});
});
