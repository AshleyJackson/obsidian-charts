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

  describe('date auto-transpose', () => {
    it('auto-transposes ISO date format (YYYY-MM-DD)', () => {
      const table = '| Date | Value |\n|------|-------|\n| 2026-03-17 | 5 |\n| 2026-03-18 | 3 |\n| 2026-03-19 | 7 |';
      const result = generateTableData(table, 'rows');
      expect(result.labels).toEqual(['2026-03-17', '2026-03-18', '2026-03-19']);
      expect(result.dataFields).toHaveLength(1);
      expect(result.dataFields[0].dataTitle).toBe('Value');
      expect(result.dataFields[0].data).toEqual(['5', '3', '7']);
    });

    it('auto-transposes US date format (MM/DD/YYYY)', () => {
      const table = '| Date | Value |\n|------|-------|\n| 03/17/2026 | 5 |\n| 03/18/2026 | 3 |';
      const result = generateTableData(table, 'rows');
      expect(result.labels).toEqual(['03/17/2026', '03/18/2026']);
      expect(result.dataFields[0].dataTitle).toBe('Value');
    });

    it('auto-transposes European date format (DD/MM/YYYY)', () => {
      const table = '| Date | Value |\n|------|-------|\n| 17/03/2026 | 5 |\n| 18/03/2026 | 3 |';
      const result = generateTableData(table, 'rows');
      expect(result.labels).toEqual(['17/03/2026', '18/03/2026']);
      expect(result.dataFields[0].dataTitle).toBe('Value');
    });

    it('does not transpose non-date tables', () => {
      const table = '| Category | Value |\n|----------|-------|\n| Apple | 5 |\n| Banana | 3 |';
      const result = generateTableData(table, 'rows');
      // Should NOT transpose - categories are not dates
      expect(result.labels).toEqual(['Value']);
      expect(result.dataFields).toHaveLength(2);
    });

    it('handles mixed date formats with multiple columns', () => {
      const table = '| Date | Sales | Costs |\n|------|-------|-------|\n| 2026-01-15 | 100 | 50 |\n| 2026-01-16 | 120 | 60 |';
      const result = generateTableData(table, 'rows');
      expect(result.labels).toEqual(['2026-01-15', '2026-01-16']);
      expect(result.dataFields).toHaveLength(2);
      expect(result.dataFields[0].dataTitle).toBe('Sales');
      expect(result.dataFields[1].dataTitle).toBe('Costs');
    });
  });
});