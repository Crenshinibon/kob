<script lang="ts">
	import * as msg from '$lib/paraglide/messages';
	import { page as appPage } from '$app/state';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
	import ScoreEntry from '$lib/components/ScoreEntry.svelte';
	import CourtStandingsTable from '$lib/components/CourtStandingsTable.svelte';
	import TieBreakFactorIcons from '$lib/components/TieBreakFactorIcons.svelte';
	import { formatDiff, formatPoints } from '$lib/i18n/format';
	import { getPlayerData, savePlayerScore, savePlayerSetScore } from './player-data.remote';
	import { createScoreSchema, createSetScoreSchema } from '../../court/[token]/scoreSchema';
	import type { PlayerPageData } from '$lib/server/player-page-data';
	import type { OrientedMatchView } from '$lib/player-page-logic';
	import type { TieBreakFactorId } from '$lib/tournament-logic';

	type PlayerRouteData = {
		data: {
			token: string;
			playerPageData: PlayerPageData;
			user?: { id: string } | null;
		};
	};

	type ScoreSubmitForm = {
		submit: () => Promise<unknown>;
		fields: { allIssues(): Array<{ message: string }> | undefined };
	};

	let { data: routeData }: PlayerRouteData = $props();

	let saving = $state(false);
	let focused = $state(false);
	let hidden = $state(false);
	let lastUpdated = $state(new Date());
	let formErrors = $state(new Map<number, string[]>());

	const playerQuery = $derived(getPlayerData({ token: routeData.token }));

	function onVisibilityChange(): void {
		hidden = document.hidden;
		if (!document.hidden) playerQuery.refresh().catch(() => {});
	}

	const page = $derived(playerQuery.current ?? routeData.playerPageData);
	const roundState = $derived(page.state);
	const pollMs = $derived(
		roundState === 'active' || roundState === 'waiting' || roundState === 'injured' ? 5000 : 10000
	);

	$effect(() => {
		if (saving || focused || hidden) return;
		const interval = setInterval(() => {
			playerQuery
				.refresh()
				.then(() => {
					lastUpdated = new Date();
				})
				.catch(() => {});
		}, pollMs);
		return () => clearInterval(interval);
	});

	function youLabel(view: OrientedMatchView): string {
		if (view.sitOut) return msg.player_sit_out();
		if (view.solo) return msg.player_you();
		if (view.partnerName) return `${msg.player_you()} + ${view.partnerName}`;
		return msg.player_you();
	}

	function oppLabel(view: OrientedMatchView): string {
		if (view.opponentNames.length === 0) return '';
		if (view.opponentNames.length === 1)
			return `${view.opponentNames[0]} ${msg.player_history_solo()}`;
		return view.opponentNames.join(' + ');
	}

	function whyText(key: string | null, params: Record<string, string | number> | null): string {
		if (!key) return '';
		if (key === 'player_history_why_ladder_up') return msg.player_history_why_ladder_up();
		if (key === 'player_history_why_ladder_down') return msg.player_history_why_ladder_down();
		if (key === 'player_history_why_ladder_stay_top')
			return msg.player_history_why_ladder_stay_top();
		if (key === 'player_history_why_ladder_stay_bottom')
			return msg.player_history_why_ladder_stay_bottom();
		if (key === 'player_history_why_vertical') {
			return msg.player_history_why_vertical({
				nth: params?.nth ?? '',
				court: params?.court ?? ''
			});
		}
		if (key === 'player_history_why_preseed_winners') {
			return msg.player_history_why_preseed_winners({
				role: params?.role ?? '',
				min: params?.min ?? '',
				max: params?.max ?? ''
			});
		}
		if (key === 'player_history_why_preseed_losers') {
			return msg.player_history_why_preseed_losers({
				role: params?.role ?? '',
				min: params?.min ?? '',
				max: params?.max ?? ''
			});
		}
		if (key === 'player_history_why_frozen') return msg.player_history_why_frozen();
		if (key === 'player_history_why_manual') return msg.player_history_why_manual();
		if (key === 'player_history_why_joined')
			return msg.player_history_why_joined({ n: params?.n ?? '' });
		return '';
	}

	function waitLabel(iso: string | null | undefined): string {
		if (!iso) return msg.player_shift_wait_now();
		const t = new Date(iso);
		if (t.getTime() <= Date.now()) return msg.player_shift_wait_now();
		return msg.player_shift_wait({
			time: t.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
		});
	}

	function canScore(): boolean {
		return roundState === 'active' || roundState === 'injured';
	}

	async function refreshNow(): Promise<void> {
		await playerQuery.refresh();
		lastUpdated = new Date();
	}

	async function handleSave(form: ScoreSubmitForm, matchId: number): Promise<void> {
		saving = true;
		formErrors = new Map([...formErrors].filter(([id]) => id !== matchId));
		try {
			const result = await form.submit();
			const serverIssues = form.fields.allIssues() ?? [];
			if (serverIssues.length > 0) {
				formErrors = new Map([
					...formErrors,
					[matchId, serverIssues.map((issue) => issue.message)]
				]);
				return;
			}
			if (result === false) {
				formErrors = new Map([...formErrors, [matchId, [msg.player_score_could_not_save()]]]);
				return;
			}
			await playerQuery.refresh();
		} catch {
			const serverIssues = form.fields.allIssues() ?? [];
			formErrors = new Map([
				...formErrors,
				[
					matchId,
					serverIssues.length > 0
						? serverIssues.map((issue) => issue.message)
						: [msg.player_score_could_not_save()]
				]
			]);
		} finally {
			saving = false;
		}
	}

	function setForm(view: OrientedMatchView, setIndex: number) {
		const matchId = view.matchIds[setIndex] ?? view.matchIds[0];
		const setNumber = view.setNumbers[setIndex] ?? 1;
		const scored = view.sets[setIndex]?.a != null && view.sets[setIndex]?.b != null;
		return { matchId, setNumber, scored, set: view.sets[setIndex] };
	}

	const courtScoring = $derived(
		page.now.court?.scoring ?? {
			pointsToWin: 21,
			winBy: 2,
			setsToWin: 1,
			decidingSetPoints: 15
		}
	);
	const scoringSchema = $derived(createScoreSchema(courtScoring.pointsToWin, courtScoring.winBy));
	const hasSession = $derived(!!(routeData.user ?? appPage.data.user));

	function tieBreakFactorLabel(id: TieBreakFactorId): string {
		const labels: Record<TieBreakFactorId, () => string> = {
			round_points: msg.tie_break_factor_round_points,
			round_diff: msg.tie_break_factor_round_diff,
			total_points: msg.tie_break_factor_total_points,
			total_diff: msg.tie_break_factor_total_diff,
			initial_order: msg.tie_break_factor_initial_order,
			dice: msg.tie_break_factor_dice,
			manual: msg.tie_break_factor_manual
		};
		return labels[id]();
	}
