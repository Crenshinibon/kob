# Incomplete Rosters — Spec Index

Replaces the original `600_incomplete-rosters.md` (deleted). Split into focused sub-specs.

## Sub-Specs

| File                               | Topic                                                                                                                                                    |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `610_incomplete-core.md`           | Problem statement, physical vs virtual courts, player count extension (8-64), vertical seeding, leftover configuration                                   |
| `620_incomplete-options.md`        | Options A (recursive preseed), parallel games for 5/6p (Option D removed), E (generalized recursive split). One non-standard bottom court for leftovers. |
| `630_incomplete-implementation.md` | Implementation phases, unit testing strategy (~50+ test cases), 13 open questions                                                                        |
| `640_incomplete-devplan.md`        | Development plan summary: 7 phases, effort estimates (10-16 days), risks, out-of-scope                                                                   |
| `650_game-rules-and-duration.md`   | Scoring modes (one set, best-of-3, custom), special court rules (3p/5p/6p), duration estimation, configurable timing                                     |
| `660_virtual-court-scheduling.md`  | Scheduling modes (batch/rolling), shift scheduling, wait time forecasting, court reassignment, player-facing estimates                                   |
| `670_player-retirement.md`         | Player bailout handling, redistribution after retirement, final round elimination rule                                                                   |

## Key Decisions

1. **Preseed works for any court count** — recursive splitting (largest power-of-2 winner group + remainder)
2. **Player count: 8-64** — extended from 16/32
3. **Option C removed** — no rotating sit-outs
4. **One non-standard bottom court** — 3 leftovers → 3p court, 1 leftover → 5p court, 2 leftovers → 6p court
5. **Physical vs virtual courts** — support tournaments where N virtual courts > M physical courts
6. **Include/exclude decision** — organizer can exclude leftovers before starting tournament
7. **Scheduling mode** — org chooses batch shifts or rolling assignment (defaults to batch)

## Related Specs

| File                             | Topic                                                   |
| -------------------------------- | ------------------------------------------------------- |
| `650_game-rules-and-duration.md` | Scoring modes, special court rules, duration estimation |
| `700_i18n-index.md`              | Internationalization (DE, FR, ES)                       |
