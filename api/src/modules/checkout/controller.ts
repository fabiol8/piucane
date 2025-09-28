import { Request, Response } from 'express';
import { db } from '../../config/firebase';
import { AuthenticatedRequest } from '../../middleware/auth';
import { logger } from '../../utils/logger';
import { z } from 'zod';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
});

// Checkout schema validation
const checkoutSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().min(1),
    subscriptionFrequency: z.string().optional()
  })).min(1),
  shippingAddress: z.object({
    street: z.string().min(5),
    city: z.string().min(2),
    zipCode: z.string().min(5),
    country: z.string().default('Italia')
  }).optional(),
  billingAddress: z.object({
    street: z.string().min(5),
    city: z.string().min(2),
    zipCode: z.string().min(5),
    country: z.string().default('Italia')
  }).optional(),
  paymentMethod: z.enum(['stripe', 'paypal']).default('stripe'),
  promotionCode: z.string().optional()
});

export const createCheckoutSession = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { items, shippingAddress, promotionCode } = checkoutSchema.parse(req.body);

    // Get user data
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    // Validate products and calculate totals
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    const subscriptionItems: any[] = [];
    let totalAmount = 0;

    for (const item of items) {
      const productDoc = await db.collection('products').doc(item.productId).get();

      if (!productDoc.exists) {
        return res.status(404).json({ error: `Prodotto ${item.productId} non trovato` });
      }

      const product = productDoc.data()!;

      if (!product.inStock || product.stockQuantity < item.quantity) {
        return res.status(400).json({
          error: `Prodotto ${product.name} non disponibile in quantità richiesta`
        });
      }

      // Calculate price
      let unitPrice = product.price;
      if (item.subscriptionFrequency && product.subscription?.enabled) {
        unitPrice = product.price * (1 - product.subscription.discount / 100);
      }

      totalAmount += unitPrice * item.quantity;

      if (item.subscriptionFrequency && product.subscription?.enabled) {
        // Handle subscription
        subscriptionItems.push({
          productId: item.productId,
          quantity: item.quantity,
          frequency: item.subscriptionFrequency,
          unitPrice
        });
      } else {
        // Handle one-time purchase
        lineItems.push({
          price_data: {
            currency: 'eur',
            product_data: {
              name: product.name,
              description: product.description,
              images: product.images.slice(0, 8),
              metadata: {
                productId: item.productId
              }
            },
            unit_amount: Math.round(unitPrice * 100)
          },
          quantity: item.quantity
        });
      }
    }

    // Apply promotion code if provided
    let discountAmount = 0;
    if (promotionCode) {
      const promoDoc = await db.collection('promotions').doc(promotionCode).get();
      if (promoDoc.exists) {
        const promo = promoDoc.data()!;
        const now = new Date();

        if (promo.isActive &&
            new Date(promo.validFrom.toDate()) <= now &&
            new Date(promo.validTo.toDate()) >= now &&
            promo.usageCount < promo.maxUsage) {

          if (promo.type === 'percentage') {
            discountAmount = totalAmount * (promo.value / 100);
          } else if (promo.type === 'fixed') {
            discountAmount = Math.min(promo.value, totalAmount);
          }
        }
      }
    }

    // Create order record
    const orderRef = db.collection('orders').doc();
    const orderData = {
      id: orderRef.id,
      userId,
      items: items.map(item => ({
        ...item,
        productName: '', // Will be filled after product lookup
        unitPrice: 0 // Will be filled after price calculation
      })),
      status: 'pending',
      totalAmount: totalAmount - discountAmount,
      discountAmount,
      promotionCode,
      shippingAddress: shippingAddress || userData.address,
      billingAddress: userData.address,
      paymentStatus: 'pending',
      shippingStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Create Stripe checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer_email: userData.email,
      payment_method_types: ['card'],
      mode: subscriptionItems.length > 0 ? 'subscription' : 'payment',
      success_url: `${process.env.FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/shop?checkout_cancelled=true`,
      metadata: {
        orderId: orderRef.id,
        userId
      },
      shipping_address_collection: {
        allowed_countries: ['IT', 'FR', 'DE', 'ES']
      }
    };

    if (lineItems.length > 0) {
      sessionParams.line_items = lineItems;
    }

    if (subscriptionItems.length > 0) {
      // Create subscription line items
      sessionParams.mode = 'subscription';
      sessionParams.line_items = subscriptionItems.map(item => ({
        price_data: {
          currency: 'eur',
          product_data: {
            name: `Subscription - ${item.productName}`,
            metadata: {
              productId: item.productId
            }
          },
          unit_amount: Math.round(item.unitPrice * 100),
          recurring: {
            interval: getStripeInterval(item.frequency),
            interval_count: getStripeIntervalCount(item.frequency)
          }
        },
        quantity: item.quantity
      }));
    }

    if (discountAmount > 0) {
      // Create discount coupon
      const coupon = await stripe.coupons.create({
        amount_off: Math.round(discountAmount * 100),
        currency: 'eur',
        duration: 'once'
      });
      sessionParams.discounts = [{ coupon: coupon.id }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Save order with session ID
    await orderRef.set({
      ...orderData,
      stripeSessionId: session.id
    });

    logger.info('Checkout session created', {
      orderId: orderRef.id,
      userId,
      sessionId: session.id,
      amount: totalAmount - discountAmount
    });

    res.json({
      sessionId: session.id,
      url: session.url,
      orderId: orderRef.id
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Dati non validi',
        details: error.errors
      });
    }

    logger.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Errore nella creazione della sessione di checkout' });
  }
};

