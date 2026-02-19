# Contributing

Thanks for your interest in contributing to **xExtension-FilterBuilder**.

## Development Principles

- Keep changes scoped and reviewable.
- Preserve FreshRSS compatibility and extension conventions.
- Avoid adding runtime dependencies without strong justification.
- Prefer clarity over cleverness in query parsing/building logic.

## Local Validation

Run the existing test suite before opening PR:

```bash
node tests/test-operator-registry.js
node tests/test-condition-row.js
node tests/test-group.js
node tests/test-query-builder.js
node tests/test-query-parser.js
node --check static/filter-builder.js
```

## Coding Guidelines

- JS: keep browser-compatible code for FreshRSS runtime.
- PHP: follow FreshRSS extension structure and strict types.
- CSS: use `fb-` prefixed classes to avoid collisions.
- i18n: keep `en.php` and `zh-cn.php` keys synchronized.

## Pull Requests

Please include in your PR description:

1. What changed
2. Why it changed
3. How it was tested
4. Any compatibility concerns
