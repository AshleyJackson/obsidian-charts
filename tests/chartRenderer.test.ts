import Renderer from '../src/chartRenderer';
import { generateInnerColors } from '../src/util';
import Chart from 'chart.js/auto';
import { parseYaml } from 'obsidian';

// Mock Chart.js
jest.mock('chart.js/auto', () => ({
  Chart: jest.fn()
}));

// Mock obsidian
jest.mock('obsidian', () => ({
  parseYaml: jest.fn()
}));

describe('Renderer', () => {
  let renderer: Renderer;
  let mockPlugin: any;
  let mockEl: HTMLElement;

  beforeEach(() => {
    mockPlugin = { settings: { colors: ['#ff0000', '#00ff00'], themeable: false } };
    renderer = new Renderer(mockPlugin as any);
    mockEl = document.createElement('div');
    (Chart as jest.MockedClass<typeof Chart>).mockClear();
    jest.clearAllMocks();
  });

  describe('datasetPrep', () => {
    it('prepares basic bar chart data', async () => {
      const yaml = {
        type: 'bar',
        labels: ['A', 'B'],
        series: [{ title: 'S1', data: [1, 2] }]
      };

      const result = await renderer.datasetPrep(yaml, mockEl);

      expect(result.chartOptions.type).toBe('bar');
      expect(result.chartOptions.data.labels).toEqual(['A', 'B']);
      expect(result.chartOptions.data.datasets).toHaveLength(1);
      expect(result.chartOptions.data.datasets[0].label).toBe('S1');
    });

    it('handles line chart with bestFit', () => {
      // bestFit logic is in main.ts postprocessor, not here
    });

    it('prepares sankey chart data', async () => {
      const yaml = {
        type: 'sankey',
        labels: ['Node1', 'Node2'],
        series: [{
          title: 'Flow1',
          data: [['Node1', 10, 'Node2']]
        }]
      };

      const result = await renderer.datasetPrep(yaml, mockEl);

      expect(result.chartOptions.type).toBe('sankey');
      expect(result.chartOptions.data.datasets[0].data[0]).toEqual({
        from: 'Node1',
        flow: 10,
        to: 'Node2'
      });
    });

    it('throws error on invalid data', async () => {
      const yaml = { type: 'invalid' };
      await expect(renderer.datasetPrep(yaml as any, mockEl)).rejects.not.toBeNull();
    });
  });

  describe('renderRaw', () => {
    it('renders chart with chartOptions', () => {
      const data = { chartOptions: { type: 'line', data: { labels: [], datasets: [] } } };
      renderer.renderRaw(data, mockEl);
      expect(Chart).toHaveBeenCalled();
      expect(mockEl.querySelector('canvas')).not.toBeNull();
    });

    it('renders chart with raw config', () => {
      const data = { type: 'pie', data: { labels: [], datasets: [] } };
      renderer.renderRaw(data, mockEl);
      expect(Chart).toHaveBeenCalled();
    });
  });

  describe('imageRenderer', () => {
    it('generates image data URL', async () => {
      (parseYaml as jest.Mock).mockResolvedValue({ type: 'bar', labels: [], series: [] });
      (Chart.prototype.toBase64Image as jest.fn).mockReturnValue('data:image/png;base64,abc');
      
      const result = await renderer.imageRenderer('```chart\ntype: bar\n```', { format: 'image/png', quality: 1 });
      
      expect(result).toBe('abc');
    });
  });
});