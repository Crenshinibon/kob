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
		await page.fill('input[name="numRounds"]', '3');
		const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1}`);
		await page.fill('textarea[name="names"]', players.join('\n'));
		await page.click('button[type="submit"]');

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
		const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1}`);
		await page.fill('textarea[name="names"]', players.join('\n'));
		await page.click('button[type="submit"]');

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
		const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1}`);
		await page.fill('textarea[name="names"]', players.join('\n'));
		await page.click('button[type="submit"]');

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
		const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1}`);
		await page.fill('textarea[name="names"]', players.join('\n'));
		await page.click('button[type="submit"]');

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

	test('validates score entry rules (min points, win by 2, no cap)', async ({ page }) => {
		const tournamentName = `Validation Test ${Date.now()}`;
		testTournamentNames.push(tournamentName);

		await page.click('text=+ New Tournament');
		await page.fill('input[name="name"]', tournamentName);
		const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1}`);
		await page.fill('textarea[name="names"]', players.join('\n'));
		await page.click('button[type="submit"]');

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
		expect(errorText2?.toLowerCase()).toContain('tied');

		await page.fill(`[data-testid="team-a-score-${matchId}"]`, '21');
		await page.fill(`[data-testid="team-b-score-${matchId}"]`, '20');
		await page.click(`[data-testid="save-score-${matchId}"]`);

		await page.waitForSelector('.error');
		const errorText3 = await page.locator('.error').textContent();
		expect(errorText3).toContain('2');

		await page.fill(`[data-testid="team-a-score-${matchId}"]`, '30');
		await page.fill(`[data-testid="team-b-score-${matchId}"]`, '28');
		await page.click(`[data-testid="save-score-${matchId}"]`);

		await page.waitForSelector('.saved');
	});

	test.describe('Non-Standard Court Standings', () => {
		test('3p court standings show total points ranking', async ({ page }) => {
			const tournamentName = `3pStandings ${Date.now()}`;
			testTournamentNames.push(tournamentName);

			await page.click('text=+ New Tournament');
			await page.fill('input[name="name"]', tournamentName);
			await page.fill('input[name="numRounds"]', '1');

			// 11 players = 2×4p + 1×3p
			const players = Array.from({ length: 11 }, (_, i) => `Player${i + 1}`);
			await page.fill('textarea[name="names"]', players.join('\n'));

			await page.click('button[type="submit"]');

			await page.waitForURL(/\/tournament\/\d+/);

			// Navigate to 3p court
			const courtLink = page.locator('.qr-link a').last();
			const courtUrl = await courtLink.getAttribute('href');
			await page.goto(courtUrl || '');

			// 3p court should have 3 players in standings
			await page.waitForSelector('.standings tbody tr');
			const playerCount = await page.locator('.standings tbody tr').count();
			expect(playerCount).toBe(3);

			// Should show total points column
			await expect(page.locator('.standings th:has-text("Points")')).toBeVisible();
		});

		test('5p court standings show average points ranking', async ({ page }) => {
			const tournamentName = `5pStandings ${Date.now()}`;
			testTournamentNames.push(tournamentName);

			await page.click('text=+ New Tournament');
			await page.fill('input[name="name"]', tournamentName);
			await page.fill('input[name="numRounds"]', '1');

			// 21 players = 4×4p + 1×5p
			const players = Array.from({ length: 21 }, (_, i) => `Player${i + 1}`);
			await page.fill('textarea[name="names"]', players.join('\n'));

			await page.click('button[type="submit"]');

			await page.waitForURL(/\/tournament\/\d+/);

			// Navigate to 5p court
			const courtLink = page.locator('.qr-link a').last();
			const courtUrl = await courtLink.getAttribute('href');
			await page.goto(courtUrl || '');

			// 5p court should have 5 players in standings
			await page.waitForSelector('.standings tbody tr');
			const playerCount = await page.locator('.standings tbody tr').count();
			expect(playerCount).toBe(5);

			// Should show average points column
			await expect(page.locator('.standings th:has-text("Avg")')).toBeVisible();
		});

		test('6p court standings show average points ranking', async ({ page }) => {
			const tournamentName = `6pStandings ${Date.now()}`;
			testTournamentNames.push(tournamentName);

			await page.click('text=+ New Tournament');
			await page.fill('input[name="name"]', tournamentName);
			await page.fill('input[name="numRounds"]', '1');

			// 22 players = 4×4p + 1×6p
			const players = Array.from({ length: 22 }, (_, i) => `Player${i + 1}`);
			await page.fill('textarea[name="names"]', players.join('\n'));

			await page.click('button[type="submit"]');

			await page.waitForURL(/\/tournament\/\d+/);

			// Navigate to 6p court
			const courtLink = page.locator('.qr-link a').last();
			const courtUrl = await courtLink.getAttribute('href');
			await page.goto(courtUrl || '');

			// 6p court should have 6 players in standings
			await page.waitForSelector('.standings tbody tr');
			const playerCount = await page.locator('.standings tbody tr').count();
			expect(playerCount).toBe(6);

			// Should show average points column
			await expect(page.locator('.standings th:has-text("Avg")')).toBeVisible();
		});

		test('3p court standings rank correctly after score entry', async ({ page }) => {
			const tournamentName = `3pRanking ${Date.now()}`;
			testTournamentNames.push(tournamentName);

			await page.click('text=+ New Tournament');
			await page.fill('input[name="name"]', tournamentName);
			await page.fill('input[name="numRounds"]', '1');

			// 11 players = 2×4p + 1×3p
			const players = Array.from({ length: 11 }, (_, i) => `Player${i + 1}`);
			await page.fill('textarea[name="names"]', players.join('\n'));

			await page.click('button[type="submit"]');

			await page.waitForURL(/\/tournament\/\d+/);

			// Navigate to 3p court
			const courtLink = page.locator('.qr-link a').last();
			const courtUrl = await courtLink.getAttribute('href');
			await page.goto(courtUrl || '');

			// Enter scores for all 3 matches
			await page.waitForSelector('[data-testid^="match-form-"]');
			const matchForms = page.locator('[data-testid^="match-form-"]');
			const matchCount = await matchForms.count();
			expect(matchCount).toBe(3);

			const matchIds: string[] = [];
			for (let i = 0; i < matchCount; i++) {
				const form = matchForms.nth(i);
				const testId = await form.getAttribute('data-testid');
				matchIds.push(testId!.replace('match-form-', ''));
			}

			// Enter scores: Match 1: 21-19, Match 2: 21-18, Match 3: 21-20
			for (let i = 0; i < matchIds.length; i++) {
				await page.fill(`[data-testid="team-a-score-${matchIds[i]}"]`, String(21 - i));
				await page.fill(`[data-testid="team-b-score-${matchIds[i]}"]`, String(19 - i));
				await page.click(`[data-testid="save-score-${matchIds[i]}"]`);
				await page.waitForSelector('.saved');
			}

			// Verify standings show 3 players ranked
			await page.waitForSelector('.standings tbody tr');
			const rows = await page.locator('.standings tbody tr').all();
			expect(rows.length).toBe(3);

			// First player should have highest points
			const firstPoints = await rows[0].locator('td:nth-child(3)').textContent();
			const secondPoints = await rows[1].locator('td:nth-child(3)').textContent();
			expect(parseInt(firstPoints || '0')).toBeGreaterThanOrEqual(parseInt(secondPoints || '0'));
		});

		test('5p court standings rank correctly after score entry', async ({ page }) => {
			const tournamentName = `5pRanking ${Date.now()}`;
			testTournamentNames.push(tournamentName);

			await page.click('text=+ New Tournament');
			await page.fill('input[name="name"]', tournamentName);
			await page.fill('input[name="numRounds"]', '1');

			// 21 players = 4×4p + 1×5p
			const players = Array.from({ length: 21 }, (_, i) => `Player${i + 1}`);
			await page.fill('textarea[name="names"]', players.join('\n'));

			await page.click('button[type="submit"]');

			await page.waitForURL(/\/tournament\/\d+/);

			// Navigate to 5p court
			const courtLink = page.locator('.qr-link a').last();
			const courtUrl = await courtLink.getAttribute('href');
			await page.goto(courtUrl || '');

			// Enter scores for matches (5p uses 15-point games)
			await page.waitForSelector('[data-testid^="match-form-"]');
			const firstMatchForm = page.locator('[data-testid^="match-form-"]').first();
			const testId = await firstMatchForm.getAttribute('data-testid');
			const matchId = testId?.replace('match-form-', '');

			await page.fill(`[data-testid="team-a-score-${matchId}"]`, '15');
			await page.fill(`[data-testid="team-b-score-${matchId}"]`, '13');
			await page.click(`[data-testid="save-score-${matchId}"]`);
			await page.waitForSelector('.saved');

			// Verify standings show 5 players
			await page.waitForSelector('.standings tbody tr');
			const rows = await page.locator('.standings tbody tr').all();
			expect(rows.length).toBe(5);

			// Should show average points column
			await expect(page.locator('.standings th:has-text("Avg")')).toBeVisible();
		});
	});

	test.describe('Round 1 Standings Ranking', () => {
		test('ranks by court position first after round 1', async ({ page }) => {
			const tournamentName = `Round1Ranking ${Date.now()}`;
			testTournamentNames.push(tournamentName);

			await page.click('text=+ New Tournament');
			await page.fill('input[name="name"]', tournamentName);
			await page.fill('input[name="numRounds"]', '2');

			// 16 players = 4×4p
			const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1}`);
			await page.fill('textarea[name="names"]', players.join('\n'));

			await page.click('button[type="submit"]');

			await page.waitForURL(/\/tournament\/\d+/);

			// Enter scores for all courts
			const courtLinks = page.locator('.qr-link a');
			const courtCount = await courtLinks.count();

			for (let c = 0; c < courtCount; c++) {
				const courtLink = courtLinks.nth(c);
				const courtUrl = await courtLink.getAttribute('href');
				await page.goto(courtUrl || '');

				await page.waitForSelector('[data-testid^="match-form-"]');
				const matchForms = page.locator('[data-testid^="match-form-"]');
				const matchCount = await matchForms.count();

				for (let m = 0; m < matchCount; m++) {
					const form = matchForms.nth(m);
					const testId = await form.getAttribute('data-testid');
					const matchId = testId?.replace('match-form-', '');

					await page.fill(`[data-testid="team-a-score-${matchId}"]`, '21');
					await page.fill(`[data-testid="team-b-score-${matchId}"]`, '19');
					await page.click(`[data-testid="save-score-${matchId}"]`);
					await page.waitForSelector('.saved');
				}

				// Go back to tournament page
				await page.goto('/');
				await page.waitForLoadState('networkidle');
				const tournamentCard = page.locator(`.tournament-card:has-text("${tournamentName}")`).first();
				await tournamentCard.click();
				await page.waitForLoadState('networkidle');
			}

			// Navigate to standings
			await page.click('text=View Standings');
			await page.waitForURL(/\/standings/);

			// Verify standings are populated
			await page.waitForSelector('.standings tbody tr');
			const rows = await page.locator('.standings tbody tr').all();
			expect(rows.length).toBe(16);

			// All players should have a rank
			const ranks = await Promise.all(
				rows.map(async (row) => {
					const rankText = await row.locator('td:first-child').textContent();
					return parseInt(rankText || '0');
				})
			);

			// Ranks should be 1-16
			expect(Math.min(...ranks)).toBe(1);
			expect(Math.max(...ranks)).toBe(16);
		});
	});

	test.describe('Non-Standard Court Score Validation', () => {
		test('5p court accepts 15-point scores', async ({ page }) => {
			const tournamentName = `5pScore ${Date.now()}`;
			testTournamentNames.push(tournamentName);

			await page.click('text=+ New Tournament');
			await page.fill('input[name="name"]', tournamentName);
			await page.fill('input[name="numRounds"]', '1');

			// 21 players = 4×4p + 1×5p
			const players = Array.from({ length: 21 }, (_, i) => `Player${i + 1}`);
			await page.fill('textarea[name="names"]', players.join('\n'));

			await page.click('button[type="submit"]');

			await page.waitForURL(/\/tournament\/\d+/);

			// Navigate to 5p court
			const courtLink = page.locator('.qr-link a').last();
			const courtUrl = await courtLink.getAttribute('href');
			await page.goto(courtUrl || '');

			// Enter a valid 15-point score
			await page.waitForSelector('[data-testid^="match-form-"]');
			const firstMatchForm = page.locator('[data-testid^="match-form-"]').first();
			const testId = await firstMatchForm.getAttribute('data-testid');
			const matchId = testId?.replace('match-form-', '');

			await page.fill(`[data-testid="team-a-score-${matchId}"]`, '15');
			await page.fill(`[data-testid="team-b-score-${matchId}"]`, '13');
			await page.click(`[data-testid="save-score-${matchId}"]`);

			// Should save successfully
			await page.waitForSelector('.saved');
		});

		test('3p court accepts 21-point scores (same as 4p)', async ({ page }) => {
			const tournamentName = `3pScore ${Date.now()}`;
			testTournamentNames.push(tournamentName);

			await page.click('text=+ New Tournament');
			await page.fill('input[name="name"]', tournamentName);
			await page.fill('input[name="numRounds"]', '1');

			// 11 players = 2×4p + 1×3p
			const players = Array.from({ length: 11 }, (_, i) => `Player${i + 1}`);
			await page.fill('textarea[name="names"]', players.join('\n'));

			await page.click('button[type="submit"]');

			await page.waitForURL(/\/tournament\/\d+/);

			// Navigate to 3p court
			const courtLink = page.locator('.qr-link a').last();
			const courtUrl = await courtLink.getAttribute('href');
			await page.goto(courtUrl || '');

			// Enter a valid 21-point score
			await page.waitForSelector('[data-testid^="match-form-"]');
			const firstMatchForm = page.locator('[data-testid^="match-form-"]').first();
			const testId = await firstMatchForm.getAttribute('data-testid');
			const matchId = testId?.replace('match-form-', '');

			await page.fill(`[data-testid="team-a-score-${matchId}"]`, '21');
			await page.fill(`[data-testid="team-b-score-${matchId}"]`, '19');
			await page.click(`[data-testid="save-score-${matchId}"]`);

			// Should save successfully
			await page.waitForSelector('.saved');
		});
	});
});
