import { expect, test } from '@playwright/test';
import {
	createSetupTournament,
	deleteTournament,
	ensureTournamentStarted,
	getPlayerLinks,
	login,
	startTournamentFromSetup
} from './helpers';

test.describe('Setup and start (099)', () => {
	const names: string[] = [];

	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test.afterEach(async ({ page }) => {
		for (const name of names) {
			await deleteTournament(page, name);
		}
		names.length = 0;
	});

	test('create with 0 players stays in setup with start disabled', async ({ page }) => {
		const name = `SetupEmpty ${Date.now()}`;
		names.push(name);
		const id = await createSetupTournament(page, name, 0);
		await expect(page.getByTestId('setup-panel')).toBeVisible();
		await expect(page.getByTestId('start-tournament')).toBeDisabled();
		await expect(page.locator('.court-card')).toHaveCount(0);

		await page.goto('/');
		await expect(page.getByTestId('dashboard-setup')).toContainText(name);
		await page.goto(`/tournament/${id}`);
		await expect(page.getByTestId('setup-panel')).toBeVisible();
	});

	test('create with 16 names does not auto-start; start opens round 1 and court QRs', async ({
		page
	}) => {
		const name = `Setup16 ${Date.now()}`;
		names.push(name);
		await createSetupTournament(page, name, 16, 2);
		await expect(page.getByTestId('setup-panel')).toBeVisible();
		await expect(page.locator('.court-card')).toHaveCount(0);
		await expect(page.getByTestId('start-tournament')).toBeEnabled();
		await expect(page.locator('.setup-panel')).toContainText('4p');

		await startTournamentFromSetup(page);
		await expect(page.locator('.court-card')).toHaveCount(4);
		await expect(page.locator('.qr-link a').first()).toBeVisible();
		await expect(page.locator('.round-stepper')).toBeVisible();
	});

	test('paste 16 names on manage then start', async ({ page }) => {
		const name = `SetupPaste ${Date.now()}`;
		names.push(name);
		const id = await createSetupTournament(page, name, 0);
		await page.goto(`/tournament/${id}/manage`);
		await expect(page.getByTestId('manage-page')).toBeVisible();
		const namesText = Array.from({ length: 16 }, (_, i) => `P${i + 1}`).join('\n');
		await page.getByTestId('bulk-names').fill(namesText);
		await page.getByTestId('bulk-add').click();
		await expect(page.locator('[data-testid^="manage-player-"]')).toHaveCount(16, {
			timeout: 15000
		});

		await page.goto(`/tournament/${id}`);
		await expect(page.getByTestId('start-tournament')).toBeEnabled({ timeout: 15000 });
		await startTournamentFromSetup(page);
		await expect(page.locator('.court-card')).toHaveCount(4);
	});

	test('4 players start as one court and one round', async ({ page }) => {
		const name = `SetupFour ${Date.now()}`;
		names.push(name);
		await createSetupTournament(page, name, 4, 3);
		await startTournamentFromSetup(page);
		await expect(page.locator('.court-card')).toHaveCount(1);
		await expect(page.locator('.round-stepper')).toContainText('Round 1');
		await expect(page.locator('.stepper-step')).toHaveCount(1);
	});

	test('preseed 4 players: rounds computed at start as 1', async ({ page }) => {
		const name = `SetupPreseed4 ${Date.now()}`;
		names.push(name);
		await page.goto('/tournament/create');
		await page.fill('input[name="name"]', name);
		await page.click('input[value="preseed"]');
		await expect(page.locator('text=computed at start')).toBeVisible();
		await page.fill('textarea[name="names"]', 'A\nB\nC\nD');
		await page.click('button[type="submit"]');
		await page.waitForURL(/\/tournament\/\d+/);
		await startTournamentFromSetup(page);
		await expect(page.locator('.court-card')).toHaveCount(1);
		await expect(page.locator('.stepper-step')).toHaveCount(1);
	});

	test('rules tab is editable in setup', async ({ page }) => {
		const name = `SetupRules ${Date.now()}`;
		names.push(name);
		const id = await createSetupTournament(page, name, 8, 2);
		await page.goto(`/tournament/${id}/manage`);
		await page.getByTestId('tab-rules').click();
		await expect(page.getByTestId('rules-tab')).toBeVisible();
		await expect(page.getByTestId('num-rounds')).toBeEnabled();
		await expect(page.locator('text=locked')).toHaveCount(0);
	});

	test('player page in setup shows not started, then NOW after start', async ({
		page,
		browser
	}) => {
		const name = `SetupPlayer ${Date.now()}`;
		names.push(name);
		const id = await createSetupTournament(page, name, 8, 2);
		const links = await getPlayerLinks(page, id);
		expect(links.length).toBe(8);

		const anon = await browser.newContext();
		const playerPage = await anon.newPage();
		await playerPage.goto(links[0].url);
		await expect(playerPage.getByTestId('player-not-started')).toBeVisible();
		await expect(playerPage.getByTestId('player-not-started')).toContainText('8');

		await page.goto(`/tournament/${id}`);
		await ensureTournamentStarted(page);

		await playerPage.getByRole('button', { name: /refresh/i }).click();
		await expect(playerPage.getByTestId('player-now')).toBeVisible({ timeout: 15000 });
		await expect(playerPage.locator('[data-testid^="match-form-"]').first()).toBeVisible();
		await anon.close();
	});
});
