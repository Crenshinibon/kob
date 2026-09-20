<script lang="ts">
	import { browser } from '$app/environment';
	import * as m from '$lib/paraglide/messages';
	import QrCode from '$lib/components/QrCode.svelte';

	let {
		data
	}: {
		data: {
			tournamentId: number;
			tournamentName: string;
			players: { id: number; name: string; token: string }[];
		};
	} = $props();

	function playerUrl(token: string): string {
		if (!browser) return `/player/${token}`;
		return `${window.location.origin}/player/${token}`;
	}
</script>

<main data-testid="checkin-print">
	<header class="no-print">
		<h1>{data.tournamentName}</h1>
		<button type="button" class="btn-primary" onclick={() => window.print()}
			>{m.checkin_print_button()}</button
		>
	</header>
	<section class="grid">
		{#each data.players as p (p.id)}
			<article
				class="card"
				data-player-id={p.id}
				data-player-name={p.name}
				data-player-url={`/player/${p.token}`}
			>
				<h2>{p.name}</h2>
				<QrCode url={playerUrl(p.token)} alt={p.name} hint={m.checkin_print_hint()} width={160} />
				<p class="tourney">{data.tournamentName}</p>
			</article>
		{/each}
	</section>
</main>

<style>
	main {
		padding: var(--spacing-md);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 12px;
	}

	.card {
		border: 1px solid #ccc;
		padding: 8px;
		text-align: center;
		background: #fff;
		color: #111;
		break-inside: avoid;
		page-break-inside: avoid;
		-webkit-column-break-inside: avoid;
	}

	.card h2 {
		font-size: 14pt;
		margin: 0 0 8px;
	}

	.tourney {
		font-size: 10pt;
		margin: 4px 0 0;
	}

	@media print {
		:global(.v1-banner),
		:global(.top-nav),
		:global(.site-footer),
		:global(.cookie-notice) {
			display: none !important;
		}

		:global(.app-container),
		:global(body),
		:global(html) {
			background: #fff !important;
			color: #000 !important;
		}

		:global(.site-footer) {
			position: static !important;
		}

		.no-print {
			display: none !important;
		}

		main {
			padding: 0;
		}

		.grid {
			gap: 8px;
		}

		.card {
			break-inside: avoid;
			page-break-inside: avoid;
			-webkit-column-break-inside: avoid;
		}
	}
</style>
