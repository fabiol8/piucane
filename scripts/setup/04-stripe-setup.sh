#!/bin/bash

# PiuCane Stripe Setup Script
# Configura Stripe account, products, webhooks, subscriptions

set -e

echo "💳 PiuCane Stripe Setup Starting..."

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo "❌ Stripe CLI not found. Installing..."
    brew install stripe/stripe-cli/stripe
fi

# Login to Stripe
echo "🔐 Authenticating with Stripe..."
stripe login

# Create Stripe products and prices
echo "🛍️ Creating Stripe products..."

# Dog Food Products
DOG_FOOD_BASIC=$(stripe products create \
  --name="PiuCane Basic - Crocchette Premium" \
  --description="Crocchette premium per cani adulti, ingredienti naturali" \
  --metadata[category]="dog-food" \
  --metadata[type]="basic" \
  --images="https://example.com/dog-food-basic.jpg" \
  --format=json | jq -r '.id')

stripe prices create \
  --product=$DOG_FOOD_BASIC \
  --unit-amount=2999 \
  --currency=eur \
  --nickname="Dog Food Basic - One Time"

stripe prices create \
  --product=$DOG_FOOD_BASIC \
  --unit-amount=2699 \
  --currency=eur \
  --recurring[interval]=month \
  --nickname="Dog Food Basic - Monthly Subscription"

# Premium Dog Food
DOG_FOOD_PREMIUM=$(stripe products create \
  --name="PiuCane Premium - Crocchette Biologiche" \
  --description="Crocchette biologiche premium con carne fresca" \
  --metadata[category]="dog-food" \
  --metadata[type]="premium" \
  --images="https://example.com/dog-food-premium.jpg" \
  --format=json | jq -r '.id')

stripe prices create \
  --product=$DOG_FOOD_PREMIUM \
  --unit-amount=4999 \
  --currency=eur \
  --nickname="Dog Food Premium - One Time"

stripe prices create \
  --product=$DOG_FOOD_PREMIUM \
  --unit-amount=4499 \
  --currency=eur \
  --recurring[interval]=month \
  --nickname="Dog Food Premium - Monthly Subscription"

# Supplements
SUPPLEMENTS_OMEGA=$(stripe products create \
  --name="PiuCane Omega-3 - Integratore Naturale" \
  --description="Integratore Omega-3 per pelo lucido e salute articolare" \
  --metadata[category]="supplements" \
  --metadata[type]="omega-3" \
  --format=json | jq -r '.id')

stripe prices create \
  --product=$SUPPLEMENTS_OMEGA \
  --unit-amount=1999 \
  --currency=eur \
  --nickname="Omega-3 Supplement"

# Treats and Snacks
TREATS_NATURAL=$(stripe products create \
  --name="PiuCane Treats - Snack Naturali" \
  --description="Snack naturali per training e premio" \
  --metadata[category]="treats" \
  --metadata[type]="natural" \
  --format=json | jq -r '.id')

stripe prices create \
  --product=$TREATS_NATURAL \
  --unit-amount=899 \
  --currency=eur \
  --nickname="Natural Treats"

echo "✅ Products created successfully!"

# Create shipping rates
echo "🚚 Creating shipping rates..."

SHIPPING_STANDARD=$(stripe shipping_rates create \
  --display-name="Spedizione Standard" \
  --type=fixed_amount \
  --fixed-amount[amount]=499 \
  --fixed-amount[currency]=eur \
  --delivery-estimate[minimum][unit]=business_day \
  --delivery-estimate[minimum][value]=3 \
  --delivery-estimate[maximum][unit]=business_day \
  --delivery-estimate[maximum][value]=5 \
  --format=json | jq -r '.id')

SHIPPING_EXPRESS=$(stripe shipping_rates create \
  --display-name="Spedizione Express" \
  --type=fixed_amount \
  --fixed-amount[amount]=999 \
  --fixed-amount[currency]=eur \
  --delivery-estimate[minimum][unit]=business_day \
  --delivery-estimate[minimum][value]=1 \
  --delivery-estimate[maximum][unit]=business_day \
  --delivery-estimate[maximum][value]=2 \
  --format=json | jq -r '.id')

SHIPPING_FREE=$(stripe shipping_rates create \
  --display-name="Spedizione Gratuita" \
  --type=fixed_amount \
  --fixed-amount[amount]=0 \
  --fixed-amount[currency]=eur \
  --delivery-estimate[minimum][unit]=business_day \
  --delivery-estimate[minimum][value]=3 \
  --delivery-estimate[maximum][unit]=business_day \
  --delivery-estimate[maximum][value]=5 \
  --metadata[min_amount]="5000" \
  --format=json | jq -r '.id')

