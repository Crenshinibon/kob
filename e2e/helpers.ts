import { expect, type Page } from '@playwright/test';

export async function dismissCookieNotice(page: Page): Promise<void> {
	const dismissBtn = page.locator('button.cookie-btn, button:has-text("OK")');
	if (await dismissBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
		await dismissBtn.click({ force: true });
	}
	await page.evaluate(() => {
		localStorage.setItem('cookie-notice-dismissed', 'true');
	});
}

export async function login(page: Page): Promise<void> {
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

	await dismissCookieNotice(page);
}

export async function createSetupTournament(
	page: Page,
	name: string,
	playerCount: number,
	numRounds = 2,
	formatType: 'random-seed' | 'preseed' = 'random-seed'
): Promise<string> {
	await page.goto('/');
	await page.waitForSelector('text=+ New Tournament');
	await page.click('text=+ New Tournament');
	await page.fill('input[name="name"]', name);
	if (formatType === 'preseed') {
		await page.click('input[value="preseed"]');
	} else {
		await page.fill('input[name="n:numRounds"]', String(numRounds));
	}
	if (playerCount > 0) {
		const players = Array.from({ length: playerCount }, (_, i) => `P${i + 1}`);
		await page.fill('textarea[name="names"]', players.join('\n'));
	}
	await page.click('button[type="submit"]');
	await page.waitForURL(/\/tournament\/\d+/);
	const match = page.url().match(/\/tournament\/(\d+)/);
	expect(match).toBeTruthy();
	return match![1];
}

export async function createRandomSeedTournament(
	page: Page,
	name: string,
	playerCount: number,
	numRounds = 2
): Promise<string> {
	const id = await createSetupTournament(page, name, playerCount, numRounds);
	await startTournamentFromSetup(page);
	return id;
}

export type PlayerLink = { id: string; name: string; token: string; url: string };

export async function getPlayerLinks(page: Page, tournamentId: string): Promise<PlayerLink[]> {
	await page.goto(`/tournament/${tournamentId}/check-in`);
	await page.waitForSelector('[data-testid="checkin-page"]');
	await page.waitForSelector('[data-player-token]', { timeout: 15000 });
	return page.locator('[data-player-token]').evaluateAll((els) =>
		els.map((el) => {
			const token = el.getAttribute('data-player-token') ?? '';
			return {
				id: el.getAttribute('data-player-id') ?? '',
				name: el.getAttribute('data-player-name') ?? '',
				token,
				url: `/player/${token}`
			};
		})
	);
}

export async function startTournamentFromSetup(page: Page): Promise<void> {
	const start = page.getByTestId('start-tournament');
	await expect(start).toBeEnabled({ timeout: 15000 });
	await start.click();
	await expect(page.locator('.court-card, .qr-link a').first()).toBeVisible({ timeout: 30000 });
}

/** After Create, start if the setup panel is showing. Safe to call when already started. */
export async function ensureTournamentStarted(page: Page): Promise<void> {
	await page
		.locator('[data-testid="start-tournament"], .court-card, .qr-link a')
		.first()
		.waitFor({ state: 'visible', timeout: 20000 });
	const start = page.getByTestId('start-tournament');
	if (await start.isVisible().catch(() => false)) {
		await startTournamentFromSetup(page);
	}
}

export async function getCourtLinks(page: Page): Promise<string[]> {
	await ensureTournamentStarted(page);
	await page.waitForSelector('.qr-link a');
	return page
		.locator('.qr-link a')
		.evaluateAll((els) => els.map((el) => (el as HTMLAnchorElement).href).filter(Boolean));
}

export async function waitForCourtCardCount(
	page: Page,
	count: number,
	timeout = 30000
): Promise<void> {
	await expect
		.poll(
			async () => {
				return page.locator('.court-card').count();
			},
			{ timeout }
		)
		.toBe(count);
}

export async function waitForLiveQuerySettle(page: Page, ms = 1500): Promise<void> {
	await page.waitForTimeout(ms);
}

/** Select a retire player by name pattern; verifies bind:value stuck before submit. */
export async function selectRetirePlayer(page: Page, namePattern: RegExp): Promise<void> {
	const pattern = namePattern.source;
	const flags = namePattern.flags;
	const value = await page.locator('#retirePlayerId option').evaluateAll(
		(opts, { pattern, flags }) => {
			const re = new RegExp(pattern, flags);
			for (const opt of opts) {
				const text = opt.textContent ?? '';
				if (opt.value && re.test(text)) return opt.value;
			}
			return null;
		},
		{ pattern, flags }
	);
	if (!value) throw new Error(`Retire player not found matching ${namePattern}`);
	await page.selectOption('#retirePlayerId', value);
	await expect(page.locator('#retirePlayerId')).toHaveValue(value);
}

export async function clickRetireSubmit(page: Page): Promise<void> {
	await dismissCookieNotice(page);
	const btn = page.locator('.retire-form button.btn-danger');
	await expect(page.locator('#retirePlayerId')).not.toHaveValue('');
	await btn.click({ timeout: 10000 });
}

