import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{test,spec}.{ts,js}',
    '<rootDir>/src/**/*.{test,spec}.{ts,js}'
  ],
  transform: {
    '^.+\\.(ts|js)$': 'ts-jest'
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/database/(.*)$': '<rootDir>/src/database/$1',
    '^@/game/(.*)$': '<rootDir>/src/game/$1',
    '^@/networking/(.*)$': '<rootDir>/src/networking/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1'
  },
  modulePathIgnorePatterns: ['<rootDir>/src/generated/'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/server.ts',
    '!src/__tests__/**/*'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  // Increase timeout for integration tests
  testTimeout: 10000,
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true
};

export default config;