/**
 * Mock for chartjs-chart-financial module
 * ESM-only package, provides CandlestickController, CandlestickElement, OhlcController, OhlcElement
 */

const CandlestickController = {
  id: 'candlestick',
  defaults: {},
  descriptors: {},
};

const CandlestickElement = {
  id: 'candlestickElement',
};

const OhlcController = {
  id: 'ohlc',
  defaults: {},
  descriptors: {},
};

const OhlcElement = {
  id: 'ohlcElement',
};

module.exports = {
  CandlestickController,
  CandlestickElement,
  OhlcController,
  OhlcElement,
};
