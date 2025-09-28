import { Request, Response } from 'express';
import { db } from '../../config/firebase';
import { AuthenticatedRequest } from '../../middleware/auth';
import { logger } from '../../utils/logger';
import { z } from 'zod';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
});

// Subscription schema validation
const subscriptionSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1),
  frequency: z.enum(['weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly']),
  customFrequency: z.object({
    interval: z.enum(['day', 'week', 'month']),
    count: z.number().int().min(1).max(12)
  }).optional(),
  startDate: z.string().optional(),
  shippingAddress: z.object({
    street: z.string().min(5),
    city: z.string().min(2),
    zipCode: z.string().min(5),
    country: z.string().default('Italia')
  }).optional()
});

const updateSubscriptionSchema = z.object({
  quantity: z.number().int().min(1).optional(),
  frequency: z.enum(['weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly']).optional(),
  customFrequency: z.object({
    interval: z.enum(['day', 'week', 'month']),
    count: z.number().int().min(1).max(12)
  }).optional(),
  nextDeliveryDate: z.string().optional(),
  pauseUntil: z.string().optional(),
  shippingAddress: z.object({
    street: z.string().min(5),
    city: z.string().min(2),
    zipCode: z.string().min(5),
    country: z.string().default('Italia')
  }).optional()
});

export const createSubscription = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const validatedData = subscriptionSchema.parse(req.body);

    // Get product data
    const productDoc = await db.collection('products').doc(validatedData.productId).get();

    if (!productDoc.exists) {
      return res.status(404).json({ error: 'Prodotto non trovato' });
    }

    const product = productDoc.data()!;

    if (!product.subscription?.enabled) {
      return res.status(400).json({ error: 'Prodotto non disponibile per abbonamento' });
    }

    // Get user data
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    // Calculate subscription price
    const basePrice = product.price;
    const discountedPrice = basePrice * (1 - product.subscription.discount / 100);

    // Calculate next delivery date
    const startDate = validatedData.startDate ? new Date(validatedData.startDate) : new Date();
    const nextDeliveryDate = calculateNextDeliveryDate(startDate, validatedData.frequency, validatedData.customFrequency);

    // Create Stripe subscription
    const stripeCustomer = await getOrCreateStripeCustomer(userId, userData);

    const subscriptionInterval = getStripeInterval(validatedData.frequency, validatedData.customFrequency);
    const subscriptionIntervalCount = getStripeIntervalCount(validatedData.frequency, validatedData.customFrequency);

    // Create product and price in Stripe if not exists
    let stripeProduct = await stripe.products.search({
      query: `metadata['productId']:'${validatedData.productId}'`
    });

    if (stripeProduct.data.length === 0) {
      stripeProduct.data = [await stripe.products.create({
        name: `${product.name} - Abbonamento`,
        description: product.description,
        images: product.images.slice(0, 8),
        metadata: {
          productId: validatedData.productId
        }
      })];
    }

    // Create recurring price
    const stripePrice = await stripe.prices.create({
      currency: 'eur',
      product: stripeProduct.data[0].id,
      unit_amount: Math.round(discountedPrice * 100),
      recurring: {
        interval: subscriptionInterval,
        interval_count: subscriptionIntervalCount
      }
    });

    // Create Stripe subscription
    const stripeSubscription = await stripe.subscriptions.create({
      customer: stripeCustomer.id,
      items: [{
        price: stripePrice.id,
        quantity: validatedData.quantity
      }],
      trial_end: Math.floor(nextDeliveryDate.getTime() / 1000),
      metadata: {
        userId,
        productId: validatedData.productId,
        frequency: validatedData.frequency
      }
    });

    // Create subscription record
    const subscriptionRef = db.collection('subscriptions').doc();
    const subscriptionData = {
      id: subscriptionRef.id,
      userId,
      productId: validatedData.productId,
      productName: product.name,
      productImage: product.images[0] || '',
      quantity: validatedData.quantity,
      frequency: validatedData.frequency,
      customFrequency: validatedData.customFrequency,
      basePrice,
      discountedPrice,
      totalPrice: discountedPrice * validatedData.quantity,
      discountPercentage: product.subscription.discount,
      status: 'active',
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId: stripePrice.id,
      nextDeliveryDate,
      lastDeliveryDate: null,
      totalDeliveries: 0,
      shippingAddress: validatedData.shippingAddress || userData.address,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await subscriptionRef.set(subscriptionData);

    // Create first delivery schedule
    await createDeliverySchedule(subscriptionRef.id, nextDeliveryDate, validatedData.quantity);

    // Update user subscription count
    await db.collection('users').doc(userId).update({
      totalSubscriptions: db.FieldValue.increment(1),
      updatedAt: new Date()
    });

    logger.info('Subscription created', {
      subscriptionId: subscriptionRef.id,
      userId,
      productId: validatedData.productId,
      stripeSubscriptionId: stripeSubscription.id
    });

    res.status(201).json({
      id: subscriptionRef.id,
      ...subscriptionData,
      stripeClientSecret: stripeSubscription.latest_invoice ?
        await getInvoiceClientSecret(stripeSubscription.latest_invoice as string) : null
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Dati non validi',
        details: error.errors
      });
    }

    logger.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Errore nella creazione dell\'abbonamento' });
  }
};

