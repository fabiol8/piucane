'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

// ===============================
// Types (simplified versions of backend types)
// ===============================

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  subcategory?: string;
  shortDescription: string;
  longDescription: string;
  images: string[];
  formats: ProductFormat[];
  ingredients: string[];
  allergens: string[];
  nutritionalInfo?: {
    protein?: number;
    fat?: number;
    fiber?: number;
    moisture?: number;
    calories?: number;
  };
  feedingGuidelines: FeedingGuideline[];
  suitableFor: {
    ageMin?: number;
    ageMax?: number;
    weightMin?: number;
    weightMax?: number;
    breeds: string[];
    conditions: string[];
    activityLevels: ('low' | 'medium' | 'high')[];
  };
  rating: number;
  reviewCount: number;
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
  isNewArrival: boolean;
  compatibilityScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFormat {
  id: string;
  size: string;
  weight: number;
  price: number;
  subscriberPrice: number;
  inStock: boolean;
  stockLevel: number;
  sku: string;
  barcode?: string;
}

export interface FeedingGuideline {
  weight: number;
  dailyAmount: number;
  notes?: string;
}

export interface CartItem {
  id: string;
  productId: string;
  formatId: string;
  quantity: number;
  isSubscription: boolean;
  subscriptionFrequency?: 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
  customizations: {
    dogId?: string;
    personalizedDosage?: {
      dailyAmount: number;
      duration: number;
    };
    giftMessage?: string;
    deliveryInstructions?: string;
  };
  addedAt: string;
}

export interface CartSummary {
  itemCount: number;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  loyaltyPointsEarned: number;
}

export interface ShippingAddress {
  name: string;
  company?: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefault: boolean;
  type: 'home' | 'work' | 'other';
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  billing: OrderBilling;
  paymentStatus: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled';
  status: 'draft' | 'confirmed' | 'processing' | 'packed' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  shippingMethod: 'standard' | 'express' | 'pickup';
  trackingNumber?: string;
  trackingCarrier?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  discountCode?: string;
  discountAmount: number;
  loyaltyPointsUsed: number;
  loyaltyPointsEarned: number;
  notes?: string;
  source: 'web' | 'mobile' | 'admin' | 'subscription';
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  formatId: string;
  quantity: number;
  unitPrice: number;
  total: number;
  name: string;
  image?: string;
  isSubscription: boolean;
  subscriptionFrequency?: 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
  customizations: any;
}

export interface OrderBilling {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  currency: string;
}

