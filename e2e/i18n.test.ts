import { expect, test } from '@playwright/test';

test.describe('i18n', () => {
	test('home page in default locale (English)', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('h1')).toHaveText('King of the Beach');
		await expect(page.getByTestId('landing')).toContainText('Individual rankings');
	});

	test('home page loads in German via /de/', async ({ page }) => {
		await page.goto('/de/');
		await expect(page.locator('h1')).toHaveText('King of the Beach');
		await expect(page.getByTestId('landing')).toContainText('Individuelle Rangliste');
	});

	test('home page loads in French via /fr/', async ({ page }) => {
		await page.goto('/fr/');
		await expect(page.locator('h1')).toHaveText('King of the Beach');
		await expect(page.getByTestId('landing')).toContainText('Classement individuel');
	});

	test('home page loads in Spanish via /es/', async ({ page }) => {
		await page.goto('/es/');
		await expect(page.locator('h1')).toHaveText('King of the Beach');
		await expect(page.getByTestId('landing')).toContainText('Ranking individual');
	});

	test('login page has German text at /de/login', async ({ page }) => {
		await page.goto('/de/login');
		await expect(page.locator('h1')).toHaveText('Anmelden');
	});

	test('login page has French text at /fr/login', async ({ page }) => {
		await page.goto('/fr/login');
		await expect(page.locator('h1')).toHaveText('Connexion');
	});

	test('login page has Spanish text at /es/login', async ({ page }) => {
		await page.goto('/es/login');
		await expect(page.locator('h1')).toHaveText('Iniciar sesión');
	});

	test('signup page in German', async ({ page }) => {
		await page.goto('/de/signup');
		await expect(page.locator('h1')).toHaveText('Registrieren');
	});

	test('signup page in French', async ({ page }) => {
		await page.goto('/fr/signup');
		await expect(page.locator('h1')).toHaveText('Inscription');
	});

	test('signup page in Spanish', async ({ page }) => {
		await page.goto('/es/signup');
		await expect(page.locator('h1')).toHaveText('Registrarse');
	});
});