export const getUserSubscriptions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { status, page = 1, limit = 10 } = req.query;

    let query = db.collection('subscriptions')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc');

    if (status) {
      query = query.where('status', '==', status);
    }

    // Apply pagination
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    if (offset > 0) {
      // Implement cursor-based pagination here
    }

    query = query.limit(limitNum);

    const snapshot = await query.get();
    const subscriptions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      nextDeliveryDate: doc.data().nextDeliveryDate?.toDate(),
      lastDeliveryDate: doc.data().lastDeliveryDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));

    // Get next deliveries for active subscriptions
    const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active');
    const nextDeliveries = [];

    for (const subscription of activeSubscriptions) {
      const nextDelivery = await getNextDelivery(subscription.id);
      if (nextDelivery) {
        nextDeliveries.push(nextDelivery);
      }
    }

    res.json({
      subscriptions,
      nextDeliveries,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: snapshot.size
      }
    });

  } catch (error) {
    logger.error('Error fetching user subscriptions:', error);
    res.status(500).json({ error: 'Errore nel recuperare gli abbonamenti' });
  }
};

export const getSubscription = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { id } = req.params;

    const subscriptionDoc = await db.collection('subscriptions').doc(id).get();

    if (!subscriptionDoc.exists) {
      return res.status(404).json({ error: 'Abbonamento non trovato' });
    }

    const subscription = subscriptionDoc.data()!;

    if (subscription.userId !== userId) {
      return res.status(403).json({ error: 'Accesso negato' });
    }

    // Get delivery history
    const deliveriesSnapshot = await db.collection('deliveries')
      .where('subscriptionId', '==', id)
      .orderBy('scheduledDate', 'desc')
      .limit(10)
      .get();

    const deliveries = deliveriesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      scheduledDate: doc.data().scheduledDate?.toDate(),
      deliveredDate: doc.data().deliveredDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate()
    }));

    // Get next delivery
    const nextDelivery = await getNextDelivery(id);

    res.json({
      ...subscription,
      nextDeliveryDate: subscription.nextDeliveryDate?.toDate(),
      lastDeliveryDate: subscription.lastDeliveryDate?.toDate(),
      createdAt: subscription.createdAt?.toDate(),
      updatedAt: subscription.updatedAt?.toDate(),
      deliveries,
      nextDelivery
    });

  } catch (error) {
    logger.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Errore nel recuperare l\'abbonamento' });
  }
};

