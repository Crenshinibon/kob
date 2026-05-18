<script lang="ts">
	import QRCode from 'qrcode';
	import { browser } from '$app/environment';
	import { getTournamentDataLive } from './tournament-data.remote';
	import { enhance } from '$app/forms';

	let { data } = $props<{
		data: {
			tournament: any;
			courts: any[];
			canCloseRound: boolean;
			isFinalRound: boolean;
			courtSizes: number[];
			currentRound: number;
			physicalCourtCount: number;
			shifts?: number[][];
			roundDuration?: number;
		};
	}>();

	// Live query for auto-refresh when tournament is active
	const liveQuery = $derived(
		browser && data.tournament.status === 'active'
			? getTournamentDataLive(data.tournament.id)
			: null
	);
	const liveData = $derived(liveQuery ? await liveQuery : null);

	// Use live data for courts/matches if available, otherwise fall back to initial data
	const effectiveData = $derived({
		...data,
		...(liveData && !liveData.error && liveData.courts
			? {
					courts: liveData.courts,
					canCloseRound: liveData.canCloseRound,
					isFinalRound: liveData.isFinalRound,
					currentRound: liveData.currentRound
				}
			: {})
	});

	function getMatchStatus(matches: any[]) {
		const completed = matches.filter((m) => m.teamAScore !== null).length;
		const total = matches.length;
		return `${completed}/${total}`;
	}

	function getCourtSizeLabel(size: number): string {
		if (size === 3) return '3p';
		if (size === 4) return '4p';
		if (size === 5) return '5p';
		if (size === 6) return '6p';
		return `${size}p`;
	}

	function getCourtSizeColor(size: number): string {
		if (size === 3) return 'var(--accent-warning)';
		if (size === 4) return 'var(--accent-success)';
		return 'var(--accent-info)';
	}

	async function generateQR(token: string): Promise<string> {
		if (!browser) return '';
		const url = `${window.location.origin}/court/${token}`;
		return QRCode.toDataURL(url, { width: 200, margin: 2 });
	}

	function confirmDelete(e: Event) {
		if (!confirm('Delete this tournament? This cannot be undone.')) {
			e.preventDefault();
		}
	}

	const gridClass = $derived(effectiveData.courts.length > 4 ? 'courts courts-8' : 'courts');
	const virtualCourtCount = $derived(effectiveData.courtSizes.length);
	const showScheduling = $derived(effectiveData.tournament.status === 'active');
</script>

