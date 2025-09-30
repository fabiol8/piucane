import { Router } from 'express';
import { auth, requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { db } from '../config/firebase';
import { z } from 'zod';
import Stripe from 'stripe';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

const createSubscriptionSchema = z.object({
  productId: z.string(),
  quantity: z.number().min(1),
  frequency: z.enum(['weekly', 'biweekly', 'monthly']),
  dogId: z.string(),
  shippingAddress: z.object({
    name: z.string(),
    street: z.string(),
    city: z.string(),
    state: z.string(),
    postalCode: z.string(),
    country: z.string()
  }),
  paymentMethodId: z.string(),
  startDate: z.string().optional()
});

const updateSubscriptionSchema = z.object({
  quantity: z.number().min(1).optional(),
  frequency: z.enum(['weekly', 'biweekly', 'monthly']).optional(),
  shippingAddress: z.object({
    name: z.string(),
    street: z.string(),
    city: z.string(),
    state: z.string(),
    postalCode: z.string(),
    country: z.string()
  }).optional(),
  nextDelivery: z.string().optional()
});

router.get('/', auth, requireAuth, async (req, res) => {
  try {
    const { status = 'active', dogId } = req.query;

    let query = db.collection('subscriptions')
      .where('userId', '==', req.user!.uid)
      .orderBy('createdAt', 'desc');

    if (status !== 'all') {
      query = query.where('status', '==', status);
    }

    if (dogId) {
      query = query.where('dogId', '==', dogId);
    }

    const snapshot = await query.get();
    const subscriptions = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();

        // Populate product and dog details
        const [productDoc, dogDoc] = await Promise.all([
          db.collection('products').doc(data.productId).get(),
          db.collection('dogs').doc(data.dogId).get()
        ]);

        return {
          id: doc.id,
          ...data,
          product: productDoc.exists ? productDoc.data() : null,
          dog: dogDoc.exists ? dogDoc.data() : null
        };
      })
    );

    res.json(subscriptions);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

router.get('/:id', auth, requireAuth, async (req, res) => {
  try {
    const subscriptionDoc = await db.collection('subscriptions').doc(req.params.id).get();

    if (!subscriptionDoc.exists) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const subscription = subscriptionDoc.data()!;

    if (subscription.userId !== req.user!.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Populate related data
    const [productDoc, dogDoc] = await Promise.all([
      db.collection('products').doc(subscription.productId).get(),
      db.collection('dogs').doc(subscription.dogId).get()
    ]);

    // Get delivery history
    const ordersSnapshot = await db.collection('orders')
      .where('subscriptionId', '==', req.params.id)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const deliveryHistory = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      id: subscriptionDoc.id,
      ...subscription,
      product: productDoc.exists ? productDoc.data() : null,
      dog: dogDoc.exists ? dogDoc.data() : null,
      deliveryHistory
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

router.post('/', auth, requireAuth, validateBody(createSubscriptionSchema), async (req, res) => {
  try {
    const { productId, quantity, frequency, dogId, shippingAddress, paymentMethodId, startDate } = req.body;

    // Verify product exists
    const productDoc = await db.collection('products').doc(productId).get();
    if (!productDoc.exists) {
      return res.status(400).json({ error: 'Product not found' });
    }

    // Verify dog ownership
    const dogDoc = await db.collection('dogs').doc(dogId).get();
    if (!dogDoc.exists || dogDoc.data()?.userId !== req.user!.uid) {
      return res.status(400).json({ error: 'Dog not found or access denied' });
    }

    const product = productDoc.data()!;
    const dog = dogDoc.data()!;

    // Calculate optimal cadence based on dog data
    const optimalCadence = calculateOptimalCadence(product, dog, quantity);

    // Calculate subscription pricing (10% discount)
    const unitPrice = product.price * 0.9;
    const total = unitPrice * quantity;

    // Create Stripe subscription
    const stripeSubscription = await stripe.subscriptions.create({
      customer: req.user!.stripeCustomerId,
      items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: `${product.name} - Abbonamento`,
            metadata: { productId }
          },
          recurring: {
            interval: frequency === 'weekly' ? 'week' : frequency === 'monthly' ? 'month' : 'week',
            interval_count: frequency === 'biweekly' ? 2 : 1
          },
          unit_amount: Math.round(unitPrice * 100)
        },
        quantity
      }],
      default_payment_method: paymentMethodId,
      metadata: {
        userId: req.user!.uid,
        dogId,
        productId
      }
    });

    // Calculate next delivery date
    const nextDelivery = new Date(startDate || Date.now());
    switch (frequency) {
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

    const subscriptionData = {
      userId: req.user!.uid,
      productId,
      dogId,
      stripeSubscriptionId: stripeSubscription.id,
      quantity,
      frequency,
      unitPrice,
      shippingAddress,
      status: 'active',
      nextDelivery,
      optimalCadence,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const subscriptionRef = await db.collection('subscriptions').add(subscriptionData);

    res.json({
      id: subscriptionRef.id,
      ...subscriptionData,
      product,
      dog
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

router.put('/:id', auth, requireAuth, validateBody(updateSubscriptionSchema), async (req, res) => {
  try {
    const subscriptionDoc = await db.collection('subscriptions').doc(req.params.id).get();

    if (!subscriptionDoc.exists) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const subscription = subscriptionDoc.data()!;

    if (subscription.userId !== req.user!.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updates: any = {
      updatedAt: new Date()
    };

    // Update Stripe subscription if quantity or frequency changed
    if (req.body.quantity || req.body.frequency) {
      const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);

      if (req.body.quantity) {
        await stripe.subscriptionItems.update(stripeSubscription.items.data[0].id, {
          quantity: req.body.quantity
        });
        updates.quantity = req.body.quantity;
      }

      if (req.body.frequency) {
        // For frequency changes, we need to create a new subscription
        // This is a simplified approach - in production, you'd want to handle this more gracefully
        updates.frequency = req.body.frequency;
      }
    }

    if (req.body.shippingAddress) {
      updates.shippingAddress = req.body.shippingAddress;
    }

    if (req.body.nextDelivery) {
      updates.nextDelivery = new Date(req.body.nextDelivery);
    }

    await db.collection('subscriptions').doc(req.params.id).update(updates);

    res.json({
      id: req.params.id,
      ...subscription,
      ...updates
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

router.put('/:id/pause', auth, requireAuth, async (req, res) => {
  try {
    const subscriptionDoc = await db.collection('subscriptions').doc(req.params.id).get();

    if (!subscriptionDoc.exists) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const subscription = subscriptionDoc.data()!;

    if (subscription.userId !== req.user!.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Pause Stripe subscription
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      pause_collection: {
        behavior: 'void'
      }
    });

    await db.collection('subscriptions').doc(req.params.id).update({
      status: 'paused',
      pausedAt: new Date(),
      updatedAt: new Date()
    });

    res.json({ message: 'Subscription paused successfully' });
  } catch (error) {
    console.error('Error pausing subscription:', error);
    res.status(500).json({ error: 'Failed to pause subscription' });
  }
});

router.put('/:id/resume', auth, requireAuth, async (req, res) => {
  try {
    const subscriptionDoc = await db.collection('subscriptions').doc(req.params.id).get();

    if (!subscriptionDoc.exists) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const subscription = subscriptionDoc.data()!;

    if (subscription.userId !== req.user!.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Resume Stripe subscription
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      pause_collection: ''
    });

    // Calculate new next delivery date
    const nextDelivery = new Date();
    switch (subscription.frequency) {
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

    await db.collection('subscriptions').doc(req.params.id).update({
      status: 'active',
      nextDelivery,
      resumedAt: new Date(),
      updatedAt: new Date()
    });

    res.json({ message: 'Subscription resumed successfully' });
  } catch (error) {
    console.error('Error resuming subscription:', error);
    res.status(500).json({ error: 'Failed to resume subscription' });
  }
});

router.delete('/:id', auth, requireAuth, async (req, res) => {
  try {
    const subscriptionDoc = await db.collection('subscriptions').doc(req.params.id).get();

    if (!subscriptionDoc.exists) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const subscription = subscriptionDoc.data()!;

    if (subscription.userId !== req.user!.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Cancel Stripe subscription
    await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);

    await db.collection('subscriptions').doc(req.params.id).update({
      status: 'cancelled',
      cancelledAt: new Date(),
      updatedAt: new Date()
    });

    res.json({ message: 'Subscription cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

router.get('/:id/preview-next', auth, requireAuth, async (req, res) => {
  try {
    const subscriptionDoc = await db.collection('subscriptions').doc(req.params.id).get();

    if (!subscriptionDoc.exists) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const subscription = subscriptionDoc.data()!;

    if (subscription.userId !== req.user!.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get product and dog data
    const [productDoc, dogDoc] = await Promise.all([
      db.collection('products').doc(subscription.productId).get(),
      db.collection('dogs').doc(subscription.dogId).get()
    ]);

    const product = productDoc.data()!;
    const dog = dogDoc.data()!;

    // Calculate current weight (if weight tracking is enabled)
    const currentWeight = await getCurrentDogWeight(subscription.dogId);

    // Recalculate dosage based on current weight
    const dosageInfo = calculateDosage(product, dog, currentWeight);

    // Check if subscription quantity is still optimal
    const optimalQuantity = Math.ceil(dosageInfo.dailyDose * getDaysForFrequency(subscription.frequency) / product.servingsPerPackage);

    const nextDelivery = {
      date: subscription.nextDelivery,
      quantity: subscription.quantity,
      unitPrice: subscription.unitPrice,
      total: subscription.unitPrice * subscription.quantity,
      dosageInfo,
      optimalQuantity,
      isQuantityOptimal: subscription.quantity === optimalQuantity,
      recommendations: []
    };

    if (!nextDelivery.isQuantityOptimal) {
      nextDelivery.recommendations.push({
        type: 'quantity_adjustment',
        message: `Considerando il peso attuale di ${dog.name} (${currentWeight}kg), la quantità ottimale sarebbe ${optimalQuantity} confezioni.`,
        suggestedQuantity: optimalQuantity
      });
    }

    res.json(nextDelivery);
  } catch (error) {
    console.error('Error previewing next delivery:', error);
    res.status(500).json({ error: 'Failed to preview next delivery' });
  }
});

function calculateOptimalCadence(product: any, dog: any, quantity: number): number {
  const dailyDose = calculateDailyDose(product, dog.weight);
  const totalServing = quantity * product.servingsPerPackage;
  return Math.ceil(totalServing / dailyDose);
}

function calculateDailyDose(product: any, dogWeight: number): number {
  const dosageRule = product.dosage.find((rule: any) =>
    dogWeight >= rule.minWeight && dogWeight <= rule.maxWeight
  );
  return dosageRule ? dosageRule.dailyAmount : product.dosage[0].dailyAmount;
}

function calculateDosage(product: any, dog: any, currentWeight?: number): any {
  const weight = currentWeight || dog.weight;
  const dailyDose = calculateDailyDose(product, weight);

  return {
    dailyDose,
    weeklyDose: dailyDose * 7,
    monthlyDose: dailyDose * 30,
    instructions: `Somministrare ${dailyDose}${product.unit} al giorno`
  };
}

function getDaysForFrequency(frequency: string): number {
  switch (frequency) {
    case 'weekly': return 7;
    case 'biweekly': return 14;
    case 'monthly': return 30;
    default: return 30;
  }
}

async function getCurrentDogWeight(dogId: string): Promise<number> {
  try {
    const weightSnapshot = await db.collection('dogs').doc(dogId)
      .collection('weightHistory')
      .orderBy('date', 'desc')
      .limit(1)
      .get();

    if (!weightSnapshot.empty) {
      return weightSnapshot.docs[0].data().weight;
    }

    // Fallback to dog's initial weight
    const dogDoc = await db.collection('dogs').doc(dogId).get();
    return dogDoc.data()?.weight || 0;
  } catch (error) {
    console.error('Error getting current dog weight:', error);
    return 0;
  }
}

export default router;