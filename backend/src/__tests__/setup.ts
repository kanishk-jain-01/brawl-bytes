// Jest setup file for backend tests
import 'jest';

// This file is for Jest setup only - it should not contain any tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '0'; // Use random port for tests
process.env.FRONTEND_URL = 'http://localhost:3000';

// Mock console methods to reduce noise in tests (optional)
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  // Optionally silence console output during tests
  // console.log = jest.fn();
  // console.error = jest.fn();
});

afterAll(() => {
  // Restore console methods
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidSocketId(): R;
    }
  }
}

// Custom Jest matchers
expect.extend({
  toBeValidSocketId(received: string) {
    const isValid = typeof received === 'string' && received.length > 0;
    return {
      message: () => `expected ${received} to be a valid socket ID`,
      pass: isValid,
    };
  },
});

export {};
