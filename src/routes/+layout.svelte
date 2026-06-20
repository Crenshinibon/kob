<script lang="ts">
	import CookieNotice from '$lib/components/CookieNotice.svelte';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
	import { authClient } from '$lib/auth-client';
	import * as m from '$lib/paraglide/messages';
	import { shouldRedirect, localizeHref } from '$lib/paraglide/runtime';
	import { goto, afterNavigate } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';

	let {
		children,
		data
	}: {
		children: Snippet;
		data: { user?: { id: string; email: string } | null };
	} = $props();

	async function syncLocaleUrl(url: string) {
		const decision = await shouldRedirect({ url });
		if (decision.shouldRedirect && decision.redirectUrl) {
			if (decision.redirectUrl.origin !== window.location.origin) {
				window.location.href = decision.redirectUrl.href;
				return;
			}
			await goto(decision.redirectUrl, { invalidateAll: true });
		}
	}

	onMount(() => {
		void syncLocaleUrl(window.location.href);
	});

	afterNavigate((navigation) => {
		if (navigation.to) {
			void syncLocaleUrl(navigation.to.url.href);
		}
	});

	async function handleSignOut() {
		await authClient.signOut({
			fetchOptions: {
				onSuccess: () => {
					window.location.href = localizeHref('/');
				}
			}
		});
	}
</script>

<div class="app-container">
	{#if data?.user}
		<div class="v1-banner">
			{m.v1_banner()}
		</div>
	{/if}

	<nav class="top-nav">
		<LanguageSwitcher />
		{#if data?.user}
			<span class="user-email">{data.user.email}</span>
			<button type="button" onclick={handleSignOut} class="btn-signout">{m.sign_out()}</button>
		{/if}
	</nav>

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
			{m.buy_me_coffee()}
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
		display: flex;
		flex-direction: column;
		background-color: var(--bg-primary);
		color: var(--text-primary);
	}

	.v1-banner {
		text-align: center;
		padding: var(--spacing-xs) var(--spacing-md);
		background-color: var(--accent-warning);
		color: var(--bg-primary);
		font-size: var(--font-size-xs);
		font-weight: 600;
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
		flex: 1;
	}

	.site-footer {
		position: sticky;
		bottom: 0;
		text-align: center;
		padding: var(--spacing-lg);
		border-top: 1px solid var(--border-default);
		background-color: var(--bg-secondary);
	}
</style>
