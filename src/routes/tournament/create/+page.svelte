<script lang="ts">
	import {
		calculateCourtSizes,
		calculateRoundCount,
		estimateTournamentDuration,
		estimateRoundDurationMinutes,
		type DurationConfig
	} from '$lib/tournament-logic';
	import * as m from '$lib/paraglide/messages';
	import { resolve } from '$app/paths';
	import { localizeHref } from '$lib/paraglide/runtime';
	import { parsePastedText, parseCsvText, parsePlayerLine } from '$lib/parse-players';
	import { createTournamentForm } from './create.remote';

	let createError = $state('');
	let csvUploadError = $state('');

	let tournamentName = $state('');
	let formatType = $state<'random-seed' | 'preseed'>('random-seed');
	let playerNames = $state('');
	let physicalCourts = $state(4);
	let scoringMode = $state<'single-21' | 'best-of-3' | 'custom'>('single-21');
	let setsToWin = $state('1');
	let pointsToWin = $state(21);
	let winBy = $state('2');
	let decidingSetPoints = $state(15);
	let numRounds = $state(3);
	let preseedRetirementPolicy = $state<'cascade' | 'shrink'>('cascade');
	let textareaEl: HTMLTextAreaElement | undefined = $state();

	const minPlayers = 8;
	const maxPlayers = 64;

	const computedPlayerCount = $derived(playerNames.split('\n').filter((n) => n.trim()).length);
	const leftoverCount = $derived(computedPlayerCount % 4);

	function handlePaste(e: ClipboardEvent) {
		const pastedText = e.clipboardData?.getData('text') || '';
		if (!textareaEl || !pastedText) return;

		const needsProcessing = /[,;\t]/.test(pastedText);
		if (!needsProcessing) return;

		e.preventDefault();

		const names = parsePastedText(pastedText);
		const formattedNames = names.join('\n');

		const start = textareaEl.selectionStart;
		const end = textareaEl.selectionEnd;
		const before = playerNames.substring(0, start);
		const after = playerNames.substring(end);

		playerNames = before + formattedNames + (after ? '\n' + after : '');

		setTimeout(() => {
			if (textareaEl)
				textareaEl.selectionStart = textareaEl.selectionEnd = start + formattedNames.length;
		}, 0);
	}

	function handleCsvUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		csvUploadError = '';
		const reader = new FileReader();
		reader.onload = () => {
			const text = reader.result as string;
			const result = parseCsvText(text);
			if (!result.ok) {
				csvUploadError = m.create_csv_no_spieler1();
				return;
			}
			if (result.lines.length === 0) {
				csvUploadError = m.create_csv_error();
				return;
			}
			const newNames = result.lines.join('\n');
			playerNames = playerNames.trim() ? playerNames.trim() + '\n' + newNames : newNames;
			if (result.hasWvvPoints) {
				formatType = 'preseed';
			}
		};
		reader.onerror = () => {
			csvUploadError = m.create_csv_error();
		};
		reader.readAsText(file);
		input.value = '';
	}

	function removeLastPlayers() {
		const lines = playerNames.split('\n');
		const n = leftoverCount;
		if (n === 0) return;
		playerNames = lines.slice(0, lines.length - n).join('\n');
	}

	function removeLowestPoints() {
		const lines = playerNames.split('\n');
		const n = leftoverCount;
		if (n === 0) return;
		const parsed = lines.map((line) => {
			const result = parsePlayerLine(line, 'preseed');
			if (result.seedPoints !== null)
				return { line: line.trim(), name: result.name, points: result.seedPoints };
			return { line: line.trim(), name: line.trim(), points: 0 };
		});
		parsed.sort((a, b) => a.points - b.points);
		const toRemove = new Set(parsed.slice(0, n).map((p) => p.line));
		playerNames = lines.filter((line) => !toRemove.has(line.trim())).join('\n');
	}

	const leftoverLabel = $derived(
		leftoverCount === 1
			? m.create_leftover_label()
			: leftoverCount === 2
				? m.create_leftover_label_2()
				: leftoverCount === 3
					? m.create_leftover_label_3()
					: ''
	);

	const leftoverDescription = $derived.by(() => {
		if (leftoverCount === 0) return null;
		if (leftoverCount === 1) {
			return {
				format: m.create_leftover_5p_format(),
				scoring: m.create_leftover_5p_scoring(),
				ranking: m.create_leftover_5p_ranking(),
				rules: m.create_leftover_5p_rules()
			};
		}
		if (leftoverCount === 2) {
			return {
				format: m.create_leftover_6p_format(),
				scoring: m.create_leftover_6p_scoring(),
				ranking: m.create_leftover_6p_ranking(),
				rules: m.create_leftover_6p_rules()
			};
		}
		if (leftoverCount === 3) {
			return {
				format: m.create_leftover_3p_format(),
				scoring: m.create_leftover_3p_scoring(),
				ranking: m.create_leftover_3p_ranking(),
				rules: m.create_leftover_3p_rules()
			};
		}
		return null;
	});

	$effect(() => {
		if (formatType === 'preseed' && computedPlayerCount >= minPlayers) {
			const courtCount = Math.ceil(computedPlayerCount / 4);
			numRounds = calculateRoundCount(courtCount, 'preseed');
		}
	});

	const effectiveRounds = $derived(
		formatType === 'preseed' && computedPlayerCount >= minPlayers
			? calculateRoundCount(Math.ceil(computedPlayerCount / 4), 'preseed')
			: Math.max(1, numRounds)
	);

	const basePtTarget = $derived(scoringMode === 'custom' ? pointsToWin : 21);
	const effectiveSetsToWin = $derived(
		scoringMode === 'custom' ? parseInt(setsToWin) : scoringMode !== 'single-21' ? 2 : 1
	);

	const defaultDurationConfig: DurationConfig = {
		setupTimeMinutes: 15,
		transitionTimeMinutes: 10,
		avgRallyDurationSeconds: 35,
		timeBetweenRalliesSeconds: 8,
		timeBetweenMatchesMinutes: 3
	};

	const courtSizes = $derived(
		computedPlayerCount >= minPlayers ? calculateCourtSizes(computedPlayerCount) : []
	);

	const durationEstimate = $derived.by(() => {
		if (computedPlayerCount < minPlayers) return null;

		const dur = estimateTournamentDuration(
			effectiveRounds,
			courtSizes,
			physicalCourts,
			basePtTarget,
			effectiveSetsToWin,
			defaultDurationConfig
		);

		const roundDur = estimateRoundDurationMinutes(
			courtSizes,
			basePtTarget,
			effectiveSetsToWin,
			defaultDurationConfig
		);

		const shiftsPerRound = Math.ceil(courtSizes.length / physicalCourts);

		return {
			total: dur.total,
			roundDur: roundDur * shiftsPerRound,
			maxCourtDur: roundDur,
			courts: courtSizes.length,
			shiftsPerRound
		};
	});
