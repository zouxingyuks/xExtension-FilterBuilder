# Backend Review: filter-builder

## Status: PENDING

## Checklist

- [ ] `metadata.json` has valid JSON with `name` and `entrypoint`
- [ ] `extension.php` uses `declare(strict_types=1)`
- [ ] Extension class is `final` and extends `Minz_Extension`
- [ ] `init()` has `#[\Override]` attribute
- [ ] `init()` calls `parent::init()`
- [ ] JS/CSS injected via `Minz_View::appendScript/appendStyle`
- [ ] `js_vars` hook callback returns `array|null`
- [ ] `FreshRSS_Context::categories()` used correctly
- [ ] `FreshRSS_Context::labels()` used correctly
- [ ] `FreshRSS_Context::userConf()->queries` used correctly
- [ ] No direct database queries (use provided DAOs only)
- [ ] No modification of FreshRSS core files

## Notes

(To be filled during review)
