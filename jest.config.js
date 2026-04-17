/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'js'],
  testMatch: ['**/tests/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }]
  },
  moduleNameMapper: {
    '^obsidian$': '<rootDir>/__mocks__/obsidian.js',
    '^chart\\.js(/.*)?$': '<rootDir>/node_modules/chart.js',
    '^chroma-js$': '<rootDir>/node_modules/chroma-js',
    '^markdown-tables-to-json$': '<rootDir>/node_modules/markdown-tables-to-json',
    '^vanilla-picker$': '<rootDir>/node_modules/vanilla-picker',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!chart\\.js|chroma-js|markdown-tables-to-json|vanilla-picker)/'
  ]
};

module.exports = config;