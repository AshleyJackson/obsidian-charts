# Agents Guide: Obsidian Charts Plugin Testing

## Overview

Obsidian Charts is an Obsidian plugin that enables users to create interactive charts within their notes using Chart.js. This guide documents the testing infrastructure and key features for future AI agents.

## Project Structure

```
obsidian-charts/
├── src/                    # Source code (TypeScript + Svelte)
│   ├── main.ts             # Main plugin class
│   ├── chartRenderer.ts    # Chart rendering logic
│   ├── chartFromTable.ts   # Table-to-chart conversion
│   ├── util.ts             # Utility functions
│   ├── constants/          # Constants and settings
│   ├── date-adapter/       # Moment.js adapter for Chart.js
│   └── ui/                 # UI components (Svelte + TypeScript)
├── tests/                  # Jest test files
│   ├── main.test.ts        # Plugin tests
│   ├── chartRenderer.test.ts # Renderer tests
│   ├── chartFromTable.test.ts # Table conversion tests
│   └── setup.ts            # Jest setup (canvas mock, ResizeObserver)
├── __mocks__/              # Jest mocks for external modules
│   ├── obsidian.js         # Mock for obsidian package (type-only)
│   ├── chart.js            # Mock for Chart.js
│   ├── chartjs-chart-sankey.js # Mock for Sankey controller
│   ├── chartjs-plugin-annotation.js # Mock for annotation plugin
│   ├── date-adapter.js     # Mock for date adapter
│   ├── vanilla-picker.js   # Mock for color picker
│   └── svelte.js           # Mock for Svelte components
├── jest.config.js          # Jest configuration
└── jest.tsconfig.json      # TypeScript config for tests
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
Charts can link to tables using block IDs. The ID format uses `^` prefix in YAML (e.g., `id: ^my-table`) but Obsidian's cache stores IDs without the prefix. The code strips the leading `^` when searching `fileCache.sections`.

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

### String Data Auto-Conversion
YAML parsing can return numeric values as strings (e.g., `"5"` instead of `5`). Both `datasetPrep()` and the table-linked chart path in `ChartRenderChild.onload()` automatically convert string data values to numbers using `parseFloat()`. This ensures chart rendering works correctly regardless of YAML input format.

### Canvas Dimensions for Image Export
The `imageRenderer()` method respects the `width` property from YAML when generating chart images. It parses pixel values (`600px`), numeric values (`600`), and rejects percentage values (falls back to default `600px`). The height is calculated at a 2:1 aspect ratio. Previously, canvas dimensions were not set from YAML, resulting in default/small image exports.

### Debounced Chart Reload
`ChartRenderChild` uses a debounced reload mechanism (500ms) when metadata changes are detected for linked charts. This prevents rapid successive reloads when a file is being edited, which could cause rendering issues or performance problems. The debounce timer is properly cleaned up in `onunload()`.

## Testing Architecture

### Module Mocking Strategy

The `obsidian` npm package is **type definitions only** - it provides no runtime implementations. Therefore, we must mock it for testing. Other packages like Chart.js require mocking due to their DOM dependencies in jsdom.

**Mocked Packages:**
- `obsidian` - Type-only package, needs runtime mock
- `chart.js` - v4: Complex DOM/Canvas dependencies, ESM. Mock provides Chart constructor, defaults, registerables
- `chartjs-chart-sankey` - v0.14: ESM-only. Mock provides SankeyController and Flow classes
- `chartjs-plugin-annotation` - v3: ESM-only. Mock provides annotation plugin object
- `chroma-js` - v3: ESM-only, returns 8-digit hex with alpha. Mock provides functional color API
- `markdown-tables-to-json` - Dependency `@ts-stack/markdown` is ESM-only. Mock provides working table parser
- `vanilla-picker` - Color picker component
- `*.svelte` - Svelte components

**Real Packages Used:**
- `luxon` - Date parsing and validation (pure JS, works in jsdom)

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
    '^chartjs-plugin-annotation$': '<rootDir>/__mocks__/chartjs-plugin-annotation.js',
    '^chroma-js$': '<rootDir>/__mocks__/chroma-js.js',  // ESM-only in v3
    '^markdown-tables-to-json$': '<rootDir>/__mocks__/markdown-tables-to-json.js',  // @ts-stack/markdown is ESM
    // ... other mocks
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'jest.tsconfig.json' }],
    '^.+\\.m?js$': ['ts-jest', { tsconfig: 'jest.tsconfig.json' }],  // Transform ESM packages
  },
  transformIgnorePatterns: [],  // All ESM handled via mocks
}
```

### HTMLElement Extensions

Obsidian extends HTMLElement with helper methods (`createEl`, `createDiv`, `empty`). Tests must add these to the prototype:

