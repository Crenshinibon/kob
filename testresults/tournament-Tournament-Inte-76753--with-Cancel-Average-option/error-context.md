# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tournament.spec.ts >> Tournament Integration Tests >> Player Retirement >> report mid-round injury with Cancel & Average option
- Location: e2e/tournament.spec.ts:810:3

# Error details

```
TimeoutError: page.waitForSelector: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('button:has-text("Close Round & Advance"):not(:disabled)') to be visible

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
                        - link "Injury Cancel Test 1779561629529 active Round 1 of 2" [active] [ref=e17] [cursor=pointer]:
                            - /url: /tournament/1973
                            - heading "Injury Cancel Test 1779561629529" [level=3] [ref=e18]
                            - generic [ref=e19]: active
                            - paragraph [ref=e20]: Round 1 of 2
                        - link "Cancel Delete Test 1779561606708 active Round 1 of 3" [ref=e21] [cursor=pointer]:
                            - /url: /tournament/1971
                            - heading "Cancel Delete Test 1779561606708" [level=3] [ref=e22]
                            - generic [ref=e23]: active
                            - paragraph [ref=e24]: Round 1 of 3
                        - link "5pValidation 1779561595348 active Round 1 of 1" [ref=e25] [cursor=pointer]:
                            - /url: /tournament/1969
                            - heading "5pValidation 1779561595348" [level=3] [ref=e26]
                            - generic [ref=e27]: active
                            - paragraph [ref=e28]: Round 1 of 1
                        - link "SingleScore 1779561590614 active Round 1 of 3" [ref=e29] [cursor=pointer]:
                            - /url: /tournament/1968
                            - heading "SingleScore 1779561590614" [level=3] [ref=e30]
                            - generic [ref=e31]: active
                            - paragraph [ref=e32]: Round 1 of 3
                        - link "Bo3Score 1779561584198 active Round 1 of 3" [ref=e33] [cursor=pointer]:
                            - /url: /tournament/1967
                            - heading "Bo3Score 1779561584198" [level=3] [ref=e34]
                            - generic [ref=e35]: active
                            - paragraph [ref=e36]: Round 1 of 3
                        - link "5pScoring 1779561580933 active Round 1 of 1" [ref=e37] [cursor=pointer]:
                            - /url: /tournament/1966
                            - heading "5pScoring 1779561580933" [level=3] [ref=e38]
                            - generic [ref=e39]: active
                            - paragraph [ref=e40]: Round 1 of 1
                        - link "Active Dashboard Test 1779561575632 active Round 1 of 3" [ref=e41] [cursor=pointer]:
                            - /url: /tournament/1965
                            - heading "Active Dashboard Test 1779561575632" [level=3] [ref=e42]
                            - generic [ref=e43]: active
                            - paragraph [ref=e44]: Round 1 of 3
                        - link "Public Access Test 1779561571971 active Round 1 of 3" [ref=e45] [cursor=pointer]:
                            - /url: /tournament/1964
                            - heading "Public Access Test 1779561571971" [level=3] [ref=e46]
                            - generic [ref=e47]: active
                            - paragraph [ref=e48]: Round 1 of 3
                        - link "3pScore 1779561550181 active Round 1 of 1" [ref=e49] [cursor=pointer]:
                            - /url: /tournament/1962
                            - heading "3pScore 1779561550181" [level=3] [ref=e50]
                            - generic [ref=e51]: active
                            - paragraph [ref=e52]: Round 1 of 1
                        - link "5pScore 1779561545725 active Round 1 of 1" [ref=e53] [cursor=pointer]:
                            - /url: /tournament/1961
                            - heading "5pScore 1779561545725" [level=3] [ref=e54]
                            - generic [ref=e55]: active
                            - paragraph [ref=e56]: Round 1 of 1
                        - link "Round1Ranking 1779561536758 active Round 1 of 2" [ref=e57] [cursor=pointer]:
                            - /url: /tournament/1960
                            - heading "Round1Ranking 1779561536758" [level=3] [ref=e58]
                            - generic [ref=e59]: active
                            - paragraph [ref=e60]: Round 1 of 2
                        - link "5pRanking 1779561531974 active Round 1 of 1" [ref=e61] [cursor=pointer]:
                            - /url: /tournament/1959
                            - heading "5pRanking 1779561531974" [level=3] [ref=e62]
                            - generic [ref=e63]: active
                            - paragraph [ref=e64]: Round 1 of 1
                        - link "3pRanking 1779561527598 active Round 1 of 1" [ref=e65] [cursor=pointer]:
                            - /url: /tournament/1958
                            - heading "3pRanking 1779561527598" [level=3] [ref=e66]
                            - generic [ref=e67]: active
                            - paragraph [ref=e68]: Round 1 of 1
                        - link "6pStandings 1779561523594 active Round 1 of 1" [ref=e69] [cursor=pointer]:
                            - /url: /tournament/1957
                            - heading "6pStandings 1779561523594" [level=3] [ref=e70]
                            - generic [ref=e71]: active
                            - paragraph [ref=e72]: Round 1 of 1
                        - link "5pStandings 1779561519497 active Round 1 of 1" [ref=e73] [cursor=pointer]:
                            - /url: /tournament/1956
                            - heading "5pStandings 1779561519497" [level=3] [ref=e74]
                            - generic [ref=e75]: active
                            - paragraph [ref=e76]: Round 1 of 1
                        - link "3pStandings 1779561515873 active Round 1 of 1" [ref=e77] [cursor=pointer]:
                            - /url: /tournament/1955
                            - heading "3pStandings 1779561515873" [level=3] [ref=e78]
                            - generic [ref=e79]: active
                            - paragraph [ref=e80]: Round 1 of 1
                        - link "Validation Test 1779561510427 active Round 1 of 3" [ref=e81] [cursor=pointer]:
                            - /url: /tournament/1954
                            - heading "Validation Test 1779561510427" [level=3] [ref=e82]
                            - generic [ref=e83]: active
                            - paragraph [ref=e84]: Round 1 of 3
                        - link "Multi-Match Points 1779561505427 active Round 1 of 3" [ref=e85] [cursor=pointer]:
                            - /url: /tournament/1953
                            - heading "Multi-Match Points 1779561505427" [level=3] [ref=e86]
                            - generic [ref=e87]: active
                            - paragraph [ref=e88]: Round 1 of 3
                        - link "Tiebreaker Test 1779561500800 active Round 1 of 3" [ref=e89] [cursor=pointer]:
                            - /url: /tournament/1952
                            - heading "Tiebreaker Test 1779561500800" [level=3] [ref=e90]
                            - generic [ref=e91]: active
                            - paragraph [ref=e92]: Round 1 of 3
                        - link "Sorting Test 1779561496209 active Round 1 of 3" [ref=e93] [cursor=pointer]:
                            - /url: /tournament/1951
                            - heading "Sorting Test 1779561496209" [level=3] [ref=e94]
                            - generic [ref=e95]: active
                            - paragraph [ref=e96]: Round 1 of 3
                        - link "Standings Test 1779561491541 active Round 1 of 3" [ref=e97] [cursor=pointer]:
                            - /url: /tournament/1950
                            - heading "Standings Test 1779561491541" [level=3] [ref=e98]
                            - generic [ref=e99]: active
                            - paragraph [ref=e100]: Round 1 of 3
                        - link "3pRedist 1779561482348 active Round 2 of 2" [ref=e101] [cursor=pointer]:
                            - /url: /tournament/1949
                            - heading "3pRedist 1779561482348" [level=3] [ref=e102]
                            - generic [ref=e103]: active
                            - paragraph [ref=e104]: Round 2 of 2
                        - link "Player Count Test 1779561473794-nd1lg7 active Round 2 of 3" [ref=e105] [cursor=pointer]:
                            - /url: /tournament/1948
                            - heading "Player Count Test 1779561473794-nd1lg7" [level=3] [ref=e106]
                            - generic [ref=e107]: active
                            - paragraph [ref=e108]: Round 2 of 3
                        - link "Final Round Test 1779561453382-y35ahi active Round 1 of 1" [ref=e109] [cursor=pointer]:
                            - /url: /tournament/1947
                            - heading "Final Round Test 1779561453382-y35ahi" [level=3] [ref=e110]
                            - generic [ref=e111]: active
                            - paragraph [ref=e112]: Round 1 of 1
                        - link "Close Round Test 1779561447293-8hwn2e active Round 1 of 2" [ref=e113] [cursor=pointer]:
                            - /url: /tournament/1946
                            - heading "Close Round Test 1779561447293-8hwn2e" [level=3] [ref=e114]
                            - generic [ref=e115]: active
                            - paragraph [ref=e116]: Round 1 of 2
                        - link "Seeding Test 1779561436230-euvzzh active Round 2 of 3" [ref=e117] [cursor=pointer]:
                            - /url: /tournament/1945
                            - heading "Seeding Test 1779561436230-euvzzh" [level=3] [ref=e118]
                            - generic [ref=e119]: active
                            - paragraph [ref=e120]: Round 2 of 3
                        - link "MaxPlayers 1779561429409 active Round 1 of 1" [ref=e121] [cursor=pointer]:
                            - /url: /tournament/1944
                            - heading "MaxPlayers 1779561429409" [level=3] [ref=e122]
                            - generic [ref=e123]: active
                            - paragraph [ref=e124]: Round 1 of 1
                        - link "MinPlayers 1779561426667 active Round 1 of 1" [ref=e125] [cursor=pointer]:
                            - /url: /tournament/1943
                            - heading "MinPlayers 1779561426667" [level=3] [ref=e126]
                            - generic [ref=e127]: active
                            - paragraph [ref=e128]: Round 1 of 1
                        - link "6pCourt 1779561423217 active Round 1 of 1" [ref=e129] [cursor=pointer]:
                            - /url: /tournament/1942
                            - heading "6pCourt 1779561423217" [level=3] [ref=e130]
                            - generic [ref=e131]: active
                            - paragraph [ref=e132]: Round 1 of 1
                        - link "5pCourt 1779561419978 active Round 1 of 1" [ref=e133] [cursor=pointer]:
                            - /url: /tournament/1941
                            - heading "5pCourt 1779561419978" [level=3] [ref=e134]
                            - generic [ref=e135]: active
                            - paragraph [ref=e136]: Round 1 of 1
                        - link "3pCourt 1779561417261 active Round 1 of 1" [ref=e137] [cursor=pointer]:
                            - /url: /tournament/1940
                            - heading "3pCourt 1779561417261" [level=3] [ref=e138]
                            - generic [ref=e139]: active
                            - paragraph [ref=e140]: Round 1 of 1
                        - link "FlexibleInput 1779561410681 active Round 1 of 3" [ref=e141] [cursor=pointer]:
                            - /url: /tournament/1939
                            - heading "FlexibleInput 1779561410681" [level=3] [ref=e142]
                            - generic [ref=e143]: active
                            - paragraph [ref=e144]: Round 1 of 3
                        - link "PreSeed32 1779561404950 active Round 1 of 4" [ref=e145] [cursor=pointer]:
                            - /url: /tournament/1938
                            - heading "PreSeed32 1779561404950" [level=3] [ref=e146]
                            - generic [ref=e147]: active
                            - paragraph [ref=e148]: Round 1 of 4
                        - link "PreSeed16 1779561401927 active Round 1 of 3" [ref=e149] [cursor=pointer]:
                            - /url: /tournament/1937
                            - heading "PreSeed16 1779561401927" [level=3] [ref=e150]
                            - generic [ref=e151]: active
                            - paragraph [ref=e152]: Round 1 of 3
                        - link "Random32 1779561398443 active Round 1 of 2" [ref=e153] [cursor=pointer]:
                            - /url: /tournament/1936
                            - heading "Random32 1779561398443" [level=3] [ref=e154]
                            - generic [ref=e155]: active
                            - paragraph [ref=e156]: Round 1 of 2
                - generic [ref=e157]:
                    - heading "Finished Tournaments" [level=2] [ref=e158]
                    - generic [ref=e159]:
                        - link "Retire Test 1779561609992 completed" [ref=e160] [cursor=pointer]:
                            - /url: /tournament/1972
                            - heading "Retire Test 1779561609992" [level=3] [ref=e161]
                            - generic [ref=e162]: completed
                        - link "Integration Test Tournament 1779561554518 completed" [ref=e163] [cursor=pointer]:
                            - /url: /tournament/1963
                            - heading "Integration Test Tournament 1779561554518" [level=3] [ref=e164]
                            - generic [ref=e165]: completed
            - group [ref=e167]:
                - generic "Imprint / Legal Notice" [ref=e168] [cursor=pointer]
        - contentinfo [ref=e169]:
            - link "☕ Buy Me A Coffee" [ref=e170] [cursor=pointer]:
                - /url: https://buymeacoffee.com/accomade
    - region "Cookie information" [ref=e171]:
        - generic [ref=e172]:
            - paragraph [ref=e173]:
                - text: This site uses essential cookies for authentication and security.
                - button "Learn more" [ref=e174] [cursor=pointer]
            - button "Dismiss cookie notice" [ref=e175] [cursor=pointer]: OK
```

