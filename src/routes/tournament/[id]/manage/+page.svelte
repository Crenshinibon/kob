<script lang="ts">
	import { browser } from '$app/environment';
	import * as m from '$lib/paraglide/messages';
	import { localizeHref } from '$lib/paraglide/runtime';
	import { resolve } from '$app/paths';
	import { getManageData } from './manage-data.remote';
	import {
		addPlayer,
		addPlayersBulk,
		applyAssignmentCommand,
		finishTournamentEarlyCommand,
		refillCourts,
		regeneratePlayerToken,
		removePlayer,
		removeUncheckedPlayers,
		renamePlayer,
		reopenLastRoundCommand,
		resetRoundAssignments,
		reshuffleRound1,
		updatePlayerOrder,
		updatePlayerSeed,
		updateRoundCount,
		updateScoringRules,
		updateTournamentSettings
	} from './manage-actions.remote';
	import { deleteTournamentForm } from '../tournament-actions.remote';

	let { data } = $props<{
		data: { tournamentId: number; tournamentName: string };
	}>();

	const query = $derived(getManageData({ tournamentId: data.tournamentId }));
	let tab = $state('players');
	let search = $state('');
	let addName = $state('');
	let addPoints = $state('');
	let bulkNames = $state('');
	let renameId = $state<number | null>(null);
	let renameValue = $state('');
	let errorMsg = $state('');
	let draggingId = $state<number | null>(null);

	$effect(() => {
		if (!browser) return;
		const fromHash = window.location.hash.replace('#', '') || 'players';
		if (['players', 'courts', 'rules', 'tournament'].includes(fromHash)) tab = fromHash;
		const onVis = () => {
			if (!document.hidden) query.refresh().catch(() => {});
		};
		document.addEventListener('visibilitychange', onVis);
		return () => document.removeEventListener('visibilitychange', onVis);
	});

	function setTab(next: string) {
		tab = next;
		if (browser) history.replaceState(null, '', `#${next}`);
	}

	const page = $derived(query.current);
	const players = $derived(
		(page?.players ?? []).filter(
			(p) => !search || p.name.toLowerCase().includes(search.toLowerCase())
		)
	);
	const nameById = $derived(new Map((page?.players ?? []).map((p) => [p.id, p.name])));

	async function run(fn: () => Promise<unknown>) {
		errorMsg = '';
		try {
			await fn();
			await query.refresh();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : String(err);
		}
	}

	async function movePlayer(playerId: number, toCourt: number) {
		if (!page) return;
		const next = page.courts.map((c) => ({
			courtNumber: c.courtNumber,
			playerIds: c.playerIds.filter((id) => id !== playerId)
		}));
		const target = next.find((c) => c.courtNumber === toCourt);
		if (target) target.playerIds = [...target.playerIds, playerId];
		await run(() => applyAssignmentCommand({ tournamentId: data.tournamentId, courts: next }));
	}

	async function dropOnCourt(courtNumber: number) {
		if (draggingId == null) return;
		const id = draggingId;
		draggingId = null;
		await movePlayer(id, courtNumber);
	}
</script>

