# Landing Page i18n & Form UX Fixes

## Overview

Minor UI/i18n bugs discovered during manual testing of the landing page and tournament creation form.

---

## Bug 1: Language Switcher Only Visible When Logged In

### Location
`src/routes/+layout.svelte:28-34`

### Root Cause

The entire nav bar (including `LanguageSwitcher`) is wrapped in `{#if data?.user}`:

```svelte
{#if data?.user}
    <nav class="top-nav">
        <LanguageSwitcher />
        ...
    </nav>
{/if}
```

Unauthenticated users on the landing page never see the language switcher.

### Fix

Move `LanguageSwitcher` outside the auth check. Show it in a nav bar for all users — unauthenticated users still need to choose their language on the landing page.

```svelte
<nav class="top-nav">
    <LanguageSwitcher />
    {#if data?.user}
        <span class="user-email">{data.user.email}</span>
        <button onclick={handleSignOut} class="btn-signout">{m.sign_out()}</button>
    {/if}
</nav>
```

Or conditionally show the banner but always show LanguageSwitcher.

---

## Bug 2: Language Switch Loses Form Input

### Location
`src/lib/components/LanguageSwitcher.svelte:17`

### Root Cause

`data-sveltekit-reload` on the `<a>` tag forces a full browser navigation, destroying all client-side `$state`. Paraglide's `reroute` hook (`src/hooks.ts:4`) strips the locale prefix from URLs, so `/de/tournament/create` resolves to the same route as `/tournament/create`. SvelteKit's client-side router reuses the page component, preserving `$state` — but `data-sveltekit-reload` bypasses the router.

### Fix

Remove `data-sveltekit-reload` from LanguageSwitcher links. SvelteKit handles the navigation client-side:
- Same route ID after Paraglide reroute → component reused → `$state` survives
- Load functions re-run with new locale → translations update
- `<html lang>` attribute stays at initial locale until next full navigation (acceptable tradeoff)

### Files Changed

1. `src/lib/components/LanguageSwitcher.svelte` — Remove `data-sveltekit-reload`

---

## Bug 3: German Translation Missing for Player Input Help Text

### Location
`src/routes/tournament/create/+page.svelte:350`

### Current State

Hardcoded English text:
```html
One name per line, optionally with seed points:<br />
Name 1250
```

Not using Paraglide-js `m.*` message. When user switches to German, this text stays in English.

### Fix

Replace with a Paraglide message:
```svelte
{m.create_player_help()}<br />
{m.create_player_example()}
```

Add translations for German (and other locales).

---

## Bug 4: WVV CSV Import Label Wrong

### Location
Create tournament page — WVV import section

### Current State

References "Meldungen" (German for "registrations/submissions").

### Expected

Should reference "Setzliste" (seeding list). The CSV format comes from the seeding list view in the WVV system, not the general registration ("Meldungen") view.

### Fix

Update the label and any help text to use "Setzliste" instead of "Meldungen".

---

## Bug 5: CSV Help Text Overly Specific

### Location
Create tournament page — WVV import help section

### Current State

Mentions "tab separated columns" explicitly.

### Expected

Just list the supported separator methods without calling out specific ones as superfluous:
"Name and Points separated by comma, semicolon, tab or space are supported."

Avoid passive-aggressive language about what's "superfluous."

### Fix

Simplify help text to list supported separators concisely.

---

## Bug 6: Random Seed Format Doesn't Need Points

### Location
Create tournament page — player input section

### Root Cause

The help text always mentions "seed points" regardless of selected format. But for random-seed, seed points are irrelevant — players are randomly assigned to courts.

### Fix

Show format-specific help text:
- **Random seed**: "One name per line" (no points needed, random assignment)
- **Preseed**: "One name per line, with seed points: `Name 1250`" (points required for ranking)

Use `$derived` based on `formatType` to switch the help text.

---

## Implementation Plan

### Files Changed

1. `src/routes/+layout.svelte` — Move LanguageSwitcher outside auth check
2. `src/routes/tournament/create/+page.svelte` — Format-dependent help text, Paraglide messages
3. `src/lib/paraglide/messages/en.json` — New message keys for player help text
4. `src/lib/paraglide/messages/de.json` — German translations for player help text
5. WVV import section — Label fix and help text simplification

### Translation Keys Needed

- `create_player_help` — "One name per line"
- `create_player_help_random` — "One name per line" (no points needed)
- `create_player_help_preseed` — "One name per line, with seed points:" + example
- `create_player_example` — "Name 1250"
- `wvv_import_label` — "CSV from Setzliste"
- `wvv_import_help_separators` — "Name and Points separated by comma, semicolon, tab or space are supported."

---

## Acceptance Criteria

- [x] Language switcher visible on landing page for unauthenticated users
- [x] Language switching preserves form input (removed `data-sveltekit-reload`)
- [x] Player input help text translates correctly for all supported languages
- [x] WVV import references "Setzliste" not "Meldungen"
- [x] CSV help text lists supported separators without calling any superfluous
- [x] Random seed format shows help text without point references
- [x] Preseed format shows help text with point format and example
