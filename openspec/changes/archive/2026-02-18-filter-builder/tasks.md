# Tasks: filter-builder

## Task 1: Extension scaffold — metadata.json + extension.php

**Description**: Create the two mandatory FreshRSS extension files.

**Files**:
- `metadata.json`
- `extension.php`

**Acceptance Criteria**:
- `metadata.json` contains `name: "FilterBuilder"` and `entrypoint: "FilterBuilder"`
- `extension.php` defines `final class FilterBuilderExtension extends Minz_Extension`
- `init()` has `#[\Override]` attribute and calls `parent::init()`
- `init()` calls `Minz_View::appendStyle($this->getFileUrl('filter-builder.css'))`
- `init()` calls `Minz_View::appendScript($this->getFileUrl('filter-builder.js'))`
- `init()` calls `$this->registerHook(Minz_HookType::JsVars, [$this, 'injectData'])`
- `injectData(array $vars): array` injects feeds, categories, labels, userQueries into `$vars['filterBuilder']`
- All PHP files use `declare(strict_types=1)`

TDD: SKIP
TDD Skip Reason: CONFIG

**Verify**:
```bash
node -e "const m=JSON.parse(require('fs').readFileSync('metadata.json','utf8')); console.assert(m.name==='FilterBuilder','name mismatch'); console.assert(m.entrypoint==='FilterBuilder','entrypoint mismatch'); console.log('metadata.json ok')" && grep -q "FilterBuilderExtension" extension.php && grep -q "declare(strict_types=1)" extension.php && echo "extension.php ok"
```

---

## Task 2: Static assets scaffold — filter-builder.css + filter-builder.js (empty shells)

**Description**: Create the `static/` directory with empty but valid CSS and JS files.

**Files**:
- `static/filter-builder.css`
- `static/filter-builder.js`

**Acceptance Criteria**:
- `static/filter-builder.css` exists and is valid CSS (can be empty with a comment)
- `static/filter-builder.js` exists and defines a `FilterBuilder` namespace object
- JS file listens to `freshrss:globalContextLoaded` before accessing `window.context`
- JS file uses strict mode (`'use strict'`)

TDD: SKIP
TDD Skip Reason: CONFIG

**Verify**:
```bash
ls static/filter-builder.css static/filter-builder.js
```

---

## Task 3: PHP data injection — injectData() method

**Description**: Implement the `injectData()` method to pass feeds/categories/labels/userQueries to JS.

**Files**:
- `extension.php`

