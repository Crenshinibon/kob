<script lang="ts">
	import { localizeHref } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages';
</script>

<main class="docs-page">
	<header>
		<h1>{m.docs_title()}</h1>
		<p class="lead">{m.docs_lead()}</p>
	</header>

	<nav class="toc" aria-label="{m.docs_toc_label()}">
		<ul>
			<li><a href="#how-kob-works">{m.docs_how_kob_works()}</a></li>
			<li><a href="#tournament-formats">{m.docs_tournament_formats()}</a></li>
			<li><a href="#scoring-modes">{m.docs_scoring_modes()}</a></li>
			<li><a href="#tie-breaking">{m.docs_tie_breaking()}</a></li>
			<li><a href="#court-types">{m.docs_court_types()}</a></li>
			<li><a href="#promotion-relegation">{m.docs_promotion_relegation()}</a></li>
			<li><a href="#virtual-courts">{m.docs_virtual_courts()}</a></li>
			<li><a href="#practical-implementations">{m.docs_practical_implementations()}</a></li>
		</ul>
	</nav>

	<article>
		<section id="how-kob-works">
			<h2>{m.docs_how_kob_works()}</h2>

			<h3>{m.docs_basic_concept()}</h3>
			<p>{m.docs_basic_concept_p1()}</p>
			<p>{m.docs_basic_concept_p2()}</p>

			<div class="example-box">
				<h4>{m.docs_example_tournament()}</h4>
				<p>{m.docs_example_tournament_p1()}</p>

				<div class="round-progression">
					<h5>{m.docs_round_progression()}</h5>
					<pre>{m.docs_diagram_round_progression()}</pre>
				</div>
			</div>

			<h3>{m.docs_key_principles()}</h3>
			<ul>
				<li>{m.docs_principle_partner_rotation()}</li>
				<li>{m.docs_principle_individual_ranking()}</li>
				<li>{m.docs_principle_court_position()}</li>
				<li>{m.docs_principle_stable_tokens()}</li>
			</ul>
		</section>

		<section id="tournament-formats">
			<h2>{m.docs_tournament_formats()}</h2>

			<h3>{m.docs_format_random_seed()}</h3>
			<p>{m.docs_format_random_seed_p1()}</p>

			<h4>{m.docs_round_1_2_vertical_seeding()}</h4>
			<p>{m.docs_round_1_2_vertical_seeding_p1()}</p>
			<div class="diagram">
				<pre>{m.docs_diagram_vertical_seeding()}</pre>
			</div>

			<h4>{m.docs_round_2plus_ladder()}</h4>
			<p>{m.docs_round_2plus_ladder_p1()}</p>
			<div class="diagram">
				<pre>{m.docs_diagram_ladder()}</pre>
			</div>

			<h3>{m.docs_format_preseed()}</h3>
			<p>{m.docs_format_preseed_p1()}</p>
			<p>{m.docs_format_preseed_p2()}</p>

			<h4>{m.docs_preseed_bracket_tree()}</h4>
			<p>{m.docs_preseed_bracket_tree_p1()}</p>
			<div class="diagram">
				<pre>{m.docs_diagram_preseed_bracket()}</pre>
			</div>

			<h4>{m.docs_preseed_frozen_courts()}</h4>
			<p>{m.docs_preseed_frozen_courts_p1()}</p>
			<p>{m.docs_preseed_frozen_courts_p2()}</p>
			<div class="diagram">
				<pre>{m.docs_diagram_frozen_courts()}</pre>
			</div>

			<h3>{m.docs_format_comparison()}</h3>
			<table class="comparison-table">
				<thead>
					<tr>
						<th>{m.docs_aspect()}</th>
						<th>{m.docs_random_seed()}</th>
						<th>{m.docs_preseed()}</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>{m.docs_round_count()}</td>
						<td>{m.docs_flexible()}</td>
						<td>{m.docs_fixed_formula()}</td>
					</tr>
					<tr>
						<td>{m.docs_redistribution()}</td>
						<td>{m.docs_ladder()}</td>
						<td>{m.docs_tiered_binary()}</td>
					</tr>
					<tr>
						<td>{m.docs_seeding()}</td>
						<td>{m.docs_random_shuffle()}</td>
						<td>{m.docs_snake_by_points()}</td>
					</tr>
					<tr>
						<td>{m.docs_player_count()}</td>
						<td>{m.docs_8_64()}</td>
						<td>{m.docs_8_64()}</td>
					</tr>
					<tr>
						<td>{m.docs_best_for()}</td>
						<td>{m.docs_casual_flexible()}</td>
						<td>{m.docs_competitive_structured()}</td>
					</tr>
				</tbody>
			</table>
		</section>

		<section id="scoring-modes">
			<h2>{m.docs_scoring_modes()}</h2>

			<h3>{m.docs_single_set()}</h3>
			<p>{m.docs_single_set_p1()}</p>
			<ul>
				<li>{m.docs_single_set_bullet1()}</li>
				<li>{m.docs_single_set_bullet2()}</li>
				<li>{m.docs_single_set_bullet3()}</li>
				<li>{m.docs_single_set_bullet4()}</li>
			</ul>

			<h3>{m.docs_best_of_3()}</h3>
			<p>{m.docs_best_of_3_p1()}</p>
			<ul>
				<li>{m.docs_best_of_3_bullet1()}</li>
				<li>{m.docs_best_of_3_bullet2()}</li>
				<li>{m.docs_best_of_3_bullet3()}</li>
				<li>{m.docs_best_of_3_bullet4()}</li>
				<li>{m.docs_best_of_3_bullet5()}</li>
			</ul>

			<h3>{m.docs_custom()}</h3>
			<p>{m.docs_custom_p1()}</p>
			<ul>
				<li>{m.docs_custom_bullet1()}</li>
				<li>{m.docs_custom_bullet2()}</li>
				<li>{m.docs_custom_bullet3()}</li>
				<li>{m.docs_custom_bullet4()}</li>
			</ul>

			<h3>{m.docs_per_court_overrides()}</h3>
			<p>{m.docs_per_court_overrides_p1()}</p>
			<p>{m.docs_per_court_overrides_p2()}</p>

			<h3>{m.docs_deuce_aware_validation()}</h3>
			<p>{m.docs_deuce_aware_validation_p1()}</p>
			<p>{m.docs_deuce_aware_validation_p2()}</p>
			<div class="example-box">
				<h4>{m.docs_valid_examples()}</h4>
				<ul>
					<li>21-19 (win by 2) ✓</li>
					<li>22-20 (deuce) ✓</li>
					<li>30-28 (extended deuce) ✓</li>
					<li>21-20 (win by 1) ✗ — rejected if win-by-2</li>
					<li>15-13 (deciding set) ✓</li>
				</ul>
			</div>
		</section>

		<section id="tie-breaking">
			<h2>{m.docs_tie_breaking()}</h2>

			<h3>{m.docs_tie_break_overview()}</h3>
			<p>{m.docs_tie_break_overview_p1()}</p>

			<h3>{m.docs_tie_break_factors()}</h3>
			<table class="factor-table">
				<thead>
					<tr>
						<th>{m.docs_factor_id()}</th>
						<th>{m.docs_factor_icon()}</th>
						<th>{m.docs_factor_label()}</th>
						<th>{m.docs_factor_description()}</th>
						<th>{m.docs_factor_default()}</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><code>round_points</code></td>
						<td><span class="glyph">P</span></td>
						<td>{m.tie_break_factor_round_points()}</td>
						<td>{m.docs_factor_round_points_desc()}</td>
						<td>{m.docs_enabled()}</td>
					</tr>
					<tr>
						<td><code>round_diff</code></td>
						<td><span class="glyph">±</span></td>
						<td>{m.tie_break_factor_round_diff()}</td>
						<td>{m.docs_factor_round_diff_desc()}</td>
						<td>{m.docs_enabled()}</td>
					</tr>
					<tr>
						<td><code>total_points</code></td>
						<td><span class="glyph">Σ</span></td>
						<td>{m.tie_break_factor_total_points()}</td>
						<td>{m.docs_factor_total_points_desc()}</td>
						<td>{m.docs_enabled()}</td>
					</tr>
					<tr>
						<td><code>total_diff</code></td>
						<td><span class="glyph">Δ</span></td>
						<td>{m.tie_break_factor_total_diff()}</td>
						<td>{m.docs_factor_total_diff_desc()}</td>
						<td>{m.docs_enabled()}</td>
					</tr>
					<tr>
						<td><code>initial_order</code></td>
						<td><span class="glyph">#</span></td>
						<td>{m.tie_break_factor_initial_order()}</td>
						<td>{m.docs_factor_initial_order_desc()}</td>
						<td>{m.docs_enabled()}</td>
					</tr>
					<tr>
						<td><code>dice</code></td>
						<td><span class="glyph">🎲</span></td>
						<td>{m.tie_break_factor_dice()}</td>
						<td>{m.docs_factor_dice_desc()}</td>
						<td>{m.docs_disabled()}</td>
					</tr>
					<tr>
						<td><code>manual</code></td>
						<td><span class="glyph">✋</span></td>
						<td>{m.tie_break_factor_manual()}</td>
						<td>{m.docs_factor_manual_desc()}</td>
						<td>{m.docs_disabled()}</td>
					</tr>
				</tbody>
			</table>

			<h3>{m.docs_tie_break_icons_meaning()}</h3>
			<p>{m.docs_tie_break_icons_p1()}</p>
			<div class="icon-legend">
				<div class="icon-item">
					<span class="factor-icon tied">P</span>
					<span>{m.docs_icon_tied()}</span>
				</div>
				<div class="icon-item">
					<span class="factor-icon deciding">P</span>
					<span>{m.docs_icon_deciding()}</span>
				</div>
				<div class="icon-item">
					<span class="factor-icon deciding-won">P</span>
					<span>{m.docs_icon_won()}</span>
				</div>
				<div class="icon-item">
					<span class="factor-icon deciding-middle">P</span>
					<span>{m.docs_icon_middle()}</span>
				</div>
				<div class="icon-item">
					<span class="factor-icon deciding-lost">P</span>
					<span>{m.docs_icon_lost()}</span>
				</div>
			</div>

			<h3>{m.docs_tie_break_5p6p_normalization()}</h3>
			<p>{m.docs_tie_break_5p6p_p1()}</p>
			<p>{m.docs_tie_break_5p6p_p2()}</p>
			<div class="diagram">
				<pre>{m.docs_diagram_5p6p_normalization()}</pre>
			</div>

			<h3>{m.docs_where_tie_breaking_applies()}</h3>
			<table class="context-table">
				<thead>
					<tr>
						<th>{m.docs_context()}</th>
						<th>{m.docs_factors_used()}</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>{m.docs_court_standings()}</td>
						<td>{m.docs_all_enabled_factors()}</td>
					</tr>
					<tr>
						<td>{m.docs_vertical_seeding()}</td>
						<td>{m.docs_all_enabled_factors()}</td>
					</tr>
					<tr>
						<td>{m.docs_preseed_redistribution()}</td>
						<td>{m.docs_all_enabled_factors()}</td>
					</tr>
					<tr>
						<td>{m.docs_ladder_rank_picks()}</td>
						<td>{m.docs_all_enabled_factors()}</td>
					</tr>
					<tr>
						<td>{m.docs_final_positions()}</td>
						<td>{m.docs_all_enabled_factors()}</td>
					</tr>
				</tbody>
			</table>

			<h3>{m.docs_configuring_tie_breaks()}</h3>
			<p>{m.docs_configuring_tie_breaks_p1()}</p>
			<ul>
				<li>{m.docs_configuring_bullet1()}</li>
				<li>{m.docs_configuring_bullet2()}</li>
				<li>{m.docs_configuring_bullet3()}</li>
			</ul>
		</section>

		<section id="court-types">
			<h2>{m.docs_court_types()}</h2>

			<h3>{m.docs_standard_4p()}</h3>
			<p>{m.docs_standard_4p_p1()}</p>
			<div class="diagram">
				<pre>{m.docs_diagram_4p()}</pre>
			</div>

			<h3>{m.docs_3p_courts()}</h3>
			<p>{m.docs_3p_courts_p1()}</p>
			<p>{m.docs_3p_courts_p2()}</p>
			<div class="diagram">
				<pre>{m.docs_diagram_3p()}</pre>
			</div>

			<h3>{m.docs_5p_courts()}</h3>
			<p>{m.docs_5p_courts_p1()}</p>
			<p>{m.docs_5p_courts_p2()}</p>

			<h4>{m.docs_5p_how_it_works()}</h4>
			<div class="diagram">
				<pre>{m.docs_diagram_5p()}</pre>
			</div>

			<h3>{m.docs_6p_courts()}</h3>
			<p>{m.docs_6p_courts_p1()}</p>
			<p>{m.docs_6p_courts_p2()}</p>

			<h4>{m.docs_6p_how_it_works()}</h4>
			<div class="diagram">
				<pre>{m.docs_diagram_6p()}</pre>
			</div>

			<h3>{m.docs_court_timing()}</h3>
			<table class="timing-table">
				<thead>
					<tr>
						<th>{m.docs_court_type()}</th>
						<th>{m.docs_games()}</th>
						<th>{m.docs_point_target()}</th>
						<th>{m.docs_est_duration()}</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>4p (single set to 21)</td>
						<td>3</td>
						<td>21</td>
						<td>~60 min</td>
					</tr>
					<tr>
						<td>4p (best-of-3 to 15)</td>
						<td>≤9</td>
						<td>15</td>
						<td>~55 min</td>
					</tr>
					<tr>
						<td>3p (single set to 21)</td>
						<td>3</td>
						<td>21</td>
						<td>~48 min</td>
					</tr>
					<tr>
						<td>5p (single set to 15)</td>
						<td>4</td>
						<td>15</td>
						<td>~60 min</td>
					</tr>
					<tr>
						<td>6p (single set to 15)</td>
						<td>4</td>
						<td>15</td>
						<td>~60 min</td>
					</tr>
				</tbody>
			</table>
			<p class="note">{m.docs_timing_note()}</p>
		</section>

		<section id="promotion-relegation">
			<h2>{m.docs_promotion_relegation()}</h2>

			<h3>{m.docs_random_seed_ladder()}</h3>
			<p>{m.docs_random_seed_ladder_p1()}</p>

			<h4>{m.docs_16_players_4_courts()}</h4>
			<div class="diagram">
				<pre>{m.docs_diagram_16p_ladder()}</pre>
			</div>

			<h4>{m.docs_20_players_5_courts()}</h4>
			<div class="diagram">
				<pre>{m.docs_diagram_20p_ladder()}</pre>
			</div>

			<h3>{m.docs_preseed_bracket_redistribution()}</h3>
			<p>{m.docs_preseed_bracket_p1()}</p>

			<h4>{m.docs_16p_preseed_example()}</h4>
			<div class="diagram">
				<pre>{m.docs_diagram_16p_preseed()}</pre>
			</div>
		</section>

		<section id="virtual-courts">
			<h2>{m.docs_virtual_courts()}</h2>

			<p>{m.docs_virtual_courts_p1()}</p>

			<h3>{m.docs_batch_shift_model()}</h3>
			<p>{m.docs_batch_shift_p1()}</p>

			<h4>{m.docs_example_8v4()}</h4>
			<div class="diagram">
				<pre>{m.docs_diagram_8v4()}</pre>
			</div>

			<h4>{m.docs_example_12v4()}</h4>
			<div class="diagram">
				<pre>{m.docs_diagram_12v4()}</pre>
			</div>

			<h3>{m.docs_wait_time_forecasting()}</h3>
			<p>{m.docs_wait_time_p1()}</p>
			<div class="diagram">
				<pre>{m.docs_diagram_wait_time()}</pre>
			</div>
		</section>

		<section id="practical-implementations">
			<h2>{m.docs_practical_implementations()}</h2>

			<h3>{m.docs_two_groups_one_court()}</h3>
			<p>{m.docs_two_groups_one_court_p1()}</p>
			<p>{m.docs_two_groups_one_court_p2()}</p>

			<h4>{m.docs_traditional_vs_alternating()}</h4>
			<div class="diagram">
				<pre>{m.docs_diagram_traditional_alternating()}</pre>
			</div>

			<h3>{m.docs_tournament_day_timeline()}</h3>
			<p>{m.docs_tournament_day_p1()}</p>
			<div class="diagram">
				<pre>{m.docs_diagram_timeline()}</pre>
			</div>

			<h3>{m.docs_tips_for_organizers()}</h3>
			<ul>
				<li>{m.docs_tip1()}</li>
				<li>{m.docs_tip2()}</li>
				<li>{m.docs_tip3()}</li>
				<li>{m.docs_tip4()}</li>
				<li>{m.docs_tip5()}</li>
				<li>{m.docs_tip6()}</li>
				<li>{m.docs_tip7()}</li>
			</ul>
		</section>
	</article>

	<footer>
		<p>{m.docs_footer()}</p>
	</footer>
