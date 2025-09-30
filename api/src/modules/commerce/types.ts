/**
 * Commerce Service Types & Validation Schemas
 * Comprehensive type definitions for e-commerce, products, orders, payments, and subscriptions
 */

import { z } from 'zod';

// ===============================
// Product Management Types
// ===============================

export const ProductFormatSchema = z.object({
  id: z.string().uuid(),
  size: z.string().min(1, 'Formato richiesto'),
  weight: z.number().min(0.1, 'Peso deve essere positivo'),
  price: z.number().min(0.01, 'Prezzo deve essere positivo'),
  subscriberPrice: z.number().min(0.01, 'Prezzo abbonato deve essere positivo'),
  inStock: z.boolean().default(true),
  stockLevel: z.number().min(0).default(0),
  sku: z.string().min(1, 'SKU richiesto'),
  barcode: z.string().optional()
});

export const FeedingGuidelineSchema = z.object({
  weight: z.number().min(0.1, 'Peso deve essere positivo'), // kg
  dailyAmount: z.number().min(1, 'Quantità giornaliera richiesta'), // grams
  notes: z.string().optional()
});

export const ProductSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Nome prodotto richiesto').max(200),
  brand: z.string().min(1, 'Brand richiesto').max(100),
  category: z.enum([
    'food', 'treats', 'health', 'supplements', 'toys', 'accessories',
    'hygiene', 'training', 'travel', 'safety'
  ]),
  subcategory: z.string().max(100).optional(),
  shortDescription: z.string().min(10).max(300),
  longDescription: z.string().min(50).max(2000),
  images: z.array(z.string().url()).min(1, 'Almeno un\'immagine richiesta'),
  formats: z.array(ProductFormatSchema).min(1, 'Almeno un formato richiesto'),

  // Nutritional & Suitability Info
  ingredients: z.array(z.string()).default([]),
  allergens: z.array(z.string()).default([]),
  nutritionalInfo: z.object({
    protein: z.number().min(0).max(100).optional(),
    fat: z.number().min(0).max(100).optional(),
    fiber: z.number().min(0).max(100).optional(),
    moisture: z.number().min(0).max(100).optional(),
    calories: z.number().min(0).optional()
  }).optional(),

  feedingGuidelines: z.array(FeedingGuidelineSchema).default([]),

  suitableFor: z.object({
    ageMin: z.number().min(0).optional(), // months
    ageMax: z.number().min(0).optional(), // months
    weightMin: z.number().min(0).optional(), // kg
    weightMax: z.number().min(0).optional(), // kg
    breeds: z.array(z.string()).default([]),
    conditions: z.array(z.string()).default([]),
    activityLevels: z.array(z.enum(['low', 'medium', 'high'])).default([])
  }).default({}),

  // Marketing & Reviews
  rating: z.number().min(0).max(5).default(0),
  reviewCount: z.number().min(0).default(0),
  tags: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),

  // Metadata
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  createdBy: z.string().uuid().optional()
});

export const CreateProductSchema = ProductSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const UpdateProductSchema = ProductSchema.partial().omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// ===============================
// Cart & Order Management Types
// ===============================

export const CartItemSchema = z.object({
  id: z.string().uuid().optional(),
  productId: z.string().uuid('Product ID deve essere un UUID valido'),
  formatId: z.string().uuid('Format ID deve essere un UUID valido'),
  quantity: z.number().min(1, 'Quantità deve essere almeno 1').max(99, 'Quantità massima 99'),
  isSubscription: z.boolean().default(false),
  subscriptionFrequency: z.enum(['weekly', 'biweekly', 'monthly', 'quarterly']).optional(),
  customizations: z.object({
    dogId: z.string().uuid().optional(),
    personalizedDosage: z.object({
      dailyAmount: z.number().min(1),
      duration: z.number().min(1)
    }).optional(),
    giftMessage: z.string().max(500).optional(),
    deliveryInstructions: z.string().max(500).optional()
  }).default({}),
  addedAt: z.string().optional()
});

