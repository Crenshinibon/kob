<script lang="ts">
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
			rel="noopener noreferrer"
			class="support-link"
		>
			☕ Support KoB Tracker
		</a>
	</footer>
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

	main {
		min-height: calc(100vh - 100px);
	}

	.site-footer {
		text-align: center;
		padding: var(--spacing-lg);
		border-top: 1px solid var(--border-default);
		background-color: var(--bg-secondary);
	}

	.support-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--text-muted);
		text-decoration: none;
		font-size: var(--font-size-sm);
		padding: var(--spacing-xs) var(--spacing-sm);
		border-radius: var(--radius-sm);
		transition: all var(--transition-base);
	}

	.support-link:hover {
		color: var(--accent-warning);
		background-color: rgba(255, 204, 0, 0.1);
	}
</style>
