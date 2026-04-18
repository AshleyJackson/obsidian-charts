/**
 * Mock for markdown-tables-to-json module
 * The real package depends on @ts-stack/markdown which is ESM-only
 * and incompatible with Jest's CJS transform pipeline.
 * This mock provides a working table parser for tests.
 */

/**
 * Simple markdown table parser.
 * Parses pipe-delimited tables and returns an object keyed by first column.
 */
function parseTable(markdown) {
  const lines = markdown.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return null;

  // Filter out separator rows (---)
  const dataRows = lines.filter(line => {
    const stripped = line.replace(/[|\s]/g, '');
    return stripped.length > 0 && !/^[-:]+$/.test(stripped);
  });

  if (dataRows.length === 0) return null;

  // Parse cells from each row
  const rows = dataRows.map(line => {
    return line.split('|')
      .map(cell => cell.trim())
      .filter((cell, idx, arr) => {
        // Filter empty leading/trailing cells from pipe syntax
        // | A | B | -> ['','A','B',''] -> ['A','B']
        return cell !== '' || (idx > 0 && idx < arr.length - 1);
      })
      .filter((cell, idx, arr) => !(idx === 0 && cell === '') && !(idx === arr.length - 1 && cell === ''));
  });

  if (rows.length === 0) return null;

  // First row is the header
  const headers = rows[0];
  const dataRowsOnly = rows.slice(1);

  return { headers, rows: dataRowsOnly };
}

class Extractor {
  constructor(mode, lowercaseKeys) {
    this.mode = mode || 'rows';
    this.lowercaseKeys = lowercaseKeys || false;
  }

  static extractObject(markdown, mode, lowercaseKeys) {
    const parsed = parseTable(markdown);
    if (!parsed) return null;

    const { headers, rows } = parsed;
    // First column is the row name, rest are keyed by headers
    const keys = headers.slice(1);
    const obj = {};

    rows.forEach(cells => {
      if (cells.length < 2) return;
      const rowName = this.lowercaseKeys ? cells[0].toLowerCase() : cells[0];
      const rowObj = {};
      keys.forEach((key, index) => {
        const k = this.lowercaseKeys ? key.toLowerCase() : key;
        rowObj[k] = cells[index + 1] !== undefined ? cells[index + 1] : '';
      });
      obj[this.lowercaseKeys ? rowName.toLowerCase() : rowName] = rowObj;
    });

    if (mode === 'columns') {
      // Transpose: column headers become keys, row values become the data
      const transposed = {};
      keys.forEach(key => {
        const k = this.lowercaseKeys ? key.toLowerCase() : key;
        const colObj = {};
        rows.forEach(cells => {
          const rowName = cells[0];
          colObj[this.lowercaseKeys ? rowName.toLowerCase() : rowName] = cells[headers.indexOf(key)] || '';
        });
        transposed[k] = colObj;
      });
      return transposed;
    }

    return obj;
  }

  static extractAllObjects(markdown, mode, lowercaseKeys) {
    const result = Extractor.extractObject(markdown, mode, lowercaseKeys);
    return result ? [result] : [];
  }

  static extractTable(markdown, mode, lowercaseKeys) {
    const parsed = parseTable(markdown);
    if (!parsed) return null;
    return [parsed.headers, ...parsed.rows];
  }

  static extractAllTables(markdown, mode, lowercaseKeys) {
    const result = Extractor.extractTable(markdown, mode, lowercaseKeys);
    return result ? [result] : [];
  }

  static extract(markdown, mode, lowercaseKeys) {
    const obj = Extractor.extractObject(markdown, mode, lowercaseKeys);
    return obj ? JSON.stringify(obj) : null;
  }

  static extractAll(markdown, mode, lowercaseKeys) {
    return Extractor.extractAllObjects(markdown, mode, lowercaseKeys)
      .map(obj => JSON.stringify(obj));
  }
}

module.exports = { Extractor };
