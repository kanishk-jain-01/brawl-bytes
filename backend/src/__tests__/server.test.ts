/**
 * Basic test to verify Jest setup is working for backend
 */
import request from 'supertest';
import { app, server } from '../server';

// Properly close server after tests
afterAll(done => {
  server.close(done);
});

describe('Backend Jest Setup', () => {
  it('should run basic tests', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have test environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('should support async tests', async () => {
    const result = await Promise.resolve('test');
    expect(result).toBe('test');
  });

  it('should have custom matcher', () => {
    const socketId = 'test-socket-123';
    expect(socketId).toBeValidSocketId();
  });
});

describe('Health Endpoint', () => {
  it('should return health status', async () => {
    const response = await request(app).get('/health').expect(200);

    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('service', 'brawl-bytes-backend');
    expect(response.body).toHaveProperty('timestamp');
  });
});
