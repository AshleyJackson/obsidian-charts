# Agents Guide: Obsidian Charts Plugin

<!-- This file is dual-purpose: GitHub-rendered documentation and AI agent context. Markdown must format correctly on GitHub first, then be parseable by AI agents. -->

## Overview

Obsidian Charts is an Obsidian plugin that enables users to create interactive charts within their notes using Chart.js. This guide documents the plugin architecture, YAML schema, testing infrastructure, and key features for future AI agents.

## Project Structure

```
obsidian-charts/
├── src/                    # Source code (TypeScript + Svelte)
│   ├── main.ts             # Main plugin class + postprocessor
│   ├── chartRenderer.ts    # Chart rendering logic + datasetPrep
│   ├── chartFromTable.ts   # Table-to-chart conversion
│   ├── util.ts             # Utility functions (renderError, saveImageToVaultAndPaste)
│   ├── types.d.ts          # TypeScript interfaces (ChartYaml, ChartSeries, etc.)
│   ├── constants/          # Constants and settings
│   ├── date-adapter/       # Moment.js adapter for Chart.js
│   └── ui/                 # UI components (Svelte + TypeScript)
├── tests/                  # Jest test files
│   ├── main.test.ts        # Plugin + window.renderChart API tests
│   ├── chartRenderer.test.ts # Renderer + ChartRenderChild tests
│   ├── chartFromTable.test.ts # Table conversion + empty cell tests
│   └── setup.ts            # Jest setup (canvas mock, ResizeObserver)
├── __mocks__/              # Jest mocks for external modules
│   ├── obsidian.js         # Mock for obsidian package (type-only)
│   ├── chart.js            # Mock for Chart.js v4
│   ├── chartjs-chart-sankey.js # Mock for Sankey controller
│   ├── chartjs-chart-financial.js # Mock for candlestick/OHLC
│   ├── chartjs-plugin-annotation.js # Mock for annotation plugin
│   ├── chroma-js.js        # Mock for chroma-js v3 (ESM-only)
│   ├── markdown-tables-to-json.js # Mock for table parser
│   ├── date-adapter.js     # Mock for date adapter
│   ├── vanilla-picker.js   # Mock for color picker
│   └── svelte.js           # Mock for Svelte components
├── jest.config.js          # Jest configuration
└── jest.tsconfig.json      # TypeScript config for tests
```

## Chart YAML Schema

Users write chart definitions in `chart` code blocks using YAML. The postprocessor in `main.ts` parses the YAML and validates it before rendering.

### Required Fields

For standalone charts (no `id`), **all three** of these fields are **required**:

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | Chart type: `bar`, `line`, `pie`, `doughnut`, `radar`, `polarArea`, `sankey`, `candlestick`, `ohlc` |
| `labels` | `string[]` | X-axis labels (or category names for pie/doughnut) |
| `series` | `ChartSeries[]` | Array of series objects, each with `data` and optional `title` |

For table-linked charts (with `id`), `type` is still required but `labels` and `series` are not — the data comes from the linked table.

### ⚠️ Common Mistake: `data` vs `series`

**`data` is NOT a valid top-level field.** It must be nested inside `series` items.

**Incorrect:**

```yaml
type: line
labels: [Apr 14, Apr 15, Apr 16]
data: [7.8, 11.7, 9.2]
```

This produces the error: **"Missing type, labels or series"** — because `series` is absent and `data` at the top level is unrecognized.

**Correct:**

```yaml
type: line
labels: [Apr 14, Apr 15, Apr 16]
series:
  - data: [7.8, 11.7, 9.2]
```

Or with a series title:

```yaml
type: line
labels: [Apr 14, Apr 15, Apr 16]
series:
  - title: Daily Values
    data: [7.8, 11.7, 9.2]
```

### Validation Logic

The postprocessor in `main.ts` (lines 39-42) validates:

```typescript
if (!data.id) {
  if (!data || !data.type || !data.labels || !data.series) {
    renderError('Missing type, labels or series', el);
    return;
  }
}
```

