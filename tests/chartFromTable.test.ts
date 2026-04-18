import { chartFromTable, generateTableData } from '../src/chartFromTable';
import { Extractor } from 'markdown-tables-to-json';

describe('chartFromTable', () => {
  let mockEditor: any;

  beforeEach(() => {
    mockEditor = {
      getSelection: () => '| Header1 | Header2 |\n|---------|---------|\n| 1       | 2       |',
      replaceSelection: jest.fn(),
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

  it('includes labels from table in generated chart', () => {
    chartFromTable(mockEditor as any, 'columns');
    const call = mockEditor.replaceSelection.mock.calls[0][0];
    expect(call).toContain('labels:');
  });

  it('includes series from table in generated chart', () => {
    chartFromTable(mockEditor as any, 'columns');
    const call = mockEditor.replaceSelection.mock.calls[0][0];
    expect(call).toContain('series:');
  });

  it('sets beginAtZero to true in generated chart', () => {
    chartFromTable(mockEditor as any, 'columns');
    const call = mockEditor.replaceSelection.mock.calls[0][0];
    expect(call).toContain('beginAtZero: true');
  });

  it('sets width to 80% in generated chart', () => {
    chartFromTable(mockEditor as any, 'columns');
    const call = mockEditor.replaceSelection.mock.calls[0][0];
    expect(call).toContain('width: 80%');
  });
});

describe('generateTableData', () => {
  describe('basic parsing', () => {
    it('parses column layout correctly', () => {
      const table = '| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |';
      const result = generateTableData(table, 'columns');
      expect(result.labels).toEqual(['1', '3']);
      expect(result.dataFields).toHaveLength(1);
      expect(result.dataFields[0].dataTitle).toBe('B');
    });

    it('parses row layout correctly', () => {
      const table = '| A | B |\n|---|---|\n| 1 | 2 |';
      const result = generateTableData(table, 'rows');
      expect(result.labels).toBeDefined();
      expect(result.dataFields).toBeDefined();
    });

    it('handles malformed table', () => {
      expect(() => generateTableData('invalid', 'columns')).toThrow();
    });

    it('handles empty table string', () => {
      expect(() => generateTableData('', 'columns')).toThrow();
    });
  });

  describe('wikilink alias with escaped pipe', () => {
    it('correctly parses wikilinks with aliased pipe in rows layout', () => {
      const table = '| column 1          | column 2 |\n| ----------------- | -------- |\n| [[Testing\\|test]] | 10       |';
      const result = generateTableData(table, 'rows');
      expect(result.dataFields[0].dataTitle).toBe('[[Testing|test]]');
      expect(result.dataFields[0].data).toEqual(['10']);
    });

    it('correctly parses wikilinks with aliased pipe in columns layout', () => {
      const table = '| column 1          | column 2 |\n| ----------------- | -------- |\n| [[Testing\\|test]] | 10       |';
      const result = generateTableData(table, 'columns');
      expect(result.dataFields[0].dataTitle).toBe('column 2');
      expect(result.dataFields[0].data[0]).toBe('10');
    });

    it('handles multiple wikilinks with pipes in the same table', () => {
      const table = '| column 1                | column 2 |\n| ------------------------ | -------- |\n| [[Page1\\|Alias1]]       | 10       |\n| [[Page2\\|Alias2]]       | 20       |';
      const result = generateTableData(table, 'rows');
      expect(result.dataFields).toHaveLength(2);
      expect(result.dataFields[0].dataTitle).toBe('[[Page1|Alias1]]');
      expect(result.dataFields[0].data).toEqual(['10']);
      expect(result.dataFields[1].dataTitle).toBe('[[Page2|Alias2]]');
      expect(result.dataFields[1].data).toEqual(['20']);
    });

    it('handles wikilink without alias (no escaped pipe) normally', () => {
      const table = '| column 1     | column 2 |\n| ------------- | -------- |\n| [[Testing]]   | 10       |';
      const result = generateTableData(table, 'rows');
      expect(result.dataFields[0].dataTitle).toBe('[[Testing]]');
      expect(result.dataFields[0].data).toEqual(['10']);
    });

    it('preserves pipe in wikilink label text after restoration', () => {
      const table = '| Name | Value |\n|------|-------|\n| [[A\\|B]] | 5 |';
      const result = generateTableData(table, 'rows');
      expect(result.dataFields[0].dataTitle).toBe('[[A|B]]');
    });
  });

  describe('field selection', () => {
    it('filters selected fields', () => {
      const table = '| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |';
      const result = generateTableData(table, 'columns', ['B']);
      expect(result.dataFields[0].dataTitle).toBe('B');
    });

    it('returns all fields when no selection specified', () => {
      const table = '| A | B | C |\n|---|---|---|\n| 1 | 2 | 3 |';
      const result = generateTableData(table, 'columns');
      expect(result.dataFields.length).toBeGreaterThan(0);
    });

    it('returns empty dataFields when selection matches nothing', () => {
      const table = '| A | B |\n|---|---|\n| 1 | 2 |';
      const result = generateTableData(table, 'columns', ['Z']);
      expect(result.dataFields).toHaveLength(0);
    });
  });

  describe('empty cell handling', () => {
    it('preserves empty cells as empty strings in data output', () => {
      const table = '| Datum | warm | kalt |\n|---|---|---|\n| 12.03 | 0 | 0 |\n| 15.03 |  | 18 |';
      const result = generateTableData(table, 'columns');
      // The warm series should have an empty string at index 1
      const warmField = result.dataFields.find(f => f.dataTitle === 'warm');
      expect(warmField).toBeDefined();
      expect(warmField!.data[1]).toBe('');
    });

    it('preserves multiple empty cells across rows and columns', () => {
      const table = '| Label | A | B |\n|---|---|---|\n| row1 | 1 |  |\n| row2 |  | 4 |';
      const result = generateTableData(table, 'rows');
      // In rows layout, first column values become dataField titles
      const row1 = result.dataFields.find(f => f.dataTitle === 'row1');
      const row2 = result.dataFields.find(f => f.dataTitle === 'row2');
      expect(row1!.data[1]).toBe('');  // B column for row1 is empty
      expect(row2!.data[0]).toBe('');  // A column for row2 is empty
    });
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

    it('requires majority of keys to be date-like for transpose', () => {
      // Only 1 of 3 keys is date-like - should NOT transpose
      const table = '| Date | Apple | Banana |\n|------|-------|--------|\n| 2026-01-01 | 10 | 15 |\n| Apple | 5 | 8 |\n| Banana | 3 | 6 |';
      const result = generateTableData(table, 'rows');
      // Majority (2/3) are not dates, so no transpose
      // Without transpose, each row key is a separate dataField
      expect(result.dataFields.length).toBeGreaterThan(1);
    });

    it('transposes when all keys are dates', () => {
      const table = '| Date | Value |\n|------|-------|\n| 2026-01-01 | 5 |\n| 2026-01-02 | 10 |';
      const result = generateTableData(table, 'rows');
      expect(result.labels).toEqual(['2026-01-01', '2026-01-02']);
    });
  });
});

describe('Extractor mock', () => {
  it('extracts table data from simple markdown table', () => {
    const table = '| Name | Age |\n|------|-----|\n| Alice | 30 |\n| Bob | 25 |';
    const result = Extractor.extractObject(table, 'rows', false);
    expect(result).toBeDefined();
    expect(result).not.toBeNull();
  });

  it('returns null for invalid table', () => {
    const result = Extractor.extractObject('not a table', 'rows', false);
    expect(result).toBeNull();
  });

  it('extracts columns layout', () => {
    const table = '| Name | Age |\n|------|-----|\n| Alice | 30 |';
    const result = Extractor.extractObject(table, 'columns', false);
    expect(result).toBeDefined();
  });
});
