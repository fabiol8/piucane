module.exports = {
  projects: [
    '<rootDir>/apps/web/jest.config.js',
    '<rootDir>/api/jest.config.js',
    '<rootDir>/packages/lib/jest.config.js'
  ],
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov'],
  collectCoverageFrom: [
    'apps/web/src/**/*.{ts,tsx}',
    'api/src/**/*.ts',
    'packages/lib/src/**/*.ts',
    '!**/__tests__/**'
  ],
  coverageThreshold: {
    global: {
      lines: 80,
      branches: 80,
      statements: 80,
      functions: 80
    }
  }
};
