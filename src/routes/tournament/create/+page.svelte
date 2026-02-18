<script lang="ts">
	let { form } = $props<{ form?: { error?: string } }>();

	let name = $state('');
	let formatType = $state<'random-seed' | 'preseed'>('random-seed');
	let playerCount = $state<16 | 32>(16);
	let numRounds = $state(3);

	const fixedRounds = $derived(Number(playerCount) === 16 ? 3 : 4);
</script>

<main>
	<header>
		<a href="/">← Back</a>
		<h1>Create Tournament</h1>
	</header>

	<form method="POST" action="?/create">
		{#if form?.error}
			<div class="error">{form.error}</div>
		{/if}

		<div class="field">
			<label for="name">Tournament Name</label>
			<input
				type="text"
				id="name"
				name="name"
				bind:value={name}
				required
				placeholder="King Of the Beach 2026"
			/>
		</div>

		<div class="field">
			<span class="label">Format</span>
			<div class="radio-group">
				<label class="radio-label">
					<div class="radio-wrapper">
						<input type="radio" name="formatType" value="random-seed" bind:group={formatType} />
					</div>
					<span class="radio-content">
						<strong>Random</strong>
						<small>First round random placement, then ladder system with flexible rounds</small>
					</span>
				</label>
				<label class="radio-label">
					<div class="radio-wrapper">
						<input type="radio" name="formatType" value="preseed" bind:group={formatType} />
					</div>
					<span class="radio-content">
						<strong>Pre-Seed</strong>
						<small>Seeding based on WVV points, fixed rounds like single elimination</small>
					</span>
				</label>
			</div>
		</div>

		<div class="field">
			<span class="label">Players</span>
			<div class="radio-group">
				<label class="radio-label">
					<div class="radio-wrapper">
						<input type="radio" name="playerCount" value="16" bind:group={playerCount} />
					</div>
					<span class="radio-content">
						<strong>16 players</strong>
					</span>
				</label>
				<label class="radio-label">
					<div class="radio-wrapper">
						<input type="radio" name="playerCount" value="32" bind:group={playerCount} />
					</div>
					<span class="radio-content">
						<strong>32 players</strong>
					</span>
				</label>
			</div>
		</div>

		{#if formatType === 'random-seed'}
			<div class="field">
				<label for="numRounds">Number of Rounds</label>
				<select id="numRounds" name="numRounds" bind:value={numRounds}>
					{#each [1, 2, 3, 4, 5] as n}
						<option value={n}>{n}</option>
					{/each}
				</select>
			</div>
		{:else}
			<div class="field">
				<span class="label">Number of Rounds</span>
				<div class="info-box">{fixedRounds} rounds (fixed)</div>
				<input type="hidden" name="numRounds" value={fixedRounds} />
			</div>
		{/if}

		<button type="submit" class="btn-primary">Create Tournament</button>
	</form>
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
	form {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-lg);
		background-color: var(--bg-card);
		padding: var(--spacing-lg);
		border-radius: var(--radius-md);
		border: 2px solid var(--border-default);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	label,
	.label {
		font-weight: 600;
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	input[type='text'],
	select {
		min-height: 48px;
		padding: var(--spacing-sm) var(--spacing-md);
		font-size: var(--font-size-base);
		background-color: var(--bg-input);
		color: var(--text-input);
		border: var(--border-thickness) solid var(--border-strong);
		border-radius: var(--radius-sm);
		font-weight: 500;
		transition:
			border-color var(--transition-fast),
			box-shadow var(--transition-fast);
	}

	input[type='text']:focus,
	select:focus {
		outline: none;
		border-color: var(--border-focus);
		box-shadow: var(--shadow-focus);
		transform: scale(1.02);
	}

	.radio-group {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.radio-label {
		display: flex;
		align-items: stretch;
		gap: var(--spacing-sm);
		padding: var(--spacing-sm) var(--spacing-md);
		background-color: var(--bg-input);
		border: var(--border-thickness) solid var(--border-strong);
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.radio-wrapper {
		display: flex;
		align-self: stretch;
		justify-content: center;
		align-items: center;
	}
	.radio-label:hover {
		border-color: var(--border-focus);
	}

	.radio-label input[type='radio'] {
		height: 18px;
		width: 18px;
		accent-color: var(--accent-primary);
	}

	.radio-label input[type='radio']:checked {
		color: var(--accent-primary);
	}

	.radio-label:has(input:checked) {
		border-color: var(--accent-primary);
		background-color: rgba(255, 187, 0, 0.1);
	}

	.radio-content {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.radio-content strong {
		font-weight: 600;
		color: var(--bg-primary);
	}

	.radio-label:has(input:checked) .radio-content strong {
		color: var(--text-primary);
	}

	.radio-content small {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}

	.info-box {
		padding: var(--spacing-sm) var(--spacing-md);
		background-color: var(--bg-input);
		color: var(--text-muted);
		border: var(--border-thickness) solid var(--border-default);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-base);
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

	.error {
		background-color: rgba(255, 51, 51, 0.1);
		color: var(--accent-error);
		border: 2px solid var(--accent-error);
		padding: var(--spacing-sm);
		border-radius: var(--radius-sm);
		font-weight: 500;
	}
</style>
