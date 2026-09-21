<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { parsePastedText, parseCsvText } from '$lib/parse-players';

	let {
		names = $bindable(''),
		formatType,
		textareaName = undefined as string | undefined,
		textareaId = 'player-names',
		testId = 'bulk-names',
		onHasWvvPoints = undefined as (() => void) | undefined
	}: {
		names: string;
		formatType: string;
		textareaName?: string;
		textareaId?: string;
		testId?: string;
		onHasWvvPoints?: () => void;
	} = $props();

	let textareaEl: HTMLTextAreaElement | undefined = $state();
	let csvUploadError = $state('');

	const computedPlayerCount = $derived(names.split('\n').filter((n) => n.trim()).length);

	function handlePaste(e: ClipboardEvent) {
		const pastedText = e.clipboardData?.getData('text') || '';
		if (!textareaEl || !pastedText) return;

		const needsProcessing = /[,;\t]/.test(pastedText);
		if (!needsProcessing) return;

		e.preventDefault();

		const parsed = parsePastedText(pastedText);
		const formattedNames = parsed.join('\n');

		const start = textareaEl.selectionStart;
		const end = textareaEl.selectionEnd;
		const before = names.substring(0, start);
		const after = names.substring(end);

		names = before + formattedNames + (after ? '\n' + after : '');

		setTimeout(() => {
			if (textareaEl)
				textareaEl.selectionStart = textareaEl.selectionEnd = start + formattedNames.length;
		}, 0);
	}

	function handleCsvUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		csvUploadError = '';
		const reader = new FileReader();
		reader.onload = () => {
			const text = reader.result as string;
			const result = parseCsvText(text);
			if (!result.ok) {
				csvUploadError = m.create_csv_no_spieler1();
				return;
			}
			if (result.lines.length === 0) {
				csvUploadError = m.create_csv_error();
				return;
			}
			const newNames = result.lines.join('\n');
			names = names.trim() ? names.trim() + '\n' + newNames : newNames;
			if (result.hasWvvPoints) onHasWvvPoints?.();
		};
		reader.onerror = () => {
			csvUploadError = m.create_csv_error();
		};
		reader.readAsText(file);
		input.value = '';
	}
</script>

<div class="player-import" data-testid="player-name-import">
	<textarea
		id={textareaId}
		name={textareaName}
		bind:value={names}
		bind:this={textareaEl}
		onpaste={handlePaste}
		rows="10"
		data-testid={testId}
		placeholder={formatType === 'preseed'
			? m.create_names_placeholder_preseed()
			: m.create_names_placeholder_random()}></textarea>
	<p class="hint">{m.create_players_optional_hint()}</p>
	<p class="hint">
		{#if formatType === 'preseed'}
			{m.create_names_seed_order_hint_preseed()}<br />
			<code>{m.create_player_example()}</code>
		{:else}
			{m.create_names_seed_order_hint_random()}
		{/if}
	</p>
	<details class="import-tip">
		<summary class="import-tip-summary">{m.create_wvv_summary()}</summary>
		<p class="import-tip-text">
			{m.create_wvv_tip()}
		</p>
		<div class="csv-upload">
			<label class="btn-small csv-upload-btn" for={`${textareaId}-csv`}>
				{m.create_csv_upload()}
			</label>
			<input
				id={`${textareaId}-csv`}
				type="file"
				accept=".csv,.txt"
				onchange={handleCsvUpload}
				class="csv-file-input"
				data-testid="csv-upload"
			/>
		</div>
		{#if csvUploadError}
			<p class="info warn">{csvUploadError}</p>
		{/if}
	</details>
	<p class="count">{m.create_names_entered({ count: computedPlayerCount })}</p>
</div>

<style>
	.player-import {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	textarea {
		padding: var(--spacing-sm);
		font-size: var(--font-size-base);
		background-color: var(--bg-input);
		color: var(--text-input);
		border: var(--border-thickness) solid var(--border-strong);
		border-radius: var(--radius-sm);
		font-family: inherit;
		min-height: 150px;
		width: 100%;
		resize: vertical;
		font-weight: 500;
	}

	textarea:focus {
		outline: none;
		border-color: var(--border-focus);
		box-shadow: var(--shadow-focus);
	}

	.count {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--text-muted);
		font-weight: 600;
	}

	.info {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
		font-style: italic;
		margin-top: var(--spacing-xs);
	}

	.hint {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--text-muted);
		line-height: 1.5;
	}

	.hint code {
		background-color: var(--bg-secondary);
		padding: 1px 6px;
		border-radius: var(--radius-sm);
		font-size: var(--font-size-sm);
	}

	.import-tip {
		margin: 0;
	}

	.import-tip-summary {
		font-size: var(--font-size-sm);
		color: var(--accent-primary);
		cursor: pointer;
		font-weight: 500;
	}

	.import-tip-text {
		margin: var(--spacing-xs) 0 0 0;
		padding: var(--spacing-sm);
		background-color: var(--bg-secondary);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		line-height: 1.5;
	}

	.csv-upload {
		margin-top: var(--spacing-sm);
	}

	.csv-upload-btn {
		cursor: pointer;
		width: fit-content;
	}

	.csv-file-input {
		display: none;
	}

	.warn {
		color: var(--accent-error);
	}
</style>
