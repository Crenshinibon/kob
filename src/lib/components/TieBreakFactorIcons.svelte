<script lang="ts">
	import { TIE_BREAK_OUTCOME_COLORS } from '$lib/court-colors';
	import type { TieBreakFactorId, TieBreakDecidingOutcome } from '$lib/tournament-logic';
	import { TIE_BREAK_FACTOR_GLYPHS } from '$lib/tournament-logic';

	let {
		tiedFactors,
		decidingFactor,
		decidingOutcome = null,
		getLabel
	}: {
		tiedFactors: readonly TieBreakFactorId[];
		decidingFactor: TieBreakFactorId | null;
		decidingOutcome?: TieBreakDecidingOutcome;
		getLabel: (id: TieBreakFactorId) => string;
	} = $props();

	const consideredFactors = $derived(
		decidingFactor ? [...tiedFactors, decidingFactor] : [...tiedFactors]
	);

	const decidingColor = $derived(
		decidingOutcome ? TIE_BREAK_OUTCOME_COLORS[decidingOutcome] : null
	);
</script>

{#if consideredFactors.length > 0}
	<span class="tie-break-icons" aria-label="Tie-break factors">
		{#each consideredFactors as factor (factor)}
			{@const isDeciding = decidingFactor === factor}
			<span
				class="factor-icon"
				class:tied={tiedFactors.includes(factor)}
				class:deciding={isDeciding}
				class:deciding-won={isDeciding && decidingOutcome === 'won'}
				class:deciding-middle={isDeciding && decidingOutcome === 'middle'}
				class:deciding-lost={isDeciding && decidingOutcome === 'lost'}
				style={isDeciding && decidingColor
					? `--deciding-color: ${decidingColor}`
					: undefined}
				title={isDeciding
					? getLabel(factor)
					: `${getLabel(factor)} (=)`}
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
		line-height: 1;
	}

	.factor-icon.tied {
		opacity: 0.65;
		border-style: dashed;
	}

	.factor-icon.deciding {
		opacity: 1;
		color: var(--accent-info);
		border-color: var(--accent-info);
		border-style: solid;
		background: color-mix(in srgb, var(--accent-info) 18%, var(--bg-secondary));
		box-shadow: 0 0 0 1px var(--accent-info);
	}

	.factor-icon.deciding-won,
	.factor-icon.deciding-middle,
	.factor-icon.deciding-lost {
		color: var(--deciding-color);
		border-color: var(--deciding-color);
		background: color-mix(in srgb, var(--deciding-color) 18%, var(--bg-secondary));
		box-shadow: 0 0 0 1px var(--deciding-color);
	}
</style>
