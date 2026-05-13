<script lang="ts">
	let { form } = $props<{ form?: { error?: string } }>();

	let tournamentName = $state('');
	let formatType = $state<'random-seed' | 'preseed'>('random-seed');
	let playerNames = $state('');
	let schedulingMode = $state<'batch' | 'rolling'>('batch');
	let physicalCourts = $state(4);

	const minPlayers = 8;
	const maxPlayers = 64;

	const computedPlayerCount = $derived(
		name.split('\n').filter((n) => n.trim()).length
	);

	const roundCounts = $derived(() => {
		const courts = Math.ceil(computedPlayerCount / 4);
		if (formatType === 'preseed') {
			return Math.max(1, Math.floor(Math.log2(courts <= 1 ? 1 : courts - 1)) + 2);
		}
		if (courts <= 4) return 3;
		if (courts <= 8) return 4;
		if (courts <= 16) return 5;
		return 6;
	});
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
						<small>Seeding based on WVV points, recursive splitting rounds</small>
					</span>
				</label>
			</div>
		</div>

		<div class="field">
			<label for="names">Player Names</label>
			<textarea
				id="names"
				name="names"
				bind:value={name}
				rows="10"
				placeholder="Alice 1250&#10;Bob 1100&#10;Carol 950&#10;..."
				required
			></textarea>
			<p class="count">{computedPlayerCount} players detected</p>
			{#if computedPlayerCount > 0 && computedPlayerCount < minPlayers}
				<p class="info">Minimum {minPlayers} players required</p>
			{:else if computedPlayerCount > maxPlayers}
				<p class="info">Maximum {maxPlayers} players allowed (remove {computedPlayerCount - maxPlayers})</p>
			{:else if computedPlayerCount > 0}
				<p class="info">
					{computedPlayerCount % 4 === 1
						? '1 leftover → one 5p court'
						: computedPlayerCount % 4 === 2
							? '2 leftovers → one 6p court'
							: computedPlayerCount % 4 === 3
								? '3 leftovers → one 3p court'
								: 'No leftovers — all 4p courts'}
				</p>
			{/if}
		</div>

		<input type="hidden" name="playerCount" value={computedPlayerCount} />

		<div class="field">
			<span class="label">Scheduling Mode</span>
			<div class="radio-group">
				<label class="radio-label">
					<div class="radio-wrapper">
						<input type="radio" name="schedulingMode" value="batch" bind:group={schedulingMode} />
					</div>
					<span class="radio-content">
						<strong>Batch Shifts</strong>
						<small>All physical courts play simultaneously in shifts. Next shift starts only after all courts finish</small>
					</span>
				</label>
				<label class="radio-label">
					<div class="radio-wrapper">
						<input type="radio" name="schedulingMode" value="rolling" bind:group={schedulingMode} />
					</div>
					<span class="radio-content">
						<strong>Rolling Assignment</strong>
						<small>When a court finishes, it immediately takes the next waiting group. No shift boundaries</small>
					</span>
				</label>
			</div>
		</div>

		<div class="field">
			<label for="physicalCourts">Physical Courts: {physicalCourts}</label>
			<input
				type="range"
				id="physicalCourts"
				name="physicalCourts"
				bind:value={physicalCourts}
				min={1}
				max={16}
				step={1}
			/>
			<div class="range-labels">
				<span>1</span>
				<span>{physicalCourts} courts</span>
				<span>16</span>
			</div>
			{#if physicalCourts < Math.ceil(computedPlayerCount / 4)}
				<p class="info">
					Virtual courts ({Math.ceil(computedPlayerCount / 4)}) will be scheduled across {physicalCourts} physical
					courts in {schedulingMode === 'batch' ? 'batch shifts' : 'rolling rotation'}
				</p>
			{/if}
		</div>

		<div class="field">
			<span class="label">Number of Rounds</span>
			<div class="info-box">{roundCounts()} rounds (auto-calculated)</div>
			<input type="hidden" name="numRounds" value={roundCounts()} />
		</div>

		<button
			type="submit"
			class="btn-primary"
			disabled={computedPlayerCount < minPlayers || computedPlayerCount > maxPlayers}
		>
			Create Tournament
		</button>
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

	input[type='text'] {
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

	input[type='text']:focus {
		outline: none;
		border-color: var(--border-focus);
		box-shadow: var(--shadow-focus);
		transform: scale(1.02);
	}

	input[type='range'] {
		width: 100%;
		accent-color: var(--accent-primary);
		margin: var(--spacing-sm) 0;
	}

	.range-labels {
		display: flex;
		justify-content: space-between;
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}

	.info {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
		font-style: italic;
		margin-top: var(--spacing-xs);
	}

	.info-box {
		padding: var(--spacing-sm) var(--spacing-md);
		background-color: var(--bg-input);
		color: var(--text-muted);
		border: var(--border-thickness) solid var(--border-default);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-base);
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
		text-decoration: none;
	}

	.btn-primary:hover:not(:disabled) {
		background-color: var(--accent-primary-hover);
		box-shadow: var(--glow-primary);
	}

	.btn-primary:disabled {
		background-color: var(--bg-secondary);
		color: var(--text-muted);
		border-color: var(--border-default);
		cursor: not-allowed;
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
