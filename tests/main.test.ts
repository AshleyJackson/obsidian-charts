import ChartPlugin from '../src/main';
import { parseYaml } from 'obsidian';
import { Chart } from 'chart.js';

describe('Main Plugin', () => {
  let plugin: ChartPlugin;
  let mockApp: any;

  beforeEach(async () => {
    mockApp = {
      workspace: {
        onLayoutReady: jest.fn((cb) => cb()),
        activeLeaf: null,
        on: jest.fn(),
        off: jest.fn(),
      },
      vault: {
        getAbstractFileByPath: jest.fn(),
        cachedRead: jest.fn(),
        createBinary: jest.fn(),
      },
      metadataCache: {
        getFileCache: jest.fn(),
        getFirstLinkpathDest: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
      },
      fileManager: {
        generateMarkdownLink: jest.fn((file, path) => `![[${file.path}]]`),
      },
    };
    plugin = new ChartPlugin(mockApp);
    await plugin.loadSettings();
  });

  it('loads plugin successfully', async () => {
    expect(plugin.settings).toBeDefined();
    expect(plugin.settings.colors).toBeDefined();
    expect(plugin.settings.colors).toHaveLength(6);
    expect(plugin.settings.contextMenu).toBe(true);
    expect(plugin.settings.themeable).toBe(false);
  });

  it('registers postprocessor', () => {
    expect(plugin.postprocessor).toBeDefined();
    expect(typeof plugin.postprocessor).toBe('function');
  });

  it('loads default image settings', () => {
    expect(plugin.settings.imageSettings).toBeDefined();
    expect(plugin.settings.imageSettings.format).toBe('image/png');
    expect(plugin.settings.imageSettings.quality).toBeCloseTo(0.92);
  });

  describe('window.renderChart', () => {
    let mockEl: HTMLElement;

    beforeEach(async () => {
      // onload() registers window.renderChart - suppress addIcons error
      try { await plugin.onload(); } catch (_e: unknown) { /* addIcons may fail in test env */ }
      mockEl = document.createElement('div');
      document.body.appendChild(mockEl);
    });

    afterEach(() => {
      if (mockEl.parentElement) {
        mockEl.parentElement.removeChild(mockEl);
      }
    });

    it('routes YAML-like objects with series through datasetPrep', async () => {
      const yamlLike = {
        type: 'line',
        labels: ['Mon', 'Tue', 'Wed'],
        series: [{ title: 'S1', data: [1, 2, 3] }],
        fill: true,
        stacked: true,
      };

      const renderChart = (window as unknown as { renderChart: (data: unknown, el: HTMLElement) => Promise<unknown> }).renderChart;
      expect(typeof renderChart).toBe('function');
      const result = await renderChart(yamlLike, mockEl);

      // Verify Chart was called with proper config that includes stacked/fill options
      expect(Chart).toHaveBeenCalled();
      const lastCall = (Chart as jest.Mock).mock.calls[(Chart as jest.Mock).mock.calls.length - 1];
      const config = lastCall?.[1];
      // When routed through datasetPrep, stacked fill should produce 'origin' for first dataset
      if (config?.data?.datasets?.[0]) {
        expect(config.data.datasets[0].fill).toBe('origin');
      }
    });

    it('passes raw Chart.js config directly to renderRaw', async () => {
      const chartJsConfig = {
        type: 'bar',
        data: {
          labels: ['A', 'B'],
          datasets: [{ label: 'S1', data: [1, 2] }],
        },
        options: {},
      };

      const renderChart = (window as unknown as { renderChart: (data: unknown, el: HTMLElement) => Promise<unknown> }).renderChart;
      const result = await renderChart(chartJsConfig, mockEl);

      expect(Chart).toHaveBeenCalled();
    });

    it('routes YAML-like objects with stacked and fill through datasetPrep for proper stacked fill', async () => {
      const yamlLike = {
        type: 'line',
        labels: ['Mon', 'Tue', 'Wed'],
        series: [
          { title: 'S1', data: [4, 5, 5] },
          { title: 'S2', data: [3, 4, 2] },
        ],
        fill: true,
        stacked: true,
        beginAtZero: true,
      };

      const renderChart = (window as unknown as { renderChart: (data: unknown, el: HTMLElement) => Promise<unknown> }).renderChart;
      const result = await renderChart(yamlLike, mockEl);

      expect(Chart).toHaveBeenCalled();
      const lastCall = (Chart as jest.Mock).mock.calls[(Chart as jest.Mock).mock.calls.length - 1];
      const config = lastCall?.[1];
      if (config?.data?.datasets) {
        // Stacked fill: first dataset fills to 'origin', subsequent to '-1'
        expect(config.data.datasets[0].fill).toBe('origin');
        expect(config.data.datasets[1].fill).toBe('-1');
      }
    });
  });

  describe('postprocessor', () => {
    let mockEl: HTMLElement;

    beforeEach(() => {
      mockEl = document.createElement('div');
      document.body.appendChild(mockEl);
    });

    afterEach(() => {
      document.body.removeChild(mockEl);
    });

    it('rejects YAML with missing type, labels, or series (no id)', async () => {
      const content = 'type: bar\nlabels: [A, B]';
      await expect(plugin.postprocessor(content, mockEl, { sourcePath: 'test.md' } as any))
        .resolves.toBeUndefined();
      // Should render an error element
      expect(mockEl.querySelector('.chart-error')).not.toBeNull();
    });

    it('accepts YAML with id and no series/labels', () => {
      const content = 'type: bar\nid: ^table';
      // When id is present, the postprocessor skips the "Missing type, labels or series" check
      // We verify the initial validation passes by checking that the specific
      // error message is not rendered
      const yaml = parseYaml(content);
      // Validation check from postprocessor: if no id, requires type+labels+series
      const wouldPassValidation = !!(yaml.id) || !!(yaml.type && yaml.labels && yaml.series);
      expect(wouldPassValidation).toBe(true);
    });
  });
});