- If `id` is present (table-linked chart), the `type`/`labels`/`series` check is skipped
- If `id` is absent, all three fields must be present and truthy
- Empty arrays `[]` for `labels` or `series` are truthy in JS and pass validation (but will produce empty charts)
- `undefined`, `null`, `0`, `""`, and `false` are all falsy and will fail validation

### Optional Modifiers

| Modifier | Type | Default | Description |
|----------|------|---------|-------------|
| `id` | `string` | — | Block ID to link a table (`^table-id` or `table-id`) |
| `file` | `string` | — | Note name for cross-file table linking |
| `layout` | `'rows'` \| `'columns'` | — | Table data orientation (required with `id`) |
| `select` | `string[]` | — | Filter specific rows/columns from linked table |
| `width` | `string` \| `number` | `'100%'` | Chart width (CSS value or number of px) |
| `fill` | `boolean` | `false` | Fill area under line traces |
| `stacked` | `boolean` | `false` | Stack bars or lines |
| `tension` | `number` | `0` | Line smoothness (0-1) |
| `stepped` | `boolean` \| `'before'` \| `'after'` \| `'middle'` | `false` | Stepped line rendering |
| `beginAtZero` | `boolean` | `false` | Force Y-axis to start at 0 |
| `legend` | `boolean` | `true` | Show/hide legend |
| `legendPosition` | `'top'` \| `'left'` \| `'bottom'` \| `'right'` | `'top'` | Legend position |
| `labelColors` | `boolean` | `false` | Assign colors per label instead of per series |
| `transparency` | `number` | `0.25` | Inner color transparency (0.0-1.0) |
| `padding` | `number` | — | Chart padding |
| `textColor` | `string` | `--text-muted` | Override text color |
| `spanGaps` | `boolean` | `false` | Bridge null/empty values in line charts |
| `indexAxis` | `'x'` \| `'y'` | `'x'` | Set to `'y'` for horizontal bars |
| `time` | `string` | — | Auto-format date X-axis (`day`, `week`, `month`, `year`) |
| `bestFit` | `boolean` | `false` | Add linear regression line (line charts only) |
| `bestFitNumber` | `number` | `0` | 0-indexed series for best fit |
| `bestFitTitle` | `string` | `'Line of Best Fit'` | Custom title for best fit series |
| `rMin` / `rMax` | `number` | — | Radial axis limits (radar, polarArea) |
| `yMin` / `yMax` | `number` | — | Y-axis limits |
| `xMin` / `xMax` | `number` | — | X-axis limits |
| `yReverse` / `xReverse` | `boolean` | `false` | Reverse axis direction |
| `yDisplay` / `xDisplay` | `boolean` | `true` | Show/hide axis |
| `yTickDisplay` / `xTickDisplay` | `boolean` | `true` | Show/hide axis ticks |
| `yTickPadding` / `xTickPadding` | `number` | — | Tick padding |
| `yTitle` / `xTitle` | `string` | — | Axis title |

### ChartSeries Interface

Each item in the `series` array:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `data` | `(number \| string \| null \| OhlcDataPoint \| [number,number,number,number])[]` | Yes | Data values |
| `title` | `string` | No | Series label shown in legend |
| `colorFrom` | `Record<string, string>` | No | Sankey: source node colors |
| `colorTo` | `Record<string, string>` | No | Sankey: destination node colors |
| `priority` | `Record<string, number>` | No | Sankey: node priorities |

### Minimal Valid Charts

Bar chart:

```yaml
type: bar
labels: [Mon, Tue, Wed]
series:
  - data: [1, 2, 3]
```

Table-linked chart:

```yaml
type: bar
id: ^my-table
layout: rows
```

Sankey chart:

```yaml
type: sankey
labels: [A, B, C]
series:
  - data:
      - [A, 10, B]
      - [B, 5, C]
```

Candlestick chart:

