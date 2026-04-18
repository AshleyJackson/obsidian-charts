import { Editor, Notice } from 'obsidian';
// @ts-ignore - markdown-tables-to-json lacks type declarations; see src/types.d.ts for ambient declaration
import { Extractor } from "markdown-tables-to-json";
import { DateTime } from 'luxon';
import type { DataField } from 'src/constants/settingsConstants';

// Date formats Luxon should try for auto-detection
const DATE_FORMATS = [
  'yyyy-MM-dd',      // 2026-03-17
  'MM/dd/yyyy',      // 03/17/2026
  'yyyy/MM/dd',      // 2026/03/17
  'M-d-yyyy',        // 3-17-2026
  'M/d/yyyy',        // 3/17/2026
  'dd-MM-yyyy',      // 17-03-2026
  'dd/MM/yyyy',      // 17/03/2026
  'd-M-yyyy',        // 17-3-2026
  'd/M/yyyy',        // 17/3/2026
];

function isDateLike(value: string): boolean {
  const trimmed = value.trim();
  // Try ISO format first (most common)
  if (DateTime.fromISO(trimmed).isValid) {
    return true;
  }
  // Try other common formats
  for (const format of DATE_FORMATS) {
    if (DateTime.fromFormat(trimmed, format).isValid) {
      return true;
    }
  }
  return false;
}

export async function chartFromTable(editor: Editor, layout: 'columns' | 'rows') {
  console.log('Charts: Starting chart from table generation with layout:', layout);
  const selection = editor.getSelection();
  console.log('Charts: Selected table text length:', selection.length);
  const {labels, dataFields} = generateTableData(selection, layout);
  console.log('Charts: Generated labels:', labels, 'dataFields count:', dataFields.length);
  const chart = `\`\`\`chart
type: bar
labels: [${labels}]
series:
${dataFields
    .map((data) => `  - title: ${data.dataTitle}
    data: [${data.data}]`)
    .join("\n")}
width: 80%
beginAtZero: true
\`\`\``;

  console.log('Charts: Generated chart code length:', chart.length);
  editor.replaceSelection(chart);
  console.log('Charts: Replaced selection with chart code');
}

export function generateTableData(table: string, layout: 'columns' | 'rows', selected?: string[]): { labels: string[]; dataFields: DataField[] } {
  console.log('Charts: Generating table data with layout:', layout, 'table length:', table.length);

  // Preserve escaped pipes in wikilinks (e.g., [[Page|Alias]]) before parsing.
  // The markdown parser treats \| as a table delimiter, splitting the cell.
  // We temporarily replace \| inside [[...]] with a placeholder, then restore after parsing.
  const PIPE_PLACEHOLDER = '\x00WIKILINK_PIPE\x00';
  const tableWithPlaceholders = table.replace(/\[\[([^\]]*?)\\\|([^\]]*?)\]\]/g, (_match: string, before: string, after: string) => {
    return `[[${before}${PIPE_PLACEHOLDER}${after}]]`;
  });

  let fields: Record<string, Record<string, string>>;
  try {
    const extracted = Extractor.extractObject(tableWithPlaceholders, layout, false);
    if (!extracted) {
      throw new Error("Table extraction returned null");
    }
    fields = extracted;
    console.log('Charts: Extracted fields keys:', Object.keys(fields));
  } catch (error: unknown) {
    console.error('Charts: Error extracting table:', error);
    new Notice('Table malformed');
    throw error;
  }

  // Restore escaped pipes in the extracted data
  const restorePipes = (str: string): string => str.replace(new RegExp(PIPE_PLACEHOLDER, 'g'), '|');
  const restoreInObject = (obj: unknown): unknown => {
    if (typeof obj === 'string') return restorePipes(obj);
    if (Array.isArray(obj)) return obj.map(restoreInObject);
    if (obj && typeof obj === 'object') {
      const restored: Record<string, unknown> = {};
      for (const key of Object.keys(obj as Record<string, unknown>)) {
        const restoredKey = restorePipes(key);
        restored[restoredKey] = restoreInObject((obj as Record<string, unknown>)[key]);
      }
      return restored;
    }
    return obj;
  };
  fields = restoreInObject(fields) as Record<string, Record<string, string>>;

  const firstEntry = Object.values(fields)[0];
  if (!firstEntry) {
    throw new Error("No data found in table");
  }
  let labels = Object.keys(firstEntry);
  console.log('Charts: Extracted labels:', labels);
  
  let dataFields: DataField[] = Object.keys(fields).map((key) => {
    return {
      dataTitle: key,
      data: Object.values(fields[key]) as string[]
    }
  });
  console.log('Charts: Created dataFields:', dataFields.map(f => ({title: f.dataTitle, dataLength: f.data.length})));
  
  // Auto-detect if field keys are dates - transpose for time series
  const fieldKeys = Object.keys(fields);
  const dateLikeKeys = fieldKeys.filter((key: string) => isDateLike(key));
  const majorityAreDates = dateLikeKeys.length > fieldKeys.length / 2;
  
  if (majorityAreDates && fieldKeys.length > 1) {
    console.log('Charts: Date-like field keys detected, transposing for time series');
    // Transpose: dates become labels, current labels become series titles
    const transposedLabels = fieldKeys;
    const transposedFields: DataField[] = labels.map((label: string) => ({
      dataTitle: label,
      data: fieldKeys.map((key: string) => fields[key][label])
    }));
    
    labels = transposedLabels;
    dataFields = transposedFields;
    console.log('Charts: Transposed - labels are now dates:', labels.slice(0, 3), '...', 'series count:', dataFields.length);
  }

  if(selected) {
    console.log('Charts: Filtering by selected fields:', selected);
    dataFields = dataFields.filter(value => selected.includes(value.dataTitle));
  }

  return {labels, dataFields};
}