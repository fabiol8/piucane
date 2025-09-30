/**
 * Payment Service Controller
 * Enhanced payment processing with Stripe integration
 */

import { Request, Response } from 'express';
import { auth, db } from '../../config/firebase';
import Stripe from 'stripe';
import {
  CreatePaymentIntentSchema,
  CreatePaymentMethodSchema,
  ProcessRefundSchema,
  RetryPaymentSchema,
  WebhookEventSchema,
  PaymentIntent,
  PaymentMethod,
  PaymentTransaction,
  PaymentWebhook,
  PaymentFailure,
  PaymentStatus,
  PaymentMethodType,
  PaymentTransactionType,
  PaymentFailureCode,
  StripeWebhookEventType,
  PaymentFailureResolution,
  PaymentRecoveryActionType,
  PaymentServiceError,
  PaymentValidationError,
  PaymentProcessingError,
  PaymentWebhookError
} from './types';
import { trackAnalyticsEvent } from '../../utils/analytics';
import { logger } from '../../utils/logger';

// Initialize Stripe with enhanced configuration
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
  timeout: 30000, // 30 seconds
  maxNetworkRetries: 3
});

// Webhook signature verification
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

/**
 * Create a payment intent with enhanced security and validation
 */
export const createPaymentIntent = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Non autorizzato' });
    }

    const validatedData = CreatePaymentIntentSchema.parse(req.body);

    // Validate customer exists and payment method belongs to customer
    const customerDoc = await db.collection('customers').doc(validatedData.customerId).get();
    if (!customerDoc.exists) {
      throw new PaymentValidationError('Cliente non trovato');
    }

    // Additional fraud checks
    const fraudScore = await calculateFraudScore(req, validatedData);
    if (fraudScore > 0.8) {
      throw new PaymentProcessingError('Transazione rifiutata per sospetta frode');
    }

    // Create Stripe payment intent with enhanced metadata
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(validatedData.amount),
      currency: validatedData.currency,
      payment_method: validatedData.paymentMethodId,
      customer: validatedData.customerId,
      confirmation_method: validatedData.confirmationMethod,
      setup_future_usage: validatedData.savePaymentMethod ? 'off_session' : undefined,
      metadata: {
        ...validatedData.metadata,
        userId,
        orderId: validatedData.orderId || '',
        subscriptionId: validatedData.subscriptionId || '',
        fraudScore: fraudScore.toString(),
        source: 'piucane_api'
      }
    });

    // Store payment intent in Firebase
    const paymentIntentDoc: PaymentIntent = {
      id: paymentIntent.id,
      amount: validatedData.amount,
      currency: validatedData.currency,
      status: paymentIntent.status as PaymentStatus,
      paymentMethodId: validatedData.paymentMethodId,
      customerId: validatedData.customerId,
      orderId: validatedData.orderId,
      subscriptionId: validatedData.subscriptionId,
      metadata: paymentIntent.metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection('paymentIntents').doc(paymentIntent.id).set(paymentIntentDoc);

    // Track analytics
    await trackAnalyticsEvent('payment_intent_created', {
      payment_intent_id: paymentIntent.id,
      amount: validatedData.amount,
      currency: validatedData.currency,
      customer_id: validatedData.customerId,
      fraud_score: fraudScore
    });

    logger.info('Payment intent created', {
      paymentIntentId: paymentIntent.id,
      customerId: validatedData.customerId,
      amount: validatedData.amount
    });

    res.json({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret
      }
    });
  } catch (error) {
    logger.error('Error creating payment intent', { error });

    if (error instanceof PaymentServiceError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: error.code
      });
    }

    res.status(500).json({
      success: false,
      error: 'Errore interno del server'
    });
  }
};

/**
 * Add payment method with enhanced validation
 */
export const addPaymentMethod = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Non autorizzato' });
    }

    const validatedData = CreatePaymentMethodSchema.parse(req.body);

    // Attach payment method to customer
    await stripe.paymentMethods.attach(validatedData.paymentMethodId, {
      customer: validatedData.customerId
    });

    // Get payment method details
    const paymentMethod = await stripe.paymentMethods.retrieve(validatedData.paymentMethodId);

    // Set as default if requested
    if (validatedData.isDefault) {
      await stripe.customers.update(validatedData.customerId, {
        invoice_settings: {
          default_payment_method: validatedData.paymentMethodId
        }
      });
    }

    // Store in Firebase
    const paymentMethodDoc: PaymentMethod = {
      id: paymentMethod.id,
      customerId: validatedData.customerId,
      type: paymentMethod.type as PaymentMethodType,
      brand: paymentMethod.card?.brand,
      last4: paymentMethod.card?.last4,
      expiryMonth: paymentMethod.card?.exp_month,
      expiryYear: paymentMethod.card?.exp_year,
      isDefault: validatedData.isDefault,
      billingAddress: validatedData.billingAddress,
      metadata: paymentMethod.metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection('paymentMethods').doc(paymentMethod.id).set(paymentMethodDoc);

    // Track analytics
    await trackAnalyticsEvent('payment_method_attached', {
      payment_method_id: paymentMethod.id,
      customer_id: validatedData.customerId,
      type: paymentMethod.type,
      brand: paymentMethod.card?.brand,
      is_default: validatedData.isDefault
    });

    res.json({
      success: true,
      paymentMethod: paymentMethodDoc
    });
  } catch (error) {
    logger.error('Error adding payment method', { error });
    res.status(500).json({
      success: false,
      error: 'Errore nell\'aggiunta del metodo di pagamento'
    });
  }
};

