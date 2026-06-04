<script lang="ts">
	import { resolve } from '$app/paths';
	import * as m from '$lib/paraglide/messages';
	import { getStandingsDataLive } from './standings-data.remote';

	let { data } = $props<{
		data: { tournamentId: number; tournament: { id: number; name: string } };
	}>();

	const liveQuery = $derived(getStandingsDataLive(data.tournamentId));

	const formatNumber = (num: number): string => (num > 0 ? `+${num}` : String(num));

	function getCourtSizeLabel(size: number): string {
		if (size === 3) return '3p';
		if (size === 4) return '4p';
		if (size === 5) return '5p';
		if (size === 6) return '6p';
		return `${size}p`;
	}

	function getCourtColor(courtNum: number): string {
		const colors = ['#FFD700', '#FFEA00', '#ADFF2F', '#69F0AE', '#00E5FF'];
		return colors[Math.min(courtNum - 1, colors.length - 1)] ?? '#FF8C00';
	}

	function getCourtBadgeLabel(courtNum: number, courtSizes: number[]): string {
		const size = courtSizes.length >= courtNum ? courtSizes[courtNum - 1] : 4;
		return `C${courtNum} ${getCourtSizeLabel(size)}`;
	}

	function getCurrentCourt(
		player: StandingPlayer,
		currentRound: number
	): number | undefined {
		return player.roundHistory.find((h) => h.round === currentRound)?.court;
	}

	function getEffectiveCourt(
		player: StandingPlayer,
		currentRound: number,
		assign: Record<number, { court: number }>
	): number | undefined {
		return (
			getCurrentCourt(player, currentRound) ??
			assign[player.playerId]?.court
		);
	}

	function getCurrentRank(
		player: StandingPlayer,
		currentRound: number
	): number | undefined {
		return player.roundHistory.find((h) => h.round === currentRound)?.rankOnCourt;
	}

	function variance(arr: number[]): number {
		if (arr.length === 0) return Infinity;
		const mean = arr.reduce((sum, val) => sum + val, 0) / arr.length;
		return arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
	}

	type StandingPlayer = {
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
	};
</script>

