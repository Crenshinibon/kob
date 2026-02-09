<script lang="ts">
	let { data } = $props<{
		data: {
			tournament: any;
			courts: any[];
			canCloseRound: boolean;
		};
	}>();

	function getMatchStatus(matches: any[]) {
		const completed = matches.filter((m) => m.teamAScore !== null).length;
		return `${completed}/3`;
	}
</script>

<main>
	<header>
		<a href="/">← Dashboard</a>
		<h1>{data.tournament.name}</h1>
		<p>Round {data.tournament.currentRound} of {data.tournament.numRounds}</p>
	</header>

	<section class="courts">
		{#each data.courts as court}
			<div class="court-card">
				<div class="court-header">
					<h2>Court {court.courtNumber}</h2>
					<span class="matches">{getMatchStatus(court.matches)} matches</span>
				</div>

				<div class="players">
					{#each court.players as p, i}
						<span class="player">{String.fromCharCode(65 + i)}: {p.name}</span>
					{/each}
				</div>

				<div class="qr">
					<a href="/court/{court.token}" target="_blank">View Court Page</a>
				</div>
			</div>
		{/each}
	</section>

	<section class="actions">
		<a href="/tournament/{data.tournament.id}/courts" class="btn-secondary">View All QR Codes</a>

		{#if data.canCloseRound}
			<form method="POST" action="?/closeRound">
				<button type="submit" class="btn-primary">Close Round & Advance</button>
			</form>
		{:else}
			<button disabled class="btn-primary btn-disabled">Waiting for all scores...</button>
		{/if}
	</section>
</main>

<style>
	main {
		max-width: 900px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	header {
		margin-bottom: 2rem;
	}

	header a {
		color: #666;
		text-decoration: none;
	}

	h1 {
		margin: 0.5rem 0 0 0;
		font-size: 1.5rem;
	}

	header p {
		margin: 0.25rem 0 0 0;
		color: #666;
	}

	.courts {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.court-card {
		border: 1px solid #ddd;
		border-radius: 8px;
		padding: 1rem;
	}

	.court-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.court-header h2 {
		margin: 0;
		font-size: 1.1rem;
	}

	.matches {
		font-size: 0.75rem;
		color: #666;
		background: #f0f0f0;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
	}

	.players {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin-bottom: 1rem;
	}

	.player {
		font-size: 0.875rem;
	}

	.qr a {
		font-size: 0.875rem;
		color: #0066cc;
		text-decoration: none;
	}

	.qr a:hover {
		text-decoration: underline;
	}

	.actions {
		display: flex;
		gap: 1rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.btn-primary {
		background: #0066cc;
		color: white;
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 4px;
		font-size: 1rem;
		cursor: pointer;
	}

	.btn-primary:hover {
		background: #0052a3;
	}

	.btn-secondary {
		background: #6c757d;
		color: white;
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 4px;
		font-size: 1rem;
		text-decoration: none;
	}

	.btn-secondary:hover {
		background: #5a6268;
	}

	.btn-disabled {
		background: #ccc;
		cursor: not-allowed;
	}
</style>
