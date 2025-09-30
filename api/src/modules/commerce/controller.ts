/**
 * Commerce Service Controller
 * Comprehensive e-commerce functionality including products, cart, orders, payments, and subscriptions
 */

import { Request, Response } from 'express';
import { auth, db } from '../../config/firebase';
import Stripe from 'stripe';
import {
  CreateProductSchema,
  UpdateProductSchema,
  CartItemSchema,
  CreateOrderSchema,
  CreateSubscriptionSchema,
  UpdateSubscriptionSchema,
  PaymentMethodSchema,
  DiscountCodeSchema,
  ProductSearchRequest,
  ProductSearchResponse,
  CartSummaryResponse,
  OrderSummaryResponse,
  COMMERCE_SERVICE_EVENTS,
  COMMERCE_SERVICE_CTA_IDS,
  Product,
  Order,
  CartItem,
  CommerceServiceError
} from './types';
import { trackAnalyticsEvent } from '../../utils/analytics';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
});

// Simple UUID generator
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function generateOrderNumber(): string {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `PC${timestamp}${random}`;
}

// ===============================
// Product Management
// ===============================

export const createProduct = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }

    const validatedData = CreateProductSchema.parse(req.body);

    const productId = generateUUID();
    const now = new Date().toISOString();

    // Generate UUIDs for formats
    const formatsWithIds = validatedData.formats.map(format => ({
      ...format,
      id: generateUUID()
    }));

    const productData: Product = {
      ...validatedData,
      id: productId,
      formats: formatsWithIds,
      createdAt: now,
      updatedAt: now,
      createdBy: userId
    };

    // Store product
    await db.collection('products').doc(productId).set(productData);

    // Create inventory entries for each format
    for (const format of formatsWithIds) {
      await db.collection('inventory').doc(`${productId}_${format.id}`).set({
        id: generateUUID(),
        productId,
        formatId: format.id,
        currentStock: format.stockLevel,
        reservedStock: 0,
        availableStock: format.stockLevel,
        reorderLevel: 10,
        reorderQuantity: 50,
        createdAt: now,
        updatedAt: now
      });
    }

    // Track analytics
    await trackAnalyticsEvent(userId, COMMERCE_SERVICE_EVENTS.PRODUCT_VIEW, {
      productId,
      product_name: validatedData.name,
      category: validatedData.category,
      brand: validatedData.brand,
      cta_id: COMMERCE_SERVICE_CTA_IDS.PRODUCT_VIEW
    });

    res.status(201).json({
      success: true,
      product: productData
    });

  } catch (error: any) {
    console.error('Product creation failed:', error);

    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Dati non validi',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Errore durante la creazione del prodotto'
    });
  }
};

