declare module 'markdown-tables-to-json' {
  export class Extractor {
    static extractObject(table: string, layout: string, headers: boolean): Record<string, Record<string, string>> | null;
  }
}

/** Parsed YAML structure for chart code blocks */
export interface ChartYaml {
  type: string;
  labels?: string[];
  series?: ChartSeries[];
  id?: string;
  file?: string;
  layout?: 'rows' | 'columns';
  select?: string[];
  width?: string | number;
  fill?: boolean;
  stacked?: boolean;
  tension?: number;
  stepped?: boolean | 'before' | 'after' | 'middle';
  beginAtZero?: boolean;
  legend?: boolean;
  legendPosition?: 'top' | 'left' | 'bottom' | 'right';
  labelColors?: boolean;
  transparency?: number;
  padding?: number;
  textColor?: string;
  spanGaps?: boolean;
  indexAxis?: 'x' | 'y';
  time?: string;
  rMax?: number;
  rMin?: number;
  yMin?: number;
  yMax?: number;
  xMin?: number;
  xMax?: number;
  yReverse?: boolean;
  xReverse?: boolean;
  yDisplay?: boolean;
  xDisplay?: boolean;
  yTickDisplay?: boolean;
  xTickDisplay?: boolean;
  yTickPadding?: number;
  xTickPadding?: number;
  yTitle?: string;
  xTitle?: string;
  bestFit?: boolean;
  bestFitNumber?: number;
  bestFitTitle?: string;
}

/** Single series entry in chart YAML */
export interface ChartSeries {
  title?: string;
  data: (number | string | null)[];
  colorFrom?: Record<string, string>;
  colorTo?: Record<string, string>;
  priority?: Record<string, number>;
  [key: string]: unknown;
}

/** Structure returned by datasetPrep */
export interface DatasetPrepResult {
  chartOptions: import('chart.js').ChartConfiguration;
  width: string | undefined;
}

/** Sankey flow data item */
export interface SankeyFlowItem {
  from: string | number;
  flow: number;
  to: string | number;
}

/** File cache section from Obsidian metadata */
export interface FileCacheSection {
  id?: string;
  type?: string;
  position: {
    start: { offset: number };
    end: { offset: number };
  };
}

/** File cache block entry from Obsidian metadata */
export interface FileCacheBlock {
  id: string;
  position: {
    start: { offset: number };
    end: { offset: number };
  };
}

/** File cache from Obsidian metadata */
export interface FileCache {
  sections?: FileCacheSection[];
  blocks?: Record<string, FileCacheBlock>;
}

/** Chart dataset for table-linked charts and standard charts */
export interface ChartDataset {
  label: string;
  data: (number | string | null)[];
  backgroundColor: string | string[];
  borderColor: string | string[];
  borderWidth: number;
  fill: boolean | 'origin' | '-1';
  tension: number;
  stepped?: boolean | 'before' | 'after' | 'middle';
  [key: string]: unknown;
}