/** Toggle replacement checkbox and fill name (Svelte bind:checked needs label click). */
export async function enableRetireReplacement(page: Page, replacementName: string): Promise<void> {
	const checkbox = page.locator('.retire-form .checkbox-label input[type="checkbox"]');
	if (!(await checkbox.isChecked())) {
		await page.locator('.retire-form .checkbox-label').click();
	}
	await expect(checkbox).toBeChecked({ timeout: 5000 });
	await expect(page.locator('#replacementName')).toBeVisible({ timeout: 5000 });
	await page.fill('#replacementName', replacementName);
}

/** Click retire confirm and wait for the details panel to close (command finished). */
export async function clickRetireSubmitAndWait(page: Page): Promise<void> {
	await dismissCookieNotice(page);
	const btn = page.locator('.retire-form button.btn-danger');
	const details = page.locator('section.retire-section details');
	await expect(page.locator('#retirePlayerId')).not.toHaveValue('');
	await expect(btn).toBeEnabled();

	const remoteDone = page
		.waitForResponse(
			(res) =>
				res.request().method() === 'POST' &&
				res.url().includes('/remote/') &&
				res.url().includes('retirePlayer'),
			{ timeout: 30000 }
		)
		.catch(() => null);

	await btn.click({ timeout: 10000 });
	const response = await remoteDone;
	if (response) {
		expect(response.status()).toBeLessThan(500);
	}

	await expect(details).not.toHaveAttribute('open', { timeout: 30000 });
}

export async function waitForRetireFormClosed(page: Page, timeout = 15000): Promise<void> {
	await expect(page.locator('.retire-form')).toBeHidden({ timeout });
}

export async function waitForTournamentPlayer(
	page: Page,
	namePattern: RegExp,
	timeout = 30000
): Promise<void> {
	await expect
		.poll(
			async () => {
				const texts = await page.locator('.court-card .player').allTextContents();
				return texts.some((t) => namePattern.test(t));
			},
			{ timeout }
		)
		.toBe(true);
}

/** Standings on the court page come from server load data; reload after saving scores. */
export async function reloadForCourtStandings(
	page: Page,
	selector = '.standings tbody tr'
): Promise<void> {
	await page.reload();
	await page.waitForSelector(selector);
}

export async function scoreAllMatchesOnCourt(
	page: Page,
	courtUrl: string,
	aScore = 21,
	bScore = 19
): Promise<void> {
	await page.goto(courtUrl);
	await page
		.waitForSelector(
			'[data-testid^="match-form-"], [data-testid^="saved-"], .canceled-notice, .player-card',
			{ timeout: 15000 }
		)
		.catch(() => {});
	const matchIds = await extractMatchIds(page);
	for (const matchId of matchIds) {
		const savedCount = await page.locator(`[data-testid="saved-${matchId}"]`).count();
		if (savedCount > 0) continue;
		await page.fill(`[data-testid="team-a-score-${matchId}"]`, String(aScore));
		await page.fill(`[data-testid="team-b-score-${matchId}"]`, String(bScore));
		await page.click(`[data-testid="save-score-${matchId}"]`);
		const appeared = await page
			.locator(`[data-testid="saved-${matchId}"]`)
			.waitFor({ state: 'visible', timeout: 5000 })
			.then(() => true)
			.catch(() => false);
		if (!appeared) {
			await page.reload();
			await page
				.waitForSelector(`[data-testid="saved-${matchId}"]`, { timeout: 10000 })
				.catch(() => {});
		}
	}
}

export async function extractMatchIds(page: Page): Promise<string[]> {
	try {
		await page.waitForSelector('[data-testid^="match-form-"]', { timeout: 5000 });
	} catch {
		return [];
	}
	return page
		.locator('[data-testid^="match-form-"]')
		.evaluateAll((els) =>
			els
				.map((el) => el.getAttribute('data-testid')?.replace('match-form-', '') ?? '')
				.filter(Boolean)
		);
}

export async function scoreAllCourts(page: Page, links: string[]): Promise<void> {
	for (const link of links) {
		await scoreAllMatchesOnCourt(page, link);
	}
}

export async function scoreAllOpenMatches(page: Page): Promise<void> {
	const links = await getCourtLinks(page);
	for (const link of links) {
		await page.goto(link);
		await page
			.waitForSelector(
				'[data-testid^="match-form-"], [data-testid^="saved-"], .canceled-notice, .player-card',
				{ timeout: 15000 }
			)
			.catch(() => {});
		const formCount = await page.locator('[data-testid^="match-form-"]').count();
		if (formCount === 0) continue;
		const matchIds = await extractMatchIds(page);
		for (const matchId of matchIds) {
			const saved = await page.locator(`[data-testid="saved-${matchId}"]`).count();
			if (saved > 0) continue;
			await page.fill(`[data-testid="team-a-score-${matchId}"]`, '21');
			await page.fill(`[data-testid="team-b-score-${matchId}"]`, '19');
			await page.click(`[data-testid="save-score-${matchId}"]`);
			const appeared = await page
				.locator(`[data-testid="saved-${matchId}"]`)
				.waitFor({ state: 'visible', timeout: 5000 })
				.then(() => true)
				.catch(() => false);
			if (!appeared) {
				await page.reload();
				await page
					.waitForSelector(`[data-testid="saved-${matchId}"]`, { timeout: 10000 })
					.catch(() => {});
			}
		}
	}
}