export const searchProducts = async (req: Request, res: Response) => {
  try {
    const {
      query,
      category,
      subcategory,
      minPrice,
      maxPrice,
      inStock,
      tags,
      dogProfile,
      sortBy = 'relevance',
      page = 1,
      limit = 20
    } = req.query as ProductSearchRequest;

    let productsQuery = db.collection('products').where('isActive', '==', true);

    // Apply filters
    if (category) {
      productsQuery = productsQuery.where('category', '==', category);
    }

    if (subcategory) {
      productsQuery = productsQuery.where('subcategory', '==', subcategory);
    }

    if (tags && tags.length > 0) {
      productsQuery = productsQuery.where('tags', 'array-contains-any', tags);
    }

    // Apply sorting
    switch (sortBy) {
      case 'price_asc':
        productsQuery = productsQuery.orderBy('formats.0.price', 'asc');
        break;
      case 'price_desc':
        productsQuery = productsQuery.orderBy('formats.0.price', 'desc');
        break;
      case 'rating':
        productsQuery = productsQuery.orderBy('rating', 'desc');
        break;
      case 'newest':
        productsQuery = productsQuery.orderBy('createdAt', 'desc');
        break;
      default:
        productsQuery = productsQuery.orderBy('createdAt', 'desc');
    }

    // Pagination
    const offset = (Number(page) - 1) * Number(limit);
    productsQuery = productsQuery.limit(Number(limit)).offset(offset);

    const snapshot = await productsQuery.get();
    let products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];

    // Apply client-side filters for more complex queries
    if (query) {
      products = products.filter(product =>
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        product.brand.toLowerCase().includes(query.toLowerCase()) ||
        product.shortDescription.toLowerCase().includes(query.toLowerCase())
      );
    }

    if (minPrice || maxPrice) {
      products = products.filter(product => {
        const price = product.formats[0]?.subscriberPrice || 0;
        if (minPrice && price < Number(minPrice)) return false;
        if (maxPrice && price > Number(maxPrice)) return false;
        return true;
      });
    }

    if (inStock) {
      products = products.filter(product =>
        product.formats.some(format => format.inStock && format.stockLevel > 0)
      );
    }

    // Calculate compatibility scores if dog profile provided
    if (dogProfile) {
      products = products.map(product => ({
        ...product,
        compatibilityScore: calculateCompatibilityScore(product, dogProfile)
      }));

      // Sort by compatibility if relevant
      if (sortBy === 'relevance') {
        products.sort((a, b) => (b.compatibilityScore || 0) - (a.compatibilityScore || 0));
      }
    }

    // Get total count for pagination
    const totalSnapshot = await db.collection('products').where('isActive', '==', true).get();
    const totalCount = totalSnapshot.size;

    // Generate filters data
    const allProducts = totalSnapshot.docs.map(doc => doc.data()) as Product[];
    const filters = generateFilters(allProducts);

    const response: ProductSearchResponse = {
      products,
      totalCount,
      filters,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalCount / Number(limit)),
        hasNext: offset + Number(limit) < totalCount,
        hasPrev: Number(page) > 1
      }
    };

    // Track search analytics
    if (req.user?.uid) {
      await trackAnalyticsEvent(req.user.uid, COMMERCE_SERVICE_EVENTS.SEARCH_PRODUCT, {
        query: query || '',
        category,
        results_count: products.length,
        page: Number(page),
        cta_id: COMMERCE_SERVICE_CTA_IDS.SEARCH_SUBMIT
      });
    }

    res.json({
      success: true,
      ...response
    });

  } catch (error) {
    console.error('Product search failed:', error);
    res.status(500).json({
      success: false,
      error: 'Errore durante la ricerca prodotti'
    });
  }
};

export const getProduct = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    const productDoc = await db.collection('products').doc(productId).get();

    if (!productDoc.exists) {
      return res.status(404).json({ success: false, error: 'Prodotto non trovato' });
    }

    const product = { id: productDoc.id, ...productDoc.data() } as Product;

    // Get inventory info for each format
    const formatsWithInventory = await Promise.all(
      product.formats.map(async (format) => {
        const inventoryDoc = await db.collection('inventory').doc(`${productId}_${format.id}`).get();
        const inventory = inventoryDoc.exists ? inventoryDoc.data() : null;

        return {
          ...format,
          inStock: inventory ? inventory.availableStock > 0 : format.inStock,
          stockLevel: inventory ? inventory.availableStock : format.stockLevel
        };
      })
    );

    const productWithInventory = {
      ...product,
      formats: formatsWithInventory
    };

    // Track product view
    if (req.user?.uid) {
      await trackAnalyticsEvent(req.user.uid, COMMERCE_SERVICE_EVENTS.PRODUCT_VIEW, {
        productId,
        product_name: product.name,
        category: product.category,
        brand: product.brand,
        price: product.formats[0]?.subscriberPrice,
        cta_id: COMMERCE_SERVICE_CTA_IDS.PRODUCT_VIEW
      });
    }

    res.json({
      success: true,
      product: productWithInventory
    });

  } catch (error) {
    console.error('Get product failed:', error);
    res.status(500).json({
      success: false,
      error: 'Errore nel recupero del prodotto'
    });
  }
};

// ===============================
// Cart Management
// ===============================

