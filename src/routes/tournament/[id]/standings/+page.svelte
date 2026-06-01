<script lang="ts">
	import { resolveRoute } from '$app/paths';
	import * as m from '$lib/paraglide/messages';

	let { data }: { data: PageData } = $props();

	const tournament = $derived(data.tournament);
	const standings = $derived(data.standings);
	const courtSizes = $derived(data.courtSizes);

	// Get top 3 for podium
	const top3 = $derived(standings.slice(0, 3));
	const first = $derived(top3[0]);
	const second = $derived(top3[1]);
	const third = $derived(top3[2]);

	// Medal emojis
	const medals = ['🥇', '🥈', '🥉'];

	const formatNumber = (num: number): string => (num > 0 ? `+${num}` : String(num));

	function getCourtSizeLabel(size: number): string {
		if (size === 3) return '3p';
		if (size === 4) return '4p';
		if (size === 5) return '5p';
		if (size === 6) return '6p';
		return `${size}p`;
	}

	function getCourtSizeColor(size: number): string {
		if (size === 3) return 'var(--accent-warning)';
		if (size === 4) return 'var(--accent-success)';
		return 'var(--accent-info)';
	}

	function getCourtBadgeStyle(courtNum: number): string {
		const size = courtSizes.length >= courtNum ? courtSizes[courtNum - 1] : 4;
		return getCourtSizeColor(size);
	}

	function getCourtBadgeLabel(courtNum: number): string {
		const size = courtSizes.length >= courtNum ? courtSizes[courtNum - 1] : 4;
		return `C${courtNum} ${getCourtSizeLabel(size)}`;
	}

	// Calculate variance for consistent performer achievement
	function variance(arr: number[]): number {
		if (arr.length === 0) return Infinity;
		const mean = arr.reduce((sum, val) => sum + val, 0) / arr.length;
		return arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
	}

	type PageData = {
		tournament: {
			id: number;
			name: string;
			status: string;
			currentRound: number;
			numRounds: number;
			formatType?: string;
		};
		standings: Array<{
			playerId: number;
			playerName: string;
			totalPoints: number;
			totalDiff: number;
			roundsPlayed: number;
			matchesPlayed: number;
			overallRank: number;
			roundHistory: Array<{
				round: number;
				court: number;
				rankOnCourt: number;
				points: number;
				diff: number;
			}>;
			currentRoundPoints: number;
			currentRoundDiff: number;
		}>;
		courtSizes: number[];
		retiredPlayers?: Array<{
			id: number;
			name: string;
			retiredRound: number | null;
			retirementReason: string | null;
			finalStanding: number | null;
		}>;
	};
</script>

