# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: promotion.spec.ts >> Promotion and Relegation >> final round completion marks tournament as completed
- Location: e2e/promotion.spec.ts:275:2

# Error details

```
TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('button:has-text("Finalize Tournament"):not(:disabled)') to be visible

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - navigation [ref=e4]:
      - generic [ref=e5]: test@example.com
      - button "Sign Out" [ref=e6] [cursor=pointer]
    - main [ref=e7]:
      - main [ref=e8]:
        - generic [ref=e9]:
          - generic [ref=e10]:
            - img "King of the Beach" [ref=e11]
            - heading "KOB" [level=1] [ref=e12]
          - link "+ New Tournament" [ref=e13] [cursor=pointer]:
            - /url: /tournament/create
        - generic [ref=e14]:
          - heading "Active Tournaments" [level=2] [ref=e15]
          - generic [ref=e16]:
            - link "Final Round Test 1779561453382-y35ahi active Round 1 of 1" [active] [ref=e17] [cursor=pointer]:
              - /url: /tournament/1947
              - heading "Final Round Test 1779561453382-y35ahi" [level=3] [ref=e18]
              - generic [ref=e19]: active
              - paragraph [ref=e20]: Round 1 of 1
            - link "Close Round Test 1779561447293-8hwn2e active Round 1 of 2" [ref=e21] [cursor=pointer]:
              - /url: /tournament/1946
              - heading "Close Round Test 1779561447293-8hwn2e" [level=3] [ref=e22]
              - generic [ref=e23]: active
              - paragraph [ref=e24]: Round 1 of 2
            - link "Seeding Test 1779561436230-euvzzh active Round 2 of 3" [ref=e25] [cursor=pointer]:
              - /url: /tournament/1945
              - heading "Seeding Test 1779561436230-euvzzh" [level=3] [ref=e26]
              - generic [ref=e27]: active
              - paragraph [ref=e28]: Round 2 of 3
            - link "MaxPlayers 1779561429409 active Round 1 of 1" [ref=e29] [cursor=pointer]:
              - /url: /tournament/1944
              - heading "MaxPlayers 1779561429409" [level=3] [ref=e30]
              - generic [ref=e31]: active
              - paragraph [ref=e32]: Round 1 of 1
            - link "MinPlayers 1779561426667 active Round 1 of 1" [ref=e33] [cursor=pointer]:
              - /url: /tournament/1943
              - heading "MinPlayers 1779561426667" [level=3] [ref=e34]
              - generic [ref=e35]: active
              - paragraph [ref=e36]: Round 1 of 1
            - link "6pCourt 1779561423217 active Round 1 of 1" [ref=e37] [cursor=pointer]:
              - /url: /tournament/1942
              - heading "6pCourt 1779561423217" [level=3] [ref=e38]
              - generic [ref=e39]: active
              - paragraph [ref=e40]: Round 1 of 1
            - link "5pCourt 1779561419978 active Round 1 of 1" [ref=e41] [cursor=pointer]:
              - /url: /tournament/1941
              - heading "5pCourt 1779561419978" [level=3] [ref=e42]
              - generic [ref=e43]: active
              - paragraph [ref=e44]: Round 1 of 1
            - link "3pCourt 1779561417261 active Round 1 of 1" [ref=e45] [cursor=pointer]:
              - /url: /tournament/1940
              - heading "3pCourt 1779561417261" [level=3] [ref=e46]
              - generic [ref=e47]: active
              - paragraph [ref=e48]: Round 1 of 1
            - link "FlexibleInput 1779561410681 active Round 1 of 3" [ref=e49] [cursor=pointer]:
              - /url: /tournament/1939
              - heading "FlexibleInput 1779561410681" [level=3] [ref=e50]
              - generic [ref=e51]: active
              - paragraph [ref=e52]: Round 1 of 3
            - link "PreSeed32 1779561404950 active Round 1 of 4" [ref=e53] [cursor=pointer]:
              - /url: /tournament/1938
              - heading "PreSeed32 1779561404950" [level=3] [ref=e54]
              - generic [ref=e55]: active
              - paragraph [ref=e56]: Round 1 of 4
            - link "PreSeed16 1779561401927 active Round 1 of 3" [ref=e57] [cursor=pointer]:
              - /url: /tournament/1937
              - heading "PreSeed16 1779561401927" [level=3] [ref=e58]
              - generic [ref=e59]: active
              - paragraph [ref=e60]: Round 1 of 3
            - link "Random32 1779561398443 active Round 1 of 2" [ref=e61] [cursor=pointer]:
              - /url: /tournament/1936
              - heading "Random32 1779561398443" [level=3] [ref=e62]
              - generic [ref=e63]: active
              - paragraph [ref=e64]: Round 1 of 2
      - group [ref=e66]:
        - generic "Imprint / Legal Notice" [ref=e67] [cursor=pointer]
    - contentinfo [ref=e68]:
      - link "☕ Buy Me A Coffee" [ref=e69] [cursor=pointer]:
        - /url: https://buymeacoffee.com/accomade
  - region "Cookie information" [ref=e70]:
    - generic [ref=e71]:
      - paragraph [ref=e72]:
        - text: This site uses essential cookies for authentication and security.
        - button "Learn more" [ref=e73] [cursor=pointer]
      - button "Dismiss cookie notice" [ref=e74] [cursor=pointer]: OK
```