export const addToCart = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }

    const validatedItem = CartItemSchema.parse(req.body);

    // Verify product and format exist
    const productDoc = await db.collection('products').doc(validatedItem.productId).get();
    if (!productDoc.exists) {
      return res.status(404).json({ success: false, error: 'Prodotto non trovato' });
    }

    const product = productDoc.data() as Product;
    const format = product.formats.find(f => f.id === validatedItem.formatId);
    if (!format) {
      return res.status(404).json({ success: false, error: 'Formato non trovato' });
    }

    // Check inventory
    const inventoryDoc = await db.collection('inventory').doc(`${validatedItem.productId}_${validatedItem.formatId}`).get();
    const inventory = inventoryDoc.exists ? inventoryDoc.data() : null;
    const availableStock = inventory ? inventory.availableStock : format.stockLevel;

    if (availableStock < validatedItem.quantity) {
      return res.status(400).json({
        success: false,
        error: 'Stock insufficiente',
        availableStock
      });
    }

    const cartItemId = generateUUID();
    const cartItem = {
      ...validatedItem,
      id: cartItemId,
      addedAt: new Date().toISOString()
    };

    // Get or create user cart
    const cartDoc = await db.collection('carts').doc(userId).get();
    const currentCart = cartDoc.exists ? cartDoc.data() : { items: [] };

    // Check if item already exists in cart
    const existingItemIndex = currentCart.items.findIndex(
      (item: CartItem) => item.productId === validatedItem.productId && item.formatId === validatedItem.formatId
    );

    if (existingItemIndex >= 0) {
      // Update quantity
      currentCart.items[existingItemIndex].quantity += validatedItem.quantity;
    } else {
      // Add new item
      currentCart.items.push(cartItem);
    }

    // Update cart
    await db.collection('carts').doc(userId).set({
      items: currentCart.items,
      updatedAt: new Date().toISOString()
    });

    // Track analytics
    await trackAnalyticsEvent(userId, COMMERCE_SERVICE_EVENTS.PRODUCT_ADD_TO_CART, {
      productId: validatedItem.productId,
      product_name: product.name,
      category: product.category,
      quantity: validatedItem.quantity,
      price: format.subscriberPrice,
      is_subscription: validatedItem.isSubscription,
      cta_id: COMMERCE_SERVICE_CTA_IDS.PRODUCT_ADD_TO_CART
    });

    res.json({
      success: true,
      cartItem,
      message: 'Prodotto aggiunto al carrello'
    });

  } catch (error: any) {
    console.error('Add to cart failed:', error);

    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Dati non validi',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Errore durante l\'aggiunta al carrello'
    });
  }
};

export const getCart = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }

    const cartDoc = await db.collection('carts').doc(userId).get();
    if (!cartDoc.exists) {
      return res.json({
        success: true,
        cart: { items: [], summary: getEmptyCartSummary() }
      });
    }

    const cart = cartDoc.data();
    const cartSummary = await calculateCartSummary(cart.items, userId);

    // Track cart view
    await trackAnalyticsEvent(userId, COMMERCE_SERVICE_EVENTS.CART_VIEW, {
      item_count: cart.items.length,
      cart_value: cartSummary.summary.total,
      cta_id: COMMERCE_SERVICE_CTA_IDS.CART_VIEW
    });

    res.json({
      success: true,
      cart: cartSummary
    });

  } catch (error) {
    console.error('Get cart failed:', error);
    res.status(500).json({
      success: false,
      error: 'Errore nel recupero del carrello'
    });
  }
};

export const updateCartItem = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }

    const { itemId } = req.params;
    const { quantity } = req.body;

    if (quantity < 0) {
      return res.status(400).json({ success: false, error: 'Quantità non valida' });
    }

    const cartDoc = await db.collection('carts').doc(userId).get();
    if (!cartDoc.exists) {
      return res.status(404).json({ success: false, error: 'Carrello non trovato' });
    }

    const cart = cartDoc.data();
    const itemIndex = cart.items.findIndex((item: CartItem) => item.id === itemId);

    if (itemIndex === -1) {
      return res.status(404).json({ success: false, error: 'Prodotto non trovato nel carrello' });
    }

    const item = cart.items[itemIndex];

    if (quantity === 0) {
      // Remove item
      cart.items.splice(itemIndex, 1);
    } else {
      // Update quantity
      cart.items[itemIndex].quantity = quantity;
    }

    await db.collection('carts').doc(userId).set({
      items: cart.items,
      updatedAt: new Date().toISOString()
    });

    // Track analytics
    await trackAnalyticsEvent(userId, COMMERCE_SERVICE_EVENTS.CART_UPDATE_QUANTITY, {
      productId: item.productId,
      old_quantity: item.quantity,
      new_quantity: quantity,
      cta_id: COMMERCE_SERVICE_CTA_IDS.CART_UPDATE_QUANTITY
    });

    res.json({
      success: true,
      message: quantity === 0 ? 'Prodotto rimosso dal carrello' : 'Quantità aggiornata'
    });

  } catch (error) {
    console.error('Update cart item failed:', error);
    res.status(500).json({
      success: false,
      error: 'Errore durante l\'aggiornamento del carrello'
    });
  }
};

