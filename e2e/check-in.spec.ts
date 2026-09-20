import { expect, test } from '@playwright/test';
import {
	createRandomSeedTournament,
	createSetupTournament,
	deleteTournament,
	getPlayerLinks,
	login,
	startTournamentFromSetup
} from './helpers';

test.describe('Player check-in (097)', () => {
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

	test('list starts 0/16 and print sheet has 16 player URLs', async ({ page }) => {
		const name = `CheckinList ${Date.now()}`;
		names.push(name);
		const id = await createSetupTournament(page, name, 16, 2);
		await page.goto(`/tournament/${id}/check-in`);
		await expect(page.getByTestId('checkin-progress')).toContainText('0');
		await expect(page.locator('[data-testid^="checkin-row-"]')).toHaveCount(16);

		await page.goto(`/tournament/${id}/check-in/print`);
		await expect(page.getByTestId('checkin-print')).toBeVisible();
		await expect(page.locator('[data-player-url]')).toHaveCount(16);
		await page.emulateMedia({ media: 'print' });
		await expect
			.poll(async () => page.locator('.top-nav').evaluate((el) => getComputedStyle(el).display))
			.toBe('none');
		await expect
			.poll(async () => page.locator('.site-footer').evaluate((el) => getComputedStyle(el).display))
			.toBe('none');
		await expect(page.getByTestId('print-player-name').first()).toBeVisible();
		await expect(page.getByTestId('print-player-name').first()).toHaveCSS('color', 'rgb(0, 0, 0)');
		const name = await page.getByTestId('print-player-name').first().innerText();
		expect(name.trim().length).toBeGreaterThan(0);
		const urls = await page
			.locator('[data-player-url]')
			.evaluateAll((els) => els.map((el) => el.getAttribute('data-player-url') ?? ''));
		expect(urls.every((u) => u.startsWith('/player/'))).toBe(true);
	});

	test('org tap toggles check-in', async ({ page }) => {
		const name = `CheckinToggle ${Date.now()}`;
		names.push(name);
		const id = await createSetupTournament(page, name, 8, 2);
		await page.goto(`/tournament/${id}/check-in`);
		const testId = await page
			.locator('[data-testid^="checkin-row-"]')
			.first()
			.getAttribute('data-testid');
		expect(testId).toBeTruthy();
		const row = page.getByTestId(testId!);
		await row.click();
		await expect(page.locator('.list li').last()).toHaveClass(/checked/);
		await expect(page.locator('.list li').first()).not.toHaveClass(/checked/);
		await row.click();
		await expect(page.getByTestId('checkin-progress')).toContainText('0', { timeout: 10000 });
	});

	test('anonymous player page self-checks-in as scanned', async ({ page, browser }) => {
		const name = `CheckinScan ${Date.now()}`;
		names.push(name);
		const id = await createSetupTournament(page, name, 8, 2);
		const links = await getPlayerLinks(page, id);
		const anon = await browser.newContext();
		const playerPage = await anon.newPage();
		await playerPage.goto(links[0].url);
		await expect(playerPage.getByTestId('player-not-started')).toBeVisible();
		await playerPage.close();
		await anon.close();

		await page.goto(`/tournament/${id}/check-in`);
		await expect(page.getByTestId('checkin-progress')).toContainText('1', { timeout: 15000 });
		await expect(page.locator(`[data-testid="checkin-row-${links[0].id}"]`)).toContainText(
			'scanned'
		);
	});

	test('close check-in and start with checked-in only removes the rest', async ({
		page,
		browser
	}) => {
		const name = `CheckinStart ${Date.now()}`;
		names.push(name);
		const id = await createSetupTournament(page, name, 16, 2);
		await page.goto(`/tournament/${id}/check-in`);
		await expect(page.locator('[data-testid^="checkin-row-"]')).toHaveCount(16, { timeout: 15000 });
		const rowIds = await page
			.locator('[data-testid^="checkin-row-"]')
			.evaluateAll((els) =>
				els
					.map((el) => el.getAttribute('data-testid')?.replace('checkin-row-', '') ?? '')
					.filter((id) => id && id !== 'undefined')
			);
		expect(rowIds.length).toBe(16);
		for (let i = 0; i < 12; i++) {
			await page.getByTestId(`checkin-row-${rowIds[i]}`).click();
			await expect(page.getByTestId('checkin-progress')).toContainText(String(i + 1), {
				timeout: 10000
			});
		}
		const uncheckedToken = await page
			.locator('li:not(.checked) [data-player-token]')
			.first()
			.getAttribute('data-player-token');
		expect(uncheckedToken).toBeTruthy();

		await page.getByTestId('close-checkin').click();
		await expect(page.getByTestId('close-checkin-dialog')).toBeVisible();
		await page.getByTestId('confirm-close-checkin').click();
		await expect(page.getByTestId('close-checkin-dialog')).toBeHidden({ timeout: 20000 });
		await page.goto(`/tournament/${id}`);
		await expect(page.locator('.court-card')).toHaveCount(3, { timeout: 30000 });

		const anon = await browser.newContext();
		const gone = await anon.newPage();
		const res = await gone.goto(`/player/${uncheckedToken}`);
		expect(res?.status()).toBe(404);
		await anon.close();
	});

	test('skip check-in: start all 16, court QRs still work', async ({ page }) => {
		const name = `CheckinSkip ${Date.now()}`;
		names.push(name);
		await createRandomSeedTournament(page, name, 16, 2);
		await expect(page.locator('.qr-link a')).toHaveCount(4);
		const href = await page.locator('.qr-link a').first().getAttribute('href');
		expect(href).toContain('/court/');
		await page.goto(href!);
		await expect(
			page.locator('[data-testid^="match-form-"], [data-testid^="saved-"]').first()
		).toBeVisible({
			timeout: 15000
		});
	});
});
