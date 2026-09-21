import { expect, test } from '@playwright/test';
import {
	createRandomSeedTournament,
	deleteTournament,
	extractMatchIds,
	getCourtLinks,
	login
} from './helpers';

test.describe('Court score edit (060)', () => {
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

	test('Edit prefills the saved scores so they can be overwritten', async ({ page }) => {
		const name = `CourtEdit ${Date.now()}`;
		names.push(name);
		await createRandomSeedTournament(page, name, 8, 2);
		const links = await getCourtLinks(page);
		await page.goto(links[0]);
		const matchIds = await extractMatchIds(page);
		expect(matchIds.length).toBeGreaterThan(0);
		const matchId = matchIds[0];

		await page.fill(`[data-testid="team-a-score-${matchId}"]`, '21');
		await page.fill(`[data-testid="team-b-score-${matchId}"]`, '19');
		await page.click(`[data-testid="save-score-${matchId}"]`);
		await expect(page.getByTestId(`saved-${matchId}`)).toBeVisible({ timeout: 10000 });

		await page.getByTestId(`edit-score-${matchId}`).click();
		await expect(page.getByTestId(`team-a-score-${matchId}`)).toHaveValue('21');
		await expect(page.getByTestId(`team-b-score-${matchId}`)).toHaveValue('19');

		await page.fill(`[data-testid="team-b-score-${matchId}"]`, '15');
		await page.click(`[data-testid="save-score-${matchId}"]`);
		await expect(page.getByTestId(`saved-${matchId}`)).toBeVisible({ timeout: 10000 });
		await expect(page.locator('.completed').first()).toContainText('15');
	});
});