export const ShippingAddressSchema = z.object({
  name: z.string().min(1, 'Nome richiesto').max(100),
  company: z.string().max(100).optional(),
  street: z.string().min(1, 'Indirizzo richiesto').max(200),
  city: z.string().min(1, 'Città richiesta').max(100),
  state: z.string().min(1, 'Provincia richiesta').max(50),
  postalCode: z.string().min(5, 'CAP non valido').max(10),
  country: z.string().min(2).max(2).default('IT'),
  phone: z.string().min(8).max(20).optional(),
  isDefault: z.boolean().default(false),
  type: z.enum(['home', 'work', 'other']).default('home')
});

export const OrderItemSchema = z.object({
  productId: z.string().uuid(),
  formatId: z.string().uuid(),
  quantity: z.number().min(1),
  unitPrice: z.number().min(0),
  total: z.number().min(0),
  name: z.string(),
  image: z.string().url().optional(),
  isSubscription: z.boolean().default(false),
  subscriptionFrequency: z.enum(['weekly', 'biweekly', 'monthly', 'quarterly']).optional(),
  customizations: z.object({
    dogId: z.string().uuid().optional(),
    personalizedDosage: z.object({
      dailyAmount: z.number(),
      duration: z.number()
    }).optional(),
    giftMessage: z.string().optional(),
    deliveryInstructions: z.string().optional()
  }).default({})
});

export const OrderBillingSchema = z.object({
  subtotal: z.number().min(0),
  discount: z.number().min(0).default(0),
  shipping: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  total: z.number().min(0),
  currency: z.string().min(3).max(3).default('EUR')
});

export const OrderSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid('User ID deve essere un UUID valido'),
  orderNumber: z.string().optional(), // Auto-generated
  items: z.array(OrderItemSchema).min(1, 'Almeno un prodotto richiesto'),
  shippingAddress: ShippingAddressSchema,
  billing: OrderBillingSchema,

  // Payment Info
  paymentMethodId: z.string().optional(),
  paymentIntentId: z.string().optional(),
  paymentStatus: z.enum(['pending', 'processing', 'succeeded', 'failed', 'cancelled']).default('pending'),

  // Order Status
  status: z.enum(['draft', 'confirmed', 'processing', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded']).default('draft'),

  // Shipping & Tracking
  shippingMethod: z.enum(['standard', 'express', 'pickup']).default('standard'),
  trackingNumber: z.string().optional(),
  trackingCarrier: z.string().optional(),
  estimatedDelivery: z.string().optional(),
  actualDelivery: z.string().optional(),

  // Discounts & Promotions
  discountCode: z.string().optional(),
  discountAmount: z.number().min(0).default(0),
  loyaltyPointsUsed: z.number().min(0).default(0),
  loyaltyPointsEarned: z.number().min(0).default(0),

  // Metadata
  notes: z.string().max(1000).optional(),
  internalNotes: z.string().max(1000).optional(),
  source: z.enum(['web', 'mobile', 'admin', 'subscription']).default('web'),

  // Timestamps
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  confirmedAt: z.string().optional(),
  shippedAt: z.string().optional(),
  deliveredAt: z.string().optional(),
  cancelledAt: z.string().optional()
});

export const CreateOrderSchema = z.object({
  items: z.array(CartItemSchema),
  shippingAddress: ShippingAddressSchema,
  paymentMethodId: z.string().min(1, 'Metodo di pagamento richiesto'),
  shippingMethod: z.enum(['standard', 'express', 'pickup']).default('standard'),
  discountCode: z.string().optional(),
  loyaltyPointsToUse: z.number().min(0).default(0),
  notes: z.string().max(1000).optional()
});

// ===============================
// Subscription Management Types
// ===============================