# Create webhook endpoints
echo "🪝 Creating webhook endpoints..."

# Production webhook
WEBHOOK_PROD=$(stripe webhook_endpoints create \
  --url="https://api.piucane.it/webhooks/stripe" \
  --enabled-events=payment_intent.succeeded \
  --enabled-events=payment_intent.payment_failed \
  --enabled-events=invoice.payment_succeeded \
  --enabled-events=invoice.payment_failed \
  --enabled-events=customer.subscription.created \
  --enabled-events=customer.subscription.updated \
  --enabled-events=customer.subscription.deleted \
  --enabled-events=checkout.session.completed \
  --format=json)

WEBHOOK_SECRET_PROD=$(echo $WEBHOOK_PROD | jq -r '.secret')

# Staging webhook
WEBHOOK_STAGING=$(stripe webhook_endpoints create \
  --url="https://api-staging.piucane.it/webhooks/stripe" \
  --enabled-events=payment_intent.succeeded \
  --enabled-events=payment_intent.payment_failed \
  --enabled-events=invoice.payment_succeeded \
  --enabled-events=invoice.payment_failed \
  --enabled-events=customer.subscription.created \
  --enabled-events=customer.subscription.updated \
  --enabled-events=customer.subscription.deleted \
  --enabled-events=checkout.session.completed \
  --format=json)

WEBHOOK_SECRET_STAGING=$(echo $WEBHOOK_STAGING | jq -r '.secret')

# Create coupon codes
echo "🎫 Creating coupon codes..."

stripe coupons create \
  --id="WELCOME10" \
  --percent-off=10 \
  --duration="once" \
  --name="Benvenuto PiuCane - 10% di sconto"

stripe coupons create \
  --id="FIRSTORDER15" \
  --percent-off=15 \
  --duration="once" \
  --max-redemptions=1000 \
  --name="Primo Ordine - 15% di sconto"

stripe coupons create \
  --id="SUBSCRIBE20" \
  --percent-off=20 \
  --duration="repeating" \
  --duration-in-months=3 \
  --name="Abbonamento - 20% per 3 mesi"

# Create customer portal configuration
echo "🏛️ Configuring customer portal..."

stripe billing_portal configurations create \
  --features[customer_update][allowed_updates][]=email \
  --features[customer_update][allowed_updates][]=address \
  --features[customer_update][enabled]=true \
  --features[invoice_history][enabled]=true \
  --features[payment_method_update][enabled]=true \
  --features[subscription_update][enabled]=true \
  --features[subscription_update][default_allowed_updates][]=price \
  --features[subscription_update][default_allowed_updates][]=quantity \
  --features[subscription_update][proration_behavior]=create_prorations \
  --features[subscription_cancel][enabled]=true \
  --features[subscription_cancel][mode]=at_period_end \
  --features[subscription_cancel][cancellation_reason][enabled]=true \
  --features[subscription_pause][enabled]=true \
  --business-profile[headline]="Gestisci il tuo abbonamento PiuCane" \
  --business-profile[privacy-policy-url]="https://piucane.it/privacy" \
  --business-profile[terms-of-service-url]="https://piucane.it/terms"

# Create Stripe webhook handler for API
echo "⚡ Creating webhook handler..."

