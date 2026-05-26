<script lang="ts">
	import { slide } from 'svelte/transition';
	import { SvelteMap } from 'svelte/reactivity';
	import { browser } from '$app/environment';
	import QRCode from 'qrcode';

	import { saveScore, saveSetScore } from './scores.remote';
	import { createScoreSchema, createSetScoreSchema } from './scoreSchema';
	import { isDecidingSet, getEffectiveScoring } from '$lib/tournament-logic';

	let { data } = $props<{
		data: {
			court: any;
			matches: any[];
			standings: any[];
			isActive: boolean;
			isAuthenticated: boolean;
		};
	}>();

	// Track which matches are being saved
	let savingMatches = $state<Set<number>>(new Set());
	let editingMatches = $state<Set<number>>(new Set());
	let savedSetScores = $state<SvelteMap<number, { teamAScore: number; teamBScore: number }>>(
		new SvelteMap()
	);
	let formErrors = $state<SvelteMap<number, string[]>>(new SvelteMap());
	// Dynamic score schema based on court's minimum points
	const effectiveScoring = $derived(
		getEffectiveScoring(
			data.court.courtSize,
			{
				pointsToWin: data.court.pointsToWin ?? 21,
				setsToWin: data.court.setsToWin ?? 1,
				decidingSetPoints: data.court.decidingSetPoints ?? 15
			},
			data.court.scoringOverrides
		)
	);
	const dynamicScoreSchema = $derived(createScoreSchema(data.court.minPoints ?? 21));
	// Track completed matches locally for smooth transitions
	let completedMatches = $derived<Set<number>>(
		new Set(data.matches.filter((m: any) => m.teamAScore !== null).map((m: any) => m.id))
	);
	// Group matches by matchNumber for best-of-3 support
	const matchGroups = $derived(() => {
		const courtSize = data.court.courtSize;
		const setsToWin = effectiveScoring.setsToWin;

		if (setsToWin > 1) {
			// Group matches by matchNumber
			const groups = new Map<number, any[]>();
			for (const m of data.matches) {
				if (!groups.has(m.matchNumber)) {
					groups.set(m.matchNumber, []);
				}
				groups.get(m.matchNumber)!.push(m);
			}
			return Array.from(groups.entries())
				.sort(([a], [b]) => a - b)
				.map(([matchNumber, sets]) => ({
					type: 'sets' as const,
					matchNumber,
					sets: [...sets].sort((a: any, b: any) => a.setNumber - b.setNumber)
				}));
		}

		// For 5p/6p courts, group by runs
		if (courtSize === 5 || courtSize === 6) {
			const groups: Array<{ type: 'runs'; label: string; matches: any[] }> = [];
			for (let i = 0; i < data.matches.length; i += 2) {
				const runNum = Math.floor(i / 2) + 1;
				groups.push({
					type: 'runs',
					label: `Run ${runNum}`,
					matches: data.matches.slice(i, i + 2)
				});
			}
			return groups;
		}
		return null;
	});

	// Format explanation for non-standard courts
	const formatExplanation = $derived(() => {
		const courtSize = data.court.courtSize;
		if (courtSize === 3) {
			return {
				title: '3-Player Solo Rotation',
				description:
					'Each player takes a turn solo against the other two. 3 matches total, all played sequentially.',
				scoring: data.court.scoringLabel ?? 'to 21 points'
			};
		}
		if (courtSize === 5) {
			return {
				title: '5-Player Court (Parallel Games)',
				description:
					'4 games in 2 runs. Each run has 2 games played in parallel with a fixed team on one side. Players rotate between games.',
				scoring: data.court.scoringLabel ?? 'to 15 points',
				ranking: 'Average points per game (normalized for fairness)',
				runDetails: [
					{
						label: 'Run 1',
						description: 'Fixed team on side X, one fixed player on side Y, two players rotate'
					},
					{
						label: 'Run 2',
						description:
							'Different fixed team on side X, different fixed player on side Y, different players rotate'
					}
				]
			};
		}
		if (courtSize === 6) {
			return {
				title: '6-Player Court (Parallel Games)',
				description:
					'4 games in 2 runs. Each run has 2 games played in parallel with a fixed team on one side. No partnership repeats across runs — players mix up as much as possible.',
				scoring: data.court.scoringLabel ?? 'to 15 points',
				ranking: 'Average points per game (normalized for fairness)',
				runDetails: [
					{ label: 'Run 1', description: 'Fixed team on side X, two rotating pairs on side Y' },
					{
						label: 'Run 2',
						description: 'New fixed team on side X, different rotating pairs on side Y'
					}
				]
			};
		}
		return null;
	});

	// Generate labels for player slots based on court size
	// 3p: A vs B, A vs B, B vs A (solo rotation)
	// 4p: AB vs CD, AC vs BD, AD vs BC
	// 5p/6p: parallel style
	const teamLabels = $derived(() => {
		const byMatchNumber = new Map<number, { teamA: string; teamB: string }>();
		for (const m of data.matches) {
			if (byMatchNumber.has(m.matchNumber)) continue;
			const nameA1 = getPlayerName(m, 'a1');
			const nameA2 = getPlayerName(m, 'a2');
			const nameB1 = getPlayerName(m, 'b1');
			const nameB2 = getPlayerName(m, 'b2');
			const teamA = m.teamAPlayer1Id === m.teamAPlayer2Id ? nameA1 : `${nameA1} & ${nameA2}`;
			const teamB = m.teamBPlayer1Id === m.teamBPlayer2Id ? nameB1 : `${nameB1} & ${nameB2}`;
			byMatchNumber.set(m.matchNumber, { teamA, teamB });
		}
		return byMatchNumber;
	});

	function getPlayerName(match: any, position: string) {
		const names = data.court.playerNames;
		switch (position) {
			case 'a1':
				return names[match.teamAPlayer1Id] || '—';
			case 'a2':
				return names[match.teamAPlayer2Id] || '—';
			case 'b1':
				return names[match.teamBPlayer1Id] || '—';
			case 'b2':
				return names[match.teamBPlayer2Id] || '—';
		}
	}

	function getTeamDisplay(match: any, team: 'a' | 'b'): string {
		const name1 = getPlayerName(match, team === 'a' ? 'a1' : 'b1');
		const name2 = getPlayerName(match, team === 'a' ? 'a2' : 'b2');
		const id1 = team === 'a' ? match.teamAPlayer1Id : match.teamBPlayer1Id;
		const id2 = team === 'a' ? match.teamAPlayer2Id : match.teamBPlayer2Id;
		// For 3p courts, solo player appears twice in data but should show once
		return id1 === id2 ? name1 : `${name1} & ${name2}`;
	}

	async function generateQR(): Promise<string> {
		if (!browser) return '';
		const url = window.location.href;
		return QRCode.toDataURL(url, { width: 200, margin: 2 });
	}

	function shouldShowSet(setNum: number, sets: any[]): boolean {
		if (!isDecidingSet(setNum, effectiveScoring.setsToWin)) return true;

		const set1 = sets.find((s) => s.setNumber === 1);
		const set2 = sets.find((s) => s.setNumber === 2);
		if (!set1 || !set2) return false;

		const s1A = set1.teamAScore ?? savedSetScores.get(set1.id)?.teamAScore;
		const s1B = set1.teamBScore ?? savedSetScores.get(set1.id)?.teamBScore;
		const s2A = set2.teamAScore ?? savedSetScores.get(set2.id)?.teamAScore;
		const s2B = set2.teamBScore ?? savedSetScores.get(set2.id)?.teamBScore;

		if (s1A === null || s1B === null || s2A === null || s2B === null) return false;

		const teamAWins = (s1A > s1B ? 1 : 0) + (s2A > s2B ? 1 : 0);
		const teamBWins = (s1B > s1A ? 1 : 0) + (s2B > s2A ? 1 : 0);

		return teamAWins >= 1 && teamBWins >= 1;
	}

	function renderMatch(match: any, index: number) {
		const scoreForm = saveScore.for(match.id);
		const isSaving = savingMatches.has(match.id);
		const isEditing = editingMatches.has(match.id);
		const preflightIssues = scoreForm.fields.allIssues() ?? [];
		const currentErrors = [
			...(formErrors.get(match.id) ?? []),
			...preflightIssues.map((i: any) => i.message)
		];

		return { match, scoreForm, currentErrors, isSaving, isEditing, index };
	}
