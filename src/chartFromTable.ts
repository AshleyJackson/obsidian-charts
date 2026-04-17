import { Editor, Notice } from 'obsidian';
import { Extractor } from "markdown-tables-to-json";
import type { DataField } from 'src/constants/settingsConstants';

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

export function generateTableData(table: string, layout: 'columns' | 'rows', selected?: string[]) {
  console.log('Charts: Generating table data with layout:', layout, 'table length:', table.length);
  let fields: any;
  try {
    fields = Extractor.extractObject(table, layout, false);
    console.log('Charts: Extracted fields keys:', Object.keys(fields));
  } catch (error) {
    console.error('Charts: Error extracting table:', error);
    new Notice('Table malformed')
    throw error;
  }
  const labels = Object.keys(Object.values(fields)[0]);
  console.log('Charts: Extracted labels:', labels);
  let dataFields: DataField[] = Object.keys(fields).map((key) => {
    return {
      dataTitle: key,
      data: Object.values(fields[key]) as string[]
    }
  });
  console.log('Charts: Created dataFields:', dataFields.map(f => ({title: f.dataTitle, dataLength: f.data.length})));

  if(selected) {
    console.log('Charts: Filtering by selected fields:', selected);
    dataFields = dataFields.filter(value => selected.contains(value.dataTitle));
  }

  return {labels, dataFields};
}