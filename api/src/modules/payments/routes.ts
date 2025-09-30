/**
 * Payment Service Routes
 * RESTful API endpoints for payment processing
 */

import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import {
  createPaymentIntent,
  addPaymentMethod,
  processRefund,
  handleWebhook,
  retryFailedPayment,
  getPaymentAnalytics
} from './controller';

const router = Router();

// Payment Intent Management
router.post('/intents', authMiddleware, createPaymentIntent);
router.post('/intents/:id/retry', authMiddleware, retryFailedPayment);

// Payment Method Management
router.post('/methods', authMiddleware, addPaymentMethod);

// Refund Processing
router.post('/refunds', authMiddleware, processRefund);

// Webhook Handling (no auth required - Stripe handles verification)
router.post('/webhook', handleWebhook);

// Analytics and Reporting
router.get('/analytics', authMiddleware, getPaymentAnalytics);

export default router;