<script lang="ts">
	let {
		data
	}: {
		data: { user?: { id: string }; active: any[]; draft: any[]; finished: any[]; archived: any[] };
	} = $props();
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

		<!-- Draft Tournaments -->
		{#if data.draft.length > 0}
			<section class="tournaments">
				<h2>Draft Tournaments</h2>
				<div class="tournament-list">
					{#each data.draft as tournament (tournament.id)}
						<a href="/tournament/{tournament.id}/players" class="tournament-card">
							<h3>{tournament.name}</h3>
							<span class="status draft">draft</span>
							<p class="round">{tournament.numRounds} rounds planned</p>
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

		{#if data.active.length === 0 && data.draft.length === 0 && data.finished.length === 0 && data.archived.length === 0}
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
		padding: var(--spacing-xl) var(--spacing-md);
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--spacing-xl);
	}

	h1 {
		margin: 0;
		font-size: var(--font-size-2xl);
		color: var(--text-primary);
	}

	.btn-primary {
		background-color: var(--accent-primary);
		color: var(--bg-primary);
		padding: var(--spacing-sm) var(--spacing-md);
		border-radius: var(--radius-sm);
		text-decoration: none;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		border: 2px solid var(--accent-primary);
		transition: all var(--transition-base);
	}

	.btn-primary:hover {
		background-color: var(--accent-primary-hover);
		box-shadow: var(--glow-primary);
	}

	.btn-disabled {
		background-color: var(--bg-secondary);
		color: var(--text-muted);
		border-color: var(--border-default);
		pointer-events: none;
	}

	.login-prompt,
	.empty {
		text-align: center;
		padding: 3rem var(--spacing-md);
		background-color: var(--bg-card);
		border: 2px solid var(--border-default);
		border-radius: var(--radius-md);
		margin-top: var(--spacing-lg);
	}

	.empty p {
		margin-bottom: var(--spacing-md);
		color: var(--text-secondary);
	}

	.tournaments {
		margin-bottom: var(--spacing-xl);
	}

	.tournaments h2 {
		font-size: var(--font-size-lg);
		margin-bottom: var(--spacing-md);
		color: var(--text-primary);
		font-weight: 700;
	}

	.tournament-list {
		display: grid;
		gap: var(--spacing-md);
	}

	.tournament-card {
		display: block;
		padding: var(--spacing-md);
		background-color: var(--bg-card);
		border: 2px solid var(--border-default);
		border-radius: var(--radius-md);
		text-decoration: none;
		color: inherit;
		transition: all var(--transition-base);
	}

	.tournament-card:hover {
		border-color: var(--accent-info);
		box-shadow: var(--shadow-focus);
	}

	.tournament-card h3 {
		margin: 0 0 var(--spacing-sm) 0;
		font-size: var(--font-size-lg);
		color: var(--text-primary);
	}

	.status {
		display: inline-block;
		padding: var(--spacing-xs) var(--spacing-sm);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-xs);
		text-transform: uppercase;
		font-weight: 700;
		letter-spacing: 0.5px;
	}

	.status.active {
		background-color: var(--status-active-bg);
		color: var(--status-active-text);
	}

	.status.completed {
		background-color: var(--status-completed-bg);
		color: var(--status-completed-text);
	}

	.status.archived {
		background-color: var(--status-archived-bg);
		color: var(--status-archived-text);
	}

	.status.draft {
		background-color: var(--status-draft-bg);
		color: var(--status-draft-text);
	}

	.round {
		margin: var(--spacing-sm) 0 0 0;
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
	}
</style>