<main>
	<header>
		<a href={resolveRoute('/tournament/[id]', { id: String(tournament.id) })}
			>{m.standings_back()}</a
		>
		<h1>{tournament.name}</h1>
		{#if tournament.formatType}
			<p>
				{m.standings_title()} · {m.round_label({ current: tournament.currentRound, total: tournament.numRounds })}
				· {tournament.formatType === 'preseed' ? m.format_preseed() : m.format_random_seed()}
			</p>
		{:else}
			<p>{m.standings_title()} · {m.round_label({ current: tournament.currentRound, total: tournament.numRounds })}</p>
		{/if}
	</header>

	{#if standings.length === 0}
		<section class="empty">
			<p>{m.standings_empty()}</p>
			<p>{m.standings_empty_hint()}</p>
		</section>
	{:else}
		<!-- Podium Section -->
		{#if tournament.status === 'completed' || tournament.currentRound >= 2}
			<section class="podium-section">
				<h2>{m.standings_winners()}</h2>
				<div class="podium">
					{#if second}
						<div class="podium-place second">
							<div class="medal">🥈</div>
							<div class="player-name">{second.playerName}</div>
							<div class="stats">{second.totalPoints} pts</div>
							<div class="diff">{formatNumber(second.totalDiff)}</div>
						</div>
					{/if}

					{#if first}
						<div class="podium-place first">
							<div class="medal">🥇</div>
							<div class="crown">👑</div>
							<div class="player-name">{first.playerName}</div>
							<div class="stats">{first.totalPoints} pts</div>
							<div class="diff">{formatNumber(first.totalDiff)}</div>
						</div>
					{/if}

					{#if third}
						<div class="podium-place third">
							<div class="medal">🥉</div>
							<div class="player-name">{third.playerName}</div>
							<div class="stats">{third.totalPoints} pts</div>
							<div class="diff">{formatNumber(third.totalDiff)}</div>
						</div>
					{/if}
				</div>
			</section>
		{/if}

		<!-- Total Standings Table -->
		<section class="standings-section">
			<h2>{m.standings_complete_rankings()}</h2>
			<table class="standings-table">
				<thead>
					<tr>
						<th>{m.standings_place()}</th>
						<th>{m.standings_player()}</th>
						<th>{m.standings_points()}</th>
						<th>{m.standings_diff()}</th>
						<th>{m.standings_rounds()}</th>
						{#if tournament.currentRound > 1}
							{#each Array.from({ length: tournament.currentRound }, (_, i) => i) as i (i)}
								<th>R{i + 1}</th>
							{/each}
						{/if}
					</tr>
				</thead>
				<tbody>
					{#each standings as player (player.playerId)}
						<tr class={player.overallRank <= 3 ? 'top-three' : ''}>
							<td class="rank">
								{#if player.overallRank <= 3}
									<span class="medal">{medals[player.overallRank - 1]}</span>
								{:else}
									{player.overallRank}
								{/if}
							</td>
							<td class="player-name">{player.playerName}</td>
							<td class="points">{player.totalPoints}</td>
							<td
								class="diff {player.totalDiff > 0
									? 'positive'
									: player.totalDiff < 0
										? 'negative'
										: ''}"
							>
								{formatNumber(player.totalDiff)}
							</td>
							<td>{player.roundsPlayed}</td>
							{#if tournament.currentRound > 1}
								{#each Array.from({ length: tournament.currentRound }, (_, i) => i) as roundIdx (roundIdx)}
									{@const roundData = player.roundHistory.find((r) => r.round === roundIdx + 1)}
									<td class="round-data">
										{#if roundData}
											<span
												class="court-badge"
												style="border-color: {getCourtBadgeStyle(
													roundData.court
												)}; color: {getCourtBadgeStyle(roundData.court)}"
											>
												{getCourtBadgeLabel(roundData.court)}
											</span>
											<span class="rank-badge">#{roundData.rankOnCourt}</span>
										{:else}
											-
										{/if}
									</td>
								{/each}
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</section>

		<!-- Achievement Categories -->
		{#if tournament.status === 'completed'}
			<section class="achievements">
				<h2>{m.standings_achievements()}</h2>
				<div class="achievement-grid">
					{#if standings.length > 0}
						{@const mostImproved = [...standings].sort((a, b) => {
							const aFirst = a.roundHistory[0]?.points || 0;
							const aLast = a.roundHistory[a.roundHistory.length - 1]?.points || 0;
							const bFirst = b.roundHistory[0]?.points || 0;
							const bLast = b.roundHistory[b.roundHistory.length - 1]?.points || 0;
							return bLast - bFirst - (aLast - aFirst);
						})[0]}
						<div class="achievement-card">
							<div class="achievement-icon">📈</div>
							<div class="achievement-title">{m.achievement_most_improved()}</div>
							<div class="achievement-winner">{mostImproved.playerName}</div>
						</div>
					{/if}

					{#if standings.length > 0}
						{@const mostConsistent = [...standings].sort((a, b) => {
							const aRanks = a.roundHistory.map((r) => r.rankOnCourt);
							const bRanks = b.roundHistory.map((r) => r.rankOnCourt);
							const aVariance = variance(aRanks);
							const bVariance = variance(bRanks);
							return aVariance - bVariance;
						})[0]}
						<div class="achievement-card">
							<div class="achievement-icon">🎯</div>
							<div class="achievement-title">{m.achievement_consistent()}</div>
							<div class="achievement-winner">{mostConsistent.playerName}</div>
						</div>
					{/if}

					{#if standings.length > 0}
						{@const courtChampion = [...standings].sort((a, b) => {
							const aTopCourt = a.roundHistory.filter((r) => r.court === 1).length;
							const bTopCourt = b.roundHistory.filter((r) => r.court === 1).length;
							return bTopCourt - aTopCourt;
						})[0]}
						<div class="achievement-card">
							<div class="achievement-icon">👑</div>
							<div class="achievement-title">{m.achievement_court_champion()}</div>
							<div class="achievement-winner">{courtChampion.playerName}</div>
						</div>
					{/if}
				</div>
			</section>
		{/if}

		{#if data.retiredPlayers && data.retiredPlayers.length > 0}
			<section class="retired-section">
				<h2>{m.standings_retired_players()}</h2>
				<table class="standings-table">
					<thead>
						<tr>
							<th>{m.standings_player()}</th>
							<th>{m.standings_retired_round()}</th>
							<th>{m.standings_reason()}</th>
						</tr>
					</thead>
					<tbody>
						{#each data.retiredPlayers as rp (rp.id)}
							<tr>
								<td>{rp.name}</td>
								<td>Round {rp.retiredRound}</td>
								<td>{rp.retirementReason || '—'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</section>
		{/if}
	{/if}
</main>

<style>
	main {
		max-width: 900px;
		margin: 0 auto;
		padding: var(--spacing-xl) var(--spacing-md);
	}

	header {
		margin-bottom: var(--spacing-xl);
		text-align: center;
	}

	header a {
		color: var(--text-muted);
		text-decoration: none;
		font-size: var(--font-size-sm);
		display: block;
		margin-bottom: var(--spacing-md);
	}

	header a:hover {
		color: var(--text-secondary);
	}

	h1 {
		margin: 0;
		font-size: var(--font-size-2xl);
		color: var(--text-primary);
	}

	header p {
		margin: var(--spacing-sm) 0 0 0;
		color: var(--text-secondary);
		font-size: var(--font-size-lg);
	}

	.empty {
		text-align: center;
		padding: var(--spacing-xl);
		background-color: var(--bg-card);
		border: var(--border-thickness) solid var(--border-default);
		border-radius: var(--radius-md);
		color: var(--text-muted);
	}

	/* Podium Section */
	.podium-section {
		margin-bottom: var(--spacing-xl);
	}

	.podium-section h2 {
		text-align: center;
		margin-bottom: var(--spacing-lg);
		color: var(--text-primary);
	}

	.podium {
		display: flex;
		justify-content: center;
		align-items: flex-end;
		gap: var(--spacing-md);
		margin-bottom: var(--spacing-xl);
	}

	.podium-place {
		background: var(--bg-card);
		border: var(--border-thickness) solid var(--border-strong);
		border-radius: var(--radius-md);
		padding: var(--spacing-md);
		text-align: center;
		min-width: 120px;
	}

	.podium-place.first {
		border-color: var(--accent-warning);
		background: linear-gradient(135deg, rgba(255, 204, 0, 0.2), var(--bg-card));
		transform: scale(1.1);
		order: 2;
	}

	.podium-place.second {
		border-color: var(--text-muted);
		background: linear-gradient(135deg, rgba(192, 192, 192, 0.2), var(--bg-card));
		order: 1;
	}

	.podium-place.third {
		border-color: #cd7f32;
		background: linear-gradient(135deg, rgba(205, 127, 50, 0.2), var(--bg-card));
		order: 3;
	}

	.medal {
		font-size: 2.5rem;
		margin-bottom: var(--spacing-sm);
	}

	.crown {
		font-size: 1.5rem;
		margin-bottom: var(--spacing-xs);
	}

	.player-name {
		font-weight: 700;
		font-size: var(--font-size-lg);
		color: var(--text-primary);
		margin-bottom: var(--spacing-xs);
	}

	.stats {
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
	}

	.diff {
		font-size: var(--font-size-xs);
		color: var(--text-muted);
	}

	/* Standings Table */
	.standings-section {
		margin-bottom: var(--spacing-xl);
	}

	.standings-section h2 {
		margin-bottom: var(--spacing-md);
		color: var(--text-primary);
	}

	.standings-table {
		width: 100%;
		border-collapse: collapse;
		background-color: var(--bg-card);
		border: var(--border-thickness) solid var(--border-strong);
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.standings-table th,
	.standings-table td {
		padding: var(--spacing-sm);
		text-align: left;
		border-bottom: 1px solid var(--border-default);
	}

	.standings-table th {
		background-color: var(--bg-secondary);
		font-weight: 700;
		font-size: var(--font-size-sm);
		color: var(--text-primary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.standings-table tr.top-three {
		background-color: rgba(255, 204, 0, 0.1);
	}

	.standings-table tr:hover {
		background-color: var(--bg-hover);
	}

	.rank {
		font-weight: 700;
		font-size: var(--font-size-lg);
	}

	.points {
		font-weight: 700;
		font-size: var(--font-size-lg);
		color: var(--accent-primary);
	}

	.diff.positive {
		color: var(--accent-success);
	}

	.diff.negative {
		color: var(--accent-error);
	}

	.round-data {
		font-size: var(--font-size-xs);
	}

	.court-badge {
		display: inline-block;
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		font-weight: 600;
		font-size: var(--font-size-xs);
		margin-right: 4px;
	}

	.court-badge {
		display: inline-block;
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		font-weight: 600;
		font-size: var(--font-size-xs);
		margin-right: 4px;
		border: 2px solid;
		border-radius: var(--radius-sm);
	}

	.rank-badge {
		font-weight: 600;
	}

	/* Achievements */
	.achievements {
		margin-top: var(--spacing-xl);
	}

	.achievements h2 {
		margin-bottom: var(--spacing-md);
		color: var(--text-primary);
	}

	.achievement-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--spacing-md);
	}

	.achievement-card {
		background-color: var(--bg-card);
		border: var(--border-thickness) solid var(--border-strong);
		border-radius: var(--radius-md);
		padding: var(--spacing-md);
		text-align: center;
	}

	.achievement-icon {
		font-size: 2rem;
		margin-bottom: var(--spacing-sm);
	}

	.achievement-title {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin-bottom: var(--spacing-xs);
	}

	.achievement-winner {
		font-size: var(--font-size-lg);
		font-weight: 700;
		color: var(--text-primary);
	}

	.retired-section {
		margin-top: var(--spacing-xl);
	}

	.retired-section h2 {
		color: var(--text-primary);
		margin-bottom: var(--spacing-sm);
	}

	.retired-section td {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}
</style>
