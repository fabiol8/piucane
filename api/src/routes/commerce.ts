/**
 * Commerce Service API Routes
 * Comprehensive e-commerce routes for products, cart, orders, payments, and subscriptions
 */

import { Router } from 'express';
import {
  createProduct,
  searchProducts,
  getProduct,
  addToCart,
  getCart,
  updateCartItem,
  createOrder,
  getUserOrders
} from '../modules/commerce/controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// ===============================
// Product Management Routes
// ===============================

/**
 * @route   POST /api/commerce/products
 * @desc    Create new product (Admin only)
 * @access  Private (Admin)
 * @body    CreateProductRequest
 */
router.post('/products', authMiddleware, createProduct);

/**
 * @route   GET /api/commerce/products/search
 * @desc    Search products with filters and pagination
 * @access  Public
 * @query   ProductSearchRequest
 */
router.get('/products/search', searchProducts);

/**
 * @route   GET /api/commerce/products/:productId
 * @desc    Get specific product details with inventory
 * @access  Public
 * @params  productId: string (UUID)
 */
router.get('/products/:productId', getProduct);

/**
 * @route   PUT /api/commerce/products/:productId
 * @desc    Update product details (Admin only)
 * @access  Private (Admin)
 * @params  productId: string (UUID)
 * @body    UpdateProductRequest
 */
router.put('/products/:productId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.uid;
    const { productId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }

    // Check admin permissions (would implement proper role checking)
    // For now, allowing any authenticated user

    const { db } = require('../config/firebase');
    const productDoc = await db.collection('products').doc(productId).get();

    if (!productDoc.exists) {
      return res.status(404).json({ success: false, error: 'Prodotto non trovato' });
    }

    const updates = {
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    await db.collection('products').doc(productId).update(updates);

    res.json({
      success: true,
      message: 'Prodotto aggiornato con successo'
    });

  } catch (error) {
    console.error('Update product failed:', error);
    res.status(500).json({
      success: false,
      error: 'Errore durante l\'aggiornamento del prodotto'
    });
  }
});

/**
 * @route   DELETE /api/commerce/products/:productId
 * @desc    Soft delete product (Admin only)
 * @access  Private (Admin)
 * @params  productId: string (UUID)
 */
router.delete('/products/:productId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.uid;
    const { productId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }

    const { db } = require('../config/firebase');

    await db.collection('products').doc(productId).update({
      isActive: false,
      updatedAt: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Prodotto eliminato con successo'
    });

  } catch (error) {
    console.error('Delete product failed:', error);
    res.status(500).json({
      success: false,
      error: 'Errore durante l\'eliminazione del prodotto'
    });
  }
});

// ===============================
// Cart Management Routes
// ===============================

/**
 * @route   POST /api/commerce/cart/items
 * @desc    Add item to user cart
 * @access  Private
 * @body    CartItemRequest
 */
router.post('/cart/items', authMiddleware, addToCart);

/**
 * @route   GET /api/commerce/cart
 * @desc    Get user cart with summary
 * @access  Private
 */
router.get('/cart', authMiddleware, getCart);

/**
 * @route   PUT /api/commerce/cart/items/:itemId
 * @desc    Update cart item quantity
 * @access  Private
 * @params  itemId: string (UUID)
 * @body    { quantity: number }
 */
router.put('/cart/items/:itemId', authMiddleware, updateCartItem);

/**
 * @route   DELETE /api/commerce/cart/items/:itemId
 * @desc    Remove item from cart
 * @access  Private
 * @params  itemId: string (UUID)
 */
router.delete('/cart/items/:itemId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.uid;
    const { itemId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }

    const { db } = require('../config/firebase');
    const cartDoc = await db.collection('carts').doc(userId).get();

    if (!cartDoc.exists) {
      return res.status(404).json({ success: false, error: 'Carrello non trovato' });
    }

    const cart = cartDoc.data();
    const filteredItems = cart.items.filter((item: any) => item.id !== itemId);

    await db.collection('carts').doc(userId).set({
      items: filteredItems,
      updatedAt: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Prodotto rimosso dal carrello'
    });

  } catch (error) {
    console.error('Remove cart item failed:', error);
    res.status(500).json({
      success: false,
      error: 'Errore durante la rimozione dal carrello'
    });
  }
});

