<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import type { Snippet } from 'svelte';

	let {
		children,
		data
	}: {
		children: Snippet;
		data: { user?: { id: string; email: string } | null };
	} = $props();

	async function handleSignOut() {
		await fetch('/auth/sign-out', { method: 'POST' });
		window.location.href = '/';
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app-container">
	{#if data?.user}
		<nav class="top-nav">
			<span class="user-email">{data.user.email}</span>
			<button onclick={handleSignOut} class="btn-signout">Sign Out</button>
		</nav>
	{/if}

	{@render children()}
</div>

<style>
	.app-container {
		min-height: 100vh;
	}

	.top-nav {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 1rem;
		background: #f8f9fa;
		border-bottom: 1px solid #e9ecef;
	}

	.user-email {
		font-size: 0.875rem;
		color: #666;
	}

	.btn-signout {
		background: transparent;
		color: #dc3545;
		border: 1px solid #dc3545;
		padding: 0.4rem 0.75rem;
		border-radius: 4px;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-signout:hover {
		background: #dc3545;
		color: white;
	}
</style>
