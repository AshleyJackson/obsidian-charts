import { Chart, ChartConfiguration, SankeyControllerDatasetOptions, registerables } from 'chart.js';
import { SankeyController, Flow } from 'chartjs-chart-sankey';
import './date-adapter/chartjs-adapter-moment.esm.js';
import { MarkdownPostProcessorContext, MarkdownRenderChild, parseYaml, TFile } from 'obsidian';
import { generateInnerColors, renderError } from 'src/util';
import type { ImageOptions } from './constants/settingsConstants';
import type ChartPlugin from 'src/main';
import { generateTableData } from 'src/chartFromTable';
import annotationPlugin from 'chartjs-plugin-annotation'

Chart.register(...registerables, annotationPlugin, SankeyController, Flow);

export default class Renderer {
    plugin: ChartPlugin;

    constructor(plugin: ChartPlugin) {
        this.plugin = plugin;
    }

  async datasetPrep(yaml: any, el: HTMLElement, themeColors = false): Promise<{ chartOptions: ChartConfiguration; width: string; }> {
    console.log('Charts: Preparing dataset for type:', yaml.type, 'with series count:', yaml.series?.length || 0);
    let datasets: any[] = [];
    if (!yaml.id) {
      const colors: string[] = [];
      if (this.plugin.settings.themeable || themeColors) {
        let i = 1;
        while (true) {
          let color = getComputedStyle(el).getPropertyValue(`--chart-color-${i}`);
          if (color) {
            colors.push(color);
            i++;
          } else {
            break;
          }
        }
      }
      console.log('Charts: Using colors:', colors.length > 0 ? 'theme colors' : 'default colors');
      for (let i = 0; yaml.series.length > i; i++) {
        const {title, ...rest} = yaml.series[i];
        const dataset = {
          label: title ?? "",
          backgroundColor: yaml.labelColors ? colors.length ? generateInnerColors(colors, yaml.transparency) : generateInnerColors(this.plugin.settings.colors, yaml.transparency) : colors.length ? generateInnerColors(colors, yaml.transparency)[i] : generateInnerColors(this.plugin.settings.colors, yaml.transparency)[i],
          borderColor: yaml.labelColors ? colors.length ? colors : this.plugin.settings.colors : colors.length ? colors[i] : this.plugin.settings.colors[i],
          borderWidth: 1,
          fill: yaml.fill ? yaml.stacked ? i == 0 ? 'origin' : '-1' : true : false, //See https://github.com/phibr0/obsidian-charts/issues/53#issuecomment-1084869550
          tension: yaml.tension ?? 0,
          stepped: yaml.stepped,
          ...rest,
        };
        if (yaml.type === 'sankey') {
          // colorFrom, colorTo is accepted as object in yaml, but should be function for sankey.
          if (dataset.colorFrom)
            (dataset as SankeyControllerDatasetOptions).colorFrom = (c: any) => yaml.series[i].colorFrom?.[c.dataset.data[c.dataIndex].from] ?? colors[i] ?? 'green'
            
          if (dataset.colorTo)
            (dataset as SankeyControllerDatasetOptions).colorTo = (c: any) => yaml.series[i].colorTo?.[c.dataset.data[c.dataIndex].to] ?? colors[i] ?? 'green'
            
        }
        datasets.push(dataset);
      }
    }

    let time = yaml.time ? { type: 'time', time: { unit: yaml.time } } : null

    let labels = yaml.labels;

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

    if (yaml.type == 'radar' || yaml.type == 'polarArea') {
      console.log('Charts: Configuring radar/polarArea chart');
      (chartOptions as ChartConfiguration<"polarArea" | "radar">) = {
        type: yaml.type,
        data: {
          labels,
          datasets
        },
        options: {
          animation: {
            duration: 0
          },
          scales: {
            //@ts-ignore
            r: {
              ...time,
              grid: { color: gridColor },
              beginAtZero: yaml.beginAtZero,
              max: yaml.rMax,
              min: yaml.rMin,
              ticks: {
                backdropColor: gridColor
              }
            },
          },
        }
      };
    } else if (yaml.type == 'bar' || yaml.type == 'line') {
      console.log('Charts: Configuring bar/line chart');
      (chartOptions as ChartConfiguration<"bar" | "line">) = {
        type: yaml.type,
        data: {
          labels,
          datasets
        },
        options: {
          animation: {
            duration: 0
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
                padding: yaml.yTickPadding
              },
              display: yaml.yDisplay,
              stacked: yaml.stacked,
              beginAtZero: yaml.beginAtZero,
              grid: { color: gridColor },
              title: {
                display: yaml.yTitle,
                text: yaml.yTitle
              }
            },
            //@ts-ignore
            x: {
              ...time,
              min: yaml.xMin,
              max: yaml.xMax,
              reverse: yaml.xReverse,
              ticks: {
                display: yaml.xTickDisplay,
                padding: yaml.xTickPadding
              },
              display: yaml.xDisplay,
              stacked: yaml.stacked,
              grid: { color: gridColor },
              title: {
                display: yaml.xTitle,
                text: yaml.xTitle
              }
            }
          },
        }
      };
    } else if (yaml.type === 'sankey') {
      console.log('Charts: Configuring sankey chart');
      datasets = datasets.map(dataset => {
        return {
          ...dataset,
          data: dataset.data.map((item: object | any[]) => 
            Array.isArray(item) && item.length === 3 ?
            {
              from: item[0],
              flow: item[1],
              to: item[2],
            } : item
          )
        }
      }) as ChartConfiguration<'sankey'>['data']['datasets'];
      
      (chartOptions as ChartConfiguration<'sankey'>) = {
        type: yaml.type,
        data: {
          labels,
          datasets,
        },
        options: {
          animation: {
            duration: 0
          },
        }
      }
    }else {
      console.log('Charts: Configuring pie/doughnut/bubble/scatter chart for type:', yaml.type);
      (chartOptions as ChartConfiguration<"pie" | "doughnut" | "bubble" | "scatter">) = {
        type: yaml.type,
        data: {
          labels,
          datasets
        },
        options: {
          animation: {
            duration: 0
          },
          //@ts-ignore
          spanGaps: yaml.spanGaps,
        }
      };
    }
    console.log('Charts: Dataset prep complete, returning options');
    return { chartOptions, width: yaml.width };
  }

    /**
     * @param yaml the copied codeblock
     * @returns base64 encoded image in png format
     */
  async imageRenderer(yaml: string, options: ImageOptions): Promise<string> {
    console.log('Charts: Starting image renderer for format:', options.format, 'quality:', options.quality);
    const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));
    const destination = document.createElement('canvas');
    const destinationContext = destination.getContext("2d")!;

    const parsedYaml = await parseYaml(yaml.replace("```chart", "").replace("```", "").replace(/\t/g, '    '));
    const chartOptions = await this.datasetPrep(parsedYaml, document.body);
    console.log('Charts: Prepared options for image');

    // Set canvas dimensions - use width from YAML or default to 600px
    // Width can be percentage or pixels, for image we need pixels
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
    // Default aspect ratio for charts (width:height = 2:1)
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

  renderRaw(data: any, el: HTMLElement): Chart | null {
    console.log('Charts: Starting raw render with data type:', typeof data, 'chartOptions present:', !!data.chartOptions);
    const destination = el.createEl('canvas');

    if (data.chartOptions) {
      try {
        let chart = new Chart(destination.getContext("2d")!, data.chartOptions);
        destination.parentElement!.style.width = data.width ?? "100%";
        destination.parentElement!.style.margin = "auto";
        console.log('Charts: Raw chart rendered successfully with options');
        return chart;
      } catch (error) {
        console.error('Charts: Chart failed to load with options. Data:', data, 'Error:', error);
        renderError(error, el);
        return null;
      }
    } else {
      try {
        let chart = new Chart(destination.getContext("2d")!, data);
        console.log('Charts: Raw chart rendered successfully with raw data');
        return chart;
      } catch (error) {
        console.error('Charts: Chart failed to load with raw data. Data:', data, 'Error:', error);
        renderError(error, el);
        return null;
      }
    }
  }

    async renderFromYaml(yaml: any, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
        this.plugin.app.workspace.onLayoutReady(() => ctx.addChild(new ChartRenderChild(yaml, el, this, ctx.sourcePath)));
    }
}

