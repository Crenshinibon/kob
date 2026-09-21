import { expect, test } from '@playwright/test';

test.describe('Public landing page', () => {
	test('home shows format and features, not a login-only prompt', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByTestId('landing')).toBeVisible();
		await expect(page.locator('h1')).toHaveText('King of the Beach');
		await expect(page.getByTestId('landing-signup')).toBeVisible();
		await expect(page.getByTestId('landing-login')).toBeVisible();
		await expect(page.getByTestId('landing')).toContainText('Random Seed');
		await expect(page.getByTestId('landing')).toContainText('Preseed');
		await expect(page.getByTestId('landing')).toContainText('Court QR codes');
		await expect(page.getByRole('link', { name: 'How KoB works' })).toBeVisible();
	});

	test('Create an account goes to signup', async ({ page }) => {
		await page.goto('/');
		await page.getByTestId('landing-signup').click();
		await expect(page).toHaveURL(/\/signup/);
		await expect(page.locator('h1')).toHaveText('Sign Up');
	});

	test('Log in from the landing goes to login', async ({ page }) => {
		await page.goto('/');
		await page.getByTestId('landing-login').click();
		await expect(page).toHaveURL(/\/login/);
		await expect(page.locator('h1')).toHaveText('Log In');
	});
});
