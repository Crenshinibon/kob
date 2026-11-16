import * as m from '$lib/paraglide/messages';
import type { TieBreakFactorId } from '$lib/tournament-logic';

const LABELS: Record<TieBreakFactorId, () => string> = {
	round_points: m.tie_break_factor_round_points,
	round_diff: m.tie_break_factor_round_diff,
	total_points: m.tie_break_factor_total_points,
	total_diff: m.tie_break_factor_total_diff,
	initial_order: m.tie_break_factor_initial_order,
	dice: m.tie_break_factor_dice,
	manual: m.tie_break_factor_manual
};

/** Localized name for a tie-break factor. Shared by standings, the player page, and the rules editor. */
export function tieBreakFactorLabel(id: TieBreakFactorId): string {
	return LABELS[id]();
}
