# Player Input Parsing & CSV Upload

## Problem

Two issues with player input on the create tournament page (`/tournament/create`):

### 1. Paste from spreadsheet breaks name+points lines

When users copy cells from LibreOffice Calc (after importing the WVV Setzliste CSV), the clipboard contains tab-separated values. Example for two columns ("spieler1" + "wvv"):

```
Patrick Abraham\t176
Marcel Redeker\t152
```

The current `handlePaste` in `+page.svelte:32-57` splits on `\t` (along with `,` and `;`), producing:

```
Patrick Abraham
176
Marcel Redeker
152
```

This **doubles the player count** — every score becomes a separate "player" line.

**Root cause**: `handlePaste` treats all delimiters equally as row separators. It doesn't distinguish between "delimiter between columns of the same row" (tab) and "delimiter between different entries" (comma/semicolon in a flat list).

### 2. No CSV file upload

Users must manually open the WVV Setzliste CSV in a spreadsheet, select columns, copy, and paste. A direct file upload would be simpler.

The WVV CSV format (semicolon-delimited, quoted strings):

```csv
liste;nr;spieler1;wvv;dvv
"hauptfeld";1;"Patrick Abraham";176;0
"hauptfeld";2;"Marcel Redeker";152;0
```

Relevant columns: `spieler1` (player name) and `wvv` (seed points). Other columns (`liste`, `nr`, `dvv`) are ignored.

## Solution

### A. Fix paste parsing (client-side)

**File**: `src/routes/tournament/create/+page.svelte` — `handlePaste` function

New logic for tab-separated paste:

1. Split pasted text on `\n` to get rows
2. For each row, split on `\t` to get columns
3. If rows have **2 columns** and the **second column is numeric** → treat as `name\tpoints`, format as `"Name Points"` on one line
4. If rows have **1 column** → check for `,`/`;` within (existing comma/semicolon splitting logic)
5. If rows have **3+ columns** → extract first and second columns if second is numeric (covers paste of `nr\tspieler1\twvv` from Calc with 3 selected columns)

This handles all common Calc copy scenarios:

- 2 columns selected (spieler1 + wvv): `"Patrick Abraham\t176"` → `"Patrick Abraham 176"`
- 3 columns selected (nr + spieler1 + wvv): `"1\tPatrick Abraham\t176"` → `"Patrick Abraham 176"`
- Single column (spieler1 only): `"Patrick Abraham"` → `"Patrick Abraham"` (no change)

### B. Add CSV file upload (client-side)

**File**: `src/routes/tournament/create/+page.svelte`

Add a file input button next to the textarea (inside the existing `<details class="import-tip">` or as a separate element). On file selection:

1. Read file with `FileReader.readAsText()`
2. Parse as CSV:
   - Detect delimiter: `;` (WVV standard) or `,` (fallback)
   - First row = header — find `spieler1` and `wvv` column indices (case-insensitive)
   - Extract `spieler1` (name) and `wvv` (seed points) from each data row
   - Handle quoted strings (strip surrounding `"`)
3. Format each row as `"Name Points"` (if wvv present) or `"Name"` (if wvv missing/0)
4. Set result into `playerNames` textarea (append or replace — replace if empty, append if already has content)
5. Auto-switch `formatType` to `preseed` if `wvv` column found with non-zero values

No server-side processing needed — all parsing happens client-side before form submission.

### C. Fix server-side `parsePlayerLine` (defensive improvement)

**File**: `src/routes/tournament/create/create.remote.ts:22-35`

Current regex `/^(.+?)\s+(\d+)$/` works correctly for preseed (extracts trailing number as seedPoints). **No bug here** — the issue is purely client-side paste handling. However, make the regex more robust:

- Change to `/^(.+?)\s+(\d+)\s*$/` to tolerate trailing whitespace
- Consider also matching comma/semicolon/tab as name-points separator: `/^(.+?)[,;\t\s]+(\d+)\s*$/` — handles `"Patrick Abraham,176"` or `"Patrick Abraham;176"` from manual paste