// ===============================
// Order Management
// ===============================

export const createOrder = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }

    const validatedData = CreateOrderSchema.parse(req.body);

    // Calculate order totals
    const orderCalculation = await calculateOrderTotals(validatedData.items, validatedData.discountCode, validatedData.loyaltyPointsToUse);

    if (!orderCalculation.success) {
      return res.status(400).json({ success: false, error: orderCalculation.error });
    }

    const { billing, processedItems } = orderCalculation;

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(billing.total * 100), // Convert to cents
      currency: 'eur',
      payment_method: validatedData.paymentMethodId,
      confirmation_method: 'manual',
      confirm: true,
      metadata: {
        userId,
        orderType: 'purchase'
      }
    });

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        error: 'Pagamento fallito',
        paymentStatus: paymentIntent.status
      });
    }

    // Create order
    const orderId = generateUUID();
    const orderNumber = generateOrderNumber();
    const now = new Date().toISOString();

    const orderData: Order = {
      id: orderId,
      userId,
      orderNumber,
      items: processedItems,
      shippingAddress: validatedData.shippingAddress,
      billing,
      paymentMethodId: validatedData.paymentMethodId,
      paymentIntentId: paymentIntent.id,
      paymentStatus: 'succeeded',
      status: 'confirmed',
      shippingMethod: validatedData.shippingMethod,
      discountCode: validatedData.discountCode,
      discountAmount: billing.discount,
      loyaltyPointsUsed: validatedData.loyaltyPointsToUse,
      loyaltyPointsEarned: Math.floor(billing.total * 10), // 10 points per euro
      notes: validatedData.notes,
      source: 'web',
      estimatedDelivery: calculateDeliveryDate(validatedData.shippingMethod),
      createdAt: now,
      updatedAt: now,
      confirmedAt: now
    };

    await db.collection('orders').doc(orderId).set(orderData);

    // Update inventory
    await updateInventoryForOrder(processedItems);

    // Create subscriptions for subscription items
    await createSubscriptionsFromOrder(orderData);

    // Clear user cart
    await db.collection('carts').doc(userId).delete();

    // Update user loyalty points
    await updateUserLoyaltyPoints(userId, billing.total, validatedData.loyaltyPointsToUse);

    // Track analytics
    await trackAnalyticsEvent(userId, COMMERCE_SERVICE_EVENTS.CHECKOUT_COMPLETE, {
      order_id: orderId,
      order_number: orderNumber,
      total_value: billing.total,
      item_count: processedItems.length,
      payment_method: 'card',
      shipping_method: validatedData.shippingMethod,
      cta_id: COMMERCE_SERVICE_CTA_IDS.CHECKOUT_COMPLETE
    });

    res.status(201).json({
      success: true,
      order: orderData,
      message: 'Ordine creato con successo'
    });

  } catch (error: any) {
    console.error('Create order failed:', error);

    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Dati non validi',
        details: error.errors
      });
    }

    if (error.type === 'StripeCardError') {
      return res.status(400).json({
        success: false,
        error: 'Errore nel pagamento: ' + error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Errore durante la creazione dell\'ordine'
    });
  }
};

export const getUserOrders = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }

    const { page = 1, limit = 10, status } = req.query;

    let query = db.collection('orders')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc');

    if (status) {
      query = query.where('status', '==', status);
    }

    const offset = (Number(page) - 1) * Number(limit);
    const snapshot = await query.limit(Number(limit)).offset(offset).get();

    const orders = snapshot.docs.map(doc => {
      const orderData = { id: doc.id, ...doc.data() } as Order;
      return {
        id: orderData.id,
        orderNumber: orderData.orderNumber,
        status: orderData.status,
        total: orderData.billing.total,
        itemCount: orderData.items.length,
        createdAt: orderData.createdAt,
        estimatedDelivery: orderData.estimatedDelivery,
        trackingNumber: orderData.trackingNumber
      } as OrderSummaryResponse;
    });

    // Get total count
    const totalSnapshot = await db.collection('orders').where('userId', '==', userId).get();

    res.json({
      success: true,
      orders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalSnapshot.size,
        pages: Math.ceil(totalSnapshot.size / Number(limit))
      }
    });

  } catch (error) {
    console.error('Get user orders failed:', error);
    res.status(500).json({
      success: false,
      error: 'Errore nel recupero degli ordini'
    });
  }
};