/**
 * Process refund with tracking and analytics
 */
export const processRefund = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Non autorizzato' });
    }

    const validatedData = ProcessRefundSchema.parse(req.body);

    // Get original payment intent
    const paymentIntentDoc = await db.collection('paymentIntents').doc(validatedData.paymentIntentId).get();
    if (!paymentIntentDoc.exists) {
      throw new PaymentValidationError('Payment intent non trovato');
    }

    const paymentIntent = paymentIntentDoc.data() as PaymentIntent;

    // Process refund through Stripe
    const refund = await stripe.refunds.create({
      payment_intent: validatedData.paymentIntentId,
      amount: validatedData.amount,
      reason: validatedData.reason,
      metadata: {
        ...validatedData.metadata,
        processedBy: userId,
        originalAmount: paymentIntent.amount.toString()
      }
    });

    // Create transaction record
    const transactionDoc: PaymentTransaction = {
      id: refund.id,
      paymentIntentId: validatedData.paymentIntentId,
      orderId: paymentIntent.orderId,
      subscriptionId: paymentIntent.subscriptionId,
      amount: refund.amount,
      currency: refund.currency,
      status: refund.status as PaymentStatus,
      type: PaymentTransactionType.REFUND,
      paymentMethodId: paymentIntent.paymentMethodId,
      customerId: paymentIntent.customerId!,
      fees: {
        stripeFee: 0,
        applicationFee: 0,
        total: 0,
        currency: refund.currency
      },
      refundInfo: {
        refundId: refund.id,
        amount: refund.amount,
        reason: validatedData.reason,
        status: refund.status,
        createdAt: new Date()
      },
      metadata: refund.metadata,
      analytics: {
        processingTime: 0,
        riskLevel: 'low',
        source: 'api'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection('paymentTransactions').doc(refund.id).set(transactionDoc);

    // Track analytics
    await trackAnalyticsEvent('refund_processed', {
      refund_id: refund.id,
      payment_intent_id: validatedData.paymentIntentId,
      amount: refund.amount,
      reason: validatedData.reason
    });

    res.json({
      success: true,
      refund: {
        id: refund.id,
        amount: refund.amount,
        status: refund.status
      }
    });
  } catch (error) {
    logger.error('Error processing refund', { error });
    res.status(500).json({
      success: false,
      error: 'Errore nell\'elaborazione del rimborso'
    });
  }
};