export const handleStripeWebhook = async (req: Request, res: Response) => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      logger.error('Webhook signature verification failed:', err);
      return res.status(400).send('Webhook signature verification failed');
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'invoice.payment_succeeded':
        await handleSubscriptionPayment(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(event.data.object as Stripe.Subscription);
        break;

      default:
        logger.info('Unhandled webhook event type:', event.type);
    }

    res.json({ received: true });

  } catch (error) {
    logger.error('Error handling Stripe webhook:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

export const getCheckoutSession = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { sessionId } = req.params;

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.metadata?.userId !== userId) {
      return res.status(403).json({ error: 'Accesso negato' });
    }

    // Get order data
    const orderDoc = await db.collection('orders')
      .where('stripeSessionId', '==', sessionId)
      .limit(1)
      .get();

    if (orderDoc.empty) {
      return res.status(404).json({ error: 'Ordine non trovato' });
    }

    const orderData = orderDoc.docs[0].data();

    res.json({
      session: {
        id: session.id,
        payment_status: session.payment_status,
        customer_email: session.customer_email,
        amount_total: session.amount_total,
        currency: session.currency
      },
      order: {
        id: orderData.id,
        status: orderData.status,
        totalAmount: orderData.totalAmount,
        createdAt: orderData.createdAt.toDate()
      }
    });

  } catch (error) {
    logger.error('Error retrieving checkout session:', error);
    res.status(500).json({ error: 'Errore nel recuperare la sessione' });
  }
};

