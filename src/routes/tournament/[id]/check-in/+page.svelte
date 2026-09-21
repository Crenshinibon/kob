<script lang="ts">
	import { browser } from '$app/environment';
	import * as m from '$lib/paraglide/messages';
	import { localizeHref } from '$lib/paraglide/runtime';
	import { resolve } from '$app/paths';
	import QrCode from '$lib/components/QrCode.svelte';
	import { getCheckInData, setPlayerCheckIn, closeCheckIn, reopenCheckIn } from './check-in.remote';

	let { data } = $props<{
		data: { tournamentId: number; tournamentName: string };
	}>();

	const query = $derived(getCheckInData({ tournamentId: data.tournamentId }));
	let search = $state('');
	let qrPlayer = $state<{ id: number; name: string; token: string } | null>(null);
	let copied = $state(false);
	let showClose = $state(false);
	let closeMode = $state<'checked' | 'all'>('checked');
	let hidden = $state(false);

	function onVisibilityChange(): void {
		hidden = document.hidden;
		if (!document.hidden) query.refresh().catch(() => {});
	}

	$effect(() => {
		if (hidden) return;
		const interval = setInterval(() => query.refresh().catch(() => {}), 5000);
		return () => clearInterval(interval);
	});

	const page = $derived(query.current);

	function playerUrl(token: string): string {
		if (!browser) return `/player/${token}`;
		return `${window.location.origin}/player/${token}`;
	}

	const rows = $derived.by(() => {
		if (!page) return [];
		const q = search.trim().toLowerCase();
		let list = page.players.filter((p) => !q || p.name.toLowerCase().includes(q));
		return [...list].sort((a, b) => {
			const ac = a.checkedInAt ? 1 : 0;
			const bc = b.checkedInAt ? 1 : 0;
			if (ac !== bc) return ac - bc;
			return a.name.localeCompare(b.name);
		});
	});

	const unchecked = $derived(page?.players.filter((p) => !p.checkedInAt) ?? []);
	const canShare = $derived(browser && typeof navigator.share === 'function');
	const scoresBlockRemove = $derived(!!page?.round1HasScores && page.tournament.status !== 'setup');

	async function toggle(id: number, currentlyChecked: boolean) {
		await setPlayerCheckIn({ playerId: id, checkedIn: !currentlyChecked });
	}

	async function copyLink(token: string) {
		await navigator.clipboard.writeText(playerUrl(token));
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}

	async function shareLink(name: string, token: string) {
		await navigator.share?.({ title: name, url: playerUrl(token) });
	}

	async function confirmClose(removeUnchecked?: boolean) {
		const startAfter = page?.tournament.status === 'setup';
		const remove = removeUnchecked ?? closeMode === 'checked';
		await closeCheckIn({
			tournamentId: data.tournamentId,
			removeUnchecked: remove,
			startAfter
		});
		showClose = false;
		await query.refresh();
	}
</script>

<svelte:document onvisibilitychange={onVisibilityChange} />

