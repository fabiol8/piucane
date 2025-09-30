/**
 * Payment Service Types
 * Enhanced payment processing, validation and analytics
 */

import { z } from 'zod';

// Base payment types
export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethodId: string;
  customerId?: string;
  orderId?: string;
  subscriptionId?: string;
  metadata: Record<string, any>;
  failureCode?: PaymentFailureCode;
  failureMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentMethod {
  id: string;
  customerId: string;
  type: PaymentMethodType;
  brand?: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  billingAddress?: BillingAddress;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentTransaction {
  id: string;
  paymentIntentId: string;
  orderId?: string;
  subscriptionId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  type: PaymentTransactionType;
  paymentMethodId: string;
  customerId: string;
  fees: PaymentFees;
  refundInfo?: RefundInfo;
  chargebackInfo?: ChargebackInfo;
  metadata: Record<string, any>;
  analytics: PaymentAnalytics;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentWebhook {
  id: string;
  eventType: StripeWebhookEventType;
  eventId: string;
  processed: boolean;
  attempts: number;
  lastAttempt?: Date;
  data: any;
  error?: string;
  paymentIntentId?: string;
  customerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentFailure {
  id: string;
  paymentIntentId: string;
  orderId?: string;
  customerId: string;
  failureCode: PaymentFailureCode;
  failureMessage: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  resolved: boolean;
  resolution?: PaymentFailureResolution;
  createdAt: Date;
  updatedAt: Date;
}

// Enums
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELED = 'canceled',
  REQUIRES_PAYMENT_METHOD = 'requires_payment_method',
  REQUIRES_CONFIRMATION = 'requires_confirmation',
  REQUIRES_ACTION = 'requires_action'
}

export enum PaymentMethodType {
  CARD = 'card',
  SEPA_DEBIT = 'sepa_debit',
  IDEAL = 'ideal',
  PAYPAL = 'paypal',
  GOOGLE_PAY = 'google_pay',
  APPLE_PAY = 'apple_pay'
}

export enum PaymentTransactionType {
  PAYMENT = 'payment',
  REFUND = 'refund',
  PARTIAL_REFUND = 'partial_refund',
  CHARGEBACK = 'chargeback',
  SUBSCRIPTION = 'subscription',
  SUBSCRIPTION_RENEWAL = 'subscription_renewal'
}

export enum PaymentFailureCode {
  CARD_DECLINED = 'card_declined',
  INSUFFICIENT_FUNDS = 'insufficient_funds',
  INCORRECT_CVC = 'incorrect_cvc',
  EXPIRED_CARD = 'expired_card',
  PROCESSING_ERROR = 'processing_error',
  AUTHENTICATION_REQUIRED = 'authentication_required',
  CURRENCY_NOT_SUPPORTED = 'currency_not_supported',
  COUNTRY_NOT_SUPPORTED = 'country_not_supported',
  FRAUD_SUSPECTED = 'fraud_suspected',
  NETWORK_ERROR = 'network_error'
}

export enum StripeWebhookEventType {
  PAYMENT_INTENT_SUCCEEDED = 'payment_intent.succeeded',
  PAYMENT_INTENT_PAYMENT_FAILED = 'payment_intent.payment_failed',
  PAYMENT_INTENT_REQUIRES_ACTION = 'payment_intent.requires_action',
  PAYMENT_METHOD_ATTACHED = 'payment_method.attached',
  PAYMENT_METHOD_DETACHED = 'payment_method.detached',
  CHARGE_DISPUTE_CREATED = 'charge.dispute.created',
  INVOICE_PAYMENT_SUCCEEDED = 'invoice.payment_succeeded',
  INVOICE_PAYMENT_FAILED = 'invoice.payment_failed',
  CUSTOMER_SUBSCRIPTION_CREATED = 'customer.subscription.created',
  CUSTOMER_SUBSCRIPTION_UPDATED = 'customer.subscription.updated',
  CUSTOMER_SUBSCRIPTION_DELETED = 'customer.subscription.deleted'
}

export enum PaymentFailureResolution {
  MANUAL_RETRY = 'manual_retry',
  AUTOMATIC_RETRY = 'automatic_retry',
  PAYMENT_METHOD_UPDATED = 'payment_method_updated',
  ORDER_CANCELED = 'order_canceled',
  CUSTOMER_CONTACTED = 'customer_contacted'
}

// Supporting interfaces
export interface BillingAddress {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface PaymentFees {
  stripeFee: number;
  applicationFee: number;
  total: number;
  currency: string;
}

export interface RefundInfo {
  refundId: string;
  amount: number;
  reason: string;
  status: string;
  createdAt: Date;
}

export interface ChargebackInfo {
  chargebackId: string;
  amount: number;
  reason: string;
  status: string;
  createdAt: Date;
}

export interface PaymentAnalytics {
  processingTime: number;
  userAgent?: string;
  ipAddress?: string;
  countryCode?: string;
  fraudScore?: number;
  riskLevel: 'low' | 'medium' | 'high';
  source: 'web' | 'mobile' | 'api';
}

export interface PaymentRecoveryAction {
  id: string;
  paymentFailureId: string;
  action: PaymentRecoveryActionType;
  scheduledFor: Date;
  executed: boolean;
  executedAt?: Date;
  result?: PaymentRecoveryResult;
  metadata: Record<string, any>;
  createdAt: Date;
}

export enum PaymentRecoveryActionType {
  SEND_EMAIL = 'send_email',
  SEND_SMS = 'send_sms',
  RETRY_PAYMENT = 'retry_payment',
  UPDATE_PAYMENT_METHOD = 'update_payment_method',
  CONTACT_SUPPORT = 'contact_support'
}

export interface PaymentRecoveryResult {
  success: boolean;
  error?: string;
  newPaymentIntentId?: string;
  responseCode?: string;
}

// Zod validation schemas
export const CreatePaymentIntentSchema = z.object({
  amount: z.number().positive().min(50), // Minimum 50 cents
  currency: z.string().length(3).default('eur'),
  paymentMethodId: z.string().min(1),
  customerId: z.string().min(1),
  orderId: z.string().optional(),
  subscriptionId: z.string().optional(),
  savePaymentMethod: z.boolean().default(false),
  confirmationMethod: z.enum(['automatic', 'manual']).default('automatic'),
  metadata: z.record(z.string()).default({})
});

export const CreatePaymentMethodSchema = z.object({
  customerId: z.string().min(1),
  paymentMethodId: z.string().min(1),
  isDefault: z.boolean().default(false),
  billingAddress: z.object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().optional(),
    postalCode: z.string().min(1),
    country: z.string().length(2)
  }).optional()
});

export const ProcessRefundSchema = z.object({
  paymentIntentId: z.string().min(1),
  amount: z.number().positive().optional(),
  reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer', 'expired_uncaptured_charge']).default('requested_by_customer'),
  metadata: z.record(z.string()).default({})
});

export const RetryPaymentSchema = z.object({
  paymentFailureId: z.string().min(1),
  paymentMethodId: z.string().min(1).optional(),
  retryReason: z.string().min(1)
});

export const WebhookEventSchema = z.object({
  id: z.string(),
  object: z.literal('event'),
  type: z.nativeEnum(StripeWebhookEventType),
  data: z.object({
    object: z.any()
  }),
  created: z.number(),
  livemode: z.boolean(),
  pending_webhooks: z.number(),
  request: z.object({
    id: z.string().nullable(),
    idempotency_key: z.string().nullable()
  }).nullable()
});

// Service error types
export class PaymentServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'PaymentServiceError';
  }
}

export class PaymentValidationError extends PaymentServiceError {
  constructor(message: string, details?: any) {
    super(message, 'PAYMENT_VALIDATION_ERROR', 400, details);
    this.name = 'PaymentValidationError';
  }
}

export class PaymentProcessingError extends PaymentServiceError {
  constructor(message: string, details?: any) {
    super(message, 'PAYMENT_PROCESSING_ERROR', 402, details);
    this.name = 'PaymentProcessingError';
  }
}

export class PaymentWebhookError extends PaymentServiceError {
  constructor(message: string, details?: any) {
    super(message, 'PAYMENT_WEBHOOK_ERROR', 500, details);
    this.name = 'PaymentWebhookError';
  }
}

// Type exports for validation
export type CreatePaymentIntentRequest = z.infer<typeof CreatePaymentIntentSchema>;
export type CreatePaymentMethodRequest = z.infer<typeof CreatePaymentMethodSchema>;
export type ProcessRefundRequest = z.infer<typeof ProcessRefundSchema>;
export type RetryPaymentRequest = z.infer<typeof RetryPaymentSchema>;
export type WebhookEventRequest = z.infer<typeof WebhookEventSchema>;