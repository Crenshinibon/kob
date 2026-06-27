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
					<pre>{`Round 1:    [C1] [C2] [C3] [C4]  (random shuffle)
Round 2:    [C1] [C2] [C3] [C4]  (vertical seeding → ladder)
Round 3:    [C1] [C2] [C3] [C4]  (ladder: 2 up, 2 down)
Round 4:    [C1] [C2] [C3] [C4]  (ladder → Final)

16p is the special case where each tier (4 players) fills exactly one court.
		Winner = 1st place on Court 1 after final round.`}</pre>
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
				<pre>{`Algorithm:
1. Group all players by finish position (1sts, 2nds, 3rds, 4ths)
2. Sort each tier by points desc → diff desc → playerId asc
3. Flatten: [1sts..., 2nds..., 3rds..., 4ths...]
4. Fill courts sequentially: top players → Court 1, next → Court 2, etc.

16 players (4 courts): Each tier has exactly 4 players
→ Court 1 = All 1st place (sorted)
→ Court 2 = All 2nd place (sorted)
→ Court 3 = All 3rd place (sorted)
→ Court 4 = All 4th place (sorted)

20 players (5 courts): Tiers cross boundaries
→ 1sts: top 4 → C1, 5th → C2
→ 2nds: top 3 → C2, next 2 → C3
→ 3rds: top 2 → C3, next 2 → C4, last → C5
→ 4ths: top 1 → C4, next 3 → C5`}</pre>
			</div>

			<h4>{m.docs_round_2plus_ladder()}</h4>
			<p>{m.docs_round_2plus_ladder_p1()}</p>
			<div class="diagram">
				<pre>{`Court 1: Keep 1st & 2nd, add 1st & 2nd from Court 2
Court 2: Add 3rd & 4th from Court 1, add 1st & 2nd from Court 3
Court 3: Add 3rd & 4th from Court 2, add 1st & 2nd from Court 4
Court 4: Keep 3rd & 4th, add 3rd & 4th from Court 3

Same logic extends for any court count ≥ 2.`}</pre>
			</div>

			<h3>{m.docs_format_preseed()}</h3>
			<p>{m.docs_format_preseed_p1()}</p>
			<p>{m.docs_format_preseed_p2()}</p>

			<h4>{m.docs_preseed_bracket_tree()}</h4>
			<p>{m.docs_preseed_bracket_tree_p1()}</p>
			<div class="diagram">
				<pre>{`16 Players (4 Courts, 3 Rounds):
Round 1:    [C1] [C2] [C3] [C4]     (snake seeding)
              ↓
Round 2:    [W1] [W2] | [L1] [L2]  (splitSize(4)=2 → 2W+2L, origin mixing)
              ↓          ↓
Round 3:  [F] [L(W)] | [TL] [BL]   (each bracket halves: 2→1F+1L(W), 2→1TL+1BL)

Winner bracket (C1,C2): 1sts+2nds → Court 1 (Gold), 3rds+4ths → Court 2 (Silver)
Loser bracket (C3,C4):  1sts+2nds → Court 3 (Bronze), 3rds+4ths → Court 4 (Iron)

32 Players (8 Courts, 4 Rounds):
R1→R2: splitSize(8)=4 → 4W + 4L
R2→R3: Each half of 8 splits independently (splitSize(8)=4 → 4W+4L in winners, same in losers)
R3→R4: Each quarter of 4 splits (splitSize(4)=2 → 2W+2L)`}</pre>
			</div>

			<h4>{m.docs_preseed_frozen_courts()}</h4>
			<p>{m.docs_preseed_frozen_courts_p1()}</p>
			<p>{m.docs_preseed_frozen_courts_p2()}</p>
			<div class="diagram">
				<pre>{`Cascade freeze points (examples):
3 courts:  C3 after R2 (3→2W+1L, winners halve at R3)
4 courts:  C4 after R3 (4→2+2, then 2→1+1)
5 courts:  C5 after R2 (5→4+1, overflow freezes), C1-C4 after R4
7 courts:  C7 after R3 (7→4+3, losers 3→2+1), C1-C6 after R4
8 courts:  C8 after R4 (8→4+4, then 4→2+2, then 2→1+1)
16 courts: C16 after R5 (16→8+8, 8→4+4, 4→2+2, 2→1+1)

Frozen courts complete their bracket leaves early and don't participate in further splits.`}</pre>
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
				<pre>{`Round points (5p/6p):
round_points = sum(matchPoints) / gamesPlayed

Total points (5p/6p):
Each round contributes roundRawPoints / 3
(3 = standard games per round, regardless of games actually played)

Example 5-player court:
Player A: 3 games, 39 pts → avg 13.0
Player B: 4 games, 48 pts → avg 12.0
Rank: A > B (higher average) even though B has more total points`}</pre>
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
				<pre>{`3 matches per round:
Match 1: P1 + P2 vs P3 + P4
Match 2: P1 + P3 vs P2 + P4
Match 3: P1 + P4 vs P2 + P3

Ranking: Total points → Diff → playerId`}</pre>
			</div>

			<h3>{m.docs_3p_courts()}</h3>
			<p>{m.docs_3p_courts_p1()}</p>
			<p>{m.docs_3p_courts_p2()}</p>
			<div class="diagram">
				<pre>{`3 players: A, B, C
3 matches per round:
Match 1: A + B vs C
Match 2: A + C vs B
Match 3: B + C vs A

Solo player uses all 3 touches
Scoring: Same as 4p (default 21, win by 2)
Ranking: Total points → Diff → playerId (same games per player)

Timing: ~48 min (3 × 14 + 2 × 3 min)`}</pre>
			</div>

			<h3>{m.docs_5p_courts()}</h3>
			<p>{m.docs_5p_courts_p1()}</p>
			<p>{m.docs_5p_courts_p2()}</p>

			<h4>{m.docs_5p_how_it_works()}</h4>
			<div class="diagram">
				<pre>{`5 Players (A, B, C, D, E):
2 runs × 2 parallel games = 4 games total

RUN 1:
Side X: A+B (fixed team)
Side Y: C (fixed), D and E alternate every point
Game 1: A+B vs C+D (scored when D is on court)
Game 2: A+B vs C+E (scored when E is on court)

RUN 2:
Side X: D+E (fixed team)
Side Y: B (fixed), A and C alternate every point
Game 3: D+E vs B+A (scored when A is on court)
Game 4: D+E vs B+C (scored when C is on court)

Game count per player:
A: 3 games  |  B: 4 games  |  C: 3 games  |  D: 3 games  |  E: 3 games
(One player plays 4 games, role randomized each round)`}</pre>
			</div>

			<h3>{m.docs_6p_courts()}</h3>
			<p>{m.docs_6p_courts_p1()}</p>
			<p>{m.docs_6p_courts_p2()}</p>

			<h4>{m.docs_6p_how_it_works()}</h4>
			<div class="diagram">
				<pre>{`6 Players (A, B, C, D, E, F):
2 runs × 2 parallel games = 4 games total

RUN 1:
Side X: A+B (fixed team)
Side Y: C+D and E+F rotate every point (no fixed player)
Game 1: A+B vs C+D (scored when C+D is on court)
Game 2: A+B vs E+F (scored when E+F is on court)

RUN 2:
Side X: C+D (fixed team)
Side Y: A+B and E+F rotate every point (no fixed player)
Game 3: C+D vs A+B (scored when A+B is on court)
Game 4: C+D vs E+F (scored when E+F is on court)

Game count per player:
A: 3  |  B: 3  |  C: 3  |  D: 3  |  E: 2  |  F: 2
(Role randomized each round. Partnership rule: no pair partners in both runs)

Ranking: Average points per round → Total points → Diff → playerId`}</pre>
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
				<pre>{`ROUND 2 (Vertical Seeding) — 16p special case:
1sts (4) → Court 1
2nds (4) → Court 2
3rds (4) → Court 3
4ths (4) → Court 4

ROUND 3+ (Ladder):
C1 ← C1[1+2] + C2[1+2]   (top 2 stay, pull top 2 from below)
C2 ← C1[3+4] + C3[1+2]   (bottom 2 drop, pull top 2 from below)
C3 ← C2[3+4] + C4[1+2]   (bottom 2 drop, pull top 2 from below)
C4 ← C3[3+4] + C4[3+4]   (bottom 2 stay, pull bottom 2 from above)

Visual flow:
Round 2:  C1(1sts)  C2(2nds)  C3(3rds)  C4(4ths)
Round 3:  C1[C1↑+C2↑]  C2[C1↓+C3↑]  C3[C2↓+C4↑]  C4[C3↓+C4↓]`}</pre>
			</div>

			<h4>{m.docs_20_players_5_courts()}</h4>
			<div class="diagram">
				<pre>{`ROUND 2 (Vertical Seeding):
1sts (5):  C1×4, C2×1
2nds (5):  C2×3, C3×2
3rds (5):  C3×2, C4×2, C5×1
4ths (5):  C4×1, C5×4

ROUND 3 (Ladder):
C1 ← C1[1+2] + C2[1+2]
C2 ← C1[3+4] + C2[3+4] + C3[1+2]  (3 courts → 4 players from 3 sources)
C3 ← C3[3+4] + C4[1+2]
C4 ← C4[3+4] + C5[1+2]
C5 ← C5[3+4] + (empty)  (bottom court keeps bottom 2, no court below)

Non-standard bottom court (C5) always gets remaining players.`}</pre>
			</div>

			<h3>{m.docs_preseed_bracket_redistribution()}</h3>
			<p>{m.docs_preseed_bracket_p1()}</p>

			<h4>{m.docs_16p_preseed_example()}</h4>
			<div class="diagram">
				<pre>{`ROUND 1 (Snake Seeding):
C1: A(1600) H(900)  I(800)  P(100)
C2: B(1500) G(1000) J(700)  O(200)
C3: C(1400) F(1100) K(600)  N(300)
C4: D(1300) E(1200) L(500)  M(400)

R1 Results → R2 (First Split, splitSize(4)=2):
Tiers:  1sts: A,B,C,E  2nds: D,F,J,H  3rds: G,L,N,I  4ths: K,P,M,O
Winner bracket (top 8):  A(C1), B(C2), C(C3), E(C4), D(C4), F(C3), J(C2), H(C1)
Loser bracket (bottom 8): G(C2), L(C4), N(C3), I(C1), K(C3), P(C1), M(C4), O(C2)

Origin mixing in Winners:
C1: A(C1), C(C3), D(C4), J(C2)   ← no 1st+2nd from same origin
C2: B(C2), E(C4), F(C3), H(C1)

R2 Results → R3 (Subsequent Split):
Winner bracket (C1,C2): 1sts+2nds → C1(Gold), 3rds+4ths → C2(Silver)
Loser bracket (C3,C4):  1sts+2nds → C3(Bronze), 3rds+4ths → C4(Iron)

Final Courts:
C1(F): C, B, A, H
C2(LW): D, E, F, J
C3(TL): G, L, N, O
C4(BL): I, M, K, P

Final Standings:
1st B, 2nd A, 3rd C, 4th H (Court 1)
5th D, 6th E, 7th J, 8th F (Court 2)
9th G, 10th N, 11th L, 12th O (Court 3)
13th I, 14th K, 15th M, 16th P (Court 4)`}</pre>
			</div>
		</section>

		<section id="virtual-courts">
			<h2>{m.docs_virtual_courts()}</h2>

			<p>{m.docs_virtual_courts_p1()}</p>

			<h3>{m.docs_batch_shift_model()}</h3>
			<p>{m.docs_batch_shift_p1()}</p>

			<h4>{m.docs_example_8v4()}</h4>
			<div class="diagram">
				<pre>{`8 virtual courts, 4 physical courts:

Shift 1: Virtual courts 5-8 → Physical courts 1-4 (simultaneous)
[WAIT]   Score entry, redistribution, rest (~10 min transition)
Shift 2: Virtual courts 1-4 → Physical courts 1-4 (simultaneous)

Order: Bottom courts first (highest numbers), top court last.
This ensures championship match is the last match of the tournament.`}</pre>
			</div>

			<h4>{m.docs_example_12v4()}</h4>
			<div class="diagram">
				<pre>{`12 virtual courts, 4 physical courts:

Shift 1: Virtual courts  9-12 → Physical courts 1-4
[WAIT]   ~10 min transition
Shift 2: Virtual courts  5-8  → Physical courts 1-4
[WAIT]   ~10 min transition
Shift 3: Virtual courts  1-4  → Physical courts 1-4

Total shifts = ceil(12/4) = 3
Round duration ≈ 3 × 45 min + 2 × 10 min = 155 min`}</pre>
			</div>

			<h3>{m.docs_wait_time_forecasting()}</h3>
			<p>{m.docs_wait_time_p1()}</p>
			<div class="diagram">
				<pre>{`Player on Virtual Court 5 (Shift 2 of 3):
- Remaining shifts after theirs: 1 (Shift 3)
- Avg court duration: 45 min
- Transition time: 10 min
- Their shift duration: 45 min
- Est. total from now: ~100 min`}</pre>
			</div>
		</section>

		<section id="practical-implementations">
			<h2>{m.docs_practical_implementations()}</h2>

			<h3>{m.docs_two_groups_one_court()}</h3>
			<p>{m.docs_two_groups_one_court_p1()}</p>
			<p>{m.docs_two_groups_one_court_p2()}</p>

			<h4>{m.docs_traditional_vs_alternating()}</h4>
			<div class="diagram">
				<pre>{`TRADITIONAL (sequential groups):
Group A plays all matches → break → Group B plays all matches
Group A: Match 1, Match 2, Match 3 (≈45 min)
Break: 10 min
Group B: Match 1, Match 2, Match 3 (≈45 min)
Total: ~100 min for both groups on one physical court

ALTERNATING (interleaved groups):
Match 1: Group A
Match 2: Group B
Match 3: Group A
Match 4: Group B
Match 5: Group A
Match 6: Group B
Total: ~90 min (no dedicated break between groups, natural rotation)

Benefits:
- Shorter total duration (no 10-min inter-group break)
- Players get natural rest while other group plays
- No "cold" start for Group B
- Fairer — both groups progress simultaneously
- Keeps all players engaged`}</pre>
			</div>

			<h3>{m.docs_tournament_day_timeline()}</h3>
			<p>{m.docs_tournament_day_p1()}</p>
			<div class="diagram">
				<pre>{`TYPICAL 16-PLAYER TOURNAMENT (4 courts, 4 physical):
08:30  Setup, check-in, briefing
09:00  Round 1 starts (all 4 courts)
09:45  Round 1 ends, scores finalized
09:55  Redistribution, player break
10:00  Round 2 starts
10:45  Round 2 ends
10:55  Break
11:00  Round 3 starts
11:45  Round 3 ends
11:55  Break
12:00  Round 4 (Final) starts
12:45  Tournament ends, podium
13:00  Cleanup

Total: ~4h 30min

WITH VIRTUAL COURTS (8 virtual, 4 physical):
Round 1: Shift 1 (VC5-8) 09:00-09:45 → Shift 2 (VC1-4) 09:55-10:40
Round 2: Shift 1 10:50-11:35 → Shift 2 11:45-12:30
Round 3: Shift 1 12:40-13:25 → Shift 2 13:35-14:20
Round 4: Shift 1 14:30-15:15 → Shift 2 15:25-16:10

Total: ~7h 10min`}</pre>
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

	.factor-icon.deciding-won,
	.factor-icon.deciding-middle,
	.factor-icon.deciding-lost {
		color: var(--deciding-color, var(--accent-success));
		border-color: var(--deciding-color, var(--accent-success));
		background: color-mix(in srgb, var(--deciding-color, var(--accent-success)) 18%, var(--bg-secondary));
		box-shadow: 0 0 0 1px var(--deciding-color, var(--accent-success));
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