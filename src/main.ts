import {
  MarkdownView,
  Plugin,
  parseYaml,
  Menu,
  Editor,
  View,
  Notice,
} from 'obsidian';
import type { MarkdownPostProcessorContext, MarkdownFileInfo } from 'obsidian';

import Renderer from './chartRenderer';
import type { ChartPluginSettings } from './constants/settingsConstants';
import { DEFAULT_SETTINGS } from './constants/settingsConstants';
import { ChartSettingTab } from './ui/settingsTab';
import { CreationHelperModal } from './ui/creationHelperModal';
import { addIcons } from 'src/ui/icons';
import { chartFromTable } from 'src/chartFromTable';
import { renderError, saveImageToVaultAndPaste, preprocessYamlContent } from 'src/util';
import type { ChartYaml, DatasetPrepResult } from './types';
import type { ChartConfiguration } from 'chart.js';
import type { Chart } from 'chart.js';

export default class ChartPlugin extends Plugin {
  settings!: ChartPluginSettings;
  renderer!: Renderer;

  postprocessor = async (
    content: string,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext
  ) => {
    console.log('Charts: Processing chart code block, content length:', content.length);
    let data: ChartYaml;
    try {
      data = await parseYaml(preprocessYamlContent(content)) as ChartYaml;
      console.log('Charts: Parsed YAML data:', data.type, 'labels length:', data.labels?.length, 'series count:', data.series?.length);
    } catch (error: unknown) {
      console.error('Charts: YAML parse error:', error);
      renderError(error, el);
      return;
    }
    if (!data.id) {
      if (!data || !data.type || !data.labels || !data.series) {
        console.error('Charts: Missing required fields in data:', data);
        renderError('Missing type, labels or series', el);
        return;
      }
    }
    if (data.bestFit === true && data.type === 'line' && data.series) {
      console.log('Charts: Applying best fit line');
      const seriesIndex = data.bestFitNumber != undefined ? Number(data.bestFitNumber) : 0;
      const x = data.series[seriesIndex].data;

      const n = x.length;
      let sumX = 0;
      let sumY = 0;
      let sumXY = 0;
      let sumX2 = 0;

      for (let i = 0; i < n; ++i) {
        const yVal: number = typeof x[i] === 'string' ? parseFloat(x[i] as string) : (x[i] as number);
        sumX = sumX + i;
        sumY = sumY + yVal;
        sumX2 = sumX2 + i * i;
        sumXY = sumXY + i * yVal;
      }
      const gradient = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - gradient * sumX) / n;

      const YVals: number[] = [];
      for (let i = 0; i < n; ++i) {
        YVals.push(gradient * i + intercept);
      }

      const title = (data.bestFitTitle != undefined && data.bestFitTitle !== 'undefined')
        ? String(data.bestFitTitle)
        : 'Line of Best Fit';

      data.series.push({
        title: title,
        data: YVals,
      });
      console.log('Charts: Added best fit series:', title);
    }
    console.log('Charts: Starting render from YAML');
    await this.renderer.renderFromYaml(data, el, ctx);
    console.log('Charts: Render from YAML complete');
  };

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async onload() {
    console.log('Charts: Loading plugin');
    
    await this.loadSettings();
    console.log('Charts: Settings loaded - themeable:', this.settings.themeable);

    this.renderer = new Renderer(this);
    console.log('Charts: Renderer created, settings.themeable:', this.settings.themeable);

    type RenderChartFn = (data: unknown, el: HTMLElement) => Promise<Chart | null> | Chart | null;
    (window as unknown as { renderChart: RenderChartFn }).renderChart = async (data: unknown, el: HTMLElement): Promise<Chart | null> => {
      // If the input looks like a YAML config (has 'series' at top level),
      // route it through datasetPrep() so fill, stacked, spanGaps, etc. are handled.
      // Otherwise, treat it as a raw Chart.js ChartConfiguration.
      if (data && typeof data === 'object' && !('chartOptions' in (data as Record<string, unknown>))) {
        const obj = data as Record<string, unknown>;
        if ('series' in obj) {
          const prepared = await this.renderer.datasetPrep(obj as unknown as ChartYaml, el);
          return this.renderer.renderRaw(prepared, el);
        }
      }
      return this.renderer.renderRaw(data as DatasetPrepResult | ChartConfiguration, el);
    };

    console.log('Charts: Initialized renderer and global renderChart');

    addIcons();

    this.addSettingTab(new ChartSettingTab(this.app, this));

    console.log('Charts: Added settings tab');

    this.addCommand({
      id: 'creation-helper',
      name: 'Insert new Chart',
      checkCallback: (checking: boolean) => {
        console.log('Charts: Checking for creation helper command');
        const leaf = this.app.workspace.activeLeaf;
        if (leaf && leaf.view instanceof MarkdownView) {
          if (!checking) {
            console.log('Charts: Opening creation helper modal');
            new CreationHelperModal(
              this.app,
              leaf.view,
              this.settings,
              this.renderer
            ).open();
          }
          return true;
        }
        return false;
      },
    });

    this.addCommand({
      id: 'chart-from-table-column',
      name: 'Create Chart from Table (Column oriented Layout)',
      editorCheckCallback: (checking: boolean, editor: Editor, view: MarkdownView | MarkdownFileInfo) => {
        console.log('Charts: Checking for chart from table column command');
        const selection = editor.getSelection();
        if (
          view instanceof MarkdownView &&
          selection.split('\n').length >= 3 &&
          selection.split('|').length >= 2
        ) {
          if (!checking) {
            console.log('Charts: Generating chart from table (columns)');
            chartFromTable(editor, 'columns');
          }
          return true;
        }
        return false;
      },
    });

    this.addCommand({
      id: 'chart-from-table-row',
      name: 'Create Chart from Table (Row oriented Layout)',
      editorCheckCallback: (checking: boolean, editor: Editor, view: MarkdownView | MarkdownFileInfo) => {
        console.log('Charts: Checking for chart from table row command');
        if (
          view instanceof MarkdownView &&
          editor.getSelection().split('\n').length >= 3 &&
          editor.getSelection().split('|').length >= 2
        ) {
          if (!checking) {
            console.log('Charts: Generating chart from table (rows)');
            chartFromTable(editor, 'rows');
          }
          return true;
        }
        return false;
      },
    });

    this.addCommand({
      id: 'chart-to-svg',
      name: 'Create Image from Chart',
      editorCheckCallback: (checking: boolean, editor: Editor, view: MarkdownView | MarkdownFileInfo) => {
        console.log('Charts: Checking for chart to SVG command');
        const viewFile = view instanceof MarkdownView ? view.file : null;
        if (
          view instanceof MarkdownView &&
          viewFile &&
          editor.getSelection().startsWith('```chart') &&
          editor.getSelection().endsWith('```')
        ) {
          if (!checking) {
            console.log('Charts: Starting chart to image rendering');
            new Notice('Rendering Chart...');
            saveImageToVaultAndPaste(
              editor,
              this.app,
              this.renderer,
              viewFile,
              this.settings
            );
          }
          return true;
        }
        return false;
      },
    });

    this.registerMarkdownCodeBlockProcessor('chart', this.postprocessor);
    this.registerMarkdownCodeBlockProcessor(
      'advanced-chart',
      async (data: string, el: HTMLElement) => this.renderer.renderRaw(JSON.parse(data) as ChartConfiguration, el)
    );

    console.log('Charts: Registered code block processors');

    this.registerEvent(
      this.app.workspace.on(
        'editor-menu',
        (menu: Menu, _: Editor, view: MarkdownView | MarkdownFileInfo) => {
          if (view instanceof MarkdownView && this.settings.contextMenu) {
            menu.addItem((item) => {
              item
                .setTitle('Insert Chart')
                .setIcon('chart')
                .onClick(() => {
                  console.log('Charts: Context menu clicked, opening modal');
                  new CreationHelperModal(
                    this.app,
                    view,
                    this.settings,
                    this.renderer
                  ).open();
                });
            });
          }
        }
      )
    );

    console.log('Charts: Plugin fully loaded');
  }

  onunload() {
    console.log('unloading plugin: Charts');
  }
}