/**
 * Handle Stripe webhooks with comprehensive event processing
 */
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      logger.error('Webhook signature verification failed', { error: err });
      return res.status(400).send('Webhook signature verification failed');
    }

    // Validate event structure
    const validatedEvent = WebhookEventSchema.parse(event);

    // Check for duplicate processing
    const existingWebhook = await db.collection('paymentWebhooks').doc(event.id).get();
    if (existingWebhook.exists && existingWebhook.data()?.processed) {
      logger.info('Webhook already processed', { eventId: event.id });
      return res.json({ received: true });
    }

    // Store webhook record
    const webhookDoc: PaymentWebhook = {
      id: event.id,
      eventType: event.type as StripeWebhookEventType,
      eventId: event.id,
      processed: false,
      attempts: 1,
      data: event.data,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection('paymentWebhooks').doc(event.id).set(webhookDoc);

    // Process event based on type
    await processWebhookEvent(event);

    // Mark as processed
    await db.collection('paymentWebhooks').doc(event.id).update({
      processed: true,
      updatedAt: new Date()
    });

    res.json({ received: true });
  } catch (error) {
    logger.error('Error processing webhook', { error });

    // Update webhook with error
    if (req.body && req.headers['stripe-signature']) {
      try {
        const event = stripe.webhooks.constructEvent(
          req.body,
          req.headers['stripe-signature'] as string,
          webhookSecret
        );

        await db.collection('paymentWebhooks').doc(event.id).update({
          error: error instanceof Error ? error.message : 'Unknown error',
          attempts: db.FieldValue.increment(1),
          lastAttempt: new Date(),
          updatedAt: new Date()
        });
      } catch (e) {
        // Ignore if we can't parse the event
      }
    }

    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

/**
 * Retry failed payment with enhanced recovery logic
 */
export const retryFailedPayment = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Non autorizzato' });
    }

    const validatedData = RetryPaymentSchema.parse(req.body);

    // Get payment failure record
    const failureDoc = await db.collection('paymentFailures').doc(validatedData.paymentFailureId).get();
    if (!failureDoc.exists) {
      throw new PaymentValidationError('Payment failure non trovato');
    }

    const failure = failureDoc.data() as PaymentFailure;

    // Check retry limits
    if (failure.retryCount >= failure.maxRetries) {
      throw new PaymentProcessingError('Numero massimo di tentativi raggiunto');
    }

    // Get original payment intent
    const originalPaymentIntent = await stripe.paymentIntents.retrieve(failure.paymentIntentId);

    // Create new payment intent with updated payment method
    const newPaymentIntent = await stripe.paymentIntents.create({
      amount: originalPaymentIntent.amount,
      currency: originalPaymentIntent.currency,
      payment_method: validatedData.paymentMethodId || originalPaymentIntent.payment_method as string,
      customer: originalPaymentIntent.customer as string,
      confirmation_method: 'manual',
      confirm: true,
      metadata: {
        ...originalPaymentIntent.metadata,
        retryAttempt: (failure.retryCount + 1).toString(),
        originalPaymentIntentId: failure.paymentIntentId,
        retryReason: validatedData.retryReason
      }
    });

    // Update failure record
    await db.collection('paymentFailures').doc(validatedData.paymentFailureId).update({
      retryCount: failure.retryCount + 1,
      resolved: newPaymentIntent.status === 'succeeded',
      resolution: newPaymentIntent.status === 'succeeded' ? PaymentFailureResolution.MANUAL_RETRY : undefined,
      updatedAt: new Date()
    });

    // Track analytics
    await trackAnalyticsEvent('payment_retry_attempted', {
      failure_id: validatedData.paymentFailureId,
      new_payment_intent_id: newPaymentIntent.id,
      retry_count: failure.retryCount + 1,
      success: newPaymentIntent.status === 'succeeded'
    });

    res.json({
      success: true,
      paymentIntent: {
        id: newPaymentIntent.id,
        status: newPaymentIntent.status,
        clientSecret: newPaymentIntent.client_secret
      }
    });
  } catch (error) {
    logger.error('Error retrying payment', { error });
    res.status(500).json({
      success: false,
      error: 'Errore nel tentativo di pagamento'
    });
  }
};

/**
 * Get payment analytics and metrics
 */
export const getPaymentAnalytics = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    const analytics = await generatePaymentAnalytics({
      startDate: startDate as string,
      endDate: endDate as string,
      groupBy: groupBy as string
    });

    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    logger.error('Error getting payment analytics', { error });
    res.status(500).json({
      success: false,
      error: 'Errore nel recupero delle analisi'
    });
  }
};

// Helper functions

/**
 * Calculate fraud score based on various factors
 */
async function calculateFraudScore(req: Request, data: any): Promise<number> {
  let score = 0;

  // IP-based checks
  const ipAddress = req.ip;
  // Add IP reputation checks, geolocation validation, etc.

  // Amount-based checks
  if (data.amount > 100000) score += 0.3; // Large amounts are riskier
  if (data.amount < 100) score += 0.1; // Very small amounts can be testing

  // Time-based checks
  const hour = new Date().getHours();
  if (hour < 6 || hour > 22) score += 0.1; // Unusual hours

  // Customer history checks
  // Add checks for customer payment history, velocity, etc.

  return Math.min(score, 1.0);
}

/**
 * Process webhook events based on type
 */
async function processWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;

    case 'payment_intent.payment_failed':
      await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
      break;

    case 'payment_method.attached':
      await handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
      break;

    case 'charge.dispute.created':
      await handleChargeDisputeCreated(event.data.object as Stripe.Dispute);
      break;

    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;

    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    default:
      logger.info('Unhandled webhook event type', { type: event.type });
  }
}

