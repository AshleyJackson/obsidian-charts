import {
  MarkdownView,
  Plugin,
  parseYaml,
  Menu,
  Editor,
  View,
  Notice,
  MarkdownPostProcessorContext,
} from 'obsidian';

import Renderer from './chartRenderer';
import {
  ChartPluginSettings,
  DEFAULT_SETTINGS,
} from './constants/settingsConstants';
import { ChartSettingTab } from './ui/settingsTab';
import { CreationHelperModal } from './ui/creationHelperModal';
import { addIcons } from 'src/ui/icons';
import { chartFromTable } from 'src/chartFromTable';
import { renderError, saveImageToVaultAndPaste } from 'src/util';

export default class ChartPlugin extends Plugin {
  settings: ChartPluginSettings;
  renderer: Renderer;

  postprocessor = async (
    content: string,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext
  ) => {
    console.log('Charts: Processing chart code block, content length:', content.length);
    let data;
    try {
      data = await parseYaml(content.replace(/	/g, '    '));
      console.log('Charts: Parsed YAML data:', data.type, 'labels length:', data.labels?.length, 'series count:', data.series?.length);
    } catch (error) {
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
    if (data.bestFit === true && data.type === 'line') {
      console.log('Charts: Applying best fit line');
      if (data.bestFitNumber != undefined) {
        var x = data.series[Number(data.bestFitNumber)].data;
      } else {
        // Default to line 0
        var x = data.series[0].data;
      }

      // Linear regression of data values (y) against index positions (i)
      let n = x.length;
      let sumX = 0;
      let sumY = 0;
      let sumXY = 0;
      let sumX2 = 0;

      for (let i = 0; i < n; ++i) {
        let yVal = typeof x[i] === 'string' ? parseFloat(x[i]) : x[i];
        sumX = sumX + i;
        sumY = sumY + yVal;
        sumX2 = sumX2 + i * i;
        sumXY = sumXY + i * yVal;
      }
      let gradient = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      let intercept = (sumY - gradient * sumX) / n;

      // Form points from equation: y = gradient * i + intercept
      let YVals = [];
      for (let i = 0; i < n; ++i) {
        YVals.push(gradient * i + intercept);
      }

      if (data.bestFitTitle != undefined && data.bestFitTitle != 'undefined') {
        var title = String(data.bestFitTitle);
      } else {
        var title = 'Line of Best Fit';
      }
      // Create line
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

    addIcons();

    this.renderer = new Renderer(this);

    //@ts-ignore
    window.renderChart = this.renderer.renderRaw;

    console.log('Charts: Initialized renderer and global renderChart');

    this.addSettingTab(new ChartSettingTab(this.app, this));

    console.log('Charts: Added settings tab');

    this.addCommand({
      id: 'creation-helper',
      name: 'Insert new Chart',
      checkCallback: (checking: boolean) => {
        console.log('Charts: Checking for creation helper command');
        let leaf = this.app.workspace.activeLeaf;
        if (leaf.view instanceof MarkdownView) {
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
      editorCheckCallback: (checking: boolean, editor: Editor, view: View) => {
        console.log('Charts: Checking for chart from table column command');
        let selection = editor.getSelection();
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
      editorCheckCallback: (checking: boolean, editor: Editor, view: View) => {
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
      editorCheckCallback: (checking: boolean, editor: Editor, view: View) => {
        console.log('Charts: Checking for chart to SVG command');
        if (
          view instanceof MarkdownView &&
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
              view.file,
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
      async (data, el) => this.renderer.renderRaw(await JSON.parse(data), el)
    );

    console.log('Charts: Registered code block processors');

    // Remove this ignore when the obsidian package is updated on npm
    // Editor mode
    // @ts-ignore
    this.registerEvent(
      this.app.workspace.on(
        'editor-menu',
        (menu: Menu, _: Editor, view: MarkdownView) => {
          if (view && this.settings.contextMenu) {
            menu.addItem((item) => {
              item
                .setTitle('Insert Chart')
                .setIcon('chart')
                .onClick((_) => {
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