export const updateSubscription = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { id } = req.params;
    const validatedData = updateSubscriptionSchema.parse(req.body);

    const subscriptionDoc = await db.collection('subscriptions').doc(id).get();

    if (!subscriptionDoc.exists) {
      return res.status(404).json({ error: 'Abbonamento non trovato' });
    }

    const subscription = subscriptionDoc.data()!;

    if (subscription.userId !== userId) {
      return res.status(403).json({ error: 'Accesso negato' });
    }

    const updates: any = {
      updatedAt: new Date()
    };

    // Update quantity
    if (validatedData.quantity && validatedData.quantity !== subscription.quantity) {
      // Update Stripe subscription
      const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        items: [{
          id: stripeSubscription.items.data[0].id,
          quantity: validatedData.quantity
        }]
      });

      updates.quantity = validatedData.quantity;
      updates.totalPrice = subscription.discountedPrice * validatedData.quantity;
    }

    // Update frequency
    if (validatedData.frequency && validatedData.frequency !== subscription.frequency) {
      // This requires creating a new subscription in Stripe
      // For simplicity, we'll just update our record and handle it in the next billing cycle
      updates.frequency = validatedData.frequency;
      updates.customFrequency = validatedData.customFrequency;

      // Recalculate next delivery date
      const currentNext = subscription.nextDeliveryDate.toDate();
      updates.nextDeliveryDate = calculateNextDeliveryDate(
        currentNext,
        validatedData.frequency,
        validatedData.customFrequency
      );
    }

    // Update next delivery date
    if (validatedData.nextDeliveryDate) {
      updates.nextDeliveryDate = new Date(validatedData.nextDeliveryDate);
    }

    // Handle pause
    if (validatedData.pauseUntil) {
      const pauseDate = new Date(validatedData.pauseUntil);
      if (pauseDate > new Date()) {
        // Pause Stripe subscription
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          pause_collection: {
            behavior: 'void',
            resumes_at: Math.floor(pauseDate.getTime() / 1000)
          }
        });

        updates.status = 'paused';
        updates.pausedUntil = pauseDate;
      }
    }

    // Update shipping address
    if (validatedData.shippingAddress) {
      updates.shippingAddress = validatedData.shippingAddress;
    }

    await db.collection('subscriptions').doc(id).update(updates);

    logger.info('Subscription updated', {
      subscriptionId: id,
      userId,
      updates: Object.keys(updates)
    });

    res.json({
      success: true,
      message: 'Abbonamento aggiornato con successo',
      updates
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Dati non validi',
        details: error.errors
      });
    }

    logger.error('Error updating subscription:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento dell\'abbonamento' });
  }
};

export const cancelSubscription = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { id } = req.params;
    const { reason, immediate = false } = req.body;

    const subscriptionDoc = await db.collection('subscriptions').doc(id).get();

    if (!subscriptionDoc.exists) {
      return res.status(404).json({ error: 'Abbonamento non trovato' });
    }

    const subscription = subscriptionDoc.data()!;

    if (subscription.userId !== userId) {
      return res.status(403).json({ error: 'Accesso negato' });
    }

    // Cancel Stripe subscription
    if (immediate) {
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
    } else {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true
      });
    }

    // Update subscription record
    const updates: any = {
      status: immediate ? 'cancelled' : 'cancelling',
      cancelReason: reason,
      cancelledAt: immediate ? new Date() : null,
      cancelAtPeriodEnd: !immediate,
      updatedAt: new Date()
    };

    await db.collection('subscriptions').doc(id).update(updates);

    // Update user subscription count
    if (immediate) {
      await db.collection('users').doc(userId).update({
        totalSubscriptions: db.FieldValue.increment(-1),
        updatedAt: new Date()
      });
    }

    logger.info('Subscription cancelled', {
      subscriptionId: id,
      userId,
      immediate,
      reason
    });

    res.json({
      success: true,
      message: immediate
        ? 'Abbonamento cancellato immediatamente'
        : 'Abbonamento verrà cancellato alla fine del periodo corrente'
    });

  } catch (error) {
    logger.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Errore nella cancellazione dell\'abbonamento' });
  }
};

export const pauseSubscription = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { id } = req.params;
    const { pauseUntil } = req.body;

    const subscriptionDoc = await db.collection('subscriptions').doc(id).get();

    if (!subscriptionDoc.exists) {
      return res.status(404).json({ error: 'Abbonamento non trovato' });
    }

    const subscription = subscriptionDoc.data()!;

    if (subscription.userId !== userId) {
      return res.status(403).json({ error: 'Accesso negato' });
    }

    const pauseDate = new Date(pauseUntil);

    // Pause Stripe subscription
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      pause_collection: {
        behavior: 'void',
        resumes_at: Math.floor(pauseDate.getTime() / 1000)
      }
    });

    // Update subscription record
    await db.collection('subscriptions').doc(id).update({
      status: 'paused',
      pausedUntil: pauseDate,
      pausedAt: new Date(),
      updatedAt: new Date()
    });

    logger.info('Subscription paused', {
      subscriptionId: id,
      userId,
      pauseUntil: pauseDate
    });

    res.json({
      success: true,
      message: 'Abbonamento messo in pausa con successo'
    });

  } catch (error) {
    logger.error('Error pausing subscription:', error);
    res.status(500).json({ error: 'Errore nella messa in pausa dell\'abbonamento' });
  }
};