cat > api/src/routes/webhooks/stripe.ts << 'EOF'
import express from 'express';
import Stripe from 'stripe';
import { logger } from '../../utils/logger';
import { db } from '../../config/firebase';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']!;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    logger.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
        break;

      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  logger.info(`Payment succeeded: ${paymentIntent.id}`);

  // Update order status in Firestore
  const orderId = paymentIntent.metadata.orderId;
  if (orderId) {
    await db.collection('orders').doc(orderId).update({
      status: 'paid',
      paymentIntentId: paymentIntent.id,
      paidAt: new Date(),
      updatedAt: new Date()
    });
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  logger.info(`Invoice payment succeeded: ${invoice.id}`);

  const subscriptionId = invoice.subscription as string;
  if (subscriptionId) {
    await db.collection('subscriptions').doc(subscriptionId).update({
      status: 'active',
      lastPayment: new Date(),
      updatedAt: new Date()
    });
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  logger.info(`Subscription created: ${subscription.id}`);

  const customerId = subscription.customer as string;

  // Find user by Stripe customer ID
  const userQuery = await db.collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get();

  if (!userQuery.empty) {
    const userDoc = userQuery.docs[0];

    // Create subscription record
    await db.collection('subscriptions').doc(subscription.id).set({
      id: subscription.id,
      userId: userDoc.id,
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      items: subscription.items.data.map(item => ({
        priceId: item.price.id,
        productId: item.price.product as string,
        quantity: item.quantity
      })),
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  logger.info(`Subscription updated: ${subscription.id}`);

  await db.collection('subscriptions').doc(subscription.id).update({
    status: subscription.status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    updatedAt: new Date()
  });
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  logger.info(`Subscription canceled: ${subscription.id}`);

  await db.collection('subscriptions').doc(subscription.id).update({
    status: 'canceled',
    canceledAt: new Date(),
    updatedAt: new Date()
  });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  logger.info(`Checkout completed: ${session.id}`);

  // Handle one-time purchases or subscription setup
  if (session.mode === 'subscription') {
    // Subscription checkout completed
    const subscriptionId = session.subscription as string;
    // Additional subscription setup logic
  } else {
    // One-time payment completed
    const orderId = session.metadata?.orderId;
    if (orderId) {
      await db.collection('orders').doc(orderId).update({
        status: 'confirmed',
        stripeSessionId: session.id,
        confirmedAt: new Date(),
        updatedAt: new Date()
      });
    }
  }
}

export default router;
EOF

# Save configuration to environment file
echo "💾 Saving Stripe configuration..."

cat > .env.stripe << EOF
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your_secret_key_here
STRIPE_WEBHOOK_SECRET_PROD=$WEBHOOK_SECRET_PROD
STRIPE_WEBHOOK_SECRET_STAGING=$WEBHOOK_SECRET_STAGING

# Product IDs
STRIPE_PRODUCT_DOG_FOOD_BASIC=$DOG_FOOD_BASIC
STRIPE_PRODUCT_DOG_FOOD_PREMIUM=$DOG_FOOD_PREMIUM
STRIPE_PRODUCT_SUPPLEMENTS_OMEGA=$SUPPLEMENTS_OMEGA
STRIPE_PRODUCT_TREATS_NATURAL=$TREATS_NATURAL

# Shipping Rate IDs
STRIPE_SHIPPING_STANDARD=$SHIPPING_STANDARD
STRIPE_SHIPPING_EXPRESS=$SHIPPING_EXPRESS
STRIPE_SHIPPING_FREE=$SHIPPING_FREE
EOF

# Create Stripe service utility
cat > packages/lib/src/stripe/service.ts << 'EOF'
import Stripe from 'stripe';

export class StripeService {
  private stripe: Stripe;

  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16',
    });
  }

  async createCheckoutSession(params: {
    customerId?: string;
    priceId: string;
    quantity: number;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }) {
    const session = await this.stripe.checkout.sessions.create({
      customer: params.customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: params.priceId,
          quantity: params.quantity,
        },
      ],
      mode: 'payment',
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata,
      shipping_address_collection: {
        allowed_countries: ['IT', 'FR', 'DE', 'ES'],
      },
      shipping_options: [
        {
          shipping_rate: process.env.STRIPE_SHIPPING_STANDARD!,
        },
        {
          shipping_rate: process.env.STRIPE_SHIPPING_EXPRESS!,
        },
      ],
    });

    return session;
  }

  async createSubscriptionCheckout(params: {
    customerId?: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    trialPeriodDays?: number;
  }) {
    const session = await this.stripe.checkout.sessions.create({
      customer: params.customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: params.priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      subscription_data: {
        trial_period_days: params.trialPeriodDays,
      },
    });

    return session;
  }

  async createCustomer(email: string, name: string) {
    const customer = await this.stripe.customers.create({
      email,
      name,
    });

    return customer;
  }

  async createCustomerPortalSession(customerId: string, returnUrl: string) {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session;
  }
}
EOF

echo "✅ Stripe setup completed!"
echo "📋 Configuration saved to .env.stripe"
echo "🔑 Webhook secrets:"
echo "  Production: $WEBHOOK_SECRET_PROD"
echo "  Staging: $WEBHOOK_SECRET_STAGING"
echo ""
echo "📋 Next steps:"
echo "1. Replace test API keys with live keys"
echo "2. Configure tax rates in Stripe Dashboard"
echo "3. Set up fraud prevention rules"
echo "4. Configure email receipts"
echo "5. Test webhook endpoints"