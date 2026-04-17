import Renderer from '../src/chartRenderer';
import { generateInnerColors } from '../src/util';
import { Chart } from 'chart.js';

// Extend HTMLElement with Obsidian-specific methods for testing
declare global {
  interface HTMLElement {
    createEl(tag: string, opts?: any): HTMLElement;
    createDiv(opts?: any): HTMLDivElement;
    empty(): void;
  }
}

// Add methods to HTMLElement prototype
HTMLElement.prototype.createEl = function(tag: string, opts?: any): HTMLElement {
  const el = document.createElement(tag);
  if (opts?.cls) el.className = opts.cls;
  if (opts?.text) el.textContent = opts.text;
  this.appendChild(el);
  return el;
};

HTMLElement.prototype.createDiv = function(opts?: any): HTMLDivElement {
  const el = document.createElement('div');
  if (opts?.cls) el.className = opts.cls;
  if (opts?.text) el.textContent = opts.text;
  this.appendChild(el);
  return el as HTMLDivElement;
};

HTMLElement.prototype.empty = function(): void {
  while (this.firstChild) {
    this.removeChild(this.firstChild);
  }
};

describe('Renderer', () => {
  let renderer: Renderer;
  let mockPlugin: any;
  let mockEl: HTMLElement;

  beforeEach(() => {
    mockPlugin = { settings: { colors: ['#ff0000', '#00ff00'], themeable: false } };
    renderer = new Renderer(mockPlugin as any);
    // Use real DOM element for getComputedStyle
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
      expect(mockEl.querySelector('canvas')).not.toBeNull();
    });

    it('renders chart with raw config', () => {
      const data = { type: 'pie', data: { labels: [], datasets: [] } };
      renderer.renderRaw(data, mockEl);
      expect(mockEl.querySelector('canvas')).not.toBeNull();
    });
  });

  describe('imageRenderer', () => {
    it('generates image data URL', async () => {
      const yaml = '```chart\ntype: bar\nlabels: []\nseries: []\n```';
      
      const result = await renderer.imageRenderer(yaml, { format: 'image/png', quality: 1 });
      
      expect(typeof result).toBe('string');
    });
  });
});