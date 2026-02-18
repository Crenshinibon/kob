<script lang="ts">
	let { data, form } = $props<{
		data: { tournament: any; players: any[] };
		form?: { error?: string; success?: string };
	}>();

	let playerNames = $state('');
	let playerCount = $derived(playerNames.split('\n').filter((n) => n.trim()).length);
	let textareaEl: HTMLTextAreaElement | undefined = $state();

	const maxPlayers = $derived(data.tournament.playerCount);
	const isPreseed = $derived(data.tournament.formatType === 'preseed');
	const playersReady = $derived(data.players.length >= maxPlayers);

	function handlePaste(e: ClipboardEvent) {
		const pastedText = e.clipboardData?.getData('text') || '';

		if (textareaEl && (pastedText.includes(',') || pastedText.includes(';'))) {
			e.preventDefault();

			const names = pastedText
				.split(/[,;]+/)
				.map((n) => n.trim())
				.filter((n) => n.length > 0);

			const formattedNames = names.join('\n');

			const start = textareaEl.selectionStart;
			const end = textareaEl.selectionEnd;
			const before = playerNames.substring(0, start);
			const after = playerNames.substring(end);

			playerNames = before + formattedNames + (after ? '\n' + after : '');

			setTimeout(() => {
				if (textareaEl)
					textareaEl.selectionStart = textareaEl.selectionEnd = start + formattedNames.length;
			}, 0);
		}
	}
</script>

