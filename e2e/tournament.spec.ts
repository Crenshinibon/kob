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

    // 1. Create tournament
    await page.click('text=+ New Tournament');
    await page.fill('input[name="name"]', tournamentName);
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

    // Create tournament as logged-in user
    await page.click('text=+ New Tournament');
    await page.fill('input[name="name"]', tournamentName);
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

    // Create active tournament
    await page.click('text=+ New Tournament');
    await page.fill('input[name="name"]', activeTournamentName);
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
    await page.fill('input[name="name"]', draftTournamentName);
    await page.click('button[type="submit"]');
    // Don't add players - leave it in draft

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
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/tournament\/\d+\/players/);

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
});