# Test source

```ts
  235 | 		// Complete all 3 matches for this court
  236 | 		for (let i = 0; i < 3; i++) {
  237 | 			await page.fill(`[data-testid="team-a-score-${matchIds[i]}"]`, '21');
  238 | 			await page.fill(`[data-testid="team-b-score-${matchIds[i]}"]`, '19');
  239 | 			await page.click(`[data-testid="save-score-${matchIds[i]}"]`);
  240 | 		}
  241 | 
  242 | 		// Navigate to tournament page - button should still show waiting
  243 | 		await page.goto(`/tournament/${tournamentId}`);
  244 | 		await page.waitForSelector('button:has-text("Waiting")');
  245 | 
  246 | 		// Complete matches on remaining courts
  247 | 		for (let courtNum = 1; courtNum < 4; courtNum++) {
  248 | 			await page.goto(courtLinks[courtNum]);
  249 | 
  250 | 			// Get all match IDs on this court
  251 | 			await page.waitForSelector('[data-testid^="match-form-"]');
  252 | 			const courtMatchForms = await page.locator('[data-testid^="match-form-"]').all();
  253 | 			const courtMatchIds = await Promise.all(
  254 | 				courtMatchForms.map(async (form) => {
  255 | 					const testId = await form.getAttribute('data-testid');
  256 | 					return testId?.replace('match-form-', '');
  257 | 				})
  258 | 			);
  259 | 			expect(courtMatchIds.length).toBe(3);
  260 | 
  261 | 			for (let i = 0; i < 3; i++) {
  262 | 				await page.fill(`[data-testid="team-a-score-${courtMatchIds[i]}"]`, '21');
  263 | 				await page.fill(`[data-testid="team-b-score-${courtMatchIds[i]}"]`, '19');
  264 | 				await page.click(`[data-testid="save-score-${courtMatchIds[i]}"]`);
  265 | 			}
  266 | 		}
  267 | 
  268 | 		// Navigate to tournament page and close round button should be enabled
  269 | 		await page.goto(`/tournament/${tournamentId}`);
  270 | 		await page.waitForSelector('button:has-text("Close Round")');
  271 | 		const enabledButton = await page.locator('button:has-text("Close Round")');
  272 | 		await expect(enabledButton).toBeEnabled();
  273 | 	});
  274 | 
  275 | 	test('final round completion marks tournament as completed', async ({ page }) => {
  276 | 		// Generate unique tournament name with timestamp and random suffix
  277 | 		const tournamentName = `Final Round Test ${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  278 | 		testTournamentNames.push(tournamentName);
  279 | 
  280 | 		// Create a 1-round tournament (ends after first round) with players
  281 | 		await page.waitForSelector('text=+ New Tournament');
  282 | 		await page.click('text=+ New Tournament');
  283 | 		await page.fill('input[name="name"]', tournamentName);
  284 | 		await page.fill('input[name="numRounds"]', '1');
  285 | 
  286 | 		// Add 16 players
  287 | 		const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1}`);
  288 | 		await page.fill('textarea[name="names"]', players.join('\n'));
  289 | 		await page.click('button[type="submit"]');
  290 | 
  291 | 		await page.waitForURL(/\/tournament\/\d+/);
  292 | 		await page.waitForSelector('.qr-link a');
  293 | 
  294 | 		// Capture tournament ID for later navigation
  295 | 		const tournamentUrl = page.url();
  296 | 		const tournamentMatch = tournamentUrl.match(/\/tournament\/(\d+)/);
  297 | 		const tournamentId = tournamentMatch ? tournamentMatch[1] : null;
  298 | 		expect(tournamentId).toBeTruthy();
  299 | 
  300 | 		// Get all court URLs first
  301 | 		const courtLinksSel = await page.locator('.qr-link a').all();
  302 | 		const courtLinks: string[] = [];
  303 | 		for (const cl of courtLinksSel) {
  304 | 			const url = await cl.getAttribute('href');
  305 | 			if (url) courtLinks.push(url);
  306 | 		}
  307 | 		expect(courtLinks.length).toBe(4);
  308 | 
  309 | 		// Complete all matches
  310 | 		for (const courtUrl of courtLinks) {
  311 | 			await page.goto(courtUrl);
  312 | 
  313 | 			// Get all match IDs on this court
  314 | 			await page.waitForSelector('[data-testid^="match-form-"]');
  315 | 			const matchForms = await page.locator('[data-testid^="match-form-"]').all();
  316 | 			const matchIds = await Promise.all(
  317 | 				matchForms.map(async (form) => {
  318 | 					const testId = await form.getAttribute('data-testid');
  319 | 					return testId?.replace('match-form-', '');
  320 | 				})
  321 | 			);
  322 | 			expect(matchIds.length).toBe(3);
  323 | 
  324 | 			for (let i = 0; i < 3; i++) {
  325 | 				await page.fill(`[data-testid="team-a-score-${matchIds[i]}"]`, '21');
  326 | 				await page.fill(`[data-testid="team-b-score-${matchIds[i]}"]`, '19');
  327 | 				await page.click(`[data-testid="save-score-${matchIds[i]}"]`);
  328 | 				await page.waitForSelector('.saved');
  329 | 			}
  330 | 		}
  331 | 
  332 | 		// Close the only round
  333 | 		await page.goto(`/tournament/${tournamentId}`);
  334 | 		await page.waitForSelector('.court-card');
> 335 | 		await page.waitForSelector('button:has-text("Finalize Tournament"):not(:disabled)', {
      |              ^ TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
  336 | 			timeout: 10000
  337 | 		});
  338 | 		await page.click('button:has-text("Finalize Tournament")');
  339 | 
  340 | 		// Wait for redirect to standings
  341 | 		await page.waitForURL(/\/standings/);
  342 | 
  343 | 		// Tournament should be marked as completed
  344 | 		await page.goto('/?t=' + Date.now());
  345 | 		await page.waitForSelector(
  346 | 			`section:has(h2:has-text("Finished")) .tournament-card:has-text("${tournamentName}")`,
  347 | 			{ timeout: 10000 }
  348 | 		);
  349 | 		const statusBadge = page
  350 | 			.locator(`.tournament-card:has-text("${tournamentName}") .status.completed`)
  351 | 			.first();
  352 | 		await expect(statusBadge).toBeVisible();
  353 | 	});
  354 | 
  355 | 	test('maintains exactly 4 players per court after redistribution', async ({ page }) => {
  356 | 		// Generate unique tournament name with timestamp and random suffix
  357 | 		const tournamentName = `Player Count Test ${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  358 | 		testTournamentNames.push(tournamentName);
  359 | 
  360 | 		// Create a 3-round tournament with players
  361 | 		await page.waitForSelector('text=+ New Tournament');
  362 | 		await page.click('text=+ New Tournament');
  363 | 		await page.fill('input[name="name"]', tournamentName);
  364 | 		await page.fill('input[name="numRounds"]', '3');
  365 | 
  366 | 		// Add 16 players
  367 | 		const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1}`);
  368 | 		await page.fill('textarea[name="names"]', players.join('\n'));
  369 | 		await page.click('button[type="submit"]');
  370 | 
  371 | 		await page.waitForURL(/\/tournament\/\d+/);
  372 | 
  373 | 		// Capture tournament ID for later navigation
  374 | 		const tournamentUrl = page.url();
  375 | 		const tournamentMatch = tournamentUrl.match(/\/tournament\/(\d+)/);
  376 | 		const tournamentId = tournamentMatch ? tournamentMatch[1] : null;
  377 | 		expect(tournamentId).toBeTruthy();
  378 | 
  379 | 		// Get all court URLs first
  380 | 		await page.waitForSelector('.qr-link a');
  381 | 		const courtLinksSel = await page.locator('.qr-link a').all();
  382 | 		const courtLinks: string[] = [];
  383 | 		for (const cl of courtLinksSel) {
  384 | 			const url = await cl.getAttribute('href');
  385 | 			if (url) courtLinks.push(url);
  386 | 		}
  387 | 		expect(courtLinks.length).toBe(4);
  388 | 
  389 | 		// Complete Round 1 and close it
  390 | 		for (const courtUrl of courtLinks) {
  391 | 			await page.goto(courtUrl);
  392 | 
  393 | 			// Get all match IDs on this court
  394 | 			await page.waitForSelector('[data-testid^="match-form-"]');
  395 | 			const matchForms = await page.locator('[data-testid^="match-form-"]').all();
  396 | 			const matchIds = await Promise.all(
  397 | 				matchForms.map(async (form) => {
  398 | 					const testId = await form.getAttribute('data-testid');
  399 | 					return testId?.replace('match-form-', '');
  400 | 				})
  401 | 			);
  402 | 			expect(matchIds.length).toBe(3);
  403 | 
  404 | 			for (let i = 0; i < 3; i++) {
  405 | 				await page.fill(`[data-testid="team-a-score-${matchIds[i]}"]`, '21');
  406 | 				await page.fill(`[data-testid="team-b-score-${matchIds[i]}"]`, '19');
  407 | 				await page.click(`[data-testid="save-score-${matchIds[i]}"]`);
  408 | 			}
  409 | 		}
  410 | 
  411 | 		await page.goto(`/tournament/${tournamentId}`);
  412 | 		await page.waitForSelector('button:has-text("Close Round")');
  413 | 		await page.click('button:has-text("Close Round")');
  414 | 
  415 | 		// Verify Round 2
  416 | 		await page.waitForSelector('text=Round 2 of 3');
  417 | 
  418 | 		// Check each court has exactly 4 players
  419 | 		await page.waitForSelector('.qr-link a');
  420 | 		const round2LinksSel = await page.locator('.qr-link a').all();
  421 | 		const round2Links: string[] = [];
  422 | 		for (const cl of round2LinksSel) {
  423 | 			const url = await cl.getAttribute('href');
  424 | 			if (url) round2Links.push(url);
  425 | 		}
  426 | 		expect(round2Links.length).toBe(4);
  427 | 
  428 | 		for (let i = 0; i < 4; i++) {
  429 | 			await page.goto(round2Links[i]);
  430 | 			await page.waitForSelector('.standings tbody tr');
  431 | 			const playerCount = await page.locator('.standings tbody tr').count();
  432 | 			expect(playerCount).toBe(4);
  433 | 		}
  434 | 	});
  435 | 
```