<main>
	<header>
		<a href="/">← Dashboard</a>
		<h1>{effectiveData.tournament.name}</h1>
		{#if effectiveData.tournament.status === 'active'}
			<p>Round {effectiveData.currentRound} of {effectiveData.tournament.numRounds}</p>
		{:else}
			<p class="status-completed">Completed</p>
		{/if}
		<a href="/tournament/{effectiveData.tournament.id}/standings" class="standings-link"
			>📊 View Standings</a
		>
	</header>

	{#if showScheduling && effectiveData.currentRound > 0}
		<div class="scheduling-info">
			<h3>Court Scheduling (Round {effectiveData.currentRound})</h3>
			<p>
				Batch shifts · {effectiveData.physicalCourtCount} physical court{effectiveData.physicalCourtCount !==
				1
					? 's'
					: ''}
				· {virtualCourtCount} virtual court{virtualCourtCount !== 1 ? 's' : ''}
				· {Math.ceil(virtualCourtCount / effectiveData.physicalCourtCount)} shift{Math.ceil(
					virtualCourtCount / effectiveData.physicalCourtCount
				) !== 1
					? 's'
					: ''}
			</p>
			{#if effectiveData.roundDuration}
				<p class="round-dur">Est. round duration: ~{effectiveData.roundDuration} min per shift</p>
			{/if}
			{#if effectiveData.shifts && effectiveData.shifts.length > 1}
				<div class="shift-list">
					{#each effectiveData.shifts as shift, si}
						<span class="shift-badge" class:active={si === 0}
							>Shift {si + 1}: C{shift.join(', C')}</span
						>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<section class={gridClass}>
		{#each effectiveData.courts as court (court.courtNumber)}
			<div class="court-card">
				<div class="court-header">
					<h2>Court {court.courtNumber}</h2>
					<div class="court-meta">
						<span
							class="court-size-badge"
							style="border-color: {getCourtSizeColor(court.courtSize)}; color: {getCourtSizeColor(
								court.courtSize
							)}"
						>
							{getCourtSizeLabel(court.courtSize)}
						</span>
						<span class="matches">{getMatchStatus(court.matches)}</span>
						{#if court.shift && court.totalShifts > 1}
							<span
								class="shift-badge"
								class:active={court.shift === 1}
								class:waiting={court.shift > 1}
							>
								{court.shift === 1 ? '▶ Active' : `Shift ${court.shift}/${court.totalShifts}`}
							</span>
							{#if court.waitLabel}
								<span class="wait-time">Est. wait: {court.waitLabel}</span>
							{/if}
						{/if}
					</div>
				</div>

				{#if court.token}
					<div class="qr-code">
						{#await generateQR(court.token)}
							<div class="qr-loading">Loading QR...</div>
						{:then qrDataUrl}
							<img src={qrDataUrl} alt="QR code for Court {court.courtNumber}" />
							<p class="qr-hint">Scan to enter scores</p>
						{:catch}
							<div class="qr-error">Failed to load QR</div>
						{/await}
					</div>
				{/if}

				<div class="players">
					{#each court.players as p, i (p.id)}
						<span class="player">
							{String.fromCharCode(65 + i)}: {p.name}
						</span>
					{/each}
				</div>

				{#if court.token}
					<div class="qr-link">
						<a href="/court/{court.token}" target="_blank">Open Court Page →</a>
					</div>
				{/if}
			</div>
		{/each}
	</section>

	<section class="actions">
		{#if effectiveData.canCloseRound}
			<form method="POST" action="?/closeRound" use:enhance>
				<button type="submit" class="btn-primary">
					{effectiveData.isFinalRound ? 'Finalize Tournament' : 'Close Round & Advance'}
				</button>
			</form>
		{:else if effectiveData.tournament.status === 'active'}
			<button disabled class="btn-primary btn-disabled"> ⏳ Waiting for all scores... </button>
		{/if}

		{#if effectiveData.tournament.status !== 'completed'}
			<form method="POST" action="?/deleteTournament" class="delete-form">
				<button type="submit" class="btn-danger" onclick={confirmDelete}>Delete</button>
			</form>
		{/if}
	</section>

	{#if effectiveData.tournament.status === 'active' && effectiveData.currentRound > 0}
		<section class="retire-section">
			<details>
				<summary class="btn-retire-header">Retire a Player</summary>
				<form method="POST" action="?/retirePlayer" class="retire-form">
					<div class="field">
						<label for="retirePlayerId">Select player to retire</label>
						<select id="retirePlayerId" name="playerId" required>
							<option value="">— Select player —</option>
							{#each effectiveData.courts as court}
								{#each court.players as p}
									<option value={p.id}>{p.name} (Court {court.courtNumber})</option>
								{/each}
							{/each}
						</select>
					</div>
					<div class="field">
						<label for="retireReason">Reason</label>
						<select id="retireReason" name="reason">
							<option value="">— Optional —</option>
							<option value="injury">Injury</option>
							<option value="schedule">Schedule</option>
							<option value="personal">Personal</option>
							<option value="disqualified">Disqualified</option>
							<option value="other">Other</option>
						</select>
					</div>
					<button type="submit" class="btn-danger"> Retire Player </button>
				</form>
			</details>
		</section>
	{/if}
</main>

<style>
	main {
		max-width: 1000px;
		margin: 0 auto;
		padding: var(--spacing-xl) var(--spacing-md);
	}

	header {
		margin-bottom: var(--spacing-xl);
		text-align: center;
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

	header > p {
		margin: var(--spacing-xs) 0 0 0;
		color: var(--text-secondary);
	}

	.status-completed {
		color: var(--accent-success);
		font-weight: 600;
	}

	.scheduling-info {
		background-color: var(--bg-card);
		border: 1px solid var(--border-default);
		border-radius: var(--radius-sm);
		padding: var(--spacing-sm) var(--spacing-md);
		margin-bottom: var(--spacing-lg);
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
	}

	.scheduling-info h3 {
		margin: 0 0 var(--spacing-xs) 0;
		font-size: var(--font-size-sm);
		color: var(--text-primary);
	}

	.scheduling-info p {
		margin: 0;
	}

	.standings-link {
		display: inline-block;
		margin-top: var(--spacing-md);
		padding: var(--spacing-sm) var(--spacing-md);
		background-color: var(--accent-info);
		color: var(--bg-primary) !important;
		border-radius: var(--radius-sm);
		font-weight: 600;
		font-size: var(--font-size-sm);
		text-decoration: none;
	}

	.standings-link:hover {
		background-color: var(--accent-primary);
	}

	.courts {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--spacing-lg);
		margin-bottom: var(--spacing-xl);
	}

	.courts-8 {
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: var(--spacing-md);
	}

	.courts-8 .court-card {
		padding: var(--spacing-sm);
	}

	.courts-8 .qr-code {
		margin-bottom: var(--spacing-sm);
		padding: var(--spacing-xs);
	}

	.courts-8 .qr-code img {
		max-width: 150px;
	}

	.courts-8 .players {
		margin-bottom: var(--spacing-sm);
	}

	.court-card {
		background-color: var(--bg-card);
		border: 2px solid var(--border-default);
		border-radius: var(--radius-md);
		padding: var(--spacing-md);
		display: flex;
		flex-direction: column;
		transition: border-color var(--transition-base);
	}

	.court-card:hover {
		border-color: var(--accent-info);
	}

	.court-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--spacing-sm);
	}

	.court-header h2 {
		margin: 0;
		font-size: var(--font-size-lg);
		color: var(--text-primary);
	}

	.court-meta {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
	}

	.court-size-badge {
		font-size: var(--font-size-xs);
		font-weight: 700;
		padding: 2px 8px;
		border: 2px solid;
		border-radius: var(--radius-sm);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.matches {
		font-size: var(--font-size-xs);
		color: var(--text-secondary);
		background-color: var(--bg-secondary);
		padding: var(--spacing-xs) var(--spacing-sm);
		border-radius: var(--radius-sm);
		font-weight: 600;
	}

	.qr-code {
		text-align: center;
		margin-bottom: var(--spacing-md);
		padding: var(--spacing-sm);
		background-color: var(--bg-secondary);
		border-radius: var(--radius-md);
		border: 1px solid var(--border-default);
	}

	.qr-code img {
		max-width: 100%;
		height: auto;
		border-radius: var(--radius-md);
	}

	.qr-hint {
		margin: var(--spacing-sm) 0 0 0;
		font-size: var(--font-size-xs);
		color: var(--text-muted);
	}

	.qr-loading,
	.qr-error {
		padding: var(--spacing-xl);
		font-size: var(--font-size-sm);
		color: var(--text-muted);
		background-color: var(--bg-secondary);
		border-radius: var(--radius-md);
		border: 1px solid var(--border-default);
	}

	.qr-error {
		color: var(--accent-error);
		border-color: var(--accent-error);
		background-color: rgba(255, 51, 51, 0.1);
	}

	.players {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-xs);
		margin-bottom: var(--spacing-md);
		flex-grow: 1;
	}

	.player {
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		background-color: var(--bg-secondary);
		padding: 2px 8px;
		border-radius: 4px;
	}

	.qr-link a {
		font-size: var(--font-size-sm);
		color: var(--accent-info);
		text-decoration: none;
		font-weight: 600;
		transition: color var(--transition-fast);
	}

	.qr-link a:hover {
		color: var(--text-primary);
		text-decoration: underline;
	}

	.actions {
		display: flex;
		gap: var(--spacing-md);
		align-items: center;
		flex-wrap: wrap;
	}

	.btn-primary {
		background-color: var(--accent-success);
		color: var(--bg-primary);
		padding: var(--spacing-sm) var(--spacing-lg);
		border: 2px solid var(--accent-success);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-base);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		cursor: pointer;
		transition: all var(--transition-base);
	}

	.btn-primary:hover {
		background-color: var(--accent-success-dark);
		box-shadow: var(--glow-success);
	}

	.btn-disabled {
		background-color: var(--bg-secondary);
		color: var(--text-muted);
		border-color: var(--border-default);
		cursor: not-allowed;
		box-shadow: none;
	}

	.btn-danger {
		background-color: var(--accent-error);
		color: var(--bg-primary);
		padding: var(--spacing-sm) var(--spacing-lg);
		border: 2px solid var(--accent-error);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-base);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		cursor: pointer;
		transition: all var(--transition-base);
	}

	.btn-danger:hover {
		background-color: #cc2929;
		box-shadow: 0 0 20px rgba(255, 51, 51, 0.4);
	}

	.delete-form {
		margin-left: auto;
	}

	.round-dur {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
		margin-top: var(--spacing-xs);
	}

	.shift-list {
		display: flex;
		gap: var(--spacing-xs);
		margin-top: var(--spacing-sm);
		flex-wrap: wrap;
	}

	.shift-badge {
		font-size: var(--font-size-xs);
		font-weight: 600;
		padding: 2px 8px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-strong);
		color: var(--text-muted);
	}

	.shift-badge.active {
		border-color: var(--accent-success);
		color: var(--accent-success);
		background-color: rgba(0, 255, 65, 0.08);
	}

	.shift-badge.waiting {
		border-color: var(--accent-warning);
		color: var(--accent-warning);
	}

	.wait-time {
		font-size: var(--font-size-xs);
		color: var(--text-muted);
		font-style: italic;
	}

	.retire-section {
		margin: var(--spacing-lg) 0;
	}

	.btn-retire-header {
		cursor: pointer;
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--text-muted);
		padding: var(--spacing-sm);
	}

	.btn-retire-header:hover {
		color: var(--text-secondary);
	}

	.retire-form {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
		margin-top: var(--spacing-sm);
		padding: var(--spacing-md);
		background-color: var(--bg-card);
		border: 2px solid var(--border-default);
		border-radius: var(--radius-md);
	}

	.retire-form .field {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.retire-form label {
		font-weight: 600;
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
	}

	.retire-form select {
		min-height: 40px;
		padding: var(--spacing-xs) var(--spacing-sm);
		font-size: var(--font-size-base);
		background-color: var(--bg-input);
		color: var(--text-input);
		border: var(--border-thickness) solid var(--border-strong);
		border-radius: var(--radius-sm);
	}

	.retire-form select:focus {
		outline: none;
		border-color: var(--border-focus);
	}

	.retire-form .btn-danger {
		align-self: flex-start;
	}
</style>
