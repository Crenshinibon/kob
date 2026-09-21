<script lang="ts">
	import { resolve } from '$app/paths';
	import * as m from '$lib/paraglide/messages';
	import { localizeHref } from '$lib/paraglide/runtime';

	const stats = $derived([
		{ id: 'players', label: m.landing_stat_players() },
		{ id: 'formats', label: m.landing_stat_formats() },
		{ id: 'qr', label: m.landing_stat_qr() },
		{ id: 'langs', label: m.landing_stat_langs() }
	]);

	const matches = $derived([
		{ id: 'm1', num: 1, a: 'A & B', b: 'C & D' },
		{ id: 'm2', num: 2, a: 'A & C', b: 'B & D' },
		{ id: 'm3', num: 3, a: 'A & D', b: 'B & C' }
	]);

	const features = $derived([
		{ id: 'qr', title: m.landing_feat_qr_title(), body: m.landing_feat_qr_body() },
		{ id: 'player', title: m.landing_feat_player_title(), body: m.landing_feat_player_body() },
		{ id: 'checkin', title: m.landing_feat_checkin_title(), body: m.landing_feat_checkin_body() },
		{ id: 'courts', title: m.landing_feat_courts_title(), body: m.landing_feat_courts_body() },
		{ id: 'scoring', title: m.landing_feat_scoring_title(), body: m.landing_feat_scoring_body() },
		{ id: 'sun', title: m.landing_feat_sun_title(), body: m.landing_feat_sun_body() }
	]);
</script>

