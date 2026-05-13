<script lang="ts">
	import QRCode from 'qrcode';

	let { data } = $props<{
		data: {
			tournament: any;
			courts: any[];
			canCloseRound: boolean;
			isFinalRound: boolean;
			courtSizes: number[];
			currentRound: number;
			physicalCourtCount: number;
			schedulingMode: string;
		};
	}>();

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
		const url = `${window.location.origin}/court/${token}`;
		return QRCode.toDataURL(url, { width: 200, margin: 2 });
	}

	function confirmDelete(e: Event) {
		if (!confirm('Delete this tournament? This cannot be undone.')) {
			e.preventDefault();
		}
	}

	const gridClass = $derived(data.courts.length > 4 ? 'courts courts-8' : 'courts');
	const totalPlayers = $derived(data.courts.reduce((sum: number, c: any) => sum + c.players.length, 0));
	const expectedPlayers = $derived(data.courtSizes.reduce((sum: number, s: number) => sum + s, 0));
	const isWaiting = $derived(totalPlayers < expectedPlayers && data.currentRound === 0);
	const virtualCourtCount = $derived(data.courtSizes.length);
	const showScheduling = $derived(data.tournament.status === 'active');

	function getShiftNumber(courtNum: number): number | null {
		if (!showScheduling) return null;
		const virtualCourts = virtualCourtCount;
		const physical = data.physicalCourtCount;
		// Bottom courts (higher numbers) are scheduled first
		// Court at index i from the end gets shift based on its position
		const positionFromBottom = virtualCourts - courtNum;
		return Math.floor(positionFromBottom / physical) + 1;
	}
</script>

<main>
	<header>
		<a href="/">← Dashboard</a>
		<h1>{data.tournament.name}</h1>
		{#if data.tournament.status === 'draft'}
			<p class="status-draft">Draft — waiting for players</p>
		{:else if data.tournament.status === 'active'}
			<p>Round {data.currentRound} of {data.tournament.numRounds}</p>
		{:else}
			<p class="status-completed">Completed</p>
		{/if}
		<a href="/tournament/{data.tournament.id}/standings" class="standings-link">📊 View Standings</a>
	</header>

	{#if isWaiting}
		<div class="waiting-info">
			<p>
				⏳ {totalPlayers}/{expectedPlayers} players registered —
				waiting for {expectedPlayers - totalPlayers} more before starting.
			</p>
		</div>
	{/if}

	{#if showScheduling && data.currentRound > 0}
		<div class="scheduling-info">
			<h3>Court Scheduling (Round {data.currentRound})</h3>
			<p>
				Mode: <strong>{data.schedulingMode === 'batch' ? 'Batch Shifts' : 'Rolling Assignment'}</strong>
				· {data.physicalCourtCount} physical court{data.physicalCourtCount !== 1 ? 's' : ''}
				· {virtualCourtCount} virtual court{virtualCourtCount !== 1 ? 's' : ''}
				{data.schedulingMode === 'batch' ? ` · ${Math.ceil(virtualCourtCount / data.physicalCourtCount)} shift${Math.ceil(virtualCourtCount / data.physicalCourtCount) !== 1 ? 's' : ''}` : ''}
			</p>
		</div>
	{/if}

	<section class={gridClass}>
		{#each data.courts as court (court.courtNumber)}
			<div class="court-card">
				<div class="court-header">
					<h2>Court {court.courtNumber}</h2>
					<div class="court-meta">
						<span
							class="court-size-badge"
							style="border-color: {getCourtSizeColor(court.courtSize)}; color: {getCourtSizeColor(court.courtSize)}"
						>
							{getCourtSizeLabel(court.courtSize)}
						</span>
						{#if showScheduling && data.currentRound > 0}
							<span class="shift-badge shift-{getShiftNumber(court.courtNumber)}">
								Shift {getShiftNumber(court.courtNumber)}
							</span>
						{/if}
						<span class="matches">{getMatchStatus(court.matches)}</span>
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
		{#if data.canCloseRound}
			<form method="POST" action="?/closeRound">
				<button type="submit" class="btn-primary">
					{data.isFinalRound ? 'Finalize Tournament' : 'Close Round & Advance'}
				</button>
			</form>
		{:else if data.tournament.status === 'active'}
			<button disabled class="btn-primary btn-disabled">
				⏳ Waiting for all scores...
			</button>
		{/if}

		{#if data.tournament.status === 'draft'}
			<form method="POST" action="?/startTournament" class="start-form">
				<button type="submit" class="btn-success" disabled={!isWaiting && totalPlayers < expectedPlayers}>
					🚀 Start Tournament
				</button>
			</form>
		{/if}

		{#if data.tournament.status !== 'completed'}
			<form method="POST" action="?/deleteTournament" class="delete-form">
				<button type="submit" class="btn-danger" onclick={confirmDelete}>Delete</button>
			</form>
		{/if}
	</section>
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

	.status-draft {
		color: var(--accent-warning);
		font-weight: 600;
	}

	.status-completed {
		color: var(--accent-success);
		font-weight: 600;
	}

	.waiting-info {
		background-color: rgba(255, 193, 7, 0.1);
		border: 1px solid var(--accent-warning);
		border-radius: var(--radius-sm);
		padding: var(--spacing-sm) var(--spacing-md);
		margin-bottom: var(--spacing-lg);
		text-align: center;
		color: var(--accent-warning);
		font-weight: 500;
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

	.shift-badge {
		display: inline-block;
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		font-weight: 600;
		font-size: var(--font-size-xs);
		margin-right: 4px;
		border: 1px solid;
	}

	.shift-badge.shift-1 {
		background-color: rgba(0, 217, 255, 0.15);
		color: var(--accent-info);
		border-color: var(--accent-info);
	}

	.shift-badge:not(.shift-1) {
		background-color: rgba(255, 255, 255, 0.05);
		color: var(--text-muted);
		border-color: var(--border-default);
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

	.btn-success {
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

	.btn-success:hover:not(:disabled) {
		background-color: var(--accent-primary-hover);
		box-shadow: var(--glow-primary);
	}

	.btn-success:disabled {
		background-color: var(--bg-secondary);
		color: var(--text-muted);
		border-color: var(--border-default);
		cursor: not-allowed;
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

	.start-form {
		margin-left: var(--spacing-md);
	}
</style>
