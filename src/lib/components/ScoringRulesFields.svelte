<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import {
		SCORING_COURT_SIZES,
		inferScoringMode,
		type CourtScoringRules,
		type ScoringCourtSize,
		type ScoringOverrides
	} from '$lib/tournament-logic';

	let {
		tab = $bindable(),
		draft,
		disabled = false,
		submitHidden = false,
		onPatch
	}: {
		tab: ScoringCourtSize;
		draft: Record<string, CourtScoringRules>;
		disabled?: boolean;
		submitHidden?: boolean;
		onPatch: (size: ScoringCourtSize, field: keyof CourtScoringRules, value: number) => void;
	} = $props();

	const current = $derived(draft[String(tab)] ?? null);
	const four = $derived(draft['4']);
	const overridesJson = $derived.by((): string => {
		const overrides: ScoringOverrides = {};
		for (const size of [3, 5, 6] as const) {
			const rules = draft[String(size)];
			if (rules) overrides[String(size)] = rules;
		}
		return JSON.stringify(overrides);
	});
</script>

{#if submitHidden && four}
	<input type="hidden" name="scoringMode" value={inferScoringMode(four)} />
	<input type="hidden" name="n:pointsToWin" value={four.pointsToWin} />
	<input type="hidden" name="n:winBy" value={four.winBy} />
	<input type="hidden" name="n:setsToWin" value={four.setsToWin} />
	<input type="hidden" name="n:decidingSetPoints" value={four.decidingSetPoints} />
	<input type="hidden" name="scoringOverridesJson" value={overridesJson} />
{/if}

<div
	class="scoring-size-tabs"
	role="tablist"
	aria-label={m.manage_scoring_heading()}
	data-testid="scoring-size-tabs"
>
	{#each SCORING_COURT_SIZES as size (size)}
		<button
			type="button"
			role="tab"
			class:active={tab === size}
			aria-selected={tab === size}
			data-testid="scoring-tab-{size}"
			{disabled}
			onclick={() => (tab = size)}
		>
			{m.manage_scoring_size_tab({ size })}
		</button>
	{/each}
</div>
{#if tab === 4}
	<p class="hint">{m.manage_scoring_4p_hint()}</p>
{/if}
{#if current}
	<div class="scoring-grid" data-testid="scoring-fields">
		<label>
			{m.manage_points_per_set()}
			<input
				data-testid="scoring-points"
				type="number"
				min="6"
				max="30"
				value={current.pointsToWin}
				{disabled}
				oninput={(e) =>
					onPatch(tab, 'pointsToWin', Number((e.currentTarget as HTMLInputElement).value))}
			/>
		</label>
		<fieldset class="radio-field">
			<legend>{m.manage_win_by()}</legend>
			<div class="radio-row">
				<label class="radio-option">
					<input
						data-testid="scoring-win-by-1"
						type="radio"
						name="scoring-win-by-{tab}"
						value="1"
						checked={current.winBy === 1}
						{disabled}
						onchange={() => onPatch(tab, 'winBy', 1)}
					/>
					{m.manage_win_by_1()}
				</label>
				<label class="radio-option">
					<input
						data-testid="scoring-win-by-2"
						type="radio"
						name="scoring-win-by-{tab}"
						value="2"
						checked={current.winBy !== 1}
						{disabled}
						onchange={() => onPatch(tab, 'winBy', 2)}
					/>
					{m.manage_win_by_2()}
				</label>
			</div>
		</fieldset>
		<fieldset class="radio-field">
			<legend>{m.manage_sets_to_win()}</legend>
			<div class="radio-row">
				<label class="radio-option">
					<input
						data-testid="scoring-sets-1"
						type="radio"
						name="scoring-sets-{tab}"
						value="1"
						checked={current.setsToWin <= 1}
						{disabled}
						onchange={() => onPatch(tab, 'setsToWin', 1)}
					/>
					{m.manage_sets_one()}
				</label>
				<label class="radio-option">
					<input
						data-testid="scoring-sets-2"
						type="radio"
						name="scoring-sets-{tab}"
						value="2"
						checked={current.setsToWin > 1}
						{disabled}
						onchange={() => onPatch(tab, 'setsToWin', 2)}
					/>
					{m.manage_sets_best_of_3()}
				</label>
			</div>
		</fieldset>
		{#if current.setsToWin > 1}
			<label>
				{m.manage_deciding_set_points()}
				<input
					data-testid="scoring-deciding"
					type="number"
					min="6"
					max="30"
					value={current.decidingSetPoints}
					{disabled}
					oninput={(e) =>
						onPatch(tab, 'decidingSetPoints', Number((e.currentTarget as HTMLInputElement).value))}
				/>
			</label>
		{/if}
	</div>
{/if}

<style>
	.scoring-size-tabs {
		display: flex;
		gap: var(--spacing-xs);
		flex-wrap: wrap;
	}

	.scoring-size-tabs button {
		min-height: 44px;
		min-width: 44px;
		padding: 0.25rem 0.7rem;
		font-size: var(--font-size-sm);
		font-weight: 700;
		background: var(--bg-secondary);
		color: var(--text-primary);
		border: 1px solid var(--border-default);
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.scoring-size-tabs button.active {
		border-color: var(--accent-primary);
		color: var(--accent-primary);
	}

	.scoring-size-tabs button:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.hint {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}

	.scoring-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--spacing-md);
		align-items: start;
	}

	@media (min-width: 700px) {
		.scoring-grid {
			grid-template-columns: 1fr 1fr;
		}
	}

	label {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: var(--spacing-xs);
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		font-weight: 600;
	}

	label :global(input[type='number']) {
		width: 100%;
		min-height: 44px;
		box-sizing: border-box;
	}

	.radio-field {
		border: none;
		margin: 0;
		padding: 0;
		min-width: 0;
	}

	.radio-field legend {
		font-size: var(--font-size-sm);
		font-weight: 700;
		padding: 0;
		margin-bottom: var(--spacing-xs);
		color: var(--text-secondary);
	}

	.radio-row {
		display: flex;
		gap: var(--spacing-md);
		flex-wrap: wrap;
	}

	.radio-row .radio-option {
		display: inline-flex;
		flex-direction: row;
		align-items: center;
		gap: var(--spacing-xs);
		min-height: 44px;
		cursor: pointer;
		color: var(--text-primary);
		font-weight: 600;
		font-size: var(--font-size-sm);
	}

	.radio-row input[type='radio'] {
		width: 1.25rem;
		height: 1.25rem;
		min-height: 0;
		flex-shrink: 0;
		accent-color: var(--accent-primary);
	}
</style>