```yaml
type: candlestick
labels: [Mon, Tue, Wed]
series:
  - data:
      - [150, 155, 148, 152]
      - [152, 158, 150, 156]
```

## Key Features

### Date Auto-Transpose for Tables

When `generateTableData()` detects date-like field keys, it automatically transposes the data for proper time series display:

- **Before transpose**: Dates become series names (wrong for time series)
- **After transpose**: Dates become X-axis labels, columns become series

Date detection uses **Luxon** library (`DateTime.fromISO()` and `DateTime.fromFormat()`) for robust parsing:

- ISO format: `2026-03-17`
- US format: `03/17/2026`, `3/17/2026`
- European format: `17/03/2026`, `17-03-2026`
- And more...

**Dependencies:** `luxon` (runtime), `@types/luxon` (dev)

### Block ID Linking

Charts can link to tables using block IDs. The ID format uses `^` prefix in YAML (e.g., `id: ^my-table`) but Obsidian's cache stores IDs without the prefix. The code strips the leading `^` when searching for the block ID.

**Block ID lookup strategy:** The code searches two locations in Obsidian's `fileCache`:

1. `fileCache.sections[].id` — section cache entries may have an `id` field
2. `fileCache.blocks[blockId]` — the canonical block registry (more reliable)

When a block ID is found in `blocks` but not in `sections`, the code finds the containing section (the table) by checking which section's position range encompasses the block's position. This ensures the full table content is extracted.

Block IDs that follow tables in reading mode are automatically hidden via CSS in `styles.css`. This prevents the `^table-id` link from being visually disruptive below linked tables.

### Wikilink Alias Pipe Escaping

Obsidian uses `\|` inside wikilinks to create aliases (e.g., `[[Page\|Alias]]`). The `\|` is meant to be a display separator, not a table cell delimiter. However, the `markdown-tables-to-json` library (which uses `@ts-stack/markdown`) treats `\|` as a regular pipe and splits the cell.

The fix in `generateTableData()` replaces `\|` inside `[[...]]` with a placeholder before parsing, then restores the pipe character in the extracted data (both keys and values) after parsing. This preserves the wikilink alias as a single cell value.

### Stepped Line Modifier

The `stepped` modifier is supported in line and bar charts. When set, it renders the line in a stepped fashion (before/after/middle) per Chart.js's `stepped` option. The property is passed through from YAML to the dataset configuration in both standalone charts and table-linked charts.

### Best Fit Line

The `bestFit` modifier computes a linear regression line of best fit for line charts. It is processed in the postprocessor (`main.ts`) before rendering:

- `bestFit: true` - Enables best fit line (defaults to line index 0)
- `bestFitNumber: <int>` - Selects which series to compute best fit for (0-indexed)
- `bestFitTitle: <string>` - Custom title for the best fit series (default: "Line of Best Fit")
- Computation uses linear regression: `y = gradient * i + intercept`

### String Data Auto-Conversion and Null Handling

YAML parsing can return numeric values as strings (e.g., `"5"` instead of `5`). Both `datasetPrep()` and the table-linked chart path in `ChartRenderChild.onload()` automatically convert data values:

- **Valid numeric strings** → converted to numbers via `parseFloat()`
- **Empty strings** → converted to `null` (not `NaN` or `0`)
- **Whitespace-only strings** → converted to `null`
- **Non-numeric strings** → converted to `null`
- **OHLC data points** (objects or arrays) → passed through unchanged

Empty cells becoming `null` (instead of `NaN`) is critical for `spanGaps` support — Chart.js requires `null` values to properly bridge gaps; `NaN` is treated differently (often rendered as 0 or breaking the gap span).

### Canvas Dimensions for Image Export

The `imageRenderer()` method respects the `width` property from YAML when generating chart images. It parses pixel values (`600px`), numeric values (`600`), and rejects percentage values (falls back to default `600px`). The height is calculated at a 2:1 aspect ratio. Previously, canvas dimensions were not set from YAML, resulting in default/small image exports.

### Debounced Chart Reload

