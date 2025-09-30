# E-commerce — Index
**Owner:** Backend + Product Team • **Ultimo aggiornamento:** 2025-09-29 • **Versione doc:** v1.0

## Scopo
Documentazione sistema e-commerce: catalogo prodotti, carrello, checkout, prezzi subscriber, ordini telefonici, resi e rimborsi.

## Contenuti
- [checkout.md](./checkout.md) — Processo checkout (sessione Stripe, payment methods, conferma)
- [phone-orders.md](./phone-orders.md) — Ordini telefonici da backoffice admin
- [refunds-returns.md](./refunds-returns.md) — Gestione resi, rimborsi, RMA

## Architettura E-commerce

### Components
- **Product Catalog**: Firestore `products/` collection
- **Shopping Cart**: Session-based (localStorage + Firestore per logged users)
- **Checkout**: Stripe Checkout Sessions
- **Orders**: Firestore `orders/` collection
- **Inventory**: Firestore `inventory/` + reservation system

### User Flow
```
Browse Products → Add to Cart → Checkout → Payment → Order Confirmation
     ↓              ↓              ↓           ↓            ↓
  PDP page    Cart component   Stripe UI   Webhook    Email + Inbox
```

## Product Catalog

### Product Schema (Firestore)
```ts
// products/{productId}
interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: 'food' | 'supplements' | 'snacks' | 'accessories';

  // Pricing
  price: number; // Prezzo standard
  subscriberPrice: number; // Prezzo abbonati (15-20% sconto)
  currency: 'EUR';

  // Inventory
  stockQuantity: number;
  lowStockThreshold: 10;
  availabilityStatus: 'in_stock' | 'low_stock' | 'out_of_stock';

  // Dog profile matching
  suitableFor: {
    ageGroups: ('puppy' | 'adult' | 'senior')[];
    sizes: ('small' | 'medium' | 'large')[];
    breeds?: string[]; // opzionale
  };

  // Subscription eligibility
  subscriptionEligible: boolean;

  // Images & media
  images: string[]; // URLs Firebase Storage
  featuredImage: string;

  // SEO
  slug: string;
  metaTitle: string;
  metaDescription: string;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isActive: boolean;
  isFeatured: boolean;
}
```

### Product Variants
Per prodotti con varianti (es. crocchette 3kg vs 10kg):
```ts
// products/{productId}/variants/{variantId}
interface ProductVariant {
  id: string;
  sku: string;
  name: string; // "3kg", "10kg"
  price: number;
  subscriberPrice: number;
  stockQuantity: number;
  weight: number; // grammi
}
```

## Shopping Cart

### Cart Storage
**Guest users**: `localStorage` con key `piucane_cart`
**Logged users**: Firestore `carts/{uid}`

### Cart Schema
```ts
interface CartItem {
  productId: string;
  variantId?: string;
  quantity: number;
  dogId?: string; // Per tracking "questo è per Rex"
}

interface Cart {
  userId?: string;
  items: CartItem[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt: Timestamp; // 30 giorni
}
```

### Cart Operations (API)
```ts
// Add to cart
POST /api/cart/add
{
  productId: "prod_abc123",
  quantity: 2,
  dogId: "dog_xyz" // optional
}

// Update quantity
PUT /api/cart/items/{itemId}
{ quantity: 5 }

// Remove item
DELETE /api/cart/items/{itemId}

// Get cart
GET /api/cart
```

### Cart Validation
- ✅ Stock availability check
- ✅ Price freshness (ricalcola prezzi da DB)
- ✅ Subscriber discount applicato solo se `user.hasActiveSubscription`
- ✅ Remove out-of-stock items automaticamente

## Checkout Process

Vedi [checkout.md](./checkout.md) per dettagli completi.

### Flow Steps
1. **Cart Review**: Utente visualizza riepilogo ordine
2. **Shipping Info**: Indirizzo consegna (salvato in profilo)
3. **Payment Method**: Stripe Checkout Session
4. **Order Creation**: Pending order in Firestore
5. **Payment**: Stripe payment (redirect)
6. **Webhook**: Stripe `checkout.session.completed`
7. **Order Confirmation**: Email + in-app notification

