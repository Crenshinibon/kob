<script lang="ts">
	let {
		data
	}: { data: { user?: { id: string }; active: any[]; finished: any[]; archived: any[] } } =
		$props();
</script>

<main>
	<header>
		<h1>KoB Tracker</h1>
		{#if data?.user}
			<a href="/tournament/create" class="btn-primary">+ New Tournament</a>
		{:else}
			<a href="/login" class="btn-primary btn-disabled">+ New Tournament</a>
		{/if}
	</header>

	{#if !data?.user}
		<section class="login-prompt">
			<p>Please <a href="/login">log in</a> to manage tournaments.</p>
		</section>
	{:else}
		<!-- Active Tournaments -->
		{#if data.active.length > 0}
			<section class="tournaments">
				<h2>Active Tournaments</h2>
				<div class="tournament-list">
					{#each data.active as tournament (tournament.id)}
						<a href="/tournament/{tournament.id}" class="tournament-card">
							<h3>{tournament.name}</h3>
							<span class="status active">active</span>
							<p class="round">Round {tournament.currentRound} of {tournament.numRounds}</p>
						</a>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Finished Tournaments -->
		{#if data.finished.length > 0}
			<section class="tournaments">
				<h2>Finished Tournaments</h2>
				<div class="tournament-list">
					{#each data.finished as tournament (tournament.id)}
						<a href="/tournament/{tournament.id}" class="tournament-card">
							<h3>{tournament.name}</h3>
							<span class="status completed">completed</span>
						</a>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Archived Tournaments -->
		{#if data.archived.length > 0}
			<section class="tournaments">
				<h2>Archived Tournaments</h2>
				<div class="tournament-list">
					{#each data.archived as tournament (tournament.id)}
						<a href="/tournament/{tournament.id}" class="tournament-card">
							<h3>{tournament.name}</h3>
							<span class="status archived">archived</span>
						</a>
					{/each}
				</div>
			</section>
		{/if}

		{#if data.active.length === 0 && data.finished.length === 0 && data.archived.length === 0}
			<section class="empty">
				<p>No tournaments yet.</p>
				<a href="/tournament/create" class="btn-primary">Create your first tournament</a>
			</section>
		{/if}
	{/if}
</main>

<style>
	main {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
	}

	h1 {
		margin: 0;
		font-size: 1.5rem;
	}

	.btn-primary {
		background: #0066cc;
		color: white;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		text-decoration: none;
		font-weight: 500;
	}

	.btn-primary:hover {
		background: #0052a3;
	}

	.btn-disabled {
		background: #ccc;
		pointer-events: none;
	}

	.login-prompt,
	.empty {
		text-align: center;
		padding: 3rem 1rem;
	}

	.empty p {
		margin-bottom: 1rem;
		color: #666;
	}

	.tournaments {
		margin-bottom: 2rem;
	}

	.tournaments h2 {
		font-size: 1.1rem;
		margin-bottom: 1rem;
		color: #333;
	}

	.tournament-list {
		display: grid;
		gap: 1rem;
	}

	.tournament-card {
		display: block;
		padding: 1rem;
		border: 1px solid #ddd;
		border-radius: 8px;
		text-decoration: none;
		color: inherit;
	}

	.tournament-card:hover {
		border-color: #0066cc;
		background: #f8f9fa;
	}

	.tournament-card h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.1rem;
	}

	.status {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		text-transform: uppercase;
		font-weight: 600;
	}

	.status.active {
		background: #d4edda;
		color: #155724;
	}

	.status.completed {
		background: #d1ecf1;
		color: #0c5460;
	}

	.status.archived {
		background: #e2e3e5;
		color: #383d41;
	}

	.round {
		margin: 0.5rem 0 0 0;
		font-size: 0.875rem;
		color: #666;
	}
</style>
