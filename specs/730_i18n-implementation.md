# i18n: Implementation Plan

## Phase 1: Setup & Infrastructure

**Estimated effort**: 1-2 days

### Steps

1. **Install Paraglide**

   ```bash
   npm install @inlang/paraglide-sveltekit
   ```

2. **Create project.inlang directory**

   ```bash
   npx @inlang/paraglide-sveltekit init
   ```

3. **Configure Vite** — add Paraglide plugin to `vite.config.ts`

4. **Create message files**

   ```
   src/lib/i18n/
   ├── en.json    # English (copy from existing UI strings)
   ├── de.json    # German
   ├── fr.json    # French
   └── es.json    # Spanish
   ```

5. **Create locale middleware**
   - Add `[[lang]]` param to routes OR
   - Add hook for locale detection
   - Set `event.locals.lang`

6. **Add language switcher component**
   - `src/lib/components/LanguageSwitcher.svelte`
   - Dropdown with flag icons
   - Sets cookie and navigates

## Phase 2: Extract Existing Strings

**Estimated effort**: 2-3 days

### Files to modify

Go through every `.svelte` file and `+page.server.ts` file, extract hardcoded English strings.

**Route files**:

- `src/routes/+page.svelte` — dashboard
- `src/routes/+layout.svelte` — navigation
- `src/routes/login/+page.svelte` — login form
- `src/routes/signup/+page.svelte` — signup form
- `src/routes/tournament/create/+page.svelte` — creation form
- `src/routes/tournament/[id]/+page.svelte` — tournament view
- `src/routes/tournament/[id]/players/+page.svelte` — player management
- `src/routes/tournament/[id]/standings/+page.svelte` — standings
- `src/routes/court/[token]/+page.svelte` — score entry
- `src/routes/privacy/+page.svelte` — privacy policy

**Server files**:

- `src/routes/tournament/create/+page.server.ts` — error messages
- `src/routes/tournament/[id]/+page.server.ts` — error messages
- `src/routes/tournament/[id]/players/+page.server.ts` — error/success messages
- `src/routes/court/[token]/+page.server.ts` — validation messages

**Components**:

- `src/lib/components/CookieNotice.svelte` — cookie notice text

### Extraction Pattern

Before:

```svelte
<h1>Create Tournament</h1>
<button>Create</button>
```

After:

```svelte
<script>
	import * as m from '$lib/paraglide/messages';
</script>

<h1>{m.create_title()}</h1>
<button>{m.create_submit()}</button>
```

## Phase 3: Translate All Messages

**Estimated effort**: 3-5 days (depends on translation quality)

### Process

1. Complete English message file (`en.json`) — all keys from Phase 2
2. German translation (`de.json`) — native speaker review recommended
3. French translation (`fr.json`) — native speaker review recommended
4. Spanish translation (`es.json`) — native speaker review recommended

### Translation Guidelines

- Use formal "Sie" (German), "vous" (French), "usted" (Spanish) for UI
- Keep translations concise — UI space is limited on mobile
- Beach volleyball terminology may need domain-specific translations
- Test that translated strings don't break layout (German tends to be longer)

### Automated Translation

For initial pass, can use machine translation (DeepL, Google Translate). Must be reviewed by native speakers before release.

## Phase 4: Error Messages & Server-Side i18n

**Estimated effort**: 1 day

### Server-Side Translation

SvelteKit error messages are generated server-side. Need to pass locale context:

```typescript
// Before
throw error(404, 'Tournament not found');

// After — pass locale to error helper
const lang = event.locals.lang ?? 'en';
throw error(404, getTranslation(lang, 'error.tournament_not_found'));
```

### Translation Helper

```typescript
// src/lib/i18n/server.ts
import messages from './messages.json';

export function getTranslation(lang: string, key: string, params?: Record<string, string>): string {
	const msg = messages[lang]?.[key] ?? messages['en']?.[key] ?? key;
	if (!params) return msg;
	return Object.entries(params).reduce((str, [k, v]) => str.replace(`{${k}}`, v), msg);
}
```

### Validation Messages

Score validation in `court/[token]/+page.server.ts`:

```typescript
// Before
return { error: 'Winner must have at least 21 points' };

// After
return { error: m.court_error_min_score({ min: 21 }) };
```

## Phase 5: Date & Number Formatting

**Estimated effort**: 0.5 days

### Create Formatting Utilities

