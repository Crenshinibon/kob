import { test, expect } from '@playwright/test';

test.describe('Tournament Format Selection', () => {
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
	});

	test.afterEach(async ({ page }) => {
		for (const tournamentName of testTournamentNames) {
			try {
				await page.goto('/');
				await page.waitForLoadState('networkidle');

				const tournamentCard = page
					.locator(`.tournament-card:has-text("${tournamentName}")`)
					.first();
				if (await tournamentCard.isVisible().catch(() => false)) {
					await tournamentCard.click();
					await page.waitForLoadState('networkidle');

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
				// Ignore cleanup errors
			}
		}
		testTournamentNames.length = 0;
	});

	test('Random format shows selectable rounds dropdown', async ({ page }) => {
		await page.click('text=+ New Tournament');

		await page.waitForSelector('input[name="name"]');

		await expect(page.locator('input[value="random-seed"]')).toBeChecked();

		await expect(page.locator('select[name="numRounds"]')).toBeVisible();

		const options = await page.locator('select[name="numRounds"] option').allTextContents();
		expect(options).toEqual(['1', '2', '3', '4', '5']);
	});

	test('Pre-Seed format with 16 players shows 3 fixed rounds', async ({ page }) => {
		const tournamentName = `PreSeed16 ${Date.now()}`;
		testTournamentNames.push(tournamentName);

		await page.click('text=+ New Tournament');
		await page.fill('input[name="name"]', tournamentName);

		await page.click('input[value="preseed"]');

		await expect(page.locator('select[name="numRounds"]')).not.toBeVisible();

		await expect(page.locator('.info-box:has-text("3 rounds (fixed)")')).toBeVisible();

		await page.click('button[type="submit"]');

		await page.waitForURL(/\/tournament\/\d+\/players/);

		const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1} ${100 - i * 5}`);
		await page.fill('textarea[name="names"]', players.join('\n'));
		await page.click('button:has-text("Add Players")');

		await page.waitForSelector('button:has-text("Start Tournament")', { timeout: 5000 });
		await page.click('button:has-text("Start Tournament")');
		await page.waitForURL(/\/tournament\/\d+/);

		await expect(page.locator('text=Round 1 of 3')).toBeVisible();
	});

	test('Pre-Seed format with 32 players shows 4 fixed rounds', async ({ page }) => {
		const tournamentName = `PreSeed32 ${Date.now()}`;
		testTournamentNames.push(tournamentName);

		await page.click('text=+ New Tournament');
		await page.fill('input[name="name"]', tournamentName);

		await page.click('input[value="32"]');

		await page.click('input[value="preseed"]');

		await expect(page.locator('.info-box:has-text("4 rounds (fixed)")')).toBeVisible();

		await page.click('button[type="submit"]');

		await page.waitForURL(/\/tournament\/\d+\/players/);

		const players = Array.from({ length: 32 }, (_, i) => `Player${i + 1} ${200 - i * 5}`);
		await page.fill('textarea[name="names"]', players.join('\n'));
		await page.click('button:has-text("Add Players")');

		await page.waitForSelector('button:has-text("Start Tournament")', { timeout: 5000 });
		await page.click('button:has-text("Start Tournament")');
		await page.waitForURL(/\/tournament\/\d+/);

		await expect(page.locator('text=Round 1 of 4')).toBeVisible();

		const courtCards = await page.locator('.court-card').count();
		expect(courtCards).toBe(8);
	});

	test('switching player count updates fixed rounds in Pre-Seed format', async ({ page }) => {
		await page.click('text=+ New Tournament');

		await page.click('input[value="preseed"]');

		await expect(page.locator('.info-box:has-text("3 rounds (fixed)")')).toBeVisible();

		await page.click('input[value="32"]');

		await expect(page.locator('.info-box:has-text("4 rounds (fixed)")')).toBeVisible();

		await page.click('input[value="16"]');

		await expect(page.locator('.info-box:has-text("3 rounds (fixed)")')).toBeVisible();
	});

	test('switching from Pre-Seed to Random shows rounds dropdown again', async ({ page }) => {
		await page.click('text=+ New Tournament');

		await page.click('input[value="preseed"]');

		await expect(page.locator('select[name="numRounds"]')).not.toBeVisible();

		await page.click('input[value="random-seed"]');

		await expect(page.locator('select[name="numRounds"]')).toBeVisible();
	});

	test('Random format with 32 players creates 8 courts', async ({ page }) => {
		const tournamentName = `Random32 ${Date.now()}`;
		testTournamentNames.push(tournamentName);

		await page.click('text=+ New Tournament');
		await page.fill('input[name="name"]', tournamentName);

		await page.click('input[value="32"]');

		await page.selectOption('select[name="numRounds"]', '2');
		await page.click('button[type="submit"]');

		await page.waitForURL(/\/tournament\/\d+\/players/);
		const players = Array.from({ length: 32 }, (_, i) => `Player${i + 1}`);
		await page.fill('textarea[name="names"]', players.join('\n'));
		await page.click('button:has-text("Add Players")');
		await page.click('button:has-text("Start Tournament")');
		await page.waitForURL(/\/tournament\/\d+/);

		await expect(page.locator('text=Round 1 of 2')).toBeVisible();

		const courtCards = await page.locator('.court-card').count();
		expect(courtCards).toBe(8);
	});

	test('Pre-Seed format accepts flexible name-with-points input', async ({ page }) => {
		const tournamentName = `FlexibleInput ${Date.now()}`;
		testTournamentNames.push(tournamentName);

		await page.click('text=+ New Tournament');
		await page.fill('input[name="name"]', tournamentName);

		await page.click('input[value="preseed"]');
		await page.click('button[type="submit"]');

		await page.waitForURL(/\/tournament\/\d+\/players/);

		const players = [
			'Nicholas Borchart\t142',
			'Ben Mester 42',
			'Markus Effinger  34',
			'Fabio Bahrs 30',
			'Jonas Negrini 24',
			'Kevin Meuter 16',
			'Bastian Binner 4',
			'Sascha Koch 0',
			'Emilian Sondermann 0',
			'Lenny Loonen 0',
			'Leon Löhrmann 0',
			'Christian Salz 0',
			'Ole Stegemann 0',
			'Jonathan Ater 0',
			'Martin Horsten 0',
			'Malte Koppelin 0'
		];
		await page.fill('textarea[name="names"]', players.join('\n'));
		await page.click('button:has-text("Add Players")');

		await page.waitForSelector('button:has-text("Start Tournament")', { timeout: 5000 });

		await expect(page.locator('text=142 pts')).toBeVisible();
		await expect(page.locator('text=Nicholas Borchart')).toBeVisible();
		await expect(page.locator('text=Ben Mester')).toBeVisible();
		await expect(page.locator('.seed', { hasText: /^42 pts$/ })).toBeVisible();
	});
});