`ChartRenderChild` uses a debounced reload mechanism (500ms) when metadata changes are detected for linked charts. This prevents rapid successive reloads when a file is being edited, which could cause rendering issues or performance problems. The debounce timer is properly cleaned up in `onunload()`.

### window.renderChart API (Dataview Integration)

`window.renderChart(data, element)` is the public API for rendering charts from JavaScript (e.g., DataviewJS). It supports two input formats:

1. **YAML-like objects** (with `series` key) — automatically routed through `datasetPrep()`, so `fill`, `stacked`, `spanGaps`, `beginAtZero`, color generation, etc. are all handled. This allows Dataview users to use the same YAML schema as code block charts.
2. **Raw Chart.js `ChartConfiguration`** (with `data.datasets`) — passed directly to `renderRaw()` for maximum flexibility.

This dual-path design fixes the issue where `stacked: true` and `fill: true` were silently ignored when passed as YAML-like objects via the JS API.

### Candlestick and OHLC Charts

Financial chart types `candlestick` and `ohlc` are supported via `chartjs-chart-financial` v0.2.1. Data can be provided in two formats:

- **Array format**: `[open, high, low, close]` — automatically converted to `{o, h, l, c}` objects
- **Object format**: `{o: 150, h: 155, l: 148, c: 152}` — passed through unchanged

Both types support `yMin`/`yMax` axis modifiers.

## Testing Architecture

### Module Mocking Strategy

The `obsidian` npm package is **type definitions only** — it provides no runtime implementations. Therefore, we must mock it for testing. Other packages like Chart.js require mocking due to their DOM dependencies in jsdom.

**Mocked Packages:**

- `obsidian` — Type-only package, needs runtime mock
- `chart.js` — v4: Complex DOM/Canvas dependencies, ESM. Mock provides Chart constructor, defaults, registerables
- `chartjs-chart-sankey` — v0.14: ESM-only. Mock provides SankeyController and Flow classes
- `chartjs-chart-financial` — v0.2.1: ESM-only. Mock provides CandlestickController, CandlestickElement, OhlcController, OhlcElement
- `chartjs-plugin-annotation` — v3: ESM-only. Mock provides annotation plugin object
- `chroma-js` — v3: ESM-only, returns 8-digit hex with alpha. Mock provides functional color API
- `markdown-tables-to-json` — Dependency `@ts-stack/markdown` is ESM-only. Mock provides working table parser
- `vanilla-picker` — Color picker component
- `*.svelte` — Svelte components

**Real Packages Used:**

- `luxon` — Date parsing and validation (pure JS, works in jsdom)

### Jest Configuration

```javascript
// jest.config.js key settings
{
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^obsidian$': '<rootDir>/__mocks__/obsidian.js',
    '^chart\\.js(/.*)?$': '<rootDir>/__mocks__/chart.js',
    '^chartjs-chart-sankey$': '<rootDir>/__mocks__/chartjs-chart-sankey.js',
    '^chartjs-chart-financial$': '<rootDir>/__mocks__/chartjs-chart-financial.js',
    '^chartjs-plugin-annotation$': '<rootDir>/__mocks__/chartjs-plugin-annotation.js',
    '^chroma-js$': '<rootDir>/__mocks__/chroma-js.js',  // ESM-only in v3
    '^markdown-tables-to-json$': '<rootDir>/__mocks__/markdown-tables-to-json.js',
    // ... other mocks
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'jest.tsconfig.json' }],
    '^.+\\.m?js$': ['ts-jest', { tsconfig: 'jest.tsconfig.json' }],
  },
  transformIgnorePatterns: [],  // All ESM handled via mocks
}
```

### HTMLElement Extensions

Obsidian extends HTMLElement with helper methods (`createEl`, `createDiv`, `empty`). Tests must add these to the prototype:

```typescript
// In tests/setup.ts
HTMLElement.prototype.createEl = function(tag: string, opts?: any): HTMLElement {
  const el = document.createElement(tag);
  if (opts?.cls) el.className = opts.cls;
  this.appendChild(el);
  return el;
};
```

