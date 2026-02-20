<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let dismissed = $state(false);
	let mounted = $state(false);

	onMount(() => {
		dismissed = localStorage.getItem('cookie-notice-dismissed') === 'true';
		mounted = true;
	});

	function handleDismiss() {
		dismissed = true;
		localStorage.setItem('cookie-notice-dismissed', 'true');
	}
</script>

{#if mounted && !dismissed}
	<div class="cookie-notice" role="region" aria-label="Cookie information">
		<div class="cookie-content">
			<p>
				This site uses essential cookies for authentication and security.
				<button type="button" onclick={() => goto('/privacy')} class="cookie-link-btn">
					Learn more
				</button>
			</p>
			<button onclick={handleDismiss} class="cookie-btn" aria-label="Dismiss cookie notice">
				OK
			</button>
		</div>
	</div>
{/if}

<style>
	.cookie-notice {
		position: fixed;
		bottom: 0;
		left: 0;
		width: 25vw;
		min-width: 200px;
		background-color: var(--bg-secondary);
		border-top: 3px solid var(--border-default);
		border-right: 3px solid var(--border-default);
		padding: 0.75rem 1rem;
		z-index: 1000;
	}

	.cookie-content {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;

		margin: 0 auto;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.cookie-content p {
		text-align: center;
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		line-height: 1.4;
	}

	.cookie-link-btn {
		background: none;
		border: none;
		padding: 0;
		margin: 0;
		color: var(--accent-info);
		text-decoration: underline;
		font-size: inherit;
		font-family: inherit;
		cursor: pointer;
		display: inline;
	}

	.cookie-link-btn:hover {
		color: var(--text-primary);
	}

	.cookie-btn {
		background: var(--accent-info);
		color: var(--bg-primary);
		border: none;
		padding: 0.5rem 1.25rem;
		border-radius: var(--radius-sm);
		font-size: var(--font-size-sm);
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
		transition: all var(--transition-base);
	}

	.cookie-btn:hover {
		background: var(--text-primary);
	}
</style>