/**
 * Handle successful payment intent
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  // Update payment intent status
  await db.collection('paymentIntents').doc(paymentIntent.id).update({
    status: PaymentStatus.SUCCEEDED,
    updatedAt: new Date()
  });

  // Create transaction record
  const transactionDoc: PaymentTransaction = {
    id: `tx_${paymentIntent.id}`,
    paymentIntentId: paymentIntent.id,
    orderId: paymentIntent.metadata.orderId || undefined,
    subscriptionId: paymentIntent.metadata.subscriptionId || undefined,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    status: PaymentStatus.SUCCEEDED,
    type: PaymentTransactionType.PAYMENT,
    paymentMethodId: paymentIntent.payment_method as string,
    customerId: paymentIntent.customer as string,
    fees: {
      stripeFee: Math.round(paymentIntent.amount * 0.029 + 30), // Estimate
      applicationFee: 0,
      total: Math.round(paymentIntent.amount * 0.029 + 30),
      currency: paymentIntent.currency
    },
    metadata: paymentIntent.metadata,
    analytics: {
      processingTime: 0,
      riskLevel: 'low',
      source: 'webhook'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await db.collection('paymentTransactions').doc(transactionDoc.id).set(transactionDoc);

  // Track analytics
  await trackAnalyticsEvent('payment_succeeded', {
    payment_intent_id: paymentIntent.id,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency
  });
}

/**
 * Handle failed payment intent
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  const lastPaymentError = paymentIntent.last_payment_error;

  // Update payment intent status
  await db.collection('paymentIntents').doc(paymentIntent.id).update({
    status: PaymentStatus.FAILED,
    failureCode: lastPaymentError?.code as PaymentFailureCode,
    failureMessage: lastPaymentError?.message,
    updatedAt: new Date()
  });

  // Create payment failure record
  const failureDoc: PaymentFailure = {
    id: `fail_${paymentIntent.id}`,
    paymentIntentId: paymentIntent.id,
    orderId: paymentIntent.metadata.orderId || undefined,
    customerId: paymentIntent.customer as string,
    failureCode: (lastPaymentError?.code as PaymentFailureCode) || PaymentFailureCode.PROCESSING_ERROR,
    failureMessage: lastPaymentError?.message || 'Unknown error',
    retryCount: 0,
    maxRetries: 3,
    resolved: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await db.collection('paymentFailures').doc(failureDoc.id).set(failureDoc);

  // Schedule recovery actions
  await schedulePaymentRecovery(failureDoc);

  // Track analytics
  await trackAnalyticsEvent('payment_failed', {
    payment_intent_id: paymentIntent.id,
    failure_code: failureDoc.failureCode,
    failure_message: failureDoc.failureMessage
  });
}

/**
 * Handle payment method attached
 */
async function handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
  // Track analytics
  await trackAnalyticsEvent('payment_method_attached_webhook', {
    payment_method_id: paymentMethod.id,
    customer_id: paymentMethod.customer,
    type: paymentMethod.type
  });
}

/**
 * Handle charge dispute created
 */
async function handleChargeDisputeCreated(dispute: Stripe.Dispute): Promise<void> {
  // Handle chargeback logic
  logger.warn('Chargeback created', {
    disputeId: dispute.id,
    chargeId: dispute.charge,
    amount: dispute.amount,
    reason: dispute.reason
  });

  // Track analytics
  await trackAnalyticsEvent('chargeback_created', {
    dispute_id: dispute.id,
    charge_id: dispute.charge,
    amount: dispute.amount,
    reason: dispute.reason
  });
}

/**
 * Handle successful invoice payment
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  // Handle subscription renewal success
  await trackAnalyticsEvent('subscription_payment_succeeded', {
    invoice_id: invoice.id,
    subscription_id: invoice.subscription,
    amount: invoice.amount_paid
  });
}

/**
 * Handle failed invoice payment
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  // Handle subscription payment failure
  await trackAnalyticsEvent('subscription_payment_failed', {
    invoice_id: invoice.id,
    subscription_id: invoice.subscription,
    amount: invoice.amount_due
  });
}

/**
 * Schedule payment recovery actions
 */
async function schedulePaymentRecovery(failure: PaymentFailure): Promise<void> {
  // Schedule email notification
  const emailAction = {
    id: `recovery_email_${failure.id}`,
    paymentFailureId: failure.id,
    action: PaymentRecoveryActionType.SEND_EMAIL,
    scheduledFor: new Date(Date.now() + 1000 * 60 * 60), // 1 hour
    executed: false,
    metadata: { template: 'payment_failed' },
    createdAt: new Date()
  };

  // Schedule retry
  const retryAction = {
    id: `recovery_retry_${failure.id}`,
    paymentFailureId: failure.id,
    action: PaymentRecoveryActionType.RETRY_PAYMENT,
    scheduledFor: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours
    executed: false,
    metadata: {},
    createdAt: new Date()
  };

  await Promise.all([
    db.collection('paymentRecoveryActions').doc(emailAction.id).set(emailAction),
    db.collection('paymentRecoveryActions').doc(retryAction.id).set(retryAction)
  ]);
}

/**
 * Generate payment analytics
 */
async function generatePaymentAnalytics(params: {
  startDate: string;
  endDate: string;
  groupBy: string;
}): Promise<any> {
  // Implement analytics aggregation logic
  // This would typically involve querying payment transactions and aggregating by time periods

  return {
    totalRevenue: 0,
    totalTransactions: 0,
    averageOrderValue: 0,
    successRate: 0,
    topFailureReasons: [],
    dailyBreakdown: []
  };
}