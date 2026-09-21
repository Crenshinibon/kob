<script lang="ts">
	import QrCode from './QrCode.svelte';
	import { browser } from '$app/environment';

	let { token, courtNumber }: { token: string; courtNumber: number } = $props();

	const url = $derived(browser ? `${window.location.origin}/court/${token}` : '');
</script>

<QrCode {url} alt="QR code for Court {courtNumber}" hint="Scan to enter scores" width={200} />
