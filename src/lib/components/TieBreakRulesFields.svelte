<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { TIE_BREAK_FINAL_FACTOR_IDS, type TieBreakFactorId } from '$lib/tournament-logic';

	let {
		statFactors = $bindable(),
		selectedFinalFactor = $bindable(),
		disabled = false,
		onChange = undefined
	}: {
		statFactors: { id: TieBreakFactorId; enabled: boolean }[];
		selectedFinalFactor: TieBreakFactorId;
		disabled?: boolean;
		onChange?: () => void;
	} = $props();

	function factorLabel(id: TieBreakFactorId): string {
		const labels: Record<TieBreakFactorId, () => string> = {
			round_points: m.tie_break_factor_round_points,
			round_diff: m.tie_break_factor_round_diff,
			total_points: m.tie_break_factor_total_points,
			total_diff: m.tie_break_factor_total_diff,
			initial_order: m.tie_break_factor_initial_order,
			dice: m.tie_break_factor_dice,
			manual: m.tie_break_factor_manual
		};
		return labels[id]();
	}

	function bump(index: number, direction: -1 | 1): void {
		const next = index + direction;
		if (next < 0 || next >= statFactors.length) return;
		const copy = [...statFactors];
		[copy[index], copy[next]] = [copy[next], copy[index]];
		statFactors = copy;
		onChange?.();
	}

	function setEnabled(index: number, enabled: boolean): void {
		statFactors = statFactors.map((f, i) => (i === index ? { ...f, enabled } : f));
		onChange?.();
	}

	function setFinal(id: TieBreakFactorId): void {
		selectedFinalFactor = id;
		onChange?.();
	}
</script>

<div class="tie-break-editor" data-testid="tie-break-editor">
	<p class="hint">{m.tie_break_hint()}</p>
	<ul class="tie-break-list">
		{#each statFactors as factor, fi (factor.id)}
			<li class="tie-break-item">
				<label>
					<input
						type="checkbox"
						checked={factor.enabled}
						{disabled}
						onchange={(e) => setEnabled(fi, e.currentTarget.checked)}
					/>
					{factorLabel(factor.id)}
				</label>
				<div class="tie-break-actions">
					<button
						type="button"
						class="btn-small"
						disabled={disabled || fi === 0}
						onclick={() => bump(fi, -1)}>{m.tie_break_move_up()}</button
					>
					<button
						type="button"
						class="btn-small"
						disabled={disabled || fi === statFactors.length - 1}
						onclick={() => bump(fi, 1)}>{m.tie_break_move_down()}</button
					>
				</div>
			</li>
		{/each}
	</ul>
	<fieldset class="tie-break-finals">
		<legend>{m.tie_break_final_heading()}</legend>
		<p class="hint">{m.tie_break_final_hint()}</p>
		{#each TIE_BREAK_FINAL_FACTOR_IDS as finalId (finalId)}
			<label class="tie-break-final-option">
				<input
					type="radio"
					name="tie-break-final"
					value={finalId}
					checked={selectedFinalFactor === finalId}
					{disabled}
					onchange={() => setFinal(finalId)}
				/>
				{factorLabel(finalId)}
			</label>
		{/each}
	</fieldset>
</div>

<style>
	.hint {
		margin: 0 0 var(--spacing-sm);
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}

	.tie-break-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.tie-break-item {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--spacing-sm);
		padding: var(--spacing-xs) 0;
	}

	.tie-break-item label {
		display: inline-flex;
		flex-direction: row;
		align-items: center;
		gap: var(--spacing-xs);
		font-weight: 600;
	}

	.tie-break-actions {
		display: flex;
		gap: var(--spacing-xs);
	}

	.tie-break-finals {
		border: none;
		margin: var(--spacing-md) 0 0;
		padding: 0;
	}

	.tie-break-finals legend {
		font-weight: 700;
		padding: 0;
		margin-bottom: var(--spacing-xs);
	}

	.tie-break-final-option {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: var(--spacing-xs);
		min-height: 44px;
		font-weight: 600;
	}
</style>
