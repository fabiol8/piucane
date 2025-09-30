/**
 * Order Management Types for PiùCane E-commerce Platform
 */

export interface Order {
  id: string;
  userId: string;
  orderNumber: string;
  status: OrderStatus;
  items: OrderItem[];
  pricing: OrderPricing;
  shipping: ShippingDetails;
  payment: PaymentDetails;
  customer: CustomerDetails;
  timeline: OrderTimeline[];
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded'
  | 'returned'
  | 'exchange_requested';

export interface OrderItem {
  id: string;
  productId: string;
  variantId: string;
  name: string;
  description: string;
  image: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  subscription?: SubscriptionDetails;
  personalization?: ItemPersonalization;
  status: OrderItemStatus;
}

export type OrderItemStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export interface SubscriptionDetails {
  id: string;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'bimonthly';
  nextDelivery: string;
  discount: number;
  autoRenew: boolean;
}

export interface ItemPersonalization {
  dogId?: string;
  dosage?: number;
  instructions?: string;
  preferences?: string[];
}

export interface OrderPricing {
  subtotal: number;
  discount: number;
  discountCode?: string;
  shipping: number;
  tax: number;
  total: number;
  currency: string;
  loyaltyPointsUsed?: number;
  loyaltyPointsEarned?: number;
}

export interface ShippingDetails {
  method: ShippingMethod;
  carrier: string;
  trackingNumber?: string;
  estimatedDelivery: string;
  actualDelivery?: string;
  address: ShippingAddress;
  instructions?: string;
  signatureRequired: boolean;
  insurance: boolean;
  weight: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
}

export type ShippingMethod =
  | 'standard'
  | 'express'
  | 'overnight'
  | 'pickup'
  | 'same_day';

export interface ShippingAddress {
  firstName: string;
  lastName: string;
  company?: string;
  street: string;
  streetNumber: string;
  apartment?: string;
  city: string;
  province: string;
  zipCode: string;
  country: string;
  phone?: string;
  email?: string;
  isResidential: boolean;
}

export interface PaymentDetails {
  method: PaymentMethod;
  provider: string;
  transactionId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paidAt?: string;
  refunds?: PaymentRefund[];
  billingAddress: ShippingAddress;
}

export type PaymentMethod =
  | 'credit_card'
  | 'debit_card'
  | 'paypal'
  | 'apple_pay'
  | 'google_pay'
  | 'bank_transfer'
  | 'stripe'
  | 'klarna';

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded';

export interface PaymentRefund {
  id: string;
  amount: number;
  reason: string;
  processedAt: string;
  refundId: string;
}

export interface CustomerDetails {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  loyaltyTier: 'basic' | 'silver' | 'gold' | 'platinum';
  isFirstOrder: boolean;
}

export interface OrderTimeline {
  id: string;
  timestamp: string;
  status: OrderStatus;
  message: string;
  details?: string;
  location?: string;
  updatedBy: 'system' | 'customer' | 'admin' | 'carrier';
  metadata?: Record<string, any>;
}

// Tracking and Returns
export interface TrackingInfo {
  orderId: string;
  trackingNumber: string;
  carrier: string;
  status: TrackingStatus;
  estimatedDelivery: string;
  actualDelivery?: string;
  events: TrackingEvent[];
  currentLocation?: TrackingLocation;
  deliveryAttempts: DeliveryAttempt[];
  specialInstructions?: string;
}

export type TrackingStatus =
  | 'label_created'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'delivery_attempted'
  | 'exception'
  | 'returned';

export interface TrackingEvent {
  id: string;
  timestamp: string;
  status: TrackingStatus;
  location?: TrackingLocation;
  message: string;
  details?: string;
}

export interface TrackingLocation {
  city: string;
  province: string;
  country: string;
  facility?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface DeliveryAttempt {
  id: string;
  attemptNumber: number;
  timestamp: string;
  result: 'successful' | 'failed' | 'rescheduled';
  reason?: string;
  nextAttempt?: string;
  location?: string;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  userId: string;
  items: ReturnItem[];
  reason: ReturnReason;
  description: string;
  photos?: string[];
  status: ReturnStatus;
  returnMethod: 'pickup' | 'drop_off' | 'mail';
  returnLabel?: string;
  tracking?: TrackingInfo;
  refundAmount: number;
  refundMethod: 'original' | 'store_credit' | 'exchange';
  requestedAt: string;
  processedAt?: string;
  completedAt?: string;
  adminNotes?: string;
}

export interface ReturnItem {
  orderItemId: string;
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  condition: 'new' | 'used' | 'damaged' | 'defective';
  photos?: string[];
}

export type ReturnReason =
  | 'defective'
  | 'wrong_item'
  | 'wrong_size'
  | 'not_as_described'
  | 'changed_mind'
  | 'damaged_shipping'
  | 'expired'
  | 'allergic_reaction'
  | 'other';

export type ReturnStatus =
  | 'requested'
  | 'approved'
  | 'rejected'
  | 'pickup_scheduled'
  | 'in_transit'
  | 'received'
  | 'inspected'
  | 'refunded'
  | 'exchanged'
  | 'completed';

// Order statistics and analytics
export interface OrderStats {
  userId: string;
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  ordersByStatus: Record<OrderStatus, number>;
  ordersByMonth: Array<{
    month: string;
    count: number;
    total: number;
  }>;
  favoriteProducts: Array<{
    productId: string;
    name: string;
    orderCount: number;
    totalSpent: number;
  }>;
  returnsRate: number;
  loyaltyPointsEarned: number;
  subscriptionCount: number;
  lastOrderDate?: string;
}

// Filters and search
export interface OrderFilters {
  status?: OrderStatus[];
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  paymentMethod?: PaymentMethod[];
  shippingMethod?: ShippingMethod[];
  hasReturns?: boolean;
  dogId?: string;
  productCategory?: string[];
}

export interface OrderSearchParams {
  query?: string;
  filters?: OrderFilters;
  sortBy?: 'date' | 'amount' | 'status';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface OrderSearchResult {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filters: OrderFilters;
}

// API response types
export interface OrderResponse {
  order: Order;
  tracking?: TrackingInfo;
  returns?: ReturnRequest[];
}

export interface OrderListResponse {
  orders: Order[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  stats: OrderStats;
}

// Form types
export interface ReturnRequestForm {
  orderId: string;
  items: Array<{
    orderItemId: string;
    quantity: number;
    reason: ReturnReason;
    condition: string;
  }>;
  reason: ReturnReason;
  description: string;
  photos?: File[];
  returnMethod: 'pickup' | 'drop_off' | 'mail';
  refundMethod: 'original' | 'store_credit' | 'exchange';
}

export interface OrderUpdateForm {
  shippingAddress?: Partial<ShippingAddress>;
  billingAddress?: Partial<ShippingAddress>;
  specialInstructions?: string;
  deliveryPreferences?: string;
}