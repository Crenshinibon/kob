<script lang="ts">
	import { slide } from 'svelte/transition';
	import QRCode from 'qrcode';

	import { saveScore } from './scores.remote';
	import { scoreSchema } from './scoreSchema';

	let { data } = $props<{
		data: {
			court: any;
			matches: any[];
			standings: any[];
			isActive: boolean;
			isAuthenticated: boolean;
		};
	}>();

	// Track which matches are being saved
	let savingMatches = $state<Set<number>>(new Set());
	// Track which matches are being edited (for authenticated users)
	let editingMatches = $state<Set<number>>(new Set());
	// Track completed matches locally for smooth transitions
	let completedMatches = $derived<Set<number>>(
		new Set(data.matches.filter((m: any) => m.teamAScore !== null).map((m: any) => m.id))
	);
	// Local match data for optimistic updates
	let matchData = $state<Record<number, any>>({});

	// Generate labels for player slots based on court size
	// 3p: A vs B, A vs B, B vs A (solo rotation)
	// 4p: AB vs CD, AC vs BD, AD vs BC
	// 5p/6p: parallel style
	const teamLabels = $derived(
		data.matches.map((m: any) => {
			const nameA1 = getPlayerName(m, 'a1');
			const nameA2 = getPlayerName(m, 'a2');
			const nameB1 = getPlayerName(m, 'b1');
			const nameB2 = getPlayerName(m, 'b2');
			return { teamA: `${nameA1} & ${nameA2}`, teamB: `${nameB1} & ${nameB2}` };
		})
	);

	function getPlayerName(match: any, position: string) {
		const names = data.court.playerNames;
		switch (position) {
			case 'a1':
				return names[match.teamAPlayer1Id] || '—';
			case 'a2':
				return names[match.teamAPlayer2Id] || '—';
			case 'b1':
				return names[match.teamBPlayer1Id] || '—';
			case 'b2':
				return names[match.teamBPlayer2Id] || '—';
		}
	}

	async function generateQR(): Promise<string> {
		const url = window.location.href;
		return QRCode.toDataURL(url, { width: 200, margin: 2 });
	}
</script>

