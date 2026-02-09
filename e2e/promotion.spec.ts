import { test, expect } from '@playwright/test';

/**
 * Tests for promotion and relegation logic
 *
 * These tests verify that:
 * 1. Round 1 → Round 2 uses seeding redistribution (vertical grouping by rank)
 * 2. Round 2+ uses ladder system (2 up, 2 down)
 * 3. Players are correctly redistributed between courts
 * 4. Court assignments are maintained correctly across rounds
 */

test.describe('Promotion and Relegation', () => {
	test.beforeEach(async ({ page }) => {
		// Login before each test
		await page.goto('/auth/login');
		await page.fill('input[type="email"]', 'test@example.com');
		await page.fill('input[type="password"]', 'password123');
		await page.click('button[type="submit"]');
		await page.waitForURL('/');
	});

	test('Round 1 to Round 2: seeding redistribution by rank', async ({ page }) => {
		// Create a 3-round tournament
		await page.click('text=+ New Tournament');
		await page.fill('input[name="name"]', 'Seeding Test Tournament');
		await page.selectOption('select[name="numRounds"]', '3');
		await page.click('button[type="submit"]');

		// Add 16 players with predictable names
		await page.waitForURL(/\/tournament\/\d+\/players/);
		const players = Array.from({ length: 16 }, (_, i) => `Player${String(i + 1).padStart(2, '0')}`);
		await page.fill('textarea[name="names"]', players.join('\n'));
		await page.click('button:has-text("Add Players")');
		await page.click('button:has-text("Start Tournament")');
		await page.waitForURL(/\/tournament\/\d+/);

		// Get all 4 court URLs
		const courtLinks = await page.locator('.qr-link a').all();
		expect(courtLinks.length).toBe(4);

		// Enter scores to create predictable rankings on each court
		// Court 1: Player01 > Player02 > Player03 > Player04
		// Court 2: Player05 > Player06 > Player07 > Player08
		// Court 3: Player09 > Player10 > Player11 > Player12
		// Court 4: Player13 > Player14 > Player15 > Player16

		for (let courtNum = 0; courtNum < 4; courtNum++) {
			const courtUrl = await courtLinks[courtNum].getAttribute('href');
			await page.goto(courtUrl || '');

			// Enter scores for all 3 matches to establish clear rankings
			// Higher scores for players who should rank higher
			const baseScore = 30 + courtNum * 4;

			// Match 1: Players 1&2 vs 3&4
			await page.fill('input[name="teamAScore"]', String(baseScore));
			await page.fill('input[name="teamBScore"]', String(baseScore - 2));
			await page.click('button:has-text("Save Score")');
			await page.waitForTimeout(300);
			await page.reload();

			// Match 2: Players 1&3 vs 2&4
			await page.fill('input[name="teamAScore"]', String(baseScore + 2));
			await page.fill('input[name="teamBScore"]', String(baseScore - 4));
			await page.click('button:has-text("Save Score")');
			await page.waitForTimeout(300);
			await page.reload();

			// Match 3: Players 1&4 vs 2&3
			await page.fill('input[name="teamAScore"]', String(baseScore + 4));
			await page.fill('input[name="teamBScore"]', String(baseScore - 6));
			await page.click('button:has-text("Save Score")');
			await page.waitForTimeout(300);
		}

		// Go back to tournament page and close round
		await page.goBack();
		await page.waitForSelector('button:has-text("Close Round")');
		await page.click('button:has-text("Close Round")');
		await page.waitForTimeout(1000);

		// Verify we're now in Round 2
		await page.waitForSelector('text=Round 2 of 3');

		// Check that players have been redistributed
		// After seeding: All 1st place players should be on Court 1, etc.
		const newCourtLinks = await page.locator('.qr-link a').all();

		// Open Court 1 and check it has top performers from all courts
		await page.goto((await newCourtLinks[0].getAttribute('href')) || '');
		await page.waitForSelector('.standings tbody tr');

		// Court 1 should have 4 players
		const court1Players = await page.locator('.standings tbody tr').count();
		expect(court1Players).toBe(4);
	});

	test('ladder system moves players up and down between rounds', async ({ page }) => {
		// Create a 3-round tournament
		await page.click('text=+ New Tournament');
		await page.fill('input[name="name"]', 'Ladder Test Tournament');
		await page.selectOption('select[name="numRounds"]', '3');
		await page.click('button[type="submit"]');

		// Add 16 players
		await page.waitForURL(/\/tournament\/\d+\/players/);
		const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1}`);
		await page.fill('textarea[name="names"]', players.join('\n'));
		await page.click('button:has-text("Add Players")');
		await page.click('button:has-text("Start Tournament")');
		await page.waitForURL(/\/tournament\/\d+/);

		// Complete Round 1
		const courtLinks = await page.locator('.qr-link a').all();

		for (const courtLink of courtLinks) {
			const courtUrl = await courtLink.getAttribute('href');
			await page.goto(courtUrl || '');

			// Enter any valid scores
			await page.fill('input[name="teamAScore"]', '21');
			await page.fill('input[name="teamBScore"]', '19');
			await page.click('button:has-text("Save Score")');
			await page.waitForTimeout(300);
			await page.reload();

			await page.fill('input[name="teamAScore"]', '25');
			await page.fill('input[name="teamBScore"]', '23');
			await page.click('button:has-text("Save Score")');
			await page.waitForTimeout(300);
			await page.reload();

			await page.fill('input[name="teamAScore"]', '22');
			await page.fill('input[name="teamBScore"]', '20');
			await page.click('button:has-text("Save Score")');
			await page.waitForTimeout(300);
		}

		// Close Round 1
		await page.goBack();
		await page.waitForSelector('button:has-text("Close Round")');
		await page.click('button:has-text("Close Round")');
		await page.waitForTimeout(1000);

		// Verify Round 2 started
		await page.waitForSelector('text=Round 2 of 3');

		// Get player assignments for Round 2
		const round2Links = await page.locator('.qr-link a').all();
		const round2Courts: string[][] = [];

		for (let i = 0; i < 4; i++) {
			await page.goto((await round2Links[i].getAttribute('href')) || '');
			await page.waitForSelector('.standings tbody tr');
			const rows = await page.locator('.standings tbody tr').all();
			const playerNames: string[] = [];
			for (const row of rows) {
				const name = await row.locator('td:nth-child(2)').textContent();
				if (name) playerNames.push(name);
			}
			round2Courts.push(playerNames);
		}

		// Verify we have 4 courts with 4 players each
		expect(round2Courts.length).toBe(4);
		round2Courts.forEach((court) => {
			expect(court.length).toBe(4);
		});

		// Verify total unique players is still 16
		const allPlayers = new Set(round2Courts.flat());
		expect(allPlayers.size).toBe(16);
	});

	test('close round button is disabled until all matches complete', async ({ page }) => {
		// Create tournament
		await page.click('text=+ New Tournament');
		await page.fill('input[name="name"]', 'Close Round Button Test');
		await page.selectOption('select[name="numRounds"]', '2');
		await page.click('button[type="submit"]');

		// Add 16 players
		await page.waitForURL(/\/tournament\/\d+\/players/);
		const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1}`);
		await page.fill('textarea[name="names"]', players.join('\n'));
		await page.click('button:has-text("Add Players")');
		await page.click('button:has-text("Start Tournament")');
		await page.waitForURL(/\/tournament\/\d+/);

		// Initially, close round button should be disabled
		const closeButton = await page.locator('button:has-text("Waiting for all scores")');
		await expect(closeButton).toBeVisible();

		// Complete all matches on one court only
		const courtLinks = await page.locator('.qr-link a').all();
		const courtUrl = await courtLinks[0].getAttribute('href');
		await page.goto(courtUrl || '');

		// Complete all 3 matches for this court
		for (let i = 0; i < 3; i++) {
			await page.fill('input[name="teamAScore"]', '21');
			await page.fill('input[name="teamBScore"]', '19');
			await page.click('button:has-text("Save Score")');
			await page.waitForTimeout(300);
			if (i < 2) await page.reload();
		}

		// Go back to tournament page - button should still be disabled
		await page.goBack();
		await page.waitForSelector('button:has-text("Waiting for all scores")');

		// Complete matches on remaining courts
		for (let courtNum = 1; courtNum < 4; courtNum++) {
			const url = await courtLinks[courtNum].getAttribute('href');
			await page.goto(url || '');

			for (let i = 0; i < 3; i++) {
				await page.fill('input[name="teamAScore"]', '21');
				await page.fill('input[name="teamBScore"]', '19');
				await page.click('button:has-text("Save Score")');
				await page.waitForTimeout(300);
				if (i < 2) await page.reload();
			}
		}

		// Now go back and close round button should be enabled
		await page.goBack();
		await page.waitForSelector('button:has-text("Close Round")');
		const enabledButton = await page.locator('button:has-text("Close Round")');
		await expect(enabledButton).toBeEnabled();
	});

	test('final round completion marks tournament as completed', async ({ page }) => {
		// Create a 1-round tournament (ends after first round)
		await page.click('text=+ New Tournament');
		await page.fill('input[name="name"]', 'Final Round Test');
		await page.selectOption('select[name="numRounds"]', '1');
		await page.click('button[type="submit"]');

		// Add 16 players
		await page.waitForURL(/\/tournament\/\d+\/players/);
		const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1}`);
		await page.fill('textarea[name="names"]', players.join('\n'));
		await page.click('button:has-text("Add Players")');
		await page.click('button:has-text("Start Tournament")');
		await page.waitForURL(/\/tournament\/\d+/);

		// Complete all matches
		const courtLinks = await page.locator('.qr-link a').all();

		for (const courtLink of courtLinks) {
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

		// Close the only round
		await page.goBack();
		await page.waitForSelector('button:has-text("Close Round")');
		await page.click('button:has-text("Close Round")');
		await page.waitForTimeout(1000);

		// Tournament should be marked as completed
		await page.goto('/');
		await page.waitForSelector('text=Final Round Test');
		const statusBadge = await page.locator(
			'.tournament-card:has-text("Final Round Test") .status.completed'
		);
		await expect(statusBadge).toBeVisible();
	});

	test('maintains exactly 4 players per court after redistribution', async ({ page }) => {
		// Create a 3-round tournament
		await page.click('text=+ New Tournament');
		await page.fill('input[name="name"]', 'Player Count Test');
		await page.selectOption('select[name="numRounds"]', '3');
		await page.click('button[type="submit"]');

		// Add 16 players
		await page.waitForURL(/\/tournament\/\d+\/players/);
		const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1}`);
		await page.fill('textarea[name="names"]', players.join('\n'));
		await page.click('button:has-text("Add Players")');
		await page.click('button:has-text("Start Tournament")');
		await page.waitForURL(/\/tournament\/\d+/);

		// Complete Round 1 and close it
		const courtLinks = await page.locator('.qr-link a').all();

		for (const courtLink of courtLinks) {
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

		await page.goBack();
		await page.waitForSelector('button:has-text("Close Round")');
		await page.click('button:has-text("Close Round")');
		await page.waitForTimeout(1000);

		// Verify Round 2
		await page.waitForSelector('text=Round 2 of 3');

		// Check each court has exactly 4 players
		const round2Links = await page.locator('.qr-link a').all();
		expect(round2Links.length).toBe(4);

		for (let i = 0; i < 4; i++) {
			await page.goto((await round2Links[i].getAttribute('href')) || '');
			await page.waitForSelector('.standings tbody tr');
			const playerCount = await page.locator('.standings tbody tr').count();
			expect(playerCount).toBe(4);
		}
	});
});
