import { chartFromTable, generateTableData } from '../src/chartFromTable';
import { Extractor } from 'markdown-tables-to-json';

jest.mock('markdown-tables-to-json');

describe('chartFromTable', () => {
  let mockEditor: any;

  beforeEach(() => {
    mockEditor = {
      getSelection: () => '| Header1 | Header2 |\n|---------|---------|\n| 1       | 2       |',
      replaceSelection: jest.fn()
    };
    (Extractor.extractObject as jest.Mock).mockReturnValue({
      Col1: { Row1: '1', Row2: '2' }
    });
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
    (Extractor.extractObject as jest.Mock).mockReturnValueOnce({
      'A': { '1': '1', '2': '2' }
    });
    const result = generateTableData('| A | B |\n| 1 | 2 |', 'columns');
    expect(result.labels).toEqual(['1', '2']);
    expect(result.dataFields).toHaveLength(1);
  });

  it('handles malformed table', () => {
    jest.spyOn(Extractor, 'extractObject').mockImplementation(() => { throw new Error('Malformed'); });
    expect(() => generateTableData('invalid', 'columns')).toThrow();
  });

  it('filters selected fields', () => {
    const table = '| A | B |\n| 1 | 2 |\n| 3 | 4 |';
    const result = generateTableData(table, 'columns', ['A']);
    expect(result.dataFields[0].dataTitle).toBe('A');
  });
});