<script lang="ts">
	import * as m from '$lib/paraglide/messages';
</script>

<main class="faq-page">
	<header>
		<h1>{m.faq_title()}</h1>
		<p class="lead">{m.faq_lead()}</p>
	</header>

	<nav class="faq-toc" aria-label="{m.faq_categories()}">
		<ul>
			<li><a href="#getting-started">{m.faq_getting_started()}</a></li>
			<li><a href="#formats">{m.faq_formats()}</a></li>
			<li><a href="#scoring">{m.faq_scoring()}</a></li>
			<li><a href="#courts">{m.faq_courts()}</a></li>
			<li><a href="#standings">{m.faq_standings()}</a></li>
			<li><a href="#technical">{m.faq_technical()}</a></li>
		</ul>
	</nav>

	<article>
		<section id="getting-started">
			<h2>{m.faq_getting_started()}</h2>

			<details>
				<summary>{m.faq_q_what_is_kob()}</summary>
				<div class="answer">
					<p>{m.faq_a_what_is_kob()}</p>
				</div>
			</details>

			<details>
				<summary>{m.faq_q_how_many_players()}</summary>
				<div class="answer">
					<p>{m.faq_a_how_many_players()}</p>
				</div>
			</details>

			<details>
				<summary>{m.faq_q_do_players_need_accounts()}</summary>
				<div class="answer">
					<p>{m.faq_a_do_players_need_accounts()}</p>
				</div>
			</details>

			<details>
				<summary>{m.faq_q_how_to_create_tournament()}</summary>
				<div class="answer">
					<p>{m.faq_a_how_to_create_tournament()}</p>
				</div>
			</details>
		</section>

		<section id="formats">
			<h2>{m.faq_formats()}</h2>

			<details>
				<summary>{m.faq_q_random_vs_preseed()}</summary>
				<div class="answer">
					<p>{m.faq_a_random_vs_preseed()}</p>
				</div>
			</details>

			<details>
				<summary>{m.faq_q_which_format_should_i_choose()}</summary>
				<div class="answer">
					<p>{m.faq_a_which_format()}</p>
				</div>
			</details>

			<details>
				<summary>{m.faq_q_how_many_rounds()}</summary>
				<div class="answer">
					<p>{m.faq_a_how_many_rounds()}</p>
				</div>
			</details>

			<details>
				<summary>{m.faq_q_can_i_change_format_mid_tournament()}</summary>
				<div class="answer">
					<p>{m.faq_a_change_format()}</p>
				</div>
			</details>

			<details>
				<summary>{m.faq_q_what_is_frozen_court()}</summary>
				<div class="answer">
					<p>{m.faq_a_frozen_court()}</p>
				</div>
			</details>
		</section>

		<section id="scoring">
			<h2>{m.faq_scoring()}</h2>

			<details>
				<summary>{m.faq_q_scoring_modes()}</summary>
				<div class="answer">
					<p>{m.faq_a_scoring_modes()}</p>
				</div>
			</details>

			<details>
				<summary>{m.faq_q_deuce_rules()}</summary>
				<div class="answer">
					<p>{m.faq_a_deuce_rules()}</p>
				</div>
			</details>

			<details>
				<summary>{m.faq_q_can_i_override_scoring_per_court()}</summary>
				<div class="answer">
					<p>{m.faq_a_override_scoring()}</p>
				</div>
			</details>

			<details>
				<summary>{m.faq_q_best_of_3_deciding_set()}</summary>
				<div class="answer">
					<p>{m.faq_a_best_of_3_deciding()}</p>
				</div>
			</details>

			<details>
				<summary>{m.faq_q_why_5p_6p_default_15()}</summary>
				<div class="answer">
					<p>{m.faq_a_why_5p_6p_15()}</p>
				</div>
			</details>
		</section>

		<section id="courts">
			<h2>{m.faq_courts()}</h2>

			<details>
				<summary>{m.faq_q_3p_5p_6p_courts()}</summary>
				<div class="answer">
					<p>{m.faq_a_3p_5p_6p_courts()}</p>
				</div>
			</details>

			<details>
				<summary>{m.faq_q_how_5p_parallel_works()}</summary>
				<div class="answer">
					<p>{m.faq_a_how_5p_parallel()}</p>
				</div>
			</details>

			<details>
				<summary>{m.faq_q_how_6p_parallel_works()}</summary>
				<div class="answer">
					<p>{m.faq_a_how_6p_parallel()}</p>
				</div>
			</details>

			<details>
				<summary>{m.faq_q_virtual_vs_physical()}</summary>
				<div class="answer">
					<p>{m.faq_a_virtual_vs_physical()}</p>
				</div>
			</details>

			<details>
				<summary>{m.faq_q_can_i_set_court_labels()}</summary>
				<div class="answer">
					<p>{m.faq_a_court_labels()}</p>
				</div>
			</details>

			<details>
				<summary>{m.faq_q_two_groups_one_court()}</summary>
				<div class="answer">
					<p>{m.faq_a_two_groups_one_court()}</p>
				</div>
			</details>
		</section>

		<section id="standings">
			<h2>{m.faq_standings()}</h2>

			<details>
				<summary>{m.faq_q_how_standings_calculated()}</summary>
				<div class="answer">
					<p>{m.faq_a_how_standings()}</p>
				</div>
			</details>

			<details>
				<summary>{m.faq_q_tie_break_factors()}</summary>
				<div class="answer">
					<p>{m.faq_a_tie_break_factors()}</p>
				</div>
			</details>

			<details>
				<summary>{m.faq_q_tie_break_icons()}</summary>
				<div class="answer">
					<p>{m.faq_a_tie_break_icons()}</p>
					<div class="icon-legend-small">
						<span class="factor-icon tied">P</span><span>{m.faq_icon_tied()}</span>
						<span class="factor-icon deciding">P</span><span>{m.faq_icon_deciding()}</span>
						<span class="factor-icon deciding-won">P</span><span>{m.faq_icon_won()}</span>
						<span class="factor-icon deciding-middle">P</span><span>{m.faq_icon_middle()}</span>
						<span class="factor-icon deciding-lost">P</span><span>{m.faq_icon_lost()}</span>
					</div>
				</div>
			</details>

			<details>
				<summary>{m.faq_q_can_i_customize_tie_breaks()}</summary>
				<div class="answer">
					<p>{m.faq_a_customize_tie_breaks()}</p>
				</div>
			</details>

			<details>
				<summary>{m.faq_q_how_winner_determined()}</summary>
				<div class="answer">
					<p>{m.faq_a_how_winner()}</p>
				</div>
			</details>

			<details>
				<summary>{m.faq_q_total_standings_page()}</summary>
				<div class="answer">
					<p>{m.faq_a_total_standings()}</p>
				</div>
			</details>
		</section>

		<section id="technical">
			<h2>{m.faq_technical()}</h2>

			<details>
				<summary>{m.faq_q_what_browser()}</summary>
				<div class="answer">
					<p>{m.faq_a_what_browser()}</p>
				</div>
			</details>

			<details>
				<summary>{m.faq_q_works_offline()}</summary>
				<div class="answer">
					<p>{m.faq_a_works_offline()}</p>
				</div>
			</details>

			<details>
				<summary>{m.faq_q_data_stored()}</summary>
				<div class="answer">
					<p>{m.faq_a_data_stored()}</p>
				</div>
			</details>

			<details>
				<summary>{m.faq_q_tournament_deleted()}</summary>
				<div class="answer">
					<p>{m.faq_a_tournament_deleted()}</p>
				</div>
			</details>

			<details>
				<summary>{m.faq_q_can_i_export()}</summary>
				<div class="answer">
					<p>{m.faq_a_can_i_export()}</p>
				</div>
			</details>

			<details>
				<summary>{m.faq_q_privacy()}</summary>
				<div class="answer">
					<p>{m.faq_a_privacy()}</p>
				</div>
			</details>
		</section>
	</article>

	<footer>
		<p>{m.faq_footer()}</p>
	</footer>
