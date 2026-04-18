/**
 * Mock for chart.js v4 module
 * chart.js v4 has a different structure: registerables is an array-like,
 * Chart.defaults has a flatter structure, Chart constructor takes 2 params
 */

const Chart = jest.fn().mockImplementation((_context, _config) => ({
  destroy: jest.fn(),
  toBase64Image: jest.fn().mockReturnValue('data:image/png;base64,mock'),
  data: _config?.data ?? { labels: [], datasets: [] },
  options: _config?.options ?? {},
  config: _config ?? {},
  ctx: _context,
  canvas: { width: 600, height: 300 },
  chartArea: { left: 0, top: 0, right: 600, bottom: 300 },
  getDatasetMeta: jest.fn().mockReturnValue({ data: [] }),
  update: jest.fn(),
  render: jest.fn(),
  resize: jest.fn(),
  reset: jest.fn(),
  clear: jest.fn(),
  stop: jest.fn(),
}));

Chart.defaults = {
  color: '#666',
  font: { family: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif", size: 12, style: 'normal', lineHeight: 1.2, weight: null },
  backgroundColor: 'rgba(0,0,0,0.1)',
  borderColor: 'rgba(0,0,0,0.1)',
  datasets: {},
  devicePixelRatio: 1,
  elements: {},
  events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove'],
  hover: {},
  hoverBackgroundColor: undefined,
  hoverBorderColor: undefined,
  hoverColor: undefined,
  indexAxis: 'x',
  interaction: { mode: 'nearest', intersect: true },
  maintainAspectRatio: true,
  onClick: undefined,
  onHover: undefined,
  parsing: true,
  plugins: {
    legend: { display: true, position: 'top' },
    title: { display: false },
    tooltip: { enabled: true },
    annotation: {},
    filler: {},
  },
  responsive: true,
  scale: {},
  scales: {
    x: {},
    y: {},
    r: {},
  },
  showLine: false,
  animations: {},
  transitions: {},
  layout: { autoPadding: true, padding: { top: 0, right: 0, bottom: 0, left: 0 } },
  drawActiveElementsOnTop: true,
};

Chart.register = jest.fn();
Chart.unregister = jest.fn();

// chart.js v4 registerables is an array-like object with numeric keys
const registerables = {
  0: jest.fn(),
  1: jest.fn(),
  2: jest.fn(),
  3: jest.fn(),
  length: 4,
  [Symbol.iterator]: function*() { for (let i = 0; i < this.length; i++) yield this[i]; }
};

const _adapters = {
  _date: {
    override: jest.fn()
  }
};

const registry = {
  add: jest.fn(),
  remove: jest.fn(),
};

module.exports = {
  Chart,
  registerables,
  _adapters,
  registry,
  // chart.js v4 re-exports these for tree-shaking
  ArcElement: jest.fn(),
  BarElement: jest.fn(),
  LineElement: jest.fn(),
  PointElement: jest.fn(),
  CategoryScale: jest.fn(),
  LinearScale: jest.fn(),
  LogarithmicScale: jest.fn(),
  RadialLinearScale: jest.fn(),
  TimeScale: jest.fn(),
  TimeSeriesScale: jest.fn(),
  BarController: jest.fn(),
  BubbleController: jest.fn(),
  DoughnutController: jest.fn(),
  LineController: jest.fn(),
  PieController: jest.fn(),
  PolarAreaController: jest.fn(),
  RadarController: jest.fn(),
  ScatterController: jest.fn(),
  Filler: jest.fn(),
  Legend: jest.fn(),
  Title: jest.fn(),
  Tooltip: jest.fn(),
  ChartConfiguration: undefined,
  SankeyControllerDatasetOptions: undefined,
};