export async function closeRoundViaFetch(
	page: Page,
	tournamentId: string
): Promise<{ ok: boolean; status: number; reason?: string; body?: string }> {
	return page.evaluate(async (tid) => {
		const fd = new URLSearchParams();
		fd.set('n:tournamentId', String(tid));
		const anyInput = document.querySelector(
			'input[name="n:tournamentId"]'
		) as HTMLInputElement | null;
		if (!anyInput) return { ok: false, status: 0, reason: 'no input on page' };
		const anyForm = anyInput.closest('form') as HTMLFormElement | null;
		if (!anyForm) return { ok: false, status: 0, reason: 'no form' };
		const remoteParam = new URL(anyForm.action).searchParams.get('/remote');
		if (!remoteParam) return { ok: false, status: 0, reason: 'no remote param' };
		const hash = remoteParam.split('/')[0];
		if (!hash) return { ok: false, status: 0, reason: 'no hash' };
		const remoteUrl = '/_app/remote/' + hash + '/closeRoundForm';
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), 15000);
		try {
			const res = await fetch(remoteUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: fd.toString(),
				signal: controller.signal
			});
			const text = await res.text();
			try {
				const json = JSON.parse(text);
				const status = json?.status ?? res.status;
				return { ok: status < 400, status, body: text.slice(0, 200) };
			} catch {
				return { ok: res.ok, status: res.status, body: text.slice(0, 200) };
			}
		} catch (err) {
			return {
				ok: false,
				status: 0,
				reason: err instanceof Error ? err.message : 'fetch failed'
			};
		} finally {
			clearTimeout(timer);
		}
	}, tournamentId);
}

export async function closeRoundOrFetch(
	page: Page,
	tournamentId: string,
	timeout = 30000
): Promise<void> {
	await page
		.waitForSelector(
			'input[name="n:tournamentId"], button:has-text("Close Round & Advance"), button:has-text("Finalize Tournament"), button:has-text("Waiting")',
			{ timeout: 15000 }
		)
		.catch(() => {});

	await expect
		.poll(
			async () => {
				const advanceBtn = page.locator('button:has-text("Close Round & Advance")');
				const finalizeBtn = page.locator('button:has-text("Finalize Tournament")');
				if (await advanceBtn.isEnabled().catch(() => false)) {
					await advanceBtn.click();
					return true;
				}
				if (await finalizeBtn.isEnabled().catch(() => false)) {
					await finalizeBtn.click();
					return true;
				}
				const res = await closeRoundViaFetch(page, tournamentId);
				return res.ok;
			},
			{ timeout }
		)
		.toBe(true);
}

export async function configureTieBreakFinal(
	page: Page,
	finalFactor: 'manual' | 'dice'
): Promise<void> {
	await page.click('summary:has-text("Tie-break rules")');
	await page.waitForSelector('.tie-break-list');

	await page.evaluate(
		({ finalFactor: ff }) => {
			const items = document.querySelectorAll('.tie-break-item');
			for (const item of items) {
				const cb = item.querySelector('input[type="checkbox"]') as HTMLInputElement;
				if (cb && cb.checked) {
					cb.checked = false;
					cb.dispatchEvent(new Event('change', { bubbles: true }));
				}
			}
			const radios = document.querySelectorAll('.tie-break-final-option input[type="radio"]');
			const pattern = ff === 'manual' ? /Manual/i : /Dice/i;
			for (const radio of radios) {
				const label = radio.closest('label');
				if (label && pattern.test(label.textContent ?? '')) {
					radio.checked = true;
					radio.dispatchEvent(new Event('change', { bubbles: true }));
				}
			}
		},
		{ finalFactor }
	);

	await page.waitForTimeout(500);

	const saveBtn = page.locator('button:has-text("Save tie-break rules")');
	await expect(saveBtn).toBeVisible({ timeout: 10000 });
	await saveBtn.click();
	await page
		.waitForSelector('button:has-text("Save tie-break rules")', {
			state: 'detached',
			timeout: 10000
		})
		.catch(() => {});
	await page.waitForTimeout(500);
}

export async function deleteTournament(page: Page, tournamentName: string): Promise<void> {
	try {
		await page.goto('/');
		const card = page.locator(`.tournament-card:has-text("${tournamentName}")`).first();
		if (await card.isVisible().catch(() => false)) {
			await card.click();
			const deleteButton = page.locator('button:has-text("Delete")');
			if (await deleteButton.isVisible().catch(() => false)) {
				await deleteButton.click();
				const confirmButton = page.locator('button:has-text("Confirm")');
				if (await confirmButton.isVisible().catch(() => false)) {
					await confirmButton.click();
				}
			}
		}
	} catch {
		// ignore cleanup errors
	}
}
