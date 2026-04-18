/**
 * Mock for chroma-js v3 module
 * chroma-js v3 is ESM-only, so we mock it for Jest
 * Provides a functional mock that mimics the chroma-js API
 */

const chroma = jest.fn().mockImplementation((color) => {
  const instance = {
    _color: color,
    alpha: jest.fn().mockImplementation((a) => ({
      hex: jest.fn().mockReturnValue(color + Math.round(a * 255).toString(16).padStart(2, '0')),
      rgba: jest.fn().mockReturnValue([255, 0, 0, a]),
      _color: color,
      _alpha: a,
    })),
    hex: jest.fn().mockReturnValue(color),
    rgba: jest.fn().mockReturnValue([255, 0, 0, 1]),
    rgb: jest.fn().mockReturnValue([255, 0, 0]),
    hsl: jest.fn().mockReturnValue([0, 100, 50]),
    name: jest.fn().mockReturnValue('red'),
    luminance: jest.fn().mockReturnValue(0.5),
    darken: jest.fn().mockReturnThis(),
    brighten: jest.fn().mockReturnThis(),
    saturate: jest.fn().mockReturnThis(),
    desaturate: jest.fn().mockReturnThis(),
    mix: jest.fn().mockReturnThis(),
    css: jest.fn().mockReturnValue(color),
  };
  return instance;
});

// Static methods
chroma.version = '3.2.0';
chroma.mix = jest.fn().mockReturnThis();
chroma.average = jest.fn().mockReturnThis();
chroma.bezier = jest.fn().mockReturnThis();
chroma.brewer = {};
chroma.scale = jest.fn().mockReturnValue({
  domain: jest.fn().mockReturnThis(),
  mode: jest.fn().mockReturnThis(),
  colors: jest.fn().mockReturnValue([]),
  padding: jest.fn().mockReturnThis(),
});
chroma.interpolate = jest.fn().mockReturnThis();
chroma.valid = jest.fn().mockReturnValue(true);

module.exports = chroma;
