<script lang="ts">
	import { goto } from '$app/navigation';
	import { getTournamentDataLive } from './tournament-data.remote';
	import {
		closeRoundForm,
		deleteTournamentForm,
		updateScoringOverrides
	} from './tournament-actions.remote';
	import type { TournamentDisplayData, CourtDisplayData } from './tournament-data.remote';
	import { getEffectiveScoring, getScoringLabel } from '$lib/tournament-logic';
	import CourtQRCode from '../../../components/CourtQRCode.svelte';

	let { data } = $props<{ data: { tournamentId: number; tournament: any } }>();

	const liveQuery = $derived(getTournamentDataLive(data.tournamentId));
	const isConnected = $derived(liveQuery.connected);
	let editingScoring = $state(false);
	let localOverrides = $state<
		Record<
			string,
			{ pointsToWin?: number; winBy?: number; setsToWin?: number; decidingSetPoints?: number }
		>
	>({});

	function getMatchStatus(matches: { teamAScore: number | null }[]): string {
		const completed = matches.filter((m) => m.teamAScore !== null).length;
		return `${completed}/${matches.length}`;
	}

	function getCourtSizeLabel(size: number): string {
		return `${size}p`;
	}

	function getCourtSizeColor(size: number): string {
		if (size === 3) return 'var(--accent-warning)';
		if (size === 4) return 'var(--accent-success)';
		return 'var(--accent-info)';
	}

	function confirmDelete(e: Event) {
		if (!confirm('Delete this tournament? This cannot be undone.')) {
			e.preventDefault();
		}
	}
</script>

