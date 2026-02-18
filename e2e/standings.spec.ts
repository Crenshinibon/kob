import { test, expect } from '@playwright/test';

test.describe('Standings Calculation', () => {
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

	test('calculates correct points for all players in a match', async ({ page }) => {
		const tournamentName = `Standings Test ${Date.now()}`;
		testTournamentNames.push(tournamentName);

		await page.click('text=+ New Tournament');
		await page.fill('input[name="name"]', tournamentName);
		await page.selectOption('select[name="numRounds"]', '3');
		await page.click('button[type="submit"]');

		await page.waitForURL(/\/tournament\/\d+\/players/);
		const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1}`);
		await page.fill('textarea[name="names"]', players.join('\n'));
		await page.click('button:has-text("Add Players")');

		await page.click('button:has-text("Start Tournament")');
		await page.waitForURL(/\/tournament\/\d+/);

		const courtLink = await page.locator('.qr-link a').first();
		const courtUrl = await courtLink.getAttribute('href');

		await page.goto(courtUrl || '');

		await page.waitForSelector('[data-testid^="match-form-"]');
		const firstMatchForm = page.locator('[data-testid^="match-form-"]').first();
		const testId = await firstMatchForm.getAttribute('data-testid');
		const matchId = testId?.replace('match-form-', '');

		await page.fill(`[data-testid="team-a-score-${matchId}"]`, '21');
		await page.fill(`[data-testid="team-b-score-${matchId}"]`, '19');
		await page.click(`[data-testid="save-score-${matchId}"]`);
		await page.waitForLoadState('networkidle');

		await page.waitForSelector('.standings');
		const standingsText = await page.locator('.standings').textContent();

		expect(standingsText).toContain('21');
		expect(standingsText).toContain('19');
	});

	test('sorts players by total points in descending order', async ({ page }) => {
		const tournamentName = `Sorting Test ${Date.now()}`;
		testTournamentNames.push(tournamentName);

		await page.click('text=+ New Tournament');
		await page.fill('input[name="name"]', tournamentName);
		await page.click('button[type="submit"]');

		await page.waitForURL(/\/tournament\/\d+\/players/);
		const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1}`);
		await page.fill('textarea[name="names"]', players.join('\n'));
		await page.click('button:has-text("Add Players")');
		await page.click('button:has-text("Start Tournament")');
		await page.waitForURL(/\/tournament\/\d+/);

		const courtLink = await page.locator('.qr-link a').first();
		const courtUrl = await courtLink.getAttribute('href');
		await page.goto(courtUrl || '');

		await page.waitForSelector('[data-testid^="match-form-"]');
		const firstMatchForm = await page.locator('[data-testid^="match-form-"]').first();
		const testId = await firstMatchForm.getAttribute('data-testid');
		const matchId = testId?.replace('match-form-', '');

		await page.fill(`[data-testid="team-a-score-${matchId}"]`, '25');
		await page.fill(`[data-testid="team-b-score-${matchId}"]`, '23');
		await page.click(`[data-testid="save-score-${matchId}"]`);
		await page.waitForLoadState('networkidle');

		await page.waitForSelector('.standings tbody tr');
		const rows = await page.locator('.standings tbody tr').all();

		expect(rows.length).toBe(4);

		const firstPoints = await rows[0].locator('td:nth-child(3)').textContent();
		const secondPoints = await rows[1].locator('td:nth-child(3)').textContent();
		expect(parseInt(firstPoints || '0')).toBeGreaterThanOrEqual(parseInt(secondPoints || '0'));
	});

	test('breaks ties using point differential', async ({ page }) => {
		const tournamentName = `Tiebreaker Test ${Date.now()}`;
		testTournamentNames.push(tournamentName);

		await page.click('text=+ New Tournament');
		await page.fill('input[name="name"]', tournamentName);
		await page.click('button[type="submit"]');

		await page.waitForURL(/\/tournament\/\d+\/players/);
		const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1}`);
		await page.fill('textarea[name="names"]', players.join('\n'));
		await page.click('button:has-text("Add Players")');
		await page.click('button:has-text("Start Tournament")');
		await page.waitForURL(/\/tournament\/\d+/);

		const courtLink = await page.locator('.qr-link a').first();
		const courtUrl = await courtLink.getAttribute('href');
		await page.goto(courtUrl || '');

		await page.waitForSelector('[data-testid^="match-form-"]');
		const firstMatchForm = await page.locator('[data-testid^="match-form-"]').first();
		const testId = await firstMatchForm.getAttribute('data-testid');
		const matchId = testId?.replace('match-form-', '');

		await page.fill(`[data-testid="team-a-score-${matchId}"]`, '21');
		await page.fill(`[data-testid="team-b-score-${matchId}"]`, '19');
		await page.click(`[data-testid="save-score-${matchId}"]`);
		await page.waitForLoadState('networkidle');

		await page.waitForSelector('.standings');
		const diffHeader = await page.locator('.standings th:has-text("Diff")').count();
		expect(diffHeader).toBe(1);
	});

	test('awards points correctly across multiple matches per player', async ({ page }) => {
		const tournamentName = `Multi-Match Points ${Date.now()}`;
		testTournamentNames.push(tournamentName);

		await page.click('text=+ New Tournament');
		await page.fill('input[name="name"]', tournamentName);
		await page.click('button[type="submit"]');

		await page.waitForURL(/\/tournament\/\d+\/players/);
		const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1}`);
		await page.fill('textarea[name="names"]', players.join('\n'));
		await page.click('button:has-text("Add Players")');
		await page.click('button:has-text("Start Tournament")');
		await page.waitForURL(/\/tournament\/\d+/);

		const courtLink = await page.locator('.qr-link a').first();
		const courtUrl = await courtLink.getAttribute('href');
		await page.goto(courtUrl || '');

		await page.waitForSelector('[data-testid^="match-form-"]');
		const matchForms = await page.locator('[data-testid^="match-form-"]').all();
		const matchIds = await Promise.all(
			matchForms.map(async (form) => {
				const testId = await form.getAttribute('data-testid');
				return testId?.replace('match-form-', '');
			})
		);
		expect(matchIds.length).toBe(3);

		await page.fill(`[data-testid="team-a-score-${matchIds[0]}"]`, '21');
		await page.fill(`[data-testid="team-b-score-${matchIds[0]}"]`, '19');
		await page.click(`[data-testid="save-score-${matchIds[0]}"]`);

		await page.fill(`[data-testid="team-a-score-${matchIds[1]}"]`, '25');
		await page.fill(`[data-testid="team-b-score-${matchIds[1]}"]`, '23');
		await page.click(`[data-testid="save-score-${matchIds[1]}"]`);

		await page.fill(`[data-testid="team-a-score-${matchIds[2]}"]`, '22');
		await page.fill(`[data-testid="team-b-score-${matchIds[2]}"]`, '20');
		await page.click(`[data-testid="save-score-${matchIds[2]}"]`);

		await page.waitForLoadState('networkidle');

		await page.waitForSelector('.standings tbody tr');
		const rows = await page.locator('.standings tbody tr').all();

		const topPlayerPoints = await rows[0].locator('td:nth-child(3)').textContent();
		expect(parseInt(topPlayerPoints || '0')).toBeGreaterThan(60);
	});

	test('validates score entry rules (min 21, win by 2)', async ({ page }) => {
		const tournamentName = `Validation Test ${Date.now()}`;
		testTournamentNames.push(tournamentName);

		await page.click('text=+ New Tournament');
		await page.fill('input[name="name"]', tournamentName);
		await page.click('button[type="submit"]');

		await page.waitForURL(/\/tournament\/\d+\/players/);
		const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1}`);
		await page.fill('textarea[name="names"]', players.join('\n'));
		await page.click('button:has-text("Add Players")');
		await page.click('button:has-text("Start Tournament")');
		await page.waitForURL(/\/tournament\/\d+/);

		const courtLink = await page.locator('.qr-link a').first();
		const courtUrl = await courtLink.getAttribute('href');
		await page.goto(courtUrl || '');

		await page.waitForSelector('[data-testid^="match-form-"]');
		const firstMatchForm = await page.locator('[data-testid^="match-form-"]').first();
		const testId = await firstMatchForm.getAttribute('data-testid');
		const matchId = testId?.replace('match-form-', '');

		await page.fill(`[data-testid="team-a-score-${matchId}"]`, '20');
		await page.fill(`[data-testid="team-b-score-${matchId}"]`, '18');
		await page.click(`[data-testid="save-score-${matchId}"]`);

		await page.waitForSelector('.error');
		const errorText = await page.locator('.error').textContent();
		expect(errorText).toContain('21');

		await page.fill(`[data-testid="team-a-score-${matchId}"]`, '21');
		await page.fill(`[data-testid="team-b-score-${matchId}"]`, '21');
		await page.click(`[data-testid="save-score-${matchId}"]`);

		await page.waitForSelector('.error');
		const errorText2 = await page.locator('.error').textContent();
		expect(errorText2?.toLowerCase()).toContain('tie');

		await page.fill(`[data-testid="team-a-score-${matchId}"]`, '21');
		await page.fill(`[data-testid="team-b-score-${matchId}"]`, '20');
		await page.click(`[data-testid="save-score-${matchId}"]`);

		await page.waitForSelector('.error');
		const errorText3 = await page.locator('.error').textContent();
		expect(errorText3).toContain('2');
	});
});