```typescript
// In chartRenderer.test.ts
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

### chartRenderer.test.ts
Tests chart rendering:
- `datasetPrep()` - Prepares chart data from YAML
- `renderRaw()` - Renders chart to DOM element
- `imageRenderer()` - Generates image from chart
- String data auto-conversion to numbers
- `stepped` property passed through to datasets
- Canvas dimensions set from YAML width property
- Debounced reload on metadata changes

### chartFromTable.test.ts
Tests table-to-chart conversion:
- `chartFromTable()` - Converts selected table to chart code
- `generateTableData()` - Parses markdown table to data
- **Date auto-transpose** - Detects date fields and transposes for time series
- Block ID lookup with leading `^` prefix handling

## Key Mock Implementations

### obsidian.js Mock
Provides minimal implementations for:
- `Plugin` class with `loadData()`, `saveData()`, `addCommand()`
- `parseYaml()` - Simple YAML parser
- `moment()` - Date manipulation for date adapter
- `Notice` - Toast notifications
- `Modal`, `PluginSettingTab` - UI classes
- `Editor` - Text editing with `getSelection()`, `replaceSelection()`

### chart.js Mock (v4)
```javascript
const Chart = jest.fn().mockImplementation((_context, _config) => ({
  destroy: jest.fn(),
  toBase64Image: jest.fn().mockReturnValue('data:image/png;base64,mock'),
  data: _config?.data ?? { labels: [], datasets: [] },
  options: _config?.options ?? {},
  // ... additional v4 properties
}));
// v4: registerables is array-like (not empty), defaults has flatter structure
Chart.defaults = { color: '#666', font: {...}, plugins: { legend: {...}, ... }, ... };
Chart.register = jest.fn();
const registerables = { 0: jest.fn(), 1: jest.fn(), ..., length: 4 };
```

### chroma-js Mock (v3)
```javascript
// v3 is ESM-only, returns 8-digit hex with alpha channel
const chroma = jest.fn().mockImplementation((color) => ({
  alpha: jest.fn().mockReturnValue({ hex: jest.fn().mockReturnValue(color + '40') }),
  hex: jest.fn().mockReturnValue(color),
  // ... additional methods
}));
```

### markdown-tables-to-json Mock
The real package depends on `@ts-stack/markdown` which is ESM-only and incompatible with Jest's CJS transform. A working mock table parser is provided in `__mocks__/markdown-tables-to-json.js`.

## Common Issues & Solutions

### Issue: "Cannot use import statement outside a module"
**Solution:** The date-adapter uses ESM. Mock it in `moduleNameMapper`.

### Issue: "getComputedStyle expects Element"
**Solution:** Use real DOM elements (created via `document.createElement()`) for tests that call `getComputedStyle()`.

### Issue: "el.createEl is not a function"
**Solution:** Add `createEl`/`createDiv`/`empty` to `HTMLElement.prototype` in test setup.

### Issue: "Class extends value undefined"
**Solution:** Ensure the mock exports all classes that source code extends (e.g., `Modal`, `PluginSettingTab`).

### Issue: "Invalid id and/or file" for linked charts
**Solution:** Block IDs in YAML use `^` prefix (e.g., `^my-table`), but Obsidian's cache stores IDs without it. The code strips the leading `^` when searching.

### Issue: Time series chart shows many series instead of one
**Solution:** Date auto-transpose feature handles this automatically. If field keys are date-like, data is transposed so dates become X-axis labels.

## Adding New Tests

1. Create test file in `tests/` directory
2. Import modules under test
3. Use real DOM elements for tests involving `getComputedStyle()`
4. Add HTMLElement prototype extensions if needed
5. Create additional mocks in `__mocks__/` for new dependencies
6. **Always update tests when adding new features** - test coverage is mandatory

## Testing Requirements for Changes

**CRITICAL: Every feature or bug fix MUST include corresponding tests.**

When modifying any source file, you MUST:
1. **Add tests for new functionality** - Verify the feature works correctly
2. **Add regression tests for bug fixes** - Ensure the bug doesn't reoccur
3. **Test edge cases** - Null values, empty arrays, boundary conditions, error states
4. **Update existing tests if behavior changes** - Don't break existing test coverage

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
- `chart.js` - v4: Chart rendering library (ESM)
- `chartjs-chart-sankey` - v0.14: Sankey diagram support (ESM)
- `chartjs-plugin-annotation` - v3: Chart annotations (ESM)
- `chroma-js` - v3: Color manipulation (ESM, returns 8-digit hex with alpha)
- `luxon` - Date parsing and validation
- `markdown-tables-to-json` - Table parsing (CJS, but dependency @ts-stack/markdown is ESM)
- `vanilla-picker` - Color picker

**Development:**
- `jest` - v30: Testing framework
- `ts-jest` - v29: TypeScript support for Jest
- `jest-canvas-mock` - Canvas mocking
- `jest-environment-jsdom` - v30: DOM environment
- `typescript` - v6: TypeScript compiler
- `@types/luxon` - TypeScript types for Luxon
- `svelte` - v5: UI framework (peer dependency via esbuild-svelte)

## Notes for Future Agents

1. **Don't remove mocks** - The obsidian mock is essential since the package is type-only
2. **ESM-only packages** - chart.js v4, chroma-js v3, chartjs-chart-sankey v0.14, chartjs-plugin-annotation v3, and @ts-stack/markdown (dep of markdown-tables-to-json) are all ESM-only. They must be mocked in `moduleNameMapper` rather than transformed
3. **Extend HTMLElement** - Add Obsidian's helper methods to the prototype (done in `tests/setup.ts`)
4. **Date auto-transpose** - Tables with date keys are automatically transposed for time series
5. **Block IDs** - Strip `^` prefix when searching Obsidian's fileCache.sections
6. **String data values** - YAML may parse numbers as strings; code auto-converts via `parseFloat()`
7. **Debounced reload** - Chart reload on metadata change uses 500ms debounce; timer must be cleaned up in `onunload()`
8. **Canvas dimensions** - Image export respects YAML `width` property; percentage widths default to 600px for images
9. **Best fit computation** - Uses linear regression on index positions (i) vs data values (y); computed in postprocessor before rendering
10. **Stepped modifier** - Passed directly to Chart.js dataset; valid for line and bar chart types
11. **Wikilink pipe escaping** - `\|` inside `[[...]]` is replaced with a placeholder before table parsing, then restored after
12. **chroma-js v3 alpha** - Returns 8-digit hex (e.g., `#ff000040`) instead of rgba; Chart.js v4 accepts this
13. **TypeScript 6** - Requires `"ignoreDeprecations": "6.0"` in tsconfig and `"moduleResolution": "bundler"` in jest.tsconfig
14. **Always update tests** - When adding features, add corresponding tests in the same session
