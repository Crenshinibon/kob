<script lang="ts">
	import { page } from '$app/state';
	import { locales, localizeHref, getLocale } from '$lib/paraglide/runtime';

	const displayNames: Record<string, string> = {
		en: 'EN',
		de: 'DE',
		fr: 'FR',
		es: 'ES'
	};
</script>

<nav class="lang-switcher" aria-label="Language">
	{#each locales as locale}
		<a
			href={localizeHref(page.url.pathname, { locale })}
			data-sveltekit-reload
			class:active={getLocale() === locale}
		>
			{displayNames[locale]}
		</a>
	{/each}
</nav>

<style>
	.lang-switcher {
		display: flex;
		gap: 0.25rem;
		align-items: center;
	}

	.lang-switcher a {
		padding: 0.25rem 0.5rem;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-muted);
		text-decoration: none;
		border-radius: 4px;
		transition:
			background 0.15s,
			color 0.15s;
	}

	.lang-switcher a:hover {
		background: var(--bg-hover);
		color: var(--text-primary);
	}

	.lang-switcher a.active {
		background: var(--accent-primary);
		color: var(--bg-primary);
	}
</style>
