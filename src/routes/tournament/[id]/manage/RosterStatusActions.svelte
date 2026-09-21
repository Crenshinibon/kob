<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import {
		reportInjury,
		retirePlayer,
		undoInjury,
		undoRetirement
	} from '../tournament-actions.remote';

	type CourtInjuryInfo = {
		courtNumber: number;
		isComplete: boolean;
		playerIds: number[];
		matches: {
			teamAScore: number | null;
			isCanceled: boolean | null;
			injuredPlayerIds: number[] | null;
		}[];
	};

	type RosterPlayer = {
		id: number;
		name: string;
		courtNumber: number | null;
		retiredAt: Date | string | null;
		injuredAt: Date | string | null;
		status: string;
	};

	let {
		tournamentId,
		formatType,
		status,
		currentRound,
		roundHasScores,
		players,
		courts,
		onDone
	}: {
		tournamentId: number;
		formatType: string;
		status: string;
		currentRound: number;
		roundHasScores: boolean;
		players: RosterPlayer[];
		courts: CourtInjuryInfo[];
		onDone: () => Promise<void>;
	} = $props();

	const FIVE_MIN_MS = 5 * 60 * 1000;
	let now = $state(Date.now());
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
	let retireDetailsOpen = $state(false);
	let injuryDetailsOpen = $state(false);
	let retireSubmitting = $state(false);
	let injurySubmitting = $state(false);

	$effect(() => {
		const id = setInterval(() => {
			now = Date.now();
		}, 1000);
		return () => clearInterval(id);
	});

	const isActive = $derived(status === 'active' && currentRound > 0);
	const allCourtsComplete = $derived(courts.length > 0 && courts.every((c) => c.isComplete));

	const eligibleRetirePlayers = $derived(
		players.filter((p) => p.status !== 'retired' && p.status !== 'injured' && !p.retiredAt)
	);

	const eligibleInjuryPlayers = $derived.by(() => {
		const result: { id: number; name: string; courtNumber: number }[] = [];
		const nameById = new Map(players.map((p) => [p.id, p.name]));
		for (const court of courts) {
			if (court.isComplete) continue;
			for (const id of court.playerIds) {
				const p = players.find((row) => row.id === id);
				if (!p || p.retiredAt) continue;
				result.push({ id, name: nameById.get(id) ?? String(id), courtNumber: court.courtNumber });
			}
		}
		return result;
	});

	const undoableRetirements = $derived(
		players.filter(
			(p) => p.retiredAt && !p.injuredAt && now - new Date(p.retiredAt).getTime() < FIVE_MIN_MS
		)
	);

	function injuryUndo(p: RosterPlayer): { canUndoInjury: boolean } {
		const court = courts.find((c) => c.playerIds.includes(p.id));
		if (!court) return { canUndoInjury: false };
		const hasCanceled = court.matches.some((row) => row.isCanceled);
		const hasInjuredFlag = court.matches.some((row) => (row.injuredPlayerIds ?? []).includes(p.id));
		let hasProgressed = false;
		if (hasCanceled) {
			hasProgressed = court.matches.some((row) => row.teamAScore !== null && row.isCanceled);
		} else if (hasInjuredFlag) {
			hasProgressed = court.matches.some(
				(row) => row.teamAScore !== null && (row.injuredPlayerIds ?? []).includes(p.id)
			);
		}
		return { canUndoInjury: !hasProgressed };
	}

	const undoableInjuries = $derived(
		players
			.filter(
				(p) => p.injuredAt && p.retiredAt && now - new Date(p.injuredAt).getTime() < FIVE_MIN_MS
			)
			.map((p) => ({ ...p, ...injuryUndo(p) }))
	);
</script>

