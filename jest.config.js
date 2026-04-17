/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'js', 'mjs'],
  testMatch: ['**/tests/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'jest.tsconfig.json'
    }]
  },
  moduleNameMapper: {
    '^obsidian$': '<rootDir>/__mocks__/obsidian.js',
    '^./date-adapter/chartjs-adapter-moment.esm.js$': '<rootDir>/__mocks__/date-adapter.js',
    '^chart\\.js(/.*)?$': '<rootDir>/__mocks__/chart.js',
    '^chartjs-chart-sankey$': '<rootDir>/__mocks__/chartjs-chart-sankey.js',
    '^chartjs-plugin-annotation$': '<rootDir>/__mocks__/chartjs-plugin-annotation.js',
    '^chroma-js$': '<rootDir>/node_modules/chroma-js',
    '^markdown-tables-to-json$': '<rootDir>/node_modules/markdown-tables-to-json',
    '^vanilla-picker$': '<rootDir>/__mocks__/vanilla-picker.js',
    '\\.svelte$': '<rootDir>/__mocks__/svelte.js',
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!chart\\.js|chroma-js|markdown-tables-to-json|vanilla-picker)/'
  ],
  roots: ['<rootDir>/src', '<rootDir>/tests']
};

module.exports = config;