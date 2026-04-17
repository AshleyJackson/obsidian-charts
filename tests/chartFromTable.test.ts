import { chartFromTable, generateTableData } from '../src/chartFromTable';
import { Extractor } from 'markdown-tables-to-json';

describe('chartFromTable', () => {
  let mockEditor: any;

  beforeEach(() => {
    mockEditor = {
      getSelection: () => '| Header1 | Header2 |\n|---------|---------|\n| 1       | 2       |',
      replaceSelection: jest.fn()
    };
  });

  it('generates chart from column layout', () => {
    chartFromTable(mockEditor as any, 'columns');
    expect(mockEditor.replaceSelection).toHaveBeenCalledWith(expect.stringContaining('type: bar'));
  });

  it('generates chart from row layout', () => {
    chartFromTable(mockEditor as any, 'rows');
    expect(mockEditor.replaceSelection).toHaveBeenCalledWith(expect.stringContaining('type: bar'));
  });
});

describe('generateTableData', () => {
  it('parses column layout correctly', () => {
    // markdown-tables-to-json treats first column as labels
    // Table: | A | B |
    //        |---|---|
    //        | 1 | 2 |
    //        | 3 | 4 |
    // Labels = ['1', '3'] (first column values)
    // dataFields = [{ title: 'B', data: ['2', '4'] }]
    const table = '| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |';
    const result = generateTableData(table, 'columns');
    expect(result.labels).toEqual(['1', '3']);
    expect(result.dataFields).toHaveLength(1);
    expect(result.dataFields[0].dataTitle).toBe('B');
  });

  it('handles malformed table', () => {
    expect(() => generateTableData('invalid', 'columns')).toThrow();
  });

  it('filters selected fields', () => {
    // When filtering by 'B', only column B is included
    const table = '| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |';
    const result = generateTableData(table, 'columns', ['B']);
    expect(result.dataFields[0].dataTitle).toBe('B');
  });

  it('auto-transposes date-based tables for time series', () => {
    // Table with dates in first column - should auto-transpose
    const table = '| Date | Value |\n|------|-------|\n| 2026-03-17 | 5 |\n| 2026-03-18 | 3 |\n| 2026-03-19 | 7 |';
    const result = generateTableData(table, 'rows');
    // After transpose: dates become labels, 'Value' becomes series title
    expect(result.labels).toEqual(['2026-03-17', '2026-03-18', '2026-03-19']);
    expect(result.dataFields).toHaveLength(1);
    expect(result.dataFields[0].dataTitle).toBe('Value');
    expect(result.dataFields[0].data).toEqual(['5', '3', '7']);
  });
});