</main>

<style>
	.faq-page {
		max-width: 800px;
		margin: 0 auto;
		padding: var(--spacing-xl) var(--spacing-md);
	}

	header {
		margin-bottom: var(--spacing-xl);
		text-align: center;
	}

	h1 {
		font-size: var(--font-size-3xl);
		margin-bottom: var(--spacing-md);
	}

	.lead {
		font-size: var(--font-size-lg);
		color: var(--text-muted);
		max-width: 700px;
		margin: 0 auto;
	}

	.faq-toc {
		background: var(--bg-secondary);
		border-radius: var(--radius-md);
		padding: var(--spacing-lg);
		margin-bottom: var(--spacing-xl);
		border: 1px solid var(--border-default);
	}

	.faq-toc ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-sm) var(--spacing-lg);
	}

	.faq-toc a {
		color: var(--accent-primary);
		text-decoration: none;
		font-weight: 500;
		font-size: var(--font-size-sm);
	}

	.faq-toc a:hover {
		text-decoration: underline;
	}

	article section {
		margin-bottom: var(--spacing-xxl);
	}

	h2 {
		font-size: var(--font-size-2xl);
		margin-bottom: var(--spacing-lg);
		padding-bottom: var(--spacing-xs);
		border-bottom: 2px solid var(--accent-primary);
	}

	details {
		background: var(--bg-card);
		border: 1px solid var(--border-default);
		border-radius: var(--radius-md);
		margin-bottom: var(--spacing-md);
		overflow: hidden;
	}

	summary {
		padding: var(--spacing-md) var(--spacing-lg);
		font-weight: 600;
		font-size: var(--font-size-base);
		cursor: pointer;
		list-style: none;
		display: flex;
		justify-content: space-between;
		align-items: center;
		color: var(--text-primary);
		background: var(--bg-secondary);
		border-bottom: 1px solid var(--border-default);
		transition: background var(--transition-fast);
	}

	summary::-webkit-details-marker {
		display: none;
	}

	summary::after {
		content: '+';
		font-size: var(--font-size-lg);
		font-weight: 300;
		color: var(--accent-primary);
		transition: transform var(--transition-fast);
	}

	details[open] summary::after {
		transform: rotate(45deg);
	}

	summary:hover {
		background: var(--bg-tertiary);
	}

	.answer {
		padding: var(--spacing-lg);
		line-height: 1.7;
		color: var(--text-secondary);
	}

	.answer p {
		margin: 0 0 var(--spacing-md);
	}

	.answer p:last-child {
		margin-bottom: 0;
	}

	.icon-legend-small {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-md);
		margin-top: var(--spacing-md);
		font-size: var(--font-size-sm);
	}

	.icon-legend-small > span {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
	}

	.factor-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.3rem;
		height: 1.3rem;
		font-size: 0.7rem;
		font-weight: 700;
		border-radius: 3px;
		border: 1px solid var(--border-color);
		background: var(--bg-secondary);
		color: var(--text-muted);
	}

	.factor-icon.tied {
		opacity: 0.65;
		border-style: dashed;
	}

	.factor-icon.deciding {
		opacity: 1;
		color: var(--accent-info);
		border-color: var(--accent-info);
		border-style: solid;
		background: color-mix(in srgb, var(--accent-info) 18%, var(--bg-secondary));
		box-shadow: 0 0 0 1px var(--accent-info);
	}

	.factor-icon.deciding-won {
		color: var(--accent-warning);
		border-color: var(--accent-warning);
		background: color-mix(in srgb, var(--accent-warning) 18%, var(--bg-secondary));
		box-shadow: 0 0 0 1px var(--accent-warning);
	}

	.factor-icon.deciding-middle {
		color: var(--accent-success);
		border-color: var(--accent-success);
		background: color-mix(in srgb, var(--accent-success) 18%, var(--bg-secondary));
		box-shadow: 0 0 0 1px var(--accent-success);
	}

	.factor-icon.deciding-lost {
		color: var(--accent-info);
		border-color: var(--accent-info);
		background: color-mix(in srgb, var(--accent-info) 18%, var(--bg-secondary));
		box-shadow: 0 0 0 1px var(--accent-info);
	}

	footer {
		margin-top: var(--spacing-xxl);
		padding-top: var(--spacing-xl);
		border-top: 1px solid var(--border-default);
		text-align: center;
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	@media (max-width: 600px) {
		.faq-toc ul {
			flex-direction: column;
			gap: var(--spacing-xs);
		}
	}
</style>