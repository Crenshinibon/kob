<script lang="ts">
	let { data, form } = $props<{
		data: {
			court: any;
			matches: any[];
			standings: any[];
			isActive: boolean;
		};
		form?: { error?: string; success?: string };
	}>();

	function getPlayerName(match: any, position: string) {
		const names = data.court.playerNames;
		switch (position) {
			case 'a1':
				return names[match.teamAPlayer1Id];
			case 'a2':
				return names[match.teamAPlayer2Id];
			case 'b1':
				return names[match.teamBPlayer1Id];
			case 'b2':
				return names[match.teamBPlayer2Id];
		}
	}
</script>

<main>
	<header>
		<h1>{data.court.tournamentName}</h1>
		<p>Court {data.court.courtNumber}, Round {data.court.roundNumber}</p>
	</header>

	{#if !data.isActive}
		<div class="closed">
			<h2>This round is closed</h2>
			<p>Scores have been finalized.</p>
		</div>
	{:else}
		{#if form?.error}
			<div class="error">{form.error}</div>
		{/if}

		{#if form?.success}
			<div class="success">{form.success}</div>
		{/if}

		<section class="matches">
			{#each data.matches as match, i}
				<div class="match">
					<h3>Match {i + 1}</h3>

					{#if match.teamAScore !== null}
						<div class="completed">
							<p>
								{getPlayerName(match, 'a1')} & {getPlayerName(match, 'a2')}:
								<strong>{match.teamAScore}</strong>
							</p>
							<p>
								{getPlayerName(match, 'b1')} & {getPlayerName(match, 'b2')}:
								<strong>{match.teamBScore}</strong>
							</p>
							<span class="saved">✓ Saved</span>
						</div>
					{:else}
						<form method="POST" action="?/saveScore">
							<input type="hidden" name="matchId" value={match.id} />

							<div class="teams">
								<div class="team">
									<p>{getPlayerName(match, 'a1')} & {getPlayerName(match, 'a2')}</p>
									<input type="number" name="teamAScore" min="1" max="50" required />
								</div>

								<div class="vs">vs</div>

								<div class="team">
									<p>{getPlayerName(match, 'b1')} & {getPlayerName(match, 'b2')}</p>
									<input type="number" name="teamBScore" min="1" max="50" required />
								</div>
							</div>

							<button type="submit" class="btn-primary">Save Score</button>
						</form>
					{/if}
				</div>
			{/each}
		</section>
	{/if}

	{#if data.standings.length > 0}
		<section class="standings">
			<h2>Current Standings</h2>
			<table>
				<thead>
					<tr>
						<th>#</th>
						<th>Player</th>
						<th>Points</th>
						<th>Diff</th>
					</tr>
				</thead>
				<tbody>
					{#each data.standings as s}
						<tr>
							<td>{s.rank}</td>
							<td>{s.name}</td>
							<td>{s.points}</td>
							<td>{s.diff > 0 ? '+' : ''}{s.diff}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</section>
	{/if}

	<p class="refresh">
		<button onclick={() => window.location.reload()}>Refresh page for updates</button>
	</p>
</main>

<style>
	main {
		max-width: 600px;
		margin: 0 auto;
		padding: 1rem;
	}

	header {
		margin-bottom: 1.5rem;
	}

	h1 {
		margin: 0;
		font-size: 1.25rem;
	}

	header p {
		margin: 0.25rem 0 0 0;
		color: #666;
	}

	.closed {
		background: #fff3cd;
		padding: 1.5rem;
		border-radius: 8px;
		text-align: center;
	}

	.closed h2 {
		margin: 0 0 0.5rem 0;
		color: #856404;
	}

	.closed p {
		margin: 0;
		color: #856404;
	}

	.error {
		background: #f8d7da;
		color: #721c24;
		padding: 0.75rem;
		border-radius: 4px;
		margin-bottom: 1rem;
	}

	.success {
		background: #d4edda;
		color: #155724;
		padding: 0.75rem;
		border-radius: 4px;
		margin-bottom: 1rem;
	}

	.matches {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	.match {
		border: 1px solid #ddd;
		border-radius: 8px;
		padding: 1rem;
	}

	.match h3 {
		margin: 0 0 0.75rem 0;
		font-size: 1rem;
	}

	.completed {
		background: #f8f9fa;
		padding: 0.75rem;
		border-radius: 4px;
	}

	.completed p {
		margin: 0.25rem 0;
	}

	.saved {
		display: inline-block;
		margin-top: 0.5rem;
		color: #28a745;
		font-size: 0.875rem;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.teams {
		display: flex;
		align-items: center;
		gap: 1rem;
		justify-content: center;
	}

	.team {
		text-align: center;
		flex: 1;
	}

	.team p {
		margin: 0 0 0.5rem 0;
		font-size: 0.875rem;
	}

	.team input {
		width: 60px;
		padding: 0.5rem;
		font-size: 1.25rem;
		text-align: center;
		border: 1px solid #ccc;
		border-radius: 4px;
	}

	.vs {
		font-weight: bold;
		color: #666;
	}

	.btn-primary {
		background: #0066cc;
		color: white;
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 4px;
		font-size: 0.875rem;
		cursor: pointer;
		align-self: center;
	}

	.btn-primary:hover {
		background: #0052a3;
	}

	.standings {
		margin-bottom: 2rem;
	}

	.standings h2 {
		font-size: 1.1rem;
		margin-bottom: 0.75rem;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	th,
	td {
		padding: 0.5rem;
		text-align: left;
		border-bottom: 1px solid #eee;
	}

	th {
		font-weight: 600;
		font-size: 0.875rem;
	}

	td {
		font-size: 0.875rem;
	}

	.refresh {
		text-align: center;
		font-size: 0.875rem;
	}

	.refresh a {
		color: #0066cc;
	}
</style>