// ===============================
// Helper Functions
// ===============================

function calculateCompatibilityScore(product: Product, dogProfile: any): number {
  let score = 0.5; // Base score

  // Age compatibility
  if (product.suitableFor.ageMin && product.suitableFor.ageMax) {
    if (dogProfile.age >= product.suitableFor.ageMin && dogProfile.age <= product.suitableFor.ageMax) {
      score += 0.2;
    } else {
      score -= 0.3;
    }
  }

  // Weight compatibility
  if (product.suitableFor.weightMin && product.suitableFor.weightMax) {
    if (dogProfile.weight >= product.suitableFor.weightMin && dogProfile.weight <= product.suitableFor.weightMax) {
      score += 0.2;
    }
  }

  // Allergy check
  const hasAllergicIngredients = product.allergens.some(allergen =>
    dogProfile.allergies.some((dogAllergy: string) =>
      allergen.toLowerCase().includes(dogAllergy.toLowerCase()) ||
      dogAllergy.toLowerCase().includes(allergen.toLowerCase())
    )
  );

  if (hasAllergicIngredients) {
    score -= 0.5;
  }

  return Math.max(0, Math.min(1, score));
}

function generateFilters(products: Product[]) {
  const categories = new Map<string, number>();
  const brands = new Map<string, number>();
  const tags = new Map<string, number>();
  let minPrice = Infinity;
  let maxPrice = 0;

  products.forEach(product => {
    // Categories
    categories.set(product.category, (categories.get(product.category) || 0) + 1);

    // Brands
    brands.set(product.brand, (brands.get(product.brand) || 0) + 1);

    // Tags
    product.tags.forEach(tag => {
      tags.set(tag, (tags.get(tag) || 0) + 1);
    });

    // Price range
    const price = product.formats[0]?.subscriberPrice || 0;
    minPrice = Math.min(minPrice, price);
    maxPrice = Math.max(maxPrice, price);
  });

  return {
    categories: Array.from(categories.entries()).map(([category, count]) => ({ category, count })),
    brands: Array.from(brands.entries()).map(([brand, count]) => ({ brand, count })),
    tags: Array.from(tags.entries()).map(([tag, count]) => ({ tag, count })),
    priceRange: { min: minPrice === Infinity ? 0 : minPrice, max: maxPrice }
  };
}

async function calculateCartSummary(items: CartItem[], userId: string): Promise<CartSummaryResponse> {
  // Implementation would calculate cart totals, apply discounts, etc.
  // For brevity, returning mock structure
  const summary = {
    itemCount: items.length,
    subtotal: 0,
    discount: 0,
    shipping: 0,
    tax: 0,
    total: 0,
    loyaltyPointsEarned: 0
  };

  return {
    items,
    summary,
    recommendations: [],
    validDiscountCodes: []
  };
}

function getEmptyCartSummary() {
  return {
    itemCount: 0,
    subtotal: 0,
    discount: 0,
    shipping: 0,
    tax: 0,
    total: 0,
    loyaltyPointsEarned: 0
  };
}

async function calculateOrderTotals(items: CartItem[], discountCode?: string, loyaltyPoints?: number) {
  // Implementation would calculate totals, apply discounts, etc.
  // For brevity, returning mock structure
  return {
    success: true,
    billing: {
      subtotal: 100,
      discount: 0,
      shipping: 0,
      tax: 8,
      total: 108,
      currency: 'EUR'
    },
    processedItems: []
  };
}

function calculateDeliveryDate(shippingMethod: string): string {
  const now = new Date();
  switch (shippingMethod) {
    case 'express':
      now.setDate(now.getDate() + 2);
      break;
    case 'pickup':
      now.setDate(now.getDate() + 1);
      break;
    default:
      now.setDate(now.getDate() + 5);
  }
  return now.toISOString();
}

async function updateInventoryForOrder(items: any[]) {
  // Implementation would update inventory levels
  console.log('Updating inventory for order items:', items.length);
}

async function createSubscriptionsFromOrder(order: Order) {
  // Implementation would create subscriptions for subscription items
  console.log('Creating subscriptions for order:', order.id);
}

async function updateUserLoyaltyPoints(userId: string, orderTotal: number, pointsUsed: number) {
  // Implementation would update user loyalty points
  console.log('Updating loyalty points for user:', userId, 'Total:', orderTotal, 'Used:', pointsUsed);
}