<script lang="ts">
	import '$lib/assets/global.css';
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
		background-color: var(--bg-primary);
		color: var(--text-primary);
	}

	.top-nav {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 1rem;
		background-color: var(--bg-nav);
		border-bottom: 2px solid var(--border-default);
	}

	.user-email {
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
	}

	.btn-signout {
		background: transparent;
		color: var(--accent-error);
		border: 2px solid var(--accent-error);
		padding: 0.4rem 0.75rem;
		border-radius: var(--radius-sm);
		font-size: var(--font-size-sm);
		font-weight: 600;
		cursor: pointer;
		transition: all var(--transition-base);
	}

	.btn-signout:hover {
		background-color: var(--accent-error);
		color: var(--bg-primary);
	}
</style>
