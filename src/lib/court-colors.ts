export const COURT_POSITION_COLORS = [
	'#FFD700',
	'#FFEA00',
	'#ADFF2F',
	'#69F0AE',
	'#00E5FF'
] as const;

export type TieBreakDecidingOutcome = 'won' | 'middle' | 'lost';

export const TIE_BREAK_OUTCOME_COLORS: Record<TieBreakDecidingOutcome, string> = {
	won: COURT_POSITION_COLORS[0],
	middle: COURT_POSITION_COLORS[2],
	lost: COURT_POSITION_COLORS[4]
};

export function getCourtPositionColor(courtNum: number): string {
	return COURT_POSITION_COLORS[Math.min(courtNum - 1, COURT_POSITION_COLORS.length - 1)] ?? '#FF8C00';
}
