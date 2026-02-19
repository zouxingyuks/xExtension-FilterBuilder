# Design: filter-builder

## Architecture

### Component Hierarchy

```
FilterBuilderExtension (PHP)
├── init()
│   ├── appendStyle('filter-builder.css')
│   ├── appendScript('filter-builder.js')
│   └── registerHook(JsVars, injectData)
└── injectData(array $vars): array
    └── $vars['filterBuilder'] = { feeds, categories, labels, userQueries }

FilterBuilder (JS namespace)
├── App                    # DOM injection, event wiring, lifecycle
├── OperatorRegistry       # 14 operator definitions + value renderers
├── ConditionRowComponent  # Single condition row UI
├── GroupComponent         # AND group with OR separator
├── QueryBuilder           # UI state → FreshRSS query string
└── QueryParser            # FreshRSS query string → UI state
```

### Data Flow

```
PHP: FreshRSS_Context::categories() / labels() / userConf()->queries
  → js_vars hook → window.context.filterBuilder
  → FilterBuilder.App.init() reads window.context.filterBuilder
  → populates multiselect dropdowns in ConditionRowComponent

User interacts with UI
  → GroupComponent / ConditionRowComponent update state
  → QueryBuilder.build(groups) → query string
  → preview div updated (debounced 16ms)

"Search now" clicked
  → fill input[name="search"].value
  → submit parent <form>
```

### State Model

```javascript
// Internal state
groups = [
  {
    id: string,           // unique id for DOM keying
    negate: boolean,      // wrap group in !()
    conditions: [
      {
        id: string,
        op: string,       // operator key from OperatorRegistry
        negate: boolean,  // prefix with !
        value: any,       // string | string[] | DateValue
        regex: boolean,   // wrap value in /pattern/
        flags: string,    // 'i' | 'm' | 'im' | ''
      }
    ]
  }
]
```

### Query String Generation Rules

| Condition | Output |
|-----------|--------|
| `op=intitle, value='hello'` | `intitle:hello` |
| `op=intitle, value='hello world'` | `intitle:'hello world'` |
| `op=intitle, value='hello', regex=true, flags='i'` | `intitle:/hello/i` |
| `op=intitle, value='hello', negate=true` | `!intitle:hello` |
| `op=tag, value='news'` | `#news` |
| `op=f, value=[1,2,3]` | `f:1,2,3` |
| `op=date, mode=relative, number=7, unit='D'` | `date:P7D` |
| `op=date, mode=range, from='2024-01', to='2024-03'` | `date:2024-01/2024-03` |
| `op=free, value='hello'` | `hello` |
| Single group, multiple conditions | `cond1 cond2 cond3` |
| Multiple groups | `(cond1 cond2) OR (cond3 cond4)` |
| Negated group | `!(cond1 cond2)` |

## Decision Log

- **Vanilla JS over framework**: FreshRSS extensions must not add external dependencies. Vanilla JS keeps the extension self-contained and avoids version conflicts.
- **`input[name="search"]` over `#search`**: The `name` attribute is more stable across FreshRSS versions than the `id` attribute.
- **`position: fixed` for panel**: Avoids overflow clipping from parent containers. Panel stays visible regardless of scroll position.
- **`freshrss:globalContextLoaded` event**: Required to safely access `window.context`. Direct access on DOMContentLoaded may fail if context is not yet initialized.
- **`fb-` CSS prefix**: Prevents style conflicts with FreshRSS core CSS and other extensions.
- **OR groups = top-level groups**: Matches FreshRSS BooleanSearch model where top-level is OR of AND groups. Deep nesting not supported to keep UI simple.
- **Reverse parser scope**: Only parses flat AND conditions and one level of OR groups. Complex nested expressions are preserved as free-text.

## PBT Properties (Property-Based Testing)

- `QueryBuilder.build(QueryParser.parse(s)) ≈ s` for all valid single-level query strings (round-trip property, modulo whitespace normalization)
- `QueryParser.parse('')` always returns `{ groups: [{ conditions: [] }] }` (empty input → empty state)
- `QueryBuilder.build([])` returns `''` (empty groups → empty string)
- For any condition with `negate=true`, output string starts with `!`
- For any condition with `regex=true`, value is wrapped in `/pattern/`
- Multiple groups always produce `(g1) OR (g2)` format
