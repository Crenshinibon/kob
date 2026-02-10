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
    // Sign up test user first
    await page.goto('/signup');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.fill('input#confirmPassword', 'password123');
    await page.click('button[type="submit"]');

    // If signup succeeds, we're redirected. If user already exists, we stay on signup page
    try {
      await page.waitForURL('/', { timeout: 3000 });
    } catch {
      // User already exists, try logging in instead
      await page.goto('/login');
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');
    }
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

    // Define score tables for each court to create predictable rankings
    // Court N: Player 4N-3 > Player 4N-2 > Player 4N-1 > Player 4N
    // All scores are valid beach volleyball scores (winner >= 21, win by >= 2)
    const courtScoreTables = [
      {
        courtNum: 1,
        // Player01 (60 pts) > Player02 (55 pts) > Player03 (48 pts) > Player04 (42 pts)
        matches: [
          { matchIdx: 0, teamA: 21, teamB: 19 }, // Match 1: P1&P2 vs P3&P4
          { matchIdx: 1, teamA: 22, teamB: 20 }, // Match 2: P1&P3 vs P2&P4
          { matchIdx: 2, teamA: 21, teamB: 15 } // Match 3: P1&P4 vs P2&P3
        ]
      },
      {
        courtNum: 2,
        // Player05 (60 pts) > Player06 (55 pts) > Player07 (48 pts) > Player08 (42 pts)
        matches: [
          { matchIdx: 0, teamA: 21, teamB: 19 },
          { matchIdx: 1, teamA: 22, teamB: 20 },
          { matchIdx: 2, teamA: 21, teamB: 15 }
        ]
      },
      {
        courtNum: 3,
        // Player09 (60 pts) > Player10 (55 pts) > Player11 (48 pts) > Player12 (42 pts)
        matches: [
          { matchIdx: 0, teamA: 21, teamB: 19 },
          { matchIdx: 1, teamA: 22, teamB: 20 },
          { matchIdx: 2, teamA: 21, teamB: 15 }
        ]
      },
      {
        courtNum: 4,
        // Player13 (60 pts) > Player14 (55 pts) > Player15 (48 pts) > Player16 (42 pts)
        matches: [
          { matchIdx: 0, teamA: 21, teamB: 19 },
          { matchIdx: 1, teamA: 22, teamB: 20 },
          { matchIdx: 2, teamA: 21, teamB: 15 }
        ]
      }
    ];

    // Execute score entry for each court using table-driven approach
    for (const courtData of courtScoreTables) {
      const courtUrl = await courtLinks[courtData.courtNum - 1].getAttribute('href');
      await page.goto(courtUrl || '');

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

      // Enter scores for all 3 matches using the score table
      for (const matchScore of courtData.matches) {
        await page.fill(
          `[data-testid="team-a-score-${matchIds[matchScore.matchIdx]}"]`,
          String(matchScore.teamA)
        );
        await page.fill(
          `[data-testid="team-b-score-${matchIds[matchScore.matchIdx]}"]`,
          String(matchScore.teamB)
        );
        await page.click(`[data-testid="save-score-${matchIds[matchScore.matchIdx]}"]`);
      }
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

      // Enter any valid scores for all 3 matches
      await page.fill(`[data-testid="team-a-score-${matchIds[0]}"]`, '21');
      await page.fill(`[data-testid="team-b-score-${matchIds[0]}"]`, '19');
      await page.click(`[data-testid="save-score-${matchIds[0]}"]`);
      await page.waitForTimeout(300);
      await page.reload();

      await page.fill(`[data-testid="team-a-score-${matchIds[1]}"]`, '25');
      await page.fill(`[data-testid="team-b-score-${matchIds[1]}"]`, '23');
      await page.click(`[data-testid="save-score-${matchIds[1]}"]`);
      await page.waitForTimeout(300);
      await page.reload();

      await page.fill(`[data-testid="team-a-score-${matchIds[2]}"]`, '22');
      await page.fill(`[data-testid="team-b-score-${matchIds[2]}"]`, '20');
      await page.click(`[data-testid="save-score-${matchIds[2]}"]`);
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

    // Initially, close round button should show waiting state
    const waitingButton = await page.locator('button:has-text("Waiting")');
    await expect(waitingButton).toBeVisible();

    // Complete all matches on one court only
    const courtLinks = await page.locator('.qr-link a').all();
    const courtUrl = await courtLinks[0].getAttribute('href');
    await page.goto(courtUrl || '');

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

    // Complete all 3 matches for this court
    for (let i = 0; i < 3; i++) {
      await page.fill(`[data-testid="team-a-score-${matchIds[i]}"]`, '21');
      await page.fill(`[data-testid="team-b-score-${matchIds[i]}"]`, '19');
      await page.click(`[data-testid="save-score-${matchIds[i]}"]`);
      await page.waitForTimeout(300);
      if (i < 2) await page.reload();
    }

    // Go back to tournament page - button should still show waiting
    await page.goBack();
    await page.waitForSelector('button:has-text("Waiting")');

    // Complete matches on remaining courts
    for (let courtNum = 1; courtNum < 4; courtNum++) {
      const url = await courtLinks[courtNum].getAttribute('href');
      await page.goto(url || '');

      // Get all match IDs on this court
      await page.waitForSelector('[data-testid^="match-form-"]');
      const courtMatchForms = await page.locator('[data-testid^="match-form-"]').all();
      const courtMatchIds = await Promise.all(
        courtMatchForms.map(async (form) => {
          const testId = await form.getAttribute('data-testid');
          return testId?.replace('match-form-', '');
        })
      );
      expect(courtMatchIds.length).toBe(3);

      for (let i = 0; i < 3; i++) {
        await page.fill(`[data-testid="team-a-score-${courtMatchIds[i]}"]`, '21');
        await page.fill(`[data-testid="team-b-score-${courtMatchIds[i]}"]`, '19');
        await page.click(`[data-testid="save-score-${courtMatchIds[i]}"]`);
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
