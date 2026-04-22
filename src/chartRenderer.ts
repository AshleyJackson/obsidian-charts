import { Chart, registerables } from 'chart.js';
import type { ChartConfiguration } from 'chart.js';
import { SankeyController, Flow } from 'chartjs-chart-sankey';
import { CandlestickController, CandlestickElement, OhlcController, OhlcElement } from 'chartjs-chart-financial';
import './date-adapter/chartjs-adapter-moment.esm.js';
import { MarkdownRenderChild, parseYaml, TFile } from 'obsidian';
import type { MarkdownPostProcessorContext } from 'obsidian';
import { generateInnerColors, renderError, preprocessYamlContent } from 'src/util';
import type { ImageOptions } from './constants/settingsConstants';
import type ChartPlugin from 'src/main';
import { generateTableData } from 'src/chartFromTable';
import annotationPlugin from 'chartjs-plugin-annotation';
import type { ChartYaml, DatasetPrepResult, SankeyFlowItem, FileCacheSection, FileCacheBlock, OhlcDataPoint } from './types';

Chart.register(...registerables, annotationPlugin, SankeyController, Flow, CandlestickController, CandlestickElement, OhlcController, OhlcElement);

export default class Renderer {
  plugin: ChartPlugin;

  constructor(plugin: ChartPlugin) {
    this.plugin = plugin;
  }

