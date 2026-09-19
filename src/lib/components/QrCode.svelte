<script lang="ts">
	import QRCode from 'qrcode';
	import { browser } from '$app/environment';

	type QrCodeProps = {
		url: string;
		alt?: string;
		hint?: string;
		width?: number;
	};

	let { url, alt = 'QR code', hint = '', width = 200 }: QrCodeProps = $props();

	let qrDataUrl = $state<string | null>(null);
	let loading = $state(false);
	let error = $state(false);

	$effect(() => {
		if (!browser || !url) {
			qrDataUrl = null;
			return;
		}

		loading = true;
		error = false;
		const target = url;

		QRCode.toDataURL(target, { width, margin: 2 })
			.then((dataUrl) => {
				if (target !== url) return;
				qrDataUrl = dataUrl;
				loading = false;
			})
			.catch(() => {
				error = true;
				loading = false;
			});
	});
</script>

<div class="qr-code">
	{#if loading}
		<div class="qr-loading">Loading QR...</div>
	{:else if error}
		<div class="qr-error">Failed to load QR</div>
	{:else if qrDataUrl}
		<img src={qrDataUrl} {alt} />
		{#if hint}
			<p class="qr-hint">{hint}</p>
		{/if}
	{/if}
</div>

<style>
	.qr-code {
		margin-bottom: var(--spacing-md);
		padding: var(--spacing-sm);
		background-color: var(--bg-secondary);
		border-radius: var(--radius-sm);
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.qr-code img {
		max-width: 100%;
		height: auto;
		border-radius: var(--radius-xs);
	}

	.qr-loading,
	.qr-error {
		padding: var(--spacing-sm);
		color: var(--text-secondary);
		font-size: 0.875rem;
		text-align: center;
	}

	.qr-error {
		color: var(--accent-danger);
	}

	.qr-hint {
		margin-top: var(--spacing-xs);
		margin-bottom: 0;
		font-size: 0.75rem;
		color: var(--text-secondary);
	}
</style>