// Helper functions

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId;

  if (!orderId) {
    logger.error('No order ID in checkout session metadata');
    return;
  }

  const batch = db.batch();

  // Update order status
  const orderRef = db.collection('orders').doc(orderId);
  batch.update(orderRef, {
    status: 'confirmed',
    paymentStatus: 'paid',
    paidAt: new Date(),
    stripePaymentIntentId: session.payment_intent,
    updatedAt: new Date()
  });

  // Get order data to update stock
  const orderDoc = await orderRef.get();
  const orderData = orderDoc.data();

  if (orderData) {
    // Update product stock
    for (const item of orderData.items) {
      const productRef = db.collection('products').doc(item.productId);
      const productDoc = await productRef.get();

      if (productDoc.exists) {
        const currentStock = productDoc.data()!.stockQuantity;
        const newStock = Math.max(0, currentStock - item.quantity);

        batch.update(productRef, {
          stockQuantity: newStock,
          inStock: newStock > 0,
          purchases: (productDoc.data()!.purchases || 0) + item.quantity,
          updatedAt: new Date()
        });

        // Log stock movement
        const stockMovementRef = db.collection('stockMovements').doc();
        batch.set(stockMovementRef, {
          productId: item.productId,
          operation: 'subtract',
          quantity: item.quantity,
          previousStock: currentStock,
          newStock,
          reason: `Order ${orderId}`,
          orderId,
          createdAt: new Date()
        });
      }
    }

    // Update user purchase history
    const userRef = db.collection('users').doc(orderData.userId);
    batch.update(userRef, {
      totalOrders: db.FieldValue.increment(1),
      totalSpent: db.FieldValue.increment(orderData.totalAmount),
      lastOrderAt: new Date(),
      updatedAt: new Date()
    });

    // Add XP points for purchase (gamification)
    const xpEarned = Math.floor(orderData.totalAmount / 10); // 1 XP per €10 spent
    const progressRef = db.collection('userProgress').doc(orderData.userId);
    batch.update(progressRef, {
      xp: db.FieldValue.increment(xpEarned),
      totalPoints: db.FieldValue.increment(xpEarned),
      updatedAt: new Date()
    });
  }

  await batch.commit();

  logger.info('Checkout completed successfully', { orderId, sessionId: session.id });
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  logger.info('Payment succeeded', { paymentIntentId: paymentIntent.id });
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const orderId = paymentIntent.metadata?.orderId;

  if (orderId) {
    await db.collection('orders').doc(orderId).update({
      status: 'failed',
      paymentStatus: 'failed',
      failedAt: new Date(),
      updatedAt: new Date()
    });
  }

  logger.error('Payment failed', { paymentIntentId: paymentIntent.id, orderId });
}

async function handleSubscriptionPayment(invoice: Stripe.Invoice) {
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);

    // Create recurring order record
    const orderRef = db.collection('orders').doc();
    await orderRef.set({
      id: orderRef.id,
      userId: subscription.metadata?.userId,
      type: 'subscription',
      subscriptionId: subscription.id,
      status: 'confirmed',
      paymentStatus: 'paid',
      totalAmount: invoice.amount_paid / 100,
      currency: invoice.currency,
      stripeInvoiceId: invoice.id,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    logger.info('Subscription payment processed', {
      subscriptionId: subscription.id,
      invoiceId: invoice.id
    });
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;

  if (userId) {
    // Create subscription record
    const subscriptionRef = db.collection('subscriptions').doc();
    await subscriptionRef.set({
      id: subscriptionRef.id,
      userId,
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    logger.info('Subscription created', { subscriptionId: subscription.id, userId });
  }
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  const subscriptionDoc = await db.collection('subscriptions')
    .where('stripeSubscriptionId', '==', subscription.id)
    .limit(1)
    .get();

  if (!subscriptionDoc.empty) {
    await subscriptionDoc.docs[0].ref.update({
      status: 'cancelled',
      cancelledAt: new Date(),
      updatedAt: new Date()
    });

    logger.info('Subscription cancelled', { subscriptionId: subscription.id });
  }
}

function getStripeInterval(frequency: string): 'day' | 'week' | 'month' | 'year' {
  if (frequency.includes('giorni') || frequency.includes('day')) return 'day';
  if (frequency.includes('settimane') || frequency.includes('week')) return 'week';
  if (frequency.includes('mesi') || frequency.includes('month')) return 'month';
  if (frequency.includes('anni') || frequency.includes('year')) return 'year';
  return 'month'; // default
}

function getStripeIntervalCount(frequency: string): number {
  const match = frequency.match(/\d+/);
  return match ? parseInt(match[0], 10) : 1;
}