<div class="landing" data-testid="landing">
	<section class="hero">
		<div class="brand">
			<img
				src="/logo-200.jpg"
				alt={m.alt_logo()}
				class="logo"
				width="80"
				height="80"
				srcset="/logo-100.jpg 100w, /logo-200.jpg 200w, /logo-400.jpg 400w"
				sizes="80px"
			/>
			<div class="brand-copy">
				<p class="eyebrow">{m.landing_eyebrow()}</p>
				<h1>{m.landing_title()}</h1>
			</div>
		</div>
		<p class="tagline">{m.landing_tagline()}</p>
		<p class="lead">{m.landing_lead()}</p>
		<div class="hero-actions">
			<a href={localizeHref(resolve('/signup'))} class="btn-primary" data-testid="landing-signup">
				{m.landing_cta_signup()}
			</a>
			<a href={localizeHref(resolve('/login'))} class="btn-secondary" data-testid="landing-login">
				{m.login()}
			</a>
		</div>
		<ul class="stats">
			{#each stats as stat (stat.id)}
				<li>{stat.label}</li>
			{/each}
		</ul>
	</section>

	<section class="block" aria-labelledby="how-heading">
		<h2 id="how-heading">{m.landing_how_title()}</h2>
		<p class="section-lead">{m.landing_how_lead()}</p>
		<ol class="rotation">
			{#each matches as match (match.id)}
				<li>
					<span class="match-label">{m.court_match_label({ num: match.num })}</span>
					<div class="matchup">
						<span class="pair">{match.a}</span>
						<span class="vs">{m.court_vs()}</span>
						<span class="pair">{match.b}</span>
					</div>
				</li>
			{/each}
		</ol>
		<p class="section-lead">{m.landing_how_then()}</p>
		<div class="ladder">
			<div class="ladder-court king">
				<span>{m.landing_court({ n: 1 })}</span>
				<span class="move up">{m.landing_how_up()}</span>
			</div>
			<div class="ladder-court">
				<span>{m.landing_court({ n: 2 })}</span>
			</div>
			<div class="ladder-court">
				<span>{m.landing_court({ n: 3 })}</span>
			</div>
			<div class="ladder-court">
				<span>{m.landing_court({ n: 4 })}</span>
				<span class="move down">{m.landing_how_down()}</span>
			</div>
		</div>
		<p class="king-note">{m.landing_how_king()}</p>
	</section>

	<section class="block" aria-labelledby="formats-heading">
		<h2 id="formats-heading">{m.landing_formats_title()}</h2>
		<div class="format-grid">
			<article class="card">
				<h3>{m.format_random_seed()}</h3>
				<p>{m.landing_format_random_body()}</p>
			</article>
			<article class="card">
				<h3>{m.format_preseed()}</h3>
				<p>{m.landing_format_preseed_body()}</p>
			</article>
		</div>
	</section>

	<section class="block" aria-labelledby="features-heading">
		<h2 id="features-heading">{m.landing_features_title()}</h2>
		<div class="feature-grid">
			{#each features as feature (feature.id)}
				<article class="card">
					<h3>{feature.title}</h3>
					<p>{feature.body}</p>
				</article>
			{/each}
		</div>
	</section>

	<section class="close">
		<h2>{m.landing_close_title()}</h2>
		<p>{m.landing_close_body()}</p>
		<div class="hero-actions">
			<a href={localizeHref(resolve('/signup'))} class="btn-primary">
				{m.landing_cta_signup()}
			</a>
			<a href={localizeHref(resolve('/docs'))} class="btn-secondary">
				{m.landing_cta_docs()}
			</a>
		</div>
	</section>
</div>

<style>
	.landing {
		max-width: 800px;
		margin: 0 auto;
		padding: var(--spacing-xl) var(--spacing-md) 6rem;
	}

	.hero,
	.block,
	.close {
		margin-bottom: var(--spacing-xl);
	}

	.brand {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
		margin-bottom: var(--spacing-lg);
	}

	.logo {
		width: 72px;
		height: 72px;
		border-radius: var(--radius-md);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
		object-fit: cover;
		flex-shrink: 0;
	}

	.eyebrow {
		margin: 0 0 var(--spacing-xs);
		font-size: var(--font-size-sm);
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--accent-primary);
	}

	h1 {
		margin: 0;
		font-size: 1.75rem;
		font-weight: 800;
		letter-spacing: -0.03em;
		line-height: 1.1;
	}

	.tagline {
		margin: 0 0 var(--spacing-md);
		font-size: var(--font-size-lg);
		font-weight: 700;
		line-height: 1.35;
		color: var(--text-primary);
	}

	.lead,
	.section-lead,
	.close p {
		margin: 0 0 var(--spacing-lg);
		color: var(--text-secondary);
		line-height: 1.55;
	}

	.hero-actions {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
		margin-bottom: var(--spacing-lg);
	}

	.hero-actions a {
		width: 100%;
	}

	.stats {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-sm);
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.stats li {
		padding: var(--spacing-xs) var(--spacing-sm);
		border: 2px solid var(--border-default);
		border-radius: var(--radius-sm);
		background: var(--bg-card);
		font-size: var(--font-size-sm);
		font-weight: 700;
		color: var(--text-secondary);
	}

	h2 {
		margin: 0 0 var(--spacing-md);
		font-size: var(--font-size-xl);
	}

	.rotation {
		list-style: none;
		margin: 0 0 var(--spacing-lg);
		padding: 0;
		display: grid;
		gap: var(--spacing-sm);
	}

	.rotation li {
		padding: var(--spacing-md);
		background: var(--bg-card);
		border: 2px solid var(--border-default);
		border-radius: var(--radius-md);
	}

	.match-label {
		display: block;
		margin-bottom: var(--spacing-sm);
		font-size: var(--font-size-xs);
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.matchup {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--spacing-sm);
		flex-wrap: wrap;
	}

	.pair {
		flex: 1 1 6rem;
		padding: var(--spacing-sm);
		background: var(--bg-secondary);
		border-radius: var(--radius-sm);
		text-align: center;
		font-weight: 700;
	}

	.vs {
		flex: 0 0 auto;
		font-size: var(--font-size-sm);
		font-weight: 700;
		color: var(--text-muted);
		text-transform: uppercase;
	}

	.ladder {
		display: grid;
		gap: var(--spacing-sm);
		margin-bottom: var(--spacing-md);
	}

	.ladder-court {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
		padding: var(--spacing-sm) var(--spacing-md);
		background: var(--bg-card);
		border: 2px solid var(--border-default);
		border-radius: var(--radius-md);
		font-weight: 700;
	}

	.ladder-court.king {
		border-color: var(--accent-primary);
		box-shadow: var(--glow-primary);
	}

	.move {
		font-size: var(--font-size-sm);
		font-weight: 600;
	}

	.move.up {
		color: var(--accent-success);
	}

	.move.down {
		color: var(--accent-info);
	}

	.king-note {
		margin: 0;
		font-weight: 700;
		color: var(--text-primary);
	}

	.format-grid,
	.feature-grid {
		display: grid;
		gap: var(--spacing-md);
	}

	.card {
		padding: var(--spacing-md);
		background: var(--bg-card);
		border: 2px solid var(--border-default);
		border-radius: var(--radius-md);
	}

	.card h3 {
		margin: 0 0 var(--spacing-sm);
		color: var(--accent-primary);
	}

	.card p {
		margin: 0;
		color: var(--text-secondary);
		line-height: 1.5;
	}

	.close {
		padding: var(--spacing-lg) var(--spacing-md);
		background: var(--bg-card);
		border: 2px solid var(--accent-primary);
		border-radius: var(--radius-md);
		text-align: center;
	}

	.close h2 {
		margin-bottom: var(--spacing-sm);
	}

	.close .hero-actions {
		margin-bottom: 0;
	}

	@media (min-width: 640px) {
		h1 {
			font-size: 2.25rem;
		}

		.logo {
			width: 96px;
			height: 96px;
		}

		.hero-actions {
			flex-direction: row;
			flex-wrap: wrap;
		}

		.hero-actions a {
			width: auto;
			min-width: 10rem;
		}

		.matchup {
			flex-wrap: nowrap;
		}

		.ladder-court {
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
		}

		.format-grid,
		.feature-grid {
			grid-template-columns: 1fr 1fr;
		}
	}
</style>