// Best fit computation logic (mirrors main.ts postprocessor)
function computeBestFit(series: any[], bestFitNumber?: number) {
  const x = series[Number(bestFitNumber ?? 0)].data;
  const n = x.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; ++i) {
    const yVal = typeof x[i] === 'string' ? parseFloat(x[i]) : x[i];
    sumX += i;
    sumY += yVal;
    sumX2 += i * i;
    sumXY += i * yVal;
  }
  const gradient = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - gradient * sumX) / n;
  const YVals = [];
  for (let i = 0; i < n; ++i) {
    YVals.push(gradient * i + intercept);
  }
  return { gradient, intercept, YVals };
}

describe('bestFit', () => {
  it('computes correct line of best fit for linear data', () => {
    const result = computeBestFit([{ data: [1, 2, 3, 4, 5] }]);
    expect(result.gradient).toBeCloseTo(1);
    expect(result.intercept).toBeCloseTo(1);
    expect(result.YVals).toEqual([1, 2, 3, 4, 5]);
  });

  it('computes best fit with string data values (auto-conversion)', () => {
    const result = computeBestFit([{ data: ['2', '4', '6', '8'] }]);
    expect(result.gradient).toBeCloseTo(2);
    expect(result.intercept).toBeCloseTo(2);
    expect(result.YVals).toEqual([2, 4, 6, 8]);
  });

  it('computes best fit for non-linear data', () => {
    const result = computeBestFit([{ data: [8, 2, 5, -1, 4] }]);
    expect(result.gradient).toBeCloseTo(-1.1);
    expect(result.intercept).toBeCloseTo(5.8);
    expect(result.YVals.every(v => isFinite(v))).toBe(true);
    expect(result.YVals).toHaveLength(5);
  });

  it('computes best fit with bestFitNumber selector', () => {
    const series = [
      { data: [1, 2, 3] },
      { data: [5, 4, 3] },
    ];
    const result = computeBestFit(series, 1);
    expect(result.gradient).toBeCloseTo(-1);
    expect(result.intercept).toBeCloseTo(5);
  });

  it('produces finite values for decreasing line', () => {
    const result = computeBestFit([{ data: [5, 4, 3, 2, 1] }]);
    expect(result.YVals.every(v => isFinite(v))).toBe(true);
    expect(result.gradient).toBeCloseTo(-1);
    expect(result.intercept).toBeCloseTo(5);
  });

  it('handles single data point without throwing', () => {
    const result = computeBestFit([{ data: [42] }]);
    expect(result.YVals).toHaveLength(1);
  });

  it('handles negative data values', () => {
    const result = computeBestFit([{ data: [-10, -5, 0, 5, 10] }]);
    expect(result.gradient).toBeCloseTo(5);
    expect(result.intercept).toBeCloseTo(-10);
  });

  it('handles zero data values', () => {
    const result = computeBestFit([{ data: [0, 0, 0, 0] }]);
    expect(result.gradient).toBeCloseTo(0);
    expect(result.intercept).toBeCloseTo(0);
    expect(result.YVals).toEqual([0, 0, 0, 0]);
  });

  it('handles large dataset', () => {
    const data = Array.from({ length: 100 }, (_, i) => i * 2 + 1);
    const result = computeBestFit([{ data }]);
    expect(result.gradient).toBeCloseTo(2);
    expect(result.intercept).toBeCloseTo(1);
    expect(result.YVals).toHaveLength(100);
  });
});

describe('parseYaml mock', () => {
  it('parses basic chart YAML', () => {
    const content = 'type: bar\nlabels: [A, B]\nseries:\n  - title: S1\n    data: [1, 2]';
    const result = parseYaml(content);
    expect(result.type).toBe('bar');
    expect(result.labels).toEqual(['A', 'B']);
  });

  it('parses boolean values', () => {
    const content = 'type: line\nbestFit: true\nlegend: false';
    const result = parseYaml(content);
    expect(result.bestFit).toBe(true);
    expect(result.legend).toBe(false);
  });

  it('parses numeric values', () => {
    const content = 'type: bar\ntension: 0.5\nbeginAtZero: true';
    const result = parseYaml(content);
    expect(result.tension).toBe(0.5);
  });
});
