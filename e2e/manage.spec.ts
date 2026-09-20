import { expect, test } from '@playwright/test';
import {
	closeRoundOrFetch,
	createRandomSeedTournament,
	createSetupTournament,
	deleteTournament,
	extractMatchIds,
	getCourtLinks,
	getPlayerLinks,
	login,
	scoreAllOpenMatches,
	startTournamentFromSetup
} from './helpers';

test.describe('Manage page (096)', () => {
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

	test('rename is visible on the court page', async ({ page }) => {
		const name = `ManageRename ${Date.now()}`;
		names.push(name);
		const id = await createRandomSeedTournament(page, name, 8, 2);
		await page.goto(`/tournament/${id}/manage`);
		const first = page.locator('[data-testid^="manage-player-"]').first();
		const playerId = (await first.getAttribute('data-testid'))?.replace('manage-player-', '') ?? '';
		const row = page.getByTestId(`manage-player-${playerId}`);
		await page.getByTestId(`rename-${playerId}`).click();
		await page.getByTestId(`rename-input-${playerId}`).fill('RenamedAce');
		await row.getByRole('button', { name: /rename/i }).click();
		await expect(row).toContainText('RenamedAce');

		await page.goto(`/tournament/${id}`);
		const card = page.locator('.court-card', { hasText: 'RenamedAce' });
		await expect(card).toBeVisible({ timeout: 15000 });
		const courtHref = await card.locator('.qr-link a').getAttribute('href');
		expect(courtHref).toBeTruthy();
		await page.goto(courtHref!);
		await expect(page.locator('body')).toContainText('RenamedAce');
	});

	test('remove a no-show in round 1 reshapes courts 16 → 15', async ({ page }) => {
		const name = `ManageRemove ${Date.now()}`;
		names.push(name);
		const id = await createRandomSeedTournament(page, name, 16, 2);
		await page.goto(`/tournament/${id}/manage`);
		page.once('dialog', (d) => d.accept());
		await page.locator('[data-testid^="remove-"]').first().click();
		await expect(page.locator('[data-testid^="manage-player-"]')).toHaveCount(15, {
			timeout: 15000
		});
		await page.getByTestId('tab-courts').click();
		await expect(page.getByTestId('manage-court-1')).toBeVisible();
		await expect(page.getByTestId('manage-court-4')).toBeVisible();
		await page.goto(`/tournament/${id}`);
		await expect(page.locator('.court-card')).toHaveCount(4, { timeout: 15000 });
	});

	test('add a player in setup then start with 14', async ({ page }) => {
		const name = `ManageAdd ${Date.now()}`;
		names.push(name);
		const id = await createSetupTournament(page, name, 16, 2);
		await page.goto(`/tournament/${id}/manage`);
		page.once('dialog', (d) => d.accept());
		await page.locator('[data-testid^="remove-"]').first().click();
		await expect(page.locator('[data-testid^="manage-player-"]')).toHaveCount(15, {
			timeout: 15000
		});
		page.once('dialog', (d) => d.accept());
		await page.locator('[data-testid^="remove-"]').first().click();
		await expect(page.locator('[data-testid^="manage-player-"]')).toHaveCount(14, {
			timeout: 15000
		});
		await page.goto(`/tournament/${id}`);
		await startTournamentFromSetup(page);
		await expect(page.locator('.court-card')).toHaveCount(3);
	});

	test('move a player between courts before scores; court QR unchanged', async ({ page }) => {
		const name = `ManageMove ${Date.now()}`;
		names.push(name);
		const id = await createRandomSeedTournament(page, name, 8, 2);
		await page.goto(`/tournament/${id}`);
		const beforeLinks = await getCourtLinks(page);

		await page.goto(`/tournament/${id}/manage`);
		await page.getByTestId('tab-courts').click();
		const tile = page.locator('[data-testid^="player-tile-"]').first();
		const pid = (await tile.getAttribute('data-testid'))?.replace('player-tile-', '') ?? '';
		const select = page.getByTestId(`move-${pid}`);
		const from = await select.inputValue();
		const to = from === '1' ? '2' : '1';
		await select.selectOption(to);
		await expect(
			page.getByTestId(`manage-court-${to}`).locator(`[data-testid="player-tile-${pid}"]`)
		).toBeVisible({ timeout: 10000 });

		await page.goto(`/tournament/${id}`);
		const afterLinks = await getCourtLinks(page);
		expect(afterLinks).toEqual(beforeLinks);
	});

	test('a saved score locks assignment edits', async ({ page }) => {
		const name = `ManageLock ${Date.now()}`;
		names.push(name);
		const id = await createRandomSeedTournament(page, name, 8, 2);
		const courtLinks = await getCourtLinks(page);
		await page.goto(courtLinks[0]);
		const matchIds = await extractMatchIds(page);
		await page.fill(`[data-testid="team-a-score-${matchIds[0]}"]`, '21');
		await page.fill(`[data-testid="team-b-score-${matchIds[0]}"]`, '19');
		await page.click(`[data-testid="save-score-${matchIds[0]}"]`);
		await expect(page.locator(`[data-testid="saved-${matchIds[0]}"]`)).toBeVisible({
			timeout: 10000
		});

		await page.goto(`/tournament/${id}/manage`);
		await expect(page.getByTestId('lock-indicator')).toContainText(/scores/i);
		await page.getByTestId('tab-courts').click();
		await expect(page.locator('[data-testid^="move-"]')).toHaveCount(0);
		await expect(page.getByTestId('refill-courts')).toBeDisabled();
	});

	test('4-player tournament is one court on the courts tab', async ({ page }) => {
		const name = `ManageFour ${Date.now()}`;
		names.push(name);
		const id = await createRandomSeedTournament(page, name, 4, 1);
		await page.goto(`/tournament/${id}/manage`);
		await page.getByTestId('tab-courts').click();
		await expect(page.getByTestId('manage-court-1')).toBeVisible();
		await expect(page.locator('[data-testid^="manage-court-"]')).toHaveCount(1);
	});

	test('swap is reflected on a player page', async ({ page, browser }) => {
		const name = `ManageSwapPlayer ${Date.now()}`;
		names.push(name);
		const id = await createRandomSeedTournament(page, name, 8, 2);
		const links = await getPlayerLinks(page, id);
		await page.goto(`/tournament/${id}/manage`);
		await page.getByTestId('tab-courts').click();
		const tile = page.locator('[data-testid^="player-tile-"]').first();
		const pid = (await tile.getAttribute('data-testid'))?.replace('player-tile-', '') ?? '';
		const select = page.getByTestId(`move-${pid}`);
		const from = await select.inputValue();
		const to = from === '1' ? '2' : '1';
		await select.selectOption(to);

		const moved = links.find((l) => l.id === pid);
		expect(moved).toBeTruthy();
		const anon = await browser.newContext();
		const playerPage = await anon.newPage();
		await playerPage.goto(moved!.url);
		await expect(playerPage.getByTestId('player-now')).toContainText(`Court ${to}`, {
			timeout: 15000
		});
		await anon.close();
	});

	test('finish early after round 1 then reopen last round', async ({ page }) => {
		test.setTimeout(90000);
		const name = `ManageFinish ${Date.now()}`;
		names.push(name);
		const id = await createRandomSeedTournament(page, name, 8, 2);
		await scoreAllOpenMatches(page);
		await page.goto(`/tournament/${id}`);
		await expect(page.locator('button:has-text("Close Round")')).toBeEnabled({ timeout: 20000 });
		await closeRoundOrFetch(page, id);
		await expect(page.getByText('Round 2 of 2')).toBeVisible({ timeout: 30000 });

		await page.goto(`/tournament/${id}/manage`);
		await expect(page.getByTestId('manage-page')).toBeVisible();
		await expect(page.getByTestId('lock-indicator')).toContainText(/round 2/i, { timeout: 15000 });
		await page.getByTestId('tab-tournament').click();
		await expect(page.getByTestId('tournament-tab')).toBeVisible();
		page.once('dialog', (d) => d.accept());
		await page.getByTestId('finish-early').click();
		await expect(page.getByTestId('lock-indicator')).toContainText(/completed/i, {
			timeout: 15000
		});

		page.once('dialog', (d) => d.accept());
		await page.getByTestId('reopen-round').click();
		await expect(page.getByTestId('lock-indicator')).not.toContainText(/completed/i, {
			timeout: 15000
		});
		await page.goto(`/tournament/${id}`);
		await expect(page.locator('.round-stepper')).toBeVisible();
		await expect(page.getByTestId('setup-panel')).toHaveCount(0);
	});

	test('mass-enter comma-separated names on manage in setup', async ({ page }) => {
		const name = `ManagePaste ${Date.now()}`;
		names.push(name);
		const id = await createSetupTournament(page, name, 0);
		await page.goto(`/tournament/${id}/manage`);
		await expect(page.getByTestId('manage-page')).toBeVisible();
		await expect(page.getByTestId('add-many-panel')).toBeVisible({ timeout: 15000 });
		await expect(page.getByTestId('add-one-panel')).toBeVisible();
		await expect(page.getByTestId('search-panel')).toBeVisible();
		await page.getByTestId('bulk-names').fill('Ada, Beau, Cara, Dee, Eve, Fay, Gus, Hal');
		await page.getByTestId('bulk-add').click();
		await expect(page.locator('[data-testid^="manage-player-"]')).toHaveCount(8, {
			timeout: 15000
		});
		await expect(page.getByTestId('player-name-import')).toBeVisible();
		await expect(page.getByTestId('add-player-name')).toBeVisible();
		await expect(page.getByTestId('manage-search')).toBeVisible();
	});

	test('rounds and physical courts are editable in setup', async ({ page }) => {
		const name = `ManageSetupRules ${Date.now()}`;
		names.push(name);
		const id = await createSetupTournament(page, name, 16, 2);
		await page.goto(`/tournament/${id}/manage`);
		await page.getByTestId('tab-rules').click();
		await expect(page.getByTestId('rules-tab')).toBeVisible();
		await expect(page.getByTestId('num-rounds')).toBeVisible({ timeout: 15000 });
		await page.getByTestId('num-rounds').fill('3');
		await page.getByTestId('num-rounds').blur();
		await expect(page.getByTestId('num-rounds')).toHaveValue('3', { timeout: 10000 });
		await expect(page.getByTestId('physical-courts')).toBeVisible({ timeout: 15000 });
		await page.getByTestId('physical-courts').fill('2');
		await page.getByTestId('physical-courts').blur();
		await expect(page.getByTestId('physical-courts')).toHaveValue('2', { timeout: 10000 });

		await page.goto(`/tournament/${id}`);
		await expect(page.getByTestId('setup-num-rounds')).toHaveValue('3', { timeout: 15000 });
		await expect(page.getByTestId('setup-physical-courts')).toHaveValue('2');
		await page.getByTestId('setup-num-rounds').fill('4');
		await page.getByTestId('setup-num-rounds').blur();
		await expect(page.getByTestId('setup-num-rounds')).toHaveValue('4', { timeout: 10000 });
		await startTournamentFromSetup(page);
		await expect(page.locator('.round-stepper')).toContainText('Round 4');
		await expect(page.getByTestId('ops-physical-courts')).toHaveValue('2');
		await page.getByTestId('ops-physical-courts').fill('4');
		await page.getByTestId('ops-physical-courts').blur();
		await expect(page.getByTestId('ops-physical-courts')).toHaveValue('4', { timeout: 10000 });
	});

	test('moving 4p to 4p keeps courts in number order as 3p and 5p', async ({ page }) => {
		const name = `ManageMoveOrder ${Date.now()}`;
		names.push(name);
		const id = await createRandomSeedTournament(page, name, 16, 2);
		await page.goto(`/tournament/${id}/manage`);
		await expect(page.getByTestId('manage-page')).toBeVisible();
		await page.getByTestId('tab-courts').click();
		await expect(page.getByTestId('manage-court-1')).toBeVisible({ timeout: 15000 });
		const court1 = page.getByTestId('manage-court-1');
		const pid =
			(
				await court1.locator('[data-testid^="player-tile-"]').first().getAttribute('data-testid')
			)?.replace('player-tile-', '') ?? '';
		expect(pid).toBeTruthy();
		await page.getByTestId(`move-${pid}`).selectOption('2');
		await expect(
			page.getByTestId('manage-court-2').locator(`[data-testid="player-tile-${pid}"]`)
		).toBeVisible({ timeout: 10000 });
		const order = await page
			.locator('[data-testid^="manage-court-"]')
			.evaluateAll((els) => els.map((el) => el.getAttribute('data-testid')));
		expect(order).toEqual(['manage-court-1', 'manage-court-2', 'manage-court-3', 'manage-court-4']);
		await expect(
			page.getByTestId('manage-court-1').locator('[data-testid^="player-tile-"]')
		).toHaveCount(3);
		await expect(
			page.getByTestId('manage-court-2').locator('[data-testid^="player-tile-"]')
		).toHaveCount(5);
	});

	test('operations header links are spaced apart', async ({ page }) => {
		const name = `OpsNav ${Date.now()}`;
		names.push(name);
		const id = await createSetupTournament(page, name, 4);
		await page.goto(`/tournament/${id}`);
		const nav = page.getByTestId('ops-nav');
		await expect(nav).toBeVisible();
		await expect(nav.locator('a')).toHaveCount(3);
		const gaps = await nav.locator('a').evaluateAll((els) => {
			const boxes = els.map((el) => el.getBoundingClientRect());
			return [boxes[1].left - boxes[0].right, boxes[2].left - boxes[1].right];
		});
		expect(gaps[0]).toBeGreaterThanOrEqual(8);
		expect(gaps[1]).toBeGreaterThanOrEqual(8);
	});

	test('save scoring sits below the scoring fields', async ({ page }) => {
		const name = `ManageScoringAlign ${Date.now()}`;
		names.push(name);
		const id = await createSetupTournament(page, name, 8, 2);
		await page.goto(`/tournament/${id}/manage`);
		await page.getByTestId('tab-rules').click();
		await expect(page.getByTestId('rules-tab')).toBeVisible();
		const grid = page.locator('.scoring-grid');
		const btn = page.getByTestId('save-scoring');
		await expect(grid).toBeVisible();
		await expect(btn).toBeVisible();
		const gridBox = await grid.boundingBox();
		const btnBox = await btn.boundingBox();
		expect(gridBox && btnBox).toBeTruthy();
		expect(btnBox!.y).toBeGreaterThan(gridBox!.y + gridBox!.height - 4);
		expect(Math.abs(btnBox!.x - gridBox!.x)).toBeLessThan(8);
	});

	test('roster is seed order and move buttons reorder players', async ({ page }) => {
		const name = `ManageOrder ${Date.now()}`;
		names.push(name);
		const id = await createSetupTournament(page, name, 8);
		await page.goto(`/tournament/${id}/manage`);
		const rows = page.locator('[data-testid^="manage-player-"]');
		await expect(rows).toHaveCount(8);
		await expect(rows.nth(0)).toContainText('P1');
		await expect(rows.nth(1)).toContainText('P2');
		await expect(page.locator('input[data-testid^="order-"]')).toHaveCount(0);

		const p1Id =
			(await rows.nth(0).getAttribute('data-testid'))?.replace('manage-player-', '') ?? '';
		expect(p1Id).toBeTruthy();
		const firstRow = page.getByTestId(`manage-player-${p1Id}`);
		const orderBtns = firstRow.locator('.order-btn');
		await expect(orderBtns).toHaveCount(4);
		await expect(orderBtns.nth(0)).toHaveAttribute('data-testid', `order-top-${p1Id}`);
		await expect(orderBtns.nth(1)).toHaveAttribute('data-testid', `order-up-${p1Id}`);
		await expect(orderBtns.nth(2)).toHaveAttribute('data-testid', `order-down-${p1Id}`);
		await expect(orderBtns.nth(3)).toHaveAttribute('data-testid', `order-bottom-${p1Id}`);
		await expect(firstRow.locator('.player-meta')).toHaveCount(0);
		await expect(firstRow.locator('.player-name')).toBeVisible();
		await expect(firstRow.locator('.row-actions')).toContainText('New QR');
		await expect(firstRow.locator('.row-actions')).not.toContainText(/^Link$/);

		const cardBox = await firstRow.boundingBox();
		const nameBox = await firstRow.locator('.player-name').boundingBox();
		const renameBox = await page.getByTestId(`rename-${p1Id}`).boundingBox();
		const topBox = await page.getByTestId(`order-top-${p1Id}`).boundingBox();
		const upBox = await page.getByTestId(`order-up-${p1Id}`).boundingBox();
		const bottomBox = await page.getByTestId(`order-bottom-${p1Id}`).boundingBox();
		expect(cardBox && nameBox && renameBox && topBox && upBox && bottomBox).toBeTruthy();
		expect(Math.abs(nameBox!.y - renameBox!.y)).toBeLessThan(16);
		expect(renameBox!.x).toBeGreaterThan(nameBox!.x);
		expect(renameBox!.height).toBeLessThan(36);
		expect(upBox!.width).toBeGreaterThanOrEqual(40);
		expect(upBox!.height).toBeGreaterThanOrEqual(40);
		expect(topBox!.x + topBox!.width).toBeGreaterThan(cardBox!.x + cardBox!.width - 8);
		expect(topBox!.y).toBeLessThan(cardBox!.y + 6);
		expect(bottomBox!.y + bottomBox!.height).toBeGreaterThan(cardBox!.y + cardBox!.height - 6);
		const nameSize = await firstRow
			.locator('.player-name')
			.evaluate((el) => getComputedStyle(el).fontSize);
		expect(parseFloat(nameSize)).toBeGreaterThanOrEqual(18);

		await expect(page.getByTestId(`order-up-${p1Id}`)).toBeDisabled();
		await expect(page.getByTestId(`order-top-${p1Id}`)).toBeDisabled();
		await page.getByTestId(`order-down-${p1Id}`).click();
		await expect(rows.nth(0)).toContainText('P2', { timeout: 10000 });
		await expect(rows.nth(1)).toContainText('P1');

		await page.getByTestId(`order-top-${p1Id}`).click();
		await expect(rows.nth(0)).toContainText('P1', { timeout: 10000 });

		await page.getByTestId(`order-bottom-${p1Id}`).click();
		await expect(rows.nth(7)).toContainText('P1', { timeout: 10000 });
		await expect(page.getByTestId(`order-down-${p1Id}`)).toBeDisabled();
		await expect(page.getByTestId(`order-bottom-${p1Id}`)).toBeDisabled();
	});
});
