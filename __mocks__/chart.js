/**
 * Mock for chart.js module
 * Provides minimal implementations for testing
 */

const Chart = jest.fn().mockImplementation(() => ({
  destroy: jest.fn(),
  toBase64Image: jest.fn().mockReturnValue('data:image/png;base64,mock'),
}));

Chart.defaults = {
  color: '',
  font: { family: '' },
  plugins: {},
  layout: { padding: 0 }
};

Chart.register = jest.fn();

const registerables = [];

const _adapters = {
  _date: {
    override: jest.fn()
  }
};

module.exports = {
  Chart,
  registerables,
  _adapters
};