</main>

<style>
	.docs-page {
		max-width: 900px;
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

	.toc {
		background: var(--bg-secondary);
		border-radius: var(--radius-md);
		padding: var(--spacing-lg);
		margin-bottom: var(--spacing-xl);
		border: 1px solid var(--border-default);
	}

	.toc ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-sm) var(--spacing-lg);
	}

	.toc a {
		color: var(--accent-primary);
		text-decoration: none;
		font-weight: 500;
		font-size: var(--font-size-sm);
	}

	.toc a:hover {
		text-decoration: underline;
	}

	article section {
		margin-bottom: var(--spacing-xxl);
		padding-bottom: var(--spacing-xl);
		border-bottom: 1px solid var(--border-default);
	}

	article section:last-of-type {
		border-bottom: none;
	}

	h2 {
		font-size: var(--font-size-2xl);
		margin-bottom: var(--spacing-lg);
		padding-bottom: var(--spacing-xs);
		border-bottom: 2px solid var(--accent-primary);
	}

	h3 {
		font-size: var(--font-size-xl);
		margin: var(--spacing-lg) 0 var(--spacing-md);
	}

	h4 {
		font-size: var(--font-size-lg);
		margin: var(--spacing-md) 0 var(--spacing-sm);
		color: var(--text-secondary);
	}

	h5 {
		font-size: var(--font-size-base);
		margin: var(--spacing-sm) 0;
		color: var(--text-muted);
	}

	p {
		line-height: 1.7;
		margin-bottom: var(--spacing-md);
	}

	ul {
		margin: var(--spacing-md) 0;
		padding-left: var(--spacing-xl);
	}

	li {
		margin-bottom: var(--spacing-xs);
		line-height: 1.6;
	}

	.example-box {
		background: var(--bg-secondary);
		border: 1px solid var(--border-default);
		border-radius: var(--radius-md);
		padding: var(--spacing-lg);
		margin: var(--spacing-md) 0;
	}

	.diagram {
		background: var(--bg-tertiary);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-md);
		padding: var(--spacing-md);
		margin: var(--spacing-md) 0;
		overflow-x: auto;
	}

	.diagram pre {
		margin: 0;
		font-family: monospace;
		font-size: var(--font-size-sm);
		line-height: 1.5;
		white-space: pre;
	}

	.comparison-table,
	.factor-table,
	.context-table,
	.timing-table {
		width: 100%;
		border-collapse: collapse;
		margin: var(--spacing-md) 0;
		font-size: var(--font-size-sm);
	}

	.comparison-table th,
	.comparison-table td,
	.factor-table th,
	.factor-table td,
	.context-table th,
	.context-table td,
	.timing-table th,
	.timing-table td {
		border: 1px solid var(--border-default);
		padding: var(--spacing-sm) var(--spacing-md);
		text-align: left;
	}

	.comparison-table th,
	.factor-table th,
	.context-table th,
	.timing-table th {
		background: var(--bg-secondary);
		font-weight: 600;
	}

	.glyph {
		font-family: monospace;
		font-size: var(--font-size-lg);
		font-weight: bold;
	}

	.icon-legend {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-lg);
		margin: var(--spacing-md) 0;
	}

	.icon-item {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		font-size: var(--font-size-sm);
	}

	.factor-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.5rem;
		height: 1.5rem;
		font-size: 0.75rem;
		font-weight: 700;
		border-radius: 4px;
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

	.note {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
		font-style: italic;
		margin-top: var(--spacing-sm);
	}

	footer {
		margin-top: var(--spacing-xxl);
		padding-top: var(--spacing-xl);
		border-top: 1px solid var(--border-default);
		text-align: center;
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	code {
		background: var(--bg-secondary);
		padding: 0.1em 0.4em;
		border-radius: var(--radius-sm);
		font-size: 0.9em;
	}

	@media (max-width: 600px) {
		.toc ul {
			flex-direction: column;
			gap: var(--spacing-xs);
		}
		.diagram pre {
			font-size: 0.7rem;
		}
	}
</style>