/**
 * Mock for svelte components
 * Returns a mock component class
 */

const SvelteComponent = jest.fn().mockImplementation(() => ({
  $destroy: jest.fn(),
  $set: jest.fn(),
  $on: jest.fn()
}));

module.exports = SvelteComponent;
