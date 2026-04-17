# Agents Guide: Obsidian Charts Plugin Testing

## Overview

Obsidian Charts is an Obsidian plugin that enables users to create interactive charts within their notes using Chart.js. This guide documents the testing infrastructure for future AI agents.

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

## Adding New Tests

1. Create test file in `tests/` directory
2. Import modules under test
3. Use real DOM elements for tests involving `getComputedStyle()`
4. Add HTMLElement prototype extensions if needed
5. Create additional mocks in `__mocks__/` for new dependencies

## Dependencies

**Production:**
- `chart.js` - Chart rendering library
- `chartjs-chart-sankey` - Sankey diagram support
- `chartjs-plugin-annotation` - Chart annotations
- `chroma-js` - Color manipulation
- `markdown-tables-to-json` - Table parsing
- `svelte` - UI framework
- `vanilla-picker` - Color picker

**Development:**
- `jest` - Testing framework
- `ts-jest` - TypeScript support for Jest
- `jest-canvas-mock` - Canvas mocking
- `jest-environment-jsdom` - DOM environment

## Notes for Future Agents

1. **Don't remove mocks** - The obsidian mock is essential since the package is type-only
2. **Use real DOM elements** - When testing code that uses `getComputedStyle()`
3. **Extend HTMLElement** - Add Obsidian's helper methods to the prototype
4. **Check markdown-tables-to-json behavior** - It treats first column as labels, not data
5. **ESM modules need mocking** - The date-adapter uses ESM imports from obsidian