{#if isActive && !roundHasScores}
	<section class="retire-section">
		<details bind:open={retireDetailsOpen}>
			<summary class="btn-retire-header">{m.retire_player()}</summary>
			<div class="retire-form">
				<p class="note">{m.retire_note()}</p>
				<div class="field">
					<label for="retirePlayerId">{m.retire_select_hint()}</label>
					<select id="retirePlayerId" bind:value={retirePlayerId} required>
						<option value="">{m.retire_select_placeholder()}</option>
						{#each eligibleRetirePlayers as p (p.id)}
							<option value={p.id}
								>{m.retire_player_option({
									name: p.name,
									group: p.courtNumber ?? 0
								})}</option
							>
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
					{#if formatType === 'preseed'}
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
					disabled={retireSubmitting}
					onclick={async () => {
						if (!retirePlayerId || retireSubmitting) return;
						retireSubmitting = true;
						try {
							await retirePlayer({
								tournamentId,
								playerId: Number(retirePlayerId),
								reason: retireReason || undefined,
								useReplacement: retireUseReplacement,
								replacementName: retireUseReplacement ? replacementName.trim() : undefined,
								replacementSeedPoints:
									retireUseReplacement && formatType === 'preseed'
										? replacementSeedPoints
										: undefined
							});
							retirePlayerId = 0;
							retireReason = '';
							retireUseReplacement = false;
							replacementName = '';
							replacementSeedPoints = 0;
							retireDetailsOpen = false;
							await onDone();
						} finally {
							retireSubmitting = false;
						}
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
									class="btn-compact btn-secondary"
									onclick={async () => {
										await undoRetirement({ tournamentId, playerId: rp.id });
										await onDone();
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

{#if isActive && roundHasScores && !allCourtsComplete}
	<section class="injury-section">
		<details bind:open={injuryDetailsOpen}>
			<summary class="btn-injury-header">{m.report_injury()}</summary>
			<div class="injury-form">
				<p class="note">{m.injury_note()}</p>
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
							<span class="radio-desc">{m.injury_substitute_desc()}</span>
						</label>
						<label class="radio-label">
							<input type="radio" bind:group={injuryOption} value="cancel" required />
							<span class="radio-title">{m.injury_cancel()}</span>
							<span class="radio-desc">{m.injury_cancel_desc()}</span>
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
					{#if formatType === 'preseed'}
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
					disabled={injurySubmitting}
					onclick={async () => {
						if (!injuryPlayerId || !injuryOption || injurySubmitting) return;
						injurySubmitting = true;
						try {
							await reportInjury({
								tournamentId,
								playerId: Number(injuryPlayerId),
								option: injuryOption,
								reason: 'injury',
								useReplacement: injuryUseReplacement,
								replacementName: injuryUseReplacement ? injuryReplacementName.trim() : undefined,
								replacementSeedPoints:
									injuryUseReplacement && formatType === 'preseed'
										? injuryReplacementSeedPoints
										: undefined
							});
							injuryPlayerId = 0;
							injuryOption = '';
							injuryUseReplacement = false;
							injuryReplacementName = '';
							injuryReplacementSeedPoints = 0;
							injuryDetailsOpen = false;
							await onDone();
						} finally {
							injurySubmitting = false;
						}
					}}
				>
					{m.injury_confirm()}
				</button>
				{#each undoableInjuries as ui (ui.id)}
					{@const remaining = Math.max(
						0,
						FIVE_MIN_MS - (now - new Date(ui.injuredAt as string | Date).getTime())
					)}
					{@const secondsLeft = Math.ceil(remaining / 1000)}
					{#if ui.canUndoInjury}
						<div class="undo-item">
							<span class="undo-desc"
								>{m.injury_undo_hint({ name: ui.name, seconds: secondsLeft })}</span
							>
							<button
								class="btn-compact btn-secondary"
								onclick={async () => {
									await undoInjury({ tournamentId, playerId: ui.id });
									await onDone();
								}}>{m.injury_undo_btn()}</button
							>
						</div>
					{/if}
				{/each}
			</div>
		</details>
	</section>
{:else if isActive && roundHasScores && allCourtsComplete}
	<section class="injury-section">
		<details>
			<summary class="btn-injury-header">{m.report_injury()}</summary>
			<div class="injury-form">
				<p class="note">{m.court_all_done()}</p>
			</div>
		</details>
	</section>
{/if}

<style>
	.retire-section,
	.injury-section {
		margin-top: var(--spacing-lg);
	}

	.btn-retire-header,
	.btn-injury-header {
		cursor: pointer;
		font-weight: 600;
		color: var(--text-muted);
		padding: var(--spacing-sm);
	}

	.retire-form,
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

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.note {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
		margin: 0;
	}

	.checkbox-label,
	.radio-label {
		display: flex;
		align-items: flex-start;
		gap: var(--spacing-sm);
		font-size: var(--font-size-sm);
	}

	.radio-group {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.radio-title {
		font-weight: 700;
	}

	.radio-desc {
		display: block;
		color: var(--text-muted);
	}

	input[type='text'],
	input[type='number'],
	select {
		min-height: 40px;
		padding: var(--spacing-xs) var(--spacing-sm);
		font-size: var(--font-size-base);
		background-color: var(--bg-input);
		color: var(--text-input);
		border: var(--border-thickness) solid var(--border-strong);
		border-radius: var(--radius-sm);
	}

	.btn-danger {
		align-self: flex-start;
	}

	.undo-list,
	.undo-item {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--spacing-sm);
	}
</style>