## Running Tests

```bash
npm test
```

## Test Files Explained

### main.test.ts

Tests the main plugin class:

- Plugin initialization and settings loading
- Postprocessor registration
- Command registration
- Best fit line computation (linear regression)
- Best fit with custom title and line number selection
- Best fit with string data values (auto-conversion to numbers)
- `window.renderChart` API — routes YAML-like objects through `datasetPrep()`, passes raw Chart.js config directly, handles stacked/fill correctly

### chartRenderer.test.ts

Tests chart rendering:

- `datasetPrep()` — Prepares chart data from YAML for all chart types
- `renderRaw()` — Renders chart to DOM element
- `imageRenderer()` — Generates image from chart
- Data conversion: string→number, empty string→null, whitespace→null, non-numeric→null
- Null value preservation for spanGaps
- OHLC array→object conversion for candlestick/ohlc charts
- `stepped` property passed through to datasets
- Canvas dimensions set from YAML width property
- Debounced reload on metadata changes
- Block ID lookup via `sections` and `blocks` record fallback
- Containing section resolution when block found in `blocks` record

### chartFromTable.test.ts

Tests table-to-chart conversion:

- `chartFromTable()` — Converts selected table to chart code
- `generateTableData()` — Parses markdown table to data
- **Date auto-transpose** — Detects date fields and transposes for time series
- Block ID lookup with leading `^` prefix handling
- Empty cell preservation (empty strings in data output)
- Wikilink alias pipe escaping

## Key Mock Implementations

### obsidian.js Mock

Provides minimal implementations for:

- `Plugin` class with `loadData()`, `saveData()`, `addCommand()`
- `parseYaml()` — Simple YAML parser
- `moment()` — Date manipulation for date adapter
- `Notice` — Toast notifications
- `Modal`, `PluginSettingTab` — UI classes
- `Editor` — Text editing with `getSelection()`, `replaceSelection()`

### chart.js Mock (v4)

```javascript
const Chart = jest.fn().mockImplementation((_context, _config) => ({
  destroy: jest.fn(),
  toBase64Image: jest.fn().mockReturnValue('data:image/png;base64,mock'),
  data: _config?.data ?? { labels: [], datasets: [] },
  options: _config?.options ?? {},
}));
Chart.defaults = { color: '#666', font: {...}, plugins: { legend: {...} } };
Chart.register = jest.fn();
const registerables = { 0: jest.fn(), 1: jest.fn(), length: 4 };
```

### chroma-js Mock (v3)

```javascript
// v3 is ESM-only, returns 8-digit hex with alpha channel
const chroma = jest.fn().mockImplementation((color) => ({
  alpha: jest.fn().mockReturnValue({ hex: jest.fn().mockReturnValue(color + '40') }),
  hex: jest.fn().mockReturnValue(color),
}));
```

### markdown-tables-to-json Mock

The real package depends on `@ts-stack/markdown` which is ESM-only and incompatible with Jest's CJS transform. A working mock table parser is provided in `__mocks__/markdown-tables-to-json.js`.

## Common Issues and Solutions

### Runtime User Errors

These are errors users encounter when writing chart YAML in Obsidian notes.

#### "Missing type, labels or series"

**Cause:** The parsed YAML is missing one or more of the required fields (`type`, `labels`, `series`).

