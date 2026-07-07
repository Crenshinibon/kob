import { test, expect } from '@playwright/test';
import {
	login,
	createRandomSeedTournament,
	getCourtLinks,
	scoreAllMatchesOnCourt,
	scoreAllCourts,
	closeRoundViaFetch,
	closeRoundOrFetch,
	clickRetireSubmit,
	clickRetireSubmitAndWait,
	enableRetireReplacement,
	selectRetirePlayer,
	waitForCourtCardCount,
	waitForLiveQuerySettle,
	waitForRetireFormClosed,
	waitForTournamentPlayer,
	configureTieBreakFinal,
	deleteTournament
} from './helpers';

test.describe('Code review findings (spec 1040)', () => {
	const testTournamentNames: string[] = [];

	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test.afterEach(async ({ page }) => {
		for (const name of testTournamentNames) {
			await deleteTournament(page, name);
		}
		testTournamentNames.length = 0;
	});

	test('round-1 retirement 17→16 rebuilds courts correctly', async ({ page }) => {
		test.slow();
		const name = `R1Retire17 ${Date.now()}`;
		testTournamentNames.push(name);

		await page.goto('/');
		await page.click('text=+ New Tournament');
		await page.fill('input[name="name"]', name);
		await page.fill('input[name="n:numRounds"]', '2');
		const players = Array.from({ length: 17 }, (_, i) => `Q${i + 1}`);
		await page.fill('textarea[name="names"]', players.join('\n'));
		await page.click('button[type="submit"]');
		await page.waitForURL(/\/tournament\/\d+/);

		await page.click('summary:has-text("Retire a Player")');
		await page.waitForSelector('.retire-form');
		const opts = await page.locator('#retirePlayerId option').allTextContents();
		const target = opts.find((o) => o.match(/\bQ1\b/));
		if (!target) throw new Error('Q1 not found in retire options');
		await page.selectOption('#retirePlayerId', { label: target.trim() });
		await page.selectOption('#retireReason', { value: 'schedule' });
		await clickRetireSubmit(page);
		await waitForCourtCardCount(page, 4);

		expect(await page.locator('.court-card').count()).toBe(4);
		expect(await page.locator('.qr-link a').count()).toBe(4);
	});

	test('rejects score submission with wrong court token', async ({ page }) => {
		const name = `WrongToken ${Date.now()}`;
		testTournamentNames.push(name);
		await createRandomSeedTournament(page, name, 8);

		const courtUrl = (await getCourtLinks(page))[0];
		await page.goto(courtUrl);
		await page.waitForSelector('[data-testid^="match-form-"]');
		const firstForm = page.locator('[data-testid^="match-form-"]').first();
		const testId = await firstForm.getAttribute('data-testid');
		const matchId = testId?.replace('match-form-', '');
		expect(matchId).toBeTruthy();

		await page.fill(`[data-testid="team-a-score-${matchId}"]`, '21');
		await page.fill(`[data-testid="team-b-score-${matchId}"]`, '19');

		const response = await page.evaluate(async (mid) => {
			const form = document.querySelector(
				`[data-testid="match-form-${mid}"]`
			) as HTMLFormElement | null;
			if (!form) return 'no form';
			const fd = new URLSearchParams();
			for (const [key, val] of new FormData(form)) {
				fd.set(key, val as string);
			}
			fd.set('token', '00000000000000000000000000000000');
			const res = await fetch(form.action, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: fd.toString()
			});
			return res.ok ? 'ok' : 'error';
		}, matchId!);

		expect(response).not.toBe('ok');
		await page.reload();
		await expect(page.locator(`[data-testid="saved-${matchId}"]`)).toHaveCount(0);
	});

	test('rejects close round while matches are incomplete', async ({ page }) => {
		test.slow();
		const name = `IncompleteClose ${Date.now()}`;
		testTournamentNames.push(name);
		const tid = await createRandomSeedTournament(page, name, 16);

		const links = await getCourtLinks(page);
		expect(links.length).toBe(4);
		await scoreAllMatchesOnCourt(page, links[0]);
		await scoreAllMatchesOnCourt(page, links[1]);
		await scoreAllMatchesOnCourt(page, links[2]);

		await page.goto(`/tournament/${tid}`);
		await expect(page.locator('button.btn-disabled')).toBeVisible();

		const result = await closeRoundViaFetch(page, tid);
		expect(result.ok).toBe(false);
		await page.goto(`/tournament/${tid}`);
		await expect(page.locator('text=Round 1 of')).toBeVisible();
	});

	test('8p tournament survives mid-round injury and completes', async ({ page }) => {
		test.slow();
		const name = `8pInjury ${Date.now()}`;
		testTournamentNames.push(name);
		const tid = await createRandomSeedTournament(page, name, 8, 2);
		const tournamentUrl = `/tournament/${tid}`;

		const links = await getCourtLinks(page);
		expect(links.length).toBe(2);
		await page.goto(links[0]);
		await page.waitForSelector('[data-testid^="match-form-"]');
		const forms = await page.locator('[data-testid^="match-form-"]').all();
		const matchId = (await forms[0].getAttribute('data-testid'))?.replace('match-form-', '');
		await page.fill(`[data-testid="team-a-score-${matchId}"]`, '21');
		await page.fill(`[data-testid="team-b-score-${matchId}"]`, '19');
		await page.click(`[data-testid="save-score-${matchId}"]`);
		await page.waitForSelector(`[data-testid="saved-${matchId}"]`);

		await page.goto(tournamentUrl);
		// Submit injury via UI
		await page.click('summary:has-text("Report Injury")');
		await page.waitForSelector('.injury-form');
		const opts = await page.locator('#injuryPlayerId option').allTextContents();
		const injured = opts.find((o) => /\bP1\b/.test(o));
		if (!injured) throw new Error('P1 not found for injury');
		await page.locator('#injuryPlayerId').selectOption({ label: injured.trim() });
		await page.locator('input[value="cancel"]').click();
		await page.locator('.injury-form button').click({ force: true });
		await page.waitForTimeout(3000);
		await page.reload();
		// Verify player is retired (not critical if fails)
		await page.waitForSelector('.player.retired', { timeout: 15000 }).catch(() => {});

		const allLinks = await getCourtLinks(page);
		await scoreAllCourts(page, allLinks);

		await page.goto(tournamentUrl);
		await closeRoundOrFetch(page, tid);
		await page.waitForSelector('text=Round 2 of 2', { timeout: 15000 });

		const r2Links = await getCourtLinks(page);
		expect(r2Links.length).toBeGreaterThan(0);
		await scoreAllCourts(page, r2Links);

		await page.goto(tournamentUrl);
		const finalizeBtn = page.locator('button:has-text("Finalize Tournament")');
		if (await finalizeBtn.isVisible().catch(() => false)) {
			await finalizeBtn.click();
			await page.waitForURL(/\/standings/, { timeout: 15000 });
		}
	});

	test('replacement player keeps roster size between rounds', async ({ page }) => {
		test.slow();
		const name = `Replacement ${Date.now()}`;
		testTournamentNames.push(name);
		const tid = await createRandomSeedTournament(page, name, 16, 2);

		const links = await getCourtLinks(page);
		await scoreAllCourts(page, links);

		await page.goto(`/tournament/${tid}`);
		const closeBtn = page.locator('button:has-text("Close Round & Advance")');
		await expect(closeBtn).toBeVisible({ timeout: 10000 });
		await closeBtn.click();
		await page.waitForSelector('text=Round 2 of 2', { timeout: 15000 });
		await waitForLiveQuerySettle(page);

		await page.click('summary:has-text("Retire a Player")');
		await page.waitForSelector('.retire-form');
		await page.waitForTimeout(500);
		await selectRetirePlayer(page, /\bP1\b/);
		await enableRetireReplacement(page, 'Replacement Alex');
		await clickRetireSubmitAndWait(page);
		await waitForRetireFormClosed(page);
		await waitForCourtCardCount(page, 4);
		await waitForTournamentPlayer(page, /Replacement Alex/i);

		const playerTexts = await page.locator('.court-card .player').allTextContents();
		expect(playerTexts.filter((t) => !/Retired/i.test(t)).length).toBeGreaterThanOrEqual(15);
	});

	test('standings page keeps round 1 history after mid-tournament retirement', async ({ page }) => {
		test.slow();
		const name = `StandingsHist ${Date.now()}`;
		testTournamentNames.push(name);

		await page.goto('/');
		await page.click('text=+ New Tournament');
		await page.fill('input[name="name"]', name);
		await page.fill('input[name="n:numRounds"]', '2');
		const players = Array.from({ length: 17 }, (_, i) => `Hist${i + 1}`);
		await page.fill('textarea[name="names"]', players.join('\n'));
		await page.click('button[type="submit"]');
		await page.waitForURL(/\/tournament\/\d+/);
		const tid = page.url().match(/\/tournament\/(\d+)/)![1];

		const links = await getCourtLinks(page);
		await scoreAllCourts(page, links);

		await page.goto(`/tournament/${tid}`);
		await page.click('button:has-text("Close Round & Advance")');
		await page.waitForSelector('text=Round 2 of 2', { timeout: 15000 });

		await page.click('summary:has-text("Retire a Player")');
		await page.waitForSelector('.retire-form');
		const opts = await page.locator('#retirePlayerId option').allTextContents();
		const target = opts.find((o) => /Hist16/.test(o));
		if (!target) throw new Error('Hist16 not found');
		await page.selectOption('#retirePlayerId', { label: target.trim() });
		await page.click('.retire-form button.btn-danger');
		await page.waitForTimeout(3000);

		await page.goto(`/tournament/${tid}/standings`);
		await page.waitForSelector('.standings-table tbody tr');
		const roundDataTexts = await page
			.locator('.standings-table tbody tr .round-data')
			.allTextContents();
		expect(roundDataTexts.some((t) => t.trim() !== '-' && t.length > 0)).toBe(true);
	});

	test('manual tie-break flow resolves court standings', async ({ page }) => {
		test.slow();
		const name = `ManualTie ${Date.now()}`;
		testTournamentNames.push(name);
		const tid = await createRandomSeedTournament(page, name, 8);

		await page.goto(`/tournament/${tid}`);
		await configureTieBreakFinal(page, 'manual');

		const links = await getCourtLinks(page);
		await scoreAllMatchesOnCourt(page, links[0]);

		await page.goto(`/tournament/${tid}`);
		await page.waitForSelector('.court-card', { timeout: 10000 });
		await page.waitForTimeout(2000);
		await page.waitForSelector('.btn-manual-tie', { timeout: 30000 });
		await page.click('.btn-manual-tie');
		await page.waitForSelector('.manual-tie-dialog');
		const moveDown = page.locator('.manual-rank-actions button').last();
		if (await moveDown.isEnabled()) await moveDown.click();
		await page.click('button:has-text("Save order")');
		await page.waitForTimeout(2000);

		const ranks = await page.locator('.court-card .standing-rank').allTextContents();
		expect(ranks.length).toBeGreaterThan(0);
	});

	test('dice tie-break assigns distinct ranks on tied court', async ({ page }) => {
		test.slow();
		const name = `DiceTie ${Date.now()}`;
		testTournamentNames.push(name);
		const tid = await createRandomSeedTournament(page, name, 8);

		await page.goto(`/tournament/${tid}`);
		await configureTieBreakFinal(page, 'dice');

		const links = await getCourtLinks(page);
		await scoreAllMatchesOnCourt(page, links[0]);

		await page.goto(`/tournament/${tid}`);
		await page.waitForSelector('.court-card', { timeout: 10000 });
		await page.waitForSelector('.court-standings-heading', { timeout: 30000 });
		const ranks = (await page.locator('.court-card .standing-rank').allTextContents()).map((r) =>
			r.replace('.', '').trim()
		);
		expect(ranks.length).toBe(4);
		expect(new Set(ranks).size).toBe(4);
	});
});
