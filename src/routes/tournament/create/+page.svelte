<script lang="ts">
	let { form } = $props<{ form?: { error?: string } }>();

	let tournamentName = $state('');
	let formatType = $state<'random-seed' | 'preseed'>('random-seed');
	let playerNames = $state('');
	let physicalCourts = $state(4);
	let scoringMode = $state<'single-21' | 'best-of-3' | 'custom'>('single-21');
	let customFormat = $state<'1' | '2'>('1');
	let customPointsToWin = $state(21);
	let customWinBy = $state(2);
	let customDecidingPoints = $state(15);
	let numRounds = $state(3);
	let textareaEl: HTMLTextAreaElement | undefined = $state();

	const minPlayers = 8;
	const maxPlayers = 64;

	const computedPlayerCount = $derived(playerNames.split('\n').filter((n) => n.trim()).length);
	const leftoverCount = $derived(computedPlayerCount % 4);

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

	function removeLastPlayers() {
		const lines = playerNames.split('\n');
		const n = leftoverCount;
		if (n === 0) return;
		playerNames = lines.slice(0, lines.length - n).join('\n');
	}

	function removeLowestPoints() {
		const lines = playerNames.split('\n');
		const n = leftoverCount;
		if (n === 0) return;
		const parsed = lines.map((line) => {
			const match = line.trim().match(/^(.+?)\s+(\d+)$/);
			if (match) return { line: line.trim(), name: match[1], points: parseInt(match[2]) };
			return { line: line.trim(), name: line.trim(), points: 0 };
		});
		parsed.sort((a, b) => a.points - b.points);
		const toRemove = new Set(parsed.slice(0, n).map((p) => p.line));
		playerNames = lines.filter((line) => !toRemove.has(line.trim())).join('\n');
	}

	const leftoverLabel = $derived(
		leftoverCount === 1
			? '1 leftover => one 5p court'
			: leftoverCount === 2
				? '2 leftovers => one 6p court'
				: leftoverCount === 3
					? '3 leftovers => one 3p court'
					: ''
	);

	const leftoverDescription = $derived(() => {
		if (leftoverCount === 0) return null;
		if (leftoverCount === 1) {
			return {
				title: '5-Player Court',
				short: '1 leftover → 5p court',
				format: '2 parallel games per run, 2 runs = 4 games/round',
				scoring: '1 set to 15 points (default), win by 2',
				ranking: 'Average points per round (normalized)',
				rules: 'Players rotate every point. One player plays 4 games, others play 3.'
			};
		}
		if (leftoverCount === 2) {
			return {
				title: '6-Player Court',
				short: '2 leftovers → 6p court',
				format: '2 parallel games per run, 2 runs = 4 games/round',
				scoring: '1 set to 15 points (default), win by 2',
				ranking: 'Average points per round (normalized)',
				rules: 'Pairs rotate every point. Some play 3 games, others play 2.'
			};
		}
		if (leftoverCount === 3) {
			return {
				title: '3-Player Court',
				short: '3 leftovers → 3p court',
				format: '2v1 format, 3 matches per round',
				scoring: 'Same as standard (21 points or per tournament settings)',
				ranking: 'Total points (same as standard courts)',
				rules: 'Each player takes a solo turn against the pair.'
			};
		}
		return null;
	});

	$effect(() => {
		if (formatType === 'preseed' && computedPlayerCount >= minPlayers) {
			numRounds = preseedRoundCounts();
		}
	});

	const preseedRoundCounts = $derived(() => {
		const courts = Math.ceil(computedPlayerCount / 4);
		if (formatType === 'preseed') {
			return Math.max(1, Math.floor(Math.log2(courts <= 1 ? 1 : courts - 1)) + 2);
		} else {
			throw Error('Only used for preseed tournaments');
		}
	});

	const effectiveRounds = $derived(
		formatType === 'preseed' ? preseedRoundCounts() : Math.max(1, numRounds)
	);

	const basePtTarget = $derived(scoringMode === 'custom' ? customPointsToWin : 21);
	const setsToWin = $derived(
		scoringMode === 'custom' ? parseInt(customFormat) : scoringMode !== 'single-21' ? 2 : 1
	);

	const durationEstimate = $derived(() => {
		if (computedPlayerCount < minPlayers) return null;

		const leftover = computedPlayerCount % 4;
		const bottomSize = leftover === 1 ? 5 : leftover === 2 ? 6 : leftover === 3 ? 3 : null;
		const standardCourts = bottomSize
			? Math.floor((computedPlayerCount - bottomSize) / 4)
			: computedPlayerCount / 4;

		const courtSizes: number[] = Array(standardCourts).fill(4);
		if (bottomSize) courtSizes.push(bottomSize);

		const shiftsPerRound = Math.ceil(courtSizes.length / physicalCourts);
		const matchFactor = setsToWin >= 2 ? 1.4 : 1;

		let maxCourtDur = 0;
		for (const size of courtSizes) {
			const ptTarget = size >= 5 ? 15 : basePtTarget;
			const gm = 18 * (ptTarget / 21);
			const perGame = size === 3 ? gm * 0.8 : gm;
			const matches = size >= 5 ? 4 : 3;
			const dur = Math.round((matches * perGame + (matches - 1) * 3) * matchFactor);
			if (dur > maxCourtDur) maxCourtDur = dur;
		}

		const roundDur = shiftsPerRound * maxCourtDur;
		const transitions = (effectiveRounds - 1) * 10;
		const total = 15 + effectiveRounds * roundDur + transitions;

		return { total, roundDur, maxCourtDur, courts: courtSizes.length, shiftsPerRound };
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
				bind:value={tournamentName}
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
			<span class="label">Scoring Mode</span>
			<div class="radio-group">
				<label class="radio-label">
					<div class="radio-wrapper">
						<input type="radio" name="scoringMode" value="single-21" bind:group={scoringMode} />
					</div>
					<span class="radio-content">
						<strong>One Set to 21</strong>
						<small>Single set, first to 21, win by 2</small>
					</span>
				</label>
				<label class="radio-label">
					<div class="radio-wrapper">
						<input type="radio" name="scoringMode" value="best-of-3" bind:group={scoringMode} />
					</div>
					<span class="radio-content">
						<strong>Best of 3</strong>
						<small>First to 2 sets (21pt), deciding set to 15, win by 2</small>
					</span>
				</label>
				<label class="radio-label">
					<div class="radio-wrapper">
						<input type="radio" name="scoringMode" value="custom" bind:group={scoringMode} />
					</div>
					<span class="radio-content">
						<strong>Custom</strong>
						<small>Set your own point targets and set count</small>
					</span>
				</label>
			</div>
		</div>

		<div class="advanced-section" class:hidden={scoringMode !== 'custom'}>
			<div class="field">
				<label for="setsToWin">Match Format</label>
				<select
					id="setsToWin"
					name="setsToWin"
					bind:value={customFormat}
					disabled={scoringMode !== 'custom'}
				>
					<option value="1">Single set</option>
					<option value="2">Best of 3</option>
				</select>
			</div>
			<div class="field">
				<label for="winBy">Win By</label>
				<select
					id="winBy"
					name="winBy"
					bind:value={customWinBy}
					disabled={scoringMode !== 'custom'}
				>
					<option value={2}>2 points</option>
					<option value={1}>1 point</option>
				</select>
			</div>
			{#if customFormat === '1'}
				<div class="field">
					<label for="pointsToWin">Set Points</label>
					<input
						type="number"
						id="pointsToWin"
						name="pointsToWin"
						min="9"
						max="21"
						bind:value={customPointsToWin}
						disabled={scoringMode !== 'custom'}
					/>
				</div>
			{:else}
				<div class="field">
					<label for="pointsToWin">Regular Set Points</label>
					<input
						type="number"
						id="pointsToWin"
						name="pointsToWin"
						min="9"
						max="21"
						bind:value={customPointsToWin}
						disabled={scoringMode !== 'custom'}
					/>
				</div>
				<div class="field">
					<label for="decidingSetPoints">Deciding Set Points</label>
					<input
						type="number"
						id="decidingSetPoints"
						name="decidingSetPoints"
						min="9"
						max="21"
						bind:value={customDecidingPoints}
						disabled={scoringMode !== 'custom'}
					/>
				</div>
			{/if}
		</div>

		<div class="field">
			<label for="names">Player Names</label>
			<textarea
				id="names"
				name="names"
				bind:value={playerNames}
				bind:this={textareaEl}
				onpaste={handlePaste}
				rows="10"
				placeholder="Alice 1250&#10;Bob 1100&#10;Carol 950&#10;..."
				required
			></textarea>
			<p class="count">{computedPlayerCount} names entered</p>
			{#if computedPlayerCount > 0 && computedPlayerCount < minPlayers}
				<p class="info warn">Minimum {minPlayers} players required</p>
			{:else if computedPlayerCount > maxPlayers}
				<p class="info warn">
					Maximum {maxPlayers} players allowed (remove {computedPlayerCount - maxPlayers})
				</p>
			{:else if computedPlayerCount > 0}
				{#if leftoverCount > 0}
					<div class="leftover-info">
						<p class="leftover-label">{leftoverLabel}</p>
						{#if leftoverDescription()}
							<div class="leftover-description">
								<p class="leftover-format">{leftoverDescription()!.format}</p>
								<p class="leftover-scoring">{leftoverDescription()!.scoring}</p>
								<p class="leftover-ranking">Ranking: {leftoverDescription()!.ranking}</p>
								<p class="leftover-rules">{leftoverDescription()!.rules}</p>
							</div>
							<div class="leftover-actions">
								<button type="button" class="btn-small" onclick={removeLastPlayers}>
									Kick leftover{leftoverCount > 1 ? 's' : ''} (all 4p courts)
								</button>
								{#if formatType === 'preseed'}
									<button type="button" class="btn-small" onclick={removeLowestPoints}>
										Kick lowest {leftoverCount} by points
									</button>
								{/if}
							</div>
						{/if}
					</div>
				{:else}
					<p class="info standard-court">All 4-player courts — standard format</p>
				{/if}
			{/if}
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
					Virtual courts ({Math.ceil(computedPlayerCount / 4)}) will be scheduled across
					{physicalCourts} physical courts in batch shifts
				</p>
			{/if}
		</div>

		<div class="field">
			<span class="label">Number of Rounds</span>
			{#if formatType === 'preseed'}
				<div class="info-box">{preseedRoundCounts()} rounds (auto-calculated)</div>
				<input type="hidden" name="numRounds" value={preseedRoundCounts()} />
			{:else}
				<div class="rounds-config">
					<input
						type="number"
						id="numRounds"
						name="numRounds"
						bind:value={numRounds}
						min="1"
						max="10"
						class="rounds-input"
					/>
					<span class="rounds-hint">rounds (flexible — adjust as needed)</span>
				</div>
			{/if}
		</div>

		{#if durationEstimate() && computedPlayerCount >= minPlayers}
			<div class="field duration-estimate">
				<span class="label">Estimated Duration</span>
				<div class="duration-box">
					<p class="duration-total">
						~{Math.floor(durationEstimate()!.total / 60)}h {durationEstimate()!.total % 60}min
					</p>
					<div class="duration-breakdown">
						<span>Setup: 15 min</span>
						{#each Array(effectiveRounds) as _, r}
							<span>Round {r + 1}: {durationEstimate()!.roundDur} min</span>
						{/each}
						<span
							>Based on: {durationEstimate()!.courts} courts, {computedPlayerCount} players, {scoringMode ===
							'single-21'
								? 'one set to 21'
								: scoringMode === 'best-of-3'
									? 'best of 3'
									: 'custom'}, {formatType === 'preseed' ? 'preseed' : 'random'} format</span
						>
					</div>
				</div>
			</div>
		{/if}

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
		box-shadow: var(--shadow-focus);
		transform: scale(1.02);
	}

	.count {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--text-muted);
		font-weight: 600;
	}

	.info {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
		font-style: italic;
		margin-top: var(--spacing-xs);
	}

	.leftover-actions {
		display: flex;
		gap: var(--spacing-sm);
		margin-top: var(--spacing-sm);
		flex-wrap: wrap;
	}

	.btn-small {
		background-color: var(--bg-secondary);
		color: var(--text-secondary);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-sm);
		padding: var(--spacing-xs) var(--spacing-sm);
		font-size: var(--font-size-sm);
		font-weight: 600;
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.btn-small:hover {
		border-color: var(--border-focus);
		color: var(--text-primary);
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

	.warn {
		color: var(--accent-error);
	}

	.leftover-info {
		background-color: rgba(255, 187, 0, 0.08);
		border: 2px solid var(--accent-primary);
		border-radius: var(--radius-md);
		padding: var(--spacing-md);
	}

	.leftover-label {
		font-weight: 600;
		color: var(--accent-primary);
		margin: 0 0 var(--spacing-xs) 0;
	}

	.leftover-description {
		margin-bottom: var(--spacing-sm);
	}

	.leftover-format,
	.leftover-scoring,
	.leftover-ranking,
	.leftover-rules {
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		margin: 2px 0;
	}

	.leftover-format {
		color: var(--text-primary);
		font-weight: 500;
	}

	.leftover-scoring {
		font-style: italic;
	}

	.leftover-ranking {
		color: var(--text-muted);
	}

	.leftover-rules {
		color: var(--text-muted);
		font-size: var(--font-size-xs);
	}

	.standard-court {
		padding: var(--spacing-sm);
		background-color: rgba(0, 255, 65, 0.05);
		border-radius: var(--radius-sm);
	}

	.error {
		background-color: rgba(255, 51, 51, 0.1);
		color: var(--accent-error);
		border: 2px solid var(--accent-error);
		padding: var(--spacing-sm);
		border-radius: var(--radius-sm);
		font-weight: 500;
	}

	.advanced-section {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
		padding: var(--spacing-md);
		border: 2px dashed var(--border-strong);
		border-radius: var(--radius-md);
		background-color: var(--bg-secondary);
		overflow: hidden;
	}

	.advanced-section.hidden {
		display: none;
	}

	.advanced-section .field {
		gap: var(--spacing-xs);
	}

	.advanced-section select {
		min-height: 40px;
		width: 100%;
		padding: var(--spacing-xs) var(--spacing-sm);
		font-size: var(--font-size-base);
		background-color: var(--bg-input);
		color: var(--text-input);
		border: 2px solid var(--border-strong);
		border-radius: var(--radius-sm);
		cursor: pointer;
		appearance: auto;
	}

	.advanced-section select:focus-visible {
		outline: 2px solid var(--border-focus);
		outline-offset: -2px;
		border-color: var(--border-strong);
	}

	.advanced-section input[type='number'] {
		width: 80px;
		min-height: 40px;
		padding: var(--spacing-xs) var(--spacing-sm);
		font-size: var(--font-size-base);
		background-color: var(--bg-input);
		color: var(--text-input);
		border: var(--border-thickness) solid var(--border-strong);
		border-radius: var(--radius-sm);
		font-weight: 500;
		text-align: center;
	}

	.advanced-section input[type='number']:focus {
		outline: none;
		border-color: var(--border-focus);
		box-shadow: var(--shadow-focus);
	}

	.duration-estimate {
		margin-top: var(--spacing-sm);
	}

	.duration-box {
		padding: var(--spacing-md);
		background-color: rgba(255, 187, 0, 0.08);
		border: 2px solid var(--accent-primary);
		border-radius: var(--radius-md);
	}

	.duration-total {
		font-size: var(--font-size-xl);
		font-weight: 700;
		color: var(--accent-primary);
		margin: 0 0 var(--spacing-sm) 0;
	}

	.duration-breakdown {
		display: flex;
		flex-direction: column;
		gap: 2px;
		font-size: var(--font-size-xs);
		color: var(--text-muted);
	}

	.rounds-config {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
	}

	.rounds-input {
		width: 60px;
		min-height: 40px;
		padding: var(--spacing-xs) var(--spacing-sm);
		font-size: var(--font-size-base);
		background-color: var(--bg-input);
		color: var(--text-input);
		border: 2px solid var(--border-strong);
		border-radius: var(--radius-sm);
		font-weight: 600;
		text-align: center;
	}

	.rounds-input:focus {
		outline: none;
		border-color: var(--border-focus);
		box-shadow: var(--shadow-focus);
	}

	.rounds-hint {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}
</style>