{#await liveQuery}
	<div class="loading">Loading tournament...</div>
{:then state}
	{@const tournament = state?.tournament}
	{@const courts = state?.courts ?? []}
	{@const currentRound = state?.currentRound ?? 0}
	{@const canCloseRound = state?.canCloseRound ?? false}
	{@const isFinalRound = state?.isFinalRound ?? false}
	{@const courtSizes = state?.courtSizes ?? []}
	{@const physicalCourtCount = state?.physicalCourtCount ?? 4}
	{@const shifts = state?.shifts ?? []}
	{@const roundDuration = state?.roundDuration ?? 0}
	{@const isActive = tournament?.status === 'active'}
	{@const gridClass = courts.length > 4 ? 'courts courts-8' : 'courts'}
	{@const virtualCourtCount = courtSizes.length}

	{#if !tournament}
		<div class="loading">Loading tournament...</div>
	{:else if state.error}
		<div class="error">{state.error}</div>
	{:else}
		<main>
			<header>
				<a href="/">← Dashboard</a>
				<h1>{tournament.name}</h1>
				{#if isActive}
					<p>Round {currentRound} of {tournament.numRounds}</p>
				{:else}
					<p class="status-completed">Completed</p>
				{/if}
				<a href="/tournament/{tournament.id}/standings" class="standings-link">📊 View Standings</a>
				{#if isActive && !isConnected}
					<button class="btn-reconnect" onclick={() => liveQuery.reconnect()}>
						🔄 Reconnecting...
					</button>
				{/if}
			</header>

			{#if isActive && currentRound > 0}
				<div class="scheduling-info">
					<h3>Court Scheduling (Round {currentRound})</h3>
					<p>
						Batch shifts · {physicalCourtCount} physical court{physicalCourtCount !== 1 ? 's' : ''}
						· {virtualCourtCount} virtual court{virtualCourtCount !== 1 ? 's' : ''}
						· {Math.ceil(virtualCourtCount / physicalCourtCount)} shift{Math.ceil(
							virtualCourtCount / physicalCourtCount
						) !== 1
							? 's'
							: ''}
					</p>
					{#if roundDuration}
						<p class="round-dur">Est. round duration: ~{roundDuration} min per shift</p>
					{/if}
					{#if shifts.length > 1}
						<div class="shift-list">
							{#each shifts as shift, si}
								<span class="shift-badge" class:active={si === 0}
									>Shift {si + 1}: C{shift.join(', C')}</span
								>
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			<section class={gridClass}>
				{#each courts as court (court.courtNumber)}
					<div class="court-card">
						<div class="court-header">
							<h2>Court {court.courtNumber}</h2>
							<div class="court-meta">
								<span
									class="court-size-badge"
									style="border-color: {getCourtSizeColor(
										court.courtSize
									)}; color: {getCourtSizeColor(court.courtSize)}"
								>
									{getCourtSizeLabel(court.courtSize)}
								</span>
								<span class="matches">{getMatchStatus(court.matches)}</span>
								{#if court.shift && court.totalShifts && court.totalShifts > 1}
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
							<CourtQRCode token={court.token} courtNumber={court.courtNumber} />
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
				{#if canCloseRound}
					<form {...closeRoundForm}>
						<input {...closeRoundForm.fields.tournamentId.as('hidden', tournament.id)} />
						<button type="submit" class="btn-primary">
							{isFinalRound ? 'Finalize Tournament' : 'Close Round & Advance'}
						</button>
					</form>
				{:else if isActive}
					<button disabled class="btn-primary btn-disabled"> ⏳ Waiting for all scores... </button>
				{/if}

				{#if tournament.status !== 'completed'}
					<form
						{...deleteTournamentForm.enhance(async ({ form }) => {
							try {
								await form.submit();
							} catch {
								// redirect happens on server
							}
						})}
						class="delete-form"
					>
						<input {...deleteTournamentForm.fields.tournamentId.as('hidden', tournament.id)} />
						<button type="submit" class="btn-danger" onclick={confirmDelete}>Delete</button>
					</form>
				{/if}
			</section>

			{#if isActive && courtSizes.length > 0}
				<section class="scoring-section">
					<details>
						<summary class="scoring-header">Court Scoring Configuration</summary>
						<p class="scoring-note">
							Override scoring per court type. Changes apply from the next round.
						</p>
						{#if editingScoring}
							<div class="scoring-grid">
								{#each courtSizes
									.filter((s, i, a) => a.indexOf(s) === i)
									.sort((a, b) => a - b) as size}
									{@const effective = getEffectiveScoring(
										size,
										{
											pointsToWin: tournament.pointsToWin ?? 21,
											setsToWin: tournament.setsToWin ?? 1,
											decidingSetPoints: tournament.decidingSetPoints ?? 15
										},
										tournament.scoringOverrides
									)}
									{@const ovr =
										localOverrides[String(size)] ??
										tournament.scoringOverrides?.[String(size)] ??
										{}}
									<fieldset class="scoring-fieldset">
										<legend>{size}p Courts</legend>
										<label>
											Points to win
											<input
												type="number"
												min="1"
												max="50"
												value={ovr.pointsToWin ?? effective.pointsToWin}
												oninput={(e) => {
													const v = parseInt(e.currentTarget.value);
													if (!isNaN(v))
														localOverrides = {
															...localOverrides,
															[size]: { ...(localOverrides[String(size)] ?? {}), pointsToWin: v }
														};
												}}
											/>
										</label>
										<label>
											Win by
											<input
												type="number"
												min="1"
												max="10"
												value={ovr.winBy ?? tournament.winBy ?? 2}
												oninput={(e) => {
													const v = parseInt(e.currentTarget.value);
													if (!isNaN(v))
														localOverrides = {
															...localOverrides,
															[size]: { ...(localOverrides[String(size)] ?? {}), winBy: v }
														};
												}}
											/>
										</label>
										<label>
											Sets to win
											<input
												type="number"
												min="1"
												max="5"
												value={ovr.setsToWin ?? effective.setsToWin}
												oninput={(e) => {
													const v = parseInt(e.currentTarget.value);
													if (!isNaN(v))
														localOverrides = {
															...localOverrides,
															[size]: { ...(localOverrides[String(size)] ?? {}), setsToWin: v }
														};
												}}
											/>
										</label>
										{#if (ovr.setsToWin ?? effective.setsToWin) >= 2}
											<label>
												Deciding set points
												<input
													type="number"
													min="1"
													max="50"
													value={ovr.decidingSetPoints ?? effective.decidingSetPoints}
													oninput={(e) => {
														const v = parseInt(e.currentTarget.value);
														if (!isNaN(v))
															localOverrides = {
																...localOverrides,
																[size]: {
																	...(localOverrides[String(size)] ?? {}),
																	decidingSetPoints: v
																}
															};
													}}
												/>
											</label>
										{/if}
										<p class="scoring-preview">
											{getScoringLabel(
												{
													pointsToWin: tournament.pointsToWin ?? 21,
													setsToWin: tournament.setsToWin ?? 1,
													decidingSetPoints: tournament.decidingSetPoints ?? 15
												},
												size,
												{
													...(tournament.scoringOverrides ?? {}),
													[String(size)]:
														localOverrides[String(size)] ??
														tournament.scoringOverrides?.[String(size)] ??
														{}
												}
											)}
										</p>
									</fieldset>
								{/each}
							</div>
							<div class="scoring-actions">
								<button
									class="btn-primary"
									onclick={async () => {
										const merged: Record<string, any> = { ...(tournament.scoringOverrides ?? {}) };
										for (const [k, v] of Object.entries(localOverrides)) {
											merged[k] = { ...(merged[k] ?? {}), ...v };
										}
										await updateScoringOverrides({
											tournamentId: tournament.id,
											overrides: merged
										});
										editingScoring = false;
										localOverrides = {};
									}}>Save Scoring</button
								>
								<button
									class="btn-secondary"
									onclick={() => {
										editingScoring = false;
										localOverrides = {};
									}}>Cancel</button
								>
							</div>
						{:else}
							<div class="scoring-summary">
								{#each courtSizes
									.filter((s, i, a) => a.indexOf(s) === i)
									.sort((a, b) => a - b) as size}
									<span class="scoring-badge"
										>{size}p: {getScoringLabel(
											{
												pointsToWin: tournament.pointsToWin ?? 21,
												setsToWin: tournament.setsToWin ?? 1,
												decidingSetPoints: tournament.decidingSetPoints ?? 15
											},
											size,
											tournament.scoringOverrides
										)}</span
									>
								{/each}
								<button
									class="btn-edit"
									onclick={() => {
										editingScoring = true;
										localOverrides = {};
									}}>Edit</button
								>
							</div>
						{/if}
					</details>
				</section>
			{/if}

			{#if isActive && currentRound > 0}
				<section class="retire-section">
					<details>
						<summary class="btn-retire-header">Retire a Player</summary>
						<form method="POST" action="?/retirePlayer" class="retire-form">
							<div class="field">
								<label for="retirePlayerId">Select player to retire</label>
								<select id="retirePlayerId" name="playerId" required>
									<option value="">— Select player —</option>
									{#each courts as court}
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
	{/if}
{:catch error}
	<div class="error">Failed to load tournament: {error?.message ?? 'Unknown error'}</div>
{/await}

<style>
	.loading,
	.error {
		text-align: center;
		padding: var(--spacing-xl);
		font-size: var(--font-size-lg);
		max-width: 800px;
		margin: 0 auto;
	}

	.error {
		color: var(--accent-error);
	}

	main {
		max-width: 800px;
		margin: 0 auto;
	}

	.courts {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--spacing-md);
	}

	.courts-8 {
		grid-template-columns: repeat(4, 1fr);
	}

	.courts-8 .court-card {
		padding: var(--spacing-sm);
	}

	.courts-8 .players {
		font-size: var(--font-size-xs);
	}

	.court-card {
		background-color: var(--bg-card);
		border: 2px solid var(--border-default);
		border-radius: var(--radius-md);
		padding: var(--spacing-md);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
		transition: border-color var(--transition-fast);
	}

	.court-card:hover {
		border-color: var(--border-strong);
	}

	.court-header {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.court-header h2 {
		margin: 0;
		font-size: var(--font-size-lg);
		color: var(--text-primary);
	}

	.court-meta {
		display: flex;
		gap: var(--spacing-sm);
		align-items: center;
		flex-wrap: wrap;
	}

	.court-size-badge {
		font-size: var(--font-size-xs);
		font-weight: 700;
		padding: 2px 6px;
		border: 2px solid;
		border-radius: var(--radius-sm);
	}

	.matches {
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
	}

	.shift-badge {
		font-size: var(--font-size-xs);
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		background-color: var(--bg-secondary);
		color: var(--text-muted);
	}

	.shift-badge.active {
		background-color: var(--accent-success);
		color: var(--status-active-text);
	}

	.shift-badge.waiting {
		background-color: var(--bg-secondary);
		color: var(--text-muted);
	}

	.wait-time {
		font-size: var(--font-size-xs);
		color: var(--text-muted);
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
		align-self: flex-start;
		line-height: 1.4;
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
		flex-direction: column;
		gap: var(--spacing-sm);
		margin-top: var(--spacing-lg);
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
		transition: all var(--transition-fast);
	}

	.btn-primary:hover:not(:disabled) {
		background-color: var(--accent-primary-hover);
		border-color: var(--accent-primary-hover);
	}

	.btn-primary:disabled,
	.btn-disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-danger {
		background-color: transparent;
		color: var(--accent-error);
		padding: var(--spacing-sm) var(--spacing-lg);
		border: 2px solid var(--accent-error);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-base);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		cursor: pointer;
		transition: all var(--transition-fast);
		align-self: flex-start;
	}

	.btn-danger:hover {
		background-color: var(--accent-error);
		color: var(--bg-primary);
	}

	.delete-form {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
	}

	.scheduling-info {
		background-color: var(--bg-card);
		border: 2px solid var(--border-default);
		border-radius: var(--radius-md);
		padding: var(--spacing-md);
		margin-bottom: var(--spacing-md);
	}

	.scheduling-info h3 {
		margin: 0 0 var(--spacing-sm) 0;
		font-size: var(--font-size-base);
		color: var(--text-primary);
	}

	.scheduling-info p {
		margin: 0 0 var(--spacing-xs) 0;
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
	}

	.round-dur {
		color: var(--accent-info) !important;
		font-weight: 600;
	}

	.shift-list {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-xs);
		margin-top: var(--spacing-sm);
	}

	.standings-link {
		font-size: var(--font-size-sm);
		color: var(--accent-info);
		text-decoration: none;
	}

	.standings-link:hover {
		text-decoration: underline;
	}

	.status-completed {
		color: var(--accent-success);
		font-weight: 600;
	}

	.btn-reconnect {
		background-color: transparent;
		color: var(--accent-info);
		border: 2px solid var(--accent-info);
		padding: var(--spacing-xs) var(--spacing-sm);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-xs);
		cursor: pointer;
		animation: pulse 2s infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.scoring-section {
		margin-top: var(--spacing-lg);
	}

	.scoring-header {
		cursor: pointer;
		font-weight: 600;
		color: var(--text-muted);
		padding: var(--spacing-sm);
	}

	.scoring-header:hover {
		color: var(--text-secondary);
	}

	.scoring-note {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
		margin: var(--spacing-xs) 0;
	}

	.scoring-summary {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-sm);
		align-items: center;
		margin-top: var(--spacing-sm);
	}

	.scoring-badge {
		font-size: var(--font-size-sm);
		padding: 2px 8px;
		border-radius: var(--radius-sm);
		background-color: var(--bg-secondary);
		color: var(--text-secondary);
	}

	.scoring-grid {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-md);
		margin-top: var(--spacing-sm);
	}

	.scoring-fieldset {
		border: 2px solid var(--border-default);
		border-radius: var(--radius-md);
		padding: var(--spacing-sm);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
		min-width: 180px;
	}

	.scoring-fieldset legend {
		font-weight: 700;
		font-size: var(--font-size-sm);
		color: var(--text-primary);
	}

	.scoring-fieldset label {
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.scoring-fieldset input {
		min-height: 36px;
		padding: var(--spacing-xs) var(--spacing-sm);
		font-size: var(--font-size-base);
		background-color: var(--bg-input);
		color: var(--text-input);
		border: var(--border-thickness) solid var(--border-strong);
		border-radius: var(--radius-sm);
	}

	.scoring-fieldset input:focus {
		outline: none;
		border-color: var(--border-focus);
	}

	.scoring-preview {
		font-size: var(--font-size-xs);
		color: var(--text-muted);
		margin: var(--spacing-xs) 0 0 0;
	}

	.scoring-actions {
		display: flex;
		gap: var(--spacing-sm);
		margin-top: var(--spacing-sm);
	}

	.btn-secondary {
		background-color: transparent;
		color: var(--text-secondary);
		padding: var(--spacing-xs) var(--spacing-md);
		border: 2px solid var(--border-default);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-sm);
		cursor: pointer;
	}

	.btn-secondary:hover {
		border-color: var(--border-strong);
		color: var(--text-primary);
	}

	.retire-section {
		margin-top: var(--spacing-lg);
	}

	.btn-retire-header {
		cursor: pointer;
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
