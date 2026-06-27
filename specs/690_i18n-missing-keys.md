# i18n: Missing docs/faq translation keys

## Status: Plan

## Problem

All 4 message files (`messages/{en,de,fr,es}.json`) have 302 keys — fully translated for existing UI. However `docs/+page.svelte` and `faq/+page.svelte` call ~241 message keys (`docs_*` and `faq_*` prefixes) that **do not exist** in any message file. At runtime `m.docs_title()` returns `undefined`.

## Infrastructure state (already done)

- Paraglide JS (`@inlang/paraglide-js`) wired in `vite.config.ts`
- `src/hooks.server.ts` runs `paraglideMiddleware` before auth via `sequence()`
- `src/routes/+layout.svelte` has LanguageSwitcher + `shouldRedirect`/`localizeHref` logic
- `src/lib/components/LanguageSwitcher.svelte` works (uses `localizeHref`)
- URL strategy: base locale `en` has no prefix, other locales get `/<locale>/` prefix
- Middleware de-localizes URLs transparently → flat route structure unchanged
- `bun run prepare` compiles message functions to `src/lib/paraglide/`

## Scope of work

### 1. Add keys to `messages/en.json` (English)

Extract all unique `docs_*` and `faq_*` keys from `src/routes/docs/+page.svelte` and `src/routes/faq/+page.svelte`. Each key needs a meaningful English translation.

**Approximately 165 `docs_*` keys + 76 `faq_*` keys = ~241 new keys.**

### 2. Add keys to `messages/de.json` (German)

Same key names, German translations.

### 3. Add keys to `messages/fr.json` (French)

Same key names, French translations.

### 4. Add keys to `messages/es.json` (Spanish)

Same key names, Spanish translations.

### 5. Regenerate paraglide bindings

```bash
bun run prepare
```

This compiles `src/lib/paraglide/messages.js` to include the new functions.

### 6. Verify

- Start dev server: `bun run dev`
- Visit `/docs` — no undefined errors in console
- Visit `/faq` — no undefined errors in console
- Switch language, verify translated content appears

## Files requiring no changes

| File | Reason |
|------|--------|
| `src/hooks.server.ts` | Paraglide middleware already integrated |
| `vite.config.ts` | Paraglide plugin already configured |
| `project.inlang/settings.json` | Languages already defined |
| `src/routes/+layout.svelte` | Already imports `* as m` and uses LanguageSwitcher |
| `src/lib/components/LanguageSwitcher.svelte` | Already implemented |
| `src/routes/docs/+page.svelte` | Already uses `m.docs_*()` — just keys missing |
| `src/routes/faq/+page.svelte` | Already uses `m.faq_*()` — just keys missing |
| All other `.svelte` files | Already use `m.*()` and all keys exist in message files |
| All `+page.server.ts` files | No UI strings |
| All API routes | No UI strings |

## Missing key inventory (to be extracted verbatim)

Extract by grepping:

```bash
# Docs keys
rg -oP "m\.(\w+)\(\)" src/routes/docs/+page.svelte | sort -u

# FAQ keys
rg -oP "m\.(\w+)\(\)" src/routes/faq/+page.svelte | sort -u
```

Then diff against keys already in `messages/en.json`:

```bash
comm -23 <(rg -oP "m\.(\w+)\(\)" src/routes/docs/+page.svelte | sort -u) \
          <(rg -oP '"(\w+)":' messages/en.json | sort -u)
comm -23 <(rg -oP "m\.(\w+)\(\)" src/routes/faq/+page.svelte | sort -u) \
          <(rg -oP '"(\w+)":' messages/en.json | sort -u)
```