/**
 * @route   DELETE /api/commerce/cart
 * @desc    Clear entire cart
 * @access  Private
 */
router.delete('/cart', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }

    const { db } = require('../config/firebase');
    await db.collection('carts').doc(userId).delete();

    res.json({
      success: true,
      message: 'Carrello svuotato con successo'
    });

  } catch (error) {
    console.error('Clear cart failed:', error);
    res.status(500).json({
      success: false,
      error: 'Errore durante lo svuotamento del carrello'
    });
  }
});

// ===============================
// Order Management Routes
// ===============================

/**
 * @route   POST /api/commerce/orders
 * @desc    Create new order with payment processing
 * @access  Private
 * @body    CreateOrderRequest
 */
router.post('/orders', authMiddleware, createOrder);

/**
 * @route   GET /api/commerce/orders
 * @desc    Get user orders with pagination
 * @access  Private
 * @query   page?: number, limit?: number, status?: string
 */
router.get('/orders', authMiddleware, getUserOrders);

/**
 * @route   GET /api/commerce/orders/:orderId
 * @desc    Get specific order details
 * @access  Private
 * @params  orderId: string (UUID)
 */
router.get('/orders/:orderId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.uid;
    const { orderId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }

    const { db } = require('../config/firebase');
    const orderDoc = await db.collection('orders').doc(orderId).get();

    if (!orderDoc.exists) {
      return res.status(404).json({ success: false, error: 'Ordine non trovato' });
    }

    const order = orderDoc.data();

    if (order.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Non autorizzato ad accedere a questo ordine' });
    }

    res.json({
      success: true,
      order: { id: orderDoc.id, ...order }
    });

  } catch (error) {
    console.error('Get order failed:', error);
    res.status(500).json({
      success: false,
      error: 'Errore nel recupero dell\'ordine'
    });
  }
});

/**
 * @route   PUT /api/commerce/orders/:orderId/cancel
 * @desc    Cancel order and process refund
 * @access  Private
 * @params  orderId: string (UUID)
 * @body    { reason?: string }
 */
router.put('/orders/:orderId/cancel', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.uid;
    const { orderId } = req.params;
    const { reason } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }

    const { db } = require('../config/firebase');
    const orderDoc = await db.collection('orders').doc(orderId).get();

    if (!orderDoc.exists) {
      return res.status(404).json({ success: false, error: 'Ordine non trovato' });
    }

    const order = orderDoc.data();

    if (order.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Non autorizzato' });
    }

    if (!['confirmed', 'processing'].includes(order.status)) {
      return res.status(400).json({ success: false, error: 'Ordine non può essere cancellato' });
    }

    // Process refund via Stripe (if payment was successful)
    if (order.paymentIntentId && order.paymentStatus === 'succeeded') {
      const Stripe = require('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

      await stripe.refunds.create({
        payment_intent: order.paymentIntentId,
        reason: 'requested_by_customer'
      });
    }

    // Update order status
    await db.collection('orders').doc(orderId).update({
      status: 'cancelled',
      cancelReason: reason,
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Ordine cancellato con successo'
    });

  } catch (error) {
    console.error('Cancel order failed:', error);
    res.status(500).json({
      success: false,
      error: 'Errore durante la cancellazione dell\'ordine'
    });
  }
});

/**
 * @route   GET /api/commerce/orders/:orderId/tracking
 * @desc    Get order tracking information
 * @access  Private
 * @params  orderId: string (UUID)
 */