export const SubscriptionSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid('User ID deve essere un UUID valido'),
  orderId: z.string().uuid().optional(), // Reference to original order
  productId: z.string().uuid('Product ID deve essere un UUID valido'),
  formatId: z.string().uuid('Format ID deve essere un UUID valido'),
  quantity: z.number().min(1),

  // Subscription Details
  frequency: z.enum(['weekly', 'biweekly', 'monthly', 'quarterly']),
  status: z.enum(['active', 'paused', 'cancelled', 'failed']).default('active'),

  // Pricing
  unitPrice: z.number().min(0),
  discountPercentage: z.number().min(0).max(100).default(15), // Default subscription discount

  // Delivery Info
  shippingAddress: ShippingAddressSchema,
  nextDelivery: z.string(),
  lastDelivery: z.string().optional(),
  deliveryCount: z.number().min(0).default(0),

  // Customizations
  dogId: z.string().uuid().optional(),
  personalizedDosage: z.object({
    dailyAmount: z.number(),
    duration: z.number()
  }).optional(),

  // Payment Info
  paymentMethodId: z.string(),

  // Management
  pausedUntil: z.string().optional(),
  cancelReason: z.string().optional(),
  notes: z.string().max(1000).optional(),

  // Timestamps
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  cancelledAt: z.string().optional()
});

export const CreateSubscriptionSchema = SubscriptionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deliveryCount: true,
  lastDelivery: true
});

export const UpdateSubscriptionSchema = z.object({
  quantity: z.number().min(1).optional(),
  frequency: z.enum(['weekly', 'biweekly', 'monthly', 'quarterly']).optional(),
  shippingAddress: ShippingAddressSchema.optional(),
  nextDelivery: z.string().optional(),
  paymentMethodId: z.string().optional(),
  personalizedDosage: z.object({
    dailyAmount: z.number(),
    duration: z.number()
  }).optional(),
  notes: z.string().max(1000).optional()
});

// ===============================
// Payment & Discount Types
// ===============================

export const PaymentMethodSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid('User ID deve essere un UUID valido'),
  stripePaymentMethodId: z.string(),
  type: z.enum(['card', 'sepa_debit', 'paypal']),
  isDefault: z.boolean().default(false),

  // Card Details (for display only)
  cardBrand: z.string().optional(),
  cardLast4: z.string().optional(),
  cardExpMonth: z.number().optional(),
  cardExpYear: z.number().optional(),

  // Metadata
  isActive: z.boolean().default(true),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export const DiscountCodeSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(3).max(20).toUpperCase(),
  type: z.enum(['percentage', 'fixed_amount', 'free_shipping']),
  value: z.number().min(0),

  // Usage Restrictions
  minOrderAmount: z.number().min(0).optional(),
  maxUses: z.number().min(1).optional(),
  usesCount: z.number().min(0).default(0),
  maxUsesPerUser: z.number().min(1).optional(),

  // Validity
  isActive: z.boolean().default(true),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),

  // Product/Category Restrictions
  applicableCategories: z.array(z.string()).default([]),
  applicableProducts: z.array(z.string().uuid()).default([]),

  // User Restrictions
  applicableUsers: z.array(z.string().uuid()).default([]),
  newUsersOnly: z.boolean().default(false),

  // Metadata
  description: z.string().max(500).optional(),
  internalNotes: z.string().max(1000).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

// ===============================
// Inventory Management Types
// ===============================

