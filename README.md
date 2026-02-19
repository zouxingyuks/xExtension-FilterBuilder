# xExtension-FilterBuilder

Visual query builder extension for **FreshRSS** search syntax.

This extension adds a filter-builder panel near the search box, so users can build complex FreshRSS queries (AND/OR groups, negation, regex, dates, feed/category/label selectors) without hand-writing syntax.

## Features

- Visual builder for FreshRSS search operators
- AND conditions + OR groups
- Negation (`!`), regex mode, quoted values
- Date filters (`date`, `pubdate`, `userdate`)
- Feed/category/label/saved-query selectors
- Query preview + apply/search actions
- Parse existing query text back into builder state

## Project Status

Experimental but working.

- Core extension files are present and validated
- OpenSpec change has been archived
- JS test suite is included under `tests/`

## Directory Structure

```text
.
├── extension.php              # FreshRSS extension entrypoint
├── metadata.json              # FreshRSS extension metadata
├── static/
│   ├── filter-builder.js      # UI + query builder/parser logic
│   └── filter-builder.css     # UI styles
├── i18n/
│   ├── en.php                 # English translations
│   └── zh-cn.php              # Chinese translations
├── tests/                     # Node-based JS tests
└── docs/archive/              # Research and process artifacts
```

## Requirements

- FreshRSS `>= 1.21` (extension API compatibility)
- Node.js (for local test verification)
- PHP runtime in target FreshRSS environment

## Installation

1. Copy this repository folder to FreshRSS extensions directory and keep folder name as:

   ```text
   xExtension-FilterBuilder
   ```

2. Example path:

   ```text
   /path/to/FreshRSS/extensions/xExtension-FilterBuilder
   ```

3. In FreshRSS admin UI, enable extension **FilterBuilder**.

## Usage

1. Open any FreshRSS page.
2. Click the filter button near the search input.
3. Build query conditions/groups in the panel.
4. Use:
   - **Fill search box**: only writes query text
   - **Search now**: writes query and submits form
   - **Load from search box**: parse existing search text back to UI

## Development

Run tests:

```bash
node tests/test-operator-registry.js
node tests/test-condition-row.js
node tests/test-group.js
node tests/test-query-builder.js
node tests/test-query-parser.js
```

Basic syntax check:

```bash
node --check static/filter-builder.js
```

## Compatibility Notes

- Runtime behavior depends on FreshRSS DOM/context availability.
- Running `static/filter-builder.js` directly in plain Node will show `document is not defined` (expected, because browser DOM is required).

## Roadmap

- Improve UX polish and keyboard accessibility
- Add broader end-to-end browser verification
- Add configurable defaults in extension settings page

## License

MIT License. See [LICENSE](./LICENSE).

## Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening PRs.
