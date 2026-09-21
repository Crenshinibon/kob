<script lang="ts">
	import { getTournamentData, type CourtDisplayData } from './tournament-data.remote';
	import { afterNavigate } from '$app/navigation';
	import * as m from '$lib/paraglide/messages';
	import { localizeHref } from '$lib/paraglide/runtime';
	import {
		startTournamentForm,
		closeRoundForm,
		reopenLastRoundForm,
		updateManualRankOrder,
		setCourtLabel
	} from './tournament-actions.remote';
	import { updateRoundCount, updateTournamentSettings } from './manage/manage-actions.remote';
	import { resolve } from '$app/paths';
	import {
		calculateCourtSizes,
		calculateRoundCount,
		normalizeTieBreakConfig,
		type TieBreakConfig,
		type TieBreakFactorId,
		type ManualTieGroupDisplay,
		type PlayerTieBreakValues
	} from '$lib/tournament-logic';
	import CourtQRCode from '$lib/components/CourtQRCode.svelte';
	import RangeSlider from '$lib/components/RangeSlider.svelte';
	import TieBreakFactorIcons from '$lib/components/TieBreakFactorIcons.svelte';
	import { TIE_BREAK_OUTCOME_COLORS } from '$lib/court-colors';
	import { formatDiff, formatPoints } from '$lib/i18n/format';

	let { data } = $props<{
		data: {
			tournamentId: number;
			tournament: {
				id: number;
				name: string;
				status: string;
				numRounds: number;
				pointsToWin?: number;
				setsToWin?: number;
				decidingSetPoints?: number;
				scoringOverrides?: Record<
					string,
					{ pointsToWin?: number; setsToWin?: number; decidingSetPoints?: number }
				> | null;
			};
		};
	}>();

	let viewRound = $state<number | null>(null);
	let closingRound = $state(false);
	let startCheckedInOnly = $state(false);

	const tournamentQuery = $derived(
		getTournamentData({
			tournamentId: data.tournamentId,
			viewRound: viewRound ?? undefined
		})
	);
	const setupPoll = $derived(tournamentQuery.current?.tournament?.status === 'setup');
	const SETUP_CHECKIN_POLL_MS = 2000;
	const DEFAULT_POLL_MS = 5000;

	afterNavigate(() => {
		tournamentQuery.refresh().catch(() => {});
	});

	function refreshTournamentIfVisible(): void {
		if (document.hidden) return;
		tournamentQuery.refresh().catch(() => {});
	}

	$effect(() => {
		if (closingRound) {
			return;
		}
		const q = tournamentQuery;
		const ms = setupPoll ? SETUP_CHECKIN_POLL_MS : DEFAULT_POLL_MS;
		const interval = setInterval(() => {
			q.refresh().catch(() => {});
		}, ms);
		return () => clearInterval(interval);
	});

	function tieBreakFactorLabel(id: TieBreakFactorId): string {
		const labels: Record<TieBreakFactorId, () => string> = {
			round_points: m.tie_break_factor_round_points,
			round_diff: m.tie_break_factor_round_diff,
			total_points: m.tie_break_factor_total_points,
			total_diff: m.tie_break_factor_total_diff,
			initial_order: m.tie_break_factor_initial_order,
			dice: m.tie_break_factor_dice,
			manual: m.tie_break_factor_manual
		};
		return labels[id]();
	}

	function courtHasTieBreakIcons(court: CourtDisplayData): boolean {
		return court.standings.some((s) => s.tiedFactors.length > 0 || s.decidingFactor);
	}

	function outcomeRankColor(
		outcome: CourtDisplayData['standings'][number]['decidingOutcome']
	): string | null {
		return outcome ? TIE_BREAK_OUTCOME_COLORS[outcome] : null;
	}

	function formatFactorValue(factor: TieBreakFactorId, values: PlayerTieBreakValues): string {
		if (factor === 'round_points' || factor === 'total_points') {
			return formatPoints(values[factor] ?? 0);
		}
		if (factor === 'round_diff' || factor === 'total_diff') {
			return formatDiff(values[factor] ?? 0);
		}
		if (factor === 'initial_order') {
			return String(values.initial_order ?? '—');
		}
		return '—';
	}

	function getServerManualRankOrder(court: CourtDisplayData): number[] {
		if (court.manualRankOrder?.length === court.players.length) return [...court.manualRankOrder];
		if (court.standings.length > 0) return court.standings.map((s) => s.playerId);
		return court.players.map((p) => p.id);
	}

	function getDraftManualRankOrder(court: CourtDisplayData): number[] {
		return draftManualRankOrders.get(court.rotationId) ?? getServerManualRankOrder(court);
	}

	function findManualTieGroup(
		court: CourtDisplayData,
		playerId: number
	): ManualTieGroupDisplay | undefined {
		return court.manualTieGroups.find((g) => g.playerIds.includes(playerId));
	}

	let manualTieDialogCourt = $state<CourtDisplayData | null>(null);
	let manualTieDialogEl = $state<HTMLDialogElement | null>(null);
	let draftManualRankOrders = $state(new Map<number, number[]>());
	let savingManualRankRotationId = $state<number | null>(null);
	let manualRankError = $state<string | null>(null);

	function openManualTieDialog(court: CourtDisplayData) {
		manualRankError = null;
		manualTieDialogCourt = court;
		draftManualRankOrders = new Map(draftManualRankOrders).set(
			court.rotationId,
			getServerManualRankOrder(court)
		);
		manualTieDialogEl?.showModal();
	}

	function closeManualTieDialog() {
		if (manualTieDialogCourt) {
			const next = new Map(draftManualRankOrders);
			next.delete(manualTieDialogCourt.rotationId);
			draftManualRankOrders = next;
		}
		manualTieDialogCourt = null;
		manualRankError = null;
		manualTieDialogEl?.close();
	}

	function moveManualRankDraft(playerId: number, direction: -1 | 1) {
		const court = manualTieDialogCourt;
		if (!court || savingManualRankRotationId === court.rotationId) return;

		const group = findManualTieGroup(court, playerId);
		if (!group) return;

		const order = [...getDraftManualRankOrder(court)];
		const idx = order.indexOf(playerId);
		const next = idx + direction;
		if (idx === -1 || next < 0 || next >= order.length) return;
		if (!group.playerIds.includes(order[next])) return;

		[order[idx], order[next]] = [order[next], order[idx]];
		draftManualRankOrders = new Map(draftManualRankOrders).set(court.rotationId, order);
	}

	async function saveManualRankDraft() {
		const court = manualTieDialogCourt;
		if (!court || savingManualRankRotationId != null) return;

		const order = getDraftManualRankOrder(court);
		savingManualRankRotationId = court.rotationId;
		manualRankError = null;

		try {
			await updateManualRankOrder({ rotationId: court.rotationId, playerIds: order });
			const next = new Map(draftManualRankOrders);
			next.delete(court.rotationId);
			draftManualRankOrders = next;
			manualTieDialogCourt = null;
			manualTieDialogEl?.close();
			await tournamentQuery.refresh();
		} catch (err) {
			manualRankError = err instanceof Error ? err.message : m.err_manual_rank_invalid();
		} finally {
			savingManualRankRotationId = null;
		}
	}

	function manualTieGroupCount(court: CourtDisplayData): number {
		return court.manualTieGroups.length;
	}

	function manualTiedPlayerCount(court: CourtDisplayData): number {
		return court.manualTieGroups.reduce((sum, group) => sum + group.playerIds.length, 0);
	}

	const manualTieBreakEnabled = $derived(
		normalizeTieBreakConfig(
			(tournamentQuery.current?.tournament?.tieBreakConfig as TieBreakConfig | null) ?? null
		).factors.some((f) => f.id === 'manual' && f.enabled)
	);

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

	function handleLabelSave(courtId: number, value: string) {
		setCourtLabel({ courtId, label: value });
	}

	let labelTimers = $state<Map<number, ReturnType<typeof setTimeout>>>(new Map());

	async function savePhysicalCourts(count: number): Promise<void> {
		await updateTournamentSettings({
			tournamentId: data.tournamentId,
			physicalCourtCount: count
		});
		await tournamentQuery.refresh();
	}

	async function saveRoundCount(count: number): Promise<void> {
		await updateRoundCount({
			tournamentId: data.tournamentId,
			numRounds: count
		});
		await tournamentQuery.refresh();
	}
