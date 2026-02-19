# Spec: core

## ADDED Requirements

### Requirement: Extension Registration
- The extension MUST register as a valid FreshRSS extension with `metadata.json` containing `name` and `entrypoint`
- The extension class MUST be named `FilterBuilderExtension` and extend `Minz_Extension`
- The extension MUST inject `filter-builder.js` and `filter-builder.css` on every page load

#### Scenario: Extension loads without errors
- **GIVEN** FreshRSS 1.21+ with the extension installed in `extensions/xExtension-FilterBuilder/`
- **WHEN** FreshRSS loads any page
- **THEN** no PHP errors appear in logs
- **AND** `filter-builder.js` and `filter-builder.css` are included in the page HTML

### Requirement: Data Injection
- The extension MUST inject feeds, categories, labels, and userQueries into `window.context.filterBuilder` via the `js_vars` hook
- Each feed entry MUST have `id` (int) and `name` (string)
- Each category entry MUST have `id` (int) and `name` (string)
- Each label entry MUST have `id` (int) and `name` (string)
- Each userQuery entry MUST have `id` (int) and `name` (string)

#### Scenario: Data available in JS context
- **GIVEN** a logged-in FreshRSS user with at least one feed and one category
- **WHEN** any FreshRSS page loads
- **THEN** `window.context.filterBuilder.feeds` is a non-empty array
- **AND** each feed has `id` (number) and `name` (string) properties

### Requirement: Toggle Button
- A toggle button MUST appear adjacent to `input[name="search"]` on all pages
- The button MUST open/close the filter builder panel on click
- The button MUST be styled consistently with FreshRSS `.btn` class

#### Scenario: Toggle button appears and works
- **GIVEN** FreshRSS main page is loaded
- **WHEN** the DOM is ready
- **THEN** a button with class `fb-toggle-btn` exists adjacent to `input[name="search"]`
- **AND** clicking the button shows the panel with class `fb-panel`
- **AND** clicking the button again hides the panel

### Requirement: Filter Builder Panel
- The panel MUST contain one or more AND condition groups
- Groups MUST be separated by an OR divider
- Each condition row MUST have: negate toggle, operator selector, value input, remove button
- The panel MUST show a real-time query preview
- The panel MUST have "Fill search box" and "Search now" action buttons
- The panel MUST have a "Load from search box" button to reverse-parse existing query

#### Scenario: Panel renders with default empty condition
- **GIVEN** the filter builder panel is opened
- **WHEN** no conditions have been added
- **THEN** one empty condition group is visible
- **AND** the query preview shows an empty string

#### Scenario: Adding a condition updates preview
- **GIVEN** the filter builder panel is open with one empty group
- **WHEN** user selects operator "intitle" and types "hello"
- **THEN** the query preview updates to show `intitle:hello`

### Requirement: Operator Support
All 15 operator types MUST be supported in the operator selector dropdown.

#### Scenario: All operators available in dropdown
- **GIVEN** the filter builder panel is open
- **WHEN** user clicks the operator selector in a condition row
- **THEN** the dropdown contains options for: intitle, intext, inurl, author, tag, free text, f:, c:, L:, label:, e:, date:, pubdate:, userdate:, S:

#### Scenario: Feed multiselect populated from context
- **GIVEN** `window.context.filterBuilder.feeds` contains `[{id:1, name:"Feed A"}, {id:2, name:"Feed B"}]`
- **WHEN** user selects operator "f:" in a condition row
- **THEN** a multiselect dropdown appears with options "Feed A" and "Feed B"
- **AND** selecting both options updates the preview to `f:1,2`

#### Scenario: Date relative mode
- **GIVEN** user selects operator "date:"
- **WHEN** user selects mode "relative" and enters number 7 with unit "Days"
- **THEN** the preview shows `date:P7D`

#### Scenario: Date range mode
- **GIVEN** user selects operator "date:"
- **WHEN** user selects mode "range" and enters from "2024-01-01" to "2024-03-31"
- **THEN** the preview shows `date:2024-01-01/2024-03-31`

### Requirement: Query Generation
QueryBuilder MUST convert UI state to valid FreshRSS search syntax strings.
- Single group MUST produce no parentheses: `intitle:hello author:Alice`
- Multiple groups MUST produce parentheses + OR: `(intitle:hello) OR (author:Bob)`
- Negated condition MUST produce `!` prefix: `!intitle:spam`
- Negated group MUST produce `!(...)`: `!(intitle:hello author:Alice)`
- Text with spaces MUST be single-quoted: `author:'Alice Doe'`
- Regex MUST be wrapped in `/pattern/flags`: `intitle:/^hello/i`
- Multiple IDs MUST be comma-separated: `f:1,2,3`
- Date relative MUST use ISO 8601 duration: `date:P7D`
- Date range MUST use slash-separated dates: `date:2024-01/2024-03`

#### Scenario: Basic title search query generation
- **GIVEN** one group with one condition: op=intitle, value="hello"
- **WHEN** QueryBuilder.build() is called
- **THEN** the result is `intitle:hello`

#### Scenario: OR group query generation
- **GIVEN** group 1 with condition `intitle:hello` and group 2 with condition `author:Bob`
- **WHEN** QueryBuilder.build() is called
- **THEN** the result is `(intitle:hello) OR (author:Bob)`

#### Scenario: Negated regex condition
- **GIVEN** one condition: op=intitle, value="^spam", negate=true, regex=true, flags="i"
- **WHEN** QueryBuilder.build() is called
- **THEN** the result is `!intitle:/^spam/i`

#### Scenario: Author with spaces
- **GIVEN** one condition: op=author, value="Alice Doe"
- **WHEN** QueryBuilder.build() is called
- **THEN** the result is `author:'Alice Doe'`

### Requirement: Reverse Parsing
- `QueryParser.parse(str)` MUST convert a FreshRSS query string back to UI state
- MUST handle flat AND conditions, OR groups, negation, regex, quoted values
- Unparseable tokens MUST be preserved as free-text conditions

#### Scenario: Parse flat AND conditions
- **GIVEN** query string `intitle:hello author:Alice`
- **WHEN** QueryParser.parse() is called
- **THEN** result has 1 group with 2 conditions
- **AND** condition 1 has op=intitle, value="hello"
- **AND** condition 2 has op=author, value="Alice"

#### Scenario: Parse OR groups
- **GIVEN** query string `(intitle:hello) OR (author:Bob)`
- **WHEN** QueryParser.parse() is called
- **THEN** result has 2 groups with 1 condition each

#### Scenario: Parse negated regex condition
- **GIVEN** query string `!intitle:/^hello/i`
- **WHEN** QueryParser.parse() is called
- **THEN** result has 1 condition with op=intitle, negate=true, regex=true, flags="i", value="^hello"

#### Scenario: Reverse parse existing search box query
- **GIVEN** search box contains `intitle:hello author:'Alice Doe' f:1,2`
- **WHEN** user opens filter builder panel
- **THEN** panel shows 3 condition rows: intitle=hello, author=Alice Doe, f=[1,2]

### Requirement: Styling
- All CSS classes MUST be prefixed with `fb-`
- Panel MUST use FreshRSS CSS variables for colors
- Panel MUST support dark mode
- Panel MUST be responsive (full-width on screens < 600px)

#### Scenario: Panel adapts to FreshRSS theme
- **GIVEN** FreshRSS is using a dark theme
- **WHEN** the filter builder panel is opened
- **THEN** the panel background and text colors match the dark theme
