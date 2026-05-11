# i18n — Internationalization Spec Index

## Sub-Specs

| File | Topic |
|------|-------|
| `710_i18n-core.md` | Architecture, library choice, locale structure, translation file organization |
| `720_i18n-content.md` | What to translate, translation keys, UI strings, error messages, status labels |
| `730_i18n-implementation.md` | Implementation phases, file changes, testing strategy |

## Languages

| Code | Language | Priority |
|------|----------|----------|
| `en` | English | Default (existing) |
| `de` | German | Phase 1 |
| `fr` | French | Phase 1 |
| `es` | Spanish | Phase 1 |

## Key Decisions

1. **Library**: Use `@inlang/paraglide-sveltekit` — SvelteKit-native, type-safe, tree-shakable
2. **URL strategy**: Locale in URL (`/de/tournament/1`, `/fr/court/abc`)
3. **Default locale**: `en` (existing behavior unchanged)
4. **Locale detection**: URL prefix first, then `Accept-Language` header, then cookie
5. **Database content**: Tournament names, player names stay as-entered (not translated)
6. **UI language**: Stored per-user in cookie, selectable via language switcher

## What Gets Translated

- Navigation, buttons, labels
- Form placeholders and validation messages
- Error messages (SvelteKit `error()` calls)
- Status labels (draft, active, completed)
- Court/round/standings display
- Duration estimates
- Format descriptions (random seed, preseed)
- Game rule labels (single set, best-of-3)

## What Does NOT Get Translated

- Tournament names (user-entered)
- Player names (user-entered)
- Scores (numeric)
- Court tokens (system-generated)
- Database column names
- API responses (not public-facing)