<main>
	<header>
		<h1>{data.court.tournamentName}</h1>
		<p>
			Court {data.court.courtNumber}, Round {data.court.roundNumber}
			{#if data.court.courtSize}
				<span class="court-size-tag" style="--court-color: var(--accent-info)">
					{data.court.courtSize}p
				</span>
			{/if}
		</p>
	</header>

	<section class="qr-section">
		<h2>Share Court Access</h2>
		{#await generateQR()}
			<div class="qr-loading">Loading QR...</div>
		{:then qrDataUrl}
			<div class="qr-code">
				<img src={qrDataUrl} alt="QR code for this court" />
				<p class="qr-hint">Share this QR code with your court partners</p>
			</div>
		{:catch}
			<div class="qr-error">Failed to load QR</div>
		{/await}
	</section>

	{#if !data.isActive}
		<div class="closed" transition:slide>
			<h2>This court is closed</h2>
			<p>Scores have been finalized. Stand by for next round assignments.</p>
		</div>
	{:else}
		<section class="players-section">
			<h3>Players on This Court ({data.court.courtSize}p)</h3>
			{#if data.court.courtSize === 3}
				<p class="courtsize-note">
					Solo rotation format — one player plays solo against the other two
				</p>
			{:else if data.court.courtSize === 5}
				<p class="courtsize-note">5-player court — one team of 3, one team of 2</p>
			{:else if data.court.courtSize === 6}
				<p class="courtsize-note">6-player court — two teams of 3</p>
			{/if}
			<div
				class="player-cards"
				class:three-player={data.court.courtSize === 3}
				class:five-player={data.court.courtSize === 5}
				class:six-player={data.court.courtSize === 6}
			>
				{#each Object.entries(data.court.playerNames) as [id, name], i}
					<div class="player-card">
						<span class="player-letter">{String.fromCharCode(65 + i)}</span>
						<span class="player-name">{name}</span>
					</div>
				{/each}
			</div>
		</section>

		<section class="matches">
			{#each data.matches as match, i (match.id)}
				{@const scoreForm = saveScore.for(match.id)}
				{@const issues = scoreForm.fields.allIssues() ?? []}
				{@const isSaving = savingMatches.has(match.id)}
				<div class="match" transition:slide>
					{#if issues.length > 0 && !isSaving}
						<div class="error" transition:slide>
							{#each issues as issue}
								<p>{issue.message}</p>
							{/each}
						</div>
					{/if}

					<h3>
						Match {i + 1}
						{#if teamLabels[i]}
							<span class="team-label">
								{@html `${teamLabels[i].teamA}`} vs {@html `${teamLabels[i].teamB}`}
							</span>
						{/if}
					</h3>

					{#if completedMatches.has(match.id) && !editingMatches.has(match.id)}
						<div class="completed" transition:slide>
							<p>
								{getPlayerName(match, 'a1')} & {getPlayerName(match, 'a2')}:
								<strong>{matchData[match.id]?.teamAScore || match.teamAScore}</strong>
							</p>
							<p>
								{getPlayerName(match, 'b1')} & {getPlayerName(match, 'b2')}:
								<strong>{matchData[match.id]?.teamBScore || match.teamBScore}</strong>
							</p>
							<span class="saved">✓ Saved</span>
							{#if data.isAuthenticated}
								<button
									class="btn-edit"
									onclick={() => (editingMatches = new Set([...editingMatches, match.id]))}
								>
									Edit
								</button>
							{/if}
						</div>
					{:else}
						{@const isEditing = editingMatches.has(match.id)}
						<form
							data-testid="match-form-{match.id}"
							{...scoreForm.preflight(scoreSchema).enhance(async ({ submit }) => {
								savingMatches = new Set([...savingMatches, match.id]);
								try {
									await submit();
									if (isEditing) {
										editingMatches = new Set([...editingMatches].filter((id) => id !== match.id));
									}
								} catch (error) {
									console.log(error);
								} finally {
									savingMatches = new Set([...savingMatches].filter((id) => id !== match.id));
								}
							})}
						>
							<input type="hidden" name="matchId" value={match.id} />

							<div class="teams">
								<div class="team">
									<p>{getPlayerName(match, 'a1')} & {getPlayerName(match, 'a2')}</p>
									<input
										data-testid="team-a-score-{match.id}"
										type="number"
										name="teamAScore"
										min="0"
										max="50"
										required
										disabled={savingMatches.has(match.id)}
										{...scoreForm.fields.teamAScore}
									/>
								</div>

								<div class="vs">vs</div>

								<div class="team">
									<p>{getPlayerName(match, 'b1')} & {getPlayerName(match, 'b2')}</p>
									<input
										data-testid="team-b-score-{match.id}"
										type="number"
										name="teamBScore"
										min="0"
										max="50"
										required
										disabled={savingMatches.has(match.id)}
										{...scoreForm.fields.teamBScore}
									/>
								</div>
							</div>

							<div class="form-actions">
								{#if isEditing}
									<button
										type="button"
										class="btn-secondary"
										onclick={() =>
											(editingMatches = new Set(
												[...editingMatches].filter((id) => id !== match.id)
											))}
										disabled={savingMatches.has(match.id)}
									>
										Cancel
									</button>
								{/if}
								<button
									data-testid="save-score-{match.id}"
									type="submit"
									class="btn-primary"
									disabled={savingMatches.has(match.id)}
								>
									{#if savingMatches.has(match.id)}
										<span class="spinner"></span>
										{isEditing ? 'Updating...' : 'Saving...'}
									{:else}
										{isEditing ? 'Update Score' : 'Save Score'}
									{/if}
								</button>
							</div>
						</form>
					{/if}
				</div>
			{/each}
		</section>
	{/if}

	{#if data.standings.length > 0}
		<section class="standings" transition:slide>
			<h2>Current Standings</h2>
			{#if data.court.courtSize === 3}
				<p class="standings-note">
					3-player court: solo rotation format — each player takes a turn solo
				</p>
			{/if}
			<table>
				<thead>
					<tr>
						<th>#</th>
						<th>Player</th>
						<th>Points</th>
						<th>Diff</th>
					</tr>
				</thead>
				<tbody>
					{#each data.standings as s (s.id)}
						<tr transition:slide>
							<td>{s.rank}</td>
							<td>{s.name}</td>
							<td>{s.points}</td>
							<td>{s.diff > 0 ? '+' : ''}{s.diff}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</section>
	{/if}
</main>

<style>
	main {
		max-width: 600px;
		margin: 0 auto;
		padding: var(--spacing-md);
		background-color: var(--bg-primary);
	}

	header {
		margin-bottom: var(--spacing-lg);
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
	}

	header h1 {
		margin: 0;
		font-size: var(--font-size-xl);
		color: var(--text-primary);
	}

	header p {
		margin: 0;
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
	}

	.court-size-tag {
		font-size: var(--font-size-xs);
		font-weight: 700;
		padding: 2px 6px;
		border: 2px solid var(--court-color);
		border-radius: var(--radius-sm);
		color: var(--court-color);
		margin-left: var(--spacing-xs);
	}

	.qr-section {
		background-color: var(--bg-card);
		border: 2px solid var(--border-default);
		border-radius: var(--radius-md);
		padding: var(--spacing-lg);
		margin-bottom: var(--spacing-xl);
		text-align: center;
	}

	.qr-section h2 {
		margin: 0 0 var(--spacing-md) 0;
		font-size: var(--font-size-lg);
		color: var(--text-primary);
	}

	.qr-code {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.qr-code img {
		max-width: 200px;
		height: auto;
		border-radius: var(--radius-md);
	}

	.qr-hint {
		margin: var(--spacing-sm) 0 0 0;
		font-size: var(--font-size-sm);
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
		background-color: rgba(255, 51, 51, 0.1);
		border-color: var(--accent-error);
	}

	.closed {
		background-color: rgba(255, 204, 0, 0.1);
		border: 2px solid var(--accent-warning);
		padding: var(--spacing-lg);
		border-radius: var(--radius-md);
		text-align: center;
		margin-bottom: var(--spacing-xl);
	}

	.closed h2 {
		margin: 0 0 var(--spacing-sm) 0;
		color: var(--accent-warning);
	}

	.closed p {
		margin: 0;
		color: var(--text-secondary);
	}

	.players-section {
		margin-bottom: var(--spacing-lg);
	}

	.players-section h3 {
		margin: 0 0 var(--spacing-sm) 0;
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.courtsize-note {
		font-size: var(--font-size-xs);
		color: var(--text-muted);
		font-style: italic;
		margin-bottom: var(--spacing-sm);
	}

	.player-cards {
		display: flex;
		gap: var(--spacing-sm);
		flex-wrap: wrap;
		margin-bottom: var(--spacing-lg);
		justify-content: center;
	}

	.player-cards.three-player .player-card {
		flex: 0 0 auto;
		min-width: 100px;
	}

	.player-cards.five-player .player-card {
		flex: 0 0 auto;
		min-width: 90px;
	}

	.player-cards.six-player .player-card {
		flex: 0 0 auto;
		min-width: 80px;
	}

	.team-row {
		display: flex;
		gap: var(--spacing-sm);
		align-items: center;
		margin-bottom: var(--spacing-xs);
		justify-content: center;
	}

	.team-row.team-a {
		border-bottom: 2px solid var(--accent-primary);
		padding-bottom: var(--spacing-xs);
	}

	.team-row.team-b {
		padding-top: var(--spacing-xs);
	}

	.team-label-inline {
		font-weight: 700;
		font-size: var(--font-size-xs);
		color: var(--accent-primary);
		margin-right: var(--spacing-sm);
	}

	.player-card {
		background-color: var(--bg-card);
		border: 1px solid var(--border-default);
		border-radius: var(--radius-sm);
		padding: var(--spacing-sm);
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 60px;
	}

	.player-letter {
		font-size: var(--font-size-xs);
		font-weight: 700;
		color: var(--text-muted);
		margin-bottom: 2px;
	}

	.player-name {
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--text-primary);
		text-align: center;
	}

	.standings-note {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
		margin-bottom: var(--spacing-sm);
		font-style: italic;
	}

	.error {
		background-color: rgba(255, 51, 51, 0.1);
		color: var(--accent-error);
		border: 2px solid var(--accent-error);
		padding: var(--spacing-sm);
		border-radius: var(--radius-sm);
		margin-bottom: var(--spacing-md);
	}

	.error p {
		margin: var(--spacing-xs) 0;
		font-weight: 500;
	}

	.matches {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-lg);
		margin-bottom: var(--spacing-xl);
	}

	.match {
		border: 2px solid var(--border-default);
		border-radius: var(--radius-md);
		padding: var(--spacing-md);
		background-color: var(--bg-card);
	}

	.match h3 {
		margin: 0 0 var(--spacing-sm) 0;
		font-size: var(--font-size-base);
		color: var(--text-primary);
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.team-label {
		font-size: var(--font-size-xs);
		color: var(--text-muted);
	}

	.completed {
		background-color: rgba(0, 255, 65, 0.1);
		padding: var(--spacing-sm);
		border-radius: var(--radius-sm);
		border-left: 4px solid var(--accent-success);
	}

	.completed p {
		margin: var(--spacing-xs) 0;
		color: var(--text-secondary);
	}

	.saved {
		display: inline-block;
		margin-top: var(--spacing-sm);
		color: var(--accent-success);
		font-size: var(--font-size-sm);
		font-weight: 700;
	}

	.btn-edit {
		background-color: var(--accent-warning);
		color: var(--bg-primary);
		padding: var(--spacing-xs) var(--spacing-sm);
		border: none;
		border-radius: var(--radius-sm);
		font-size: var(--font-size-xs);
		font-weight: 600;
		cursor: pointer;
		margin-left: var(--spacing-sm);
		transition: background-color var(--transition-fast);
	}

	.btn-edit:hover {
		background-color: #e6b800;
	}

	.btn-secondary {
		background-color: var(--text-muted);
		color: var(--bg-primary);
		padding: var(--spacing-sm) var(--spacing-md);
		border: none;
		border-radius: var(--radius-sm);
		font-size: var(--font-size-sm);
		font-weight: 600;
		cursor: pointer;
		transition: background-color var(--transition-fast);
	}

	.btn-secondary:hover:not(:disabled) {
		background-color: var(--text-secondary);
	}

	.btn-secondary:disabled {
		background-color: var(--border-default);
		cursor: not-allowed;
	}

	.form-actions {
		display: flex;
		gap: var(--spacing-sm);
		justify-content: center;
		margin-top: var(--spacing-sm);
	}

	form {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.teams {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
		justify-content: center;
	}

	.team {
		text-align: center;
		flex: 1;
	}

	.team p {
		margin: 0 0 var(--spacing-xs) 0;
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		font-weight: 600;
	}

	.team input {
		width: 80px;
		padding: var(--spacing-sm);
		font-size: var(--font-size-xl);
		font-weight: 700;
		text-align: center;
		background-color: var(--bg-input);
		color: var(--text-input);
		border: var(--border-thickness) solid var(--border-strong);
		border-radius: var(--radius-sm);
		min-height: 60px;
		transition:
			border-color var(--transition-fast),
			box-shadow var(--transition-fast),
			transform var(--transition-fast);
	}

	.team input:focus {
		outline: none;
		border-color: var(--border-focus);
		box-shadow: var(--shadow-focus);
		transform: scale(1.05);
	}

	.team input:disabled {
		background-color: var(--bg-secondary);
		color: var(--text-muted);
		cursor: not-allowed;
	}

	.vs {
		font-weight: 700;
		color: var(--text-muted);
		font-size: var(--font-size-sm);
		text-transform: uppercase;
	}

	.btn-primary {
		background-color: var(--accent-primary);
		color: var(--bg-primary);
		padding: var(--spacing-sm) var(--spacing-md);
		border: 2px solid var(--accent-primary);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-sm);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		cursor: pointer;
		align-self: center;
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		transition: all var(--transition-base);
	}

	.btn-primary:hover:not(:disabled) {
		background-color: var(--accent-primary-hover);
		box-shadow: var(--glow-primary);
	}

	.btn-primary:active:not(:disabled) {
		transform: scale(0.95);
	}

	.btn-primary:disabled {
		background-color: var(--bg-secondary);
		border-color: var(--border-default);
		color: var(--text-muted);
		cursor: not-allowed;
	}

	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid var(--bg-primary);
		border-top-color: transparent;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.standings {
		margin-bottom: var(--spacing-xl);
	}

	.standings h2 {
		font-size: var(--font-size-lg);
		margin-bottom: var(--spacing-sm);
		color: var(--text-primary);
	}

	table {
		width: 100%;
		border-collapse: collapse;
		background-color: var(--bg-card);
		border-radius: var(--radius-md);
		overflow: hidden;
		border: 2px solid var(--border-default);
	}

	th,
	td {
		padding: var(--spacing-sm);
		text-align: left;
		border-bottom: 1px solid var(--border-default);
	}

	th {
		font-weight: 700;
		font-size: var(--font-size-sm);
		background-color: var(--bg-secondary);
		color: var(--text-primary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	td {
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
	}

	tr:last-child td {
		border-bottom: none;
	}
</style>
