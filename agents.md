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

## Testing Architecture

### Module Mocking Strategy

The `obsidian` npm package is **type definitions only** - it provides no runtime implementations. Therefore, we must mock it for testing. Other packages like Chart.js require mocking due to their DOM dependencies in jsdom.

**Mocked Packages:**
- `obsidian` - Type-only package, needs runtime mock
- `chart.js` - Complex DOM/Canvas dependencies
- `chartjs-chart-sankey` - Sankey chart controller
- `chartjs-plugin-annotation` - Annotation plugin
- `vanilla-picker` - Color picker component
- `*.svelte` - Svelte components

**Real Packages Used:**
- `markdown-tables-to-json` - Table parsing (pure JS, works in jsdom)
- `chroma-js` - Color manipulation (pure JS)

### Jest Configuration

```javascript
// jest.config.js key settings
{
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^obsidian$': '<rootDir>/__mocks__/obsidian.js',
    '^chart\\.js(/.*)?$': '<rootDir>/__mocks__/chart.js',
    // ... other mocks
  },
  roots: ['<rootDir>/src', '<rootDir>/tests']
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

### chartRenderer.test.ts
Tests chart rendering:
- `datasetPrep()` - Prepares chart data from YAML
- `renderRaw()` - Renders chart to DOM element
- `imageRenderer()` - Generates image from chart

### chartFromTable.test.ts
Tests table-to-chart conversion:
- `chartFromTable()` - Converts selected table to chart code
- `generateTableData()` - Parses markdown table to data
- **Date auto-transpose** - Detects date fields and transposes for time series

## Key Mock Implementations

### obsidian.js Mock
Provides minimal implementations for:
- `Plugin` class with `loadData()`, `saveData()`, `addCommand()`
- `parseYaml()` - Simple YAML parser
- `moment()` - Date manipulation for date adapter
- `Notice` - Toast notifications
- `Modal`, `PluginSettingTab` - UI classes
- `Editor` - Text editing with `getSelection()`, `replaceSelection()`

### chart.js Mock
```javascript
const Chart = jest.fn().mockImplementation(() => ({
  destroy: jest.fn(),
  toBase64Image: jest.fn().mockReturnValue('data:image/png;base64,mock'),
}));
Chart.defaults = { color: '', font: {}, plugins: {}, layout: {} };
Chart.register = jest.fn();
const registerables = []; // Empty for testing
```

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
- `chart.js` - Chart rendering library
- `chartjs-chart-sankey` - Sankey diagram support
- `chartjs-plugin-annotation` - Chart annotations
- `chroma-js` - Color manipulation
- `luxon` - Date parsing and validation
- `markdown-tables-to-json` - Table parsing
- `svelte` - UI framework
- `vanilla-picker` - Color picker

**Development:**
- `jest` - Testing framework
- `ts-jest` - TypeScript support for Jest
- `jest-canvas-mock` - Canvas mocking
- `jest-environment-jsdom` - DOM environment
- `@types/luxon` - TypeScript types for Luxon

## Notes for Future Agents

1. **Don't remove mocks** - The obsidian mock is essential since the package is type-only
2. **Use real DOM elements** - When testing code that uses `getComputedStyle()`
3. **Extend HTMLElement** - Add Obsidian's helper methods to the prototype
4. **Date auto-transpose** - Tables with date keys are automatically transposed for time series
5. **Block IDs** - Strip `^` prefix when searching Obsidian's fileCache.sections
6. **ESM modules need mocking** - The date-adapter uses ESM imports from obsidian
7. **Always update tests** - When adding features, add corresponding tests in the same session
