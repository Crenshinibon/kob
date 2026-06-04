<script lang="ts">
	import { slide } from 'svelte/transition';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import { browser } from '$app/environment';
	import QRCode from 'qrcode';
	import * as msg from '$lib/paraglide/messages';

	import { saveScore, saveSetScore } from './scores.remote';
	import { createScoreSchema, createSetScoreSchema } from './scoreSchema';
	import { isDecidingSet, getEffectiveScoring } from '$lib/tournament-logic';

	interface MatchRow {
		id: number;
		courtRotationId: number;
		matchNumber: number;
		setNumber: number;
		teamAPlayer1Id: number;
		teamAPlayer2Id: number;
		teamBPlayer1Id: number;
		teamBPlayer2Id: number;
		teamAScore: number | null;
		teamBScore: number | null;
		isCanceled: boolean;
		injuredPlayerIds: number[] | null;
	}

	interface StandingRow {
		playerId: number;
		rank: number;
		points: number;
		diff: number;
		matchCount: number;
		id: number;
		name: string;
		avgPoints?: number;
		matchesPlayed: number;
	}

	interface CourtInfo {
		tournamentName: string;
		courtNumber: number;
		roundNumber: number;
		courtSize: number;
		playerNames: Record<number, string>;
		minPoints: number;
		scoringLabel: string;
		winBy: number;
		setsToWin: number;
		pointsToWin: number;
		decidingSetPoints: number;
		label: string | null;
		scoringOverrides: Record<
			string,
			{ pointsToWin?: number; winBy?: number; setsToWin?: number; decidingSetPoints?: number }
		> | null;
	}

	interface ScoreSubmitForm {
		submit(): Promise<boolean>;
		readonly element: HTMLFormElement;
		fields: {
			allIssues(): Array<{ message: string }> | undefined;
		};
	}

	let { data } = $props<{
		data: {
			court: CourtInfo;
			matches: MatchRow[];
			standings: StandingRow[];
			isActive: boolean;
			isAuthenticated: boolean;
		};
	}>();

	// Track which matches are being saved
	let savingMatches = $state<Set<number>>(new Set());
	let editingMatches = $state<Set<number>>(new Set());
	let savedSetScores = new SvelteMap<number, { teamAScore: number; teamBScore: number }>();
	let formErrors = new SvelteMap<number, string[]>();
	// Dynamic score schema based on court's minimum points
	const effectiveScoring = $derived(
		getEffectiveScoring(
			data.court.courtSize,
			{
				pointsToWin: data.court.pointsToWin ?? 21,
				winBy: data.court.winBy ?? 2,
				setsToWin: data.court.setsToWin ?? 1,
				decidingSetPoints: data.court.decidingSetPoints ?? 15
			},
			data.court.scoringOverrides
		)
	);
	const dynamicScoreSchema = $derived(
		createScoreSchema(data.court.minPoints ?? 21, effectiveScoring.winBy)
	);
	// Track completed matches locally for smooth transitions
	let completedMatches = $derived<Set<number>>(
		new Set(data.matches.filter((m: MatchRow) => m.teamAScore !== null).map((m: MatchRow) => m.id))
	);
	// Group matches by matchNumber for best-of-3 support
	const matchGroups = $derived.by(() => {
		const courtSize = data.court.courtSize;
		const setsToWin = effectiveScoring.setsToWin;

		if (setsToWin > 1) {
			const groups = new SvelteMap<number, MatchRow[]>();
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
					sets: [...sets].sort((a: MatchRow, b: MatchRow) => a.setNumber - b.setNumber)
				}));
		}

		// For 5p/6p courts, group by runs
		if (courtSize === 5 || courtSize === 6) {
			const groups: Array<{ type: 'runs'; label: string; matches: MatchRow[] }> = [];
			for (let i = 0; i < data.matches.length; i += 2) {
				const runNum = Math.floor(i / 2) + 1;
				groups.push({
					type: 'runs',
					label: msg.court_run({ num: runNum }),
					matches: data.matches.slice(i, i + 2)
				});
			}
			return groups;
		}
		return null;
	});

	// Format explanation for non-standard courts
	const formatExplanation = $derived.by(() => {
		const courtSize = data.court.courtSize;
		if (courtSize === 3) {
			return {
				title: msg.court_solo_rotation(),
				description: msg.court_3p_desc({ points: data.court.pointsToWin ?? 21 }),
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
	const teamLabels = $derived.by(() => {
		const byMatchNumber = new SvelteMap<number, { teamA: string; teamB: string }>();
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

	const injuredPlayerIds = $derived.by(() => {
		const ids = new SvelteSet<number>();
		for (const m of data.matches) {
			if (m.injuredPlayerIds) {
				for (const id of m.injuredPlayerIds) ids.add(id);
			}
		}
		return ids;
	});

	function getPlayerDisplayName(playerId: number): string {
		if (injuredPlayerIds.has(playerId)) return msg.court_subst_tag();
		return data.court.playerNames[playerId] || '—';
	}

	function getPlayerName(match: MatchRow, position: string): string {
		switch (position) {
			case 'a1':
				return getPlayerDisplayName(match.teamAPlayer1Id);
			case 'a2':
				return getPlayerDisplayName(match.teamAPlayer2Id);
			case 'b1':
				return getPlayerDisplayName(match.teamBPlayer1Id);
			case 'b2':
				return getPlayerDisplayName(match.teamBPlayer2Id);
			default:
				return '—';
		}
	}

	function getTeamDisplay(match: MatchRow, team: 'a' | 'b'): string {
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

	function shouldShowSet(setNum: number, sets: MatchRow[]): boolean {
		if (!isDecidingSet(setNum, effectiveScoring.setsToWin)) return true;

		const set1 = sets.find((s) => s.setNumber === 1);
		const set2 = sets.find((s) => s.setNumber === 2);
		if (!set1 || !set2) return false;

		const s1A = set1.teamAScore ?? savedSetScores.get(set1.id)?.teamAScore;
		const s1B = set1.teamBScore ?? savedSetScores.get(set1.id)?.teamBScore;
		const s2A = set2.teamAScore ?? savedSetScores.get(set2.id)?.teamAScore;
		const s2B = set2.teamBScore ?? savedSetScores.get(set2.id)?.teamBScore;

		if (s1A == null || s1B == null || s2A == null || s2B == null) return false;

		const teamAWins = (s1A > s1B ? 1 : 0) + (s2A > s2B ? 1 : 0);
		const teamBWins = (s1B > s1A ? 1 : 0) + (s2B > s2A ? 1 : 0);

		return teamAWins >= 1 && teamBWins >= 1;
	}

	function renderMatch(match: MatchRow, index: number) {
		const scoreForm = saveScore.for(match.id);
		const isSaving = savingMatches.has(match.id);
		const isEditing = editingMatches.has(match.id);
		const preflightIssues = scoreForm.fields.allIssues() ?? [];
		const currentErrors = [
			...(formErrors.get(match.id) ?? []),
			...preflightIssues.map((i: { message: string }) => i.message)
		];

		return { match, scoreForm, currentErrors, isSaving, isEditing, index };
	}

	function getSetScoreSchema(setNumber: number) {
		return createSetScoreSchema(
			effectiveScoring.pointsToWin,
			effectiveScoring.decidingSetPoints,
			setNumber,
			effectiveScoring.setsToWin,
			effectiveScoring.winBy
		);
	}

	async function handleScoreSubmit(
		formInstance: ScoreSubmitForm,
		matchId: number,
		isEditing: boolean,
		isSet?: boolean
	) {
		savingMatches = new Set([...savingMatches, matchId]);
		formErrors.delete(matchId);
		try {
			const result = await formInstance.submit();
			if (result) {
				if (isSet) {
					const formData = new FormData(formInstance.element);
					savedSetScores.set(matchId, {
						teamAScore: parseInt(formData.get('teamAScore') as string),
						teamBScore: parseInt(formData.get('teamBScore') as string)
					});
				}
				if (isEditing) {
					editingMatches = new Set([...editingMatches].filter((id) => id !== matchId));
				}
			} else {
				const serverIssues = formInstance.fields.allIssues() ?? [];
				if (serverIssues.length > 0) {
					formErrors.set(
						matchId,
						serverIssues.map((s) => s.message)
					);
				}
			}
		} catch {
			const serverIssues = formInstance.fields.allIssues() ?? [];
			if (serverIssues.length > 0) {
				formErrors.set(
					matchId,
					serverIssues.map((s) => s.message)
				);
			}
		} finally {
			savingMatches = new Set([...savingMatches].filter((id) => id !== matchId));
		}
	}
</script>

{#snippet scoreFormFields(
	formObj: {
		enhance(cb: (fi: ScoreSubmitForm) => void | Promise<void>): Record<string, unknown>;
		fields: ScoreSubmitForm['fields'] & {
			teamAScore: Record<string, unknown>;
			teamBScore: Record<string, unknown>;
		};
	},
	match: MatchRow,
	matchId: number,
	editing: boolean,
	setNum: number | undefined,
	formTestId: string
)}
	<form
		data-testid="{formTestId}-form-{matchId}"
		{...formObj.enhance(async (fi: ScoreSubmitForm) => {
			await handleScoreSubmit(fi, matchId, editing, setNum !== undefined);
		})}
	>
		<input type="hidden" name="matchId" value={matchId} />
		{#if setNum !== undefined}
			<input type="hidden" name="setNumber" value={setNum} />
		{/if}
		<div class="teams">
			<div class="team">
				<p>{getTeamDisplay(match, 'a')}</p>
				<input
					data-testid="team-a-score-{matchId}"
					type="number"
					name="teamAScore"
					min="0"
					required
					disabled={savingMatches.has(matchId)}
					{...formObj.fields.teamAScore}
				/>
			</div>
			<div class="vs">{msg.court_vs()}</div>
			<div class="team">
				<p>{getTeamDisplay(match, 'b')}</p>
				<input
					data-testid="team-b-score-{matchId}"
					type="number"
					name="teamBScore"
					min="0"
					required
					disabled={savingMatches.has(matchId)}
					{...formObj.fields.teamBScore}
				/>
			</div>
		</div>
		<div class="form-actions">
			{#if editing}
				<button
					type="button"
					class="btn-secondary"
					onclick={() =>
						(editingMatches = new Set([...editingMatches].filter((id) => id !== matchId)))}
					disabled={savingMatches.has(matchId)}
				>
					{msg.court_cancel_btn()}
				</button>
			{/if}
			<button
				data-testid="save-score-{matchId}"
				type="submit"
				class="btn-primary"
				disabled={savingMatches.has(matchId)}
			>
				{#if savingMatches.has(matchId)}
					<span class="spinner"></span>
					{editing ? msg.court_updating() : msg.court_saving()}
				{:else}
					{editing ? msg.court_update_score() : msg.court_save_score()}
				{/if}
			</button>
		</div>
	</form>
{/snippet}

<main>
	<header>
		<h1>{data.court.tournamentName}</h1>
		<p>
			{msg.court_title({ number: data.court.courtNumber })}, Round {data.court.roundNumber}
			{#if data.court.courtSize}
				<span class="court-size-tag" style="--court-color: var(--accent-info)">
					{data.court.courtSize}p
				</span>
			{/if}
			{#if data.court.label}
				<span class="court-physical-label">{data.court.label}</span>
			{/if}
		</p>
	</header>

	<section class="qr-section">
		<h2>{msg.court_share_access()}</h2>
		{#await generateQR()}
			<div class="qr-loading">{msg.loading_qr()}</div>
		{:then qrDataUrl}
			<div class="qr-code">
				<img src={qrDataUrl} alt={msg.court_alt_qr()} />
				<p class="qr-hint">{msg.court_share_hint()}</p>
			</div>
		{:catch}
			<div class="qr-error">{msg.failed_load_qr()}</div>
		{/await}
	</section>

	{#if !data.isActive}
		<div class="closed" transition:slide>
			<h2>{msg.court_closed_heading()}</h2>
			<p>{msg.court_closed_message()}</p>
		</div>
	{:else}
		<section class="players-section">
			<h3>{msg.court_players_heading({ size: data.court.courtSize })}</h3>
			{#if formatExplanation}
				<div class="format-explanation">
					<h4>{formatExplanation!.title}</h4>
					<p>{formatExplanation!.description}</p>
					<p class="format-detail">{msg.court_scoring_label({ name: formatExplanation!.scoring })}</p>
					{#if formatExplanation!.ranking}
						<p class="format-detail">{msg.court_ranking_label({ name: formatExplanation!.ranking })}</p>
					{/if}
					{#if formatExplanation!.runDetails}
						<div class="run-details">
							{#each formatExplanation!.runDetails as run (run.label)}
								<p class="run-detail">
									<strong>{run.label}:</strong>
									{run.description}
								</p>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
			{#if injuredPlayerIds.size > 0}
				<div class="injury-notice">
					<span class="injury-badge">🤕 Injury</span>
					{msg.court_substitute_notice()}
				</div>
			{/if}
			<div
				class="player-cards"
				class:three-player={data.court.courtSize === 3}
				class:five-player={data.court.courtSize === 5}
				class:six-player={data.court.courtSize === 6}
			>
				{#each Object.entries(data.court.playerNames) as [id, name], i (id)}
					{@const pid = Number(id)}
					<div class="player-card" class:injured={injuredPlayerIds.has(pid)}>
						<span class="player-letter">{String.fromCharCode(65 + i)}</span>
						<span class="player-name">{injuredPlayerIds.has(pid) ? msg.court_subst_tag() : name}</span>
						{#if injuredPlayerIds.has(pid)}
							<span class="injured-tag">{msg.court_sub_tag()}</span>
						{/if}
					</div>
				{/each}
			</div>
		</section>

		<section class="matches">
			{#if matchGroups}
				{#each matchGroups as group (group.type === 'sets' ? `sets-${group.matchNumber}` : group.label)}
					<div class="match-run">
						{#if group.type === 'sets'}
							<!-- Best-of-3: group by match number -->
							<h3 class="run-label">
								{msg.court_match_label({ num: group.matchNumber })}
								{#if teamLabels.get(group.matchNumber)}
									<span class="team-label">
										{teamLabels.get(group.matchNumber)!.teamA} {msg.court_vs()}
										{teamLabels.get(group.matchNumber)!.teamB}
									</span>
								{/if}
							</h3>
							<div class="sets-container">
								{#each group.sets as setMatch (setMatch.id)}
									{@const setNum = setMatch.setNumber}
									{#if shouldShowSet(setNum, group.sets)}
										{@const scoreForm = saveSetScore
											.for(setMatch.id)
											.preflight(getSetScoreSchema(setNum))}
										{@const isSaving = savingMatches.has(setMatch.id)}
										{@const isEditing = editingMatches.has(setMatch.id)}
										{@const preflightIssues = scoreForm.fields.allIssues() ?? []}
										{@const currentErrors = [
											...(formErrors.get(setMatch.id) ?? []),
											...preflightIssues.map((i: { message: string }) => i.message)
										]}
										<div class="set-card" transition:slide>
											<h4>
												{msg.court_set_label({ number: setNum })}{#if isDecidingSet(setNum, effectiveScoring.setsToWin)}
													<span class="deciding-hint"
														>{msg.court_deciding_hint({ points: effectiveScoring.decidingSetPoints })}</span
													>{/if}
											</h4>
											{#if setMatch.isCanceled}
												<div class="canceled-notice">{msg.court_canceled()}</div>
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
													<span class="saved" data-testid="saved-{setMatch.id}">{msg.court_saved()}</span>
													{#if data.isAuthenticated}
														<button
															class="btn-edit"
															onclick={() =>
																(editingMatches = new Set([...editingMatches, setMatch.id]))}
														>
															{msg.edit_btn()}
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
												{@render scoreFormFields(
													scoreForm,
													setMatch,
													setMatch.id,
													isEditing,
													setNum,
													'set'
												)}
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
											{msg.court_match_label({ num: render.index + 1 })}
											{#if teamLabels.get(match.matchNumber)}
												<span class="team-label">
													{teamLabels.get(match.matchNumber)!.teamA} {msg.court_vs()}
													{teamLabels.get(match.matchNumber)!.teamB}
												</span>
											{/if}
										</h3>

										{#if match.isCanceled}
											<div class="canceled-notice">{msg.court_canceled()}</div>
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
												<span class="saved" data-testid="saved-{match.id}">{msg.court_saved()}</span>
												{#if data.isAuthenticated}
													<button
														class="btn-edit"
														onclick={() =>
															(editingMatches = new Set([...editingMatches, match.id]))}
													>
														{msg.edit_btn()}
													</button>
												{/if}
											</div>
										{:else}
											{@render scoreFormFields(
												render.scoreForm.preflight(dynamicScoreSchema),
												match,
												match.id,
												render.isEditing,
												undefined,
												'match'
											)}
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
							{msg.court_match_label({ num: render.index + 1 })}
							{#if teamLabels.get(match.matchNumber)}
								<span class="team-label">
									{teamLabels.get(match.matchNumber)!.teamA} {msg.court_vs()}
									{teamLabels.get(match.matchNumber)!.teamB}
								</span>
							{/if}
						</h3>

						{#if match.isCanceled}
							<div class="canceled-notice">{msg.court_canceled()}</div>
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
									<span class="saved" data-testid="saved-{match.id}">{msg.court_saved()}</span>
									{#if data.isAuthenticated}
									<button
										class="btn-edit"
										onclick={() => (editingMatches = new Set([...editingMatches, match.id]))}
									>
										{msg.edit_btn()}
									</button>
									{/if}
								</div>
							{:else}
								{@render scoreFormFields(
									render.scoreForm.preflight(dynamicScoreSchema),
									match,
									match.id,
									render.isEditing,
									undefined,
									'match'
								)}
							{/if}
						{/if}
					</div>
				{/each}
			{/if}
		</section>
	{/if}

	{#if data.standings.length > 0}
		<section class="standings" transition:slide>
			<h2>{msg.court_standings()}</h2>
			{#if data.court.courtSize === 3}
				<p class="standings-note">
					{msg.court_3p_desc({ points: data.court.pointsToWin ?? 21 })}
				</p>
			{/if}
			<table>
				<thead>
					<tr>
						<th>{msg.court_3p_table_header()}</th>
						<th>{msg.court_3p_table_player()}</th>
						{#if data.court.courtSize === 5 || data.court.courtSize === 6}
							<th>{msg.court_3p_table_avg()}</th>
						{/if}
						<th>{msg.court_3p_table_points()}</th>
						<th>{msg.court_3p_table_diff()}</th>
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

	.court-physical-label {
		font-size: var(--font-size-xs);
		color: var(--accent-info);
		margin-left: var(--spacing-xs);
		font-weight: 600;
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

	.player-card.injured {
		border-color: var(--accent-warning);
		background-color: var(--bg-secondary);
		opacity: 0.7;
	}

	.injured-tag {
		font-size: var(--font-size-xs);
		color: var(--accent-warning);
		font-weight: 700;
		text-transform: uppercase;
		margin-top: 2px;
	}

	.injury-notice {
		background-color: var(--bg-card);
		border: 1px solid var(--accent-warning);
		border-radius: var(--radius-sm);
		padding: var(--spacing-sm) var(--spacing-md);
		margin-bottom: var(--spacing-sm);
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
	}

	.injury-badge {
		background-color: var(--accent-warning);
		color: var(--bg-primary);
		padding: 2px var(--spacing-xs);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-xs);
		font-weight: 700;
		white-space: nowrap;
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
