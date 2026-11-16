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

	const shots = $derived([
		{
			id: 'player',
			src: '/landing/player.png',
			width: 780,
			height: 1508,
			title: m.landing_shot_player_title(),
			caption: m.landing_shot_player_caption(),
			alt: m.landing_shot_player_alt()
		},
		{
			id: 'court',
			src: '/landing/court.png',
			width: 780,
			height: 1348,
			title: m.landing_shot_court_title(),
			caption: m.landing_shot_court_caption(),
			alt: m.landing_shot_court_alt()
		},
		{
			id: 'standings',
			src: '/landing/standings.png',
			width: 780,
			height: 1571,
			title: m.landing_shot_standings_title(),
			caption: m.landing_shot_standings_caption(),
			alt: m.landing_shot_standings_alt()
		}
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

{#snippet featureIcon(id: string)}
	<svg viewBox="0 0 32 32" aria-hidden="true">
		{#if id === 'qr'}
			<path d="M6 6h8v8H6zM18 6h8v8h-8zM6 18h8v8H6z" />
			<path d="M18 18h3v3h-3zM23 18h3v3h-3zM18 23h3v3h-3zM23 23h3v3h-3z" />
		{:else if id === 'player'}
			<circle cx="16" cy="11" r="4" />
			<path d="M8 25c1.5-4 4.2-6 8-6s6.5 2 8 6" />
		{:else if id === 'checkin'}
			<path d="M8 7h16v18H8z" />
			<path d="M12 13h8M12 17h8M12 21h5" />
		{:else if id === 'courts'}
			<path d="M6 8h20v16H6zM16 8v16M6 16h20" />
		{:else if id === 'scoring'}
			<path d="M8 22V12M16 22V8M24 22v-6" />
		{:else}
			<circle cx="16" cy="16" r="5" />
			<path
				d="M16 4v3M16 25v3M4 16h3M25 16h3M7.5 7.5l2 2M22.5 22.5l2 2M24.5 7.5l-2 2M9.5 22.5l-2 2"
			/>
		{/if}
	</svg>
{/snippet}

<div class="landing" data-testid="landing">
	<section class="hero">
		<div class="hero-copy">
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
		</div>
		<figure class="hero-photo">
			<img
				src="/landing/hero.jpg"
				alt={m.landing_hero_alt()}
				width="1280"
				height="720"
				fetchpriority="high"
			/>
		</figure>
	</section>

	<section class="block" aria-labelledby="gallery-heading">
		<h2 id="gallery-heading">{m.landing_gallery_title()}</h2>
		<p class="section-lead">{m.landing_gallery_lead()}</p>
		<div class="shots">
			{#each shots as shot (shot.id)}
				<figure class="shot">
					<div class="phone">
						<img src={shot.src} alt={shot.alt} width={shot.width} height={shot.height} />
					</div>
					<figcaption>
						<h3>{shot.title}</h3>
						<p>{shot.caption}</p>
					</figcaption>
				</figure>
			{/each}
		</div>
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
				<article class="card feature">
					<span class="feature-icon">{@render featureIcon(feature.id)}</span>
					<div>
						<h3>{feature.title}</h3>
						<p>{feature.body}</p>
					</div>
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
		max-width: 1080px;
		margin: 0 auto;
		padding: var(--spacing-lg) var(--spacing-md) 6rem;
	}

	.hero,
	.block,
	.close {
		margin-bottom: var(--spacing-xl);
	}

	.hero {
		display: grid;
		gap: var(--spacing-lg);
	}

	.hero-photo {
		margin: 0;
		order: -1;
	}

	.hero-photo img {
		display: block;
		width: 100%;
		height: auto;
		max-height: 280px;
		object-fit: cover;
		object-position: center 60%;
		border-radius: var(--radius-lg);
		border: 2px solid var(--border-default);
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
	.close p,
	.shot p {
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

	.shots {
		display: grid;
		gap: var(--spacing-lg);
	}

	.shot {
		margin: 0;
	}

	.phone {
		margin: 0 auto var(--spacing-md);
		max-width: 280px;
		padding: 10px;
		background: #111;
		border: 3px solid #3a3a3a;
		border-radius: 28px;
		box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
	}

	.phone img {
		display: block;
		width: 100%;
		height: auto;
		border-radius: 18px;
		background: var(--bg-primary);
	}

	.shot h3 {
		margin: 0 0 var(--spacing-xs);
		color: var(--accent-primary);
	}

	.shot p {
		margin: 0;
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

	.feature {
		display: flex;
		gap: var(--spacing-md);
		align-items: flex-start;
	}

	.feature-icon {
		flex: 0 0 auto;
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border-radius: var(--radius-md);
		background: var(--bg-secondary);
		border: 2px solid var(--accent-primary);
		color: var(--accent-primary);
	}

	.feature-icon svg {
		width: 26px;
		height: 26px;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
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

	@media (min-width: 720px) {
		h1 {
			font-size: 2.4rem;
		}

		.logo {
			width: 96px;
			height: 96px;
		}

		.hero {
			grid-template-columns: 1.15fr 0.85fr;
			align-items: center;
		}

		.hero-photo {
			order: 0;
		}

		.hero-photo img {
			max-height: 420px;
			height: 100%;
			min-height: 280px;
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

		.shots,
		.format-grid,
		.feature-grid {
			grid-template-columns: 1fr 1fr;
		}

		.shots {
			grid-template-columns: repeat(3, 1fr);
			align-items: start;
		}
	}
</style>