<main>
	<header>
		<a href="/">← Back</a>
		<h1>{data.tournament.name}</h1>
		<p>
			{#if isPreseed}
				Preseed format • Add {maxPlayers} players with points
			{:else}
				Random seed format • Add {maxPlayers} players
			{/if}
		</p>
	</header>

	{#if form?.error}
		<div class="error">{form.error}</div>
	{/if}

	{#if form?.success}
		<div class="success">{form.success}</div>
	{/if}

	<section class="current-players">
		<h2>Current Players ({data.players.length}/{maxPlayers})</h2>
		{#if data.players.length > 0}
			<ul>
				{#each data.players as p, i}
					<li>
						{#if isPreseed}
							<span class="seed">{p.seedPoints ?? '-'} pts</span>
							{p.name}
						{:else}
							{p.name}
						{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<p class="empty">No players added yet.</p>
		{/if}
	</section>

	{#if !playersReady}
		<form method="POST" action="?/addPlayers">
			<div class="field">
				{#if isPreseed}
					<label for="names"
						>Player Names with Points (Name followed by points - one per line)</label
					>
					<textarea
						id="names"
						name="names"
						bind:this={textareaEl}
						bind:value={playerNames}
						onpaste={handlePaste}
						rows="10"
						placeholder="Alice 1250&#10;Bob 1180&#10;Carol Chen 1150&#10;..."
					></textarea>
					<p class="count">{playerCount} names entered</p>
					<p class="hint">Format: Player Name Points (e.g., "Alice 1250" or "Carol Chen 1150")</p>
				{:else}
					<label for="names">Player Names (one per line)</label>
					<textarea
						id="names"
						name="names"
						bind:this={textareaEl}
						bind:value={playerNames}
						onpaste={handlePaste}
						rows="10"
						placeholder="Alice&#10;Bob&#10;Carol&#10;..."
					></textarea>
					<p class="count">{playerCount} names entered</p>
				{/if}
			</div>

			<button type="submit" class="btn-primary">Add Players</button>
		</form>
	{:else}
		<div class="ready">
			<p>✓ All {maxPlayers} players added!</p>
			<form method="POST" action="?/start">
				<button type="submit" class="btn-primary btn-large">Start Tournament</button>
			</form>
		</div>
	{/if}
</main>

<style>
	main {
		max-width: 600px;
		margin: 0 auto;
		padding: var(--spacing-xl) var(--spacing-md);
	}

	header {
		margin-bottom: var(--spacing-xl);
	}

	header a {
		color: var(--text-muted);
		text-decoration: none;
		font-size: var(--font-size-sm);
		transition: color var(--transition-fast);
	}

	header a:hover {
		color: var(--text-secondary);
	}

	h1 {
		margin: var(--spacing-sm) 0 0 0;
		font-size: var(--font-size-2xl);
		color: var(--text-primary);
	}

	header p {
		margin: var(--spacing-xs) 0 0 0;
		color: var(--text-secondary);
	}

	.error {
		background-color: rgba(255, 51, 51, 0.1);
		color: var(--accent-error);
		border: 2px solid var(--accent-error);
		padding: var(--spacing-sm);
		border-radius: var(--radius-sm);
		margin-bottom: var(--spacing-md);
		font-weight: 500;
	}

	.success {
		background-color: rgba(0, 255, 65, 0.1);
		color: var(--accent-success);
		border: 2px solid var(--accent-success);
		padding: var(--spacing-sm);
		border-radius: var(--radius-sm);
		margin-bottom: var(--spacing-md);
		font-weight: 600;
	}

	.current-players {
		margin-bottom: var(--spacing-xl);
		padding: var(--spacing-md);
		background-color: var(--bg-card);
		border: 2px solid var(--border-default);
		border-radius: var(--radius-md);
	}

	.current-players h2 {
		margin: 0 0 var(--spacing-md) 0;
		font-size: var(--font-size-lg);
		color: var(--text-primary);
	}

	.current-players ul {
		margin: 0;
		padding-left: var(--spacing-lg);
		color: var(--text-secondary);
	}

	.current-players li {
		margin: var(--spacing-xs) 0;
		display: flex;
		gap: var(--spacing-sm);
		align-items: center;
	}

	.seed {
		background-color: var(--bg-input);
		padding: 2px var(--spacing-sm);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-sm);
		color: var(--accent-primary);
		font-weight: 600;
		min-width: 70px;
		text-align: right;
	}

	.empty {
		color: var(--text-muted);
		font-style: italic;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
		background-color: var(--bg-card);
		padding: var(--spacing-md);
		border-radius: var(--radius-md);
		border: 2px solid var(--border-default);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	label {
		font-weight: 600;
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	textarea {
		padding: var(--spacing-sm);
		font-size: var(--font-size-base);
		background-color: var(--bg-input);
		color: var(--text-input);
		border: var(--border-thickness) solid var(--border-strong);
		border-radius: var(--radius-sm);
		font-family: inherit;
		min-height: 150px;
		resize: vertical;
		font-weight: 500;
	}

	textarea:focus {
		outline: none;
		border-color: var(--border-focus);
		transform: scale(1.02);
		box-shadow: var(--shadow-focus);
	}

	.count {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--text-muted);
		font-weight: 600;
	}

	.hint {
		margin: var(--spacing-xs) 0 0 0;
		font-size: var(--font-size-sm);
		color: var(--text-muted);
		font-style: italic;
	}

	.btn-primary {
		background-color: var(--accent-primary);
		color: var(--bg-primary);
		padding: var(--spacing-sm) var(--spacing-lg);
		border: 2px solid var(--accent-primary);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-base);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		cursor: pointer;
		transition: all var(--transition-base);
	}

	.btn-primary:hover {
		background-color: var(--accent-primary-hover);
		box-shadow: var(--glow-primary);
	}

	.btn-large {
		font-size: var(--font-size-xl);
		padding: var(--spacing-md) var(--spacing-xl);
		background-color: var(--accent-success);
		border-color: var(--accent-success);
		color: var(--bg-primary);
	}

	.btn-large:hover {
		background-color: var(--accent-success-dark);
		box-shadow: var(--glow-success);
	}

	.ready {
		text-align: center;
		padding: var(--spacing-xl);
		background-color: rgba(0, 255, 65, 0.1);
		border: 2px solid var(--accent-success);
		border-radius: var(--radius-md);
	}

	.ready p {
		margin: 0 0 var(--spacing-md) 0;
		font-size: var(--font-size-lg);
		color: var(--accent-success);
		font-weight: 600;
	}
</style>
