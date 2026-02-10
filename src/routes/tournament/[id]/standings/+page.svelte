<script lang="ts">
	import { resolve } from '$app/paths';

	let {
		data
	}: {
		data: {
			tournament: {
				id: number;
				name: string;
				status: string;
				currentRound: number;
				numRounds: number;
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
			}>;
			players: Array<{ id: number; name: string }>;
		};
	} = $props();

	const tournament = $derived(data.tournament);
	const standings = $derived(data.standings);

	// Get top 3 for podium
	const top3 = $derived(standings.slice(0, 3));
	const first = $derived(top3[0]);
	const second = $derived(top3[1]);
	const third = $derived(top3[2]);

	// Medal emojis
	const medals = ['🥇', '🥈', '🥉'];

	function formatNumber(num: number): string {
		return num > 0 ? `+${num}` : String(num);
	}

	// Calculate variance for consistent performer achievement
	function variance(arr: number[]): number {
		if (arr.length === 0) return Infinity;
		const mean = arr.reduce((sum, val) => sum + val, 0) / arr.length;
		return arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
	}
</script>

<main>
	<header>
		<a href={resolve(`/tournament/${tournament.id}`)}>← Back to Tournament</a>
		<h1>{tournament.name}</h1>
		<p>Total Standings - Round {tournament.currentRound} of {tournament.numRounds}</p>
	</header>

	{#if standings.length === 0}
		<section class="empty">
			<p>No standings available yet.</p>
			<p>Complete at least one round to see total standings.</p>
		</section>
	{:else}
		<!-- Podium Section -->
		{#if tournament.status === 'completed' || tournament.currentRound >= 2}
			<section class="podium-section">
				<h2>Winners</h2>
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
			<h2>Complete Rankings</h2>
			<table class="standings-table">
				<thead>
					<tr>
						<th>Rank</th>
						<th>Player</th>
						<th>Points</th>
						<th>Diff</th>
						<th>Rounds</th>
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
											<span class="court-badge court-{roundData.court}">C{roundData.court}</span>
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
				<h2>Tournament Achievements</h2>
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
							<div class="achievement-title">Most Improved</div>
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
							<div class="achievement-title">Consistent Performer</div>
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
							<div class="achievement-title">Court Champion</div>
							<div class="achievement-winner">{courtChampion.playerName}</div>
						</div>
					{/if}
				</div>
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

	.court-badge.court-1 {
		background-color: var(--accent-success);
		color: var(--bg-primary);
	}

	.court-badge.court-2 {
		background-color: var(--accent-info);
		color: var(--bg-primary);
	}

	.court-badge.court-3 {
		background-color: var(--accent-warning);
		color: var(--bg-primary);
	}

	.court-badge.court-4 {
		background-color: var(--text-muted);
		color: var(--bg-primary);
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
</style>
