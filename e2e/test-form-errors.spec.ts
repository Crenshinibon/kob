import { test, expect } from '@playwright/test';

test('test close round form with error logging', async ({ page }) => {
  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('PAGE ERROR:', msg.text());
    }
  });
  page.on('pageerror', error => {
    console.log('PAGE EXCEPTION:', error.message);
  });
  
  // Login
  await page.goto('/login');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
  
  // Create tournament
  await page.click('text=+ New Tournament');
  await page.fill('input[name="name"]', 'Test Errors');
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
  
  // Go to tournament page
  await page.goto(`/tournament/${tournamentId}`);
  await page.waitForSelector('button:has-text("Close Round & Advance"):not(:disabled)');
  
  // Click the button
  await page.click('button:has-text("Close Round & Advance")');
  
  // Wait for response
  await page.waitForTimeout(3000);
  
  // Check if round advanced
  const roundText = await page.locator('header > p').textContent().catch(() => 'not found');
  console.log('Round text:', roundText);
  
  // Check for QR links
  const qrCount = await page.locator('.qr-link a').count();
  console.log('QR links:', qrCount);
  
  // Get first court URL and visit it
  if (qrCount > 0) {
    const firstCourtUrl = await page.locator('.qr-link a').first().getAttribute('href');
    await page.goto(firstCourtUrl);
    await page.waitForTimeout(500);
    
    const closedMessage = await page.locator('.closed h2').textContent().catch(() => null);
    console.log('Court closed:', !!closedMessage);
  }
});
