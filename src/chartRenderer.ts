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
        datasets.push(dataset);
      }
    }

    const time = yaml.time ? { type: 'time' as const, time: { unit: yaml.time } } : undefined;

    const labels = yaml.labels;

    const bgPrimaryEl = getComputedStyle(document.body).getPropertyValue('--background-primary').trim();
    const isDarkMode = bgPrimaryEl?.startsWith('#000') || 
                       (bgPrimaryEl && bgPrimaryEl.length > 3 && parseInt(bgPrimaryEl.slice(1, 3), 16) < 50);
    
    const gridColor = getComputedStyle(document.body).getPropertyValue('--background-modifier-border').trim() || 
                      (isDarkMode ? '#444444' : 'rgba(0,0,0,0.1)');
    
    const textColorVar = getComputedStyle(document.body).getPropertyValue('--text-normal').trim() || 
                         getComputedStyle(document.body).getPropertyValue('--text-muted').trim();

    console.log('Charts: isDarkMode:', isDarkMode, 'background-primary:', bgPrimaryEl, 'text-normal:', textColorVar);

    let chartOptions: ChartConfiguration;

    const finalTextColor = yaml.textColor || (isDarkMode ? '#ffffff' : textColorVar);
    Chart.defaults.color = finalTextColor;
    
    const fontFamily = getComputedStyle(document.body).getPropertyValue('--mermaid-font').trim();
    Chart.defaults.font.family = fontFamily || 'sans-serif';
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
                backdropColor: isDarkMode ? '#1e1e1e' : 'rgba(255,255,255,0.75)',
              },
            },
          },
        },
      } as unknown as ChartConfiguration;
    } else if (yaml.type === 'bar' || yaml.type === 'line') {
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
    return { chartOptions, width: yaml.width?.toString() };
  }

  async imageRenderer(yaml: string, options: ImageOptions): Promise<string> {
    const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));
    const destination = document.createElement('canvas');
    const destinationContext = destination.getContext("2d")!;

    const parsedYaml = await parseYaml(preprocessYamlContent(yaml, true)) as ChartYaml;
    const chartOptions = await this.datasetPrep(parsedYaml, document.body);

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

    const chart = new Chart(destinationContext, chartOptions.chartOptions);

    document.body.append(destination);
    await delay(250);
    const dataurl = destination.toDataURL(options.format, options.quality);
    document.body.removeChild(destination);

    return dataurl.substring(dataurl.indexOf(',') + 1);
  }

  async renderRaw(data: DatasetPrepResult | ChartConfiguration, el: HTMLElement): Promise<Chart> {
    try {
      // Determine configuration and width from data source
      const hasPreppedOptions = 'chartOptions' in data;
      let config: ChartConfiguration;
      let width: string | undefined;
      
      if (hasPreppedOptions) {
        const preparedData = data as DatasetPrepResult;
        // Extract config and width from prepped data or use chart options
        config = preparedData.chartOptions || data as ChartConfiguration;
        // Try to get width from yaml, falling back to chart option, then default
        if (preparedData.width) {
          const parsedWidth = typeof preparedData.width === 'string' ? 
            preparedData.width.toString() : String(preparedData.width);
          width = config.options?.width as string | number ? String(config.options!.width!) : parsedWidth || "600";
        } else if (config.options?.width) {
          width = typeof config.options.width === 'number' ? String(config.options.width) : 
            (typeof config.options.width === 'string' ? config.options.width : "600");
        }
      }

      const destination = el.createEl('canvas');
      const chart = new Chart(destination.getContext("2d")!, config);
      if (width) {
        destination.style.width = width;
        destination.style.margin = "auto";
      }
      return Promise.resolve(chart as Chart);
    } catch (error: unknown) {
      console.error('Charts: Chart failed to load. Error:', error);
      renderError(error, el);
      return Promise.reject(error as Error);
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
  reloadTimer: ReturnType<typeof setTimeout> | null = null;
  boundHandleChange = ((file: unknown) => this.handleChange(file as TFile)) as (file: unknown) => void;
  boundHandleReload = this.debouncedReload.bind(this);

  constructor(data: ChartYaml, el: HTMLElement, renderer: Renderer, ownPath: string) {
    super(el);
    this.el = el;
    this.data = data;
    this.renderer = renderer;
    this.ownPath = ownPath;
  }

  async onload() {
    try {
      const preparedData = await this.renderer.datasetPrep(this.data, this.el);
      const chartData: { labels: string[]; datasets: Record<string, unknown>[] } = {
        labels: (preparedData.chartOptions.data.labels ?? []) as string[],
        datasets: [],
      };
      if (this.data.id) {
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
        } catch (error: unknown) {
          throw new Error("There is no table at that id and/or file");
        }
        chartData.labels = tableData.labels;
        for (let i = 0; i < tableData.dataFields.length; i++) {
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
      }
      this.chart = this.renderer.renderRaw(preparedData, this.el);
    } catch (error: unknown) {
      renderError(error, this.el);
    }
    if (this.data.id) {
      this.renderer.plugin.app.metadataCache.on("changed", (file: unknown) => this.handleChange(file as TFile));
    }
    this.renderer.plugin.app.workspace.on('css-change', this.boundHandleReload);
  }

  private handleChange(file: TFile) {
    if (this.data.file ? file.basename === this.data.file : file.path === this.ownPath) {
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
    this.onunload();
    this.onload();
  }

  onunload() {
    if (this.reloadTimer) {
      clearTimeout(this.reloadTimer);
      this.reloadTimer = null;
    }
    this.renderer.plugin.app.metadataCache.off("changed", this.boundHandleChange);
    this.renderer.plugin.app.workspace.off('css-change', this.boundHandleReload);
    this.el.empty();
    if (this.chart && typeof this.chart.destroy === 'function') {
      this.chart.destroy();
    }
    this.chart = null;
  }
}