# Test source

```ts
  797 | 			await page.waitForSelector('button:has-text("Finalize Tournament")');
  798 | 			await page.click('button:has-text("Finalize Tournament")');
  799 | 			await page.waitForTimeout(1000);
  800 |
  801 | 			// Verify tournament completed
  802 | 			await page.goto('/');
  803 | 			await page.waitForSelector(`text=${tournamentName}`);
  804 | 			const statusBadge = page
  805 | 				.locator(`.tournament-card:has-text("${tournamentName}") .status.completed`)
  806 | 				.first();
  807 | 			await expect(statusBadge).toBeVisible();
  808 | 		});
  809 |
  810 | 		test('report mid-round injury with Cancel & Average option', async ({ page }) => {
  811 | 			const tournamentName = `Injury Cancel Test ${Date.now()}`;
  812 | 			testTournamentNames.push(tournamentName);
  813 |
  814 | 			// Create 16-player tournament with 2 rounds
  815 | 			await page.click('text=+ New Tournament');
  816 | 			await page.fill('input[name="name"]', tournamentName);
  817 | 			await page.fill('input[name="numRounds"]', '2');
  818 | 			const players = Array.from({ length: 16 }, (_, i) => `Player${i + 1}`);
  819 | 			await page.fill('textarea[name="names"]', players.join('\n'));
  820 | 			await page.click('button[type="submit"]');
  821 |
  822 | 			await page.waitForURL(/\/tournament\/\d+/);
  823 | 			await page.waitForSelector('text=Round 1 of 2');
  824 |
  825 | 			// Enter some scores for Round 1 on Court 1 only
  826 | 			const courtLink = await page.locator('.qr-link a').first();
  827 | 			const courtUrl = await courtLink.getAttribute('href');
  828 | 			await page.goto(courtUrl || '');
  829 | 			await page.waitForSelector('[data-testid^="match-form-"]');
  830 | 			const forms = await page.locator('[data-testid^="match-form-"]').all();
  831 | 			expect(forms.length).toBe(3);
  832 |
  833 | 			// Score only first match
  834 | 			const testId = await forms[0].getAttribute('data-testid');
  835 | 			const matchId = testId?.replace('match-form-', '');
  836 | 			await page.fill(`[data-testid="team-a-score-${matchId}"]`, '21');
  837 | 			await page.fill(`[data-testid="team-b-score-${matchId}"]`, '19');
  838 | 			await page.click(`[data-testid="save-score-${matchId}"]`);
  839 | 			await page.waitForSelector('.saved');
  840 |
  841 | 			// Report injury for Player1 on this court
  842 | 			await page.goto('/');
  843 | 			await page.click(`text=${tournamentName}`);
  844 | 			await page.waitForURL(/\/tournament\/\d+/);
  845 |
  846 | 			await page.click('summary:has-text("Report Injury")');
  847 | 			await page.waitForSelector('.injury-form');
  848 | 			// Find Player1 option by text content and select by value
  849 | 			const options = await page.locator('#injuryPlayerId option').allTextContents();
  850 | 			const player1Option = options.find((opt) => opt.includes('Player1'));
  851 | 			if (!player1Option) {
  852 | 				throw new Error(`Player1 not found in injury options. Available: ${options.join(', ')}`);
  853 | 			}
  854 | 			await page.selectOption('#injuryPlayerId', { label: player1Option.trim() });
  855 | 			await page.click('input[value="cancel"]');
  856 | 			await page.click('.injury-form button[type="submit"]');
  857 |
  858 | 			// Verify Player1 shows as retired on the court
  859 | 			await page.waitForTimeout(1000);
  860 | 			const retiredPlayer = page.locator('.player.retired').first();
  861 | 			await expect(retiredPlayer).toBeVisible();
  862 |
  863 | 			// Complete remaining matches on all courts
  864 | 			const allCourtLinks = await page.locator('.qr-link a').all();
  865 | 			const courtUrls: string[] = [];
  866 | 			for (const cl of allCourtLinks) {
  867 | 				const url = await cl.getAttribute('href');
  868 | 				if (url) courtUrls.push(url);
  869 | 			}
  870 | 			for (const url of courtUrls) {
  871 | 				await page.goto(url);
  872 | 				await page.waitForSelector('[data-testid^="match-form-"]');
  873 | 				// Collect all match IDs first, then score them
  874 | 				const matchForms = await page.locator('[data-testid^="match-form-"]').all();
  875 | 				const matchIds: string[] = [];
  876 | 				for (const form of matchForms) {
  877 | 					const mTestId = await form.getAttribute('data-testid');
  878 | 					const mId = mTestId?.replace('match-form-', '');
  879 | 					if (mId) matchIds.push(mId);
  880 | 				}
  881 | 				for (const mId of matchIds) {
  882 | 					await page.fill(`[data-testid="team-a-score-${mId}"]`, '21');
  883 | 					await page.fill(`[data-testid="team-b-score-${mId}"]`, '19');
  884 | 					await page.click(`[data-testid="save-score-${mId}"]`);
  885 | 					await page.waitForSelector('.saved');
  886 | 				}
  887 | 			}
  888 |
  889 | 			// Close Round 1 — should work even with canceled matches
  890 | 			await page.goto('/');
  891 | 			await page.click(`text=${tournamentName}`);
  892 | 			await page.waitForURL(/\/tournament\/\d+/);
  893 | 			// Wait for tournament page to finish loading
  894 | 			await page.waitForSelector('button:has-text("Close Round & Advance"), button:has-text("Waiting for all scores...")', {
  895 | 				timeout: 15000
  896 | 			});
> 897 | 			await page.waitForSelector('button:has-text("Close Round & Advance"):not(:disabled)', {
      |               ^ TimeoutError: page.waitForSelector: Timeout 15000ms exceeded.
  898 | 				timeout: 15000
  899 | 			});
  900 | 			await page.click('button:has-text("Close Round & Advance")');
  901 | 			await page.waitForSelector('text=Round 2 of 2');
  902 | 		});
  903 | 	});
  904 | });
  905 |
```