</script>

<svelte:document onvisibilitychange={refreshTournamentIfVisible} />

{#if tournamentQuery.current}
	{@const state = tournamentQuery.current}
	{@const tournament = state?.tournament}
	{@const courts = state?.courts ?? []}
	{@const currentRound = state?.currentRound ?? 0}
	{@const viewRoundNum = state?.viewRound ?? currentRound}
	{@const isViewingPastRound = state?.isViewingPastRound ?? false}
	{@const isViewingCurrentRound = state?.isViewingCurrentRound ?? true}
	{@const totalRounds = state?.totalRounds ?? tournament?.numRounds ?? 0}
	{@const canCloseRound = state?.canCloseRound ?? false}
	{@const isFinalRound = state?.isFinalRound ?? false}
	{@const hasScores = state?.hasScores ?? false}
	{@const courtSizes = state?.courtSizes ?? []}
	{@const physicalCourtCount = state?.physicalCourtCount ?? 4}
	{@const shifts = state?.shifts ?? []}
	{@const roundDuration = state?.roundDuration ?? 0}
	{@const isActive = tournament?.status === 'active'}
	{@const isSetup = tournament?.status === 'setup'}
	{@const checkedInCount = state?.checkedInCount ?? 0}
	{@const checkInUsed = state?.checkInUsed ?? false}
	{@const setupActiveCount = state?.activePlayerCount ?? 0}
	{@const setupCourtSizes = setupActiveCount >= 4 ? calculateCourtSizes(setupActiveCount) : []}
	{@const setupCanStartCheckedIn =
		checkInUsed && checkedInCount > 0 && checkedInCount < setupActiveCount}
	{@const setupStartCount =
		setupCanStartCheckedIn && startCheckedInOnly ? checkedInCount : setupActiveCount}
	{@const virtualCourtCount = courtSizes.length}
	{@const frozenCourts = state?.frozenCourts ?? []}

	{#if !tournament}
		<div class="loading">{m.loading_tournament()}</div>
	{:else if state.error}
		<div class="error">{state.error}</div>
	{:else}
		<main>
			<header>
				<a href={localizeHref(resolve('/'))}>{m.dashboard_btn()}</a>
				<h1>{tournament.name}</h1>
				{#if isSetup}
					<p class="status-setup">{m.status_setup()}</p>
				{:else if isActive}
					<p>{m.round_label({ current: currentRound, total: tournament.numRounds })}</p>
				{:else}
					<p class="status-completed">{m.completed()}</p>
				{/if}
				<nav class="ops-nav" data-testid="ops-nav" aria-label={m.ops_nav_label()}>
					<a
						href={localizeHref(resolve('/tournament/[id]/manage', { id: String(tournament.id) }))}
						class="btn-secondary">{m.manage_title()}</a
					>
					<a
						href={localizeHref(resolve('/tournament/[id]/check-in', { id: String(tournament.id) }))}
						class="btn-secondary">{m.checkin_title()}</a
					>
					<a
						href={localizeHref(
							resolve('/tournament/[id]/standings', { id: String(tournament.id) })
						)}
						class="btn-secondary">{m.view_standings()}</a
					>
				</nav>
			</header>

			{#if isSetup}
				<section class="setup-panel" data-testid="setup-panel">
					<p class="status-setup">{m.status_setup()}</p>
					<p>{m.setup_player_count({ count: setupActiveCount })}</p>
					{#if checkInUsed}
						<p data-testid="setup-checked-in-count">
							{m.setup_checked_in_count({ checked: checkedInCount, total: setupActiveCount })}
						</p>
					{/if}
					{#if setupCourtSizes.length > 0}
						<p>
							{m.setup_courts_at_start({
								layout: setupCourtSizes.map((s) => `${s}p`).join(' + '),
								courts: setupCourtSizes.length
							})}
						</p>
						<p>
							{m.setup_rounds_duration({
								rounds:
									tournament.formatType === 'preseed' && tournament.status !== 'setup'
										? calculateRoundCount(setupCourtSizes.length, 'preseed')
										: setupCourtSizes.length === 1
											? 1
											: tournament.numRounds
							})}
						</p>
						<div class="setup-fields">
							{#if tournament.formatType === 'random-seed' || tournament.status === 'setup'}
								<label>
									{m.manage_rounds_label()}: {m.range_rounds_value({
										count: tournament.numRounds
									})}
									<RangeSlider
										id="setup-num-rounds"
										min={1}
										max={10}
										value={tournament.numRounds}
										testId="setup-num-rounds"
										disabled={setupCourtSizes.length === 1}
										formatCurrent={(n) => m.range_rounds_value({ count: n })}
										onchange={(n) => saveRoundCount(n)}
									/>
								</label>
							{/if}
							<label>
								{m.manage_physical_courts()}
								<RangeSlider
									id="setup-physical-courts"
									min={1}
									max={16}
									value={physicalCourtCount}
									testId="setup-physical-courts"
									formatCurrent={(n) => m.range_courts_value({ count: n })}
									onchange={(n) => savePhysicalCourts(n)}
								/>
							</label>
						</div>
					{:else}
						<p>{m.setup_start_needs_players({ count: 4 })}</p>
					{/if}
					<p>
						<a
							href={localizeHref(resolve('/tournament/[id]/manage', { id: String(tournament.id) }))}
							>{m.setup_manage_link()}</a
						>
						·
						<a
							href={localizeHref(
								resolve('/tournament/[id]/check-in', { id: String(tournament.id) })
							)}>{m.setup_checkin_link()}</a
						>
					</p>
					<form {...startTournamentForm}>
						<input type="hidden" name="n:tournamentId" value={tournament.id} />
						{#if setupCanStartCheckedIn}
							<label>
								<input
									type="radio"
									name="b:checkedInOnly"
									value="false"
									checked={!startCheckedInOnly}
									onchange={() => (startCheckedInOnly = false)}
								/>
								{m.setup_start_all({ count: setupActiveCount })}
							</label>
							<label>
								<input
									type="radio"
									name="b:checkedInOnly"
									value="true"
									data-testid="start-checked-in-only"
									checked={startCheckedInOnly}
									onchange={() => (startCheckedInOnly = true)}
								/>
								{m.setup_start_checked_in_only({ count: checkedInCount })}
							</label>
							<p class="hint">
								{m.setup_start_removes_note({ count: setupActiveCount - checkedInCount })}
							</p>
						{:else}
							<input type="hidden" name="b:checkedInOnly" value="false" />
						{/if}
						<button
							type="submit"
							class="btn-primary"
							data-testid="start-tournament"
							disabled={setupStartCount < 4 || !!startTournamentForm.pending}
						>
							{m.setup_start_button()}
						</button>
					</form>
				</section>
			{/if}

			{#if !isSetup && totalRounds > 0}
				<nav class="round-stepper" aria-label={m.round_stepper_label()}>
					{#each Array.from({ length: totalRounds }, (_, i) => i + 1) as roundNum (roundNum)}
						{@const isFuture = isActive && roundNum > currentRound}
						{@const isSelected = roundNum === viewRoundNum}
						{@const isComplete = !isActive || roundNum < currentRound}
						{#if roundNum > 1}
							<span class="stepper-arrow" aria-hidden="true">→</span>
						{/if}
						<button
							type="button"
							class="stepper-step"
							class:selected={isSelected}
							class:complete={isComplete}
							class:current={isActive && roundNum === currentRound}
							disabled={isFuture}
							onclick={() => {
								viewRound = roundNum;
							}}
						>
							{m.round_stepper_round({ n: roundNum })}
						</button>
					{/each}
				</nav>
			{/if}

			{#if isViewingPastRound}
				<div class="past-round-banner">
					<p>{m.viewing_past_round({ round: viewRoundNum })}</p>
					{#if isActive}
						<button type="button" class="btn-link" onclick={() => (viewRound = currentRound)}>
							{m.back_to_current_round()}
						</button>
					{/if}
				</div>
			{/if}

			{#if isActive && currentRound > 0 && isViewingCurrentRound}
				<div class="scheduling-info">
					<h3>{m.court_scheduling({ round: currentRound })}</h3>
					<p>
						{m.scheduling_batch_info({
							physical: physicalCourtCount,
							groups: virtualCourtCount,
							shifts: Math.ceil(virtualCourtCount / physicalCourtCount)
						})}
					</p>
					<label class="physical-courts-field">
						{m.manage_physical_courts()}
						<RangeSlider
							id="ops-physical-courts"
							min={1}
							max={16}
							value={physicalCourtCount}
							testId="ops-physical-courts"
							formatCurrent={(n) => m.range_courts_value({ count: n })}
							onchange={(n) => savePhysicalCourts(n)}
						/>
					</label>
					{#if roundDuration}
						<p class="round-dur">{m.est_round_duration({ minutes: roundDuration })}</p>
					{/if}
					{#if shifts.length > 1}
						<div class="shift-list">
							{#each shifts as _shift, si (si)}
								<span class="shift-badge" class:active={si === 0}
									>{m.shift_label({ current: si + 1, total: shifts.length })}</span
								>
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			<section class="courts">
				{#each courts as court (court.courtNumber)}
					<div class="court-card">
						<div class="court-header">
							<h2>{m.court_label({ number: court.courtNumber })}</h2>
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
								{#if court.manualAdjustedAt}
									<span class="adjusted-badge" data-testid="adjusted-{court.courtNumber}">
										{m.manage_adjusted_badge()}
									</span>
								{/if}
								{#if court.shift && court.totalShifts && court.totalShifts > 1}
									<span
										class="shift-badge"
										class:active={court.shift === 1}
										class:waiting={court.shift > 1}
									>
										{court.shift === 1
											? m.shift_active()
											: m.shift_count({ current: court.shift, total: court.totalShifts })}
									</span>
									{#if court.waitLabel}
										<span class="wait-time">{m.est_wait({ wait: court.waitLabel })}</span>
									{/if}
								{/if}
							</div>
						</div>

						<label class="court-label-row">
							<span class="court-label-prefix">{m.physical_court_label()}</span>
							<input
								type="text"
								class="court-label-input"
								placeholder={m.physical_court_placeholder()}
								value={court.label ?? ''}
								oninput={(e) => {
									const tid = court.courtId;
									const timerId = setTimeout(() => {
										handleLabelSave(tid, e.currentTarget.value);
									}, 500);
									const existing = labelTimers.get(tid);
									if (existing) clearTimeout(existing);
									labelTimers = new Map([...labelTimers, [tid, timerId]]);
								}}
								onblur={(e) => {
									const tid = court.courtId;
									const existing = labelTimers.get(tid);
									if (existing) clearTimeout(existing);
									handleLabelSave(tid, e.currentTarget.value);
								}}
							/>
						</label>

						{#if court.token}
							<CourtQRCode token={court.token} courtNumber={court.courtNumber} />
						{/if}

						<div class="players">
							{#if court.standings.length > 0}
								<h4 class="court-standings-heading">{m.court_standings_heading()}</h4>
								{#if courtHasTieBreakIcons(court)}
									<p class="standings-legend">{m.tie_break_standings_legend()}</p>
								{/if}
								{#each court.standings as s (s.playerId)}
									<span
										class="player standing-entry"
										class:retired={court.players.find((p) => p.id === s.playerId)?.retired}
									>
										<span
											class="standing-rank"
											style={outcomeRankColor(s.decidingOutcome)
												? `color: ${outcomeRankColor(s.decidingOutcome)}`
												: undefined}>{s.rank}.</span
										>
										<span class="standing-name">{s.name}</span>
										{#if court.players.find((p) => p.id === s.playerId)?.retired}
											<span class="retired-badge">{m.retired_badge()}</span>
										{/if}
										<TieBreakFactorIcons
											tiedFactors={s.tiedFactors}
											decidingFactor={s.decidingFactor}
											decidingOutcome={s.decidingOutcome}
											getLabel={tieBreakFactorLabel}
										/>
									</span>
								{/each}
							{:else}
								{#each court.players as p, i (p.id)}
									<span class="player" class:retired={p.retired}>
										{String.fromCharCode(65 + i)}: {p.name}
										{#if p.retired}
											<span class="retired-badge">{m.retired_badge()}</span>
										{/if}
									</span>
								{/each}
							{/if}
						</div>

						{#if court.token}
							<div class="qr-link">
								<a
									href={localizeHref(resolve('/court/[token]', { token: String(court.token) }))}
									target="_blank">{m.open_court_page()}</a
								>
							</div>
						{/if}

						{#if manualTieBreakEnabled && isViewingCurrentRound && court.manualTieGroups.length > 0}
							<button
								type="button"
								class="btn-manual-tie"
								onclick={() => openManualTieDialog(court)}
							>
								{m.manual_rank_open({
									groups: manualTieGroupCount(court),
									players: manualTiedPlayerCount(court)
								})}
							</button>
						{/if}
					</div>
				{/each}
			</section>

			{#if frozenCourts.length > 0}
				<section class="frozen-courts">
					<h2>{m.frozen_courts_title()}</h2>
					<p class="frozen-info">{m.frozen_courts_info()}</p>
					<div class="frozen-list">
						{#each frozenCourts as fc (fc.courtNumber)}
							<div class="frozen-badge">
								{m.court_label({ number: fc.courtNumber })}
								<span class="frozen-round"
									>{m.frozen_after_round({ round: fc.freezeAfterRound })}</span
								>
							</div>
						{/each}
					</div>
				</section>
			{/if}

			<section class="actions">
				{#if isViewingCurrentRound && isActive}
					<form
						{...closeRoundForm.enhance(async ({ submit }) => {
							if (!canCloseRound) return;
							closingRound = true;
							try {
								await submit();
							} finally {
								closingRound = false;
							}
						})}
					>
						<input {...closeRoundForm.fields.tournamentId.as('hidden', tournament.id)} />
						{#if canCloseRound}
							<button type="submit" class="btn-primary" disabled={closingRound}>
								{isFinalRound ? m.finalize_tournament() : m.close_round()}
							</button>
						{:else}
							<button type="button" disabled class="btn-primary">{m.waiting_scores()}</button>
						{/if}
					</form>
				{/if}

				{#if (isActive && currentRound >= 2 && isViewingCurrentRound && !hasScores) || tournament?.status === 'completed'}
					<form
						{...reopenLastRoundForm.enhance(async ({ submit }) => {
							await submit();
							await tournamentQuery.refresh();
						})}
					>
						<input {...reopenLastRoundForm.fields.tournamentId.as('hidden', tournament.id)} />
						<button type="submit" class="btn-secondary" data-testid="reopen-last-round">
							{m.manage_reopen_round()}
						</button>
					</form>
				{:else if isActive && currentRound >= 2 && hasScores && isViewingCurrentRound}
					<p class="hint">{m.manage_reopen_clear_scores_first()}</p>
				{/if}

				{#if isActive}
					<p class="ops-back-office" data-testid="ops-back-office">
						{m.ops_back_office_hint()}
						<a
							href={localizeHref(
								resolve('/tournament/[id]/manage', { id: String(tournament.id) })
							) + '#rules'}>{m.manage_tab_rules()}</a
						>
						·
						<a
							href={localizeHref(
								resolve('/tournament/[id]/manage', { id: String(tournament.id) })
							) + '#players'}>{m.manage_tab_players()}</a
						>
					</p>
				{/if}
			</section>

			<dialog
				bind:this={manualTieDialogEl}
				class="manual-tie-dialog"
				oncancel={(e) => {
					e.preventDefault();
					closeManualTieDialog();
				}}
				onclick={(e) => {
					if (e.target === manualTieDialogEl) closeManualTieDialog();
				}}
			>
				{#if manualTieDialogCourt}
					{@const court = manualTieDialogCourt}
					{@const isSaving = savingManualRankRotationId === court.rotationId}
					<header class="manual-tie-dialog-header">
						<h3>{m.manual_rank_dialog_title({ court: court.courtNumber })}</h3>
						<button
							type="button"
							class="dialog-close"
							aria-label={m.manual_rank_cancel()}
							disabled={isSaving}
							onclick={closeManualTieDialog}>×</button
						>
					</header>
					<p class="manual-rank-hint">{m.manual_rank_hint()}</p>
					{#each court.manualTieGroups as group, gi (gi)}
						<div class="manual-tie-group">
							<h4>{m.manual_rank_tied_group({ count: group.playerIds.length })}</h4>
							{#if group.factors.length > 0}
								<table class="manual-factor-table">
									<thead>
										<tr>
											<th>{m.standings_player()}</th>
											{#each group.factors as factor (factor)}
												<th>{tieBreakFactorLabel(factor)}</th>
											{/each}
										</tr>
									</thead>
									<tbody>
										{#each getDraftManualRankOrder(court).filter( (id) => group.playerIds.includes(id) ) as pid (pid)}
											{@const pname = court.players.find((p) => p.id === pid)?.name ?? ''}
											<tr>
												<td>{pname}</td>
												{#each group.factors as factor (factor)}
													<td>{formatFactorValue(factor, group.values[pid] ?? {})}</td>
												{/each}
											</tr>
										{/each}
									</tbody>
								</table>
							{/if}
							<ul class="manual-rank-order">
								{#each getDraftManualRankOrder(court).filter( (id) => group.playerIds.includes(id) ) as pid, mi (pid)}
									{@const pname = court.players.find((p) => p.id === pid)?.name ?? ''}
									<li>
										<span class="manual-rank-position">{mi + 1}.</span>
										<span class="manual-rank-name">{pname}</span>
										<div class="manual-rank-actions">
											<button
												type="button"
												class="btn-small"
												disabled={isSaving || mi === 0}
												onclick={() => moveManualRankDraft(pid, -1)}
												>{m.manual_rank_move_up()}</button
											>
											<button
												type="button"
												class="btn-small"
												disabled={isSaving || mi === group.playerIds.length - 1}
												onclick={() => moveManualRankDraft(pid, 1)}
												>{m.manual_rank_move_down()}</button
											>
										</div>
									</li>
								{/each}
							</ul>
						</div>
					{/each}
					{#if manualRankError}
						<p class="manual-rank-error">{manualRankError}</p>
					{/if}
					<footer class="manual-tie-dialog-footer">
						<button
							type="button"
							class="btn-secondary"
							disabled={isSaving}
							onclick={closeManualTieDialog}
						>
							{m.manual_rank_cancel()}
						</button>
						<button
							type="button"
							class="btn-primary"
							disabled={isSaving}
							onclick={saveManualRankDraft}
						>
							{#if isSaving}
								{m.court_saving()}
							{:else}
								{m.manual_rank_save()}
							{/if}
						</button>
					</footer>
				{/if}
			</dialog>
		</main>
	{/if}
{:else if tournamentQuery.error}
	<div class="error">
		{m.failed_load_tournament({ error: tournamentQuery.error?.message ?? 'Unknown error' })}
	</div>
{:else}
	<div class="loading">{m.loading_tournament()}</div>
{/if}

<style>
	.loading,
	.error {
		text-align: center;
		padding: var(--spacing-xl);
		font-size: var(--font-size-lg);
		max-width: 1200px;
		margin: 0 auto;
	}

	.error {
		color: var(--accent-error);
	}

	main {
		max-width: 1200px;
		margin: 0 auto;
	}

	.setup-panel {
		margin: var(--spacing-lg) 0;
		padding: var(--spacing-md);
		background: var(--bg-secondary);
		border-radius: var(--radius-md);
	}

	.setup-panel form {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
		margin-top: var(--spacing-md);
	}

	.setup-fields,
	.physical-courts-field {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--spacing-md);
		margin: var(--spacing-md) 0;
		align-items: start;
	}

	@media (min-width: 600px) {
		.setup-fields {
			grid-template-columns: 1fr 1fr;
		}
	}

	.setup-fields label,
	.physical-courts-field {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
		font-weight: 600;
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
	}

	.setup-fields input,
	.physical-courts-field input {
		width: 100%;
		min-height: 44px;
		box-sizing: border-box;
	}

	.status-setup {
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.courts {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: var(--spacing-md);
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

	.court-label-row {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
		margin-bottom: var(--spacing-sm);
	}

	.court-label-prefix {
		font-size: var(--font-size-xs);
		color: var(--text-muted);
		flex-shrink: 0;
	}

	.court-label-input {
		flex: 1;
		background: transparent;
		border: 1px solid var(--border-default);
		border-radius: var(--radius-sm);
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
		padding: 2px var(--spacing-sm);
	}

	.court-label-input::placeholder {
		color: var(--text-muted);
		font-style: italic;
	}

	.court-label-input:focus {
		border-color: var(--accent-primary);
		outline: none;
	}

	.players {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-xs);
		margin-bottom: var(--spacing-md);
		flex-grow: 1;
	}

	.player {
		font-size: var(--font-size-xl);
		color: var(--text-secondary);
		background-color: var(--bg-secondary);
		padding: 2px 8px;
		border-radius: 4px;
		align-self: flex-start;
		line-height: 1.4;
	}

	.court-standings-heading {
		width: 100%;
		margin: 0 0 var(--spacing-xs);
		font-size: var(--font-size-sm);
		color: var(--text-muted);
		font-weight: 600;
	}

	.standings-legend {
		width: 100%;
		margin: 0 0 var(--spacing-sm);
		font-size: var(--font-size-xs);
		color: var(--text-muted);
		line-height: 1.4;
	}

	.standing-entry {
		display: inline-flex;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--spacing-xs);
		font-size: var(--font-size-base);
	}

	.standing-rank {
		font-weight: 700;
		color: var(--accent-info);
		min-width: 1.25rem;
	}

	.standing-name {
		font-weight: 600;
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

	.ops-back-office {
		margin: var(--spacing-sm) 0 0;
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
	}

	.ops-back-office a {
		color: var(--accent-primary);
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

	.ops-nav {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-sm);
		margin: var(--spacing-sm) 0 var(--spacing-md);
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

	.player.retired {
		opacity: 0.6;
		text-decoration: line-through;
	}

	.retired-badge {
		font-size: var(--font-size-xs);
		color: var(--accent-error);
		margin-left: 4px;
		font-weight: 700;
	}

	.frozen-courts {
		margin-top: var(--spacing-lg);
		margin-bottom: var(--spacing-lg);
		padding: var(--spacing-md);
		background-color: var(--bg-card);
		border: var(--border-thickness) solid var(--accent-warning);
		border-radius: var(--radius-md);
	}

	.frozen-courts h2 {
		margin: 0 0 var(--spacing-sm);
		color: var(--accent-warning);
		font-size: var(--font-size-lg);
	}

	.frozen-info {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
		margin-bottom: var(--spacing-md);
	}

	.frozen-list {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-sm);
	}

	.frozen-badge {
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-xs);
		padding: var(--spacing-xs) var(--spacing-sm);
		background-color: var(--bg-secondary);
		border: var(--border-thickness) solid var(--accent-warning);
		border-radius: var(--radius-sm);
		font-weight: 600;
		font-size: var(--font-size-sm);
		color: var(--text-primary);
	}

	.frozen-round {
		font-size: var(--font-size-xs);
		color: var(--text-muted);
		font-weight: 400;
	}

	.round-stepper {
		display: flex;
		align-items: center;
		justify-content: stretch;
		width: 100%;
		gap: var(--spacing-xs);
		margin: var(--spacing-md) 0;
		padding: var(--spacing-sm);
		background-color: var(--bg-secondary);
		border-radius: var(--radius-md);
		overflow-x: auto;
	}

	.stepper-step {
		flex: 1;
		min-width: 4.5rem;
		padding: var(--spacing-sm) var(--spacing-md);
		border: 2px solid var(--border-color);
		border-radius: var(--radius-sm);
		background-color: var(--bg-primary);
		color: var(--text-secondary);
		font-weight: 600;
		font-size: var(--font-size-sm);
		cursor: pointer;
		transition: all var(--transition-fast);
		white-space: nowrap;
	}

	.stepper-step:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.stepper-step.selected {
		border-color: var(--accent-info);
		color: var(--text-primary);
		background-color: color-mix(in srgb, var(--accent-info) 15%, var(--bg-primary));
	}

	.stepper-step.current {
		border-color: var(--accent-success);
	}

	.stepper-step.complete:not(.selected) {
		border-color: var(--accent-success);
		color: var(--accent-success);
	}

	.stepper-arrow {
		color: var(--text-muted);
		font-size: var(--font-size-sm);
		flex-shrink: 0;
	}

	.past-round-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--spacing-md);
		padding: var(--spacing-sm) var(--spacing-md);
		margin-bottom: var(--spacing-md);
		background-color: color-mix(in srgb, var(--accent-info) 12%, var(--bg-secondary));
		border: 1px solid var(--accent-info);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-sm);
	}

	.btn-manual-tie {
		width: 100%;
		margin-top: var(--spacing-sm);
		padding: var(--spacing-sm) var(--spacing-md);
		border: 1px solid var(--accent-warning);
		border-radius: var(--radius-sm);
		background: color-mix(in srgb, var(--accent-warning) 12%, var(--bg-primary));
		color: var(--text-primary);
		font-size: var(--font-size-sm);
		font-weight: 600;
		cursor: pointer;
		text-align: center;
	}

	.btn-manual-tie:hover {
		background: color-mix(in srgb, var(--accent-warning) 22%, var(--bg-primary));
	}

	.manual-tie-dialog {
		width: min(100%, 28rem);
		max-height: 90vh;
		margin: auto;
		padding: 0;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		background: var(--bg-primary);
		color: var(--text-primary);
		overflow-y: auto;
	}

	.manual-tie-dialog::backdrop {
		background: rgb(0 0 0 / 55%);
	}

	.manual-tie-dialog-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--spacing-sm);
		padding: var(--spacing-md);
		border-bottom: 1px solid var(--border-color);
	}

	.manual-tie-dialog-header h3 {
		margin: 0;
		font-size: var(--font-size-lg);
	}

	.dialog-close {
		border: none;
		background: transparent;
		color: var(--text-muted);
		font-size: 1.5rem;
		line-height: 1;
		cursor: pointer;
		padding: 0 var(--spacing-xs);
	}

	.manual-tie-dialog > :not(header):not(footer) {
		padding-left: var(--spacing-md);
		padding-right: var(--spacing-md);
	}

	.manual-tie-dialog .manual-rank-hint {
		padding-top: var(--spacing-sm);
	}

	.manual-tie-dialog-footer {
		display: flex;
		justify-content: flex-end;
		gap: var(--spacing-sm);
		padding: var(--spacing-md);
		border-top: 1px solid var(--border-color);
		margin-top: var(--spacing-md);
	}

	.manual-rank-error {
		color: var(--accent-danger);
		font-size: var(--font-size-sm);
		margin: 0 0 var(--spacing-sm);
	}

	.manual-rank-hint {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
		margin: 0 0 var(--spacing-sm);
	}

	.manual-tie-group {
		margin-bottom: var(--spacing-md);
	}

	.manual-tie-group h4 {
		margin: 0 0 var(--spacing-xs);
		font-size: var(--font-size-sm);
	}

	.manual-rank-order {
		list-style: none;
		padding: 0;
		margin: 0 0 var(--spacing-md);
	}

	.manual-rank-order li {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		font-size: var(--font-size-sm);
		margin-bottom: var(--spacing-xs);
	}

	.manual-rank-position {
		font-weight: 700;
		min-width: 1.5rem;
		color: var(--accent-info);
	}

	.manual-rank-name {
		flex: 1;
	}

	.manual-rank-actions {
		display: flex;
		gap: var(--spacing-xs);
	}

	.manual-factor-table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--font-size-sm);
		margin-bottom: var(--spacing-sm);
	}

	.manual-factor-table th,
	.manual-factor-table td {
		border: 1px solid var(--border-color);
		padding: 4px 6px;
		text-align: left;
	}

	.manual-factor-table th {
		color: var(--text-muted);
		font-weight: 600;
	}
</style>
