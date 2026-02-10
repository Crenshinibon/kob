<script lang="ts">
	import QRCode from 'qrcode';

	let { data } = $props<{
		data: {
			tournament: any;
			courts: any[];
			canCloseRound: boolean;
		};
	}>();

	function getMatchStatus(matches: any[]) {
		const completed = matches.filter((m) => m.teamAScore !== null).length;
		return `${completed}/3`;
	}

	async function generateQR(token: string): Promise<string> {
		const url = `${window.location.origin}/court/${token}`;
		return QRCode.toDataURL(url, { width: 200, margin: 2 });
	}
</script>

<main>
	<header>
		<a href="/">← Dashboard</a>
		<h1>{data.tournament.name}</h1>
		<p>Round {data.tournament.currentRound} of {data.tournament.numRounds}</p>
		<a href="/tournament/{data.tournament.id}/standings" class="standings-link">📊 View Standings</a
		>
	</header>

	<section class="courts">
		{#each data.courts as court (court.courtNumber)}
			<div class="court-card">
				<div class="court-header">
					<h2>Court {court.courtNumber}</h2>
					<span class="matches">{getMatchStatus(court.matches)} matches</span>
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
						<span class="player">{String.fromCharCode(65 + i)}: {p.name}</span>
					{/each}
				</div>

				<div class="qr-link">
					<a href="/court/{court.token}" target="_blank">Open Court Page →</a>
				</div>
			</div>
		{/each}
	</section>

	<section class="actions">
		{#if data.canCloseRound}
			<form method="POST" action="?/closeRound">
				<button type="submit" class="btn-primary">Close Round & Advance</button>
			</form>
		{:else}
			<button disabled class="btn-primary btn-disabled">Waiting for all scores...</button>
		{/if}
	</section>
</main>

<style>
	main {
		max-width: 900px;
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

	.standings-link {
		display: inline-block;
		margin-top: var(--spacing-md);
		padding: var(--spacing-sm) var(--spacing-md);
		background-color: var(--accent-info);
		color: var(--bg-primary) !important;
		border-radius: var(--radius-sm);
		font-weight: 600;
		font-size: var(--font-size-sm);
	}

	.standings-link:hover {
		background-color: var(--accent-primary);
		color: var(--bg-primary) !important;
	}

	.courts {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: var(--spacing-lg);
		margin-bottom: var(--spacing-xl);
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
		flex-direction: column;
		gap: var(--spacing-xs);
		margin-bottom: var(--spacing-md);
		flex-grow: 1;
	}

	.player {
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
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
</style>
