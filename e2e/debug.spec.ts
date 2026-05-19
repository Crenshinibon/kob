import { test, expect } from '@playwright/test';

test('debug tournament creation', async ({ page }) => {
  // Login first
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

  // Create tournament
  await page.click('text=+ New Tournament');
  await page.waitForURL('/tournament/create');
  
  await page.fill('input[name="name"]', `Debug3p ${Date.now()}`);
  await page.fill('input[name="numRounds"]', '1');
  
  const players = Array.from({ length: 11 }, (_, i) => `Player${i + 1}`);
  await page.fill('textarea[name="names"]', players.join('\n'));
  
  await page.click('button[type="submit"]');
  
  // Wait for URL change
  await page.waitForURL(/\/tournament\/\d+/);
  
  // Log the current URL
  const url = page.url();
  console.log('Current URL:', url);
  
  // Check if we're on the tournament page
  const heading = await page.locator('h1').textContent();
  console.log('Page heading:', heading);
  
  // Count court cards
  const courtCards = await page.locator('.court-card').count();
  console.log('Court cards:', courtCards);
  
  expect(courtCards).toBe(3);
});
