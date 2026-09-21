<script lang="ts">
	import * as msg from '$lib/paraglide/messages';
	import TieBreakFactorIcons from '$lib/components/TieBreakFactorIcons.svelte';
	import { formatDiff, formatPoints } from '$lib/i18n/format';
	import type { TieBreakDecidingOutcome, TieBreakFactorId } from '$lib/tournament-logic';

	export type CourtStandingRow = {
		id: number;
		playerId?: number;
		rank: number;
		name: string;
		points: number;
		diff: number;
		avgPoints?: number | null;
		tiedFactors: readonly TieBreakFactorId[];
		decidingFactor: TieBreakFactorId | null;
		decidingOutcome: TieBreakDecidingOutcome;
		isYou?: boolean;
	};

	let {
		standings,
		courtSize,
		pointsToWin = 21,
		youLabel = undefined,
		heading = undefined
	}: {
		standings: readonly CourtStandingRow[];
		courtSize: number;
		pointsToWin?: number;
		youLabel?: string;
		heading?: string;
	} = $props();

	const showTieBreakIcons = $derived(
		standings.some((s) => s.tiedFactors.length > 0 || s.decidingFactor)
	);
	const showAvg = $derived(courtSize === 5 || courtSize === 6);

	function tieBreakFactorLabel(id: TieBreakFactorId): string {
		const labels: Record<TieBreakFactorId, () => string> = {
			round_points: msg.tie_break_factor_round_points,
			round_diff: msg.tie_break_factor_round_diff,
			total_points: msg.tie_break_factor_total_points,
			total_diff: msg.tie_break_factor_total_diff,
			initial_order: msg.tie_break_factor_initial_order,
			dice: msg.tie_break_factor_dice,
			manual: msg.tie_break_factor_manual
		};
		return labels[id]();
	}
</script>

{#if standings.length > 0}
	<section class="standings" data-testid="group-standings">
		<h2>{heading ?? msg.court_standings()}</h2>
		{#if showTieBreakIcons}
			<p class="standings-legend">{msg.tie_break_standings_legend()}</p>
		{/if}
		{#if courtSize === 3}
			<p class="standings-note">{msg.court_3p_desc({ points: pointsToWin })}</p>
		{/if}
		<table>
			<thead>
				<tr>
					<th>{msg.court_3p_table_header()}</th>
					<th>{msg.court_3p_table_player()}</th>
					{#if showTieBreakIcons}
						<th>{msg.tie_break_icons_header()}</th>
					{/if}
					{#if showAvg}
						<th>{msg.court_3p_table_avg()}</th>
					{/if}
					<th>{msg.court_3p_table_points()}</th>
					<th>{msg.court_3p_table_diff()}</th>
				</tr>
			</thead>
			<tbody>
				{#each standings as s (s.id)}
					<tr class:you={s.isYou}>
						<td>{s.rank}</td>
						<td>{s.isYou && youLabel ? youLabel : s.name}</td>
						{#if showTieBreakIcons}
							<td>
								<TieBreakFactorIcons
									tiedFactors={s.tiedFactors}
									decidingFactor={s.decidingFactor}
									decidingOutcome={s.decidingOutcome}
									getLabel={tieBreakFactorLabel}
								/>
							</td>
						{/if}
						{#if showAvg}
							<td>{s.avgPoints != null ? formatPoints(s.avgPoints) : '—'}</td>
						{/if}
						<td>{formatPoints(s.points)}</td>
						<td>{formatDiff(s.diff)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
{/if}

<style>
	.standings {
		margin: var(--spacing-lg) 0 0;
	}

	.standings h2 {
		font-size: var(--font-size-lg);
		margin: 0 0 var(--spacing-sm);
		color: var(--text-primary);
	}

	.standings-legend,
	.standings-note {
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		margin: 0 0 var(--spacing-sm);
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

	tr.you td {
		font-weight: 700;
		color: var(--text-primary);
	}
</style>
