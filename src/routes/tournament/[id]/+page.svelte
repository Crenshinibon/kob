<script lang="ts">
	import { getTournamentData, type CourtDisplayData } from './tournament-data.remote';
	import * as m from '$lib/paraglide/messages';
	import { localizeHref } from '$lib/paraglide/runtime';
	import {
		closeRoundForm,
		deleteTournamentForm,
		updateScoringOverrides,
		updateTieBreakConfig,
		updateManualRankOrder,
		retirePlayer,
		reportInjury,
		undoRetirement,
		undoInjury,
		setCourtLabel
	} from './tournament-actions.remote';
	import { resolve } from '$app/paths';
	import {
		getEffectiveScoring,
		getMinPointsForSet,
		getScoringLabel,
		DEFAULT_TIE_BREAK_CONFIG,
		normalizeTieBreakConfig,
		type TieBreakConfig,
		type TieBreakFactorId,
		type ManualTieGroupDisplay,
		type PlayerTieBreakValues
	} from '$lib/tournament-logic';
	import CourtQRCode from '$lib/components/CourtQRCode.svelte';
	import TieBreakFactorIcons from '$lib/components/TieBreakFactorIcons.svelte';
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

	const tournamentQuery = $derived(
		getTournamentData({
			tournamentId: data.tournamentId,
			viewRound: viewRound ?? undefined
		})
	);

	$effect(() => {
		const interval = setInterval(() => {
			tournamentQuery.refresh().catch(() => {});
		}, 5000);
		return () => clearInterval(interval);
	});

	let editingScoring = $state(false);
	let editingTieBreak = $state(false);
	let localTieBreakFactors = $state<{ id: TieBreakFactorId; enabled: boolean }[]>(
		DEFAULT_TIE_BREAK_CONFIG.factors.map((f) => ({ id: f.id, enabled: f.enabled }))
	);

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

	function moveTieBreakFactor(index: number, direction: -1 | 1) {
		const next = index + direction;
		if (next < 0 || next >= localTieBreakFactors.length) return;
		const copy = [...localTieBreakFactors];
		[copy[index], copy[next]] = [copy[next], copy[index]];
		localTieBreakFactors = copy;
	}

	async function saveTieBreakConfig(tournamentId: number) {
		await updateTieBreakConfig({ tournamentId, factors: localTieBreakFactors });
		editingTieBreak = false;
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

	function getManualRankOrder(court: CourtDisplayData): number[] {
		if (court.manualRankOrder?.length === court.players.length) return [...court.manualRankOrder];
		if (court.standings.length > 0) return court.standings.map((s) => s.playerId);
		return court.players.map((p) => p.id);
	}

	function findManualTieGroup(
		court: CourtDisplayData,
		playerId: number
	): ManualTieGroupDisplay | undefined {
		return court.manualTieGroups.find((g) => g.playerIds.includes(playerId));
	}

	function moveManualRank(court: CourtDisplayData, playerId: number, direction: -1 | 1) {
		const group = findManualTieGroup(court, playerId);
		if (!group) return;

		const order = getManualRankOrder(court);
		const idx = order.indexOf(playerId);
		const next = idx + direction;
		if (idx === -1 || next < 0 || next >= order.length) return;
		if (!group.playerIds.includes(order[next])) return;

		[order[idx], order[next]] = [order[next], order[idx]];
		updateManualRankOrder({ rotationId: court.rotationId, playerIds: order });
	}

	const manualTieBreakEnabled = $derived(
		normalizeTieBreakConfig(
			(tournamentQuery.current?.tournament?.tieBreakConfig as TieBreakConfig | null) ?? null
		).factors.some((f) => f.id === 'manual' && f.enabled)
	);
	let localOverrides = $state<
		Record<
			string,
			{ pointsToWin?: number; winBy?: number; setsToWin?: number; decidingSetPoints?: number }
		>
	>({});
	let retirePlayerId = $state(0);
	let retireReason = $state('');
	let retireUseReplacement = $state(false);
	let replacementName = $state('');
	let replacementSeedPoints = $state(0);
	let injuryPlayerId = $state(0);
	let injuryOption = $state<'substitute' | 'cancel' | ''>('');
	let injuryUseReplacement = $state(false);
	let injuryReplacementName = $state('');
	let injuryReplacementSeedPoints = $state(0);
	let now = $state(Date.now());

	$effect(() => {
		const id = setInterval(() => {
			now = Date.now();
		}, 1000);
		return () => clearInterval(id);
	});

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
		if (!confirm(m.delete_tournament_confirm())) {
			e.preventDefault();
		}
	}

	function handleLabelSave(courtId: number, value: string) {
		setCourtLabel({ courtId, label: value });
	}

	let labelTimers = $state<Map<number, ReturnType<typeof setTimeout>>>(new Map());

	function isUndoableRetirement(rp: { retiredAt: Date | null; injuredAt: Date | null }): boolean {
		return (
			!!rp.retiredAt && !rp.injuredAt && now - new Date(rp.retiredAt).getTime() < 5 * 60 * 1000
		);
	}

	function computeInjuryUndo(
		rp: { id: number; name: string; injuredAt: Date | null; retiredAt: Date | null },
		courts: CourtDisplayData[]
	): { canUndoInjury: boolean; courtComplete: boolean } {
		const court = courts.find((c) => c.players.some((p) => p.id === rp.id));
		if (!court) return { canUndoInjury: false, courtComplete: false };
		// Determine injury type from match state:
		// - Cancel: some matches are isCanceled on this court
		// - Substitute: some matches have injuredPlayerIds for this player
		const hasCanceled = court.matches.some((m) => m.isCanceled);
		const hasInjuredFlag = court.matches.some((m) => (m.injuredPlayerIds ?? []).includes(rp.id));
		let hasProgressed = false;
		if (hasCanceled) {
			// For cancel: a scored + canceled match means fresh scores (pre-injury scores are not canceled)
			hasProgressed = court.matches.some((m) => m.teamAScore !== null && m.isCanceled);
		} else if (hasInjuredFlag) {
			// For substitute: a scored match with injuredPlayerIds means fresh scores
			hasProgressed = court.matches.some(
				(m) => m.teamAScore !== null && (m.injuredPlayerIds ?? []).includes(rp.id)
			);
		}
		return { canUndoInjury: !hasProgressed, courtComplete: court.isComplete };
	}
