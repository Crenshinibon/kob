<script lang="ts">
	import type { Snippet } from 'svelte';
	import CookieNotice from '$lib/components/CookieNotice.svelte';

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

<div class="app-container">
	{#if data?.user}
		<nav class="top-nav">
			<span class="user-email">{data.user.email}</span>
			<button onclick={handleSignOut} class="btn-signout">Sign Out</button>
		</nav>
	{/if}

	<main>
		{@render children()}
	</main>

	<footer class="site-footer">
		<a
			href="https://buymeacoffee.com/accomade"
			target="_blank"
			rel="noopener noreferrer nofollow"
			class="bmc-button"
		>
			☕ Buy Me A Coffee
		</a>
	</footer>
</div>

<CookieNotice />

<style>
	.bmc-button {
		min-width: 180px;
		color: #000000 !important;
		background-color: #ffdd00 !important;
		height: 30px;
		border-radius: 12px;
		font-size: 16px;
		font-weight: Normal;
		border: none;
		padding: 0px 12px;
		line-height: 22px;
		text-decoration: none !important;
		display: inline-flex !important;
		align-items: center;
		-webkit-box-sizing: border-box !important;
		box-sizing: border-box !important;
	}

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

	main {
		min-height: calc(100vh - 100px);
	}

	.site-footer {
		text-align: center;
		padding: var(--spacing-lg);
		border-top: 1px solid var(--border-default);
		background-color: var(--bg-secondary);
	}
</style>
