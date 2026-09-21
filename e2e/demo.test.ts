import { expect, test } from '@playwright/test';

test('home page has expected h1', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByTestId('landing')).toBeVisible();
	await expect(page.locator('h1')).toHaveText('King of the Beach');
});
