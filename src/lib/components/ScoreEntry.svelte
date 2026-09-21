<script lang="ts">
	import * as msg from '$lib/paraglide/messages';

	type ScoreIssue = { message: string };

	type ScoreSubmitForm = {
		submit: () => Promise<unknown>;
		element?: HTMLFormElement;
		fields: { allIssues(): ScoreIssue[] | undefined };
	};

	type ScoreFields = {
		enhance(cb: (fi: ScoreSubmitForm) => void | Promise<void>): Record<string, unknown>;
		fields: {
			teamAScore: Record<string, unknown>;
			teamBScore: Record<string, unknown>;
			allIssues(): ScoreIssue[] | undefined;
		};
		pending?: number;
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
		extraErrors = [],
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
		extraErrors?: string[];
		onsubmit?: (form: ScoreSubmitForm) => void | Promise<void>;
		onclear?: () => void;
		oncancel?: () => void;
		onfocus?: () => void;
		onblur?: () => void;
	} = $props();

	const fieldIssues = $derived((formObj?.fields.allIssues() ?? []).map((issue) => issue.message));
	const visibleErrors = $derived([...new Set([...extraErrors, ...fieldIssues])]);
	const busy = $derived(saving || (formObj?.pending ?? 0) > 0);
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
		novalidate
		data-testid="{formTestId}-form-{matchId}"
		class:compact
		{...formObj.enhance(async (form) => {
			if (onsubmit) {
				await onsubmit(form);
				return;
			}
			await form.submit();
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
		{#if visibleErrors.length > 0 && !busy}
			<div class="error" data-testid="score-error-{matchId}" role="alert">
				{#each visibleErrors as message, ei (ei)}
					<p>{message}</p>
				{/each}
			</div>
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
					disabled={busy}
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
					disabled={busy}
					{onfocus}
					{onblur}
					{...formObj.fields.teamBScore}
				/>
			</div>
		</div>
		<div class="form-actions">
			{#if editing}
				<button type="button" class="btn-secondary" onclick={oncancel} disabled={busy}>
					{msg.court_cancel_btn()}
				</button>
			{/if}
			{#if showClear}
				<button
					type="button"
					class="btn-clear"
					data-testid="clear-score-{matchId}"
					onclick={onclear}
					disabled={busy}
				>
					{msg.court_clear_score()}
				</button>
			{/if}
			<button data-testid="save-score-{matchId}" type="submit" class="btn-primary" disabled={busy}>
				{#if busy}
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
		align-items: center;
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

	.error {
		background-color: rgba(255, 51, 51, 0.1);
		color: var(--accent-error);
		border: 1px solid var(--accent-error);
		border-radius: var(--radius-sm);
		padding: var(--spacing-sm);
		font-size: var(--font-size-sm);
	}

	.error p {
		margin: 0;
	}

	.btn-clear {
		background: transparent;
		color: var(--accent-error);
		border: 1px solid var(--accent-error);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-xs);
		font-weight: 700;
		padding: 0.2rem 0.5rem;
		min-height: 28px;
		cursor: pointer;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.btn-clear:hover:not(:disabled) {
		background: rgba(255, 51, 51, 0.12);
	}

	.spinner {
		display: inline-block;
		width: 14px;
		height: 14px;
		border: 2px solid var(--bg-primary);
		border-top-color: transparent;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
		vertical-align: middle;
		margin-right: var(--spacing-xs);
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
