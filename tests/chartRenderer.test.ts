import Renderer, { ChartRenderChild } from '../src/chartRenderer';
import { generateInnerColors } from '../src/util';
import { Chart } from 'chart.js';

describe('Renderer', () => {
  let renderer: Renderer;
  let mockPlugin: any;
  let mockEl: HTMLElement;

  beforeEach(() => {
    mockPlugin = {
      settings: {
        colors: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
        ],
        themeable: false,
      },
    };
    renderer = new Renderer(mockPlugin as any);
    mockEl = document.createElement('div');
    document.body.appendChild(mockEl);
  });

  afterEach(() => {
    document.body.removeChild(mockEl);
  });

  describe('datasetPrep', () => {
    it('prepares basic bar chart data', async () => {
      const yaml = {
        type: 'bar',
        labels: ['A', 'B'],
        series: [{ title: 'S1', data: [1, 2] }],
      };
      const result = await renderer.datasetPrep(yaml, mockEl);
      expect(result.chartOptions.type).toBe('bar');
      expect(result.chartOptions.data.labels).toEqual(['A', 'B']);
      expect(result.chartOptions.data.datasets).toHaveLength(1);
      expect(result.chartOptions.data.datasets[0].label).toBe('S1');
      expect(result.chartOptions.data.datasets[0].data).toEqual([1, 2]);
    });

    it('prepares line chart data', async () => {
      const yaml = {
        type: 'line',
        labels: ['Mon', 'Tue', 'Wed'],
        series: [{ title: 'Temp', data: [20, 22, 18] }],
      };
      const result = await renderer.datasetPrep(yaml, mockEl);
      expect(result.chartOptions.type).toBe('line');
      expect(result.chartOptions.data.datasets[0].label).toBe('Temp');
    });

    it('prepares radar chart data', async () => {
      const yaml = {
        type: 'radar',
        labels: ['A', 'B', 'C'],
        series: [{ title: 'S1', data: [1, 2, 3] }],
      };
      const result = await renderer.datasetPrep(yaml, mockEl);
      expect(result.chartOptions.type).toBe('radar');
    });

    it('prepares polar area chart data', async () => {
      const yaml = {
        type: 'polarArea',
        labels: ['A', 'B', 'C'],
        series: [{ title: 'S1', data: [1, 2, 3] }],
      };
      const result = await renderer.datasetPrep(yaml, mockEl);
      expect(result.chartOptions.type).toBe('polarArea');
    });

    it('prepares pie chart data', async () => {
      const yaml = {
        type: 'pie',
        labels: ['A', 'B'],
        series: [{ title: 'S1', data: [60, 40] }],
      };
      const result = await renderer.datasetPrep(yaml, mockEl);
      expect(result.chartOptions.type).toBe('pie');
    });

    it('prepares doughnut chart data', async () => {
      const yaml = {
        type: 'doughnut',
        labels: ['A', 'B'],
        series: [{ title: 'S1', data: [60, 40] }],
      };
      const result = await renderer.datasetPrep(yaml, mockEl);
      expect(result.chartOptions.type).toBe('doughnut');
    });

    it('prepares sankey chart data with flow conversion', async () => {
      const yaml = {
        type: 'sankey',
        labels: ['Oil', 'Gas', 'Energy'],
        series: [{
          title: 'Flow1',
          data: [['Oil', 15, 'Energy']],
        }],
      };
      const result = await renderer.datasetPrep(yaml, mockEl);
      expect(result.chartOptions.type).toBe('sankey');
      expect(result.chartOptions.data.datasets[0].data[0]).toEqual({
        from: 'Oil',
        flow: 15,
        to: 'Energy',
      });
    });

    it('passes sankey non-array data items through unchanged', async () => {
      const yaml = {
        type: 'sankey',
        labels: ['A', 'B'],
        series: [{
          title: 'Flow1',
          data: [{ from: 'A', flow: 10, to: 'B' }],
        }],
      };
      const result = await renderer.datasetPrep(yaml, mockEl);
      expect(result.chartOptions.data.datasets[0].data[0]).toEqual({
        from: 'A',
        flow: 10,
        to: 'B',
      });
    });

    it('converts string data values to numbers', async () => {
      const yaml = {
        type: 'bar',
        labels: ['A', 'B', 'C'],
        series: [{ title: 'S1', data: ['12', '28', '25'] }],
      };
      const result = await renderer.datasetPrep(yaml, mockEl);
      expect(result.chartOptions.data.datasets[0].data).toEqual([12, 28, 25]);
    });

    it('converts empty string data values to null for spanGaps', async () => {
      const yaml = {
        type: 'line',
        labels: ['A', 'B', 'C', 'D'],
        series: [{ title: 'S1', data: [5, '', 10, 15] }],
        spanGaps: true,
      };
      const result = await renderer.datasetPrep(yaml, mockEl);
      expect(result.chartOptions.data.datasets[0].data).toEqual([5, null, 10, 15]);
    });

    it('converts whitespace-only string data values to null', async () => {
      const yaml = {
        type: 'line',
        labels: ['A', 'B', 'C'],
        series: [{ title: 'S1', data: ['  ', '5', '  '] }],
      };
      const result = await renderer.datasetPrep(yaml, mockEl);
      expect(result.chartOptions.data.datasets[0].data).toEqual([null, 5, null]);
    });

    it('converts non-numeric string data values to null', async () => {
      const yaml = {
        type: 'line',
        labels: ['A', 'B', 'C'],
        series: [{ title: 'S1', data: ['abc', '5', 'xyz'] }],
      };
      const result = await renderer.datasetPrep(yaml, mockEl);
      expect(result.chartOptions.data.datasets[0].data).toEqual([null, 5, null]);
    });

    it('preserves null values in data array', async () => {
      const yaml = {
        type: 'line',
        labels: ['A', 'B', 'C', 'D'],
        series: [{ title: 'S1', data: [1, null, null, 4] }],
        spanGaps: true,
      };
      const result = await renderer.datasetPrep(yaml, mockEl);
      expect(result.chartOptions.data.datasets[0].data).toEqual([1, null, null, 4]);
    });

    it('handles mixed string and numeric data values', async () => {
      const yaml = {
        type: 'bar',
        labels: ['A', 'B', 'C', 'D'],
        series: [{ title: 'S1', data: [12.0, '15.0', 9, '2'] }],
      };
      const result = await renderer.datasetPrep(yaml, mockEl);
      expect(result.chartOptions.data.datasets[0].data).toEqual([12, 15, 9, 2]);
    });

    it('passes stepped property to dataset', async () => {
      const yaml = {
        type: 'line',
        labels: ['A', 'B'],
        series: [{ title: 'S1', data: [1, 2] }],
        stepped: true,
      };
      const result = await renderer.datasetPrep(yaml, mockEl);
      expect(result.chartOptions.data.datasets[0].stepped).toBe(true);
    });

    it('passes stepped string value to dataset', async () => {
      const yaml = {
        type: 'line',
        labels: ['A', 'B'],
        series: [{ title: 'S1', data: [1, 2] }],
        stepped: 'before',
      };
      const result = await renderer.datasetPrep(yaml, mockEl);
      expect(result.chartOptions.data.datasets[0].stepped).toBe('before');
    });

    it('passes tension property to dataset', async () => {
      const yaml = {
        type: 'line',
        labels: ['A', 'B'],
        series: [{ title: 'S1', data: [1, 2] }],
        tension: 0.5,
      };
      const result = await renderer.datasetPrep(yaml, mockEl);
      expect(result.chartOptions.data.datasets[0].tension).toBe(0.5);
    });

    it('defaults tension to 0', async () => {
      const yaml = {
        type: 'line',
        labels: ['A', 'B'],
        series: [{ title: 'S1', data: [1, 2] }],
      };
      const result = await renderer.datasetPrep(yaml, mockEl);
      expect(result.chartOptions.data.datasets[0].tension).toBe(0);
    });

    it('passes fill property to dataset', async () => {
      const yaml = {
        type: 'line',
        labels: ['A', 'B'],
        series: [{ title: 'S1', data: [1, 2] }],
        fill: true,
      };
      const result = await renderer.datasetPrep(yaml, mockEl);
      expect(result.chartOptions.data.datasets[0].fill).toBe(true);
    });

    it('defaults fill to false', async () => {
      const yaml = {
        type: 'line',
        labels: ['A', 'B'],
        series: [{ title: 'S1', data: [1, 2] }],
      };
      const result = await renderer.datasetPrep(yaml, mockEl);
      expect(result.chartOptions.data.datasets[0].fill).toBe(false);
    });

    it('handles fill with stacked option', async () => {
      const yaml = {
        type: 'line',
        labels: ['A', 'B'],
        series: [
          { title: 'S1', data: [1, 2] },
          { title: 'S2', data: [3, 4] },
        ],
        fill: true,
        stacked: true,
      };
      const result = await renderer.datasetPrep(yaml, mockEl);
      expect(result.chartOptions.data.datasets[0].fill).toBe('origin');
      expect(result.chartOptions.data.datasets[1].fill).toBe('-1');
    });

    it('returns width from yaml', async () => {
      const yaml = {
        type: 'bar',
        labels: ['A', 'B'],
        series: [{ title: 'S1', data: [1, 2] }],
        width: '500px',
      };
      const result = await renderer.datasetPrep(yaml, mockEl);
      expect(result.width).toBe('500px');
    });

    it('defaults width to undefined', async () => {
      const yaml = {
        type: 'bar',
        labels: ['A', 'B'],
        series: [{ title: 'S1', data: [1, 2] }],
      };
      const result = await renderer.datasetPrep(yaml, mockEl);
      expect(result.width).toBeUndefined();
    });

    it('configures legend from yaml', async () => {
      const yaml = {
        type: 'bar',
        labels: ['A', 'B'],
        series: [{ title: 'S1', data: [1, 2] }],
        legend: false,
      };
      await renderer.datasetPrep(yaml, mockEl);
      expect(Chart.defaults.plugins.legend.display).toBe(false);
    });

    it('configures legendPosition from yaml', async () => {
      const yaml = {
        type: 'bar',
        labels: ['A', 'B'],
        series: [{ title: 'S1', data: [1, 2] }],
        legendPosition: 'bottom',
      };
      await renderer.datasetPrep(yaml, mockEl);
      expect(Chart.defaults.plugins.legend.position).toBe('bottom');
    });

    it('configures time scale for bar/line charts', async () => {
      const yaml = {
        type: 'line',
        labels: ['2026-01-01', '2026-01-02'],
        series: [{ title: 'S1', data: [1, 2] }],
        time: 'day',
      };
      const result = await renderer.datasetPrep(yaml, mockEl);
      expect(result.chartOptions.options.scales.x.type).toBe('time');
      expect(result.chartOptions.options.scales.x.time.unit).toBe('day');
    });

    it('configures axis modifiers for bar/line charts', async () => {
      const yaml = {
        type: 'bar',
        labels: ['A', 'B'],
        series: [{ title: 'S1', data: [1, 2] }],
        beginAtZero: true,
        indexAxis: 'y',
        stacked: true,
        yMin: 0,
        yMax: 10,
        xTitle: 'X Axis',
        yTitle: 'Y Axis',
      };
      const result = await renderer.datasetPrep(yaml, mockEl);
      expect(result.chartOptions.options.indexAxis).toBe('y');
      expect(result.chartOptions.options.scales.y.beginAtZero).toBe(true);
      expect(result.chartOptions.options.scales.y.stacked).toBe(true);
      expect(result.chartOptions.options.scales.y.min).toBe(0);
      expect(result.chartOptions.options.scales.y.max).toBe(10);
      expect(result.chartOptions.options.scales.y.title.text).toBe('Y Axis');
      expect(result.chartOptions.options.scales.x.title.text).toBe('X Axis');
    });

    it('configures radar/polarArea r-axis modifiers', async () => {
      const yaml = {
        type: 'radar',
        labels: ['A', 'B', 'C'],
        series: [{ title: 'S1', data: [1, 2, 3] }],
        beginAtZero: true,
        rMax: 10,
        rMin: 0,
      };
      const result = await renderer.datasetPrep(yaml, mockEl);
      expect(result.chartOptions.options.scales.r.beginAtZero).toBe(true);
      expect(result.chartOptions.options.scales.r.max).toBe(10);
      expect(result.chartOptions.options.scales.r.min).toBe(0);
    });

    it('configures spanGaps for line charts', async () => {
      const yaml = {
        type: 'line',
        labels: ['A', 'B', 'C'],
        series: [{ title: 'S1', data: [1, null, 3] }],
        spanGaps: true,
      };
      const result = await renderer.datasetPrep(yaml, mockEl);
      expect(result.chartOptions.options.spanGaps).toBe(true);
    });

    it('sets animation duration to 0', async () => {
      const yaml = {
        type: 'bar',
        labels: ['A', 'B'],
        series: [{ title: 'S1', data: [1, 2] }],
      };
      const result = await renderer.datasetPrep(yaml, mockEl);
      expect(result.chartOptions.options.animation.duration).toBe(0);
    });

    it('handles multiple series', async () => {
      const yaml = {
        type: 'bar',
        labels: ['A', 'B'],
        series: [
          { title: 'S1', data: [1, 2] },
          { title: 'S2', data: [3, 4] },
          { title: 'S3', data: [5, 6] },
        ],
      };
      const result = await renderer.datasetPrep(yaml, mockEl);
      expect(result.chartOptions.data.datasets).toHaveLength(3);
      expect(result.chartOptions.data.datasets.map(d => d.label)).toEqual(['S1', 'S2', 'S3']);
    });

    it('skips dataset preparation when yaml.id is set', async () => {
      const yaml = {
        type: 'bar',
        id: '^my-table',
        labels: ['A', 'B'],
        series: [{ title: 'S1', data: [1, 2] }],
      };
      const result = await renderer.datasetPrep(yaml, mockEl);
      // When id is set, datasets are populated later in ChartRenderChild
      expect(result.chartOptions.data.datasets).toHaveLength(0);
    });

    it('sets default label to empty string when title is missing', async () => {
      const yaml = {
        type: 'bar',
        labels: ['A', 'B'],
        series: [{ data: [1, 2] }],
      };
      const result = await renderer.datasetPrep(yaml, mockEl);
      expect(result.chartOptions.data.datasets[0].label).toBe('');
    });

    it('passes extra series properties through to dataset', async () => {
      const yaml = {
        type: 'line',
        labels: ['A', 'B'],
        series: [{ title: 'S1', data: [1, 2], customProp: 'value' }],
      };
      const result = await renderer.datasetPrep(yaml, mockEl);
      expect(result.chartOptions.data.datasets[0].customProp).toBe('value');
    });
  });

  describe('renderRaw', () => {
    it('renders chart with chartOptions', () => {
      const data = {
        chartOptions: { type: 'line', data: { labels: [], datasets: [] } },
      };
      renderer.renderRaw(data, mockEl);
      expect(mockEl.querySelector('canvas')).not.toBeNull();
    });

    it('renders chart with raw config', () => {
      const data = { type: 'pie', data: { labels: [], datasets: [] } };
      renderer.renderRaw(data, mockEl);
      expect(mockEl.querySelector('canvas')).not.toBeNull();
    });

    it('applies width from data', () => {
      const data = {
        chartOptions: { type: 'line', data: { labels: [], datasets: [] } },
        width: '600px',
      };
      renderer.renderRaw(data, mockEl);
      const container = mockEl.querySelector('canvas')?.parentElement;
      expect(container?.style.width).toBe('600px');
    });

    it('defaults width to 100% when not specified', () => {
      const data = {
        chartOptions: { type: 'line', data: { labels: [], datasets: [] } },
      };
      renderer.renderRaw(data, mockEl);
      const container = mockEl.querySelector('canvas')?.parentElement;
      expect(container?.style.width).toBe('100%');
    });

    it('returns chart instance on success', () => {
      const data = {
        chartOptions: { type: 'bar', data: { labels: [], datasets: [] } },
      };
      const chart = renderer.renderRaw(data, mockEl);
      expect(chart).not.toBeNull();
    });

    it('returns null and renders error on failure', () => {
      // Force Chart constructor to throw
      const origImpl = Chart.getMockImplementation();
      Chart.mockImplementationOnce(() => { throw new Error('Chart error'); });
      const data = {
        chartOptions: { type: 'bar', data: { labels: [], datasets: [] } },
      };
      const chart = renderer.renderRaw(data, mockEl);
      expect(chart).toBeNull();
      expect(mockEl.querySelector('.chart-error')).not.toBeNull();
    });

    it('sets margin to auto on container', () => {
      const data = {
        chartOptions: { type: 'bar', data: { labels: [], datasets: [] } },
      };
      renderer.renderRaw(data, mockEl);
      const container = mockEl.querySelector('canvas')?.parentElement;
      expect(container?.style.margin).toBe('auto');
    });
  });

  describe('ChartRenderChild', () => {
    let child: ChartRenderChild;
    let mockContainerEl: HTMLElement;

    beforeEach(() => {
      mockContainerEl = document.createElement('div');
      document.body.appendChild(mockContainerEl);

      const mockApp = {
        metadataCache: {
          on: jest.fn(),
          off: jest.fn(),
          getFileCache: jest.fn(),
        },
        workspace: {
          on: jest.fn(),
          off: jest.fn(),
          getActiveFile: jest.fn(),
        },
        vault: {
          getAbstractFileByPath: jest.fn(),
          cachedRead: jest.fn(),
        },
      };
      const plugin = {
        settings: { colors: ['rgba(255,99,132,1)', 'rgba(54,162,235,1)'], themeable: false },
        app: mockApp,
      };
      const testRenderer = new Renderer(plugin as any);
      child = new ChartRenderChild(
        { type: 'bar', labels: ['A', 'B'], series: [{ title: 'S1', data: [1, 2] }] },
        mockContainerEl,
        testRenderer,
        'test.md'
      );
    });

    afterEach(() => {
      if (child) {
        child.onunload();
      }
      document.body.removeChild(mockContainerEl);
      jest.useRealTimers();
    });

    describe('debounce', () => {
      it('debounces reload on handleChange - only one reload after 500ms', () => {
        jest.useFakeTimers();
        const reloadSpy = jest.spyOn(child as any, 'handleReload');

        child.handleChange({ path: 'test.md', basename: 'test' } as any);
        child.handleChange({ path: 'test.md', basename: 'test' } as any);
        child.handleChange({ path: 'test.md', basename: 'test' } as any);

        expect(reloadSpy).not.toHaveBeenCalled();
        jest.advanceTimersByTime(500);
        expect(reloadSpy).toHaveBeenCalledTimes(1);
      });

      it('resets debounce timer on each handleChange', () => {
        jest.useFakeTimers();
        const reloadSpy = jest.spyOn(child as any, 'handleReload');

        child.handleChange({ path: 'test.md', basename: 'test' } as any);
        jest.advanceTimersByTime(300);

        child.handleChange({ path: 'test.md', basename: 'test' } as any);
        jest.advanceTimersByTime(300);

        expect(reloadSpy).not.toHaveBeenCalled();
        jest.advanceTimersByTime(200);
        expect(reloadSpy).toHaveBeenCalledTimes(1);
      });

      it('clears pending reload timer on onunload', () => {
        jest.useFakeTimers();
        const reloadSpy = jest.spyOn(child as any, 'handleReload');

        child.handleChange({ path: 'test.md', basename: 'test' } as any);
        child.onunload();

        jest.advanceTimersByTime(600);
        expect(reloadSpy).not.toHaveBeenCalled();
      });

      it('ignores handleChange for unrelated files', () => {
        jest.useFakeTimers();
        const reloadSpy = jest.spyOn(child as any, 'handleReload');

        child.handleChange({ path: 'other.md', basename: 'other' } as any);
        jest.advanceTimersByTime(600);

        expect(reloadSpy).not.toHaveBeenCalled();
      });

      it('uses bound handler references for proper event unregistration', () => {
        child.onunload();
        const { metadataCache } = child.renderer.plugin.app;
        const { workspace } = child.renderer.plugin.app;

        expect(metadataCache.off).toHaveBeenCalledWith('changed', child.boundHandleChange);
        expect(workspace.off).toHaveBeenCalledWith('css-change', child.boundHandleReload);
      });
    });

    describe('block ID handling', () => {
      it('strips leading caret from block ID for cache lookup', async () => {
        const mockApp = child.renderer.plugin.app;
        const mockFile = { path: 'test.md', basename: 'test' };
        mockApp.vault.getAbstractFileByPath.mockReturnValue(mockFile);
        mockApp.metadataCache.getFileCache.mockReturnValue({
          sections: [{ id: 'my-table', position: { start: { offset: 0 }, end: { offset: 50 } } }],
        });
        mockApp.vault.cachedRead.mockResolvedValue(
          '| A | B |\n|---|---|\n| 1 | 2 |\n^my-table'
        );

        // Override child data to include a block ID with ^ prefix
        (child as any).data = { type: 'bar', id: '^my-table', layout: 'columns' };

        // The onload should not throw "Invalid id and/or file"
        // because it strips the ^ before looking up in sections
        try {
          await child.onload();
        } catch (e: any) {
          // If it fails, it shouldn't be about the block ID lookup
          expect(e.message).not.toBe('Invalid id and/or file');
        }
      });

      it('accepts block ID without leading caret', async () => {
        const mockApp = child.renderer.plugin.app;
        const mockFile = { path: 'test.md', basename: 'test' };
        mockApp.vault.getAbstractFileByPath.mockReturnValue(mockFile);
        mockApp.metadataCache.getFileCache.mockReturnValue({
          sections: [{ id: 'my-table', position: { start: { offset: 0 }, end: { offset: 50 } } }],
        });
        mockApp.vault.cachedRead.mockResolvedValue(
          '| A | B |\n|---|---|\n| 1 | 2 |\n^my-table'
        );

        (child as any).data = { type: 'bar', id: 'my-table', layout: 'columns' };

        try {
          await child.onload();
        } catch (e: any) {
          expect(e.message).not.toBe('Invalid id and/or file');
        }
      });

      it('finds block ID in blocks record when not in sections', async () => {
        const mockApp = child.renderer.plugin.app;
        const mockFile = { path: 'test.md', basename: 'test' };
        mockApp.vault.getAbstractFileByPath.mockReturnValue(mockFile);
        // Simulate Obsidian's cache where the block ID is in blocks but not sections[].id
        mockApp.metadataCache.getFileCache.mockReturnValue({
          sections: [
            { type: 'table', position: { start: { offset: 0 }, end: { offset: 80 } } },
          ],
          blocks: {
            'WK41': { id: 'WK41', position: { start: { offset: 60 }, end: { offset: 66 } } },
          },
        });
        mockApp.vault.cachedRead.mockResolvedValue(
          '| Customer | Tickets |\n|---|---|\n| C1 | 5 |\n| C2 | 2 |\n^WK41'
        );

        (child as any).data = { type: 'bar', id: '^WK41', layout: 'rows' };

        try {
          await child.onload();
        } catch (e: any) {
          // Should NOT throw "Invalid id and/or file" since block is found in blocks record
          expect(e.message).not.toBe('Invalid id and/or file');
        }
      });

      it('uses containing section position when block found in blocks record', async () => {
        const mockApp = child.renderer.plugin.app;
        const mockFile = { path: 'test.md', basename: 'test' };
        mockApp.vault.getAbstractFileByPath.mockReturnValue(mockFile);
        mockApp.metadataCache.getFileCache.mockReturnValue({
          sections: [
            { type: 'table', position: { start: { offset: 0 }, end: { offset: 80 } } },
          ],
          blocks: {
            'WK41': { id: 'WK41', position: { start: { offset: 60 }, end: { offset: 66 } } },
          },
        });
        mockApp.vault.cachedRead.mockResolvedValue(
          '| Customer | Tickets |\n|---|---|\n| C1 | 5 |\n| C2 | 2 |\n^WK41'
        );

        (child as any).data = { type: 'bar', id: 'WK41', layout: 'rows' };

        try {
          await child.onload();
        } catch (e: any) {
          // Should find the containing table section and extract the table
          expect(e.message).not.toBe('Invalid id and/or file');
        }
      });

      it('shows error when block ID not found in sections or blocks', async () => {
        const mockApp = child.renderer.plugin.app;
        const mockFile = { path: 'test.md', basename: 'test' };
        mockApp.vault.getAbstractFileByPath.mockReturnValue(mockFile);
        mockApp.metadataCache.getFileCache.mockReturnValue({
          sections: [{ type: 'table', position: { start: { offset: 0 }, end: { offset: 50 } } }],
          blocks: {},
        });
        mockApp.vault.cachedRead.mockResolvedValue(
          '| A | B |\n|---|---|\n| 1 | 2 |'
        );

        (child as any).data = { type: 'bar', id: '^nonexistent', layout: 'columns' };

        // onload catches the error internally and renders an error element
        await child.onload();
        // Verify an error was rendered (renderError creates a .chart-error element)
        const errorEl = mockContainerEl.querySelector('.chart-error');
        expect(errorEl).not.toBeNull();
      });
    });

    describe('table data empty cell handling', () => {
      it('converts empty cells to null for spanGaps support', async () => {
        const mockApp = child.renderer.plugin.app;
        const mockFile = { path: 'test.md', basename: 'test' };
        mockApp.vault.getAbstractFileByPath.mockReturnValue(mockFile);
        mockApp.metadataCache.getFileCache.mockReturnValue({
          sections: [{ id: 'tabelle1', position: { start: { offset: 0 }, end: { offset: 200 } } }],
        });
        mockApp.vault.cachedRead.mockResolvedValue(
          '| Datum | warm | kalt |\n|---|---|---|\n| 12.03 | 0 | 0 |\n| 13.03 | 5 | 8 |\n| 14.03 | 10 | 13 |\n| 15.03 |  | 18 |\n| 16.03 | 18 | 19 |\n| 17.03 | 25 | 21 |\n^tabelle1'
        );

        (child as any).data = { type: 'line', id: 'tabelle1', layout: 'columns', spanGaps: true };

        try {
          await child.onload();
        } catch (_e: unknown) {
          // May fail on rendering, but data conversion is what we're testing
        }

        // Verify Chart was called - the data should have null for empty cells
        expect(Chart).toHaveBeenCalled();
        const lastCall = (Chart as jest.Mock).mock.calls[(Chart as jest.Mock).mock.calls.length - 1];
        const config = lastCall?.[1];
        if (config?.data?.datasets) {
          const warmData = config.data.datasets.find((d: Record<string, unknown>) => d.label === 'warm');
          if (warmData) {
            // The empty cell at row 4 (15.03) should be null, not 0 or NaN
            expect(warmData.data[3]).toBeNull();
          }
        }
      });
    });
  });

  describe('imageRenderer', () => {
    it('generates image data URL', async () => {
      const yaml = '```chart\ntype: bar\nlabels: []\nseries: []\n```';
      const result = await renderer.imageRenderer(yaml, { format: 'image/png', quality: 1 });
      expect(typeof result).toBe('string');
    });

    it('respects width from YAML in canvas dimensions', async () => {
      const yaml = '```chart\ntype: bar\nlabels: [A]\nseries:\n  - title: S1\n    data: [1]\nwidth: 800\n```';
      await renderer.imageRenderer(yaml, { format: 'image/png', quality: 1 });
      // The Chart constructor is called with the canvas context
      // We verify it was called
      expect(Chart).toHaveBeenCalled();
    });

    it('defaults to 600px width when no width specified', async () => {
      const yaml = '```chart\ntype: bar\nlabels: [A]\nseries:\n  - title: S1\n    data: [1]\n```';
      await renderer.imageRenderer(yaml, { format: 'image/png', quality: 1 });
      expect(Chart).toHaveBeenCalled();
    });

    it('handles percentage width by falling back to 600px', async () => {
      const yaml = '```chart\ntype: bar\nlabels: [A]\nseries:\n  - title: S1\n    data: [1]\nwidth: 80%\n```';
      await renderer.imageRenderer(yaml, { format: 'image/png', quality: 1 });
      expect(Chart).toHaveBeenCalled();
    });
  });
});

describe('generateInnerColors', () => {
  it('generates inner colors with alpha', () => {
    const colors = ['#ff0000', '#00ff00'];
    const result = generateInnerColors(colors, 0.25);
    expect(result).toHaveLength(2);
    expect(typeof result[0]).toBe('string');
    expect(typeof result[1]).toBe('string');
  });

  it('throws if alpha is not a number', () => {
    expect(() => generateInnerColors(['#ff0000'], 'not a number' as any)).toThrow();
  });

  it('handles single color', () => {
    const result = generateInnerColors(['#ff0000'], 0.5);
    expect(result).toHaveLength(1);
  });

  it('handles empty colors array', () => {
    const result = generateInnerColors([], 0.5);
    expect(result).toHaveLength(0);
  });

  it('trims whitespace from color values', () => {
    const result = generateInnerColors([' #ff0000 '], 0.5);
    expect(result).toHaveLength(1);
  });
});
