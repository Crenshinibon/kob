# i18n: Core Architecture

## Library Choice

**Use `@inlang/paraglide-sveltekit`**

Why:

- Built specifically for SvelteKit
- Type-safe: generates TypeScript types from message files
- Tree-shakable: only ships translations for the current locale
- SvelteKit-native: works with load functions, actions, and routing
- No runtime overhead for unused locales

Alternatives considered:

- `svelte-i18n`: More mature, but runtime-based, no tree-shaking
- `typesafe-i18n`: Good TypeScript support, but not SvelteKit-native
- Custom solution: Too much maintenance

## Locale Structure

### Supported Locales

| Code | Language | Direction | Date Format | Number Format |
| ---- | -------- | --------- | ----------- | ------------- |
| `en` | English  | LTR       | MM/DD/YYYY  | 1,234.56      |
| `de` | German   | LTR       | DD.MM.YYYY  | 1.234,56      |
| `fr` | French   | LTR       | DD/MM/YYYY  | 1 234,56      |
| `es` | Spanish  | LTR       | DD/MM/YYYY  | 1.234,56      |

### URL Strategy

Locale prefix in URL:

```
/en/tournament/1          → English tournament view
/de/tournament/1          → German tournament view
/fr/court/abc123          → French court page
/es/tournament/1/standings → Spanish standings
```

Routes without locale prefix redirect to detected/default locale:

```
/tournament/1 → /en/tournament/1 (if default is en)
```

### Locale Resolution Priority

1. **URL prefix** (`/de/...`) — explicit, highest priority
2. **Cookie** (`locale=de`) — returning user preference
3. **Accept-Language header** — browser preference
4. **Default** (`en`) — fallback

### Cookie

```
Set-Cookie: locale=de; Path=/; Max-Age=31536000; SameSite=Lax
```

Set when user clicks language switcher. Persists for 1 year.

## File Structure

```
src/
├── lib/
│   ├── i18n/
│   │   ├── en.json          # English messages
│   │   ├── de.json          # German messages
│   │   ├── fr.json          # French messages
│   │   ├── es.json          # Spanish messages
│   │   └── index.ts         # Paraglide config / exports
│   └── ...
├── routes/
│   ├── [[lang]]/            # Optional locale param
│   │   ├── +layout.server.ts  # Locale detection + load
│   │   ├── +layout.svelte     # Language switcher
│   │   ├── +page.svelte
│   │   ├── tournament/
│   │   │   └── ...
│   │   └── court/
│   │       └── ...
│   └── ...
└── ...
```

### Alternative: Middleware-Based Routing

Instead of `[[lang]]` in every route, use a hook to handle locale:

```typescript
// src/hooks.server.ts
export const handle = async ({ event, resolve }) => {
	const lang = event.url.pathname.match(/^\/(en|de|fr|es)/)?.[1] ?? 'en';
	event.locals.lang = lang;

	// Strip locale from pathname for routing
	const pathname = event.url.pathname.replace(/^\/(en|de|fr|es)/, '') || '/';

	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', lang)
	});
};
```

This keeps routes clean but adds complexity. The `[[lang]]` param approach is more idiomatic SvelteKit.

**Recommendation**: Use `[[lang]]` param approach for simplicity and SvelteKit conventions.

## Configuration

### paraglide-js.config.js

```javascript
export default {
	locales: ['en', 'de', 'fr', 'es'],
	defaultLocale: 'en',
	sourceLanguageTag: 'en',
	input: './src/lib/i18n',
	output: './src/paraglide'
};
```

### Vite Integration

```typescript
// vite.config.ts
import { paraglide } from '@inlang/paraglide-sveltekit/vite';

export default defineConfig({
	plugins: [
		sveltekit(),
		paraglide({
			project: './project.inlang',
			outdir: './src/paraglide'
		})
	]
});
```

## Language Switcher

### Component: `LanguageSwitcher.svelte`

- Dropdown or button group showing available languages
- Current language highlighted
- On click: sets cookie, navigates to same page in new locale
- Preserves current path and query params

### Placement

- In the main layout header
- Visible on all pages
- Mobile: hamburger menu or footer

## Formatting

### Dates

Use `Intl.DateTimeFormat` with locale:

```typescript
new Date().toLocaleDateString('de-DE'); // "11.05.2026"
new Date().toLocaleDateString('fr-FR'); // "11/05/2026"
new Date().toLocaleDateString('es-ES'); // "11/05/2026"
```

### Numbers

Use `Intl.NumberFormat` with locale:

```typescript
new Intl.NumberFormat('de-DE').format(1234.56); // "1.234,56"
new Intl.NumberFormat('fr-FR').format(1234.56); // "1 234,56"
```

### Duration

Translate duration units:

| English   | German        | French    | Spanish   |
| --------- | ------------- | --------- | --------- |
| hours     | Stunden       | heures    | horas     |
| minutes   | Minuten       | minutes   | minutos   |
| ~3h 15min | ~3 Std 15 Min | ~3h 15min | ~3h 15min |

## Error Messages

SvelteKit `error()` calls currently use English strings. These need to be translated:

```typescript
// Before
throw error(404, 'Tournament not found');

// After
throw error(404, m.tournament_not_found());
```

Where `m` is the Paraglide message function.

## Server-Side vs Client-Side

### Server-Side (Load Functions, Actions)

- Messages available via `import * as m from '$lib/paraglide/messages'`
- Locale determined from `event.locals.lang`
- Error messages translated server-side

### Client-Side (Components)

- Messages available via same import
- Locale from `$page.params.lang` or context
- Reactive: language switcher triggers re-render

## Database Considerations

### What Stays in English (or as-entered)

- Tournament names (user input)
- Player names (user input)
- Scores (numeric)
- Status values in DB (`draft`, `active`, `completed`) — stored in English, displayed translated
- Format types (`random-seed`, `preseed`) — stored in English, displayed translated

### What Gets Translated

- UI labels, buttons, headings
- Error messages
- Status display labels
- Format display names
- Duration unit labels

### Schema Impact

No schema changes needed. All user-facing content that needs translation is in the UI layer, not the database.
