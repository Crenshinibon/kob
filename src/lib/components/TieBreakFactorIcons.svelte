<script lang="ts">
	import type { TieBreakFactorId } from '$lib/tournament-logic';
	import { TIE_BREAK_FACTOR_GLYPHS } from '$lib/tournament-logic';

	let {
		tiedFactors = [],
		decidingFactor = null,
		factor = null,
		size = 'inline',
		getLabel
	}: {
		tiedFactors?: readonly TieBreakFactorId[];
		decidingFactor?: TieBreakFactorId | null;
		/** When set, shows a single factor icon (e.g. tie-break config list). */
		factor?: TieBreakFactorId | null;
		size?: 'inline' | 'large';
		getLabel: (id: TieBreakFactorId) => string;
	} = $props();

	const consideredFactors = $derived(
		factor ? [factor] : decidingFactor ? [...tiedFactors, decidingFactor] : [...tiedFactors]
	);
</script>

{#if consideredFactors.length > 0}
	<span class="tie-break-icons" class:large={size === 'large'} aria-label="Tie-break factors">
		{#each consideredFactors as item (item)}
			<span
				class="factor-icon"
				class:tied={!factor && tiedFactors.includes(item)}
				class:deciding={!factor && decidingFactor === item}
				title={factor
					? getLabel(item)
					: decidingFactor === item
						? getLabel(item)
						: `${getLabel(item)} (=)`}
				aria-label={getLabel(item)}
			>{TIE_BREAK_FACTOR_GLYPHS[item]}</span>
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
		flex-shrink: 0;
	}

	.tie-break-icons.large {
		margin-left: 0;
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

	.tie-break-icons.large .factor-icon {
		min-width: 2.75rem;
		height: 2.75rem;
		font-size: 1.35rem;
		border-radius: var(--radius-sm);
		border-width: 2px;
		color: var(--text-primary);
		background: var(--bg-primary);
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

	.tie-break-icons.large .factor-icon.deciding {
		background: color-mix(in srgb, var(--accent-info) 18%, var(--bg-primary));
	}
</style>
