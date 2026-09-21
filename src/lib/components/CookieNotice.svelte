<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import * as m from '$lib/paraglide/messages';
	import { localizeHref } from '$lib/paraglide/runtime';

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
				{m.cookie_notice()}
				<button
					type="button"
					onclick={() => goto(localizeHref(resolve('/privacy')))}
					class="btn-link"
				>
					{m.cookie_learn_more()}
				</button>
			</p>
			<button
				onclick={handleDismiss}
				class="btn-compact btn-primary"
				aria-label="Dismiss cookie notice"
			>
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
</style>