export const resumeSubscription = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { id } = req.params;

    const subscriptionDoc = await db.collection('subscriptions').doc(id).get();

    if (!subscriptionDoc.exists) {
      return res.status(404).json({ error: 'Abbonamento non trovato' });
    }

    const subscription = subscriptionDoc.data()!;

    if (subscription.userId !== userId) {
      return res.status(403).json({ error: 'Accesso negato' });
    }

    // Resume Stripe subscription
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      pause_collection: ''
    });

    // Calculate next delivery date
    const nextDeliveryDate = calculateNextDeliveryDate(
      new Date(),
      subscription.frequency,
      subscription.customFrequency
    );

    // Update subscription record
    await db.collection('subscriptions').doc(id).update({
      status: 'active',
      pausedUntil: null,
      pausedAt: null,
      resumedAt: new Date(),
      nextDeliveryDate,
      updatedAt: new Date()
    });

    // Create new delivery schedule
    await createDeliverySchedule(id, nextDeliveryDate, subscription.quantity);

    logger.info('Subscription resumed', {
      subscriptionId: id,
      userId
    });

    res.json({
      success: true,
      message: 'Abbonamento riattivato con successo'
    });

  } catch (error) {
    logger.error('Error resuming subscription:', error);
    res.status(500).json({ error: 'Errore nella riattivazione dell\'abbonamento' });
  }
};

// Helper functions

async function getOrCreateStripeCustomer(userId: string, userData: any) {
  // Check if customer already exists
  const customers = await stripe.customers.search({
    query: `metadata['userId']:'${userId}'`
  });

  if (customers.data.length > 0) {
    return customers.data[0];
  }

  // Create new customer
  return await stripe.customers.create({
    email: userData.email,
    name: userData.name,
    metadata: {
      userId
    }
  });
}

function calculateNextDeliveryDate(startDate: Date, frequency: string, customFrequency?: any): Date {
  const nextDate = new Date(startDate);

  if (customFrequency) {
    switch (customFrequency.interval) {
      case 'day':
        nextDate.setDate(nextDate.getDate() + customFrequency.count);
        break;
      case 'week':
        nextDate.setDate(nextDate.getDate() + (customFrequency.count * 7));
        break;
      case 'month':
        nextDate.setMonth(nextDate.getMonth() + customFrequency.count);
        break;
    }
  } else {
    switch (frequency) {
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'biweekly':
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'bimonthly':
        nextDate.setMonth(nextDate.getMonth() + 2);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
    }
  }

  return nextDate;
}

function getStripeInterval(frequency: string, customFrequency?: any): 'day' | 'week' | 'month' | 'year' {
  if (customFrequency) {
    return customFrequency.interval === 'day' ? 'day' :
           customFrequency.interval === 'week' ? 'week' : 'month';
  }

  switch (frequency) {
    case 'weekly':
    case 'biweekly':
      return 'week';
    case 'monthly':
    case 'bimonthly':
    case 'quarterly':
      return 'month';
    default:
      return 'month';
  }
}

function getStripeIntervalCount(frequency: string, customFrequency?: any): number {
  if (customFrequency) {
    return customFrequency.count;
  }

  switch (frequency) {
    case 'weekly':
      return 1;
    case 'biweekly':
      return 2;
    case 'monthly':
      return 1;
    case 'bimonthly':
      return 2;
    case 'quarterly':
      return 3;
    default:
      return 1;
  }
}

async function createDeliverySchedule(subscriptionId: string, deliveryDate: Date, quantity: number) {
  const deliveryRef = db.collection('deliveries').doc();
  await deliveryRef.set({
    id: deliveryRef.id,
    subscriptionId,
    scheduledDate: deliveryDate,
    quantity,
    status: 'scheduled',
    createdAt: new Date()
  });
}

async function getNextDelivery(subscriptionId: string) {
  const deliveriesSnapshot = await db.collection('deliveries')
    .where('subscriptionId', '==', subscriptionId)
    .where('status', '==', 'scheduled')
    .orderBy('scheduledDate', 'asc')
    .limit(1)
    .get();

  if (deliveriesSnapshot.empty) {
    return null;
  }

  const delivery = deliveriesSnapshot.docs[0].data();
  return {
    id: deliveriesSnapshot.docs[0].id,
    ...delivery,
    scheduledDate: delivery.scheduledDate?.toDate()
  };
}

async function getInvoiceClientSecret(invoiceId: string): Promise<string | null> {
  try {
    const invoice = await stripe.invoices.retrieve(invoiceId);
    if (invoice.payment_intent && typeof invoice.payment_intent === 'string') {
      const paymentIntent = await stripe.paymentIntents.retrieve(invoice.payment_intent);
      return paymentIntent.client_secret;
    }
    return null;
  } catch (error) {
    logger.error('Error getting invoice client secret:', error);
    return null;
  }
}