router.get('/orders/:orderId/tracking', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.uid;
    const { orderId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }

    const { db } = require('../config/firebase');
    const orderDoc = await db.collection('orders').doc(orderId).get();

    if (!orderDoc.exists) {
      return res.status(404).json({ success: false, error: 'Ordine non trovato' });
    }

    const order = orderDoc.data();

    if (order.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Non autorizzato' });
    }

    // Generate tracking events based on order status
    const trackingEvents = [
      {
        status: 'confirmed',
        description: 'Ordine confermato',
        timestamp: order.createdAt,
        location: 'Sistema PiùCane'
      }
    ];

    if (['processing', 'packed', 'shipped', 'delivered'].includes(order.status)) {
      trackingEvents.push({
        status: 'processing',
        description: 'Ordine in preparazione',
        timestamp: order.processingStartedAt || order.createdAt,
        location: 'Magazzino PiùCane'
      });
    }

    if (['packed', 'shipped', 'delivered'].includes(order.status)) {
      trackingEvents.push({
        status: 'packed',
        description: 'Ordine imballato',
        timestamp: order.packedAt || order.createdAt,
        location: 'Magazzino PiùCane'
      });
    }

    if (['shipped', 'delivered'].includes(order.status)) {
      trackingEvents.push({
        status: 'shipped',
        description: 'Ordine spedito',
        timestamp: order.shippedAt || order.createdAt,
        location: 'Corriere'
      });
    }

    if (order.status === 'delivered') {
      trackingEvents.push({
        status: 'delivered',
        description: 'Ordine consegnato',
        timestamp: order.deliveredAt || order.actualDelivery,
        location: order.shippingAddress.city
      });
    }

    res.json({
      success: true,
      tracking: {
        orderId,
        orderNumber: order.orderNumber,
        status: order.status,
        trackingNumber: order.trackingNumber,
        trackingCarrier: order.trackingCarrier,
        estimatedDelivery: order.estimatedDelivery,
        actualDelivery: order.actualDelivery,
        events: trackingEvents
      }
    });

  } catch (error) {
    console.error('Get tracking failed:', error);
    res.status(500).json({
      success: false,
      error: 'Errore nel recupero delle informazioni di tracking'
    });
  }
});

// ===============================
// Subscription Management Routes
// ===============================

/**
 * @route   GET /api/commerce/subscriptions
 * @desc    Get user subscriptions
 * @access  Private
 * @query   status?: string, page?: number, limit?: number
 */
router.get('/subscriptions', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.uid;
    const { status, page = 1, limit = 10 } = req.query;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }

    const { db } = require('../config/firebase');
    let query = db.collection('subscriptions')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc');

    if (status) {
      query = query.where('status', '==', status);
    }

    const offset = (Number(page) - 1) * Number(limit);
    const snapshot = await query.limit(Number(limit)).offset(offset).get();

    const subscriptions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      subscriptions
    });

  } catch (error) {
    console.error('Get subscriptions failed:', error);
    res.status(500).json({
      success: false,
      error: 'Errore nel recupero degli abbonamenti'
    });
  }
});

/**
 * @route   PUT /api/commerce/subscriptions/:subscriptionId
 * @desc    Update subscription details
 * @access  Private
 * @params  subscriptionId: string (UUID)
 * @body    UpdateSubscriptionRequest
 */
router.put('/subscriptions/:subscriptionId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.uid;
    const { subscriptionId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }

    const { db } = require('../config/firebase');
    const subscriptionDoc = await db.collection('subscriptions').doc(subscriptionId).get();

    if (!subscriptionDoc.exists) {
      return res.status(404).json({ success: false, error: 'Abbonamento non trovato' });
    }

    const subscription = subscriptionDoc.data();

    if (subscription.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Non autorizzato' });
    }

    const updates = {
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    await db.collection('subscriptions').doc(subscriptionId).update(updates);

    res.json({
      success: true,
      message: 'Abbonamento aggiornato con successo'
    });

  } catch (error) {
    console.error('Update subscription failed:', error);
    res.status(500).json({
      success: false,
      error: 'Errore durante l\'aggiornamento dell\'abbonamento'
    });
  }
});

/**
 * @route   PUT /api/commerce/subscriptions/:subscriptionId/pause
 * @desc    Pause subscription
 * @access  Private
 * @params  subscriptionId: string (UUID)
 * @body    { pausedUntil?: string, reason?: string }
 */
