/**
 * Mock for chartjs-chart-sankey v0.14 module
 * v0.14 is ESM-first with CJS fallback
 * Exports SankeyController and Flow classes for manual registration
 */

const SankeyController = jest.fn().mockImplementation(function() {
  this.id = 'sankey';
  this.defaults = {};
  this.overrides = {};
});

SankeyController.id = 'sankey';
SankeyController.defaults = {
  dataElementType: 'flow',
  dataElementOptions: ['colorFrom', 'colorTo', 'colorMode', 'alpha'],
  datasets: {
    sankey: {}
  }
};
SankeyController.overrides = {};

const Flow = jest.fn().mockImplementation(function() {
  this.id = 'flow';
  this.x = 0;
  this.y = 0;
  this.width = 0;
  this.height = 0;
});

Flow.id = 'flow';
Flow.defaults = {
  colorFrom: 'red',
  colorTo: 'green',
  colorMode: 'gradient',
  alpha: 0.5,
  hoverColorFrom: jest.fn(),
  hoverColorTo: jest.fn(),
};
Flow.descriptors = { _scriptable: true };

module.exports = {
  SankeyController,
  Flow
};
