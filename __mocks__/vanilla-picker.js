/**
 * Mock for vanilla-picker module
 */

const Picker = jest.fn().mockImplementation(() => ({
  on: jest.fn(),
  setOptions: jest.fn(),
  openHandler: jest.fn(),
  closeHandler: jest.fn()
}));

module.exports = Picker;
