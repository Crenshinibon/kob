<script lang="ts">
	import type { TieBreakFactorId } from '$lib/tournament-logic';
	import { TIE_BREAK_FACTOR_GLYPHS } from '$lib/tournament-logic';

	let {
		enabledFactors,
		winningFactors,
		decidingFactor,
		getLabel
	}: {
		enabledFactors: readonly TieBreakFactorId[];
		winningFactors: readonly TieBreakFactorId[];
		decidingFactor: TieBreakFactorId | null;
		getLabel: (id: TieBreakFactorId) => string;
	} = $props();
</script>

{#if enabledFactors.length > 0}
	<span class="tie-break-icons" aria-label="Tie-break factors">
		{#each enabledFactors as factor (factor)}
			<span
				class="factor-icon"
				class:active={winningFactors.includes(factor)}
				class:deciding={decidingFactor === factor}
				title={getLabel(factor)}
				aria-label={getLabel(factor)}
			>{TIE_BREAK_FACTOR_GLYPHS[factor]}</span>
		{/each}
	</span>
{/if}

<style>
	.tie-break-icons {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		margin-left: var(--spacing-xs);
		vertical-align: middle;
	}

	.factor-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.1rem;
		height: 1.1rem;
		font-size: 0.65rem;
		font-weight: 700;
		border-radius: 3px;
		border: 1px solid var(--border-color);
		color: var(--text-muted);
		background: var(--bg-secondary);
		opacity: 0.45;
		line-height: 1;
	}

	.factor-icon.active {
		opacity: 1;
		color: var(--accent-success);
		border-color: var(--accent-success);
	}

	.factor-icon.deciding {
		opacity: 1;
		color: var(--accent-info);
		border-color: var(--accent-info);
		background: color-mix(in srgb, var(--accent-info) 18%, var(--bg-secondary));
		box-shadow: 0 0 0 1px var(--accent-info);
	}
</style>
