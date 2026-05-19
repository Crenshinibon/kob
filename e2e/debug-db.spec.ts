import { test, expect } from '@playwright/test';

test('debug database state after round advance', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
  
  // Create tournament
  await page.click('text=+ New Tournament');
  await page.fill('input[name="name"]', 'Debug DB');
  await page.fill('input[name="numRounds"]', '2');
  await page.fill('textarea[name="names"]', 'Player1\nPlayer2\nPlayer3\nPlayer4\nPlayer5\nPlayer6\nPlayer7\nPlayer8\nPlayer9\nPlayer10\nPlayer11\nPlayer12\nPlayer13\nPlayer14\nPlayer15\nPlayer16');
  await page.click('button[type="submit"]');
  
  await page.waitForURL(/\/tournament\/\d+/);
  const tournamentId = page.url().match(/\/tournament\/(\d+)/)?.[1];
  
  // Complete Round 1
  const courtUrls: string[] = [];
  for (let i = 0; i < 4; i++) {
    const href = await page.locator('.qr-link a').nth(i).getAttribute('href');
    if (href) courtUrls.push(href);
  }
  
  for (const courtUrl of courtUrls) {
    await page.goto(courtUrl);
    await page.waitForSelector('[data-testid^="match-form-"]');
    
    const matchForms = await page.locator('[data-testid^="match-form-"]').all();
    const matchIds = await Promise.all(matchForms.map(async (f) => (await f.getAttribute('data-testid'))?.replace('match-form-', '')));
    
    for (const matchId of matchIds) {
      await page.fill(`[data-testid="team-a-score-${matchId}"]`, '21');
      await page.fill(`[data-testid="team-b-score-${matchId}"]`, '19');
      await page.click(`[data-testid="save-score-${matchId}"]`);
      await page.waitForSelector('.saved');
    }
  }
  
  // Advance to Round 2
  await page.goto(`/tournament/${tournamentId}`);
  await page.waitForSelector('button:has-text("Close Round & Advance"):not(:disabled)');
  await page.click('button:has-text("Close Round & Advance")');
  await page.waitForSelector('text=Round 2 of 2');
  await page.waitForSelector('.qr-link a', { timeout: 10000 });
  
  // Get first Round 2 court URL
  const firstCourtUrl = await page.locator('.qr-link a').first().getAttribute('href');
  console.log('First Round 2 court URL:', firstCourtUrl);
  
  // Visit the court page
  await page.goto(firstCourtUrl);
  await page.waitForTimeout(500);
  
  // Check page state
  const closedMessage = await page.locator('.closed h2').textContent().catch(() => null);
  console.log('Court is closed:', !!closedMessage);
  
  // Check tournament status via API
  const response = await page.evaluate(async () => {
    const res = await fetch('/api/debug/tournament/' + window.location.pathname.split('/')[2]);
    return res.json();
  }).catch(() => null);
  console.log('Tournament status from API:', response);
});
