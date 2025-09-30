import { describe, expect, it, jest } from '@jest/globals';
import request from 'supertest';

jest.mock('stripe', () => jest.fn().mockImplementation(() => ({
  webhooks: { constructEvent: jest.fn() },
  subscriptions: { retrieve: jest.fn() }
})));

jest.mock('../../config/firebase', () => ({
  initializeFirebase: jest.fn(),
  db: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({ exists: false })
      }))
    })),
    FieldValue: { increment: (value: number) => value }
  },
  auth: {},
  storage: {}
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn()
  }
}));

process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
process.env.NODE_ENV = 'test';

const app = require('../../index').default;

describe('API contract', () => {
  it('GET /health matches documented schema', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: expect.stringMatching(/ok|healthy/i),
      timestamp: expect.any(String)
    });
  });
});