```typescript
// src/lib/i18n/format.ts
export function formatDate(date: Date, lang: string): string {
	return date.toLocaleDateString(lang);
}

export function formatNumber(num: number, lang: string): string {
	return new Intl.NumberFormat(lang).format(num);
}

export function formatDuration(minutes: number, lang: string): string {
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	// Use translated unit labels
	if (hours > 0) {
		return `${hours}${m.duration_hours()} ${mins}${m.duration_minutes()}`;
	}
	return `${mins}${m.duration_minutes()}`;
}
```

## Phase 6: Layout & Routing Updates

**Estimated effort**: 1-2 days

### Route Structure Change

Option A: Add `[[lang]]` to all routes:

```
src/routes/
├── [[lang]]/
│   ├── +layout.server.ts
│   ├── +layout.svelte
│   ├── +page.svelte
│   ├── tournament/
│   │   └── ...
│   └── court/
│       └── ...
```

Option B: Use hook to strip locale prefix (keeps routes clean):

```typescript
// src/hooks.server.ts
export const handle = async ({ event, resolve }) => {
	const langMatch = event.url.pathname.match(/^\/(en|de|fr|es)(\/|$)/);
	if (langMatch) {
		event.locals.lang = langMatch[1];
		event.url.pathname = event.url.pathname.slice(3) || '/';
	}
	return resolve(event);
};
```

**Recommendation**: Option B — cleaner route structure, less invasive.

### Layout Updates

```svelte
<!-- src/routes/+layout.svelte -->
<script>
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
</script>

<header>
	<nav>...</nav>
	<LanguageSwitcher />
</header>
```

## Phase 7: Testing

**Estimated effort**: 1-2 days

### Test Strategy

1. **Unit tests**: Translation key completeness (all keys exist in all locales)
2. **E2E tests**: Language switcher works, content changes, URLs correct
3. **Visual review**: Native speakers check all 4 languages
4. **Layout testing**: Long German words don't break mobile layout

### Test Cases

| Test                            | Description                                                      |
| ------------------------------- | ---------------------------------------------------------------- |
| `i18n-all-keys-exist`           | Every key in `en.json` exists in `de.json`, `fr.json`, `es.json` |
| `i18n-no-missing-interpolation` | All `{param}` placeholders match across locales                  |
| `i18n-language-switcher`        | Clicking DE switches to German, URL changes to `/de/...`         |
| `i18n-locale-persistence`       | Setting DE, navigating, stays DE                                 |
| `i18n-error-messages`           | Error messages display in current locale                         |
| `i18n-score-entry`              | Court page works in all languages                                |
| `i18n-duration-display`         | Duration shows correct format per locale                         |
| `i18n-mobile-layout`            | Long translations don't overflow on mobile                       |

### Translation Key Audit Script

```javascript
// scripts/audit-translations.js
const locales = ['en', 'de', 'fr', 'es'];
const messages = locales.map((l) => require(`../src/lib/i18n/${l}.json`));

const keys = Object.keys(messages[0]);
for (const locale of locales.slice(1)) {
	const missing = keys.filter((k) => !messages[locale][k]);
	if (missing.length) {
		console.log(`Missing in ${locale}:`, missing);
	}
}
```

---

## File Change Summary

| File                                         | Change                                       |
| -------------------------------------------- | -------------------------------------------- |
| `package.json`                               | Add `@inlang/paraglide-sveltekit` dependency |
| `vite.config.ts`                             | Add Paraglide Vite plugin                    |
| `src/hooks.server.ts`                        | Add locale detection middleware              |
| `src/routes/+layout.svelte`                  | Add LanguageSwitcher component               |
| `src/lib/i18n/en.json`                       | New — English messages                       |
| `src/lib/i18n/de.json`                       | New — German messages                        |
| `src/lib/i18n/fr.json`                       | New — French messages                        |
| `src/lib/i18n/es.json`                       | New — Spanish messages                       |
| `src/lib/components/LanguageSwitcher.svelte` | New — language dropdown                      |
| All `.svelte` files                          | Extract English strings to message calls     |
| All `+page.server.ts` files                  | Translate error messages                     |

## Total Estimated Effort: 10-15 days

## Risks

1. **Translation quality**: Machine translations need native speaker review
2. **Layout breakage**: German/French strings can be 30-50% longer than English
3. **Maintenance burden**: Every new UI string needs 4 translations
4. **SvelteKit integration**: Paraglide may have edge cases with SSR/hydration
5. **Court access URLs**: Anonymous court pages — how to determine locale without user context?