**Acceptance Criteria**:
- `injectData(array $vars): array` fetches categories via `FreshRSS_Context::categories()`
- Fetches labels via `FreshRSS_Context::labels()`
- Fetches user queries via `FreshRSS_Context::userConf()->queries`
- Builds feeds list from categories (each category's `feeds()` method)
- Injects into `$vars['filterBuilder']` with keys: `feeds`, `categories`, `labels`, `userQueries`
- Each feed entry has `id` and `name` keys
- Each category entry has `id` and `name` keys
- Each label entry has `id` and `name` keys
- Each userQuery entry has `id` and `name` keys
- Returns `$vars`

TDD: SKIP
TDD Skip Reason: CONFIG

**Verify**:
```bash
grep -q "injectData" extension.php && grep -q "filterBuilder" extension.php && grep -q "FreshRSS_Context" extension.php && echo "injectData method ok"
```

---

## Task 4: JS — FilterBuilderApp (toggle button + panel mount)

**Description**: Implement the main app controller that injects the toggle button and panel into the DOM.

**Files**:
- `static/filter-builder.js`

**Acceptance Criteria**:
- Locates search input via `document.querySelector('input[name="search"]')`
- Injects a `<button id="fb-toggle" class="btn fb-toggle-btn">` adjacent to the search input
- Creates a `<div id="fb-panel" class="fb-panel fb-hidden">` and appends to `document.body`
- Toggle button click shows/hides the panel
- Panel is positioned absolutely below the search input using `getBoundingClientRect()`
- Panel has sections: header (title + close button), conditions area, OR group controls, preview area, action buttons
- Initializes only after `freshrss:globalContextLoaded` event fires

TDD: REQUIRED
Tests: tests/test-app.js
Verify (RED): node tests/test-app.js 2>&1 | grep -q "Error\|not found\|FAIL" && echo "RED ok" || echo "RED: file missing (expected)"
Verify: node --input-type=module < static/filter-builder.js 2>&1 | head -5 || echo "syntax ok"


---

## Task 5: JS — OperatorRegistry

**Description**: Define all 14 operator types with their metadata and value-input renderer functions.

**Files**:
- `static/filter-builder.js`

**Acceptance Criteria**:
- Registry contains entries for: `intitle`, `intext`, `inurl`, `author`, `tag`, `free`, `f`, `c`, `L`, `label`, `e`, `date`, `pubdate`, `userdate`, `S`
- Each entry has: `key`, `label`, `valueType` (`text|multiselect|date|savedquery`), `prefix` (the query prefix string)
- Text-type operators have `supportsRegex: true`
- Multiselect operators (`f`, `c`, `L`, `label`) have `dataKey` pointing to `window.context.filterBuilder` key
- Date operators have `dateMode` supporting `relative`, `range`, `point`
- `renderValueInput(op, condition, onChange)` returns a DOM element appropriate for the operator type

TDD: REQUIRED
Tests: tests/test-operator-registry.js
Verify (RED): node tests/test-operator-registry.js 2>&1 | grep -q "Error\|not found\|FAIL" && echo "RED ok" || echo "RED: file missing (expected)"
Verify: node --input-type=module < static/filter-builder.js 2>&1 | head -5 || echo "syntax ok"


---

## Task 6: JS — ConditionRowComponent

**Description**: Implement a single condition row UI component.

**Files**:
- `static/filter-builder.js`

**Acceptance Criteria**:
- `createConditionRow(condition, onChange, onRemove)` returns a `<div class="fb-condition-row">` element
- Row contains: negate toggle button (`!`), operator `<select>`, value input area (dynamic), remove button (`×`)
- Changing operator select re-renders the value input area
- Negate toggle adds/removes `!` prefix in condition state
- For text operators: shows `<input type="text">` + regex toggle button
- When regex is enabled: shows modifier checkboxes for `i` (case-insensitive) and `m` (multiline)
- For multiselect operators: shows `<select multiple>` populated from `window.context.filterBuilder[dataKey]`
- For date operators: shows mode selector (relative/range/point) with appropriate sub-inputs
- For savedquery operator: shows `<select>` populated from `window.context.filterBuilder.userQueries`
- Every change calls `onChange(updatedCondition)`

TDD: REQUIRED
Tests: tests/test-condition-row.js
Verify (RED): node tests/test-condition-row.js 2>&1 | grep -q "Error\|not found\|FAIL" && echo "RED ok" || echo "RED: file missing (expected)"
Verify: node --input-type=module < static/filter-builder.js 2>&1 | head -5 || echo "syntax ok"


---

## Task 7: JS — GroupComponent (AND group with OR separator)

**Description**: Implement the OR group container that holds multiple AND conditions.

**Files**:
- `static/filter-builder.js`

**Acceptance Criteria**:
- `createGroup(group, onChange, onRemove)` returns a `<div class="fb-group">` element
- Group has a header with group label and remove button
- Group contains a list of condition rows
- "Add condition" button appends a new default condition row
- Group negate toggle wraps the group in `!(...)` syntax
- Groups are separated by an OR divider `<div class="fb-or-divider">OR</div>`
- "Add OR group" button at panel level adds a new empty group

TDD: REQUIRED
Tests: tests/test-group.js
Verify (RED): node tests/test-group.js 2>&1 | grep -q "Error\|not found\|FAIL" && echo "RED ok" || echo "RED: file missing (expected)"
Verify: node --input-type=module < static/filter-builder.js 2>&1 | head -5 || echo "syntax ok"


---

## Task 8: JS — QueryBuilder (UI state → query string)

**Description**: Implement the forward query builder that converts UI state to FreshRSS search syntax.

**Files**:
- `static/filter-builder.js`

**Acceptance Criteria**:
- `QueryBuilder.build(groups)` returns a valid FreshRSS search string
- Single group with single condition: `intitle:hello` (no parentheses)
- Single group with multiple conditions: `intitle:hello author:Alice` (space-separated, no parens)
- Multiple groups: `(intitle:hello author:Alice) OR (date:P7D)`
- Negated condition: `!intitle:spam`
- Negated group: `!(intitle:hello author:Alice)`
- Text with spaces: `author:'Alice Doe'` (single-quoted)
- Regex: `intitle:/^hello/i`
- Multiple IDs: `f:1,2,3`
- Date relative: `date:P7D` (P + number + unit D/W/M/Y/H)
- Date range: `date:2024-01-01/2024-03-31`
- Date point: `date:2024-01`
- Tag: `#mytag`
- Free text: `hello` (no prefix)
- Empty groups/conditions are skipped

TDD: REQUIRED
Tests: tests/test-query-builder.js
Verify (RED): node tests/test-query-builder.js 2>&1 | grep -q "Error\|not found\|FAIL" && echo "RED ok" || echo "RED: file missing (expected)"
Verify: node --input-type=module < static/filter-builder.js 2>&1 | head -5 || echo "syntax ok"


---

## Task 9: JS — QueryParser (query string → UI state)

**Description**: Implement the reverse parser that converts a FreshRSS search string back to UI state.

**Files**:
- `static/filter-builder.js`

**Acceptance Criteria**:
- `QueryParser.parse(queryString)` returns `{ groups: [...] }`
- Parses `intitle:hello author:Alice` → 1 group, 2 conditions
- Parses `(intitle:hello) OR (author:Bob)` → 2 groups, 1 condition each
- Parses `!intitle:spam` → 1 condition with `negate: true`
- Parses `intitle:/^hello/i` → 1 condition with `regex: true`, `flags: 'i'`
- Parses `author:'Alice Doe'` → value `Alice Doe` (quotes stripped)
- Parses `f:1,2,3` → multiselect condition with values `[1,2,3]`
- Parses `date:P7D` → date condition with `mode: 'relative'`, `number: 7`, `unit: 'D'`
- Parses `#mytag` → tag condition
- Unparseable tokens are preserved as free-text conditions
- Returns at least 1 group even for empty input

TDD: REQUIRED
Tests: tests/test-query-parser.js
Verify (RED): node tests/test-query-parser.js 2>&1 | grep -q "Error\|not found\|FAIL" && echo "RED ok" || echo "RED: file missing (expected)"
Verify: node --input-type=module < static/filter-builder.js 2>&1 | head -5 || echo "syntax ok"


---

## Task 10: JS — Real-time preview + action buttons

**Description**: Wire up the query preview and the "Fill search box" / "Search now" buttons.

**Files**:
- `static/filter-builder.js`

**Acceptance Criteria**:
- Preview `<div class="fb-preview-text">` updates on every condition/group change (debounced 16ms)
- "Fill search box" button sets `document.querySelector('input[name="search"]').value` to generated query
- "Search now" button fills the search input AND submits its parent `<form>`
- "Load from search box" button reads current search input value and calls `QueryParser.parse()` to populate UI
- Panel opens with current search box value pre-parsed into UI state

TDD: REQUIRED
Tests: tests/test-preview.js
Verify (RED): node tests/test-preview.js 2>&1 | grep -q "Error\|not found\|FAIL" && echo "RED ok" || echo "RED: file missing (expected)"
Verify: node --input-type=module < static/filter-builder.js 2>&1 | head -5 || echo "syntax ok"


---

## Task 11: CSS — Panel styling

**Description**: Style the filter builder panel using FreshRSS CSS variables.

**Files**:
- `static/filter-builder.css`

**Acceptance Criteria**:
- All custom classes prefixed with `fb-`
- Panel uses `position: fixed`, `z-index: 1000`, `max-height: 80vh`, `overflow-y: auto`
- Panel background uses `var(--color-background, #fff)` or equivalent FreshRSS variable
- Panel border uses `var(--color-border, #ddd)` or equivalent
- `.fb-hidden` sets `display: none`
- `.fb-toggle-btn` styled as a small icon button matching `.btn` appearance
- `.fb-condition-row` uses flexbox with `gap: 8px`, `align-items: center`
- `.fb-or-divider` has dashed border and centered "OR" text
- `.fb-preview-text` uses monospace font, word-break: break-all
- Responsive: on screens < 600px, panel is full-width
- Dark mode: uses `@media (prefers-color-scheme: dark)` or FreshRSS dark theme class

TDD: SKIP
TDD Skip Reason: CONFIG

**Verify**:
```bash
node -e "const css=require('fs').readFileSync('static/filter-builder.css','utf8'); console.log(css.includes('fb-panel') ? 'ok' : 'missing fb-panel')"
```

---

## Task 12: i18n — English and Chinese translations

**Description**: Add translation files for English and Chinese.

**Files**:
- `i18n/en.php`
- `i18n/zh-cn.php`

**Acceptance Criteria**:
- Both files return a PHP array with keys for all UI strings
- Keys include: `toggle_btn`, `panel_title`, `add_condition`, `add_or_group`, `remove`, `negate`, `regex_mode`, `case_insensitive`, `multiline`, `preview_label`, `fill_search`, `search_now`, `load_from_search`, `operator_*` (one per operator)
- English file has English values
- Chinese file has Chinese values

TDD: SKIP
TDD Skip Reason: DOC

**Verify**:
```bash
ls i18n/en.php i18n/zh-cn.php && grep -q "toggle_btn" i18n/en.php && grep -q "toggle_btn" i18n/zh-cn.php && echo "i18n files ok"
```

---

## Task 13: Validation and final check

**Description**: Run OpenSpec validation and verify all files are present and correct.

**Files**: All files in the extension root

**Acceptance Criteria**:
- `openspec validate filter-builder --no-interactive --json` passes
- All required files exist: `metadata.json`, `extension.php`, `static/filter-builder.js`, `static/filter-builder.css`, `i18n/en.php`, `i18n/zh-cn.php`
- JS files have no syntax errors (`node --check static/filter-builder.js`)

TDD: SKIP
TDD Skip Reason: CONFIG

**Verify**:
```bash
openspec validate filter-builder --no-interactive --json && ls metadata.json extension.php static/filter-builder.js static/filter-builder.css i18n/en.php i18n/zh-cn.php && node --check static/filter-builder.js && echo "all checks passed"
```