<main data-testid="manage-page">
	<header>
		<a href={localizeHref(resolve('/tournament/[id]', { id: String(data.tournamentId) }))}>
			← {page?.tournament.name ?? data.tournamentName}
		</a>
		<h1>{m.manage_title()}</h1>
		{#if page}
			<p>
				{m.round_label({ current: page.tournament.currentRound, total: page.tournament.numRounds })}
				· {page.tournament.status}
			</p>
			<p class="lock" data-testid="lock-indicator">
				{#if page.tournament.status === 'completed'}
					{m.manage_lock_completed()}
				{:else if page.lock.roundHasScores}
					{m.manage_lock_scored({ round: page.tournament.currentRound })}
				{:else}
					{m.manage_lock_open({ round: page.tournament.currentRound })}
				{/if}
			</p>
		{/if}
		<nav>
			<a href={localizeHref(resolve('/tournament/[id]', { id: String(data.tournamentId) }))}
				>{m.manage_operations_link()}</a
			>
			<a
				href={localizeHref(resolve('/tournament/[id]/check-in', { id: String(data.tournamentId) }))}
				>{m.checkin_title()}</a
			>
		</nav>
	</header>

	<div class="tabs" role="tablist">
		<button
			type="button"
			class:active={tab === 'players'}
			data-testid="tab-players"
			onclick={() => setTab('players')}>{m.manage_tab_players()}</button
		>
		<button
			type="button"
			class:active={tab === 'courts'}
			data-testid="tab-courts"
			onclick={() => setTab('courts')}>{m.manage_tab_courts()}</button
		>
		<button
			type="button"
			class:active={tab === 'rules'}
			data-testid="tab-rules"
			onclick={() => setTab('rules')}>{m.manage_tab_rules()}</button
		>
		<button
			type="button"
			class:active={tab === 'tournament'}
			data-testid="tab-tournament"
			onclick={() => setTab('tournament')}>{m.manage_tab_tournament()}</button
		>
	</div>

	{#if errorMsg}
		<p class="error" role="alert">{errorMsg}</p>
	{/if}

	{#if page && tab === 'players'}
		<section data-testid="players-tab">
			<input type="search" placeholder={m.manage_search_players()} bind:value={search} />
			<form
				class="add"
				onsubmit={(e) => {
					e.preventDefault();
					run(() =>
						addPlayer({
							tournamentId: data.tournamentId,
							name: addName,
							seedPoints: addPoints ? Number(addPoints) : null
						})
					).then(() => {
						addName = '';
						addPoints = '';
					});
				}}
			>
				<input
					name="name"
					bind:value={addName}
					placeholder={m.manage_add_player()}
					data-testid="add-player-name"
					required
				/>
				{#if page.tournament.formatType === 'preseed'}
					<input name="seed" bind:value={addPoints} placeholder={m.manage_seed_points()} />
				{/if}
				<button type="submit" class="btn-primary" data-testid="add-player"
					>{m.manage_add_player()}</button
				>
			</form>
			<textarea bind:value={bulkNames} placeholder="Paste names" data-testid="bulk-names"
			></textarea>
			<button
				type="button"
				class="btn-secondary"
				data-testid="bulk-add"
				onclick={() =>
					run(() => addPlayersBulk({ tournamentId: data.tournamentId, names: bulkNames })).then(
						() => (bulkNames = '')
					)}>{m.manage_add_player()}</button
			>
			{#if page.checkInUsed}
				<button
					type="button"
					class="btn-danger"
					data-testid="remove-unchecked"
					onclick={() => run(() => removeUncheckedPlayers({ tournamentId: data.tournamentId }))}
				>
					{m.manage_remove_unchecked({
						count: page.players.filter((p) => !p.retiredAt && !p.checkedInAt).length
					})}
				</button>
			{/if}

			<ul class="roster">
				{#each players as p (p.id)}
					<li data-testid="manage-player-{p.id}">
						<strong>{p.name}</strong>
						<span>
							{#if p.courtNumber}Court {p.courtNumber}{/if}
							{#if p.seedRank}
								· {m.manage_order()} {p.seedRank}{/if}
							{#if page.checkInUsed}
								· {p.checkedInAt ? '✓' : '○'}{/if}
							{#if p.status !== 'active'}
								· {p.status}{/if}
						</span>
						<div class="row-actions">
							{#if renameId === p.id}
								<input bind:value={renameValue} data-testid="rename-input-{p.id}" />
								<button
									type="button"
									class="btn-primary"
									onclick={() =>
										run(() => renamePlayer({ playerId: p.id, name: renameValue })).then(
											() => (renameId = null)
										)}>{m.manage_rename()}</button
								>
							{:else}
								<button
									type="button"
									class="btn-secondary"
									data-testid="rename-{p.id}"
									onclick={() => {
										renameId = p.id;
										renameValue = p.name;
									}}>{m.manage_rename()}</button
								>
							{/if}
							{#if page.tournament.formatType === 'preseed' && !page.lock.roundHasScores}
								<input
									type="number"
									value={p.seedPoints ?? ''}
									data-testid="seed-{p.id}"
									onchange={(e) =>
										run(() =>
											updatePlayerSeed({
												playerId: p.id,
												seedPoints: Number((e.currentTarget as HTMLInputElement).value)
											})
										)}
								/>
							{/if}
							{#if page.tournament.formatType === 'random-seed' && !page.lock.roundHasScores}
								<input
									type="number"
									min="1"
									value={p.seedRank ?? ''}
									data-testid="order-{p.id}"
									onchange={(e) => {
										const rank = Number((e.currentTarget as HTMLInputElement).value);
										const ids = [...page.players]
											.filter((x) => !x.retiredAt)
											.sort((a, b) => (a.seedRank ?? 999) - (b.seedRank ?? 999))
											.map((x) => x.id)
											.filter((id) => id !== p.id);
										ids.splice(Math.max(0, rank - 1), 0, p.id);
										run(() =>
											updatePlayerOrder({ tournamentId: data.tournamentId, playerIds: ids })
										);
									}}
								/>
							{/if}
							<button
								type="button"
								class="btn-secondary"
								onclick={() => run(() => regeneratePlayerToken({ playerId: p.id }))}
								>{m.manage_regenerate_link()}</button
							>
							{#if !p.retiredAt && (page.tournament.status === 'setup' || (!page.lock.roundHasScores && page.tournament.currentRound === 1))}
								<button
									type="button"
									class="btn-danger"
									data-testid="remove-{p.id}"
									onclick={() => {
										if (confirm(m.manage_remove_confirm({ name: p.name }))) {
											run(() => removePlayer({ playerId: p.id }));
										}
									}}>{m.manage_remove_player()}</button
								>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if page && tab === 'courts'}
		<section data-testid="courts-tab">
			{#if page.tournament.status === 'setup'}
				<p>{m.manage_not_started_courts()}</p>
			{:else}
				<div class="court-actions">
					<button
						type="button"
						class="btn-secondary"
						data-testid="refill-courts"
						disabled={page.lock.roundHasScores}
						onclick={() => run(() => refillCourts({ tournamentId: data.tournamentId }))}
						>{m.manage_refill()}</button
					>
					<button
						type="button"
						class="btn-secondary"
						data-testid="reset-assignments"
						disabled={page.lock.roundHasScores}
						onclick={() => run(() => resetRoundAssignments({ tournamentId: data.tournamentId }))}
						>{m.manage_reset_assignments()}</button
					>
					{#if page.tournament.formatType === 'random-seed' && page.tournament.currentRound === 1}
						<button
							type="button"
							class="btn-secondary"
							disabled={page.lock.roundHasScores}
							onclick={() => run(() => reshuffleRound1({ tournamentId: data.tournamentId }))}
							>{m.manage_reshuffle_round1()}</button
						>
					{/if}
				</div>
				<div class="court-grid">
					{#each page.courts as court (court.courtNumber)}
						<div
							class="court-card"
							class:uneven={court.courtSize !== 4 &&
								page.courts.filter((c) => c.courtSize !== 4).length > 1}
							data-testid="manage-court-{court.courtNumber}"
							role="group"
							ondragover={(e) => e.preventDefault()}
							ondrop={() => dropOnCourt(court.courtNumber)}
						>
							<h3>
								Court {court.courtNumber}
								<span class="size">{court.courtSize}p</span>
								{#if court.manualAdjustedAt}<span>{m.manage_adjusted_badge()}</span>{/if}
								{#if court.isFrozen}🔒{/if}
							</h3>
							{#each court.playerIds as pid (pid)}
								<div
									class="tile"
									draggable={!page.lock.roundHasScores}
									data-testid="player-tile-{pid}"
									role="listitem"
									ondragstart={() => (draggingId = pid)}
								>
									{nameById.get(pid) ?? pid}
									{#if !page.lock.roundHasScores}
										<select
											data-testid="move-{pid}"
											onchange={(e) =>
												movePlayer(pid, Number((e.currentTarget as HTMLSelectElement).value))}
										>
											{#each page.courts as c (c.courtNumber)}
												<option
													value={c.courtNumber}
													selected={c.courtNumber === court.courtNumber}
												>
													{c.courtNumber}
												</option>
											{/each}
										</select>
									{/if}
								</div>
							{/each}
						</div>
					{/each}
				</div>
			{/if}
		</section>
	{/if}

	{#if page && tab === 'rules'}
		<section data-testid="rules-tab">
			{#if page.lock.roundHasScores}
				<p>{m.manage_rules_scoring_locked()}</p>
			{/if}
			<form
				onsubmit={(e) => {
					e.preventDefault();
					const fd = new FormData(e.currentTarget);
					run(() =>
						updateScoringRules({
							tournamentId: data.tournamentId,
							scoringMode: String(fd.get('scoringMode')) as 'single-21' | 'best-of-3' | 'custom',
							pointsToWin: Number(fd.get('pointsToWin')),
							winBy: Number(fd.get('winBy')),
							setsToWin: Number(fd.get('setsToWin')),
							decidingSetPoints: Number(fd.get('decidingSetPoints'))
						})
					);
				}}
			>
				<label
					>Scoring
					<select
						name="scoringMode"
						value={page.tournament.scoringMode}
						disabled={page.lock.roundHasScores}
					>
						<option value="single-21">single-21</option>
						<option value="best-of-3">best-of-3</option>
						<option value="custom">custom</option>
					</select>
				</label>
				<label
					>Points <input
						name="pointsToWin"
						type="number"
						value={page.tournament.pointsToWin}
						disabled={page.lock.roundHasScores}
					/></label
				>
				<label
					>Win by <input
						name="winBy"
						type="number"
						value={page.tournament.winBy}
						disabled={page.lock.roundHasScores}
					/></label
				>
				<label
					>Sets <input
						name="setsToWin"
						type="number"
						value={page.tournament.setsToWin}
						disabled={page.lock.roundHasScores}
					/></label
				>
				<label
					>Deciding <input
						name="decidingSetPoints"
						type="number"
						value={page.tournament.decidingSetPoints}
						disabled={page.lock.roundHasScores}
					/></label
				>
				<button type="submit" class="btn-primary" disabled={page.lock.roundHasScores}
					>Save scoring</button
				>
			</form>
			{#if page.tournament.formatType === 'random-seed'}
				<label>
					Rounds
					<input
						type="number"
						min={page.minRounds}
						max="10"
						value={page.tournament.numRounds}
						data-testid="num-rounds"
						onchange={(e) =>
							run(() =>
								updateRoundCount({
									tournamentId: data.tournamentId,
									numRounds: Number((e.currentTarget as HTMLInputElement).value)
								})
							)}
					/>
					<span class="hint">{m.manage_rounds_min_hint({ min: page.minRounds })}</span>
				</label>
			{:else}
				<p>{m.manage_rounds_preseed_fixed()}</p>
			{/if}
			<label>
				Physical courts
				<input
					type="number"
					min="1"
					max="16"
					value={page.tournament.physicalCourtCount}
					onchange={(e) =>
						run(() =>
							updateTournamentSettings({
								tournamentId: data.tournamentId,
								physicalCourtCount: Number((e.currentTarget as HTMLInputElement).value)
							})
						)}
				/>
			</label>
		</section>
	{/if}

	{#if page && tab === 'tournament'}
		<section data-testid="tournament-tab">
			<label>
				Name
				<input
					value={page.tournament.name}
					data-testid="rename-tournament"
					onchange={(e) =>
						run(() =>
							updateTournamentSettings({
								tournamentId: data.tournamentId,
								name: (e.currentTarget as HTMLInputElement).value
							})
						)}
				/>
			</label>
			{#if page.tournament.status === 'active' && page.tournament.currentRound >= 2}
				<button
					type="button"
					class="btn-primary"
					data-testid="finish-early"
					onclick={() => {
						if (confirm(m.manage_finish_early_confirm())) {
							run(() => finishTournamentEarlyCommand({ tournamentId: data.tournamentId }));
						}
					}}>{m.manage_finish_early()}</button
				>
			{/if}
			{#if (page.tournament.status === 'active' && page.tournament.currentRound >= 2 && !page.lock.roundHasScores) || page.tournament.status === 'completed'}
				<button
					type="button"
					class="btn-secondary"
					data-testid="reopen-round"
					onclick={() => {
						if (confirm(m.manage_reopen_confirm())) {
							run(() => reopenLastRoundCommand({ tournamentId: data.tournamentId }));
						}
					}}>{m.manage_reopen_round()}</button
				>
			{:else if page.tournament.status === 'active' && page.lock.roundHasScores && page.tournament.currentRound >= 2}
				<p>{m.manage_reopen_clear_scores_first()}</p>
			{/if}
			<div class="danger">
				<h3>{m.manage_danger_zone()}</h3>
				<form {...deleteTournamentForm}>
					<input {...deleteTournamentForm.fields.tournamentId.as('hidden', data.tournamentId)} />
					<button type="submit" class="btn-danger">{m.delete_tournament()}</button>
				</form>
			</div>
		</section>
	{/if}
</main>

<style>
	main {
		max-width: 900px;
		margin: 0 auto;
		padding: var(--spacing-md);
	}

	.tabs {
		display: flex;
		gap: var(--spacing-xs);
		overflow-x: auto;
		position: sticky;
		top: 0;
		background: var(--bg-primary);
		padding: var(--spacing-sm) 0;
		z-index: 5;
	}

	.tabs button {
		border: 1px solid var(--border-default);
		background: var(--bg-card);
		color: inherit;
		padding: var(--spacing-xs) var(--spacing-sm);
		border-radius: var(--radius-sm);
		white-space: nowrap;
	}

	.tabs button.active {
		border-color: var(--accent-primary);
		color: var(--accent-primary);
	}

	.roster {
		list-style: none;
		padding: 0;
	}

	.roster li {
		border-bottom: 1px solid var(--border-default);
		padding: var(--spacing-sm) 0;
	}

	.row-actions,
	.add,
	.court-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-xs);
		margin-top: var(--spacing-xs);
	}

	.court-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: var(--spacing-sm);
	}

	.court-card {
		border: 2px solid var(--border-default);
		border-radius: var(--radius-md);
		padding: var(--spacing-sm);
		min-height: 120px;
	}

	.court-card.uneven {
		border-color: var(--accent-warning);
	}

	.tile {
		background: var(--bg-secondary);
		padding: var(--spacing-xs);
		margin: 4px 0;
		border-radius: var(--radius-sm);
		cursor: grab;
		display: flex;
		justify-content: space-between;
		gap: 4px;
	}

	.error {
		color: var(--accent-error);
	}

	.danger {
		margin-top: var(--spacing-xl);
		border-top: 1px solid var(--accent-error);
		padding-top: var(--spacing-md);
	}

	.lock {
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
	}
</style>