  async datasetPrep(yaml: ChartYaml, el: HTMLElement, themeColors = false): Promise<DatasetPrepResult> {
    console.log('Charts: Preparing dataset for type:', yaml.type, 'with series count:', yaml.series?.length ?? 0);
    // Datasets are loosely typed because they come from YAML parsing and must be cast
    // to chart.js's strict generic ChartDataset at the ChartConfiguration boundary
    const datasets: Record<string, unknown>[] = [];
    if (!yaml.id) {
      const colors: string[] = [];
      if (this.plugin.settings.themeable || themeColors) {
        let i = 1;
        while (true) {
          const color = getComputedStyle(el).getPropertyValue(`--chart-color-${i}`);
          if (color) {
            colors.push(color);
            i++;
          } else {
            break;
          }
        }
      }
      console.log('Charts: Using colors:', colors.length > 0 ? 'theme colors' : 'default colors');

      const seriesList = yaml.series ?? [];
      for (let i = 0; i < seriesList.length; i++) {
        const { title, ...rest } = seriesList[i];
        // Ensure data values are numbers - YAML parsing can return strings
        // Empty strings become null so spanGaps and Chart.js handle them correctly
        // OHLC data points (objects/arrays) pass through unchanged
        if (rest.data && Array.isArray(rest.data)) {
          rest.data = rest.data.map((v: number | string | null | OhlcDataPoint | [number, number, number, number]) => {
            if (v === null || v === undefined) return null;
            if (typeof v === 'object') return v; // OHLC data points or arrays pass through
            if (typeof v === 'string') {
              const trimmed = v.trim();
              if (trimmed === '') return null;
              const num = parseFloat(trimmed);
              return isNaN(num) ? null : num;
            }
            return v;
          });
        }
        const dataset = {
          label: title ?? "",
          backgroundColor: yaml.labelColors
            ? (colors.length ? generateInnerColors(colors, yaml.transparency) : generateInnerColors(this.plugin.settings.colors, yaml.transparency))
            : (colors.length ? generateInnerColors(colors, yaml.transparency)[i] : generateInnerColors(this.plugin.settings.colors, yaml.transparency)[i]),
          borderColor: yaml.labelColors
            ? (colors.length ? colors : this.plugin.settings.colors)
            : (colors.length ? colors[i] : this.plugin.settings.colors[i]),
          borderWidth: 1,
          fill: yaml.fill ? (yaml.stacked ? (i === 0 ? 'origin' : '-1') : true) : false,
          tension: yaml.tension ?? 0,
          stepped: yaml.stepped,
          ...rest,
        };
        if (yaml.type === 'sankey') {
          if (rest.colorFrom) {
            const seriesColorFrom = seriesList[i].colorFrom as Record<string, string> | undefined;
            (dataset as Record<string, unknown>)['colorFrom'] = (ctx: unknown) => {
              const c = ctx as { dataset: { data: Array<{ from: string }> }; dataIndex: number };
              return seriesColorFrom?.[c.dataset.data[c.dataIndex].from] ?? colors[i] ?? 'green';
            };
          }
          if (rest.colorTo) {
            const seriesColorTo = seriesList[i].colorTo as Record<string, string> | undefined;
            (dataset as Record<string, unknown>)['colorTo'] = (ctx: unknown) => {
              const c = ctx as { dataset: { data: Array<{ to: string }> }; dataIndex: number };
              return seriesColorTo?.[c.dataset.data[c.dataIndex].to] ?? colors[i] ?? 'green';
            };
          }
        }
        datasets.push(dataset);
      }
    }

    const time = yaml.time ? { type: 'time' as const, time: { unit: yaml.time } } : undefined;

    const labels = yaml.labels;

    const gridColor = getComputedStyle(el).getPropertyValue('--background-modifier-border');

    let chartOptions: ChartConfiguration;

    Chart.defaults.color = yaml.textColor || getComputedStyle(el).getPropertyValue('--text-muted');
    Chart.defaults.font.family = getComputedStyle(el).getPropertyValue('--mermaid-font');
    Chart.defaults.plugins = {
      ...Chart.defaults.plugins,
      legend: {
        ...Chart.defaults.plugins.legend,
        display: yaml.legend ?? true,
        position: yaml.legendPosition ?? "top",
      },
    };
    Chart.defaults.layout.padding = yaml.padding;

    if (yaml.type === 'radar' || yaml.type === 'polarArea') {
      console.log('Charts: Configuring radar/polarArea chart');
      chartOptions = {
        type: yaml.type,
        data: {
          labels,
          datasets,
        },
        options: {
          animation: {
            duration: 0,
          },
          scales: {
            r: {
              ...time,
              grid: { color: gridColor },
              beginAtZero: yaml.beginAtZero,
              max: yaml.rMax,
              min: yaml.rMin,
              ticks: {
                backdropColor: gridColor,
              },
            },
          },
        },
      } as unknown as ChartConfiguration;
    } else if (yaml.type === 'bar' || yaml.type === 'line') {
      console.log('Charts: Configuring bar/line chart');
      chartOptions = {
        type: yaml.type,
        data: {
          labels,
          datasets,
        },
        options: {
          animation: {
            duration: 0,
          },
          indexAxis: yaml.indexAxis,
          spanGaps: yaml.spanGaps,
          scales: {
            y: {
              min: yaml.yMin,
              max: yaml.yMax,
              reverse: yaml.yReverse,
              ticks: {
                display: yaml.yTickDisplay,
                padding: yaml.yTickPadding,
              },
              display: yaml.yDisplay,
              stacked: yaml.stacked,
              beginAtZero: yaml.beginAtZero,
              grid: { color: gridColor },
              title: {
                display: !!yaml.yTitle,
                text: yaml.yTitle ?? '',
              },
            },
            x: {
              ...time,
              min: yaml.xMin,
              max: yaml.xMax,
              reverse: yaml.xReverse,
              ticks: {
                display: yaml.xTickDisplay,
                padding: yaml.xTickPadding,
              },
              display: yaml.xDisplay,
              stacked: yaml.stacked,
              grid: { color: gridColor },
              title: {
                display: !!yaml.xTitle,
                text: yaml.xTitle ?? '',
              },
            },
          },
        },
      } as unknown as ChartConfiguration;
    } else if (yaml.type === 'sankey') {
      console.log('Charts: Configuring sankey chart');
      const sankeyDatasets = datasets.map(dataset => {
        return {
          ...dataset,
          data: (dataset.data as Array<number | string | SankeyFlowItem | [string | number, number, string | number]>).map(item =>
            Array.isArray(item) && item.length === 3
              ? { from: item[0], flow: item[1], to: item[2] }
              : item
          ),
        };
      });

      chartOptions = {
        type: yaml.type,
        data: {
          labels,
          datasets: sankeyDatasets,
        },
        options: {
          animation: {
            duration: 0,
          },
        },
      } as unknown as ChartConfiguration;
    } else if (yaml.type === 'candlestick' || yaml.type === 'ohlc') {
      console.log('Charts: Configuring financial chart for type:', yaml.type);
      // Financial charts use {o, h, l, c} data points
      const financialDatasets = datasets.map(dataset => {
        return {
          ...dataset,
          data: (dataset.data as Array<unknown>).map(item => {
            if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
              return item;
            }
            // If data is an array [open, high, low, close], convert to object
            if (Array.isArray(item) && item.length >= 4) {
              return { o: item[0], h: item[1], l: item[2], c: item[3] };
            }
            return item;
          }),
        };
      });

      chartOptions = {
        type: yaml.type,
        data: {
          labels,
          datasets: financialDatasets,
        },
        options: {
          animation: {
            duration: 0,
          },
          scales: {
            x: {
              type: 'category',
            },
            y: {
              min: yaml.yMin,
              max: yaml.yMax,
            },
          },
        },
      } as unknown as ChartConfiguration;
    } else {
      console.log('Charts: Configuring pie/doughnut/bubble/scatter chart for type:', yaml.type);
      chartOptions = {
        type: yaml.type,
        data: {
          labels,
          datasets,
        },
        options: {
          animation: {
            duration: 0,
          },
          spanGaps: yaml.spanGaps,
        },
      } as unknown as ChartConfiguration;
    }
    console.log('Charts: Dataset prep complete, returning options');
    return { chartOptions, width: yaml.width?.toString() };
  }

  async imageRenderer(yaml: string, options: ImageOptions): Promise<string> {
    console.log('Charts: Starting image renderer for format:', options.format, 'quality:', options.quality);
    const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));
    const destination = document.createElement('canvas');
    const destinationContext = destination.getContext("2d")!;

    const parsedYaml = await parseYaml(preprocessYamlContent(yaml, true)) as ChartYaml;
    const chartOptions = await this.datasetPrep(parsedYaml, document.body);
    console.log('Charts: Prepared options for image');

    let width = 600;
    if (parsedYaml.width) {
      if (typeof parsedYaml.width === 'string' && parsedYaml.width.endsWith('px')) {
        width = parseInt(parsedYaml.width);
      } else if (typeof parsedYaml.width === 'number') {
        width = parsedYaml.width;
      } else if (typeof parsedYaml.width === 'string' && !parsedYaml.width.endsWith('%')) {
        width = parseInt(parsedYaml.width);
      }
    }
    const height = Math.round(width / 2);

    destination.width = width;
    destination.height = height;
    console.log('Charts: Canvas dimensions set to', width, 'x', height);

    const chart = new Chart(destinationContext, chartOptions.chartOptions);

    document.body.append(destination);
    await delay(250);
    const dataurl = destination.toDataURL(options.format, options.quality);
    document.body.removeChild(destination);
    console.log('Charts: Image data URL generated, length:', dataurl.length);

    return dataurl.substring(dataurl.indexOf(',') + 1);
  }

  renderRaw(data: DatasetPrepResult | ChartConfiguration, el: HTMLElement): Chart | null {
    console.log('Charts: Starting raw render with data type:', typeof data, 'chartOptions present:', !!(data as DatasetPrepResult).chartOptions);
    const destination = el.createEl('canvas');

    const hasPreppedOptions = 'chartOptions' in data;
    const config = hasPreppedOptions ? (data as DatasetPrepResult).chartOptions : data as ChartConfiguration;
    const width = hasPreppedOptions ? (data as DatasetPrepResult).width : undefined;

    try {
      const chart = new Chart(destination.getContext("2d")!, config);
      const parent = destination.parentElement;
      if (parent) {
        parent.style.width = width ?? "100%";
        parent.style.margin = "auto";
      }
      console.log('Charts: Raw chart rendered successfully');
      return chart;
    } catch (error: unknown) {
      console.error('Charts: Chart failed to load. Error:', error);
      renderError(error, el);
      return null;
    }
  }

  async renderFromYaml(yaml: ChartYaml, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
    this.plugin.app.workspace.onLayoutReady(() => ctx.addChild(new ChartRenderChild(yaml, el, this, ctx.sourcePath)));
  }
}

