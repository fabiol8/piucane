import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import type { Request, Response } from 'express';

const constructEventMock = jest.fn();

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    webhooks: { constructEvent: constructEventMock },
    subscriptions: { retrieve: jest.fn() }
  }));
});

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
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_mock';

const { handleStripeWebhook } = require('../../modules/checkout/controller');

const createResponse = () => {
  const res: Partial<Response> & {
    statusCode?: number;
    payload?: any;
  } = {};

  res.status = jest.fn(function status(this: typeof res, code: number) {
    this.statusCode = code;
    return this as Response;
  }) as any;
  res.json = jest.fn(function json(this: typeof res, payload: any) {
    this.payload = payload;
    return this as Response;
  }) as any;
  res.send = jest.fn(function send(this: typeof res, payload: any) {
    this.payload = payload;
    return this as Response;
  }) as any;

  return res as Response & { statusCode?: number; payload?: any };
};

describe('Stripe webhook handler', () => {
  beforeEach(() => {
    constructEventMock.mockReset();
  });

  it('returns 400 when signature validation fails', async () => {
    constructEventMock.mockImplementation(() => {
      throw new Error('invalid');
    });

    const req = {
      body: Buffer.from('{}'),
      headers: { 'stripe-signature': 'sig' }
    } as unknown as Request;
    const res = createResponse();

    await handleStripeWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('Webhook signature verification failed');
  });

  it('acknowledges supported events', async () => {
    constructEventMock.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_test' } }
    });

    const req = {
      body: Buffer.from('{}'),
      headers: { 'stripe-signature': 'sig' }
    } as unknown as Request;
    const res = createResponse();

    await handleStripeWebhook(req, res);

    expect(res.json).toHaveBeenCalledWith({ received: true });
    expect(res.statusCode ?? 200).toBe(200);
  });
});
