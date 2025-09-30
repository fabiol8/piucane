const { resolve } = require('path');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: resolve(__dirname),
  clearMocks: true,
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.spec.ts',
    '<rootDir>/src/**/?(*.)+(spec|test).ts'
  ],
  moduleNameMapper: {
    '^@/api/(.*)$': '<rootDir>/src/$1'
  },
  setupFilesAfterEnv: [],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/__tests__/**'
  ]
};
