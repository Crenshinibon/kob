<script lang="ts">
	import { resolve } from '$app/paths';
	import { localizeHref } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages';
	import PlayerNameImport from '$lib/components/PlayerNameImport.svelte';
	import RangeSlider from '$lib/components/RangeSlider.svelte';
	import ScoringRulesFields from '$lib/components/ScoringRulesFields.svelte';
	import { parsePlayerLine } from '$lib/parse-players';
	import {
		calculateCourtSizes,
		calculateRoundCount,
		estimateTournamentDuration,
		estimateRoundDurationMinutes,
		inferScoringMode,
		scoringDraftFromConfig,
		type CourtScoringRules,
		type DurationConfig,
		type ScoringCourtSize
	} from '$lib/tournament-logic';
	import { createTournamentForm } from './create.remote';

	let createError = $state('');

	let tournamentName = $state('');
	let formatType = $state<'random-seed' | 'preseed'>('random-seed');
	let playerNames = $state('');
	let physicalCourts = $state(4);
	let scoringTab = $state<ScoringCourtSize>(4);
	let scoringDraft = $state<Record<string, CourtScoringRules>>(scoringDraftFromConfig(null, null));
	let numRounds = $state(3);
	let preseedRetirementPolicy = $state<'cascade' | 'shrink'>('cascade');
	const minPlayers = 4;
	const maxPlayers = 64;
	let roundsTouched = $state(false);

	const computedPlayerCount = $derived(playerNames.split('\n').filter((n) => n.trim()).length);
	const leftoverCount = $derived(computedPlayerCount % 4);

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
			const courtCount = calculateCourtSizes(computedPlayerCount).length;
			numRounds = calculateRoundCount(courtCount, 'preseed');
			return;
		}
		if (formatType === 'random-seed' && computedPlayerCount >= minPlayers) {
			const courtCount = calculateCourtSizes(computedPlayerCount).length;
			if (courtCount === 1) {
				numRounds = 1;
			} else if (!roundsTouched) {
				numRounds = calculateRoundCount(courtCount, 'random-seed');
			}
		}
	});

	const effectiveRounds = $derived(
		formatType === 'preseed' && computedPlayerCount >= minPlayers
			? calculateRoundCount(Math.ceil(computedPlayerCount / 4), 'preseed')
			: Math.max(1, numRounds)
	);

	const fourScoring = $derived(scoringDraft['4']);
	const basePtTarget = $derived(fourScoring?.pointsToWin ?? 21);
	const effectiveSetsToWin = $derived(fourScoring?.setsToWin ?? 1);
	const scoringMode = $derived(fourScoring ? inferScoringMode(fourScoring) : 'single-21');

	function patchScoring(
		size: ScoringCourtSize,
		field: keyof CourtScoringRules,
		value: number
	): void {
		const current = scoringDraft[String(size)];
		if (!current || !Number.isFinite(value)) return;
		scoringDraft = { ...scoringDraft, [String(size)]: { ...current, [field]: value } };
	}

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
			<span class="label">{m.manage_scoring_heading()}</span>
			<ScoringRulesFields
				bind:tab={scoringTab}
				draft={scoringDraft}
				submitHidden={true}
				onPatch={patchScoring}
			/>
		</div>

		<div class="field">
			<label for="names">{m.create_player_names()}</label>
			<PlayerNameImport
				bind:names={playerNames}
				{formatType}
				textareaName="names"
				textareaId="names"
				onHasWvvPoints={() => (formatType = 'preseed')}
			/>
			{#if computedPlayerCount === 0}
				<p class="info">{m.create_add_players_to_see_layout()}</p>
			{:else if computedPlayerCount > 0 && computedPlayerCount < minPlayers}
				<p class="info warn">{m.setup_start_needs_players({ count: minPlayers })}</p>
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
			<RangeSlider
				id="physicalCourts"
				name="n:physicalCourts"
				bind:value={physicalCourts}
				min={1}
				max={16}
				currentLabel={m.range_courts_value({ count: physicalCourts })}
				formatCurrent={(n) => m.range_courts_value({ count: n })}
			/>
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
			<label for="numRounds"
				>{m.manage_rounds_label()}: {m.range_rounds_value({ count: numRounds })}</label
			>
			{#if formatType === 'preseed'}
				<span class="info-text">{m.create_rounds_computed_at_start()}</span>
				<input type="hidden" name="n:numRounds" value={effectiveRounds} />
			{:else}
				<div class="rounds-config">
					{#if courtSizes.length === 1}
						<input type="hidden" name="n:numRounds" value="1" />
					{/if}
					<RangeSlider
						id="numRounds"
						name={courtSizes.length === 1 ? undefined : 'n:numRounds'}
						bind:value={numRounds}
						min={1}
						max={10}
						disabled={courtSizes.length === 1}
						testId="create-num-rounds"
						currentLabel={m.range_rounds_value({ count: numRounds })}
						formatCurrent={(n) => m.range_rounds_value({ count: n })}
						oninput={() => (roundsTouched = true)}
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
			disabled={!tournamentName.trim() ||
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

	.info {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
		font-style: italic;
		margin-top: var(--spacing-xs);
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
		flex-direction: column;
		align-items: stretch;
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
