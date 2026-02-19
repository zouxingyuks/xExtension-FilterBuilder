# Proposal: FreshRSS FilterBuilder Extension

## Context

FreshRSS is a self-hosted RSS reader with a powerful search syntax supporting operators like
`intitle:`, `author:`, `f:`, `date:`, `#tag`, boolean AND/OR/NOT, parentheses grouping, and
regex. The syntax is expressive but requires memorization. Users need a visual query builder
that constructs valid FreshRSS search strings without manual syntax knowledge.

The extension will be installed as `xExtension-FilterBuilder` in FreshRSS's `extensions/`
directory. It injects a filter builder panel adjacent to the search box on all pages.

## Goals

- Provide a visual UI panel that builds FreshRSS search query strings
- Support all FreshRSS search operators: intitle, intext, inurl, author, #tag, f:, c:, L:,
  label:, e:, date:, pubdate:, userdate:, S:, search:, free text
- Support AND (implicit), OR (explicit groups), NOT (! prefix), parentheses grouping
- Support regex mode per text condition (with i/m modifier toggles)
- Support reverse parsing: load existing query string back into the UI
- Inject a toggle button next to the search input (`input[name="search"]` in header)
- Panel opens below the search box as a floating overlay
- Real-time query preview at the bottom of the panel
- "Fill search box" and "Search now" action buttons
- Pass feeds/categories/labels/userQueries data from PHP to JS via `js_vars` hook

## Non-Goals

- No server-side search logic changes
- No new database tables or migrations
- No external JS framework dependencies (Vanilla JS only)
- No build tools (plain .js and .css files)
- No modification of FreshRSS core files
- No deep nested parentheses beyond 2 levels (OR groups of AND conditions)
- No support for FreshRSS versions below 1.21.0

## Constraints

### Hard Constraints (MUST / MUST NOT)

- MUST follow FreshRSS extension naming: directory `xExtension-FilterBuilder`, class `FilterBuilderExtension extends Minz_Extension`
- MUST have `metadata.json` with `name` and `entrypoint` fields
- MUST have `extension.php` with `init()` method calling `parent::init()`
- MUST use `Minz_View::appendScript($this->getFileUrl('filter-builder.js'))` for JS injection
- MUST use `Minz_View::appendStyle($this->getFileUrl('filter-builder.css'))` for CSS injection
- MUST use `registerHook(Minz_HookType::JsVars, [$this, 'injectData'])` to pass PHP data to JS
- MUST return `array|null` from the `js_vars` hook callback
- MUST use `FreshRSS_Context::categories()` to get categories (returns `array<int, FreshRSS_Category>`)
- MUST use `FreshRSS_Context::labels()` to get labels (returns `array<int, FreshRSS_Tag>`)
- MUST listen to `freshrss:globalContextLoaded` event before accessing `window.context`
- MUST use Vanilla JS only — no jQuery, no React, no Vue
- MUST NOT modify any FreshRSS core files
- MUST NOT add external CDN dependencies
- MUST NOT break the existing search input functionality
- MUST use `declare(strict_types=1)` in all PHP files
- MUST use `final class` for the extension class
- MUST use `#[\Override]` attribute on `init()` method (PHP 8.3+)
- MUST place static assets in `static/` subdirectory
- MUST generate query strings compatible with FreshRSS `BooleanSearch` parser

### Soft Constraints (conventions/preferences)

- SHOULD use FreshRSS CSS variables (`--color-*`, `--border-*`) for theming
- SHOULD use existing FreshRSS CSS classes (`.btn`, `.form-group`, `.group-controls`) where possible
- SHOULD support dark mode via CSS variables
- SHOULD be responsive (mobile-friendly panel layout)
- SHOULD debounce query preview updates (16ms)
- SHOULD use `const` and arrow functions in JS (ES6+)
- SHOULD namespace all JS under a single `FilterBuilder` object to avoid global pollution

## Dependencies

- FreshRSS >= 1.21.0 (for `Minz_HookType` enum, PHP 8.1+)
- PHP 8.1+ (for enums, `readonly`, `#[\Override]`)
- No npm packages, no composer packages
- `FreshRSS_Context::categories()` — available in extension `init()` context
- `FreshRSS_Context::labels()` — available in extension `init()` context
- `FreshRSS_Context::userConf()->queries` — array of saved user queries

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Search input selector changes across FreshRSS versions | Medium | Use `input[name="search"]` (stable attribute) not `#search` (may change) |
| `window.context` not available on some pages | Low | Always wrap in `freshrss:globalContextLoaded` listener with fallback |
| Panel z-index conflicts with FreshRSS dropdowns | Medium | Use z-index: 1000, test against `.dropdown-menu` |
| Query string incompatibility with BooleanSearch parser | High | Test generated strings against documented syntax; cover edge cases in unit tests |
| PHP `FreshRSS_Context` not available during extension init | Low | Use `freshrss_init` hook as fallback if needed |
| CSS conflicts with FreshRSS themes | Medium | Prefix all custom CSS classes with `fb-` |

## Success Criteria

- [ ] `metadata.json` is valid JSON with `name` and `entrypoint` fields
- [ ] `extension.php` loads without PHP errors on FreshRSS 1.21+
- [ ] Filter builder toggle button appears next to search input on all pages
- [ ] Panel opens/closes on button click
- [ ] All 14 operator types render correct UI controls
- [ ] Adding/removing conditions updates the query preview in real time
- [ ] OR groups (multiple AND groups) generate `(cond1 cond2) OR (cond3 cond4)` syntax
- [ ] Negation toggle generates `!operator:value` syntax
- [ ] Regex mode generates `/pattern/flags` syntax
- [ ] Feed/category/label dropdowns are populated from `window.context.filterBuilder`
- [ ] Date relative mode generates ISO 8601 duration (`date:P7D`)
- [ ] Date range mode generates `date:2024-01/2024-03` syntax
- [ ] "Fill search box" button fills `input[name="search"]` with generated query
- [ ] "Search now" button submits the search form
- [ ] Reverse parser loads `intitle:hello author:Alice` back into 2 condition rows
- [ ] Reverse parser loads `(intitle:hello) OR (author:Bob)` back into 2 OR groups
- [ ] Panel uses FreshRSS CSS variables and adapts to light/dark themes
- [ ] No JavaScript errors in browser console
- [ ] No PHP errors or warnings in FreshRSS logs
