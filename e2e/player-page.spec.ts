import { expect, test, type Page } from '@playwright/test';
import {
	createRandomSeedTournament,
	deleteTournament,
	extractMatchIds,
	getCourtLinks,
	getPlayerLinks,
	login,
	scoreAllMatchesOnCourt
} from './helpers';

async function saveFirstOpenMatch(page: Page): Promise<string | null> {
	const matchIds = await extractMatchIds(page);
	for (const matchId of matchIds) {
		if ((await page.locator(`[data-testid="saved-${matchId}"]`).count()) > 0) continue;
		await page.fill(`[data-testid="team-a-score-${matchId}"]`, '21');
		await page.fill(`[data-testid="team-b-score-${matchId}"]`, '19');
		await page.click(`[data-testid="save-score-${matchId}"]`);
		const saved = page.locator(`[data-testid="saved-${matchId}"]`);
		const inputsGone = page.locator(`[data-testid="team-a-score-${matchId}"]`);
		await expect
			.poll(
				async () => {
					if ((await saved.count()) > 0) return true;
					return (
						(await inputsGone.count()) === 0 &&
						(await page
							.getByTestId('player-history')
							.isVisible()
							.catch(() => false))
					);
				},
				{ timeout: 15000 }
			)
			.toBe(true);
		return matchId;
	}
	return null;
}

test.describe('Player page (098)', () => {
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

	test('hero shows NOW, score inputs, upcoming, and placement text', async ({ page, browser }) => {
		const name = `PlayerHero ${Date.now()}`;
		names.push(name);
		const id = await createRandomSeedTournament(page, name, 16, 2);
		const links = await getPlayerLinks(page, id);
		const anon = await browser.newContext();
		const playerPage = await anon.newPage();
		await playerPage.goto(links[0].url);
		await expect(playerPage.getByTestId('player-now')).toBeVisible({ timeout: 15000 });
		await expect(playerPage.getByTestId('player-now')).toContainText('NOW');
		await expect(playerPage.locator('[data-testid^="match-form-"]').first()).toBeVisible();
		await expect(playerPage.getByTestId('player-placement-best')).toHaveText(
			'Best achievable place: 1'
		);
		await expect(playerPage.getByTestId('player-placement-safe')).toHaveText('Safe place: 16');
		await expect(playerPage.getByTestId('group-standings')).toBeVisible();
		await expect(playerPage.getByTestId('player-record-rounds')).toBeVisible();
		await expect(playerPage.getByRole('link', { name: /open court/i })).toHaveCount(0);
		await anon.close();

		await page.goto(links[0].url);
		await expect(page.getByTestId('player-now')).toBeVisible({ timeout: 15000 });
		await expect(page.getByTestId('player-page-lang')).toHaveCount(0);
	});

	test('write-once save appears in history and is read-only for the player', async ({
		page,
		browser
	}) => {
		const name = `PlayerWrite ${Date.now()}`;
		names.push(name);
		const id = await createRandomSeedTournament(page, name, 8, 2);
		const links = await getPlayerLinks(page, id);
		const anon = await browser.newContext();
		const playerPage = await anon.newPage();
		await playerPage.goto(links[0].url);
		await expect(playerPage.getByTestId('player-now')).toBeVisible({ timeout: 15000 });
		const matchId = await saveFirstOpenMatch(playerPage);
		expect(matchId).toBeTruthy();
		await expect(playerPage.getByTestId('player-history')).toBeVisible();
		await expect(playerPage.getByTestId('player-history')).toContainText('21');
		await expect(playerPage.getByTestId('group-standings')).toBeVisible();
		await expect(playerPage.locator(`[data-testid="team-a-score-${matchId}"]`)).toHaveCount(0);
		await anon.close();
	});

	test('court page save appears read-only on the player page', async ({ page, browser }) => {
		const name = `PlayerCourt ${Date.now()}`;
		names.push(name);
		const id = await createRandomSeedTournament(page, name, 8, 2);
		const courtLinks = await getCourtLinks(page);
		const courtNames = await page
			.locator('.court-card')
			.first()
			.locator('.player')
			.allTextContents();
		await scoreAllMatchesOnCourt(page, courtLinks[0]);

		const links = await getPlayerLinks(page, id);
		const anon = await browser.newContext();
		const playerPage = await anon.newPage();
		const onCourt = links.find((l) => courtNames.some((t) => t.includes(l.name)));
		const target = onCourt ?? links[0];
		await playerPage.goto(target.url);
		await expect(playerPage.getByTestId('player-page')).toBeVisible({ timeout: 15000 });
		await expect(playerPage.getByTestId('player-history')).toContainText('21', { timeout: 15000 });
		await expect(playerPage.getByTestId('group-standings')).toBeVisible();
		await anon.close();
	});

	test('round-1 court-done 4th projects the 4ths band, not seed-court place', async ({
		page,
		browser
	}) => {
		test.setTimeout(120000);
		const name = `PlayerPlace ${Date.now()}`;
		names.push(name);
		const id = await createRandomSeedTournament(page, name, 32, 4);
		const courtLinks = await getCourtLinks(page);
		await scoreAllMatchesOnCourt(page, courtLinks[0]);
		await expect(page.getByTestId('group-standings')).toBeVisible({ timeout: 15000 });
		const fourthName = (
			await page
				.locator('[data-testid="group-standings"] tbody tr')
				.nth(3)
				.locator('td')
				.nth(1)
				.innerText()
		).trim();
		expect(fourthName.length).toBeGreaterThan(0);

		const links = await getPlayerLinks(page, id);
		const target = links.find((l) => fourthName.includes(l.name) || l.name.includes(fourthName));
		expect(target).toBeTruthy();

		const anon = await browser.newContext();
		const playerPage = await anon.newPage();
		await playerPage.goto(target!.url);
		await expect(playerPage.getByTestId('player-placement-current')).toHaveText(
			'Currently 25 of 32',
			{ timeout: 20000 }
		);
		await expect(playerPage.getByTestId('player-placement-best')).toHaveText(
			'Best achievable place: 17'
		);
		await expect(playerPage.getByTestId('player-placement-safe')).toHaveText('Safe place: 32');
		await expect(playerPage.getByTestId('player-record-rounds')).toBeVisible();
		await anon.close();
	});

	test('unknown token is 404', async ({ page }) => {
		const res = await page.goto('/player/ffffffffffffffffffffffffffffffff');
		expect(res?.status()).toBe(404);
	});
});
