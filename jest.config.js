/** @type {import('jest').Config} */
module.exports = {
  projects: [
    '<rootDir>/packages/docs-mcp',
    '<rootDir>/packages/network-mcp',
  ],
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    '!packages/*/src/**/*.d.ts',
    '!packages/*/src/**/*.test.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
