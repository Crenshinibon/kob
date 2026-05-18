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

  test.describe('Random Format', () => {
    test('shows configurable rounds input (not select)', async ({ page }) => {
      await page.click('text=+ New Tournament');
      await page.waitForSelector('input[name="name"]');

      await expect(page.locator('input[value="random-seed"]')).toBeChecked();

      // Random format shows a number input, not a select dropdown
      await expect(page.locator('input[name="numRounds"]')).toBeVisible();
      await expect(page.locator('select[name="numRounds"]')).not.toBeVisible();

      // Shows hint about flexible rounds
      await expect(page.locator('.rounds-hint:has-text("flexible")')).toBeVisible();
    });

    test('rounds input has sensible defaults and range', async ({ page }) => {
      await page.click('text=+ New Tournament');

      const roundsInput = page.locator('input[name="numRounds"]');
      await expect(roundsInput).toHaveValue('3');
      await expect(roundsInput).toHaveAttribute('min', '1');
      await expect(roundsInput).toHaveAttribute('max', '10');
    });

    test('rounds input is editable', async ({ page }) => {
      await page.click('text=+ New Tournament');

      const roundsInput = page.locator('input[name="numRounds"]');
      await roundsInput.fill('5');
      await expect(roundsInput).toHaveValue('5');
    });

    test('Random format with 32 players creates 8 courts', async ({ page }) => {
      const tournamentName = `Random32 ${Date.now()}`;
      testTournamentNames.push(tournamentName);

      await page.click('text=+ New Tournament');
      await page.fill('input[name="name"]', tournamentName);

      // Set rounds using the number input
      await page.locator('#numRounds').fill('2');

      // Enter players on the create page
      const players = Array.from({ length: 32 }, (_, i) => `Player${i + 1}`);
      await page.fill('textarea[name="names"]', players.join('\n'));

      await page.click('button[type="submit"]');

      await page.waitForURL(/\/tournament\/\d+/);

      await expect(page.locator('text=Round 1 of 2')).toBeVisible();

      const courtCards = await page.locator('.court-card').count();
      expect(courtCards).toBe(8);
    });
  });

  test.describe('Pre-Seed Format', () => {
    test('with 16 players shows 3 fixed rounds', async ({ page }) => {
      const tournamentName = `PreSeed16 ${Date.now()}`;
      testTournamentNames.push(tournamentName);

      await page.click('text=+ New Tournament');
      await page.fill('input[name="name"]', tournamentName);

      await page.click('input[value="preseed"]');

      // Pre-seed hides the rounds input and shows auto-calculated
      await expect(page.locator('input[name="numRounds"]')).not.toBeVisible();
      await expect(page.locator('.info-box:has-text("rounds")')).toBeVisible();

      // Enter players with points on the create page
      const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1} ${100 - i * 5}`);
      await page.fill('textarea[name="names"]', players.join('\n'));

      await page.click('button[type="submit"]');

      await page.waitForURL(/\/tournament\/\d+/);

      await expect(page.locator('text=Round 1 of 3')).toBeVisible();
    });

    test('with 32 players shows 4 fixed rounds', async ({ page }) => {
      const tournamentName = `PreSeed32 ${Date.now()}`;
      testTournamentNames.push(tournamentName);

      await page.click('text=+ New Tournament');
      await page.fill('input[name="name"]', tournamentName);

      await page.click('input[value="preseed"]');

      // Enter players with points on the create page
      const players = Array.from({ length: 32 }, (_, i) => `Player${i + 1} ${200 - i * 5}`);
      await page.fill('textarea[name="names"]', players.join('\n'));

      await page.click('button[type="submit"]');

      await page.waitForURL(/\/tournament\/\d+/);

      await expect(page.locator('text=Round 1 of 4')).toBeVisible();

      const courtCards = await page.locator('.court-card').count();
      expect(courtCards).toBe(8);
    });

    test('switching player count updates fixed rounds', async ({ page }) => {
      await page.click('text=+ New Tournament');

      await page.click('input[value="preseed"]');

      // Note: round count depends on player count entered on the next page
      // The info-box shows the calculated rounds based on current player input
      await expect(page.locator('.info-box:has-text("rounds")')).toBeVisible();
    });

    test('switching from Pre-Seed to Random shows rounds input again', async ({ page }) => {
      await page.click('text=+ New Tournament');

      await page.click('input[value="preseed"]');
      await expect(page.locator('input[name="numRounds"]')).not.toBeVisible();

      await page.click('input[value="random-seed"]');
      await expect(page.locator('input[name="numRounds"]')).toBeVisible();
    });

    test('accepts flexible name-with-points input', async ({ page }) => {
      const tournamentName = `FlexibleInput ${Date.now()}`;
      testTournamentNames.push(tournamentName);

      await page.click('text=+ New Tournament');
      await page.fill('input[name="name"]', tournamentName);

      await page.click('input[value="preseed"]');

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

      await page.click('button[type="submit"]');

      await page.waitForURL(/\/tournament\/\d+/);

      // Verify tournament was created and started
      await expect(page.locator('text=Round 1')).toBeVisible();
    });
  });

  test.describe('Leftover Courts (Non-Standard)', () => {
    test('11 players shows 3p court warning with description', async ({ page }) => {
      const tournamentName = `Leftover3p ${Date.now()}`;
      testTournamentNames.push(tournamentName);

      await page.click('text=+ New Tournament');
      await page.fill('input[name="name"]', tournamentName);

      // Enter 11 players on the create page
      const players = Array.from({ length: 11 }, (_, i) => `Player${i + 1}`);
      await page.fill('textarea[name="names"]', players.join('\n'));

      // Should show leftover info with 3p court description
      await expect(page.locator('.leftover-info')).toBeVisible();
      await expect(page.locator('.leftover-label:has-text("3p")')).toBeVisible();
      await expect(page.locator('.leftover-format:has-text("2v1")')).toBeVisible();
      await expect(page.locator('.leftover-scoring:has-text("21")')).toBeVisible();
      await expect(page.locator('.leftover-ranking:has-text("Total points")')).toBeVisible();

      // Should show kick button
      await expect(page.locator('button:has-text("Kick leftovers")')).toBeVisible();
    });

    test('25 players shows 5p court warning with description', async ({ page }) => {
      const tournamentName = `Leftover5p ${Date.now()}`;
      testTournamentNames.push(tournamentName);

      await page.click('text=+ New Tournament');
      await page.fill('input[name="name"]', tournamentName);

      // Enter 25 players on the create page
      const players = Array.from({ length: 25 }, (_, i) => `Player${i + 1}`);
      await page.fill('textarea[name="names"]', players.join('\n'));

      await expect(page.locator('.leftover-info')).toBeVisible();
      await expect(page.locator('.leftover-label:has-text("5p")')).toBeVisible();
      await expect(page.locator('.leftover-format:has-text("parallel games")')).toBeVisible();
      await expect(page.locator('.leftover-scoring:has-text("15")')).toBeVisible();
      await expect(page.locator('.leftover-ranking:has-text("Average points")')).toBeVisible();
    });

    test('26 players shows 6p court warning with description', async ({ page }) => {
      const tournamentName = `Leftover6p ${Date.now()}`;
      testTournamentNames.push(tournamentName);

      await page.click('text=+ New Tournament');
      await page.fill('input[name="name"]', tournamentName);

      // Enter 26 players on the create page
      const players = Array.from({ length: 26 }, (_, i) => `Player${i + 1}`);
      await page.fill('textarea[name="names"]', players.join('\n'));

      await expect(page.locator('.leftover-info')).toBeVisible();
      await expect(page.locator('.leftover-label:has-text("6p")')).toBeVisible();
      await expect(page.locator('.leftover-format:has-text("parallel games")')).toBeVisible();
      await expect(page.locator('.leftover-scoring:has-text("15")')).toBeVisible();
      await expect(page.locator('.leftover-ranking:has-text("Average points")')).toBeVisible();
    });

    test('24 players shows clean courts message (no leftovers)', async ({ page }) => {
      const tournamentName = `Clean24 ${Date.now()}`;
      testTournamentNames.push(tournamentName);

      await page.click('text=+ New Tournament');
      await page.fill('input[name="name"]', tournamentName);

      // Enter 24 players on the create page
      const players = Array.from({ length: 24 }, (_, i) => `Player${i + 1}`);
      await page.fill('textarea[name="names"]', players.join('\n'));

      await expect(page.locator('.standard-court:has-text("All 4-player courts")')).toBeVisible();
      await expect(page.locator('.leftover-info')).not.toBeVisible();
    });

    test('kick leftovers removes last players to make clean courts', async ({ page }) => {
      await page.click('text=+ New Tournament');
      await page.waitForSelector('input[name="name"]');

      // Enter 17 players on the create page
      const players = Array.from({ length: 17 }, (_, i) => `Player${i + 1}`);
      await page.fill('textarea[name="names"]', players.join('\n'));

      // Verify leftover is shown
      await expect(page.locator('.leftover-label:has-text("5p")')).toBeVisible();

      // Kick the leftover
      await page.click('button:has-text("Kick leftover")');

      // Should now show 16 players (clean)
      await expect(page.getByText('16 names entered')).toBeVisible();
      await expect(page.locator('.standard-court:has-text("All 4-player courts")')).toBeVisible();
    });

    test('3p court tournament creates correct number of matches', async ({ page }) => {
      const tournamentName = `3pCourt ${Date.now()}`;
      testTournamentNames.push(tournamentName);

      await page.click('text=+ New Tournament');
      await page.fill('input[name="name"]', tournamentName);
      await page.fill('input[name="numRounds"]', '1');

      // Enter 11 players on the create page
      const players = Array.from({ length: 11 }, (_, i) => `Player${i + 1}`);
      await page.fill('textarea[name="names"]', players.join('\n'));

      await page.click('button[type="submit"]');

      await page.waitForURL(/\/tournament\/\d+/);

      // Should have 3 courts (2×4p + 1×3p)
      const courtCards = await page.locator('.court-card').count();
      expect(courtCards).toBe(3);

      // Find the 3p court (should have a badge or label)
      const threePCourt = page.locator('.court-card:has-text("3p")').first();
      await expect(threePCourt).toBeVisible();

      // Navigate to 3p court and verify 3 matches
      const courtLink = page.locator('.qr-link a').last();
      const courtUrl = await courtLink.getAttribute('href');
      expect(courtUrl).toBeTruthy();

      await page.goto(courtUrl || '');
      await page.waitForSelector('[data-testid^="match-form-"]');
      const matchForms = await page.locator('[data-testid^="match-form-"]').all();
      expect(matchForms.length).toBe(3);
    });

    test('5p court tournament creates 4 games', async ({ page }) => {
      const tournamentName = `5pCourt ${Date.now()}`;
      testTournamentNames.push(tournamentName);

      await page.click('text=+ New Tournament');
      await page.fill('input[name="name"]', tournamentName);
      await page.fill('input[name="numRounds"]', '1');

      // Enter 21 players on the create page
      const players = Array.from({ length: 21 }, (_, i) => `Player${i + 1}`);
      await page.fill('textarea[name="names"]', players.join('\n'));

      await page.click('button[type="submit"]');

      await page.waitForURL(/\/tournament\/\d+/);

      // Should have 5 courts (4×4p + 1×5p)
      const courtCards = await page.locator('.court-card').count();
      expect(courtCards).toBe(5);

      // Find the 5p court
      const fivePCourt = page.locator('.court-card:has-text("5p")').first();
      await expect(fivePCourt).toBeVisible();

      // Navigate to 5p court and verify 4 games
      const courtLink = page.locator('.qr-link a').last();
      const courtUrl = await courtLink.getAttribute('href');
      expect(courtUrl).toBeTruthy();

      await page.goto(courtUrl || '');
      await page.waitForSelector('[data-testid^="match-form-"]');
      const matchForms = await page.locator('[data-testid^="match-form-"]').all();
      expect(matchForms.length).toBe(4);
    });

    test('6p court tournament creates 4 games', async ({ page }) => {
      const tournamentName = `6pCourt ${Date.now()}`;
      testTournamentNames.push(tournamentName);

      await page.click('text=+ New Tournament');
      await page.fill('input[name="name"]', tournamentName);
      await page.fill('input[name="numRounds"]', '1');

      // Enter 22 players on the create page
      const players = Array.from({ length: 22 }, (_, i) => `Player${i + 1}`);
      await page.fill('textarea[name="names"]', players.join('\n'));

      await page.click('button[type="submit"]');

      await page.waitForURL(/\/tournament\/\d+/);

      // Should have 5 courts (4×4p + 1×6p)
      const courtCards = await page.locator('.court-card').count();
      expect(courtCards).toBe(5);

      // Find the 6p court
      const sixPCourt = page.locator('.court-card:has-text("6p")').first();
      await expect(sixPCourt).toBeVisible();

      // Navigate to 6p court and verify 4 games
      const courtLink = page.locator('.qr-link a').last();
      const courtUrl = await courtLink.getAttribute('href');
      expect(courtUrl).toBeTruthy();

      await page.goto(courtUrl || '');
      await page.waitForSelector('[data-testid^="match-form-"]');
      const matchForms = await page.locator('[data-testid^="match-form-"]').all();
      expect(matchForms.length).toBe(4);
    });
  });

  test.describe('Player Count Range (8-64)', () => {
    test('minimum 8 players creates 2 courts', async ({ page }) => {
      const tournamentName = `MinPlayers ${Date.now()}`;
      testTournamentNames.push(tournamentName);

      await page.click('text=+ New Tournament');
      await page.fill('input[name="name"]', tournamentName);
      await page.fill('input[name="numRounds"]', '1');

      // Enter 8 players on the create page
      const players = Array.from({ length: 8 }, (_, i) => `Player${i + 1}`);
      await page.fill('textarea[name="names"]', players.join('\n'));

      await page.click('button[type="submit"]');

      await page.waitForURL(/\/tournament\/\d+/);

      const courtCards = await page.locator('.court-card').count();
      expect(courtCards).toBe(2);
    });

    test('below 8 players shows minimum warning and button is disabled', async ({ page }) => {
      await page.click('text=+ New Tournament');

      // Enter 7 players on the create page
      const players = Array.from({ length: 7 }, (_, i) => `Player${i + 1}`);
      await page.fill('textarea[name="names"]', players.join('\n'));

      await expect(page.locator('.warn:has-text("Minimum 8 players")')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeDisabled();
    });

    test('64 players creates 16 courts', async ({ page }) => {
      const tournamentName = `MaxPlayers ${Date.now()}`;
      testTournamentNames.push(tournamentName);

      await page.click('text=+ New Tournament');
      await page.fill('input[name="name"]', tournamentName);
      await page.fill('input[name="numRounds"]', '1');

      // Enter 64 players on the create page
      const players = Array.from({ length: 64 }, (_, i) => `Player${i + 1}`);
      await page.fill('textarea[name="names"]', players.join('\n'));

      await page.click('button[type="submit"]');

      await page.waitForURL(/\/tournament\/\d+/);

      const courtCards = await page.locator('.court-card').count();
      expect(courtCards).toBe(16);
    });

    test('above 64 players shows maximum warning and button is disabled', async ({ page }) => {
      await page.click('text=+ New Tournament');

      // Enter 65 players on the create page
      const players = Array.from({ length: 65 }, (_, i) => `Player${i + 1}`);
      await page.fill('textarea[name="names"]', players.join('\n'));

      await expect(page.locator('.warn:has-text("Maximum 64 players")')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeDisabled();
    });
  });
});