export interface Subscription {
  id: string;
  userId: string;
  orderId?: string;
  productId: string;
  formatId: string;
  quantity: number;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
  status: 'active' | 'paused' | 'cancelled' | 'failed';
  unitPrice: number;
  discountPercentage: number;
  shippingAddress: ShippingAddress;
  nextDelivery: string;
  lastDelivery?: string;
  deliveryCount: number;
  dogId?: string;
  personalizedDosage?: {
    dailyAmount: number;
    duration: number;
  };
  paymentMethodId: string;
  pausedUntil?: string;
  cancelReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMethod {
  id: string;
  userId: string;
  stripePaymentMethodId: string;
  type: 'card' | 'sepa_debit' | 'paypal';
  isDefault: boolean;
  cardBrand?: string;
  cardLast4?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DiscountCode {
  code: string;
  type: 'percentage' | 'fixed_amount' | 'free_shipping';
  value: number;
  discountAmount: number;
  description?: string;
}

export interface ProductSearchFilters {
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
}

export interface ProductSearchResult {
  products: Product[];
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

// ===============================
// Context Type Definition
// ===============================

interface CommerceContextType {
  // Product Management
  searchProducts: (filters: ProductSearchFilters, page?: number, limit?: number) => Promise<ProductSearchResult | null>;
  getProduct: (productId: string) => Promise<Product | null>;
  searchResults: ProductSearchResult | null;
  currentProduct: Product | null;
  featuredProducts: Product[];
  recommendedProducts: Product[];

  // Cart Management
  cart: CartItem[];
  cartSummary: CartSummary;
  addToCart: (productId: string, formatId: string, quantity: number, options?: Partial<CartItem>) => Promise<{ success: boolean; error?: string }>;
  updateCartItem: (itemId: string, quantity: number) => Promise<{ success: boolean; error?: string }>;
  removeFromCart: (itemId: string) => Promise<{ success: boolean; error?: string }>;
  clearCart: () => Promise<{ success: boolean; error?: string }>;
  refreshCart: () => Promise<void>;

  // Order Management
  orders: Order[];
  currentOrder: Order | null;
  createOrder: (orderData: any) => Promise<{ success: boolean; order?: Order; error?: string }>;
  getUserOrders: (page?: number, limit?: number, status?: string) => Promise<void>;
  getOrder: (orderId: string) => Promise<Order | null>;
  cancelOrder: (orderId: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  trackOrder: (orderId: string) => Promise<any>;

  // Subscription Management
  subscriptions: Subscription[];
  getSubscriptions: (status?: string) => Promise<void>;
  updateSubscription: (subscriptionId: string, updates: any) => Promise<{ success: boolean; error?: string }>;
  pauseSubscription: (subscriptionId: string, pausedUntil?: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  cancelSubscription: (subscriptionId: string, reason?: string) => Promise<{ success: boolean; error?: string }>;

  // Payment Management
  paymentMethods: PaymentMethod[];
  getPaymentMethods: () => Promise<void>;
  addPaymentMethod: (paymentMethodId: string) => Promise<{ success: boolean; error?: string }>;
  removePaymentMethod: (paymentMethodId: string) => Promise<{ success: boolean; error?: string }>;
  setDefaultPaymentMethod: (paymentMethodId: string) => Promise<{ success: boolean; error?: string }>;

  // Discount Codes
  validateDiscountCode: (code: string, cartTotal?: number) => Promise<{ success: boolean; discount?: DiscountCode; error?: string }>;
  appliedDiscount: DiscountCode | null;
  setAppliedDiscount: (discount: DiscountCode | null) => void;

  // State Management
  loading: boolean;
  error: string | null;
  clearError: () => void;
  setCurrentProduct: (product: Product | null) => void;
}

// ===============================
// Context Creation
// ===============================

const CommerceContext = createContext<CommerceContextType | undefined>(undefined);

export const useCommerce = () => {
  const context = useContext(CommerceContext);
  if (context === undefined) {
    throw new Error('useCommerce must be used within a CommerceProvider');
  }
  return context;
};

// ===============================
// Provider Implementation
// ===============================

export const CommerceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  // State
  const [searchResults, setSearchResults] = useState<ProductSearchResult | null>(null);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartSummary, setCartSummary] = useState<CartSummary>({
    itemCount: 0,
    subtotal: 0,
    discount: 0,
    shipping: 0,
    tax: 0,
    total: 0,
    loyaltyPointsEarned: 0
  });

  const [orders, setOrders] = useState<Order[]>([]);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  const [appliedDiscount, setAppliedDiscount] = useState<DiscountCode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial data when user authenticates
  useEffect(() => {
    if (isAuthenticated && user) {
      refreshCart();
      getPaymentMethods();
      getUserOrders(1, 10);
      getSubscriptions();
      loadFeaturedProducts();
    } else {
      // Clear data when user logs out
      setCart([]);
      setCartSummary({
        itemCount: 0,
        subtotal: 0,
        discount: 0,
        shipping: 0,
        tax: 0,
        total: 0,
        loyaltyPointsEarned: 0
      });
      setOrders([]);
      setSubscriptions([]);
      setPaymentMethods([]);
    }
  }, [isAuthenticated, user]);

  // Helper function for authenticated requests
  const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
    if (!user) {
      throw new Error('Utente non autenticato');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Errore di rete');
    }

    return response.json();
  };

  // ===============================
  // Product Management
  // ===============================

  const searchProducts = async (
    filters: ProductSearchFilters,
    page = 1,
    limit = 20
  ): Promise<ProductSearchResult | null> => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filters.query && { query: filters.query }),
        ...(filters.category && { category: filters.category }),
        ...(filters.subcategory && { subcategory: filters.subcategory }),
        ...(filters.minPrice && { minPrice: filters.minPrice.toString() }),
        ...(filters.maxPrice && { maxPrice: filters.maxPrice.toString() }),
        ...(filters.inStock !== undefined && { inStock: filters.inStock.toString() }),
        ...(filters.tags && { tags: filters.tags.join(',') }),
        ...(filters.sortBy && { sortBy: filters.sortBy }),
        ...(filters.dogProfile && { dogProfile: JSON.stringify(filters.dogProfile) })
      });

      const response = await fetch(`/api/commerce/products/search?${queryParams}`);
      const result = await response.json();

      if (result.success) {
        setSearchResults(result);

        // Track search analytics
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'search_product', {
            search_term: filters.query || '',
            category: filters.category || '',
            results_count: result.totalCount,
            page,
            cta_id: 'commerce.search.submit'
          });
        }

        return result;
      }

      setError(result.error);
      return null;
    } catch (error: any) {
      setError(error.message || 'Errore durante la ricerca prodotti');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getProduct = async (productId: string): Promise<Product | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/commerce/products/${productId}`);
      const result = await response.json();

      if (result.success) {
        setCurrentProduct(result.product);

        // Track product view analytics
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'product_view', {
            product_id: productId,
            product_name: result.product.name,
            category: result.product.category,
            brand: result.product.brand,
            price: result.product.formats[0]?.subscriberPrice,
            cta_id: 'commerce.product.view'
          });
        }

        return result.product;
      }

      setError(result.error);
      return null;
    } catch (error: any) {
      setError(error.message || 'Errore nel recupero del prodotto');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const loadFeaturedProducts = async () => {
    try {
      const result = await searchProducts({ tags: ['featured'] }, 1, 8);
      if (result) {
        setFeaturedProducts(result.products);
      }
    } catch (error) {
      console.error('Failed to load featured products:', error);
    }
  };

  // ===============================
  // Cart Management
  // ===============================

  const addToCart = async (
    productId: string,
    formatId: string,
    quantity: number,
    options: Partial<CartItem> = {}
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      setError(null);

      const cartItem = {
        productId,
        formatId,
        quantity,
        isSubscription: options.isSubscription || false,
        subscriptionFrequency: options.subscriptionFrequency,
        customizations: options.customizations || {}
      };

      const result = await makeAuthenticatedRequest('/api/commerce/cart/items', {
        method: 'POST',
        body: JSON.stringify(cartItem)
      });

      if (result.success) {
        await refreshCart();

        // Track add to cart analytics
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'add_to_cart', {
            product_id: productId,
            quantity,
            is_subscription: cartItem.isSubscription,
            cta_id: 'commerce.product.add_to_cart'
          });
        }

        return { success: true };
      }

      setError(result.error);
      return { success: false, error: result.error };
    } catch (error: any) {
      const errorMessage = error.message || 'Errore durante l\'aggiunta al carrello';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const refreshCart = async (): Promise<void> => {
    try {
      if (!isAuthenticated) return;

      const result = await makeAuthenticatedRequest('/api/commerce/cart');

      if (result.success) {
        setCart(result.cart.items || []);
        setCartSummary(result.cart.summary || {
          itemCount: 0,
          subtotal: 0,
          discount: 0,
          shipping: 0,
          tax: 0,
          total: 0,
          loyaltyPointsEarned: 0
        });
      }
    } catch (error: any) {
      console.error('Failed to refresh cart:', error);
      setError(error.message || 'Errore nel caricamento del carrello');
    }
  };

  const updateCartItem = async (itemId: string, quantity: number): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      setError(null);

      const result = await makeAuthenticatedRequest(`/api/commerce/cart/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity })
      });

      if (result.success) {
        await refreshCart();

        // Track cart update analytics
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'cart_update_quantity', {
            item_id: itemId,
            new_quantity: quantity,
            cta_id: 'commerce.cart.update_quantity'
          });
        }

        return { success: true };
      }

      setError(result.error);
      return { success: false, error: result.error };
    } catch (error: any) {
      const errorMessage = error.message || 'Errore durante l\'aggiornamento del carrello';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (itemId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      setError(null);

      const result = await makeAuthenticatedRequest(`/api/commerce/cart/items/${itemId}`, {
        method: 'DELETE'
      });

      if (result.success) {
        await refreshCart();

        // Track cart remove analytics
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'remove_from_cart', {
            item_id: itemId,
            cta_id: 'commerce.cart.remove_item'
          });
        }

        return { success: true };
      }

      setError(result.error);
      return { success: false, error: result.error };
    } catch (error: any) {
      const errorMessage = error.message || 'Errore durante la rimozione dal carrello';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const clearCart = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      setError(null);

      const result = await makeAuthenticatedRequest('/api/commerce/cart', {
        method: 'DELETE'
      });

      if (result.success) {
        setCart([]);
        setCartSummary({
          itemCount: 0,
          subtotal: 0,
          discount: 0,
          shipping: 0,
          tax: 0,
          total: 0,
          loyaltyPointsEarned: 0
        });

        // Track cart clear analytics
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'cart_clear', {
            cta_id: 'commerce.cart.clear'
          });
        }

        return { success: true };
      }

      setError(result.error);
      return { success: false, error: result.error };
    } catch (error: any) {
      const errorMessage = error.message || 'Errore durante lo svuotamento del carrello';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // Order Management
  // ===============================

  const createOrder = async (orderData: any): Promise<{ success: boolean; order?: Order; error?: string }> => {
    try {
      setLoading(true);
      setError(null);

      const result = await makeAuthenticatedRequest('/api/commerce/orders', {
        method: 'POST',
        body: JSON.stringify(orderData)
      });

      if (result.success) {
        setCurrentOrder(result.order);
        await refreshCart(); // Clear cart after successful order
        await getUserOrders(1, 10); // Refresh orders

        // Track order creation analytics
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'purchase', {
            transaction_id: result.order.orderNumber,
            value: result.order.billing.total,
            currency: 'EUR',
            items: result.order.items.map((item: OrderItem) => ({
              item_id: item.productId,
              item_name: item.name,
              category: 'product',
              quantity: item.quantity,
              price: item.unitPrice
            })),
            cta_id: 'commerce.checkout.complete'
          });
        }

        return { success: true, order: result.order };
      }

      setError(result.error);
      return { success: false, error: result.error };
    } catch (error: any) {
      const errorMessage = error.message || 'Errore durante la creazione dell\'ordine';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const getUserOrders = async (page = 1, limit = 10, status?: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(status && { status })
      });

      const result = await makeAuthenticatedRequest(`/api/commerce/orders?${queryParams}`);

      if (result.success) {
        setOrders(result.orders);
      }
    } catch (error: any) {
      setError(error.message || 'Errore nel caricamento degli ordini');
    } finally {
      setLoading(false);
    }
  };

  const getOrder = async (orderId: string): Promise<Order | null> => {
    try {
      setLoading(true);
      setError(null);

      const result = await makeAuthenticatedRequest(`/api/commerce/orders/${orderId}`);

      if (result.success) {
        return result.order;
      }

      setError(result.error);
      return null;
    } catch (error: any) {
      setError(error.message || 'Errore nel recupero dell\'ordine');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async (orderId: string, reason?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      setError(null);

      const result = await makeAuthenticatedRequest(`/api/commerce/orders/${orderId}/cancel`, {
        method: 'PUT',
        body: JSON.stringify({ reason })
      });

      if (result.success) {
        await getUserOrders(1, 10); // Refresh orders

        // Track order cancellation analytics
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'order_cancel', {
            order_id: orderId,
            reason,
            cta_id: 'commerce.order.cancel'
          });
        }

        return { success: true };
      }

      setError(result.error);
      return { success: false, error: result.error };
    } catch (error: any) {
      const errorMessage = error.message || 'Errore durante la cancellazione dell\'ordine';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const trackOrder = async (orderId: string): Promise<any> => {
    try {
      setLoading(true);
      setError(null);

      const result = await makeAuthenticatedRequest(`/api/commerce/orders/${orderId}/tracking`);

      if (result.success) {
        // Track tracking view analytics
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'order_track', {
            order_id: orderId,
            status: result.tracking.status,
            cta_id: 'commerce.order.track'
          });
        }

        return result.tracking;
      }

      setError(result.error);
      return null;
    } catch (error: any) {
      setError(error.message || 'Errore nel recupero delle informazioni di tracking');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // Subscription Management
  // ===============================

  const getSubscriptions = async (status?: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        ...(status && { status })
      });

      const result = await makeAuthenticatedRequest(`/api/commerce/subscriptions?${queryParams}`);

      if (result.success) {
        setSubscriptions(result.subscriptions);
      }
    } catch (error: any) {
      setError(error.message || 'Errore nel caricamento degli abbonamenti');
    } finally {
      setLoading(false);
    }
  };

  const updateSubscription = async (subscriptionId: string, updates: any): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      setError(null);

      const result = await makeAuthenticatedRequest(`/api/commerce/subscriptions/${subscriptionId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });

      if (result.success) {
        await getSubscriptions(); // Refresh subscriptions
        return { success: true };
      }

      setError(result.error);
      return { success: false, error: result.error };
    } catch (error: any) {
      const errorMessage = error.message || 'Errore durante l\'aggiornamento dell\'abbonamento';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const pauseSubscription = async (subscriptionId: string, pausedUntil?: string, reason?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      setError(null);

      const result = await makeAuthenticatedRequest(`/api/commerce/subscriptions/${subscriptionId}/pause`, {
        method: 'PUT',
        body: JSON.stringify({ pausedUntil, reason })
      });

      if (result.success) {
        await getSubscriptions(); // Refresh subscriptions

        // Track subscription pause analytics
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'subscription_pause', {
            subscription_id: subscriptionId,
            reason,
            cta_id: 'commerce.subscription.pause'
          });
        }

        return { success: true };
      }

      setError(result.error);
      return { success: false, error: result.error };
    } catch (error: any) {
      const errorMessage = error.message || 'Errore durante la pausa dell\'abbonamento';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const cancelSubscription = async (subscriptionId: string, reason?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      setError(null);

      const result = await makeAuthenticatedRequest(`/api/commerce/subscriptions/${subscriptionId}/cancel`, {
        method: 'PUT',
        body: JSON.stringify({ reason })
      });

      if (result.success) {
        await getSubscriptions(); // Refresh subscriptions

        // Track subscription cancellation analytics
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'subscription_cancel', {
            subscription_id: subscriptionId,
            reason,
            cta_id: 'commerce.subscription.cancel'
          });
        }

        return { success: true };
      }

      setError(result.error);
      return { success: false, error: result.error };
    } catch (error: any) {
      const errorMessage = error.message || 'Errore durante la cancellazione dell\'abbonamento';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // Payment Management
  // ===============================

  const getPaymentMethods = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const result = await makeAuthenticatedRequest('/api/commerce/payment-methods');

      if (result.success) {
        setPaymentMethods(result.paymentMethods);
      }
    } catch (error: any) {
      setError(error.message || 'Errore nel caricamento dei metodi di pagamento');
    } finally {
      setLoading(false);
    }
  };

  const addPaymentMethod = async (paymentMethodId: string): Promise<{ success: boolean; error?: string }> => {
    // Implementation would add payment method via Stripe
    return { success: false, error: 'Non implementato' };
  };

  const removePaymentMethod = async (paymentMethodId: string): Promise<{ success: boolean; error?: string }> => {
    // Implementation would remove payment method
    return { success: false, error: 'Non implementato' };
  };

  const setDefaultPaymentMethod = async (paymentMethodId: string): Promise<{ success: boolean; error?: string }> => {
    // Implementation would set default payment method
    return { success: false, error: 'Non implementato' };
  };

  // ===============================
  // Discount Code Management
  // ===============================

  const validateDiscountCode = async (code: string, cartTotal = 0): Promise<{ success: boolean; discount?: DiscountCode; error?: string }> => {
    try {
      setLoading(true);
      setError(null);

      const result = await makeAuthenticatedRequest('/api/commerce/discount-codes/validate', {
        method: 'POST',
        body: JSON.stringify({ code, cartTotal })
      });

      if (result.success) {
        const discount = result.discount;
        setAppliedDiscount(discount);

        // Track discount code validation analytics
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'cart_apply_discount', {
            coupon: code,
            discount_amount: discount.discountAmount,
            cta_id: 'commerce.cart.apply_discount'
          });
        }

        return { success: true, discount };
      }

      setError(result.error);
      return { success: false, error: result.error };
    } catch (error: any) {
      const errorMessage = error.message || 'Errore durante la validazione del codice sconto';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // Utility Functions
  // ===============================

  const clearError = () => {
    setError(null);
  };

  // ===============================
  // Context Value
  // ===============================

  const value: CommerceContextType = {
    // Product Management
    searchProducts,
    getProduct,
    searchResults,
    currentProduct,
    featuredProducts,
    recommendedProducts,

    // Cart Management
    cart,
    cartSummary,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    refreshCart,

    // Order Management
    orders,
    currentOrder,
    createOrder,
    getUserOrders,
    getOrder,
    cancelOrder,
    trackOrder,

    // Subscription Management
    subscriptions,
    getSubscriptions,
    updateSubscription,
    pauseSubscription,
    cancelSubscription,

    // Payment Management
    paymentMethods,
    getPaymentMethods,
    addPaymentMethod,
    removePaymentMethod,
    setDefaultPaymentMethod,

    // Discount Codes
    validateDiscountCode,
    appliedDiscount,
    setAppliedDiscount,

    // State Management
    loading,
    error,
    clearError,
    setCurrentProduct
  };

  return (
    <CommerceContext.Provider value={value}>
      {children}
    </CommerceContext.Provider>
  );
};