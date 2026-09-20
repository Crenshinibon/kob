<script lang="ts">
	import * as msg from '$lib/paraglide/messages';

	type ScoreFields = {
		enhance(
			cb: (fi: { submit: () => Promise<unknown> }) => void | Promise<void>
		): Record<string, unknown>;
		fields: {
			teamAScore: Record<string, unknown>;
			teamBScore: Record<string, unknown>;
		};
	};

	let {
		formObj,
		matchId,
		token,
		teamALabel,
		teamBLabel,
		setNumber = undefined,
		formTestId = 'match',
		compact = false,
		readOnly = false,
		savedA = null,
		savedB = null,
		saving = false,
		editing = false,
		showClear = false,
		youOnTeam = undefined,
		onsubmit,
		onclear,
		oncancel,
		onfocus,
		onblur
	}: {
		formObj?: ScoreFields;
		matchId: number;
		token: string;
		teamALabel: string;
		teamBLabel: string;
		setNumber?: number;
		formTestId?: string;
		compact?: boolean;
		readOnly?: boolean;
		savedA?: number | null;
		savedB?: number | null;
		saving?: boolean;
		editing?: boolean;
		showClear?: boolean;
		youOnTeam?: 'a' | 'b';
		onsubmit?: (form: { submit: () => Promise<unknown> }) => void | Promise<void>;
		onclear?: () => void;
		oncancel?: () => void;
		onfocus?: () => void;
		onblur?: () => void;
	} = $props();
</script>

{#if readOnly}
	<div class="completed" class:compact>
		<p>{teamALabel}: <strong>{savedA}</strong></p>
		<p>{teamBLabel}: <strong>{savedB}</strong></p>
		<span class="saved" data-testid="saved-{matchId}">{msg.court_saved()}</span>
		<p class="hint">{msg.player_score_read_only_hint()}</p>
	</div>
{:else if formObj}
	<form
		data-testid="{formTestId}-form-{matchId}"
		class:compact
		{...formObj.enhance(async (form) => {
			await onsubmit?.(form);
		})}
	>
		<input type="hidden" name="token" value={token} />
		<input type="hidden" name="matchId" value={matchId} />
		{#if setNumber !== undefined}
			<input type="hidden" name="setNumber" value={setNumber} />
		{/if}
		{#if youOnTeam}
			<input type="hidden" name="youOnTeam" value={youOnTeam} />
		{/if}
		<div class="teams">
			<div class="team">
				<p>{teamALabel}</p>
				<input
					data-testid="team-a-score-{matchId}"
					type="number"
					name="teamAScore"
					min="0"
					required
					disabled={saving}
					{onfocus}
					{onblur}
					{...formObj.fields.teamAScore}
				/>
			</div>
			<div class="vs">{msg.court_vs()}</div>
			<div class="team">
				<p>{teamBLabel}</p>
				<input
					data-testid="team-b-score-{matchId}"
					type="number"
					name="teamBScore"
					min="0"
					required
					disabled={saving}
					{onfocus}
					{onblur}
					{...formObj.fields.teamBScore}
				/>
			</div>
		</div>
		<div class="form-actions">
			{#if editing}
				<button type="button" class="btn-secondary" onclick={oncancel} disabled={saving}>
					{msg.court_cancel_btn()}
				</button>
			{/if}
			{#if showClear}
				<button
					type="button"
					class="btn-secondary"
					data-testid="clear-score-{matchId}"
					onclick={onclear}
					disabled={saving}
				>
					{msg.court_clear_score()}
				</button>
			{/if}
			<button
				data-testid="save-score-{matchId}"
				type="submit"
				class="btn-primary"
				disabled={saving}
			>
				{#if saving}
					<span class="spinner"></span>
					{editing ? msg.court_updating() : msg.court_saving()}
				{:else}
					{editing ? msg.court_update_score() : msg.court_save_score()}
				{/if}
			</button>
		</div>
	</form>
{/if}

<style>
	.teams {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
		align-items: end;
		gap: var(--spacing-md);
	}

	.team {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.team p {
		margin: 0;
		font-size: var(--font-size-sm);
		font-weight: 600;
	}

	.team input {
		width: 100%;
		min-height: 48px;
		box-sizing: border-box;
		transform: none;
	}

	.team input:focus {
		transform: none;
	}

	.vs {
		font-weight: 700;
		padding-bottom: 0.85rem;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
		margin: var(--spacing-sm) 0;
	}

	.form-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-sm);
		margin-top: var(--spacing-xs);
	}

	.form-actions .btn-primary {
		flex: 1 1 100%;
	}

	.compact .teams,
	.compact.completed {
		font-size: 0.875rem;
	}

	.hint {
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.saved {
		color: var(--accent-success, #3c3);
	}
</style>