class ChartRenderChild extends MarkdownRenderChild {
    data: any;
    chart: Chart | null = null;
    renderer: Renderer;
    ownPath: string;
    el: HTMLElement;

    constructor(data: any, el: HTMLElement, renderer: Renderer, ownPath: string) {
        super(el);
        this.el = el;
        this.data = data;
        this.renderer = renderer;
        this.ownPath = ownPath;
    }

  async onload() {
    console.log('Charts: Loading chart render child for data:', this.data);
    try {
      const preparedData = await this.renderer.datasetPrep(this.data, this.el);
      console.log('Charts: Prepared dataset:', preparedData);
      let chartData: any = { ...preparedData.chartOptions.data };
      if (this.data.id) {
        console.log('Charts: Processing linked chart with id:', this.data.id);
        const colors: string[] = [];
        if (this.renderer.plugin.settings.themeable) {
          let i = 1;
          while (true) {
            let color = getComputedStyle(this.el).getPropertyValue(`--chart-color-${i}`);
            if (color) {
              colors.push(color);
              i++;
            } else {
              break;
            }
          }
        }
        chartData.datasets = [];
        let linkDest: TFile | undefined;
        if (this.data.file) {
          linkDest = this.renderer.plugin.app.metadataCache.getFirstLinkpathDest(this.data.file, this.renderer.plugin.app.workspace.getActiveFile()?.path);
        }
        const currentFile = linkDest ?? (this.renderer.plugin.app.vault.getAbstractFileByPath(this.ownPath) as TFile | undefined);
        if (!currentFile) {
          throw new Error("File not found");
        }
        const fileCache = this.renderer.plugin.app.metadataCache.getFileCache(currentFile);
        if (!fileCache) {
          throw new Error("Cache not found");
        }
        // Strip leading ^ from block ID if present (used in link syntax but not stored in cache)
        const blockId = this.data.id.startsWith('^') ? this.data.id.slice(1) : this.data.id;
        const pos = fileCache.sections?.find((pre: any) => pre.id === blockId)?.position;
        if (!pos) {
          throw new Error("Invalid id and/or file");
        }

        const fileContent = await this.renderer.plugin.app.vault.cachedRead(currentFile);
        const tableString = fileContent.substring(pos.start.offset, pos.end.offset);
        console.log('Charts: Extracted table string length:', tableString.length);
        let tableData: any;
        try {
          tableData = generateTableData(tableString, this.data.layout ?? 'columns', this.data.select);
          console.log('Charts: Generated table data:', tableData);
        } catch (error) {
          console.error('Charts: Error generating table data:', error);
          throw new Error("There is no table at that id and/or file");
        }
        chartData.labels = tableData.labels;
        for (let i = 0; tableData.dataFields.length > i; i++) {
          chartData.datasets.push({
            label: tableData.dataFields[i].dataTitle ?? "",
            data: tableData.dataFields[i].data,
            backgroundColor: this.data.labelColors ? colors.length ? generateInnerColors(colors, this.data.transparency) : generateInnerColors(this.renderer.plugin.settings.colors, this.data.transparency) : colors.length ? generateInnerColors(colors, this.data.transparency)[i] : generateInnerColors(this.renderer.plugin.settings.colors, this.data.transparency)[i],
            borderColor: this.data.labelColors ? colors.length ? colors : this.renderer.plugin.settings.colors : colors.length ? colors[i] : this.renderer.plugin.settings.colors[i],
            borderWidth: 1,
            fill: this.data.fill ? this.data.stacked ? i == 0 ? 'origin' : '-1' : true : false,
            tension: this.data.tension ?? 0,
            stepped: this.data.stepped,
          });
        }
        preparedData.chartOptions.data = chartData;
        console.log('Charts: Updated chart options with table data');
      }
      this.chart = this.renderer.renderRaw(preparedData, this.el);
      console.log('Charts: Rendered chart successfully');
    } catch (error: any) {
      console.error('Charts: Error in onload:', error);
      renderError(error, this.el);
    }
    if (this.data.id) {
      console.log('Charts: Registering change handler for linked chart');
      this.renderer.plugin.app.metadataCache.on("changed", this.handleChange.bind(this));
    }
    this.renderer.plugin.app.workspace.on('css-change', this.handleReload.bind(this));
    console.log('Charts: Registered event listeners');
  }

  private handleChange(file: TFile) {
    console.log('Charts: Metadata changed for file:', file.path);
    if (this.data.file ? file.basename === this.data.file : file.path === this.ownPath) {
      console.log('Charts: Reloading due to relevant file change');
      this.reload();
    }
  }

  private handleReload() {
    console.log('Charts: Reloading chart');
    this.onunload();
    this.onload();
  }

  private reload() {
    this.handleReload();
  }

  onunload() {
    console.log('Charts: Unloading chart render child');
    this.renderer.plugin.app.metadataCache.off("changed", this.handleChange.bind(this));
    this.renderer.plugin.app.workspace.off('css-change', this.handleReload.bind(this));
    this.el.empty();
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }
}