</script>

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
	{@const virtualCourtCount = courtSizes.length}
	{@const allCourtsComplete = state?.allCourtsComplete ?? false}
	{@const frozenCourts = state?.frozenCourts ?? []}
	{@const retiredPlayers = state?.retiredPlayers ?? []}
	{@const FIVE_MIN_MS = 5 * 60 * 1000}
	{@const eligibleInjuryPlayers = (() => {
		const result: { id: number; name: string; courtNumber: number }[] = [];
		for (const court of courts) {
			if (court.isComplete) continue;
			for (const p of court.players) {
				if (!p.retired) result.push({ id: p.id, name: p.name, courtNumber: court.courtNumber });
			}
		}
		return result;
	})()}
	{@const undoableRetirements = retiredPlayers.filter(
		(rp: { retiredAt: Date | null; injuredAt: Date | null }) => isUndoableRetirement(rp)
	)}
	{@const undoableInjuries = (() => {
		return retiredPlayers
			.filter(
				(rp: { injuredAt: Date | null; retiredAt: Date | null }) =>
					rp.injuredAt && rp.retiredAt && now - new Date(rp.injuredAt).getTime() < 5 * 60 * 1000
			)
			.map((rp: { id: number; name: string; injuredAt: Date | null; retiredAt: Date | null }) => {
				const undo = computeInjuryUndo(rp, courts);
				return { ...rp, ...undo };
			});
	})()}

	{#if !tournament}
		<div class="loading">{m.loading_tournament()}</div>
	{:else if state.error}
		<div class="error">{state.error}</div>
	{:else}
		<main>
			<header>
				<a href={localizeHref(resolve('/'))}>{m.dashboard_btn()}</a>
				<h1>{tournament.name}</h1>
				{#if isActive}
					<p>{m.round_label({ current: currentRound, total: tournament.numRounds })}</p>
				{:else}
					<p class="status-completed">{m.completed()}</p>
				{/if}
				<a
					href={localizeHref(resolve('/tournament/[id]/standings', { id: String(tournament.id) }))}
					class="standings-link">{m.view_standings()}</a
				>
			</header>

			{#if totalRounds > 0}
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
								{#each court.standings as s (s.playerId)}
									<span
										class="player standing-entry"
										class:retired={court.players.find((p) => p.id === s.playerId)?.retired}
									>
										<span class="standing-rank">{s.rank}.</span>
										<span class="standing-name">{s.name}</span>
										{#if court.players.find((p) => p.id === s.playerId)?.retired}
											<span class="retired-badge">{m.retired_badge()}</span>
										{/if}
										<TieBreakFactorIcons
											tiedFactors={s.tiedFactors}
											decidingFactor={s.decidingFactor}
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
								<a href={resolve('/court/[token]', { token: String(court.token) })} target="_blank"
									>{m.open_court_page()}</a
								>
							</div>
						{/if}

						{#if manualTieBreakEnabled && isViewingCurrentRound && court.manualTieGroups.length > 0}
							<div class="manual-rank">
								<h4>{m.manual_rank_heading()}</h4>
								<p class="manual-rank-hint">{m.manual_rank_hint()}</p>
								{#each court.manualTieGroups as group, gi (gi)}
									<div class="manual-tie-group">
										<h5>{m.manual_rank_tied_group({ count: group.playerIds.length })}</h5>
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
													{#each getManualRankOrder(court).filter((id) => group.playerIds.includes(id)) as pid (pid)}
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
										<ul>
											{#each getManualRankOrder(court).filter((id) => group.playerIds.includes(id)) as pid, mi (pid)}
												{@const pname = court.players.find((p) => p.id === pid)?.name ?? ''}
												<li>
													<span>{mi + 1}. {pname}</span>
													<button
														type="button"
														class="btn-small"
														disabled={mi === 0}
														onclick={() => moveManualRank(court, pid, -1)}
														>{m.manual_rank_move_up()}</button
													>
													<button
														type="button"
														class="btn-small"
														disabled={mi === group.playerIds.length - 1}
														onclick={() => moveManualRank(court, pid, 1)}
														>{m.manual_rank_move_down()}</button
													>
												</li>
											{/each}
										</ul>
									</div>
								{/each}
							</div>
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
				{#if isViewingCurrentRound}
					{#if canCloseRound}
						<form {...closeRoundForm}>
							<input {...closeRoundForm.fields.tournamentId.as('hidden', tournament.id)} />
							<button type="submit" class="btn-primary">
								{isFinalRound ? m.finalize_tournament() : m.close_round()}
							</button>
						</form>
					{:else if isActive}
						<button disabled class="btn-primary btn-disabled">{m.waiting_scores()}</button>
					{/if}
				{/if}

				{#if tournament.status !== 'completed'}
					<form
						{...deleteTournamentForm.enhance(async ({ submit }) => {
							try {
								await submit();
							} catch {
								// redirect happens on server
							}
						})}
						class="delete-form"
					>
						<input {...deleteTournamentForm.fields.tournamentId.as('hidden', tournament.id)} />
						<button type="submit" class="btn-danger" onclick={confirmDelete}
							>{m.delete_tournament()}</button
						>
					</form>
				{/if}
			</section>

			{#if isActive && isViewingCurrentRound && courtSizes.length > 0}
				<section class="scoring-section">
					<details>
						<summary class="scoring-header">{m.scoring_heading()}</summary>
						<p class="scoring-note">
							{m.scoring_override_hint()}
						</p>
						{#if editingScoring}
							<div class="scoring-grid">
								{#each courtSizes
									.filter((s, i, a) => a.indexOf(s) === i)
									.sort((a, b) => a - b) as size (size)}
									{@const effective = getEffectiveScoring(
										size,
										{
											pointsToWin: tournament.pointsToWin ?? 21,
											setsToWin: tournament.setsToWin ?? 1,
											decidingSetPoints: tournament.decidingSetPoints ?? 15,
											winBy: tournament.winBy ?? 2
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
											{m.create_points_to_win()}
											<input
												type="number"
												min="1"
												max="50"
												value={ovr.pointsToWin ??
													getMinPointsForSet(
														1,
														size,
														{
															pointsToWin: tournament.pointsToWin ?? 21,
															winBy: tournament.winBy ?? 2,
															setsToWin: tournament.setsToWin ?? 1,
															decidingSetPoints: tournament.decidingSetPoints ?? 15
														},
														tournament.scoringOverrides
													)}
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
											{m.create_win_by()}
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
											{m.create_sets_to_win()}
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
												{m.create_deciding_set_points()}
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
													decidingSetPoints: tournament.decidingSetPoints ?? 15,
													winBy: tournament.winBy ?? 2
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
										const merged: Record<
											string,
											{
												pointsToWin?: number;
												winBy?: number;
												setsToWin?: number;
												decidingSetPoints?: number;
											}
										> = { ...(tournament.scoringOverrides ?? {}) };
										for (const [k, v] of Object.entries(localOverrides)) {
											merged[k] = { ...(merged[k] ?? {}), ...v };
										}
										await updateScoringOverrides({
											tournamentId: tournament.id,
											overrides: merged
										});
										editingScoring = false;
										localOverrides = {};
									}}>{m.save_scoring()}</button
								>
								<button
									class="btn-secondary"
									onclick={() => {
										editingScoring = false;
										localOverrides = {};
									}}>{m.cancel()}</button
								>
							</div>
						{:else}
							<div class="scoring-summary">
								{#each courtSizes
									.filter((s, i, a) => a.indexOf(s) === i)
									.sort((a, b) => a - b) as size (size)}
									<span class="scoring-badge"
										>{size}p: {getScoringLabel(
											{
												pointsToWin: tournament.pointsToWin ?? 21,
												setsToWin: tournament.setsToWin ?? 1,
												decidingSetPoints: tournament.decidingSetPoints ?? 15,
												winBy: tournament.winBy ?? 2
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
									}}>{m.edit_btn()}</button
								>
							</div>
						{/if}
					</details>
				</section>
			{/if}

			{#if isActive && isViewingCurrentRound}
				<section class="tie-break-section">
					<details>
						<summary class="scoring-header">{m.tie_break_heading()}</summary>
						<p class="scoring-note">{m.tie_break_hint()}</p>
						<ul class="tie-break-list">
							{#each localTieBreakFactors as factor, fi (factor.id)}
								<li class="tie-break-item">
									<div class="tie-break-factor">
										<TieBreakFactorIcons
											factor={factor.id}
											size="large"
											getLabel={tieBreakFactorLabel}
										/>
										<label>
											<input
												type="checkbox"
												checked={factor.enabled}
												onchange={(e) => {
													localTieBreakFactors = localTieBreakFactors.map((f, i) =>
														i === fi ? { ...f, enabled: e.currentTarget.checked } : f
													);
													editingTieBreak = true;
												}}
											/>
											<span class="tie-break-label">{tieBreakFactorLabel(factor.id)}</span>
										</label>
									</div>
									<div class="tie-break-actions">
										<button
											type="button"
											class="btn-small"
											disabled={fi === 0}
											onclick={() => {
												moveTieBreakFactor(fi, -1);
												editingTieBreak = true;
											}}>{m.tie_break_move_up()}</button
										>
										<button
											type="button"
											class="btn-small"
											disabled={fi === localTieBreakFactors.length - 1}
											onclick={() => {
												moveTieBreakFactor(fi, 1);
												editingTieBreak = true;
											}}>{m.tie_break_move_down()}</button
										>
									</div>
								</li>
							{/each}
						</ul>
						{#if editingTieBreak}
							<button
								type="button"
								class="btn-primary"
								onclick={() => saveTieBreakConfig(tournament.id)}>{m.tie_break_save()}</button
							>
						{/if}
					</details>
				</section>
			{/if}

			{#if isActive && isViewingCurrentRound && currentRound > 0 && !hasScores}
				<section class="retire-section">
					<details>
						<summary class="btn-retire-header">{m.retire_player()}</summary>
						<div class="retire-form">
							<p class="retire-note">
								{m.retire_note()}
							</p>
							<div class="field">
								<label for="retirePlayerId">{m.retire_select_hint()}</label>
								<select id="retirePlayerId" bind:value={retirePlayerId} required>
									<option value="">{m.retire_select_placeholder()}</option>
									{#each courts as court (court.courtNumber)}
										{#each court.players as p (p.id)}
											{#if !p.retired}
												<option value={p.id}
													>{m.retire_player_option({
														name: p.name,
														group: court.courtNumber
													})}</option
												>
											{/if}
										{/each}
									{/each}
								</select>
							</div>
							<div class="field">
								<label for="retireReason">{m.retire_reason_label()}</label>
								<select id="retireReason" bind:value={retireReason}>
									<option value="">{m.retire_reason_placeholder()}</option>
									<option value="injury">{m.retire_reason_injury()}</option>
									<option value="schedule">{m.retire_reason_schedule()}</option>
									<option value="personal">{m.retire_reason_personal()}</option>
									<option value="disqualified">{m.retire_reason_disqualified()}</option>
									<option value="other">{m.retire_reason_other()}</option>
								</select>
							</div>
							<label class="checkbox-label">
								<input type="checkbox" bind:checked={retireUseReplacement} />
								{m.retire_use_replacement()}
							</label>
							{#if retireUseReplacement}
								<div class="field">
									<label for="replacementName">{m.retire_replacement_name()}</label>
									<input
										id="replacementName"
										type="text"
										bind:value={replacementName}
										required={retireUseReplacement}
									/>
								</div>
								{#if tournament?.formatType === 'preseed'}
									<div class="field">
										<label for="replacementSeed">{m.retire_replacement_seed()}</label>
										<input
											id="replacementSeed"
											type="number"
											min="0"
											bind:value={replacementSeedPoints}
										/>
									</div>
								{/if}
							{/if}
							<button
								class="btn-danger"
								onclick={async () => {
									if (!retirePlayerId) return;
									await retirePlayer({
										tournamentId: data.tournamentId,
										playerId: retirePlayerId,
										reason: retireReason || undefined,
										useReplacement: retireUseReplacement,
										replacementName: retireUseReplacement ? replacementName.trim() : undefined,
										replacementSeedPoints:
											retireUseReplacement && tournament?.formatType === 'preseed'
												? replacementSeedPoints
												: undefined
									});
									await tournamentQuery.refresh();
									retirePlayerId = 0;
									retireReason = '';
									retireUseReplacement = false;
									replacementName = '';
									replacementSeedPoints = 0;
								}}
							>
								{m.retire_confirm()}
							</button>

							{#if undoableRetirements.length > 0}
								<div class="undo-list">
									<span class="undo-label">{m.retire_undo_hint()}</span>
									{#each undoableRetirements as rp (rp.id)}
										{@const remaining = Math.max(
											0,
											FIVE_MIN_MS - (now - new Date(rp.retiredAt!).getTime())
										)}
										{@const secondsLeft = Math.ceil(remaining / 1000)}
										<div class="undo-item">
											<span class="undo-desc"
												>{m.retire_undo_seconds({ name: rp.name, seconds: secondsLeft })}</span
											>
											<button
												class="btn-undo"
												onclick={async () => {
													await undoRetirement({
														tournamentId: data.tournamentId,
														playerId: rp.id
													});
												}}>{m.retire_undo_btn()}</button
											>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					</details>
				</section>
			{/if}

			{#if isActive && isViewingCurrentRound && currentRound > 0 && hasScores && !allCourtsComplete}
				<section class="injury-section">
					<details>
						<summary class="btn-injury-header">{m.report_injury()}</summary>
						<div class="injury-form">
							<p class="injury-note">
								{m.injury_note()}
							</p>
							<div class="field">
								<label for="injuryPlayerId">{m.injury_select_player()}</label>
								<select id="injuryPlayerId" bind:value={injuryPlayerId} required>
									<option value="">{m.injury_select_placeholder()}</option>
									{#each eligibleInjuryPlayers as ep (ep.id)}
										<option value={ep.id}
											>{m.injury_player_label({ name: ep.name, court: ep.courtNumber })}</option
										>
									{/each}
								</select>
							</div>
							<div class="field">
								<span class="label-text">{m.injury_options_label()}</span>
								<div class="radio-group" role="radiogroup" aria-label={m.injury_options_label()}>
									<label class="radio-label">
										<input type="radio" bind:group={injuryOption} value="substitute" required />
										<span class="radio-title">{m.injury_substitute()}</span>
										<span class="radio-desc">
											{m.injury_substitute_desc()}
										</span>
									</label>
									<label class="radio-label">
										<input type="radio" bind:group={injuryOption} value="cancel" required />
										<span class="radio-title">{m.injury_cancel()}</span>
										<span class="radio-desc">
											{m.injury_cancel_desc()}
										</span>
									</label>
								</div>
							</div>
							<label class="checkbox-label">
								<input type="checkbox" bind:checked={injuryUseReplacement} />
								{m.injury_use_replacement()}
							</label>
							{#if injuryUseReplacement}
								<div class="field">
									<label for="injuryReplacementName">{m.retire_replacement_name()}</label>
									<input
										id="injuryReplacementName"
										type="text"
										bind:value={injuryReplacementName}
										required={injuryUseReplacement}
									/>
								</div>
								{#if tournament?.formatType === 'preseed'}
									<div class="field">
										<label for="injuryReplacementSeed">{m.retire_replacement_seed()}</label>
										<input
											id="injuryReplacementSeed"
											type="number"
											min="0"
											bind:value={injuryReplacementSeedPoints}
										/>
									</div>
								{/if}
							{/if}
							<button
								class="btn-danger"
								onclick={async () => {
									if (!injuryPlayerId || !injuryOption) return;
									await reportInjury({
										tournamentId: data.tournamentId,
										playerId: injuryPlayerId,
										option: injuryOption,
										reason: 'injury',
										useReplacement: injuryUseReplacement,
										replacementName: injuryUseReplacement
											? injuryReplacementName.trim()
											: undefined,
										replacementSeedPoints:
											injuryUseReplacement && tournament?.formatType === 'preseed'
												? injuryReplacementSeedPoints
												: undefined
									});
									injuryPlayerId = 0;
									injuryOption = '';
									injuryUseReplacement = false;
									injuryReplacementName = '';
									injuryReplacementSeedPoints = 0;
								}}
							>
								{m.injury_confirm()}
							</button>

							{#each undoableInjuries as ui (ui.id)}
								{@const remaining = Math.max(
									0,
									FIVE_MIN_MS - (now - new Date(ui.retiredAt as string | Date).getTime())
								)}
								{@const secondsLeft = Math.ceil(remaining / 1000)}
								{#if ui.canUndoInjury}
									<div class="undo-item">
										<span class="undo-desc"
											>{m.injury_undo_hint({ name: ui.name, seconds: secondsLeft })}</span
										>
										<button
											class="btn-undo"
											onclick={async () => {
												await undoInjury({
													tournamentId: data.tournamentId,
													playerId: ui.id
												});
											}}>{m.injury_undo_btn()}</button
										>
									</div>
								{/if}
							{/each}
						</div>
					</details>
				</section>
			{/if}

			{#if isActive && isViewingCurrentRound && currentRound > 0 && hasScores && allCourtsComplete}
				<section class="injury-section">
					<details>
						<summary class="btn-injury-header">{m.report_injury()}</summary>
						<div class="injury-form">
							<p class="info-muted">
								{m.court_all_done()}
							</p>
						</div>
					</details>
				</section>
			{/if}
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

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
	}

	.retire-form input[type='text'],
	.retire-form input[type='number'] {
		min-height: 40px;
		padding: var(--spacing-xs) var(--spacing-sm);
		font-size: var(--font-size-base);
		background-color: var(--bg-input);
		color: var(--text-input);
		border: var(--border-thickness) solid var(--border-strong);
		border-radius: var(--radius-sm);
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

	.retire-note {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
		margin: 0;
		padding-bottom: var(--spacing-xs);
	}

	.injury-note {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
		margin: 0;
		padding-bottom: var(--spacing-xs);
	}

	.injury-section {
		margin-top: var(--spacing-lg);
	}

	.btn-injury-header {
		cursor: pointer;
		font-weight: 600;
		color: var(--text-muted);
		padding: var(--spacing-sm);
	}

	.btn-injury-header:hover {
		color: var(--text-secondary);
	}

	.injury-form {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
		margin-top: var(--spacing-sm);
		padding: var(--spacing-md);
		background-color: var(--bg-card);
		border: 2px solid var(--border-default);
		border-radius: var(--radius-md);
	}

	.injury-form .field {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.injury-form label,
	.injury-form .label-text {
		font-weight: 600;
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
	}

	.injury-form .checkbox-label {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
	}

	.injury-form input[type='text'],
	.injury-form input[type='number'] {
		min-height: 40px;
		padding: var(--spacing-xs) var(--spacing-sm);
		font-size: var(--font-size-base);
		background-color: var(--bg-input);
		color: var(--text-input);
		border: var(--border-thickness) solid var(--border-strong);
		border-radius: var(--radius-sm);
	}

	.injury-form select {
		min-height: 40px;
		padding: var(--spacing-xs) var(--spacing-sm);
		font-size: var(--font-size-base);
		background-color: var(--bg-input);
		color: var(--text-input);
		border: var(--border-thickness) solid var(--border-strong);
		border-radius: var(--radius-sm);
	}

	.injury-form select:focus {
		outline: none;
		border-color: var(--border-focus);
	}

	.radio-group {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
		margin-top: var(--spacing-xs);
	}

	.radio-label {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: var(--spacing-sm);
		background-color: var(--bg-secondary);
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.radio-title {
		font-weight: 600;
		font-size: var(--font-size-sm);
		color: var(--text-primary);
	}

	.radio-desc {
		font-size: var(--font-size-xs);
		color: var(--text-muted);
	}

	.injury-form .btn-danger {
		align-self: flex-start;
	}

	.info-muted {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
		margin: 0;
		padding: var(--spacing-sm);
	}

	.undo-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
		margin-top: var(--spacing-sm);
		padding-top: var(--spacing-sm);
		border-top: 1px solid var(--border-default);
	}

	.undo-label {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
		font-weight: 600;
	}

	.undo-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--spacing-sm);
		padding: var(--spacing-xs) var(--spacing-sm);
		background-color: var(--bg-secondary);
		border-radius: var(--radius-sm);
	}

	.undo-desc {
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
	}

	.btn-undo {
		background-color: transparent;
		color: var(--accent-warning);
		border: 2px solid var(--accent-warning);
		padding: 2px 10px;
		border-radius: var(--radius-sm);
		font-size: var(--font-size-xs);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		cursor: pointer;
		transition: all var(--transition-fast);
		flex-shrink: 0;
	}

	.btn-undo:hover {
		background-color: var(--accent-warning);
		color: var(--bg-primary);
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

	.btn-link {
		background: none;
		border: none;
		color: var(--accent-info);
		cursor: pointer;
		font-weight: 600;
		text-decoration: underline;
	}

	.tie-break-list {
		list-style: none;
		padding: 0;
		margin: var(--spacing-md) 0;
	}

	.tie-break-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--spacing-sm);
		padding: var(--spacing-sm) 0;
		border-bottom: 1px solid var(--border-color);
	}

	.tie-break-factor {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
		flex: 1;
		min-width: 0;
	}

	.tie-break-factor label {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		cursor: pointer;
		min-width: 0;
	}

	.tie-break-label {
		font-size: var(--font-size-sm);
		line-height: 1.3;
	}

	.tie-break-actions {
		display: flex;
		gap: var(--spacing-xs);
	}

	.btn-small {
		padding: 2px 8px;
		font-size: var(--font-size-xs);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		background: var(--bg-primary);
		color: var(--text-primary);
		cursor: pointer;
	}

	.btn-small:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.manual-rank {
		margin-top: var(--spacing-sm);
		padding-top: var(--spacing-sm);
		border-top: 1px dashed var(--border-color);
	}

	.manual-rank-hint {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
		margin: 0 0 var(--spacing-sm);
	}

	.manual-tie-group {
		margin-bottom: var(--spacing-md);
	}

	.manual-tie-group h5 {
		margin: 0 0 var(--spacing-xs);
		font-size: var(--font-size-sm);
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

	.manual-rank ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.manual-rank li {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
		font-size: var(--font-size-sm);
		margin-bottom: var(--spacing-xs);
	}
</style>