**Most common cause:** Using `data` as a top-level field instead of `series`. See the [Common Mistake: `data` vs `series`](#common-mistake-data-vs-series) section above.

Other causes:

- Missing `type` field entirely
- Missing `labels` field (required for standalone charts)
- Missing `series` field (required for standalone charts)
- YAML syntax error causing `parseYaml` to return an incomplete object
- Indentation issues in YAML (tabs are converted to 4 spaces, but mixed indentation can still break parsing)

#### "YAML parse error"

**Cause:** The YAML content could not be parsed at all. Check for:

- Unclosed brackets in inline arrays
- Improper quoting of strings with special characters
- Mixed tab/space indentation (tabs are auto-converted to 4 spaces before parsing)

#### "Invalid id and/or file"

**Cause:** Block ID lookup failed for a table-linked chart. Check that:

- The block ID exists on the target table (with `^` prefix in the note)
- The `file` attribute is correct for cross-file linking
- Obsidian has indexed the file (metadata cache may need a reload)

### Development Issues

#### "Cannot use import statement outside a module"

**Solution:** The date-adapter uses ESM. Mock it in `moduleNameMapper`.

#### "getComputedStyle expects Element"

**Solution:** Use real DOM elements (created via `document.createElement()`) for tests that call `getComputedStyle()`.

#### "el.createEl is not a function"

**Solution:** Add `createEl`/`createDiv`/`empty` to `HTMLElement.prototype` in test setup.

#### "Class extends value undefined"

**Solution:** Ensure the mock exports all classes that source code extends (e.g., `Modal`, `PluginSettingTab`).

#### Time series chart shows many series instead of one

**Solution:** Date auto-transpose feature handles this automatically. If field keys are date-like, data is transposed so dates become X-axis labels.

#### spanGaps shows empty cells as 0 instead of bridging gaps

**Solution:** Empty cells from tables are now converted to `null` (not `NaN` or `0`). Chart.js `spanGaps` requires `null` values to properly bridge gaps. `parseFloat("")` returns `NaN` which is wrong — the code now checks for empty/whitespace/non-numeric strings and converts them to `null`.

#### Stacked/fill options ignored in window.renderChart (Dataview)

**Solution:** `window.renderChart` now detects YAML-like objects (with `series` key) and routes them through `datasetPrep()`. Raw Chart.js configs (with `data.datasets`) pass through directly. Use the `series` format to get automatic handling of `fill`, `stacked`, `spanGaps`, etc.

## Adding New Tests

1. Create test file in `tests/` directory
2. Import modules under test
3. Use real DOM elements for tests involving `getComputedStyle()`
4. Add HTMLElement prototype extensions if needed
5. Create additional mocks in `__mocks__/` for new dependencies
6. **Always update tests when adding new features** — test coverage is mandatory

## Testing Requirements for Changes

**CRITICAL: Every feature or bug fix MUST include corresponding tests.**

When modifying any source file, you MUST:

1. **Add tests for new functionality** — Verify the feature works correctly
2. **Add regression tests for bug fixes** — Ensure the bug doesn't reoccur
3. **Test edge cases** — Null values, empty arrays, boundary conditions, error states
4. **Update existing tests if behavior changes** — Don't break existing test coverage

### Test File Mapping

| Source File | Test File |
|-------------|-----------|
| `src/main.ts` | `tests/main.test.ts` |
| `src/chartRenderer.ts` | `tests/chartRenderer.test.ts` |
| `src/chartFromTable.ts` | `tests/chartFromTable.test.ts` |
| `src/util.ts` | Add tests to relevant test file |

### Example: Adding a New Dataset Property

If adding `stepped` property support for table-linked charts:

```typescript
// Add to chartRenderer.test.ts
describe('ChartRenderChild', () => {
  it('applies stepped property to table-linked datasets', () => {
    // Test the stepped property is passed through
  });
});
```

### Example: Bug Fix for Date Parsing

If fixing a date parsing bug:

```typescript
// Add to chartFromTable.test.ts
it('parses European date format DD-MM-YYYY', () => {
  const table = '| Date | Value |\n|------|-------|\n| 17-03-2026 | 5 |';
  const result = generateTableData(table, 'rows');
  expect(result.labels).toContain('17-03-2026');
});
```

## Dependencies

**Production:**

- `chart.js` — v4: Chart rendering library (ESM)
- `chartjs-chart-sankey` — v0.14: Sankey diagram support (ESM)
- `chartjs-chart-financial` — v0.2.1: Candlestick and OHLC chart types (ESM)
- `chartjs-plugin-annotation` — v3: Chart annotations (ESM)
- `chroma-js` — v3: Color manipulation (ESM, returns 8-digit hex with alpha)
- `luxon` — Date parsing and validation
- `markdown-tables-to-json` — Table parsing (CJS, but dependency @ts-stack/markdown is ESM)
- `vanilla-picker` — Color picker

**Development:**

- `jest` — v30: Testing framework
- `ts-jest` — v29: TypeScript support for Jest
- `jest-canvas-mock` — Canvas mocking
- `jest-environment-jsdom` — v30: DOM environment
- `typescript` — v6: TypeScript compiler
- `@types/luxon` — TypeScript types for Luxon
- `svelte` — v5: UI framework (peer dependency via esbuild-svelte)

## Notes for Future Agents

1. **Don't remove mocks** — The obsidian mock is essential since the package is type-only
2. **ESM-only packages** — chart.js v4, chroma-js v3, chartjs-chart-sankey v0.14, chartjs-chart-financial v0.2.1, chartjs-plugin-annotation v3, and @ts-stack/markdown (dep of markdown-tables-to-json) are all ESM-only. They must be mocked in `moduleNameMapper` rather than transformed
3. **Extend HTMLElement** — Add Obsidian's helper methods to the prototype (done in `tests/setup.ts`)
4. **Date auto-transpose** — Tables with date keys are automatically transposed for time series
5. **Block IDs** — Strip `^` prefix when searching; search both `fileCache.sections[].id` AND `fileCache.blocks[blockId]`, with containing section resolution for the latter
6. **Empty cells → null** — Empty/whitespace/non-numeric strings become `null` (not `NaN` or `0`); critical for `spanGaps` to work correctly
7. **Debounced reload** — Chart reload on metadata change uses 500ms debounce; timer must be cleaned up in `onunload()`
8. **Canvas dimensions** — Image export respects YAML `width` property; percentage widths default to 600px for images
9. **Best fit computation** — Uses linear regression on index positions (i) vs data values (y); computed in postprocessor before rendering
10. **Stepped modifier** — Passed directly to Chart.js dataset; valid for line and bar chart types
11. **Wikilink pipe escaping** — `\|` inside `[[...]]` is replaced with a placeholder before table parsing, then restored after
12. **chroma-js v3 alpha** — Returns 8-digit hex (e.g., `#ff000040`) instead of rgba; Chart.js v4 accepts this
13. **TypeScript 6** — Requires `"ignoreDeprecations": "6.0"` in tsconfig and `"moduleResolution": "bundler"` in jest.tsconfig
14. **Always update tests** — When adding features, add corresponding tests in the same session
15. **window.renderChart dual-path** — YAML-like objects (with `series`) are routed through `datasetPrep()`; raw Chart.js configs pass through directly. This ensures `fill`, `stacked`, etc. work via the JS API
16. **Candlestick/OHLC data format** — Array `[o, h, l, c]` is auto-converted to `{o, h, l, c}` object; OHLC objects pass through unchanged
17. **chart.js v4 generic types** — Chart.js v4's `ChartConfiguration` and `ChartDataset` use deeply parameterized generics that can't be satisfied by custom interfaces. Use `Record<string, unknown>[]` for internal datasets and cast through `unknown` at the `ChartConfiguration` boundary with `as unknown as ChartConfiguration`
18. **No `any` types** — The codebase must not use `any`. Use `unknown` at chart.js boundaries and proper typed interfaces elsewhere. `@ts-ignore` is acceptable only for packages lacking type declarations (markdown-tables-to-json, .svelte imports)
19. **`series` is required, not `data`** — The most common user error is using `data` as a top-level field. `data` is only valid inside `series` items. Top-level `data` is silently ignored and causes "Missing type, labels or series" error
20. **YAML validation** — The postprocessor checks `!data.id` first; if no `id`, then `type`, `labels`, and `series` must all be truthy. Empty arrays pass but produce empty charts. Undefined/null/0/false/"" all fail validation