### Stripe Checkout Session
```ts
// api/src/modules/checkout/create-session.ts
export async function createCheckoutSession(userId: string, cartId: string) {
  const cart = await getCart(cartId);
  const user = await getUser(userId);

  // Calculate line items
  const lineItems = await Promise.all(cart.items.map(async item => {
    const product = await getProduct(item.productId);
    const price = user.hasActiveSubscription
      ? product.subscriberPrice
      : product.price;

    return {
      price_data: {
        currency: 'eur',
        product_data: {
          name: product.name,
          images: [product.featuredImage]
        },
        unit_amount: Math.round(price * 100) // cents
      },
      quantity: item.quantity
    };
  }));

  // Create Stripe session
  const session = await stripe.checkout.sessions.create({
    customer_email: user.email,
    line_items: lineItems,
    mode: 'payment',
    success_url: `${BASE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${BASE_URL}/checkout`,
    metadata: {
      userId,
      cartId,
      orderType: 'one_time'
    }
  });

  return session;
}
```

### Order Creation (Webhook)
```ts
// api/src/modules/ecommerce/webhook-handler.ts
export async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { userId, cartId } = session.metadata;
  const cart = await getCart(cartId);

  // Create order
  const orderId = generateOrderId(); // ORD-20250929-ABC123
  await db.collection('orders').doc(orderId).set({
    id: orderId,
    userId,
    status: 'confirmed',
    items: cart.items,
    total: session.amount_total / 100,
    currency: 'EUR',
    paymentMethod: 'stripe',
    stripePaymentIntentId: session.payment_intent,
    shippingAddress: session.shipping_details.address,
    createdAt: FieldValue.serverTimestamp(),
    paidAt: FieldValue.serverTimestamp()
  });

  // Clear cart
  await clearCart(cartId);

  // Reserve inventory
  await reserveInventory(orderId, cart.items);

  // Send confirmation email
  await sendOrderConfirmation(userId, orderId);

  // Track GA4 event
  await trackPurchase(userId, orderId, session.amount_total / 100);
}
```

## Order Management

### Order Schema (Firestore)
```ts
// orders/{orderId}
interface Order {
  id: string; // ORD-20250929-ABC123
  userId: string;

  // Status
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

  // Items
  items: OrderItem[];

  // Pricing
  subtotal: number;
  shippingCost: number;
  discount: number; // coupon/voucher
  total: number;
  currency: 'EUR';

  // Payment
  paymentMethod: 'stripe' | 'phone_order';
  stripePaymentIntentId?: string;
  paidAt?: Timestamp;

  // Shipping
  shippingAddress: Address;
  shippingMethod: 'standard' | 'express';
  trackingNumber?: string;
  carrier?: 'DHL' | 'BRT' | 'SDA';
  shippedAt?: Timestamp;
  deliveredAt?: Timestamp;

  // Metadata
  orderType: 'one_time' | 'subscription';
  subscriptionId?: string; // if recurring order
  dogId?: string; // primary dog for order
  notes?: string;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface OrderItem {
  productId: string;
  variantId?: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  dogId?: string;
}
```

### Order Status Flow
```
pending → confirmed → processing → shipped → delivered
   ↓          ↓           ↓           ↓
cancelled  cancelled  cancelled   refunded
```

### Status Transitions (API)
```ts
// Admin only
PUT /api/admin/orders/{orderId}/status
{
  status: "shipped",
  trackingNumber: "DHL123456789",
  carrier: "DHL"
}

// Auto-transitions via webhooks/cron
- confirmed → processing (after 1 hour, warehouse picks)
- processing → shipped (warehouse scan)
- shipped → delivered (carrier API webhook)
```

## Subscriber Pricing

### Logic
```ts
function getEffectivePrice(product: Product, user: User): number {
  const hasActiveSubscription = user.subscriptions?.some(s => s.status === 'active');
  return hasActiveSubscription ? product.subscriberPrice : product.price;
}
```

### Discount Calculation
- **Standard discount**: 15-20% sul prezzo retail
- **Example**:
  - Retail: €29.99
  - Subscriber: €24.99 (16.7% discount)

### UI Display
```tsx
<ProductCard product={product}>
  {user.hasActiveSubscription ? (
    <>
      <Price className="text-primary">{product.subscriberPrice}€</Price>
      <OriginalPrice>{product.price}€</OriginalPrice>
      <Badge>Prezzo abbonato</Badge>
    </>
  ) : (
    <>
      <Price>{product.price}€</Price>
      <Upsell>
        Risparmia {discount}€ con l'abbonamento →
      </Upsell>
    </>
  )}
</ProductCard>
```

## Phone Orders

Vedi [phone-orders.md](./phone-orders.md) per procedura completa.

### Use Case
- Utente chiama customer support
- Agente crea ordine manualmente da backoffice
- Pagamento: bonifico, contrassegno, carta telefonica

### Admin Interface
**Path**: `/apps/admin/src/modules/orders/phone-order-create`

**Fields**:
- Customer lookup (email/phone)
- Product selection
- Quantity
- Shipping address
- Payment method (manual)
- Notes

### Order Creation
```ts
// api/src/modules/admin/create-phone-order.ts
export async function createPhoneOrder(data: PhoneOrderData, adminUserId: string) {
  const orderId = generateOrderId();

  await db.collection('orders').doc(orderId).set({
    ...data,
    orderType: 'phone_order',
    paymentMethod: 'manual',
    status: 'confirmed', // already paid
    createdBy: adminUserId,
    createdAt: FieldValue.serverTimestamp()
  });

  // Reserve inventory
  await reserveInventory(orderId, data.items);

  // Send confirmation
  await sendOrderConfirmation(data.userId, orderId);

  // Audit log
  await logAdminAction({
    adminUserId,
    action: 'order.phone_order.created',
    resourceId: orderId
  });
}
```

## Returns & Refunds

Vedi [refunds-returns.md](./refunds-returns.md) per policy completa.

### Return Policy
- **Window**: 30 giorni dalla consegna
- **Condition**: Prodotto non aperto (sigillo intatto)
- **Refund**: 100% importo pagato
- **Shipping**: Cliente paga spedizione reso (eccetto prodotto difettoso)

### RMA (Return Merchandise Authorization)
```ts
// returns/{returnId}
interface Return {
  id: string; // RMA-20250929-XYZ
  orderId: string;
  userId: string;

  items: ReturnItem[];

  reason: 'wrong_item' | 'defective' | 'not_needed' | 'other';
  reasonDetails: string;
  photos?: string[]; // se difettoso

  status: 'requested' | 'approved' | 'rejected' | 'received' | 'refunded';

  refundAmount: number;
  refundMethod: 'original' | 'voucher';
  stripeRefundId?: string;

  shippingLabel?: string; // PDF prepaid label (se applicabile)

  createdAt: Timestamp;
  approvedAt?: Timestamp;
  refundedAt?: Timestamp;
}
```

### User Flow
1. User requests return: `/account/orders/{orderId}/return`
2. Selects items + reason
3. System creates RMA
4. Admin reviews (approve/reject)
5. If approved → user ships back (tracking required)
6. Warehouse receives → verifies condition
7. Refund issued (Stripe or voucher)

### Refund Processing (API)
```ts
// api/src/modules/ecommerce/process-refund.ts
export async function processRefund(returnId: string) {
  const rma = await getReturn(returnId);
  const order = await getOrder(rma.orderId);

  // Stripe refund
  const refund = await stripe.refunds.create({
    payment_intent: order.stripePaymentIntentId,
    amount: Math.round(rma.refundAmount * 100)
  });

  // Update RMA
  await db.collection('returns').doc(returnId).update({
    status: 'refunded',
    stripeRefundId: refund.id,
    refundedAt: FieldValue.serverTimestamp()
  });

  // Restore inventory
  await restoreInventory(rma.items);

  // Notify user
  await sendRefundConfirmation(rma.userId, returnId, rma.refundAmount);
}
```

## Inventory Management

### Stock Tracking
```ts
// inventory/{productId}
interface InventoryRecord {
  productId: string;
  quantity: number; // disponibile
  reserved: number; // riservato per ordini pending
  available: number; // quantity - reserved

  transactions: InventoryTransaction[]; // audit trail
}

interface InventoryTransaction {
  type: 'purchase' | 'sale' | 'reservation' | 'release' | 'adjustment';
  quantity: number; // +/- delta
  orderId?: string;
  reason?: string;
  timestamp: Timestamp;
  userId: string; // admin che ha fatto adjustment
}
```

### Reservation System
**Timing**: Stock riservato quando ordine `status = confirmed`
**Release**: Se ordine cancellato o refunded

```ts
// Reserve stock
export async function reserveInventory(orderId: string, items: OrderItem[]) {
  const batch = db.batch();

  for (const item of items) {
    const inventoryRef = db.collection('inventory').doc(item.productId);

    batch.update(inventoryRef, {
      reserved: FieldValue.increment(item.quantity),
      available: FieldValue.increment(-item.quantity),
      transactions: FieldValue.arrayUnion({
        type: 'reservation',
        quantity: -item.quantity,
        orderId,
        timestamp: FieldValue.serverTimestamp()
      })
    });
  }

  await batch.commit();
}
```

### Low Stock Alerts
**Trigger**: `inventory.available < product.lowStockThreshold`
**Action**: Email admin + Slack notification

## Product Recommendations

### Algorithm
```ts
// packages/lib/recommendations/engine.ts
export function getRecommendations(dogProfile: Dog, limit = 6): Product[] {
  // 1. Filter by suitability
  let products = allProducts.filter(p =>
    p.suitableFor.ageGroups.includes(dogProfile.ageGroup) &&
    p.suitableFor.sizes.includes(dogProfile.size)
  );

  // 2. Score by relevance
  products = products.map(p => ({
    ...p,
    score: calculateScore(p, dogProfile)
  }));

  // 3. Sort by score desc
  products.sort((a, b) => b.score - a.score);

  // 4. Return top N
  return products.slice(0, limit);
}

function calculateScore(product: Product, dog: Dog): number {
  let score = 0;

  // Breed match (if specific breed recommendation)
  if (product.suitableFor.breeds?.includes(dog.breed)) score += 10;

  // Age match
  if (product.suitableFor.ageGroups.includes(dog.ageGroup)) score += 5;

  // Size match
  if (product.suitableFor.sizes.includes(dog.size)) score += 5;

  // Popularity (order count)
  score += product.orderCount * 0.1;

  // Rating
  score += product.avgRating * 2;

  return score;
}
```

## Analytics & Tracking

### GA4 E-commerce Events
```ts
// View product list
trackEvent('view_item_list', {
  item_list_id: 'category_food',
  item_list_name: 'Cibo per cani',
  items: products.map(p => ({
    item_id: p.id,
    item_name: p.name,
    price: p.price
  }))
});

// View product detail
trackEvent('view_item', {
  currency: 'EUR',
  value: product.price,
  items: [{ item_id: product.id, item_name: product.name }]
});

// Add to cart
trackEvent('add_to_cart', {
  currency: 'EUR',
  value: product.price * quantity,
  items: [{ item_id: product.id, quantity }]
});

// Begin checkout
trackEvent('begin_checkout', {
  currency: 'EUR',
  value: cart.total,
  items: cart.items
});

// Purchase
trackEvent('purchase', {
  transaction_id: order.id,
  value: order.total,
  currency: 'EUR',
  tax: 0,
  shipping: order.shippingCost,
  items: order.items
});
```

## Testing

### E2E Tests
```ts
// tests/e2e/checkout.spec.ts
test('complete checkout flow', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('#email', 'test@example.com');
  await page.fill('#password', 'testpass');
  await page.click('button[type="submit"]');

  // Browse products
  await page.goto('/shop');
  await page.click('[data-testid="product-card"]:first-child');

  // Add to cart
  await page.click('[data-testid="add-to-cart"]');
  await expect(page.locator('[data-testid="cart-count"]')).toHaveText('1');

  // Checkout
  await page.click('[data-testid="cart-icon"]');
  await page.click('[data-testid="checkout-button"]');

  // Stripe test mode (auto-fill)
  // Payment success redirect
  await page.waitForURL('**/checkout/success**');

  expect(page.locator('[data-testid="order-confirmation"]')).toBeVisible();
});
```

## Resources
- [Stripe Checkout Docs](https://stripe.com/docs/payments/checkout)
- [E-commerce Analytics (GA4)](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce)
- [Return Policy Best Practices](https://www.shopify.com/blog/return-policy)