<main>
	<header>
		<a href={resolve('/tournament/[id]', { id: String(data.tournamentId) })}
			>{m.standings_back()}</a
		>
		<h1>{data.tournament.name}</h1>
	</header>

	{#await liveQuery}
		<section class="empty">
			<p>{m.loading()}</p>
		</section>
	{:then state}
		{@const tournament = state?.tournament}
		{@const cr = tournament?.currentRound ?? 0}
		{@const standings = (state?.standings ?? []) as StandingPlayer[]}
		{@const courtSizes = (state?.courtSizes ?? []) as number[]}
		{@const retiredPlayers = (state?.retiredPlayers ?? []) as Array<{ id: number; name: string; retiredRound: number | null; retirementReason: string | null; finalStanding: number | null }>}
		{@const injuredPlayerIds = (state?.injuredPlayerIds ?? []) as number[]}
		{@const allPlayers = (state?.players ?? []) as Array<{ id: number; name: string }>}
		{@const assignment = (state?.courtAssignment ?? {}) as Record<number, { court: number }>}

		{#if tournament}
			{@const currentRound = tournament.currentRound ?? 0}
			{@const displayRounds = tournament.numRounds ?? 0}
			{@const title = tournament.status === 'completed' ? m.standings_title() : m.standings_title_current()}
			<p>
				{title} · {m.round_label({ current: currentRound, total: displayRounds })}
				{#if tournament.formatType}
					· {tournament.formatType === 'preseed' ? m.format_preseed() : m.format_random_seed()}
				{/if}
			</p>
		{/if}

		{#if standings.length === 0}
			{@const allPlayers = state?.players ?? []}
			{#if allPlayers.length > 0}
				<section class="standings-section">
					<h2>{m.standings_complete_rankings()}</h2>
					<p class="info-text">{m.standings_empty_hint()}</p>
					<table class="standings-table">
						<thead>
							<tr>
								<th>{m.standings_place()}</th>
								<th>{m.standings_player()}</th>
							</tr>
						</thead>
						<tbody>
							{#each allPlayers as player (player.id)}
								<tr>
									<td class="rank">—</td>
									<td class="player-name">{player.name}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</section>
			{:else}
				<section class="empty">
					<p>{m.standings_empty()}</p>
					<p>{m.standings_empty_hint()}</p>
				</section>
			{/if}
		{:else}
			{#if tournament && (tournament.status === 'completed' || cr >= 2)}
				{@const top3 = standings.slice(0, 3)}
				{@const first = top3[0]}
				{@const second = top3[1]}
				{@const third = top3[2]}
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
						<th></th>
						<th>{m.standings_place()}</th>
						<th>Pos</th>
						<th>{m.standings_player()}</th>
						<th>{m.standings_points()}</th>
						<th>{m.standings_diff()}</th>
							<th>{m.standings_rounds()}</th>
							{#if cr > 1}
								{#each Array.from({ length: cr }, (_, i) => i) as i (i)}
									<th>R{i + 1}</th>
								{/each}
							{/if}
						</tr>
					</thead>
				<tbody>
						{#each standings as player, i (player.playerId)}
							{@const currentCourt = getEffectiveCourt(player, cr, assignment)}
							{@const rankOnCourt = getCurrentRank(player, cr)}
							{@const courtColor = currentCourt != null ? getCourtColor(currentCourt) : null}
							{@const prevCourt = i > 0 ? getEffectiveCourt(standings[i - 1], cr, assignment) : undefined}
							{@const isNewGroup = currentCourt !== prevCourt}
							{@const span = isNewGroup ? standings.slice(i).findIndex((s, idx) => idx > 0 && getEffectiveCourt(s, cr, assignment) !== currentCourt) : 0}
							{@const spanRows = span === -1 ? standings.length - i : span}

						<tr
							class={player.overallRank <= 3 ? 'top-three' : ''}
							class:new-group={isNewGroup}
							class:injured={injuredPlayerIds.includes(player.playerId)}
							style={courtColor ? `border-left: 4px solid ${courtColor}` : ''}
						>
							{#if isNewGroup && currentCourt != null}
								<td class="court-label" rowspan={spanRows} style={courtColor ? `color: ${courtColor}; border-right-color: ${courtColor}` : ''}>
									{currentCourt}
								</td>
							{/if}
							<td class="rank">
									{#if player.overallRank <= 3}
										<span class="medal">{['🥇', '🥈', '🥉'][player.overallRank - 1]}</span>
									{:else}
										{player.overallRank}
									{/if}
								</td>
								<td class="pos">
									{#if rankOnCourt != null}
										<span style={courtColor ? `color: ${courtColor}` : ''}>{rankOnCourt}</span>
									{/if}
								</td>
								<td
									class="player-name"
									style={courtColor ? `color: ${courtColor}` : ''}
								>
									{player.playerName}
								</td>
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
								{#if cr > 1}
									{#each Array.from({ length: cr }, (_, idx) => idx) as roundIdx (roundIdx)}
										{@const roundData = player.roundHistory.find((h: StandingPlayer['roundHistory'][0]) => h.round === roundIdx + 1)}
										<td class="round-data">
											{#if roundData}
												<span
													class="court-badge"
													style="border-color: {getCourtColor(
														roundData.court
													)}; color: {getCourtColor(roundData.court)}"
												>
													{getCourtBadgeLabel(roundData.court, courtSizes)}
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
			{#if tournament && tournament.status === 'completed'}
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
								const aRanks = a.roundHistory.map((h: StandingPlayer['roundHistory'][0]) => h.rankOnCourt);
								const bRanks = b.roundHistory.map((h: StandingPlayer['roundHistory'][0]) => h.rankOnCourt);
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
								const aTopCourt = a.roundHistory.filter((h: StandingPlayer['roundHistory'][0]) => h.court === 1).length;
								const bTopCourt = b.roundHistory.filter((h: StandingPlayer['roundHistory'][0]) => h.court === 1).length;
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

			{#if retiredPlayers.length > 0}
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
							{#each retiredPlayers as rp (rp.id)}
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
	{/await}
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

	.empty {
		text-align: center;
		padding: var(--spacing-xl);
		background-color: var(--bg-card);
		border: var(--border-thickness) solid var(--border-default);
		border-radius: var(--radius-md);
		color: var(--text-muted);
	}

	.info-text {
		text-align: center;
		color: var(--text-muted);
		font-size: var(--font-size-sm);
		margin-bottom: var(--spacing-md);
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

	.standings-table tr.injured {
		opacity: 0.5;
	}

	.standings-table tr.injured .player-name {
		text-decoration: line-through;
	}

	.standings-table tr.new-group {
		border-top: 2px solid;
	}

	.rank {
		font-weight: 700;
		font-size: var(--font-size-lg);
	}

	.court-label {
		font-size: var(--font-size-2xl);
		font-weight: 900;
		text-align: center;
		vertical-align: middle;
		width: 2.5rem;
		border-right: 3px solid;
	}

	.pos {
		font-weight: 900;
		font-size: var(--font-size-2xl);
		text-align: center;
		color: var(--text-secondary);
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
		border: 2px solid;
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
