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

	.courts {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	.court-card {
		border: 1px solid #ddd;
		border-radius: 8px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
	}

	.court-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.court-header h2 {
		margin: 0;
		font-size: 1.1rem;
	}

	.matches {
		font-size: 0.75rem;
		color: #666;
		background: #f0f0f0;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
	}

	.qr-code {
		text-align: center;
		margin-bottom: 1rem;
		padding: 0.5rem;
		background: #f8f9fa;
		border-radius: 8px;
	}

	.qr-code img {
		max-width: 100%;
		height: auto;
	}

	.qr-hint {
		margin: 0.5rem 0 0 0;
		font-size: 0.75rem;
		color: #666;
	}

	.qr-loading,
	.qr-error {
		padding: 2rem;
		font-size: 0.875rem;
		color: #666;
	}

	.qr-error {
		color: #dc3545;
	}

	.players {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin-bottom: 1rem;
		flex-grow: 1;
	}

	.player {
		font-size: 0.875rem;
	}

	.qr-link a {
		font-size: 0.875rem;
		color: #0066cc;
		text-decoration: none;
	}

	.qr-link a:hover {
		text-decoration: underline;
	}

	.actions {
		display: flex;
		gap: 1rem;
		align-items: center;
		flex-wrap: wrap;
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

	.btn-disabled {
		background: #ccc;
		cursor: not-allowed;
	}
</style>
