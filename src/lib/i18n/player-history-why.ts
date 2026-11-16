import * as m from '$lib/paraglide/messages';

type WhyParams = Record<string, string | number> | null;

function param(params: WhyParams, key: string): string | number {
	return params?.[key] ?? '';
}

const SIMPLE: Record<string, () => string> = {
	player_history_why_ladder_up: m.player_history_why_ladder_up,
	player_history_why_ladder_down: m.player_history_why_ladder_down,
	player_history_why_ladder_stay_top: m.player_history_why_ladder_stay_top,
	player_history_why_ladder_stay_bottom: m.player_history_why_ladder_stay_bottom,
	player_history_why_frozen: m.player_history_why_frozen,
	player_history_why_manual: m.player_history_why_manual
};

/**
 * Movement sentence for a finished game on the personal player page.
 * `key` is the message id stored with the history row.
 */
export function playerHistoryWhy(key: string | null, params: WhyParams): string {
	if (!key) return '';
	if (key === 'player_history_why_vertical') {
		return m.player_history_why_vertical({
			nth: param(params, 'nth'),
			court: param(params, 'court')
		});
	}
	if (key === 'player_history_why_preseed_winners') {
		return m.player_history_why_preseed_winners({
			role: param(params, 'role'),
			min: param(params, 'min'),
			max: param(params, 'max')
		});
	}
	if (key === 'player_history_why_preseed_losers') {
		return m.player_history_why_preseed_losers({
			role: param(params, 'role'),
			min: param(params, 'min'),
			max: param(params, 'max')
		});
	}
	if (key === 'player_history_why_joined') {
		return m.player_history_why_joined({ n: param(params, 'n') });
	}
	return SIMPLE[key]?.() ?? '';
}
