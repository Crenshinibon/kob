# Incomplete Rosters — Spec Index

Replaces the original `600_incomplete-rosters.md` (deleted). Split into focused sub-specs.

## Sub-Specs

| File | Topic |
|------|-------|
| `610_incomplete-core.md` | Problem statement, physical vs virtual courts, player count extension (8-64), vertical seeding, leftover configuration |
| `620_incomplete-options.md` | Options A (recursive preseed), B (mixed courts), D (parallel games), E (generalized recursive split). Option C (sit-outs) removed. |
| `630_incomplete-implementation.md` | Implementation phases, unit testing strategy (~50 test cases), 12 open questions |
| `640_incomplete-devplan.md` | Development plan summary: 7 phases, effort estimates (10-16 days), risks, out-of-scope |
| `650_game-rules-and-duration.md` | Scoring modes (single-21, best-of-3-15), special court rules (3p/5p/6p), duration estimation, configurable timing |
| `660_virtual-court-scheduling.md` | Shift scheduling, wait time forecasting, court reassignment, player-facing estimates |

## Key Decisions

1. **Preseed works for any court count** — recursive splitting (largest power-of-2 winner group + remainder)
2. **Player count: 8-64** — extended from 16/32
3. **Option C removed** — no rotating sit-outs
4. **Option B uses Strategy 3** — accept asymmetry, bottom courts always incomplete
5. **Option D for 1-2 leftovers** — parallel games on 5/6-player courts
6. **Physical vs virtual courts** — support tournaments where N virtual courts > M physical courts
7. **Per-round override** — leftover strategy configurable per tournament + per round

## Related Specs

| File | Topic |
|------|-------|
| `650_game-rules-and-duration.md` | Scoring modes, special court rules, duration estimation |
| `700_i18n-index.md` | Internationalization (DE, FR, ES) |
