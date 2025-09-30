import { Router } from 'express';
import { auth, requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { db } from '../config/firebase';
import { z } from 'zod';
import Stripe from 'stripe';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().min(1),
    isSubscription: z.boolean().optional(),
    subscriptionFrequency: z.enum(['weekly', 'biweekly', 'monthly']).optional(),
    dogId: z.string().optional()
  })),
  shippingAddress: z.object({
    name: z.string(),
    street: z.string(),
    city: z.string(),
    state: z.string(),
    postalCode: z.string(),
    country: z.string()
  }),
  paymentMethodId: z.string(),
  discountCode: z.string().optional(),
  notes: z.string().optional()
});

router.get('/', auth, requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, startDate, endDate } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    let query = db.collection('orders')
      .where('userId', '==', req.user!.uid)
      .orderBy('createdAt', 'desc');

    if (status) {
      query = query.where('status', '==', status);
    }

    if (startDate && endDate) {
      query = query
        .where('createdAt', '>=', new Date(startDate as string))
        .where('createdAt', '<=', new Date(endDate as string));
    }

    const snapshot = await query.limit(limitNum).offset(offset).get();
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const totalSnapshot = await db.collection('orders')
      .where('userId', '==', req.user!.uid)
      .get();

    res.json({
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalSnapshot.size,
        pages: Math.ceil(totalSnapshot.size / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

router.get('/:id', auth, requireAuth, async (req, res) => {
  try {
    const orderDoc = await db.collection('orders').doc(req.params.id).get();

    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderDoc.data();

    if (order?.userId !== req.user!.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Populate product details
    const populatedItems = await Promise.all(
      order.items.map(async (item: any) => {
        const productDoc = await db.collection('products').doc(item.productId).get();
        return {
          ...item,
          product: productDoc.exists ? productDoc.data() : null
        };
      })
    );

    res.json({
      id: orderDoc.id,
      ...order,
      items: populatedItems
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

router.post('/', auth, requireAuth, validateBody(createOrderSchema), async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethodId, discountCode, notes } = req.body;

    // Calculate order totals
    let subtotal = 0;
    let discount = 0;
    const processedItems = [];

    for (const item of items) {
      const productDoc = await db.collection('products').doc(item.productId).get();
      if (!productDoc.exists) {
        return res.status(400).json({ error: `Product ${item.productId} not found` });
      }

      const product = productDoc.data()!;
      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;

      processedItems.push({
        ...item,
        unitPrice: product.price,
        total: itemTotal,
        name: product.name,
        image: product.images?.[0]
      });
    }

    // Apply discount if provided
    if (discountCode) {
      const discountDoc = await db.collection('discounts').doc(discountCode).get();
      if (discountDoc.exists) {
        const discountData = discountDoc.data()!;
        if (discountData.active && new Date() <= discountData.expiresAt.toDate()) {
          if (discountData.type === 'percentage') {
            discount = subtotal * (discountData.value / 100);
          } else {
            discount = Math.min(discountData.value, subtotal);
          }
        }
      }
    }

    const shipping = subtotal >= 50 ? 0 : 5.99;
    const tax = (subtotal - discount + shipping) * 0.08; // 8% tax
    const total = subtotal - discount + shipping + tax;

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100),
      currency: 'eur',
      payment_method: paymentMethodId,
      confirmation_method: 'manual',
      confirm: true,
      metadata: {
        userId: req.user!.uid,
        orderType: 'purchase'
      }
    });

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment failed' });
    }

    // Create order document
    const orderData = {
      userId: req.user!.uid,
      items: processedItems,
      shippingAddress,
      billing: {
        subtotal,
        discount,
        shipping,
        tax,
        total
      },
      paymentIntentId: paymentIntent.id,
      status: 'confirmed',
      trackingNumber: null,
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      notes,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const orderRef = await db.collection('orders').add(orderData);

    // Create subscriptions for subscription items
    for (const item of items.filter(i => i.isSubscription)) {
      const nextDelivery = new Date();

      switch (item.subscriptionFrequency) {
        case 'weekly':
          nextDelivery.setDate(nextDelivery.getDate() + 7);
          break;
        case 'biweekly':
          nextDelivery.setDate(nextDelivery.getDate() + 14);
          break;
        case 'monthly':
          nextDelivery.setMonth(nextDelivery.getMonth() + 1);
          break;
      }

      await db.collection('subscriptions').add({
        userId: req.user!.uid,
        orderId: orderRef.id,
        productId: item.productId,
        quantity: item.quantity,
        frequency: item.subscriptionFrequency,
        dogId: item.dogId,
        shippingAddress,
        status: 'active',
        nextDelivery,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // Update user's gamification data
    await updateGamificationForOrder(req.user!.uid, total);

    res.json({
      id: orderRef.id,
      ...orderData,
      paymentStatus: 'succeeded'
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

router.put('/:id/cancel', auth, requireAuth, async (req, res) => {
  try {
    const orderDoc = await db.collection('orders').doc(req.params.id).get();

    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderDoc.data()!;

    if (order.userId !== req.user!.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!['confirmed', 'processing'].includes(order.status)) {
      return res.status(400).json({ error: 'Order cannot be cancelled' });
    }

    // Refund payment
    if (order.paymentIntentId) {
      await stripe.refunds.create({
        payment_intent: order.paymentIntentId,
        reason: 'requested_by_customer'
      });
    }

    await db.collection('orders').doc(req.params.id).update({
      status: 'cancelled',
      cancelledAt: new Date(),
      updatedAt: new Date()
    });

    res.json({ message: 'Order cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

router.get('/:id/tracking', auth, requireAuth, async (req, res) => {
  try {
    const orderDoc = await db.collection('orders').doc(req.params.id).get();

    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderDoc.data()!;

    if (order.userId !== req.user!.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const trackingEvents = [
      {
        status: 'confirmed',
        description: 'Ordine confermato',
        timestamp: order.createdAt,
        location: 'Sistema PiùCane'
      }
    ];

    if (order.status === 'processing') {
      trackingEvents.push({
        status: 'processing',
        description: 'Ordine in preparazione',
        timestamp: order.processingStartedAt || new Date(),
        location: 'Magazzino PiùCane'
      });
    }

    if (order.status === 'shipped' && order.trackingNumber) {
      trackingEvents.push({
        status: 'shipped',
        description: 'Ordine spedito',
        timestamp: order.shippedAt || new Date(),
        location: 'Corriere'
      });
    }

    if (order.status === 'delivered') {
      trackingEvents.push({
        status: 'delivered',
        description: 'Ordine consegnato',
        timestamp: order.deliveredAt || new Date(),
        location: order.shippingAddress.city
      });
    }

    res.json({
      orderId: req.params.id,
      status: order.status,
      trackingNumber: order.trackingNumber,
      estimatedDelivery: order.estimatedDelivery,
      events: trackingEvents
    });
  } catch (error) {
    console.error('Error fetching tracking:', error);
    res.status(500).json({ error: 'Failed to fetch tracking information' });
  }
});

async function updateGamificationForOrder(userId: string, orderTotal: number) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data() || {};

    const currentPoints = userData.gamification?.points || 0;
    const pointsEarned = Math.floor(orderTotal * 10); // 10 points per euro spent

    await db.collection('users').doc(userId).update({
      'gamification.points': currentPoints + pointsEarned,
      'gamification.totalSpent': (userData.gamification?.totalSpent || 0) + orderTotal,
      'gamification.ordersCount': (userData.gamification?.ordersCount || 0) + 1,
      'gamification.lastOrderAt': new Date()
    });

    // Record points transaction
    await db.collection('pointsTransactions').add({
      userId,
      type: 'earned',
      amount: pointsEarned,
      source: 'order',
      description: `Punti guadagnati per l'acquisto`,
      createdAt: new Date()
    });

    // Check for new badges
    await checkAndAwardBadges(userId, userData.gamification || {});
  } catch (error) {
    console.error('Error updating gamification:', error);
  }
}

async function checkAndAwardBadges(userId: string, gamificationData: any) {
  const badges = [
    {
      id: 'first_purchase',
      name: 'Primo Acquisto',
      condition: () => gamificationData.ordersCount >= 1,
      points: 100
    },
    {
      id: 'loyal_customer',
      name: 'Cliente Fedele',
      condition: () => gamificationData.ordersCount >= 5,
      points: 500
    },
    {
      id: 'big_spender',
      name: 'Grande Spesa',
      condition: () => gamificationData.totalSpent >= 100,
      points: 200
    }
  ];

  for (const badge of badges) {
    if (badge.condition() && !gamificationData.badges?.includes(badge.id)) {
      await db.collection('users').doc(userId).update({
        'gamification.badges': [...(gamificationData.badges || []), badge.id],
        'gamification.points': gamificationData.points + badge.points
      });

      await db.collection('pointsTransactions').add({
        userId,
        type: 'earned',
        amount: badge.points,
        source: 'badge',
        description: `Badge "${badge.name}" sbloccato`,
        createdAt: new Date()
      });
    }
  }
}

export default router;