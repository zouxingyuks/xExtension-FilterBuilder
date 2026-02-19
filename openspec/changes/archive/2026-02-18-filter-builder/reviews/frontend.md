# Frontend Review: filter-builder

## Status: PENDING

## Checklist

- [ ] JS uses `'use strict'`
- [ ] All code under `FilterBuilder` namespace (no global pollution)
- [ ] Initializes only after `freshrss:globalContextLoaded` event
- [ ] Search input located via `input[name="search"]` (not `#search`)
- [ ] All CSS classes prefixed with `fb-`
- [ ] Panel uses FreshRSS CSS variables for colors/borders
- [ ] Dark mode supported
- [ ] Responsive layout (< 600px full-width)
- [ ] No external dependencies (no jQuery, no CDN)
- [ ] QueryBuilder generates correct syntax for all 15 operators
- [ ] QueryParser handles flat AND, OR groups, negation, regex, quoted values
- [ ] Real-time preview debounced at 16ms
- [ ] "Fill search box" sets `input[name="search"].value`
- [ ] "Search now" submits the search form
- [ ] No console errors on load

## Notes

(To be filled during review)