</script>

<svelte:document onvisibilitychange={onVisibilityChange} />

<main data-testid="player-page" class:current-round={page.state === 'active'}>
	<header>
		<div>
			<h1>{page.tournament.name}</h1>
			<p class="player-name">{page.player.name}</p>
			{#if page.tournament.status !== 'setup'}
				<p>
					{msg.player_round_of({
						current: page.tournament.currentRound,
						total: page.tournament.numRounds
					})}
				</p>
			{/if}
		</div>
		{#if !hasSession}
			<div data-testid="player-page-lang">
				<LanguageSwitcher />
			</div>
		{/if}
	</header>

	{#if page.tournament.checkInOpen && roundState !== 'not_started'}
		<p class="banner" data-testid="checkin-open-banner">{msg.player_checkin_open_note()}</p>
	{/if}

	{#if roundState === 'not_started'}
		<section class="hero" data-testid="player-not-started">
			<h2>{msg.player_not_started({ name: page.tournament.name })}</h2>
			<p>{msg.player_not_started_registered({ count: page.placement.total || 0 })}</p>
			{#if page.tournament.checkInUsed && page.player.checkedInAt}
				<p>{msg.player_checked_in_line()}</p>
			{/if}
			<p>{msg.player_not_started_wait()}</p>
		</section>
	{:else if roundState === 'completed'}
		<section class="hero final" data-testid="player-completed">
			<h2>
				{msg.player_final_place({
					place: page.placement.current ?? page.player.finalStanding ?? '—'
				})}
			</h2>
			{#if page.tournament.finishedEarly}
				<p>{msg.player_finished_early({ round: page.tournament.currentRound })}</p>
			{/if}
		</section>
	{:else if roundState === 'retired'}
		<section class="hero">
			<p>
				{#if page.player.retired?.injured}
					{msg.player_retired_injury({
						round: page.player.retired.round ?? 0,
						place: page.placement.current ?? page.player.finalStanding ?? '—'
					})}
				{:else}
					{msg.player_retired({
						round: page.player.retired?.round ?? 0,
						place: page.placement.current ?? page.player.finalStanding ?? '—'
					})}
				{/if}
			</p>
			{#if page.player.retired?.replacedByName}
				<p>{msg.player_replaced_by({ name: page.player.retired.replacedByName })}</p>
			{/if}
		</section>
	{:else if roundState === 'eliminated'}
		<section class="hero">
			<p>
				{msg.player_eliminated({
					place: page.placement.current ?? page.player.finalStanding ?? '—'
				})}
			</p>
		</section>
	{:else if roundState === 'frozen'}
		<section class="hero">
			<p>
				{msg.player_frozen({
					round: page.now.court?.frozenAfterRound ?? page.tournament.currentRound,
					rank: page.placement.current ?? '—',
					court: page.now.court?.courtNumber ?? 0,
					place: page.placement.best
				})}
			</p>
		</section>
	{:else if roundState === 'waiting'}
		<section class="hero" data-testid="player-waiting">
			<h2>{msg.player_court_now({ number: page.now.court?.courtNumber ?? 0 })}</h2>
			{#if page.movement === 'up'}
				<p>▲ {msg.player_movement_up({ court: page.now.court?.courtNumber ?? 0 })}</p>
			{:else if page.movement === 'down'}
				<p>▼ {msg.player_movement_down({ court: page.now.court?.courtNumber ?? 0 })}</p>
			{/if}
			{#if page.now.court && page.now.court.totalShifts > 1}
				<p>{waitLabel(page.now.court.wait?.beAtCourtAt)}</p>
			{/if}
			<h3>{msg.player_up_next()}</h3>
			{#each page.now.upcoming as view (view.matchNumber)}
				<p>{youLabel(view)} {msg.player_vs()} {oppLabel(view)}</p>
			{/each}
			<p class="hint">{msg.player_waiting_scores_locked()}</p>
		</section>
	{:else if roundState === 'court_done'}
		<section class="hero" data-testid="player-court-done">
			<h2>{msg.player_court_done({ number: page.now.court?.courtNumber ?? 0 })}</h2>
			<p>
				{msg.player_waiting_courts({
					done: page.now.roundProgress.courtsDone,
					total: page.now.roundProgress.courtsTotal
				})}
			</p>
			<p>{msg.player_next_appears()}</p>
			{#if page.now.nextHint}
				<p>
					{#if page.now.nextHint.group === 'winners'}
						{msg.player_next_hint_winners()}
					{:else if page.now.nextHint.group === 'losers'}
						{msg.player_next_hint_losers()}
					{:else if page.now.nextHint.direction === 'up'}
						{msg.player_next_hint_up({ number: page.now.nextHint.courtNumber ?? 0 })}
					{:else if page.now.nextHint.direction === 'down'}
						{msg.player_next_hint_down({ number: page.now.nextHint.courtNumber ?? 0 })}
					{:else}
						{msg.player_next_hint_same({
							number: page.now.nextHint.courtNumber ?? page.now.court?.courtNumber ?? 0
						})}
					{/if}
				</p>
			{/if}
			{#if page.now.courtStandings.length > 0}
				<CourtStandingsTable
					standings={page.now.courtStandings}
					courtSize={page.now.court?.courtSize ?? 4}
					pointsToWin={courtScoring.pointsToWin}
					youLabel={msg.player_you()}
					heading={msg.player_court_standings()}
				/>
			{/if}
		</section>
	{:else}
		<section class="hero now" data-testid="player-now">
			<p class="kicker">{msg.player_now()}</p>
			<h2>{msg.player_court_now({ number: page.now.court?.courtNumber ?? 0 })}</h2>
			{#if page.now.court?.label}
				<p>{msg.player_physical_court({ label: page.now.court.label })}</p>
			{/if}
			{#if page.now.court}
				<p>
					{msg.player_players_scoring({
						size: page.now.court.courtSize,
						scoring: page.now.court.scoringLabel
					})}
				</p>
			{/if}
			{#if page.now.court && page.now.court.totalShifts > 1 && page.now.court.shift === 1}
				<p>
					{msg.player_shift_now({
						current: page.now.court.shift,
						total: page.now.court.totalShifts
					})}
				</p>
			{/if}
			{#if page.movement === 'up'}
				<p class="move">▲ {msg.player_movement_up({ court: page.now.court?.courtNumber ?? 0 })}</p>
			{:else if page.movement === 'down'}
				<p class="move">
					▼ {msg.player_movement_down({ court: page.now.court?.courtNumber ?? 0 })}
				</p>
			{/if}

			{#if page.now.current}
				{#if page.now.current.sitOut}
					<h3>{msg.player_sit_out_now()}</h3>
					<p class="hint">{msg.player_on_court_now()}</p>
					{#each page.now.parallel as par (par.matchNumber)}
						<p>{oppLabel(par)}</p>
					{/each}
				{:else}
					<div class="matchup">
						<p class="you">{youLabel(page.now.current)}</p>
						<p class="vs">{msg.player_vs()}</p>
						<p>{oppLabel(page.now.current)}</p>
					</div>
					{#if page.now.current.isCanceled}
						<p class="canceled">{msg.player_canceled()}</p>
					{:else}
						{#each page.now.current.sets as set, si (set.id || si)}
							{@const info = setForm(page.now.current, si)}
							{@const formObj =
								info.setNumber > 1 || page.now.current.sets.length > 1
									? savePlayerSetScore
											.for(info.matchId)
											.preflight(
												createSetScoreSchema(
													courtScoring.pointsToWin,
													courtScoring.decidingSetPoints,
													info.setNumber,
													page.now.current.sets.length > 1 ? courtScoring.setsToWin : 1,
													courtScoring.winBy
												)
											)
									: savePlayerScore.for(info.matchId).preflight(scoringSchema)}
							<ScoreEntry
								{formObj}
								matchId={info.matchId}
								token={routeData.token}
								teamALabel={youLabel(page.now.current)}
								teamBLabel={oppLabel(page.now.current)}
								setNumber={page.now.current.sets.length > 1 ? info.setNumber : undefined}
								compact={false}
								readOnly={!canScore() || info.scored}
								savedA={set.a}
								savedB={set.b}
								{saving}
								extraErrors={formErrors.get(info.matchId) ?? []}
								youOnTeam={page.now.current.youOnTeam === 'b' ? 'b' : 'a'}
								onsubmit={(form) => handleSave(form, info.matchId)}
								onfocus={() => (focused = true)}
								onblur={() => (focused = false)}
							/>
						{/each}
					{/if}
				{/if}
			{/if}

			{#if page.now.parallel.length > 0 && page.now.current && !page.now.current.sitOut}
				<h3>{msg.player_also_on_court()}</h3>
				{#each page.now.parallel as par (par.matchNumber)}
					<p>{youLabel(par)} {msg.player_vs()} {oppLabel(par)}</p>
				{/each}
			{/if}

			{#if page.now.upcoming.length > 0}
				<h3>{msg.player_up_next()}</h3>
				{#each page.now.upcoming as view (view.matchNumber)}
					<div class="upcoming" data-testid="upcoming-{view.matchNumber}">
						<p>{youLabel(view)} {msg.player_vs()} {oppLabel(view)}</p>
						{#if canScore() && !view.sitOut && !view.isCanceled}
							{#each view.sets as set, si (set.id || si)}
								{@const info = setForm(view, si)}
								{@const formObj =
									info.setNumber > 1 || view.sets.length > 1
										? savePlayerSetScore
												.for(info.matchId)
												.preflight(
													createSetScoreSchema(
														courtScoring.pointsToWin,
														courtScoring.decidingSetPoints,
														info.setNumber,
														view.sets.length > 1 ? courtScoring.setsToWin : 1,
														courtScoring.winBy
													)
												)
										: savePlayerScore.for(info.matchId).preflight(scoringSchema)}
								<ScoreEntry
									{formObj}
									matchId={info.matchId}
									token={routeData.token}
									teamALabel={youLabel(view)}
									teamBLabel={oppLabel(view)}
									setNumber={view.sets.length > 1 ? info.setNumber : undefined}
									compact={true}
									readOnly={info.scored}
									savedA={set.a}
									savedB={set.b}
									{saving}
									extraErrors={formErrors.get(info.matchId) ?? []}
									youOnTeam={view.youOnTeam === 'b' ? 'b' : 'a'}
									onsubmit={(form) => handleSave(form, info.matchId)}
									onfocus={() => (focused = true)}
									onblur={() => (focused = false)}
								/>
							{/each}
						{/if}
					</div>
				{/each}
			{/if}

			{#if page.now.courtStandings.length > 0}
				<CourtStandingsTable
					standings={page.now.courtStandings}
					courtSize={page.now.court?.courtSize ?? 4}
					pointsToWin={courtScoring.pointsToWin}
					youLabel={msg.player_you()}
					heading={msg.player_court_standings()}
				/>
			{/if}
		</section>
	{/if}

	{#if roundState !== 'not_started'}
		<section class="placement" data-testid="player-placement">
			<h2>{msg.player_placement_heading()}</h2>
			{#if page.placement.isFinal}
				<p>
					<strong>{msg.player_placement_final({ place: page.placement.current ?? '—' })}</strong>
				</p>
			{:else}
				<p data-testid="player-placement-current">
					{msg.player_placement_current({
						place: page.placement.current ?? '—',
						total: page.placement.total
					})}
				</p>
				<p data-testid="player-placement-best">
					{msg.player_placement_best({ place: page.placement.best })}
				</p>
				<p data-testid="player-placement-safe">
					{msg.player_placement_safe({ place: page.placement.worst })}
				</p>
				{#if page.placement.rankCanStillChange}
					<p class="hint">{msg.player_placement_can_still_change()}</p>
				{/if}
			{/if}
		</section>

		<section class="record" data-testid="player-record">
			<h2>{msg.player_record()}</h2>
			{#if page.tournament.formatType === 'preseed' && page.record.seedRank}
				<p>
					{msg.player_record_seed({ rank: page.record.seedRank, total: page.placement.total })}
					{#if page.record.seedPoints != null}
						· {msg.player_record_seed_points({ points: page.record.seedPoints })}
					{/if}
				</p>
			{:else if page.record.startedCourt}
				<p>{msg.player_record_random({ court: page.record.startedCourt })}</p>
			{/if}
			<p>
				{msg.player_record_totals({
					points: formatPoints(page.record.totalPoints),
					diff: formatDiff(page.record.totalDiff),
					matches: page.record.matchesPlayed
				})}
			</p>
			{#if page.record.usedAverages}
				<p class="hint">{msg.player_record_averages_note()}</p>
			{/if}
			{#if page.record.rounds.length > 0}
				<ul class="record-rounds" data-testid="player-record-rounds">
					{#each page.record.rounds as round (round.round)}
						<li>
							<p>
								{msg.player_record_round({
									round: round.round,
									court: round.courtNumber,
									rank: round.rank
								})}
								<TieBreakFactorIcons
									tiedFactors={round.tiedFactors}
									decidingFactor={round.decidingFactor}
									decidingOutcome={round.decidingOutcome}
									getLabel={tieBreakFactorLabel}
								/>
							</p>
							{#if round.above}
								<p class="hint">
									{msg.player_record_vs_above({ name: round.above.name })}
									<TieBreakFactorIcons
										tiedFactors={[]}
										decidingFactor={round.above.decidingFactor}
										decidingOutcome={round.above.decidingOutcome}
										getLabel={tieBreakFactorLabel}
									/>
								</p>
							{/if}
							{#if round.below}
								<p class="hint">
									{msg.player_record_vs_below({ name: round.below.name })}
									<TieBreakFactorIcons
										tiedFactors={[]}
										decidingFactor={round.below.decidingFactor}
										decidingOutcome={round.below.decidingOutcome}
										getLabel={tieBreakFactorLabel}
									/>
								</p>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}

	{#if page.history.length > 0}
		<section class="history" data-testid="player-history">
			<h2>{msg.player_history()}</h2>
			<ul>
				{#each page.history as item, i (item.round + '-' + item.matchNumber + '-' + i)}
					<li class:current={item.isCurrentRound}>
						<div>
							{#if item.sitOut}
								{msg.player_history_sit_out()}
							{:else}
								{item.solo ? msg.player_you() : `${msg.player_you()} + ${item.partnerName ?? ''}`}
								{msg.player_vs()}
								{item.opponentNames.join(' + ')}
							{/if}
						</div>
						<div class="result">
							{#if item.isCanceled}
								{msg.player_history_canceled()}
							{:else if item.sitOut}
								—
							{:else}
								{item.sets
									.filter((s: { a: number | null; b: number | null }) => s.a != null && s.b != null)
									.map((s: { a: number | null; b: number | null }) => `${s.a}–${s.b}`)
									.join(', ')}
								{#if item.diffForGame != null}
									<span>{formatDiff(item.diffForGame)}</span>
								{/if}
							{/if}
							{#if item.hasSubstitute}
								<span>{msg.player_history_sub()}</span>
							{/if}
						</div>
						<p class="meta">{item.groupLabel}</p>
						{#if item.showWhy && item.whyKey}
							<p class="why">{whyText(item.whyKey, item.whyParams)}</p>
						{/if}
					</li>
				{/each}
			</ul>
			<details>
				<summary>{msg.player_history_how_heading()}</summary>
				<p>
					{page.tournament.formatType === 'preseed'
						? msg.player_history_how_preseed()
						: msg.player_history_how_random()}
				</p>
			</details>
		</section>
	{/if}

	<footer>
		<button type="button" class="btn-secondary" onclick={refreshNow}>
			{msg.player_refresh()}
		</button>
		<p class="hint">
			{msg.player_last_updated({
				time: lastUpdated.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
			})}
		</p>
	</footer>
</main>

<style>
	main {
		max-width: 600px;
		margin: 0 auto;
		padding: var(--spacing-md);
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--spacing-sm);
		margin-bottom: var(--spacing-lg);
	}

	header h1 {
		margin: 0;
		font-size: var(--font-size-xl);
	}

	.player-name {
		font-weight: 700;
		margin: 0;
	}

	.banner,
	.hero,
	.placement,
	.record,
	.history {
		background: var(--bg-card);
		border: 2px solid var(--border-default);
		border-radius: var(--radius-md);
		padding: var(--spacing-md);
		margin-bottom: var(--spacing-lg);
	}

	.now {
		border-color: var(--accent-primary);
	}

	.hero h2,
	.hero h3,
	.placement h2,
	.record h2,
	.history h2 {
		margin: 0 0 var(--spacing-md);
		padding-bottom: var(--spacing-xs);
		border-bottom: 2px solid var(--accent-primary);
	}

	.hero h3 {
		margin-top: var(--spacing-lg);
		border-bottom-color: var(--border-strong);
	}

	.kicker {
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-size: var(--font-size-xs);
		color: var(--accent-primary);
		margin: 0 0 var(--spacing-xs);
	}

	.matchup {
		text-align: center;
		margin: var(--spacing-md) 0;
	}

	.you {
		font-weight: 700;
	}

	.upcoming {
		border: 1px solid var(--border-default);
		border-radius: var(--radius-sm);
		padding: var(--spacing-sm);
		margin-top: var(--spacing-sm);
		background: var(--bg-secondary);
	}

	.record-rounds {
		list-style: none;
		padding: 0;
		margin: var(--spacing-md) 0 0;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.record-rounds li {
		border-top: 1px solid var(--border-default);
		padding-top: var(--spacing-sm);
	}

	.record-rounds p {
		margin: 0;
	}

	.history li.current {
		border-left: 3px solid var(--accent-primary);
		padding-left: var(--spacing-sm);
	}

	.hint,
	.meta,
	.why {
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
	}

	.canceled {
		color: var(--accent-warning);
	}

	footer {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
	}
</style>