<main data-testid="checkin-page">
	<header>
		<a href={localizeHref(resolve('/tournament/[id]', { id: String(data.tournamentId) }))}>
			← {data.tournamentName}
		</a>
		<h1>{m.checkin_title()}</h1>
		{#if page}
			<p data-testid="checkin-progress">
				{m.checkin_progress({ checked: page.checked, total: page.total })}
			</p>
		{/if}
	</header>

	{#if page?.tournament.checkInClosedAt}
		<p class="banner">
			{m.checkin_closed_at({
				time: new Date(page.tournament.checkInClosedAt).toLocaleTimeString(undefined, {
					hour: '2-digit',
					minute: '2-digit'
				})
			})}
			<button
				type="button"
				class="btn-secondary"
				onclick={() => reopenCheckIn({ tournamentId: data.tournamentId })}
			>
				{m.checkin_reopen()}
			</button>
		</p>
	{/if}

	<div class="toolbar">
		<input
			type="search"
			placeholder={m.checkin_search()}
			bind:value={search}
			data-testid="checkin-search"
		/>
		<a
			class="btn-secondary"
			data-testid="checkin-print-link"
			href={localizeHref(
				resolve('/tournament/[id]/check-in/print', { id: String(data.tournamentId) })
			)}>{m.checkin_print()}</a
		>
		{#if !page?.tournament.checkInClosedAt}
			<button
				type="button"
				class={scoresBlockRemove ? 'btn-inactive' : 'btn-primary'}
				data-testid="close-checkin"
				onclick={() => (showClose = true)}
			>
				{m.checkin_close()}
			</button>
		{/if}
	</div>

	<ul class="list">
		{#each rows as p (p.id)}
			<li class:checked={!!p.checkedInAt}>
				<button
					type="button"
					class="row"
					data-testid="checkin-row-{p.id}"
					onclick={() => toggle(p.id, !!p.checkedInAt)}
				>
					<span class="mark">{p.checkedInAt ? '✓' : '○'}</span>
					<span class="name">{p.name}</span>
					{#if p.checkedInAt}
						<span class="meta">
							{new Date(p.checkedInAt).toLocaleTimeString(undefined, {
								hour: '2-digit',
								minute: '2-digit'
							})}
							· {p.checkInSource === 'scan' ? m.checkin_source_scan() : m.checkin_source_org()}
						</span>
					{/if}
				</button>
				<button
					type="button"
					class="btn-secondary"
					data-testid="checkin-qr-{p.id}"
					data-player-id={p.id}
					data-player-name={p.name}
					data-player-token={p.token}
					onclick={() => (qrPlayer = p)}
				>
					QR
				</button>
			</li>
		{/each}
	</ul>

	{#if unchecked.length > 0}
		<p>
			{m.checkin_not_checked_in({
				count: unchecked.length,
				names: unchecked.map((p) => p.name).join(', ')
			})}
		</p>
		<a
			class="btn-link"
			href={localizeHref(
				resolve('/tournament/[id]/manage', { id: String(data.tournamentId) }) + '#players'
			)}
		>
			{m.checkin_manage_no_shows()}
		</a>
	{/if}
</main>

{#if qrPlayer}
	<div class="modal" data-testid="qr-modal">
		<div class="modal-card">
			<h2>{qrPlayer.name}</h2>
			<QrCode
				url={playerUrl(qrPlayer.token)}
				alt={qrPlayer.name}
				hint={m.checkin_qr_hint()}
				width={240}
			/>
			<div class="form-actions">
				<button type="button" class="btn-secondary" onclick={() => copyLink(qrPlayer!.token)}>
					{copied ? m.checkin_link_copied() : m.checkin_copy_link()}
				</button>
				{#if canShare}
					<button
						type="button"
						class="btn-secondary"
						onclick={() => shareLink(qrPlayer!.name, qrPlayer!.token)}
					>
						{m.checkin_share()}
					</button>
				{/if}
				<button type="button" class="btn-primary" onclick={() => (qrPlayer = null)}>OK</button>
			</div>
		</div>
	</div>
{/if}

{#if showClose && page}
	<div class="modal" data-testid="close-checkin-dialog">
		<div class="modal-card">
			<h2>{m.checkin_close()}</h2>
			<p>
				{m.checkin_not_checked_in({
					count: unchecked.length,
					names: unchecked.map((p) => p.name).join(', ')
				})}
			</p>
			{#if page.tournament.status === 'setup'}
				<label>
					<input type="radio" bind:group={closeMode} value="checked" />
					{m.checkin_start_checked_in()}
				</label>
				<label>
					<input type="radio" bind:group={closeMode} value="all" />
					{m.checkin_start_all()}
				</label>
			{:else if page.round1HasScores}
				<p>{m.checkin_close_scores_exist()}</p>
			{:else}
				<label>
					<input type="radio" bind:group={closeMode} value="checked" />
					{m.checkin_close_remove_option()}
				</label>
				<label>
					<input type="radio" bind:group={closeMode} value="all" />
					{m.checkin_close_keep_option()}
				</label>
			{/if}
			<div class="form-actions">
				<button type="button" class="btn-secondary" onclick={() => (showClose = false)}
					>Cancel</button
				>
				{#if scoresBlockRemove}
					<button
						type="button"
						class="btn-inactive"
						data-testid="confirm-close-checkin"
						onclick={() => confirmClose(false)}
					>
						{m.checkin_close_keep_option()}
					</button>
				{:else}
					<button
						type="button"
						class="btn-primary"
						data-testid="confirm-close-checkin"
						onclick={() => confirmClose()}
					>
						{page.tournament.status === 'setup' ? m.setup_start_button() : m.checkin_close()}
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	main {
		max-width: 700px;
		margin: 0 auto;
		padding: var(--spacing-md);
	}

	.toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-sm);
		margin-bottom: var(--spacing-md);
	}

	.toolbar input {
		flex: 1;
		min-width: 140px;
	}

	.list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.list li {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		border-bottom: 1px solid var(--border-default);
	}

	.row {
		flex: 1;
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		background: none;
		border: none;
		color: inherit;
		text-align: left;
		padding: var(--spacing-sm) 0;
		cursor: pointer;
		text-transform: none;
		letter-spacing: normal;
		font-weight: 600;
		min-height: 44px;
	}

	.list li.checked .name {
		color: var(--text-muted);
	}

	.list li.checked .row {
		color: var(--text-muted);
	}

	.mark {
		width: 1.5rem;
		font-weight: 700;
	}

	.meta {
		font-size: var(--font-size-xs);
		color: var(--text-muted);
		margin-left: auto;
	}

	.modal {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--spacing-md);
		z-index: 20;
	}

	.modal-card {
		background: var(--bg-card);
		border-radius: var(--radius-md);
		padding: var(--spacing-lg);
		max-width: 420px;
		width: 100%;
	}

	.form-actions {
		display: flex;
		gap: var(--spacing-sm);
		flex-wrap: wrap;
		margin-top: var(--spacing-md);
	}

	.banner {
		background: var(--bg-secondary);
		padding: var(--spacing-sm);
		border-radius: var(--radius-sm);
	}
</style>