</script>

<main>
	<header>
		<h1>{data.court.tournamentName}</h1>
		<p>
			Court {data.court.courtNumber}, Round {data.court.roundNumber}
			{#if data.court.courtSize}
				<span class="court-size-tag" style="--court-color: var(--accent-info)">
					{data.court.courtSize}p
				</span>
			{/if}
		</p>
	</header>

	<section class="qr-section">
		<h2>Share Court Access</h2>
		{#await generateQR()}
			<div class="qr-loading">Loading QR...</div>
		{:then qrDataUrl}
			<div class="qr-code">
				<img src={qrDataUrl} alt="QR code for this court" />
				<p class="qr-hint">Share this QR code with your court partners</p>
			</div>
		{:catch}
			<div class="qr-error">Failed to load QR</div>
		{/await}
	</section>

	{#if !data.isActive}
		<div class="closed" transition:slide>
			<h2>This court is closed</h2>
			<p>Scores have been finalized. Stand by for next round assignments.</p>
		</div>
	{:else}
		<section class="players-section">
			<h3>Players on This Court ({data.court.courtSize}p)</h3>
			{#if formatExplanation()}
				<div class="format-explanation">
					<h4>{formatExplanation()!.title}</h4>
					<p>{formatExplanation()!.description}</p>
					<p class="format-detail">Scoring: {formatExplanation()!.scoring}</p>
					{#if formatExplanation()!.ranking}
						<p class="format-detail">Ranking: {formatExplanation()!.ranking}</p>
					{/if}
					{#if formatExplanation()!.runDetails}
						<div class="run-details">
							{#each formatExplanation()!.runDetails as run}
								<p class="run-detail">
									<strong>{run.label}:</strong>
									{run.description}
								</p>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
			<div
				class="player-cards"
				class:three-player={data.court.courtSize === 3}
				class:five-player={data.court.courtSize === 5}
				class:six-player={data.court.courtSize === 6}
			>
				{#each Object.entries(data.court.playerNames) as [id, name], i}
					<div class="player-card">
						<span class="player-letter">{String.fromCharCode(65 + i)}</span>
						<span class="player-name">{name}</span>
					</div>
				{/each}
			</div>
		</section>

		<section class="matches">
			{#if matchGroups()}
				{#each matchGroups() as group (group.type === 'sets' ? `sets-${group.matchNumber}` : group.label)}
					<div class="match-run">
						{#if group.type === 'sets'}
							<!-- Best-of-3: group by match number -->
							<h3 class="run-label">
								Match {group.matchNumber}
								{#if teamLabels().get(group.matchNumber)}
									<span class="team-label">
										{@html `${teamLabels().get(group.matchNumber)!.teamA}`} vs
										{@html `${teamLabels().get(group.matchNumber)!.teamB}`}
									</span>
								{/if}
							</h3>
							<div class="sets-container">
								{#each group.sets as setMatch (setMatch.id)}
									{@const setNum = setMatch.setNumber}
									{#if shouldShowSet(setNum, group.sets)}
										{@const scoreForm = saveSetScore.for(setMatch.id)}
										{@const isSaving = savingMatches.has(setMatch.id)}
										{@const isEditing = editingMatches.has(setMatch.id)}
										{@const preflightIssues = scoreForm.fields.allIssues() ?? []}
										{@const currentErrors = [
											...(formErrors.get(setMatch.id) ?? []),
											...preflightIssues.map((i: any) => i.message)
										]}
										{@const setScoreSchema = createSetScoreSchema(
											effectiveScoring.pointsToWin,
											effectiveScoring.decidingSetPoints,
											setNum,
											effectiveScoring.setsToWin
										)}
										<div class="set-card" transition:slide>
											<h4>
												Set {setNum}{#if isDecidingSet(setNum, effectiveScoring.setsToWin)}
													<span class="deciding-hint"
														>(to {effectiveScoring.decidingSetPoints})</span
													>{/if}
											</h4>
											{#if setMatch.isCanceled}
												<div class="canceled-notice">Canceled — scores will be averaged</div>
											{:else if completedMatches.has(setMatch.id) && !editingMatches.has(setMatch.id)}
												<div class="completed">
													<p>
														{getTeamDisplay(setMatch, 'a')}:
														<strong>{setMatch.teamAScore}</strong>
													</p>
													<p>
														{getTeamDisplay(setMatch, 'b')}:
														<strong>{setMatch.teamBScore}</strong>
													</p>
													<span class="saved" data-testid="saved-{setMatch.id}">✓ Saved</span>
													{#if data.isAuthenticated}
														<button
															class="btn-edit"
															onclick={() =>
																(editingMatches = new Set([...editingMatches, setMatch.id]))}
														>
															Edit
														</button>
													{/if}
												</div>
											{:else}
												{#if currentErrors.length > 0 && !isSaving}
													<div class="error">
														{#each currentErrors as msg, ei (ei)}
															<p>{msg}</p>
														{/each}
													</div>
												{/if}
												<form
													data-testid="set-form-{setMatch.id}"
													{...scoreForm
														.preflight(setScoreSchema)
														.enhance(async ({ submit, form }) => {
															savingMatches = new Set([...savingMatches, setMatch.id]);
															formErrors.delete(setMatch.id);
															const formData = new FormData(form);
															const teamA = parseInt(formData.get('teamAScore') as string);
															const teamB = parseInt(formData.get('teamBScore') as string);
															const minPts = isDecidingSet(setNum, effectiveScoring.setsToWin)
																? effectiveScoring.decidingSetPoints
																: effectiveScoring.pointsToWin;
															try {
																const result = await submit();
																if (result) {
																	savedSetScores.set(setMatch.id, {
																		teamAScore: teamA,
																		teamBScore: teamB
																	});
																	if (isEditing) {
																		editingMatches = new Set(
																			[...editingMatches].filter((id) => id !== setMatch.id)
																		);
																	}
																} else {
																	const serverIssues = scoreForm.fields.allIssues() ?? [];
																	const messages =
																		serverIssues.length > 0
																			? serverIssues.map((i: any) => i.message)
																			: [`Winner must have at least ${minPts} points`];
																	formErrors.set(setMatch.id, messages);
																}
															} catch {
																const serverIssues = scoreForm.fields.allIssues() ?? [];
																const messages =
																	serverIssues.length > 0
																		? serverIssues.map((i: any) => i.message)
																		: [`Winner must have at least ${minPts} points`];
																formErrors.set(setMatch.id, messages);
															} finally {
																savingMatches = new Set(
																	[...savingMatches].filter((id) => id !== setMatch.id)
																);
															}
														})}
												>
													<input type="hidden" name="matchId" value={setMatch.id} />
													<input type="hidden" name="setNumber" value={setNum} />
													<div class="teams">
														<div class="team">
															<p>{getTeamDisplay(setMatch, 'a')}</p>
															<input
																data-testid="team-a-score-{setMatch.id}"
																type="number"
																name="teamAScore"
																min="0"
																max="50"
																required
																disabled={savingMatches.has(setMatch.id)}
																{...scoreForm.fields.teamAScore}
															/>
														</div>
														<div class="vs">vs</div>
														<div class="team">
															<p>{getTeamDisplay(setMatch, 'b')}</p>
															<input
																data-testid="team-b-score-{setMatch.id}"
																type="number"
																name="teamBScore"
																min="0"
																max="50"
																required
																disabled={savingMatches.has(setMatch.id)}
																{...scoreForm.fields.teamBScore}
															/>
														</div>
													</div>
													<div class="form-actions">
														{#if isEditing}
															<button
																type="button"
																class="btn-secondary"
																onclick={() =>
																	(editingMatches = new Set(
																		[...editingMatches].filter((id) => id !== setMatch.id)
																	))}
																disabled={savingMatches.has(setMatch.id)}
															>
																Cancel
															</button>
														{/if}
														<button
															data-testid="save-score-{setMatch.id}"
															type="submit"
															class="btn-primary"
															disabled={savingMatches.has(setMatch.id)}
														>
															{#if savingMatches.has(setMatch.id)}
																<span class="spinner"></span>
																{isEditing ? 'Updating...' : 'Saving...'}
															{:else}
																{isEditing ? 'Update Score' : 'Save Score'}
															{/if}
														</button>
													</div>
												</form>
											{/if}
										</div>
									{/if}
								{/each}
							</div>
						{:else if group.type === 'runs'}
							<!-- 5p/6p: group by run -->
							<h3 class="run-label">{group.label}</h3>
							<div class="parallel-matches">
								{#each group.matches as match (match.id)}
									{@const render = renderMatch(match, data.matches.indexOf(match))}
									<div class="match" transition:slide>
										{#if render.currentErrors.length > 0 && !render.isSaving}
											<div class="error" transition:slide>
												{#each render.currentErrors as msg, ei (ei)}
													<p>{msg}</p>
												{/each}
											</div>
										{/if}

										<h3>
											Match {render.index + 1}
											{#if teamLabels().get(match.matchNumber)}
												<span class="team-label">
													{@html `${teamLabels().get(match.matchNumber)!.teamA}`} vs
													{@html `${teamLabels().get(match.matchNumber)!.teamB}`}
												</span>
											{/if}
										</h3>

										{#if match.isCanceled}
											<div class="canceled-notice">Canceled — scores will be averaged</div>
										{:else if completedMatches.has(match.id) && !editingMatches.has(match.id)}
											<div class="completed" transition:slide>
												<p>
													{getTeamDisplay(match, 'a')}:
													<strong>{match.teamAScore}</strong>
												</p>
												<p>
													{getTeamDisplay(match, 'b')}:
													<strong>{match.teamBScore}</strong>
												</p>
												<span class="saved" data-testid="saved-{match.id}">✓ Saved</span>
												{#if data.isAuthenticated}
													<button
														class="btn-edit"
														onclick={() =>
															(editingMatches = new Set([...editingMatches, match.id]))}
													>
														Edit
													</button>
												{/if}
											</div>
										{:else}
											<form
												data-testid="match-form-{match.id}"
												{...render.scoreForm
													.preflight(dynamicScoreSchema)
													.enhance(async ({ submit }) => {
														savingMatches = new Set([...savingMatches, match.id]);
														formErrors.delete(match.id);
														try {
															const result = await submit();
															if (result) {
																if (render.isEditing) {
																	editingMatches = new Set(
																		[...editingMatches].filter((id) => id !== match.id)
																	);
																}
															} else {
																const serverIssues = render.scoreForm.fields.allIssues() ?? [];
																const messages =
																	serverIssues.length > 0
																		? serverIssues.map((i: any) => i.message)
																		: [
																				`Winner must have at least ${data.court.minPoints ?? 21} points`
																			];
																formErrors.set(match.id, messages);
															}
														} catch {
															const serverIssues = render.scoreForm.fields.allIssues() ?? [];
															const messages =
																serverIssues.length > 0
																	? serverIssues.map((i: any) => i.message)
																	: [
																			`Winner must have at least ${data.court.minPoints ?? 21} points`
																		];
															formErrors.set(match.id, messages);
														} finally {
															savingMatches = new Set(
																[...savingMatches].filter((id) => id !== match.id)
															);
														}
													})}
											>
												<input type="hidden" name="matchId" value={match.id} />

												<div class="teams">
													<div class="team">
														<p>{getTeamDisplay(match, 'a')}</p>
														<input
															data-testid="team-a-score-{match.id}"
															type="number"
															name="teamAScore"
															min="0"
															max="50"
															required
															disabled={savingMatches.has(match.id)}
															{...render.scoreForm.fields.teamAScore}
														/>
													</div>

													<div class="vs">vs</div>

													<div class="team">
														<p>{getTeamDisplay(match, 'b')}</p>
														<input
															data-testid="team-b-score-{match.id}"
															type="number"
															name="teamBScore"
															min="0"
															max="50"
															required
															disabled={savingMatches.has(match.id)}
															{...render.scoreForm.fields.teamBScore}
														/>
													</div>
												</div>

												<div class="form-actions">
													{#if render.isEditing}
														<button
															type="button"
															class="btn-secondary"
															onclick={() =>
																(editingMatches = new Set(
																	[...editingMatches].filter((id) => id !== match.id)
																))}
															disabled={savingMatches.has(match.id)}
														>
															Cancel
														</button>
													{/if}
													<button
														data-testid="save-score-{match.id}"
														type="submit"
														class="btn-primary"
														disabled={savingMatches.has(match.id)}
													>
														{#if savingMatches.has(match.id)}
															<span class="spinner"></span>
															{render.isEditing ? 'Updating...' : 'Saving...'}
														{:else}
															{render.isEditing ? 'Update Score' : 'Save Score'}
														{/if}
													</button>
												</div>
											</form>
										{/if}
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			{:else}
				<!-- Single-set matches (4p courts, standard scoring) -->
				{#each data.matches as match, index (match.id)}
					{@const render = renderMatch(match, index)}
					<div class="match" transition:slide>
						<h3>
							Match {render.index + 1}
							{#if teamLabels().get(match.matchNumber)}
								<span class="team-label">
									{@html `${teamLabels().get(match.matchNumber)!.teamA}`} vs
									{@html `${teamLabels().get(match.matchNumber)!.teamB}`}
								</span>
							{/if}
						</h3>

						{#if match.isCanceled}
							<div class="canceled-notice">Canceled — scores will be averaged</div>
						{:else}
							{#if render.currentErrors.length > 0 && !render.isSaving}
								<div class="error" transition:slide>
									{#each render.currentErrors as msg, ei (ei)}
										<p>{msg}</p>
									{/each}
								</div>
							{/if}

							{#if completedMatches.has(match.id) && !editingMatches.has(match.id)}
							<div class="completed" transition:slide>
								<p>
									{getTeamDisplay(match, 'a')}:
									<strong>{match.teamAScore}</strong>
								</p>
								<p>
									{getTeamDisplay(match, 'b')}:
									<strong>{match.teamBScore}</strong>
								</p>
								<span class="saved" data-testid="saved-{match.id}">✓ Saved</span>
								{#if data.isAuthenticated}
									<button
										class="btn-edit"
										onclick={() => (editingMatches = new Set([...editingMatches, match.id]))}
									>
										Edit
									</button>
								{/if}
							</div>
						{:else}
							<form
								data-testid="match-form-{match.id}"
								{...render.scoreForm.preflight(dynamicScoreSchema).enhance(async ({ submit }) => {
									savingMatches = new Set([...savingMatches, match.id]);
									formErrors.delete(match.id);
									try {
										const result = await submit();
										if (result) {
											if (render.isEditing) {
												editingMatches = new Set(
													[...editingMatches].filter((id) => id !== match.id)
												);
											}
										} else {
											const serverIssues = render.scoreForm.fields.allIssues() ?? [];
											const messages =
												serverIssues.length > 0
													? serverIssues.map((i: any) => i.message)
													: [`Winner must have at least ${data.court.minPoints ?? 21} points`];
											formErrors.set(match.id, messages);
										}
									} catch {
										const serverIssues = render.scoreForm.fields.allIssues() ?? [];
										const messages =
											serverIssues.length > 0
												? serverIssues.map((i: any) => i.message)
												: [`Winner must have at least ${data.court.minPoints ?? 21} points`];
										formErrors.set(match.id, messages);
									} finally {
										savingMatches = new Set([...savingMatches].filter((id) => id !== match.id));
									}
								})}
							>
								<input type="hidden" name="matchId" value={match.id} />

								<div class="teams">
									<div class="team">
										<p>{getTeamDisplay(match, 'a')}</p>
										<input
											data-testid="team-a-score-{match.id}"
											type="number"
											name="teamAScore"
											min="0"
											max="50"
											required
											disabled={savingMatches.has(match.id)}
											{...render.scoreForm.fields.teamAScore}
										/>
									</div>

									<div class="vs">vs</div>

									<div class="team">
										<p>{getTeamDisplay(match, 'b')}</p>
										<input
											data-testid="team-b-score-{match.id}"
											type="number"
											name="teamBScore"
											min="0"
											max="50"
											required
											disabled={savingMatches.has(match.id)}
											{...render.scoreForm.fields.teamBScore}
										/>
									</div>
								</div>

								<div class="form-actions">
									{#if render.isEditing}
										<button
											type="button"
											class="btn-secondary"
											onclick={() =>
												(editingMatches = new Set(
													[...editingMatches].filter((id) => id !== match.id)
												))}
											disabled={savingMatches.has(match.id)}
										>
											Cancel
										</button>
									{/if}
									<button
										data-testid="save-score-{match.id}"
										type="submit"
										class="btn-primary"
										disabled={savingMatches.has(match.id)}
									>
										{#if savingMatches.has(match.id)}
											<span class="spinner"></span>
											{render.isEditing ? 'Updating...' : 'Saving...'}
										{:else}
											{render.isEditing ? 'Update Score' : 'Save Score'}
										{/if}
									</button>
								</div>
							</form>
						{/if}
						{/if}
					</div>
				{/each}
			{/if}
		</section>
	{/if}

	{#if data.standings.length > 0}
		<section class="standings" transition:slide>
			<h2>Current Standings</h2>
			{#if data.court.courtSize === 3}
				<p class="standings-note">
					3-player court: solo rotation format — each player takes a turn solo
				</p>
			{/if}
			<table>
				<thead>
					<tr>
						<th>#</th>
						<th>Player</th>
						{#if data.court.courtSize === 5 || data.court.courtSize === 6}
							<th>Avg</th>
						{/if}
						<th>Points</th>
						<th>Diff</th>
					</tr>
				</thead>
				<tbody>
					{#each data.standings as s (s.id)}
						<tr transition:slide>
							<td>{s.rank}</td>
							<td>{s.name}</td>
							{#if data.court.courtSize === 5 || data.court.courtSize === 6}
								<td>{s.avgPoints?.toFixed(1) ?? '—'}</td>
							{/if}
							<td>{s.points}</td>
							<td>{s.diff > 0 ? '+' : ''}{s.diff}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</section>
	{/if}
</main>

<style>
	main {
		max-width: 600px;
		margin: 0 auto;
		padding: var(--spacing-md);
		background-color: var(--bg-primary);
	}

	header {
		margin-bottom: var(--spacing-lg);
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
	}

	header h1 {
		margin: 0;
		font-size: var(--font-size-xl);
		color: var(--text-primary);
	}

	header p {
		margin: 0;
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
	}

	.court-size-tag {
		font-size: var(--font-size-xs);
		font-weight: 700;
		padding: 2px 6px;
		border: 2px solid var(--court-color);
		border-radius: var(--radius-sm);
		color: var(--court-color);
		margin-left: var(--spacing-xs);
	}

	.qr-section {
		background-color: var(--bg-card);
		border: 2px solid var(--border-default);
		border-radius: var(--radius-md);
		padding: var(--spacing-lg);
		margin-bottom: var(--spacing-xl);
		text-align: center;
	}

	.qr-section h2 {
		margin: 0 0 var(--spacing-md) 0;
		font-size: var(--font-size-lg);
		color: var(--text-primary);
	}

	.qr-code {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.qr-code img {
		max-width: 200px;
		height: auto;
		border-radius: var(--radius-md);
	}

	.qr-hint {
		margin: var(--spacing-sm) 0 0 0;
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}

	.qr-loading,
	.qr-error {
		padding: var(--spacing-xl);
		font-size: var(--font-size-sm);
		color: var(--text-muted);
		background-color: var(--bg-secondary);
		border-radius: var(--radius-md);
		border: 1px solid var(--border-default);
	}

	.qr-error {
		color: var(--accent-error);
		background-color: rgba(255, 51, 51, 0.1);
		border-color: var(--accent-error);
	}

	.closed {
		background-color: rgba(255, 204, 0, 0.1);
		border: 2px solid var(--accent-warning);
		padding: var(--spacing-lg);
		border-radius: var(--radius-md);
		text-align: center;
		margin-bottom: var(--spacing-xl);
	}

	.closed h2 {
		margin: 0 0 var(--spacing-sm) 0;
		color: var(--accent-warning);
	}

	.closed p {
		margin: 0;
		color: var(--text-secondary);
	}

	.players-section {
		margin-bottom: var(--spacing-lg);
	}

	.players-section h3 {
		margin: 0 0 var(--spacing-sm) 0;
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.format-explanation {
		background-color: rgba(255, 187, 0, 0.08);
		border: 2px solid var(--accent-primary);
		border-radius: var(--radius-md);
		padding: var(--spacing-md);
		margin-bottom: var(--spacing-md);
	}

	.format-explanation h4 {
		margin: 0 0 var(--spacing-xs) 0;
		color: var(--accent-primary);
		font-size: var(--font-size-base);
	}

	.format-explanation p {
		margin: 0 0 var(--spacing-xs) 0;
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
	}

	.format-detail {
		font-size: var(--font-size-xs);
		color: var(--text-muted);
		margin: 2px 0;
	}

	.run-details {
		margin-top: var(--spacing-xs);
		padding-top: var(--spacing-xs);
		border-top: 1px solid var(--border-default);
	}

	.run-detail {
		font-size: var(--font-size-xs);
		color: var(--text-secondary);
		margin: 2px 0;
	}

	.run-detail strong {
		color: var(--accent-primary);
	}

	.courtsize-note {
		font-size: var(--font-size-xs);
		color: var(--text-muted);
		font-style: italic;
		margin-bottom: var(--spacing-sm);
	}

	.player-cards {
		display: flex;
		gap: var(--spacing-sm);
		flex-wrap: wrap;
		margin-bottom: var(--spacing-lg);
		justify-content: center;
	}

	.player-cards.three-player .player-card {
		flex: 0 0 auto;
		min-width: 100px;
	}

	.player-cards.five-player .player-card {
		flex: 0 0 auto;
		min-width: 90px;
	}

	.player-cards.six-player .player-card {
		flex: 0 0 auto;
		min-width: 80px;
	}

	.team-row {
		display: flex;
		gap: var(--spacing-sm);
		align-items: center;
		margin-bottom: var(--spacing-xs);
		justify-content: center;
	}

	.team-row.team-a {
		border-bottom: 2px solid var(--accent-primary);
		padding-bottom: var(--spacing-xs);
	}

	.team-row.team-b {
		padding-top: var(--spacing-xs);
	}

	.team-label-inline {
		font-weight: 700;
		font-size: var(--font-size-xs);
		color: var(--accent-primary);
		margin-right: var(--spacing-sm);
	}

	.player-card {
		background-color: var(--bg-card);
		border: 1px solid var(--border-default);
		border-radius: var(--radius-sm);
		padding: var(--spacing-sm);
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 60px;
	}

	.player-letter {
		font-size: var(--font-size-xs);
		font-weight: 700;
		color: var(--text-muted);
		margin-bottom: 2px;
	}

	.player-name {
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--text-primary);
		text-align: center;
	}

	.standings-note {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
		margin-bottom: var(--spacing-sm);
		font-style: italic;
	}

	.error {
		background-color: rgba(255, 51, 51, 0.1);
		color: var(--accent-error);
		border: 2px solid var(--accent-error);
		padding: var(--spacing-sm);
		border-radius: var(--radius-sm);
		margin-bottom: var(--spacing-md);
	}

	.error p {
		margin: var(--spacing-xs) 0;
		font-weight: 500;
	}

	.canceled-notice {
		background-color: rgba(255, 187, 0, 0.1);
		color: var(--accent-warning);
		border: 2px solid var(--accent-warning);
		padding: var(--spacing-sm);
		border-radius: var(--radius-sm);
		margin-bottom: var(--spacing-md);
		font-weight: 500;
		text-align: center;
	}

	.matches {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-lg);
		margin-bottom: var(--spacing-xl);
	}

	.match-run {
		background-color: var(--bg-secondary);
		border: 2px solid var(--border-default);
		border-radius: var(--radius-md);
		padding: var(--spacing-md);
	}

	.run-label {
		margin: 0 0 var(--spacing-sm) 0;
		font-size: var(--font-size-sm);
		color: var(--accent-primary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.parallel-matches {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--spacing-md);
	}

	.sets-container {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.set-card {
		border: 2px solid var(--border-default);
		border-radius: var(--radius-md);
		padding: var(--spacing-sm);
		background-color: var(--bg-card);
	}

	.set-card h4 {
		margin: 0 0 var(--spacing-xs) 0;
		font-size: var(--font-size-sm);
	}

	.deciding-hint {
		font-weight: 400;
		font-size: var(--font-size-xs);
		color: var(--text-muted);
	}

	@media (max-width: 768px) {
		.parallel-matches {
			grid-template-columns: 1fr;
		}
	}

	.match {
		border: 2px solid var(--border-default);
		border-radius: var(--radius-md);
		padding: var(--spacing-md);
		background-color: var(--bg-card);
	}

	.match h3 {
		margin: 0 0 var(--spacing-sm) 0;
		font-size: var(--font-size-base);
		color: var(--text-primary);
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.team-label {
		font-size: var(--font-size-xs);
		color: var(--text-muted);
	}

	.completed {
		background-color: rgba(0, 255, 65, 0.1);
		padding: var(--spacing-sm);
		border-radius: var(--radius-sm);
		border-left: 4px solid var(--accent-success);
	}

	.completed p {
		margin: var(--spacing-xs) 0;
		color: var(--text-secondary);
	}

	.saved {
		display: inline-block;
		margin-top: var(--spacing-sm);
		color: var(--accent-success);
		font-size: var(--font-size-sm);
		font-weight: 700;
	}

	.btn-edit {
		background-color: var(--accent-warning);
		color: var(--bg-primary);
		padding: var(--spacing-xs) var(--spacing-sm);
		border: none;
		border-radius: var(--radius-sm);
		font-size: var(--font-size-xs);
		font-weight: 600;
		cursor: pointer;
		margin-left: var(--spacing-sm);
		transition: background-color var(--transition-fast);
	}

	.btn-edit:hover {
		background-color: #e6b800;
	}

	.btn-secondary {
		background-color: var(--text-muted);
		color: var(--bg-primary);
		padding: var(--spacing-sm) var(--spacing-md);
		border: none;
		border-radius: var(--radius-sm);
		font-size: var(--font-size-sm);
		font-weight: 600;
		cursor: pointer;
		transition: background-color var(--transition-fast);
	}

	.btn-secondary:hover:not(:disabled) {
		background-color: var(--text-secondary);
	}

	.btn-secondary:disabled {
		background-color: var(--border-default);
		cursor: not-allowed;
	}

	.form-actions {
		display: flex;
		gap: var(--spacing-sm);
		justify-content: center;
		margin-top: var(--spacing-sm);
	}

	form {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.teams {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
		justify-content: center;
	}

	.team {
		text-align: center;
		flex: 1;
	}

	.team p {
		margin: 0 0 var(--spacing-xs) 0;
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		font-weight: 600;
	}

	.team input {
		width: 80px;
		padding: var(--spacing-sm);
		font-size: var(--font-size-xl);
		font-weight: 700;
		text-align: center;
		background-color: var(--bg-input);
		color: var(--text-input);
		border: var(--border-thickness) solid var(--border-strong);
		border-radius: var(--radius-sm);
		min-height: 60px;
		transition:
			border-color var(--transition-fast),
			box-shadow var(--transition-fast),
			transform var(--transition-fast);
	}

	.team input:focus {
		outline: none;
		border-color: var(--border-focus);
		box-shadow: var(--shadow-focus);
		transform: scale(1.05);
	}

	.team input:disabled {
		background-color: var(--bg-secondary);
		color: var(--text-muted);
		cursor: not-allowed;
	}

	.vs {
		font-weight: 700;
		color: var(--text-muted);
		font-size: var(--font-size-sm);
		text-transform: uppercase;
	}

	.btn-primary {
		background-color: var(--accent-primary);
		color: var(--bg-primary);
		padding: var(--spacing-sm) var(--spacing-md);
		border: 2px solid var(--accent-primary);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-sm);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		cursor: pointer;
		align-self: center;
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		transition: all var(--transition-base);
	}

	.btn-primary:hover:not(:disabled) {
		background-color: var(--accent-primary-hover);
		box-shadow: var(--glow-primary);
	}

	.btn-primary:active:not(:disabled) {
		transform: scale(0.95);
	}

	.btn-primary:disabled {
		background-color: var(--bg-secondary);
		border-color: var(--border-default);
		color: var(--text-muted);
		cursor: not-allowed;
	}

	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid var(--bg-primary);
		border-top-color: transparent;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.standings {
		margin-bottom: var(--spacing-xl);
	}

	.standings h2 {
		font-size: var(--font-size-lg);
		margin-bottom: var(--spacing-sm);
		color: var(--text-primary);
	}

	table {
		width: 100%;
		border-collapse: collapse;
		background-color: var(--bg-card);
		border-radius: var(--radius-md);
		overflow: hidden;
		border: 2px solid var(--border-default);
	}

	th,
	td {
		padding: var(--spacing-sm);
		text-align: left;
		border-bottom: 1px solid var(--border-default);
	}

	th {
		font-weight: 700;
		font-size: var(--font-size-sm);
		background-color: var(--bg-secondary);
		color: var(--text-primary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	td {
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
	}

	tr:last-child td {
		border-bottom: none;
	}
</style>
