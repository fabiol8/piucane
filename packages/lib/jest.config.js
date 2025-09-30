const { resolve } = require('path');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: resolve(__dirname),
  clearMocks: true,
  testMatch: [
    '<rootDir>/**/__tests__/**/*.spec.ts',
    '<rootDir>/**/?(*.)+(spec|test).ts'
  ],
  moduleNameMapper: {
    '^@piucane/lib/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!**/__tests__/**'
  ]
};