### D. Fix client-side `removeLowestPoints` regex mirror

**File**: `src/routes/tournament/create/+page.svelte:71`

Same regex improvement as C above. Keep client and server regex in sync.

## Files to Change

| File                                            | Change                                                             |
| ----------------------------------------------- | ------------------------------------------------------------------ |
| `src/routes/tournament/create/+page.svelte`     | Rewrite `handlePaste`, add `handleCsvUpload` + file input UI       |
| `src/routes/tournament/create/create.remote.ts` | Improve `parsePlayerLine` regex                                    |
| `messages/en.json`                              | Add/update i18n keys for CSV upload button, success/error messages |
| `messages/de.json`                              | German translations                                                |
| `messages/fr.json`                              | French translations                                                |
| `messages/es.json`                              | Spanish translations                                               |

### New i18n Keys

```
create_csv_upload          — "Upload CSV" / "CSV hochladen" / "Importer CSV" / "Subir CSV"
create_csv_success         — "Imported {count} players from CSV" / "{count} Spieler aus CSV importiert"
create_csv_no_spieler1     — "CSV has no 'spieler1' column" / "CSV hat keine 'spieler1'-Spalte"
create_csv_error           — "Failed to parse CSV file" / "CSV-Datei konnte nicht gelesen werden"
create_wvv_tip             — Update to mention direct CSV upload option
```

## Tests

### Unit Tests (new file: `src/routes/tournament/create/parse-players.test.ts`)

Extract parsing logic into testable pure functions:

1. **`parsePlayerLine` tests** (server-side):
   - `"Patrick Abraham 176"` → `{ name: "Patrick Abraham", seedPoints: 176 }`
   - `"Patrick Abraham"` → `{ name: "Patrick Abraham", seedPoints: null }`
   - `"Patrick Abraham  176"` (multiple spaces) → correct parse
   - `"Patrick Abraham,176"` → correct parse (with improved regex)
   - `"Patrick Abraham;176"` → correct parse
   - `"176"` → `{ name: "176", seedPoints: null }` (no name before number)
   - Empty string → empty name

2. **`parsePastedText` tests** (client-side logic, extracted):
   - Tab-separated 2-col paste: `"Name\t176\nOther\t200"` → `["Name 176", "Other 200"]`
   - Tab-separated 3-col paste: `"1\tName\t176"` → `["Name 176"]`
   - Comma-separated: `"Name,Other"` → `["Name", "Other"]`
   - Semicolon-separated: `"Name;Other"` → `["Name", "Other"]`
   - Mixed: plain newline text → unchanged
   - Single column tab: not possible (single Calc column copies without tabs)

3. **`parseCsvFile` tests** (client-side logic, extracted):
   - WVV CSV with semicolons and quoted strings → correct name+points extraction
   - CSV with comma delimiter → fallback parsing
   - CSV missing `spieler1` column → error
   - CSV with only `spieler1`, no `wvv` → names only, no points
   - Empty CSV → empty result
   - CSV with BOM → handles UTF-8 BOM

### E2E Tests

- Paste tab-separated name+points into textarea → correct player count
- Upload WVV CSV file → players populated, format switches to preseed
- Upload CSV, then manually add more players → combined list

## Documentation Updates

| File                                                   | Change                                                                           |
| ------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `specs/050_tournament-management.md`                   | Update "Player names textarea" to mention CSV upload and improved paste handling |
| `specs/000_index.md`                                   | Add entry for this spec                                                          |
| `messages/en.json` + `de.json` + `fr.json` + `es.json` | New keys, updated `create_wvv_tip`                                               |

## Implementation Order

1. Extract `parsePastedText` and `parseCsvFile` as pure functions (testable)
2. Write unit tests for all three parsers
3. Fix `handlePaste` using `parsePastedText`
4. Add CSV upload UI + `handleCsvUpload` using `parseCsvFile`
5. Improve `parsePlayerLine` regex (server-side)
6. Update `removeLowestPoints` regex (client-side)
7. Add i18n keys (en/de/fr/es)
8. Update docs
9. E2E tests
