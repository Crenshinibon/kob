<script lang="ts">
	import { browser } from '$app/environment';
	import { afterNavigate } from '$app/navigation';
	import * as m from '$lib/paraglide/messages';
	import { localizeHref } from '$lib/paraglide/runtime';
	import { resolve } from '$app/paths';
	import PlayerNameImport from '$lib/components/PlayerNameImport.svelte';
	import RangeSlider from '$lib/components/RangeSlider.svelte';
	import ScoringRulesFields from '$lib/components/ScoringRulesFields.svelte';
	import TieBreakRulesFields from '$lib/components/TieBreakRulesFields.svelte';
	import RosterStatusActions from './RosterStatusActions.svelte';
	import {
		canEditRound1Roster,
		isValidPlayerMove,
		movePlayerInOrder,
		orderPlayersByIds,
		proposedMove,
		remoteErrorMessage,
		sortCourts,
		sortPlayersBySeed,
		type ManualAssignmentCourt,
		type SeedOrderMove
	} from '$lib/manage-logic';
	import {
		scoringDraftFromConfig,
		scoringPayloadFromDraft,
		DEFAULT_TIE_BREAK_CONFIG,
		DEFAULT_TIE_BREAK_FINAL_FACTOR,
		normalizeTieBreakConfig,
		isStatisticalTieBreakFactor,
		TIE_BREAK_FINAL_FACTOR_IDS,
		type CourtScoringRules,
		type ScoringCourtSize,
		type ScoringOverrides,
		type TieBreakConfig,
		type TieBreakFactorId
	} from '$lib/tournament-logic';
	import { flip } from 'svelte/animate';
	import { quintOut } from 'svelte/easing';
	import { tick } from 'svelte';
	import { crossfade, scale } from 'svelte/transition';
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
	import { deleteTournamentForm, updateTieBreakConfig } from '../tournament-actions.remote';

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
	let liftActive = $state(false);
	let ghostPos = $state<{ x: number; y: number } | null>(null);
	let ghostName = $state('');
	let hoverCourt = $state<number | null>(null);
	let pendingCourts = $state<ManualAssignmentCourt[] | null>(null);
	let pendingOrderIds = $state<number[] | null>(null);
	let orderGen = 0;
	let regenBusyIds = $state<number[]>([]);
	let regenDoneIds = $state<number[]>([]);
	const REGEN_COOLDOWN_MS = 2500;
	let scoringTab = $state<ScoringCourtSize>(4);
	let scoringEdits = $state<Record<string, CourtScoringRules> | null>(null);
	let scoringEditSnap = $state('');
	let editingTieBreak = $state(false);
	let localStatFactors = $state<{ id: TieBreakFactorId; enabled: boolean }[]>(
		DEFAULT_TIE_BREAK_CONFIG.factors
			.filter((f) => isStatisticalTieBreakFactor(f.id))
			.map((f) => ({ id: f.id, enabled: f.enabled }))
	);
	let selectedFinalFactor = $state<TieBreakFactorId>(DEFAULT_TIE_BREAK_FINAL_FACTOR);

	afterNavigate(() => {
		const fromHash = window.location.hash.replace('#', '') || 'players';
		if (['players', 'courts', 'rules', 'tournament'].includes(fromHash)) tab = fromHash;
		query.refresh().catch(() => {});
	});

	function refreshIfVisible(): void {
		if (document.hidden) return;
		query.refresh().catch(() => {});
	}

	function setTab(next: string) {
		tab = next;
		if (browser) history.replaceState(null, '', `#${next}`);
	}

	const [sendTile, receiveTile] = crossfade({
		duration: (d) => {
			if (browser && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 0;
			return Math.min(420, Math.max(220, d * 0.5));
		},
		easing: quintOut,
		fallback(node) {
			return scale(node, { duration: 200, start: 0.92 });
		}
	});

	const LIFT_DELAY_MS = 160;
	const MOVE_THRESHOLD_PX = 8;
	let liftTimer: ReturnType<typeof setTimeout> | null = null;
	let dragPointerId: number | null = null;
	let dragOrigin = { x: 0, y: 0 };

	const page = $derived(query.current);
	const orderedActiveIds = $derived(
		pendingOrderIds ??
			sortPlayersBySeed((page?.players ?? []).filter((p) => !p.retiredAt)).map((p) => p.id)
	);
	const players = $derived(
		orderPlayersByIds(
			sortPlayersBySeed(
				(page?.players ?? []).filter(
					(p) => !search || p.name.toLowerCase().includes(search.toLowerCase())
				)
			),
			orderedActiveIds
		)
	);
	const nameById = $derived(new Map((page?.players ?? []).map((p) => [p.id, p.name])));
	const uncheckedCount = $derived(
		(page?.players ?? []).filter((p) => !p.retiredAt && !p.checkedInAt).length
	);
	const rosterEditable = $derived(
		!!page &&
			canEditRound1Roster({
				status: page.tournament.status,
				currentRound: page.tournament.currentRound,
				roundHasScores: page.lock.roundHasScores
			})
	);
	const sortedCourts = $derived(sortCourts(pendingCourts ?? page?.courts ?? []));
	const validDropCourts = $derived.by(() => {
		const ids = new Set<number>();
		const courts = pendingCourts ?? page?.courts ?? [];
		if (!page || draggingId == null) return ids;
		for (const court of courts) {
			if (isValidPlayerMove(courts, draggingId, court.courtNumber)) {
				ids.add(court.courtNumber);
			}
		}
		return ids;
	});
	const canEditRounds = $derived(
		!!page &&
			(page.tournament.formatType === 'random-seed' || page.tournament.status === 'setup') &&
			page.tournament.status !== 'completed'
	);
	const canEditPhysicalCourts = $derived(!!page && page.tournament.status !== 'completed');

	async function run(fn: () => Promise<unknown>) {
		errorMsg = '';
		try {
			await fn();
			await query.refresh();
		} catch (err) {
			errorMsg = remoteErrorMessage(err);
		}
	}

	async function movePlayer(playerId: number, toCourt: number) {
		if (!page) return;
		const source = pendingCourts ?? page.courts;
		if (!isValidPlayerMove(source, playerId, toCourt)) return;
		const next = proposedMove(source, playerId, toCourt);
		pendingCourts = next;
		await tick();
		await run(() =>
			applyAssignmentCommand({
				tournamentId: data.tournamentId,
				courts: next.map((c) => ({ courtNumber: c.courtNumber, playerIds: c.playerIds }))
			})
		);
		pendingCourts = null;
	}

	function clearDrag(): void {
		if (liftTimer) {
			clearTimeout(liftTimer);
			liftTimer = null;
		}
		draggingId = null;
		liftActive = false;
		ghostPos = null;
		ghostName = '';
		hoverCourt = null;
		dragPointerId = null;
	}

	function courtFromPoint(x: number, y: number): number | null {
		if (!browser) return null;
		for (const el of document.elementsFromPoint(x, y)) {
			if (!(el instanceof Element)) continue;
			const node = el.closest('[data-court-number]');
			if (node) return Number(node.getAttribute('data-court-number'));
		}
		return null;
	}

	function startLift(pid: number): void {
		liftActive = true;
		ghostName = nameById.get(pid) ?? String(pid);
	}

	function onTilePointerDown(e: PointerEvent, pid: number): void {
		if (!page || page.lock.roundHasScores) return;
		if ((e.target as HTMLElement).closest('select, option, button')) return;
		if (e.button !== 0) return;
		draggingId = pid;
		dragOrigin = { x: e.clientX, y: e.clientY };
		dragPointerId = e.pointerId;
		ghostPos = { x: e.clientX, y: e.clientY };
		const node = e.currentTarget as HTMLElement;
		if (node.setPointerCapture) {
			try {
				node.setPointerCapture(e.pointerId);
			} catch {
				/* capture is best-effort on some pointers */
			}
		}
		e.preventDefault();
		liftTimer = setTimeout(() => startLift(pid), LIFT_DELAY_MS);
	}

	function onPointerMove(e: PointerEvent): void {
		if (draggingId == null || (dragPointerId != null && e.pointerId !== dragPointerId)) return;
		ghostPos = { x: e.clientX, y: e.clientY };
		const dist = Math.hypot(e.clientX - dragOrigin.x, e.clientY - dragOrigin.y);
		if (!liftActive && dist >= MOVE_THRESHOLD_PX) {
			if (liftTimer) {
				clearTimeout(liftTimer);
				liftTimer = null;
			}
			startLift(draggingId);
		}
		if (liftActive) {
			hoverCourt = courtFromPoint(e.clientX, e.clientY);
			e.preventDefault();
		}
	}

	async function onPointerUp(e: PointerEvent): Promise<void> {
		if (draggingId == null) return;
		if (dragPointerId != null && e.pointerId !== dragPointerId) return;
		const id = draggingId;
		const lifted = liftActive;
		const target = courtFromPoint(e.clientX, e.clientY);
		clearDrag();
		if (lifted && target != null) await movePlayer(id, target);
	}

	function onPointerCancel(): void {
		clearDrag();
	}

	function orderLabel(move: SeedOrderMove): string {
		if (move === 'up') return m.manage_order_up();
		if (move === 'down') return m.manage_order_down();
		if (move === 'top') return m.manage_order_top();
		return m.manage_order_bottom();
	}

	function rosterFlipDuration(distance: number): number {
		if (browser && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 0;
		return Math.min(480, Math.max(240, distance * 0.55));
	}

	async function reorderPlayer(playerId: number, move: SeedOrderMove) {
		const next = movePlayerInOrder(orderedActiveIds, playerId, move);
		if (next.join(',') === orderedActiveIds.join(',')) return;
		pendingOrderIds = next;
		const gen = ++orderGen;
		errorMsg = '';
		try {
			await updatePlayerOrder({ tournamentId: data.tournamentId, playerIds: next });
			await query.refresh();
		} catch (err) {
			if (gen === orderGen) {
				errorMsg = remoteErrorMessage(err);
			}
		} finally {
			if (gen === orderGen) pendingOrderIds = null;
		}
	}

	const scoringSnapshot = $derived(
		page?.tournament
			? JSON.stringify({
					p: page.tournament.pointsToWin,
					w: page.tournament.winBy,
					s: page.tournament.setsToWin,
					d: page.tournament.decidingSetPoints,
					o: page.tournament.scoringOverrides
				})
			: ''
	);
	const serverScoringDraft = $derived.by((): Record<string, CourtScoringRules> | null => {
		if (!scoringSnapshot) return null;
		const parsed = JSON.parse(scoringSnapshot) as {
			p: number;
			w: number;
			s: number;
			d: number;
			o: ScoringOverrides | null;
		};
		return scoringDraftFromConfig(
			{
				pointsToWin: parsed.p,
				winBy: parsed.w,
				setsToWin: parsed.s,
				decidingSetPoints: parsed.d
			},
			parsed.o
		);
	});
	const scoringDraft = $derived(
		scoringEdits !== null && scoringEditSnap === scoringSnapshot ? scoringEdits : serverScoringDraft
	);
	const currentScoring = $derived(scoringDraft?.[String(scoringTab)] ?? null);

	function patchScoring(
		size: ScoringCourtSize,
		field: keyof CourtScoringRules,
		value: number
	): void {
		const draft = scoringDraft;
		if (!draft || !Number.isFinite(value)) return;
		const key = String(size);
		const current = draft[key];
		if (!current) return;
		scoringEditSnap = scoringSnapshot;
		scoringEdits = {
			...draft,
			[key]: { ...current, [field]: value }
		};
	}

	function saveScoring(): void {
		const draft = scoringDraft;
		if (!draft) return;
		const payload = scoringPayloadFromDraft(draft);
		run(() =>
			updateScoringRules({
				tournamentId: data.tournamentId,
				pointsToWin: payload.four.pointsToWin,
				winBy: payload.four.winBy,
				setsToWin: payload.four.setsToWin,
				decidingSetPoints: payload.four.decidingSetPoints,
				scoringOverrides: payload.scoringOverrides as Record<string, CourtScoringRules>
			})
		);
	}

	function applyTieBreakConfig(cfg: TieBreakConfig | null | undefined): void {
		const normalized = normalizeTieBreakConfig(cfg);
		localStatFactors = normalized.factors
			.filter((f) => isStatisticalTieBreakFactor(f.id))
			.map((f) => ({ id: f.id, enabled: f.enabled }));
		selectedFinalFactor =
			normalized.factors.find((f) => f.enabled && !isStatisticalTieBreakFactor(f.id))?.id ??
			DEFAULT_TIE_BREAK_FINAL_FACTOR;
	}

	$effect(() => {
		const cfg = page?.tournament.tieBreakConfig as TieBreakConfig | null | undefined;
		if (!editingTieBreak) applyTieBreakConfig(cfg);
	});

	function saveTieBreak(): void {
		const normalized = normalizeTieBreakConfig({
			factors: [
				...localStatFactors,
				...TIE_BREAK_FINAL_FACTOR_IDS.map((id) => ({
					id,
					enabled: id === selectedFinalFactor
				}))
			]
		});
		applyTieBreakConfig(normalized);
		run(() =>
			updateTieBreakConfig({
				tournamentId: data.tournamentId,
				factors: normalized.factors.map((f) => ({ id: f.id, enabled: f.enabled }))
			})
		);
		editingTieBreak = false;
	}

	function regenLocked(playerId: number): boolean {
		return regenBusyIds.includes(playerId) || regenDoneIds.includes(playerId);
	}

	async function regenerateQr(playerId: number): Promise<void> {
		if (regenLocked(playerId)) return;
		regenBusyIds = [...regenBusyIds, playerId];
		errorMsg = '';
		try {
			await regeneratePlayerToken({ playerId });
			await query.refresh();
			regenBusyIds = regenBusyIds.filter((id) => id !== playerId);
			regenDoneIds = [...regenDoneIds, playerId];
			setTimeout(() => {
				regenDoneIds = regenDoneIds.filter((id) => id !== playerId);
			}, REGEN_COOLDOWN_MS);
		} catch (err) {
			errorMsg = remoteErrorMessage(err);
			regenBusyIds = regenBusyIds.filter((id) => id !== playerId);
		}
	}
</script>

<svelte:document onvisibilitychange={refreshIfVisible} />
<svelte:window
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onpointercancel={onPointerCancel}
/>

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
		<nav class="page-nav">
			<a
				class="btn-secondary"
				href={localizeHref(resolve('/tournament/[id]', { id: String(data.tournamentId) }))}
				>{m.manage_operations_link()}</a
			>
			<a
				class="btn-secondary"
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
		<section data-testid="players-tab" class="stack">
			<div class="panel search-panel" data-testid="search-panel">
				<h2>{m.manage_search_heading()}</h2>
				<input
					type="search"
					placeholder={m.manage_search_players()}
					bind:value={search}
					data-testid="manage-search"
				/>
			</div>

			{#if rosterEditable}
				<div class="panel add-one-panel" data-testid="add-one-panel">
					<h2>{m.manage_add_one_heading()}</h2>
					<form
						class="stack-form"
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
						<label>
							{m.manage_add_player()}
							<input
								name="name"
								bind:value={addName}
								placeholder={m.manage_add_player()}
								data-testid="add-player-name"
								required
							/>
						</label>
						{#if page.tournament.formatType === 'preseed'}
							<label>
								{m.manage_seed_points()}
								<input name="seed" bind:value={addPoints} placeholder={m.manage_seed_points()} />
							</label>
						{/if}
						<button type="submit" class="btn-primary" data-testid="add-player"
							>{m.manage_add_player()}</button
						>
					</form>
				</div>
			{/if}

			{#if page.tournament.status === 'setup'}
				<div class="panel add-many-panel" data-testid="add-many-panel">
					<h2>{m.manage_add_many_heading()}</h2>
					<PlayerNameImport
						bind:names={bulkNames}
						formatType={page.tournament.formatType}
						textareaId="manage-bulk-names"
						testId="bulk-names"
					/>
					<button
						type="button"
						class="btn-primary"
						data-testid="bulk-add"
						disabled={!bulkNames.trim()}
						onclick={() =>
							run(() => addPlayersBulk({ tournamentId: data.tournamentId, names: bulkNames })).then(
								() => (bulkNames = '')
							)}>{m.manage_add_many()}</button
					>
				</div>
			{/if}

			{#if page.checkInUsed && rosterEditable}
				<button
					type="button"
					class="btn-danger"
					data-testid="remove-unchecked"
					onclick={() => run(() => removeUncheckedPlayers({ tournamentId: data.tournamentId }))}
				>
					{m.manage_remove_unchecked({
						count: uncheckedCount
					})}
				</button>
			{/if}

			{#if page.tournament.formatType === 'random-seed' && !rosterEditable}
				<p class="hint" data-testid="order-locked">{m.manage_order_locked()}</p>
			{/if}
			<ul class="roster">
				{#each players as p (p.id)}
					{@const orderIndex = orderedActiveIds.indexOf(p.id)}
					{@const canReorder =
						page.tournament.formatType === 'random-seed' &&
						rosterEditable &&
						!p.retiredAt &&
						orderIndex >= 0}
					<li
						data-testid="manage-player-{p.id}"
						animate:flip={{ duration: rosterFlipDuration, easing: quintOut }}
					>
						<div class="roster-body">
							{#if renameId === p.id}
								<input
									class="player-name-input"
									bind:value={renameValue}
									data-testid="rename-input-{p.id}"
									aria-label={m.manage_rename()}
								/>
							{:else}
								<strong class="player-name">{p.name}</strong>
							{/if}
							<div class="row-actions">
								{#if renameId === p.id}
									<button
										type="button"
										class="btn-compact btn-primary"
										onclick={() =>
											run(() => renamePlayer({ playerId: p.id, name: renameValue })).then(
												() => (renameId = null)
											)}>{m.manage_rename()}</button
									>
								{:else}
									<button
										type="button"
										class="btn-compact btn-secondary"
										data-testid="rename-{p.id}"
										onclick={() => {
											renameId = p.id;
											renameValue = p.name;
										}}>{m.manage_rename()}</button
									>
								{/if}
								{#if page.tournament.formatType === 'preseed' && rosterEditable}
									<input
										class="seed-compact"
										type="number"
										value={p.seedPoints ?? ''}
										data-testid="seed-{p.id}"
										aria-label={m.manage_seed_points()}
										onchange={(e) =>
											run(() =>
												updatePlayerSeed({
													playerId: p.id,
													seedPoints: Number((e.currentTarget as HTMLInputElement).value)
												})
											)}
									/>
								{/if}
								{#if !p.retiredAt && rosterEditable}
									<button
										type="button"
										class="btn-compact btn-danger"
										data-testid="remove-{p.id}"
										onclick={() => {
											if (confirm(m.manage_remove_confirm({ name: p.name }))) {
												run(() => removePlayer({ playerId: p.id }));
											}
										}}>{m.manage_remove_player()}</button
									>
								{/if}
								<button
									type="button"
									class="btn-compact btn-secondary"
									class:is-busy={regenBusyIds.includes(p.id)}
									class:is-done={regenDoneIds.includes(p.id)}
									data-testid="regen-{p.id}"
									aria-busy={regenBusyIds.includes(p.id)}
									aria-label={regenDoneIds.includes(p.id)
										? m.manage_regenerate_done()
										: m.manage_regenerate_link()}
									disabled={regenLocked(p.id)}
									onclick={() => regenerateQr(p.id)}
								>
									{#if regenBusyIds.includes(p.id)}
										<span class="regen-busy" data-testid="regen-busy-{p.id}"></span>
									{:else if regenDoneIds.includes(p.id)}
										<svg
											class="regen-check"
											data-testid="regen-check-{p.id}"
											viewBox="0 0 16 16"
											aria-hidden="true"
											in:scale={{ duration: 200, start: 0.4, easing: quintOut }}
										>
											<path
												d="M2.8 8.4 6.3 11.8 13.2 3.6"
												fill="none"
												stroke="currentColor"
												stroke-width="2.2"
												stroke-linecap="round"
												stroke-linejoin="round"
											/>
										</svg>
									{:else}
										{m.manage_regenerate_short()}
									{/if}
								</button>
							</div>
						</div>
						{#if canReorder}
							<div class="order-controls" role="group" aria-label={m.manage_order()}>
								<button
									type="button"
									class="order-btn"
									data-testid="order-top-{p.id}"
									aria-label={orderLabel('top')}
									disabled={orderIndex <= 0}
									onclick={() => reorderPlayer(p.id, 'top')}
								>
									<svg class="order-icon" viewBox="0 0 16 16" aria-hidden="true">
										<rect x="2" y="1.5" width="12" height="1.8" />
										<path d="M8 5 14 13H2Z" />
									</svg>
								</button>
								<button
									type="button"
									class="order-btn"
									data-testid="order-up-{p.id}"
									aria-label={orderLabel('up')}
									disabled={orderIndex <= 0}
									onclick={() => reorderPlayer(p.id, 'up')}
								>
									<svg class="order-icon" viewBox="0 0 16 16" aria-hidden="true"
										><path d="M8 2.5 14 10.5H2Z" /></svg
									>
								</button>
								<button
									type="button"
									class="order-btn"
									data-testid="order-down-{p.id}"
									aria-label={orderLabel('down')}
									disabled={orderIndex >= orderedActiveIds.length - 1}
									onclick={() => reorderPlayer(p.id, 'down')}
								>
									<svg class="order-icon" viewBox="0 0 16 16" aria-hidden="true"
										><path d="M8 13.5 14 5.5H2Z" /></svg
									>
								</button>
								<button
									type="button"
									class="order-btn"
									data-testid="order-bottom-{p.id}"
									aria-label={orderLabel('bottom')}
									disabled={orderIndex >= orderedActiveIds.length - 1}
									onclick={() => reorderPlayer(p.id, 'bottom')}
								>
									<svg class="order-icon" viewBox="0 0 16 16" aria-hidden="true">
										<path d="M8 11 14 3H2Z" />
										<rect x="2" y="12.7" width="12" height="1.8" />
									</svg>
								</button>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
			<RosterStatusActions
				tournamentId={data.tournamentId}
				formatType={page.tournament.formatType}
				status={page.tournament.status}
				currentRound={page.tournament.currentRound}
				roundHasScores={page.lock.roundHasScores}
				players={page.players}
				courts={page.courts}
				onDone={async () => {
					await query.refresh();
				}}
			/>
		</section>
	{/if}

	{#if page && tab === 'courts'}
		<section data-testid="courts-tab" class="stack">
			{#if page.tournament.status === 'setup'}
				<p>{m.manage_not_started_courts()}</p>
			{:else}
				{#if page.lock.roundHasScores}
					<p class="hint" data-testid="courts-locked">{m.manage_courts_locked()}</p>
				{:else}
					<div class="court-actions">
						<button
							type="button"
							class="btn-secondary"
							data-testid="refill-courts"
							onclick={() => run(() => refillCourts({ tournamentId: data.tournamentId }))}
							>{m.manage_refill()}</button
						>
						<button
							type="button"
							class="btn-secondary"
							data-testid="reset-assignments"
							onclick={() => run(() => resetRoundAssignments({ tournamentId: data.tournamentId }))}
							>{m.manage_reset_assignments()}</button
						>
						{#if page.tournament.formatType === 'random-seed' && page.tournament.currentRound === 1}
							<button
								type="button"
								class="btn-secondary"
								onclick={() => run(() => reshuffleRound1({ tournamentId: data.tournamentId }))}
								>{m.manage_reshuffle_round1()}</button
							>
						{/if}
					</div>
				{/if}
				{#if draggingId != null && liftActive}
					<p class="drop-hint">{m.manage_drop_hint()}</p>
				{/if}
				{#if liftActive && ghostPos}
					<div
						class="drag-ghost"
						style:left="{ghostPos.x}px"
						style:top="{ghostPos.y}px"
						aria-hidden="true"
					>
						{ghostName}
					</div>
				{/if}
				<div class="court-grid">
					{#each sortedCourts as court (court.courtNumber)}
						{@const size = court.playerIds.length}
						<div
							class="court-card"
							class:uneven={size !== 4}
							class:drop-ok={liftActive &&
								(validDropCourts.has(court.courtNumber) || hoverCourt === court.courtNumber)}
							class:drop-blocked={liftActive &&
								!validDropCourts.has(court.courtNumber) &&
								!court.playerIds.includes(draggingId ?? -1)}
							data-testid="manage-court-{court.courtNumber}"
							data-court-number={court.courtNumber}
							data-drop-valid={liftActive && validDropCourts.has(court.courtNumber)
								? 'true'
								: 'false'}
							role="group"
						>
							<h3>
								Court {court.courtNumber}
								<span class="size">{size}p</span>
								{#if court.manualAdjustedAt}<span>{m.manage_adjusted_badge()}</span>{/if}
								{#if court.isFrozen}🔒{/if}
							</h3>
							{#each court.playerIds as pid (pid)}
								<div
									class="tile"
									class:pressing={draggingId === pid}
									class:lift={liftActive && draggingId === pid}
									class:locked={page.lock.roundHasScores}
									data-testid="player-tile-{pid}"
									role="listitem"
									in:receiveTile={{ key: pid }}
									out:sendTile={{ key: pid }}
									animate:flip={{ duration: rosterFlipDuration }}
									onpointerdown={(e) => onTilePointerDown(e, pid)}
									onpointermove={onPointerMove}
									onpointerup={onPointerUp}
									onpointercancel={onPointerCancel}
									oncontextmenu={(e) => e.preventDefault()}
								>
									{nameById.get(pid) ?? pid}
									{#if !page.lock.roundHasScores}
										<select
											data-testid="move-{pid}"
											value={court.courtNumber}
											onchange={(e) =>
												movePlayer(pid, Number((e.currentTarget as HTMLSelectElement).value))}
										>
											{#each sortedCourts as c (c.courtNumber)}
												<option
													value={c.courtNumber}
													disabled={!isValidPlayerMove(
														pendingCourts ?? page.courts,
														pid,
														c.courtNumber
													) && c.courtNumber !== court.courtNumber}
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
		<section data-testid="rules-tab" class="stack">
			{#if page.lock.roundHasScores}
				<p>{m.manage_rules_scoring_locked()}</p>
			{/if}
			<div class="panel">
				<h2>{m.manage_scoring_heading()}</h2>
				{#if scoringDraft && currentScoring}
					<form
						class="scoring-form"
						onsubmit={(e) => {
							e.preventDefault();
							saveScoring();
						}}
					>
						<ScoringRulesFields
							bind:tab={scoringTab}
							draft={scoringDraft}
							disabled={page.lock.roundHasScores}
							onPatch={patchScoring}
						/>
						{#if !page.lock.roundHasScores}
							<button type="submit" class="btn-primary scoring-save" data-testid="save-scoring"
								>{m.save_scoring()}</button
							>
						{/if}
					</form>
				{/if}
			</div>
			<div class="panel tie-break-section">
				<h2>{m.tie_break_heading()}</h2>
				<TieBreakRulesFields
					bind:statFactors={localStatFactors}
					bind:selectedFinalFactor
					onChange={() => (editingTieBreak = true)}
				/>
				{#if editingTieBreak}
					<button type="button" class="btn-primary scoring-save" onclick={() => saveTieBreak()}
						>{m.tie_break_save()}</button
					>
				{/if}
			</div>
		</section>
	{/if}

	{#if page && tab === 'tournament'}
		<section data-testid="tournament-tab" class="stack">
			<label class="full-label">
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
			<div class="panel">
				<h2>{m.manage_layout_heading()}</h2>
				<div class="layout-grid">
					{#if canEditRounds}
						<label>
							{m.manage_rounds_label()}: {m.range_rounds_value({
								count: page.tournament.numRounds
							})}
							<RangeSlider
								id="num-rounds"
								min={page.minRounds}
								max={10}
								value={page.tournament.numRounds}
								testId="num-rounds"
								disabled={false}
								formatCurrent={(n) => m.range_rounds_value({ count: n })}
								onchange={(n) =>
									run(() =>
										updateRoundCount({
											tournamentId: data.tournamentId,
											numRounds: n
										})
									)}
							/>
							<span class="hint">
								{#if page.tournament.formatType === 'preseed'}
									{m.manage_rounds_preseed_setup()}
								{:else}
									{m.manage_rounds_min_hint({ min: page.minRounds })}
								{/if}
							</span>
						</label>
					{:else if page.tournament.formatType === 'preseed'}
						<p>{m.manage_rounds_preseed_fixed()}</p>
					{/if}
					{#if canEditPhysicalCourts}
						<label>
							{m.manage_physical_courts()}
							<RangeSlider
								id="physical-courts"
								min={1}
								max={16}
								value={page.tournament.physicalCourtCount}
								testId="physical-courts"
								formatCurrent={(n) => m.range_courts_value({ count: n })}
								onchange={(n) =>
									run(() =>
										updateTournamentSettings({
											tournamentId: data.tournamentId,
											physicalCourtCount: n
										})
									)}
							/>
						</label>
					{/if}
				</div>
			</div>
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

	.stack {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-lg);
	}

	.panel {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
		padding: var(--spacing-md);
		border: 2px solid var(--border-default);
		border-radius: var(--radius-md);
		background: var(--bg-card);
	}

	.search-panel {
		border-color: var(--border-default);
	}

	.add-one-panel {
		border-color: var(--accent-info);
	}

	.add-many-panel {
		border-color: var(--accent-primary);
	}

	.panel h2 {
		margin: 0;
		font-size: var(--font-size-sm);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		border-bottom: 2px solid currentColor;
		padding-bottom: var(--spacing-xs);
	}

	.stack-form,
	.scoring-form,
	.layout-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--spacing-md);
		align-items: start;
	}

	.scoring-form {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
		align-items: stretch;
	}

	.scoring-save {
		width: 100%;
	}

	@media (min-width: 700px) {
		.layout-grid {
			grid-template-columns: 1fr 1fr;
		}
	}

	label,
	.full-label {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: var(--spacing-xs);
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		font-weight: 600;
	}

	label :global(input),
	label :global(select),
	.full-label input {
		width: 100%;
		min-height: 44px;
		box-sizing: border-box;
	}

	.roster {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.roster li {
		border: 1px solid var(--border-default);
		border-radius: var(--radius-md);
		padding: 0;
		display: flex;
		flex-direction: row;
		align-items: stretch;
		overflow: hidden;
		background: var(--bg-card);
	}

	.roster-body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: var(--spacing-sm);
		padding: var(--spacing-sm) var(--spacing-sm) var(--spacing-sm) var(--spacing-md);
	}

	.player-name,
	.player-name-input {
		flex: 65 1 0;
		min-width: 0;
		font-size: var(--font-size-xl);
		font-weight: 700;
		line-height: 1.2;
		overflow-wrap: anywhere;
		color: var(--text-primary);
	}

	.player-name-input {
		min-height: 32px;
		padding: 0.2rem 0.4rem;
		box-sizing: border-box;
		color: var(--text-input);
		background: var(--bg-input);
		caret-color: var(--accent-primary);
	}

	.row-actions {
		flex: 35 1 0;
		min-width: 0;
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		align-items: center;
		gap: 4px;
	}

	.row-actions .btn-compact {
		min-height: 28px;
		padding: 0.15rem 0.45rem;
	}

	.row-actions .btn-compact.is-busy {
		opacity: 0.7;
		transform: scale(0.96);
	}

	.row-actions .btn-compact.is-done {
		color: var(--accent-success);
		border-color: var(--accent-success);
		background: rgba(0, 255, 65, 0.14);
	}

	.regen-busy {
		width: 12px;
		height: 12px;
		display: block;
		border: 2px solid currentColor;
		border-right-color: transparent;
		border-radius: 50%;
		animation: regen-spin 0.55s linear infinite;
	}

	.regen-check {
		width: 14px;
		height: 14px;
		display: block;
	}

	@keyframes regen-spin {
		to {
			transform: rotate(360deg);
		}
	}

	.seed-compact {
		width: 3.25rem;
		min-width: 3.25rem;
		min-height: 28px;
		padding: 0.15rem 0.25rem;
		font-size: var(--font-size-xs);
		box-sizing: border-box;
	}

	.order-controls {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		align-items: stretch;
		flex-shrink: 0;
		width: 36px;
		align-self: stretch;
	}

	.order-btn {
		width: 36px;
		height: 36px;
		min-height: 36px;
		padding: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: var(--bg-secondary);
		color: var(--text-primary);
		border: 1px solid var(--border-default);
		border-right: none;
		border-radius: 0;
		cursor: pointer;
	}

	.order-btn:first-child {
		border-top: none;
	}

	.order-btn:last-child {
		border-bottom: none;
	}

	.order-btn:hover:not(:disabled) {
		border-color: var(--accent-primary);
		color: var(--accent-primary);
	}

	.order-btn:disabled {
		opacity: 1;
		color: var(--text-muted);
		background: var(--bg-primary);
		cursor: not-allowed;
	}

	.order-icon {
		width: 16px;
		height: 16px;
		fill: currentColor;
	}

	.page-nav {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-sm);
		margin: var(--spacing-sm) 0;
	}

	.court-actions {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--spacing-sm);
	}

	@media (min-width: 700px) {
		.court-actions {
			grid-template-columns: repeat(auto-fit, minmax(160px, auto));
		}
	}

	.court-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: var(--spacing-sm);
	}

	.court-card {
		border: 2px solid var(--border-default);
		border-radius: var(--radius-md);
		padding: var(--spacing-sm);
		min-height: 120px;
		transition:
			border-color var(--transition-fast),
			box-shadow var(--transition-fast);
	}

	.court-card.uneven {
		border-color: var(--accent-warning);
	}

	.court-card.drop-ok {
		border-color: var(--accent-success, #3c3);
		box-shadow: 0 0 0 3px rgba(0, 255, 65, 0.35);
	}

	.court-card.drop-blocked {
		opacity: 0.45;
	}

	.tile {
		background: var(--bg-secondary);
		padding: var(--spacing-xs);
		margin: 4px 0;
		border-radius: var(--radius-sm);
		cursor: grab;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--spacing-sm);
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
		-webkit-touch-callout: none;
		transition:
			transform 0.12s ease,
			box-shadow 0.12s ease,
			opacity 0.12s ease;
	}

	.tile.pressing {
		transform: scale(1.03);
		box-shadow: 0 4px 14px rgba(0, 0, 0, 0.28);
	}

	.tile.locked {
		cursor: default;
	}

	.tile.lift {
		opacity: 0.4;
		transform: scale(1.05) rotate(-1.5deg);
		box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
		cursor: grabbing;
		z-index: 2;
	}

	.tile.lift select {
		pointer-events: none;
	}

	.drag-ghost {
		position: fixed;
		pointer-events: none;
		z-index: 80;
		transform: translate(-50%, -120%) scale(1.08) rotate(-2deg);
		background: var(--bg-card);
		color: var(--text-primary);
		border: 2px solid var(--accent-primary);
		border-radius: var(--radius-sm);
		padding: var(--spacing-xs) var(--spacing-sm);
		font-weight: 700;
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
	}

	.tile select {
		width: auto;
		min-width: 3.5rem;
		padding: var(--spacing-xs);
	}

	.drop-hint {
		color: var(--accent-success, #3c3);
		font-weight: 600;
		margin: 0;
	}

	.error {
		color: var(--accent-error);
	}

	.danger {
		margin-top: var(--spacing-xl);
		border-top: 1px solid var(--accent-error);
		padding-top: var(--spacing-md);
	}

	.lock,
	.hint {
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
	}
</style>
