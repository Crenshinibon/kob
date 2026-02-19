<script lang="ts">
	let {
		data
	}: {
		data: { user?: { id: string }; active: any[]; draft: any[]; finished: any[]; archived: any[] };
	} = $props();
</script>

<main>
	<header>
		<div class="logo-section">
			<img
				src="/logo-200.jpg"
				alt="King of the Beach"
				class="logo"
				srcset="/logo-100.jpg 100w, /logo-200.jpg 200w, /logo-400.jpg 400w"
				sizes="(max-width: 600px) 100px, 200px"
			/>
			<h1 style="writing-mode: vertical-rl; text-orientation: upright; letter-spacing: -2px;">
				KOB
			</h1>
		</div>
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

<footer class="imprint">
	<details>
		<summary>Imprint / Legal Notice</summary>
		<div class="imprint-content">
			<p><strong>ACCOMADE - Dirk Porsche</strong></p>
			<p>Sollbrüggenstr. 14<br />47800 Krefeld<br />Germany</p>
			<p>
				<a href="mailto:dirk@accoma.de">dirk@accoma.de</a><br />
				<a href="tel:+4916095085331">+49 160 95085331</a>
			</p>
			<p class="legal-note">
				This website is operated in accordance with EU Digital Services Act (DSA) requirements. The
				imprint provides legally required information about the service provider.
			</p>
		</div>
	</details>
</footer>

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

	.logo-section {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
	}

	.logo {
		width: 60px;
		height: auto;
		border-radius: var(--radius-sm);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
		object-fit: cover;
	}

	h1 {
		margin: 0;
		font-size: var(--font-size-2xl);
		color: var(--text-primary);
		font-weight: 800;
		letter-spacing: -1px;
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

	/* Imprint / Legal Notice */
	.imprint {
		max-width: 800px;
		margin: var(--spacing-xl) auto 0;
		padding: 0 var(--spacing-md);
		border-top: 1px solid var(--border-default);
		padding-top: var(--spacing-lg);
	}

	.imprint details {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}

	.imprint summary {
		cursor: pointer;
		padding: var(--spacing-sm) 0;
		font-weight: 600;
		list-style: none;
		color: var(--text-secondary);
	}

	.imprint summary:hover {
		color: var(--text-primary);
	}

	.imprint summary::-webkit-details-marker {
		display: none;
	}

	.imprint-content {
		padding: var(--spacing-md) 0;
		line-height: 1.6;
	}

	.imprint-content p {
		margin: 0 0 var(--spacing-sm) 0;
	}

	.imprint-content a {
		color: var(--accent-info);
		text-decoration: none;
	}

	.imprint-content a:hover {
		text-decoration: underline;
	}

	.legal-note {
		font-size: var(--font-size-xs);
		margin-top: var(--spacing-md);
		padding-top: var(--spacing-sm);
		border-top: 1px solid var(--border-default);
		font-style: italic;
	}
</style>