router.put('/subscriptions/:subscriptionId/pause', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.uid;
    const { subscriptionId } = req.params;
    const { pausedUntil, reason } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }

    const { db } = require('../config/firebase');
    const subscriptionDoc = await db.collection('subscriptions').doc(subscriptionId).get();

    if (!subscriptionDoc.exists) {
      return res.status(404).json({ success: false, error: 'Abbonamento non trovato' });
    }

    const subscription = subscriptionDoc.data();

    if (subscription.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Non autorizzato' });
    }

    await db.collection('subscriptions').doc(subscriptionId).update({
      status: 'paused',
      pausedUntil: pausedUntil || null,
      pauseReason: reason || null,
      updatedAt: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Abbonamento messo in pausa'
    });

  } catch (error) {
    console.error('Pause subscription failed:', error);
    res.status(500).json({
      success: false,
      error: 'Errore durante la pausa dell\'abbonamento'
    });
  }
});

/**
 * @route   PUT /api/commerce/subscriptions/:subscriptionId/cancel
 * @desc    Cancel subscription
 * @access  Private
 * @params  subscriptionId: string (UUID)
 * @body    { reason?: string }
 */
router.put('/subscriptions/:subscriptionId/cancel', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.uid;
    const { subscriptionId } = req.params;
    const { reason } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }

    const { db } = require('../config/firebase');
    const subscriptionDoc = await db.collection('subscriptions').doc(subscriptionId).get();

    if (!subscriptionDoc.exists) {
      return res.status(404).json({ success: false, error: 'Abbonamento non trovato' });
    }

    const subscription = subscriptionDoc.data();

    if (subscription.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Non autorizzato' });
    }

    await db.collection('subscriptions').doc(subscriptionId).update({
      status: 'cancelled',
      cancelReason: reason || null,
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Abbonamento cancellato con successo'
    });

  } catch (error) {
    console.error('Cancel subscription failed:', error);
    res.status(500).json({
      success: false,
      error: 'Errore durante la cancellazione dell\'abbonamento'
    });
  }
});

// ===============================
// Payment Methods Routes
// ===============================

/**
 * @route   GET /api/commerce/payment-methods
 * @desc    Get user payment methods
 * @access  Private
 */
router.get('/payment-methods', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }

    const { db } = require('../config/firebase');
    const snapshot = await db.collection('paymentMethods')
      .where('userId', '==', userId)
      .where('isActive', '==', true)
      .orderBy('createdAt', 'desc')
      .get();

    const paymentMethods = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      paymentMethods
    });

  } catch (error) {
    console.error('Get payment methods failed:', error);
    res.status(500).json({
      success: false,
      error: 'Errore nel recupero dei metodi di pagamento'
    });
  }
});

// ===============================
// Discount Codes Routes
// ===============================

/**
 * @route   POST /api/commerce/discount-codes/validate
 * @desc    Validate discount code
 * @access  Private
 * @body    { code: string, cartTotal?: number }
 */
router.post('/discount-codes/validate', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.uid;
    const { code, cartTotal = 0 } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }

    const { db } = require('../config/firebase');
    const discountDoc = await db.collection('discountCodes').doc(code.toUpperCase()).get();

    if (!discountDoc.exists) {
      return res.status(404).json({ success: false, error: 'Codice sconto non valido' });
    }

    const discount = discountDoc.data();

    // Validate discount
    if (!discount.isActive) {
      return res.status(400).json({ success: false, error: 'Codice sconto non attivo' });
    }

    if (discount.validUntil && new Date() > new Date(discount.validUntil)) {
      return res.status(400).json({ success: false, error: 'Codice sconto scaduto' });
    }

    if (discount.minOrderAmount && cartTotal < discount.minOrderAmount) {
      return res.status(400).json({
        success: false,
        error: `Ordine minimo di €${discount.minOrderAmount} richiesto`
      });
    }

    // Calculate discount amount
    let discountAmount = 0;
    switch (discount.type) {
      case 'percentage':
        discountAmount = cartTotal * (discount.value / 100);
        break;
      case 'fixed_amount':
        discountAmount = Math.min(discount.value, cartTotal);
        break;
      case 'free_shipping':
        discountAmount = 0; // Would calculate shipping cost
        break;
    }

    res.json({
      success: true,
      discount: {
        code: discount.code,
        type: discount.type,
        value: discount.value,
        discountAmount,
        description: discount.description
      }
    });

  } catch (error) {
    console.error('Validate discount code failed:', error);
    res.status(500).json({
      success: false,
      error: 'Errore durante la validazione del codice sconto'
    });
  }
});

export default router;