export class ChartRenderChild extends MarkdownRenderChild {
  data: ChartYaml;
  chart: Chart | null = null;
  renderer: Renderer;
  ownPath: string;
  el: HTMLElement;
  private reloadTimer: ReturnType<typeof setTimeout> | null = null;
  private boundHandleChange: (file: unknown) => void;
  private boundHandleReload: () => void;

  constructor(data: ChartYaml, el: HTMLElement, renderer: Renderer, ownPath: string) {
    super(el);
    this.el = el;
    this.data = data;
    this.renderer = renderer;
    this.ownPath = ownPath;
    this.boundHandleChange = ((file: unknown) => this.handleChange(file as TFile)) as (file: unknown) => void;
    this.boundHandleReload = this.debouncedReload.bind(this);
  }

  async onload() {
    console.log('Charts: Loading chart render child for data:', this.data);
    try {
      const preparedData = await this.renderer.datasetPrep(this.data, this.el);
      console.log('Charts: Prepared dataset:', preparedData);
      const chartData: { labels: string[]; datasets: Record<string, unknown>[] } = {
        labels: (preparedData.chartOptions.data.labels ?? []) as string[],
        datasets: [],
      };
      if (this.data.id) {
        console.log('Charts: Processing linked chart with id:', this.data.id);
        const colors: string[] = [];
        if (this.renderer.plugin.settings.themeable) {
          let i = 1;
          while (true) {
            const color = getComputedStyle(this.el).getPropertyValue(`--chart-color-${i}`);
            if (color) {
              colors.push(color);
              i++;
            } else {
              break;
            }
          }
        }
        let linkDest: TFile | undefined;
        if (this.data.file) {
          const activeFilePath = this.renderer.plugin.app.workspace.getActiveFile()?.path ?? '';
          linkDest = this.renderer.plugin.app.metadataCache.getFirstLinkpathDest(this.data.file, activeFilePath) ?? undefined;
        }
        const currentFile = linkDest ?? (this.renderer.plugin.app.vault.getAbstractFileByPath(this.ownPath) as TFile | undefined);
        if (!currentFile) {
          throw new Error("File not found");
        }
        const fileCache = this.renderer.plugin.app.metadataCache.getFileCache(currentFile);
        if (!fileCache) {
          throw new Error("Cache not found");
        }
        const sections = (fileCache.sections as FileCacheSection[] | undefined) ?? [];
        const blocks = (fileCache.blocks as Record<string, FileCacheBlock> | undefined) ?? {};
        const blockId = this.data.id.startsWith('^') ? this.data.id.slice(1) : this.data.id;
        // Try sections first (where section.id is populated), then fall back to blocks record
        let pos = sections.find(section => section.id === blockId)?.position;
        if (!pos) {
          const block = blocks[blockId];
          if (block) {
            // blocks record points to the block ID line itself;
            // find the containing section (typically the table) that encompasses it
            const blockStart = block.position.start.offset;
            const containingSection = sections.find(section =>
              section.position.start.offset <= blockStart && section.position.end.offset >= blockStart
            );
            if (containingSection) {
              pos = containingSection.position;
            } else {
              // Fallback: use the block's own position (may include just the ^id line)
              pos = block.position;
            }
          }
        }
        if (!pos) {
          throw new Error("Invalid id and/or file");
        }

        const fileContent = await this.renderer.plugin.app.vault.cachedRead(currentFile);
        const tableString = fileContent.substring(pos.start.offset, pos.end.offset);
        console.log('Charts: Extracted table string length:', tableString.length);
        let tableData: { labels: string[]; dataFields: Array<{ dataTitle: string; data: string[] }> };
        try {
          tableData = generateTableData(tableString, this.data.layout ?? 'columns', this.data.select);
          console.log('Charts: Generated table data:', tableData);
        } catch (error: unknown) {
          console.error('Charts: Error generating table data:', error);
          throw new Error("There is no table at that id and/or file");
        }
        chartData.labels = tableData.labels;
        for (let i = 0; i < tableData.dataFields.length; i++) {
          // Convert string data to numbers; empty cells become null for proper spanGaps support
          const numericData = tableData.dataFields[i].data.map((v: string) => {
            const trimmed = v.trim();
            if (trimmed === '') return null;
            const num = parseFloat(trimmed);
            return isNaN(num) ? null : num;
          });
          chartData.datasets.push({
            label: tableData.dataFields[i].dataTitle ?? "",
            data: numericData,
            backgroundColor: this.data.labelColors
              ? (colors.length ? generateInnerColors(colors, this.data.transparency) : generateInnerColors(this.renderer.plugin.settings.colors, this.data.transparency))
              : (colors.length ? generateInnerColors(colors, this.data.transparency)[i] : generateInnerColors(this.renderer.plugin.settings.colors, this.data.transparency)[i]),
            borderColor: this.data.labelColors
              ? (colors.length ? colors : this.renderer.plugin.settings.colors)
              : (colors.length ? colors[i] : this.renderer.plugin.settings.colors[i]),
            borderWidth: 1,
            fill: this.data.fill ? (this.data.stacked ? (i === 0 ? 'origin' : '-1') : true) : false,
            tension: this.data.tension ?? 0,
            stepped: this.data.stepped,
          });
        }
        preparedData.chartOptions.data = chartData as unknown as typeof preparedData.chartOptions.data;
        console.log('Charts: Updated chart options with table data');
      }
      this.chart = this.renderer.renderRaw(preparedData, this.el);
      console.log('Charts: Rendered chart successfully');
    } catch (error: unknown) {
      console.error('Charts: Error in onload:', error);
      renderError(error, this.el);
    }
    if (this.data.id) {
      console.log('Charts: Registering change handler for linked chart');
      this.renderer.plugin.app.metadataCache.on("changed", (file: unknown) => this.handleChange(file as TFile));
    }
    this.renderer.plugin.app.workspace.on('css-change', this.boundHandleReload);
    console.log('Charts: Registered event listeners');
  }

  private handleChange(file: TFile) {
    console.log('Charts: Metadata changed for file:', file.path);
    if (this.data.file ? file.basename === this.data.file : file.path === this.ownPath) {
      console.log('Charts: Scheduling reload due to relevant file change');
      this.debouncedReload();
    }
  }

  private debouncedReload() {
    if (this.reloadTimer) {
      clearTimeout(this.reloadTimer);
    }
    this.reloadTimer = setTimeout(() => {
      this.reloadTimer = null;
      this.handleReload();
    }, 500);
  }

  private handleReload() {
    console.log('Charts: Reloading chart');
    this.onunload();
    this.onload();
  }

  onunload() {
    console.log('Charts: Unloading chart render child');
    if (this.reloadTimer) {
      clearTimeout(this.reloadTimer);
      this.reloadTimer = null;
    }
    this.renderer.plugin.app.metadataCache.off("changed", this.boundHandleChange);
    this.renderer.plugin.app.workspace.off('css-change', this.boundHandleReload);
    this.el.empty();
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }
}