</script>

<main>
	<header>
		<a href={localizeHref(resolve('/'))}>{m.create_back()}</a>
		<h1>{m.create_submit()}</h1>
	</header>

	<form {...createTournamentForm}>
		{#if createError}
			<div class="error">{createError}</div>
		{/if}

		<div class="field">
			<label for="name">{m.create_tournament_name()}</label>
			<input
				type="text"
				id="name"
				name="name"
				bind:value={tournamentName}
				required
				placeholder="King Of the Beach 2026"
			/>
		</div>

		<div class="field">
			<span class="label">Format</span>
			<div class="radio-group">
				<label class="radio-label">
					<div class="radio-wrapper">
						<input type="radio" name="formatType" value="random-seed" bind:group={formatType} />
					</div>
					<span class="radio-content">
						<strong>{m.create_random_seed()}</strong>
						<small>{m.create_desc_random()}</small>
					</span>
				</label>
				<label class="radio-label">
					<div class="radio-wrapper">
						<input type="radio" name="formatType" value="preseed" bind:group={formatType} />
					</div>
					<span class="radio-content">
						<strong>{m.create_preseed()}</strong>
						<small>{m.create_desc_preseed()}</small>
					</span>
				</label>
			</div>
		</div>

		{#if formatType === 'preseed'}
			<div class="field">
				<span class="label">{m.preseed_retirement_policy_label()}</span>
				<div class="radio-group">
					<label class="radio-label">
						<div class="radio-wrapper">
							<input
								type="radio"
								name="preseedRetirementPolicy"
								value="cascade"
								bind:group={preseedRetirementPolicy}
							/>
						</div>
						<span class="radio-content">
							<strong>{m.preseed_retirement_cascade()}</strong>
						</span>
					</label>
					<label class="radio-label">
						<div class="radio-wrapper">
							<input
								type="radio"
								name="preseedRetirementPolicy"
								value="shrink"
								bind:group={preseedRetirementPolicy}
							/>
						</div>
						<span class="radio-content">
							<strong>{m.preseed_retirement_shrink()}</strong>
						</span>
					</label>
				</div>
				<p class="info-text">{m.preseed_retirement_policy_help()}</p>
			</div>
		{/if}

		<div class="field">
			<span class="label">{m.create_scoring_mode()}</span>
			<div class="radio-group">
				<label class="radio-label">
					<div class="radio-wrapper">
						<input type="radio" name="scoringMode" value="single-21" bind:group={scoringMode} />
					</div>
					<span class="radio-content">
						<strong>{m.scoring_single_set()}</strong>
						<small>{m.create_desc_single()}</small>
					</span>
				</label>
				<label class="radio-label">
					<div class="radio-wrapper">
						<input type="radio" name="scoringMode" value="best-of-3" bind:group={scoringMode} />
					</div>
					<span class="radio-content">
						<strong>{m.scoring_best_of_3()}</strong>
						<small>{m.create_desc_bestof3()}</small>
					</span>
				</label>
				<label class="radio-label">
					<div class="radio-wrapper">
						<input type="radio" name="scoringMode" value="custom" bind:group={scoringMode} />
					</div>
					<span class="radio-content">
						<strong>{m.create_custom()}</strong>
						<small>{m.create_desc_custom()}</small>
					</span>
				</label>
			</div>
		</div>

		<div class="advanced-section" class:hidden={scoringMode !== 'custom'}>
			<div class="field">
				<span class="label">{m.create_match_format_label()}</span>
				<div class="radio-group">
					<label class="radio-label">
						<input type="radio" name="n:setsToWin" value="1" bind:group={setsToWin} />
						<span class="radio-text">{m.create_single_set_label()}</span>
					</label>
					<label class="radio-label">
						<input type="radio" name="n:setsToWin" value="2" bind:group={setsToWin} />
						<span class="radio-text">{m.create_best_of_3_label()}</span>
					</label>
				</div>
			</div>
			<div class="field">
				<span class="label">Win By</span>
				<div class="radio-group">
					<label class="radio-label">
						<input type="radio" name="n:winBy" value="2" bind:group={winBy} />
						<span class="radio-text">2 points (deuce possible)</span>
					</label>
					<label class="radio-label">
						<input type="radio" name="n:winBy" value="1" bind:group={winBy} />
						<span class="radio-text">1 point (first to N wins)</span>
					</label>
				</div>
				<p class="field-hint">
					Points difference required to win a set (e.g., 21-19 with win-by-2)
				</p>
			</div>
			{#if setsToWin === '1'}
				<div class="field">
					<label for="pointsToWin">{m.create_points_to_win()}</label>
					<input
						type="number"
						id="pointsToWin"
						name="n:pointsToWin"
						min="9"
						max="21"
						bind:value={pointsToWin}
						disabled={scoringMode !== 'custom'}
					/>
				</div>
			{:else}
				<div class="field">
					<label for="pointsToWin">{m.create_regular_set_points()}</label>
					<input
						type="number"
						id="pointsToWin"
						name="n:pointsToWin"
						min="9"
						max="21"
						bind:value={pointsToWin}
						disabled={scoringMode !== 'custom'}
					/>
				</div>
				<div class="field">
					<label for="decidingSetPoints">{m.create_deciding_set_points()}</label>
					<input
						type="number"
						id="decidingSetPoints"
						name="n:decidingSetPoints"
						min="9"
						max="21"
						bind:value={decidingSetPoints}
						disabled={scoringMode !== 'custom'}
					/>
				</div>
			{/if}
		</div>

		<div class="field">
			<label for="names">{m.create_player_names()}</label>
			<textarea
				id="names"
				name="names"
				bind:value={playerNames}
				bind:this={textareaEl}
				onpaste={handlePaste}
				rows="10"
				placeholder={formatType === 'preseed'
					? m.create_names_placeholder_preseed()
					: m.create_names_placeholder_random()}
				required
			></textarea>
			<p class="hint">
				{#if formatType === 'preseed'}
					{m.create_names_placeholder_preseed()}<br />
					<code>{m.create_player_example()}</code>
				{:else}
					{m.create_names_placeholder_random()}
				{/if}
			</p>
			<details class="import-tip">
				<summary class="import-tip-summary">{m.create_wvv_summary()}</summary>
				<p class="import-tip-text">
					{m.create_wvv_tip()}
				</p>
				<div class="csv-upload">
					<label class="btn-small csv-upload-btn" for="csv-upload">
						{m.create_csv_upload()}
					</label>
					<input
						id="csv-upload"
						type="file"
						accept=".csv,.txt"
						onchange={handleCsvUpload}
						class="csv-file-input"
					/>
				</div>
				{#if csvUploadError}
					<p class="info warn">{csvUploadError}</p>
				{/if}
			</details>
			<p class="count">{m.create_names_entered({ count: computedPlayerCount })}</p>
			{#if computedPlayerCount > 0 && computedPlayerCount < minPlayers}
				<p class="info warn">{m.create_min_required({ count: minPlayers })}</p>
			{:else if computedPlayerCount > maxPlayers}
				<p class="info warn">
					{m.create_max_exceeded({ count: maxPlayers, excess: computedPlayerCount - maxPlayers })}
				</p>
			{:else if computedPlayerCount > 0}
				{#if leftoverCount > 0}
					<div class="leftover-info">
						<p class="leftover-label">{leftoverLabel}</p>
						{#if leftoverDescription}
							<div class="leftover-description">
								<p class="leftover-format">{leftoverDescription!.format}</p>
								<p class="leftover-scoring">{leftoverDescription!.scoring}</p>
								<p class="leftover-ranking">
									{m.create_leftover_ranking_label()}: {leftoverDescription!.ranking}
								</p>
								<p class="leftover-rules">{leftoverDescription!.rules}</p>
							</div>
							<div class="leftover-actions">
								<button type="button" class="btn-small" onclick={removeLastPlayers}>
									{m.create_kick_leftover()}
								</button>
								{#if formatType === 'preseed'}
									<button type="button" class="btn-small" onclick={removeLowestPoints}>
										{m.create_kick_lowest({ count: leftoverCount })}
									</button>
								{/if}
							</div>
						{/if}
					</div>
				{:else}
					<p class="info standard-court">{m.create_all_4p()}</p>
				{/if}
			{/if}
		</div>

		<div class="field">
			<label for="physicalCourts">{m.create_physical_courts()}: {physicalCourts}</label>
			<div class="range-container">
				<input
					type="range"
					id="physicalCourts"
					name="n:physicalCourts"
					bind:value={physicalCourts}
					min={1}
					max={16}
					step={1}
				/>
				<div class="range-labels">
					<span>1</span>
					<span class="range-current">{physicalCourts} courts</span>
					<span>16</span>
				</div>
			</div>
			{#if physicalCourts < Math.ceil(computedPlayerCount / 4)}
				<p class="info">
					{m.create_virtual_courts_desc({
						virtual: Math.ceil(computedPlayerCount / 4),
						physical: physicalCourts
					})}
				</p>
			{/if}
		</div>

		<div class="field">
			<span class="label">Number of Rounds</span>
			{#if formatType === 'preseed'}
				<span class="info-text">{m.create_auto_calculated({ count: effectiveRounds })}</span>
				<input type="hidden" name="n:numRounds" value={effectiveRounds} />
			{:else}
				<div class="rounds-config">
					<input
						type="number"
						id="numRounds"
						name="n:numRounds"
						bind:value={numRounds}
						min="1"
						max="10"
						class="rounds-input"
					/>
					<span class="rounds-hint">{m.create_rounds_flexible()}</span>
				</div>
			{/if}
		</div>

		{#if durationEstimate && computedPlayerCount >= minPlayers}
			<div class="field duration-estimate">
				<span class="label">Estimated Duration</span>
				<div class="duration-box">
					<p class="duration-total">
						{m.create_est_duration({
							hours: Math.floor(durationEstimate!.total / 60),
							minutes: durationEstimate!.total % 60
						})}
					</p>
					<div class="duration-breakdown">
						<span>{m.create_setup()}</span>
						<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
						{#each Array(effectiveRounds) as _, r (r)}
							<span
								>{m.create_round_duration({
									round: r + 1,
									minutes: durationEstimate!.roundDur
								})}</span
							>
						{/each}
						<span
							>Based on: {durationEstimate!.courts} courts, {computedPlayerCount} players, {scoringMode ===
							'single-21'
								? 'one set to 21'
								: scoringMode === 'best-of-3'
									? 'best of 3'
									: 'custom'}, {formatType === 'preseed' ? 'preseed' : 'random'} format</span
						>
					</div>
				</div>
			</div>
		{/if}

		<button
			type="submit"
			class="btn-primary"
			disabled={computedPlayerCount < minPlayers ||
				computedPlayerCount > maxPlayers ||
				!!createTournamentForm.pending}
		>
			{#if createTournamentForm.pending}
				<span class="spinner"></span> {m.loading()}
			{:else}
				{m.create_submit()}
			{/if}
		</button>
	</form>
</main>

<style>
	main {
		max-width: 600px;
		margin: 0 auto;
		padding: var(--spacing-xl) var(--spacing-md);
	}

	header {
		margin-bottom: var(--spacing-xl);
	}

	header a {
		color: var(--text-muted);
		text-decoration: none;
		font-size: var(--font-size-sm);
		transition: color var(--transition-fast);
	}

	header a:hover {
		color: var(--text-secondary);
	}

	h1 {
		margin: var(--spacing-sm) 0 0 0;
		font-size: var(--font-size-2xl);
		color: var(--text-primary);
	}

	form {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-lg);
		background-color: var(--bg-card);
		padding: var(--spacing-lg);
		border-radius: var(--radius-md);
		border: 2px solid var(--border-default);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.radio-group {
		display: flex;
		gap: var(--spacing-md);
	}

	.radio-label {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
		font-weight: 500;
		font-size: var(--font-size-base);
		color: var(--text-primary);
		text-transform: none;
		letter-spacing: normal;
		cursor: pointer;
		opacity: 0.85;
	}

	.radio-label:has(input:checked) {
		opacity: 1;
		font-weight: 600;
	}

	label,
	.label {
		font-weight: 600;
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	input[type='text'] {
		min-height: 48px;
		padding: var(--spacing-sm) var(--spacing-md);
		font-size: var(--font-size-base);
		background-color: var(--bg-input);
		color: var(--text-input);
		border: var(--border-thickness) solid var(--border-strong);
		border-radius: var(--radius-sm);
		font-weight: 500;
		transition:
			border-color var(--transition-fast),
			box-shadow var(--transition-fast);
	}

	input[type='text']:focus {
		outline: none;
		border-color: var(--border-focus);
		box-shadow: var(--shadow-focus);
		transform: scale(1.02);
	}

	.range-container {
		display: grid;
		grid-template-columns: 1fr;
	}

	.range-container input[type='range'] {
		width: 100%;
		accent-color: var(--accent-primary);
		margin: var(--spacing-sm) 0;
		grid-row: 1;
	}

	.range-labels {
		display: flex;
		justify-content: space-between;
		font-size: var(--font-size-sm);
		color: var(--text-muted);
		grid-row: 2;
	}

	.range-current {
		text-align: center;
		font-weight: 600;
		color: var(--text-secondary);
	}

	textarea {
		padding: var(--spacing-sm);
		font-size: var(--font-size-base);
		background-color: var(--bg-input);
		color: var(--text-input);
		border: var(--border-thickness) solid var(--border-strong);
		border-radius: var(--radius-sm);
		font-family: inherit;
		min-height: 150px;
		resize: vertical;
		font-weight: 500;
	}

	textarea:focus {
		outline: none;
		border-color: var(--border-focus);
		box-shadow: var(--shadow-focus);
		transform: scale(1.02);
	}

	.count {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--text-muted);
		font-weight: 600;
	}

	.info {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
		font-style: italic;
		margin-top: var(--spacing-xs);
	}

	.hint {
		margin: var(--spacing-xs) 0 0 0;
		font-size: var(--font-size-sm);
		color: var(--text-muted);
		line-height: 1.5;
	}

	.hint code {
		background-color: var(--bg-secondary);
		padding: 1px 6px;
		border-radius: var(--radius-sm);
		font-size: var(--font-size-sm);
	}

	.import-tip {
		margin-top: var(--spacing-xs);
	}

	.import-tip-summary {
		font-size: var(--font-size-sm);
		color: var(--accent-primary);
		cursor: pointer;
		font-weight: 500;
	}

	.import-tip-text {
		margin: var(--spacing-xs) 0 0 0;
		padding: var(--spacing-sm);
		background-color: var(--bg-secondary);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		line-height: 1.5;
	}

	.csv-upload {
		margin-top: var(--spacing-sm);
	}

	.csv-upload-btn {
		display: inline-block;
		cursor: pointer;
	}

	.csv-file-input {
		display: none;
	}

	.field-hint {
		margin: 0;
		font-size: var(--font-size-xs);
		color: var(--text-muted);
		font-style: italic;
	}

	.leftover-actions {
		display: flex;
		gap: var(--spacing-sm);
		margin-top: var(--spacing-sm);
		flex-wrap: wrap;
	}

	.btn-small {
		background-color: var(--bg-secondary);
		color: var(--text-secondary);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-sm);
		padding: var(--spacing-xs) var(--spacing-sm);
		font-size: var(--font-size-sm);
		font-weight: 600;
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.btn-small:hover {
		border-color: var(--border-focus);
		color: var(--text-primary);
	}

	.info-text {
		font-size: var(--font-size-base);
		color: var(--text-muted);
		font-weight: 500;
	}

	.radio-group {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.radio-label {
		display: flex;
		align-items: stretch;
		gap: var(--spacing-sm);
		padding: var(--spacing-sm) var(--spacing-md);
		background-color: var(--bg-input);
		border: var(--border-thickness) solid var(--border-strong);
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.radio-text {
		color: var(--text-input);
		font-weight: 500;
	}

	.radio-label:has(input:checked) .radio-text {
		color: #ffffff;
		font-weight: 600;
	}

	.radio-wrapper {
		display: flex;
		align-self: stretch;
		justify-content: center;
		align-items: center;
	}

	.radio-label:hover {
		border-color: var(--border-focus);
	}

	.radio-label input[type='radio'] {
		height: 18px;
		width: 18px;
		accent-color: var(--accent-primary);
	}

	.radio-label:has(input:checked) {
		border-color: var(--accent-primary);
		background-color: rgba(255, 187, 0, 0.1);
	}

	.radio-content {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.radio-content strong {
		font-weight: 600;
		color: var(--text-input);
	}

	.radio-label:has(input:checked) .radio-content strong {
		color: #ffffff;
	}

	.radio-content small {
		font-size: var(--font-size-sm);
		color: #555555;
	}

	.radio-label:has(input:checked) .radio-content small {
		color: var(--text-secondary);
	}

	.btn-primary {
		background-color: var(--accent-primary);
		color: var(--bg-primary);
		padding: var(--spacing-sm) var(--spacing-lg);
		border: 2px solid var(--accent-primary);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-base);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		cursor: pointer;
		transition: all var(--transition-base);
		text-decoration: none;
	}

	.btn-primary:hover:not(:disabled) {
		background-color: var(--accent-primary-hover);
		box-shadow: var(--glow-primary);
	}

	.btn-primary:disabled {
		background-color: var(--bg-secondary);
		color: var(--text-muted);
		border-color: var(--border-default);
		cursor: not-allowed;
	}

	.warn {
		color: var(--accent-error);
	}

	.leftover-info {
		background-color: rgba(255, 187, 0, 0.08);
		border: 2px solid var(--accent-primary);
		border-radius: var(--radius-md);
		padding: var(--spacing-md);
	}

	.leftover-label {
		font-weight: 600;
		color: var(--accent-primary);
		margin: 0 0 var(--spacing-xs) 0;
	}

	.leftover-description {
		margin-bottom: var(--spacing-sm);
	}

	.leftover-format,
	.leftover-scoring,
	.leftover-ranking,
	.leftover-rules {
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		margin: 2px 0;
	}

	.leftover-format {
		color: var(--text-primary);
		font-weight: 500;
	}

	.leftover-scoring {
		font-style: italic;
	}

	.leftover-ranking {
		color: var(--text-muted);
	}

	.leftover-rules {
		color: var(--text-muted);
		font-size: var(--font-size-xs);
	}

	.standard-court {
		padding: var(--spacing-sm);
		background-color: rgba(0, 255, 65, 0.05);
		border-radius: var(--radius-sm);
	}

	.error {
		background-color: rgba(255, 51, 51, 0.1);
		color: var(--accent-error);
		border: 2px solid var(--accent-error);
		padding: var(--spacing-sm);
		border-radius: var(--radius-sm);
		font-weight: 500;
	}

	.advanced-section {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
		padding: var(--spacing-md);
		border: 2px dashed var(--border-strong);
		border-radius: var(--radius-md);
		background-color: var(--bg-secondary);
		overflow: hidden;
	}

	.advanced-section.hidden {
		display: none;
	}

	.advanced-section .field {
		gap: var(--spacing-xs);
	}

	.advanced-section input[type='number'] {
		width: 80px;
		min-height: 40px;
		padding: var(--spacing-xs) var(--spacing-sm);
		font-size: var(--font-size-base);
		background-color: var(--bg-input);
		color: var(--text-input);
		border: var(--border-thickness) solid var(--border-strong);
		border-radius: var(--radius-sm);
		font-weight: 500;
		text-align: center;
	}

	.advanced-section input[type='number']:focus {
		outline: none;
		border-color: var(--border-focus);
		box-shadow: var(--shadow-focus);
	}

	.duration-estimate {
		margin-top: var(--spacing-sm);
	}

	.duration-box {
		padding: var(--spacing-md);
		background-color: rgba(255, 187, 0, 0.08);
		border: 2px solid var(--accent-primary);
		border-radius: var(--radius-md);
	}

	.duration-total {
		font-size: var(--font-size-xl);
		font-weight: 700;
		color: var(--accent-primary);
		margin: 0 0 var(--spacing-sm) 0;
	}

	.duration-breakdown {
		display: flex;
		flex-direction: column;
		gap: 2px;
		font-size: var(--font-size-xs);
		color: var(--text-muted);
	}

	.rounds-config {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
	}

	.rounds-input {
		width: 60px;
		min-height: 40px;
		padding: var(--spacing-xs) var(--spacing-sm);
		font-size: var(--font-size-base);
		background-color: var(--bg-input);
		color: var(--text-input);
		border: 2px solid var(--border-strong);
		border-radius: var(--radius-sm);
		font-weight: 600;
		text-align: center;
	}

	.rounds-input:focus {
		outline: none;
		border-color: var(--border-focus);
		box-shadow: var(--shadow-focus);
	}

	.rounds-hint {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}

	.spinner {
		display: inline-block;
		width: 14px;
		height: 14px;
		border: 2px solid var(--bg-primary);
		border-top-color: transparent;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
		vertical-align: middle;
		margin-right: var(--spacing-xs);
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