export const InventoryItemSchema = z.object({
  id: z.string().uuid().optional(),
  productId: z.string().uuid('Product ID deve essere un UUID valido'),
  formatId: z.string().uuid('Format ID deve essere un UUID valido'),

  // Stock Levels
  currentStock: z.number().min(0),
  reservedStock: z.number().min(0).default(0),
  availableStock: z.number().min(0), // currentStock - reservedStock
  reorderLevel: z.number().min(0).default(10),
  reorderQuantity: z.number().min(1).default(50),

  // Locations
  warehouseLocation: z.string().max(100).optional(),
  binLocation: z.string().max(50).optional(),

  // Costs
  costPrice: z.number().min(0).optional(),
  avgCostPrice: z.number().min(0).optional(),

  // Timestamps
  lastRestocked: z.string().optional(),
  lastSold: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export const StockMovementSchema = z.object({
  id: z.string().uuid().optional(),
  productId: z.string().uuid('Product ID deve essere un UUID valido'),
  formatId: z.string().uuid('Format ID deve essere un UUID valido'),

  // Movement Details
  type: z.enum(['inbound', 'outbound', 'adjustment', 'reserved', 'unreserved']),
  quantity: z.number(), // Can be negative for outbound
  reason: z.enum(['purchase', 'sale', 'return', 'damage', 'adjustment', 'reservation']),

  // References
  orderId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  referenceNumber: z.string().optional(),

  // Details
  notes: z.string().max(500).optional(),
  performedBy: z.string().uuid().optional(),

  // Timestamps
  createdAt: z.string().optional()
});

// ===============================
// Analytics & CTA Constants
// ===============================

export const COMMERCE_SERVICE_EVENTS = {
  // Product Events
  PRODUCT_VIEW: 'product_view',
  PRODUCT_ADD_TO_CART: 'add_to_cart',
  PRODUCT_REMOVE_FROM_CART: 'remove_from_cart',
  PRODUCT_ADD_TO_WISHLIST: 'add_to_wishlist',
  PRODUCT_QUICK_VIEW: 'product_quick_view',
  PRODUCT_COMPARISON: 'product_comparison',

  // Cart Events
  CART_VIEW: 'view_cart',
  CART_UPDATE_QUANTITY: 'cart_update_quantity',
  CART_APPLY_DISCOUNT: 'cart_apply_discount',
  CART_CLEAR: 'cart_clear',
  CART_ABANDON: 'cart_abandon',

  // Checkout Events
  CHECKOUT_START: 'begin_checkout',
  CHECKOUT_STEP: 'checkout_progress',
  CHECKOUT_COMPLETE: 'purchase',
  CHECKOUT_ABANDON: 'checkout_abandon',

  // Order Events
  ORDER_VIEW: 'order_view',
  ORDER_CANCEL: 'order_cancel',
  ORDER_RETURN: 'order_return',
  ORDER_TRACK: 'order_track',

  // Subscription Events
  SUBSCRIPTION_CREATE: 'subscription_create',
  SUBSCRIPTION_MODIFY: 'subscription_modify',
  SUBSCRIPTION_PAUSE: 'subscription_pause',
  SUBSCRIPTION_CANCEL: 'subscription_cancel',
  SUBSCRIPTION_RESUME: 'subscription_resume',

  // Payment Events
  PAYMENT_METHOD_ADD: 'payment_method_add',
  PAYMENT_METHOD_UPDATE: 'payment_method_update',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILURE: 'payment_failure',

  // Search & Discovery Events
  SEARCH_PRODUCT: 'search_product',
  FILTER_APPLY: 'filter_apply',
  SORT_CHANGE: 'sort_change',
  CATEGORY_VIEW: 'category_view'
} as const;

export const COMMERCE_SERVICE_CTA_IDS = {
  // Product CTA IDs
  PRODUCT_VIEW: 'commerce.product.view',
  PRODUCT_ADD_TO_CART: 'commerce.product.add_to_cart',
  PRODUCT_BUY_NOW: 'commerce.product.buy_now',
  PRODUCT_ADD_TO_WISHLIST: 'commerce.product.add_to_wishlist',
  PRODUCT_QUICK_VIEW: 'commerce.product.quick_view',
  PRODUCT_SHARE: 'commerce.product.share',

  // Cart CTA IDs
  CART_VIEW: 'commerce.cart.view',
  CART_UPDATE_QUANTITY: 'commerce.cart.update_quantity',
  CART_REMOVE_ITEM: 'commerce.cart.remove_item',
  CART_CLEAR: 'commerce.cart.clear',
  CART_APPLY_DISCOUNT: 'commerce.cart.apply_discount',
  CART_PROCEED_CHECKOUT: 'commerce.cart.proceed_checkout',

  // Checkout CTA IDs
  CHECKOUT_CONTINUE: 'commerce.checkout.continue',
  CHECKOUT_COMPLETE: 'commerce.checkout.complete',
  CHECKOUT_BACK: 'commerce.checkout.back',
  CHECKOUT_PAYMENT_SELECT: 'commerce.checkout.payment_select',
  CHECKOUT_SHIPPING_SELECT: 'commerce.checkout.shipping_select',

  // Order CTA IDs
  ORDER_VIEW_DETAILS: 'commerce.order.view_details',
  ORDER_TRACK: 'commerce.order.track',
  ORDER_CANCEL: 'commerce.order.cancel',
  ORDER_RETURN: 'commerce.order.return',
  ORDER_REORDER: 'commerce.order.reorder',

  // Subscription CTA IDs
  SUBSCRIPTION_CREATE: 'commerce.subscription.create',
  SUBSCRIPTION_MODIFY: 'commerce.subscription.modify',
  SUBSCRIPTION_PAUSE: 'commerce.subscription.pause',
  SUBSCRIPTION_CANCEL: 'commerce.subscription.cancel',
  SUBSCRIPTION_RESUME: 'commerce.subscription.resume',

  // Search & Filter CTA IDs
  SEARCH_SUBMIT: 'commerce.search.submit',
  FILTER_APPLY: 'commerce.filter.apply',
  FILTER_CLEAR: 'commerce.filter.clear',
  SORT_CHANGE: 'commerce.sort.change'
} as const;

// ===============================
// API Request/Response Types
// ===============================

export interface ProductSearchRequest {
  query?: string;
  category?: string;
  subcategory?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  tags?: string[];
  dogProfile?: {
    weight: number;
    age: number;
    allergies: string[];
    breed?: string;
  };
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest';
  page?: number;
  limit?: number;
}

export interface ProductSearchResponse {
  products: (Product & { compatibilityScore?: number })[];
  totalCount: number;
  filters: {
    categories: { category: string; count: number }[];
    priceRange: { min: number; max: number };
    brands: { brand: string; count: number }[];
    tags: { tag: string; count: number }[];
  };
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CartSummaryResponse {
  items: CartItem[];
  summary: {
    itemCount: number;
    subtotal: number;
    discount: number;
    shipping: number;
    tax: number;
    total: number;
    loyaltyPointsEarned: number;
  };
  recommendations: Product[];
  validDiscountCodes: string[];
}

export interface OrderSummaryResponse {
  orderId: string;
  orderNumber: string;
  status: string;
  total: number;
  itemCount: number;
  estimatedDelivery?: string;
  trackingNumber?: string;
  canCancel: boolean;
  canReturn: boolean;
}

// ===============================
// Error Types
// ===============================

export interface CommerceServiceError {
  code: 'PRODUCT_NOT_FOUND' | 'INSUFFICIENT_STOCK' | 'INVALID_DISCOUNT_CODE' |
        'PAYMENT_FAILED' | 'ORDER_NOT_FOUND' | 'SUBSCRIPTION_NOT_FOUND' |
        'INVALID_CART_ITEM' | 'SHIPPING_NOT_AVAILABLE' | 'UNAUTHORIZED_ORDER_ACCESS';
  message: string;
  details?: Record<string, any>;
}

// ===============================
// Type Exports
// ===============================

export type Product = z.infer<typeof ProductSchema>;
export type ProductFormat = z.infer<typeof ProductFormatSchema>;
export type CreateProduct = z.infer<typeof CreateProductSchema>;
export type UpdateProduct = z.infer<typeof UpdateProductSchema>;

export type CartItem = z.infer<typeof CartItemSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type OrderItem = z.infer<typeof OrderItemSchema>;
export type CreateOrder = z.infer<typeof CreateOrderSchema>;
export type ShippingAddress = z.infer<typeof ShippingAddressSchema>;
export type OrderBilling = z.infer<typeof OrderBillingSchema>;

export type Subscription = z.infer<typeof SubscriptionSchema>;
export type CreateSubscription = z.infer<typeof CreateSubscriptionSchema>;
export type UpdateSubscription = z.infer<typeof UpdateSubscriptionSchema>;

export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;
export type DiscountCode = z.infer<typeof DiscountCodeSchema>;

export type InventoryItem = z.infer<typeof InventoryItemSchema>;
export type StockMovement = z.infer<typeof StockMovementSchema>;