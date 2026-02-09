<script lang="ts">
	let { data, form } = $props<{
		data: { tournament: any; players: any[] };
		form?: { error?: string; success?: string };
	}>();

	let playerNames = $state('');
	let playerCount = $derived(playerNames.split('\n').filter((n) => n.trim()).length);
	let textareaEl: HTMLTextAreaElement;

	function handlePaste(e: ClipboardEvent) {
		const pastedText = e.clipboardData?.getData('text') || '';

		// Check if pasted content has commas or semicolons
		if (pastedText.includes(',') || pastedText.includes(';')) {
			e.preventDefault();

			// Split by comma or semicolon and clean up
			const names = pastedText
				.split(/[,;]+/)
				.map((n) => n.trim())
				.filter((n) => n.length > 0);

			// Join with newlines
			const formattedNames = names.join('\n');

			// Insert at cursor position or replace selection
			const start = textareaEl.selectionStart;
			const end = textareaEl.selectionEnd;
			const before = playerNames.substring(0, start);
			const after = playerNames.substring(end);

			playerNames = before + formattedNames + (after ? '\n' + after : '');

			// Update cursor position after the inserted text
			setTimeout(() => {
				textareaEl.selectionStart = textareaEl.selectionEnd = start + formattedNames.length;
			}, 0);
		}
	}
</script>

<main>
	<header>
		<a href="/">← Back</a>
		<h1>{data.tournament.name}</h1>
		<p>Add 16 players to start the tournament</p>
	</header>

	{#if form?.error}
		<div class="error">{form.error}</div>
	{/if}

	{#if form?.success}
		<div class="success">{form.success}</div>
	{/if}

	<section class="current-players">
		<h2>Current Players ({data.players.length}/16)</h2>
		{#if data.players.length > 0}
			<ul>
				{#each data.players as player}
					<li>{player.name}</li>
				{/each}
			</ul>
		{:else}
			<p class="empty">No players added yet.</p>
		{/if}
	</section>

	{#if data.players.length < 16}
		<form method="POST" action="?/addPlayers">
			<div class="field">
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
			</div>

			<button type="submit" class="btn-primary">Add Players</button>
		</form>
	{:else}
		<div class="ready">
			<p>✓ All 16 players added!</p>
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

	.current-players {
		margin-bottom: 2rem;
		padding: 1rem;
		background: #f8f9fa;
		border-radius: 8px;
	}

	.current-players h2 {
		margin: 0 0 1rem 0;
		font-size: 1.1rem;
	}

	.current-players ul {
		margin: 0;
		padding-left: 1.5rem;
	}

	.current-players li {
		margin: 0.25rem 0;
	}

	.empty {
		color: #666;
		font-style: italic;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	label {
		font-weight: 500;
	}

	textarea {
		padding: 0.5rem;
		font-size: 1rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		font-family: inherit;
	}

	.count {
		margin: 0;
		font-size: 0.875rem;
		color: #666;
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

	.btn-large {
		font-size: 1.25rem;
		padding: 1rem 2rem;
	}

	.ready {
		text-align: center;
		padding: 2rem;
		background: #d4edda;
		border-radius: 8px;
	}

	.ready p {
		margin: 0 0 1rem 0;
		font-size: 1.1rem;
		color: #155724;
	}
</style>
