# Subscriptions — Index
**Owner:** Backend + Product Team • **Ultimo aggiornamento:** 2025-09-29 • **Versione doc:** v1.0

## Scopo
Documentazione sistema abbonamenti ricorrenti: calcolo cadenza consegne, prezzo subscriber, gestione modifiche (data, indirizzo, prodotti), pause, cancellazione.

## Contenuti
- [cadence.md](./cadence.md) — Calcolo cadenceDays automatico (peso, BCS, dose prodotto, buffer)
- [overrides.md](./overrides.md) — Gestione override temporanei (indirizzo, data consegna)

## Subscription Business Model

### Value Proposition
- **Risparmio**: 15-20% sconto vs acquisti singoli
- **Convenienza**: Consegna automatica, no riordini manuali
- **Personalizzazione**: Cadenza calcolata su profilo cane
- **Flessibilità**: Pausa, modifica, cancella quando vuoi

### Pricing
```
Prezzo Retail:      €29.99/mese
Prezzo Subscriber:  €24.99/mese (-16.7%)
Risparmio annuale:  €60
```

## Subscription Architecture

### Firestore Schema
```ts
// subscriptions/{subscriptionId}
interface Subscription {
  id: string; // SUB-20250929-ABC
  userId: string;
  dogId: string; // cane principale per questo abbonamento

  // Product
  productId: string;
  variantId?: string;
  quantity: number; // sacchi per consegna

  // Pricing
  unitPrice: number; // subscriberPrice
  totalPerShipment: number; // unitPrice * quantity
  currency: 'EUR';

  // Cadence (automatica)
  cadenceDays: number; // calcolato da peso/BCS/dose
  nextShipAt: Timestamp; // prossima consegna schedulata

  // Status
  status: 'active' | 'paused' | 'cancelled';
  pausedUntil?: Timestamp;
  cancelledAt?: Timestamp;
  cancellationReason?: string;

  // Shipping
  shippingAddress: Address; // default user address
  shippingAddressOverride?: Address; // solo per prossima consegna

  // Payment
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  paymentMethodId: string; // Stripe payment method

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastShipmentAt?: Timestamp;
  totalShipments: number; // counter
}
```

### Stripe Integration
PiùCane usa **Stripe Subscriptions** per billing ricorrente.

**Stripe Product**: `prod_piucane_food_subscription`
**Stripe Price**: `price_monthly_2499` (€24.99/month)

**Mapping**:
- PiùCane `subscriptions/` ↔ Stripe `subscriptions/`
- `cadenceDays` → Stripe `billing_cycle_anchor` + `interval`

**Note**: Cadenza variabile (28/35/42 giorni) → usa Stripe **metered billing** o **manual invoice**

## Cadence Calculation

Vedi [cadence.md](./cadence.md) per algoritmo completo.

### Formula
```ts
function calculateCadenceDays(dog: Dog, product: Product): number {
  // 1. Dose giornaliera (grammi/giorno)
  const dailyDose = getDailyDose(dog.weight, dog.bcs, dog.activityLevel);

  // 2. Contenuto sacco (grammi)
  const bagWeight = product.weightGrams;

  // 3. Giorni copertura
  const coverageDays = bagWeight / dailyDose;

  // 4. Buffer (5%)
  const withBuffer = coverageDays * 0.95;

  // 5. Arrotonda a settimane
  const weeks = Math.round(withBuffer / 7);
  const cadenceDays = weeks * 7;

  // 6. Clamp (min 14, max 56 giorni)
  return Math.max(14, Math.min(cadenceDays, 56));
}
```

### Example
```
Dog: 25kg, BCS 5/9, moderato attivo
Dose giornaliera: 400g/giorno

Product: Crocchette 12kg = 12000g
Copertura: 12000 / 400 = 30 giorni
Buffer 95%: 30 * 0.95 = 28.5 giorni
Arrotonda: 4 settimane = 28 giorni

→ cadenceDays = 28
```

## Subscription Lifecycle

### 1. Creation (Activation)
**Trigger**: User clicks "Abbonati" su PDP o checkout

**Flow**:
```
1. User selects product + quantity
2. System calculates cadenceDays (from dog profile)
3. Shows preview: "Consegna ogni X settimane"
4. User confirms
5. Stripe checkout (setup payment method)
6. Webhook confirms → create subscription in Firestore
7. Schedule first shipment (T+3 giorni)
```

**API**:
```ts
POST /api/subscriptions/create
{
  dogId: "dog_abc",
  productId: "prod_xyz",
  quantity: 1
}

Response:
{
  subscriptionId: "SUB-20250929-ABC",
  cadenceDays: 28,
  nextShipAt: "2025-10-02T00:00:00Z",
  stripeCheckoutUrl: "https://checkout.stripe.com/..."
}
```

### 2. Recurring Shipments (Auto-Renewal)
**Cloud Scheduler**: Ogni giorno alle 02:00
```ts
// api/src/jobs/subscriptions/process-renewals.ts
export async function processRenewals() {
  const today = new Date();
  const threeDaysFromNow = addDays(today, 3);

  // Get subscriptions due for renewal (T-3)
  const dueSubs = await db.collection('subscriptions')
    .where('status', '==', 'active')
    .where('nextShipAt', '<=', threeDaysFromNow)
    .get();

  for (const sub of dueSubs.docs) {
    const subscription = sub.data();

    // 1. Reserve inventory
    await reserveInventory(subscription);

    // 2. Create order
    const orderId = await createRecurringOrder(subscription);

    // 3. Charge Stripe
    await chargeStripeSubscription(subscription.stripeSubscriptionId);

    // 4. Schedule next shipment
    const nextShipAt = addDays(subscription.nextShipAt, subscription.cadenceDays);
    await sub.ref.update({
      nextShipAt,
      lastShipmentAt: FieldValue.serverTimestamp(),
      totalShipments: FieldValue.increment(1)
    });

    // 5. Notify user
    await sendShipmentNotification(subscription.userId, orderId);
  }
}
```

### 3. Pause
**Trigger**: User clicks "Pausa abbonamento" in `/subscriptions`

**Duration**: 30, 60, 90 giorni

**Effect**:
- `status` → `paused`
- `pausedUntil` → timestamp futuro
- Stripe subscription → `pause_collection.behavior = 'void'`
- No addebiti durante pausa

**Resume**: Automatico quando `pausedUntil` scade, o manuale

```ts
POST /api/subscriptions/{id}/pause
{ duration: 60 } // giorni

Response:
{
  status: "paused",
  pausedUntil: "2025-11-28T00:00:00Z",
  resumesAt: "2025-11-28T00:00:00Z"
}
```

### 4. Cancellation
**Trigger**: User clicks "Cancella abbonamento"

**Save Flow** (Retention):
1. Modal: "Ci dispiace che tu voglia andare via"
2. Survey: Perché cancelli? (prezzo, qualità, quantità, altro)
3. Offers:
   - 🎁 Pausa 30/60/90 giorni
   - 💰 Sconto 20% prossimi 3 mesi
   - 📦 Cambia cadenza (più/meno frequente)
   - 🔄 Cambia prodotto
4. Se conferma → cancellazione

**Effect**:
- `status` → `cancelled`
- `cancelledAt` → timestamp
- `cancellationReason` → motivo (survey)
- Stripe subscription → `cancel_at_period_end = true`
- Ultima consegna processata, poi stop

```ts
POST /api/subscriptions/{id}/cancel
{
  reason: "too_expensive",
  feedback: "Non posso permettermelo ora"
}

Response:
{
  status: "cancelled",
  finalShipmentDate: "2025-10-27", // ultima consegna
  cancelledAt: "2025-09-29T14:00:00Z"
}
```

### 5. Reactivation
**Trigger**: User clicks "Riattiva abbonamento" (entro 90 giorni da cancellazione)

**Incentive**: No re-enrollment fee, conserva storico

```ts
POST /api/subscriptions/{id}/reactivate

Response:
{
  status: "active",
  nextShipAt: "2025-10-05T00:00:00Z",
  message: "Bentornato! Prima consegna tra 3 giorni"
}
```

## Modifications (Overrides)

Vedi [overrides.md](./overrides.md) per dettagli completi.

### Change Delivery Date
**Constraint**: Modifica possibile fino a **T-3 giorni** dalla prossima consegna

**UI**: Calendar picker con date disponibili (future, no past)

```ts
PUT /api/subscriptions/{id}/next-shipment-date
{ nextShipAt: "2025-10-15" }

Response:
{
  previousDate: "2025-10-02",
  newDate: "2025-10-15",
  daysDelta: +13
}
```

**Effect**: Shift una tantum, future cadenze calcolate da nuova data

### Change Delivery Address (One-Time)
**Use Case**: Utente in vacanza, vuole consegna a indirizzo temporaneo

**Scope**: **Solo prossima consegna**, poi torna a default

```ts
PUT /api/subscriptions/{id}/shipping-address-override
{
  address: {
    street: "Via Vacanze 123",
    city: "Rimini",
    zip: "47921",
    country: "IT"
  },
  oneTime: true
}

Response:
{
  nextShipmentAddress: { ... },
  note: "Indirizzo temporaneo. Consegne successive a indirizzo principale."
}
```

**Implementation**:
```ts
// Subscription doc
{
  shippingAddress: { street: "Via Casa 1", ... }, // default
  shippingAddressOverride: { street: "Via Vacanze 123", ... } // one-time
}

// Order creation logic
const shippingAddress = subscription.shippingAddressOverride || subscription.shippingAddress;

// After order created → clear override
await subscriptionRef.update({ shippingAddressOverride: FieldValue.delete() });
```

### Change Product/Quantity
**Use Case**: Cane cresciuto, serve cibo adult invece di puppy

```ts
PUT /api/subscriptions/{id}/product
{
  productId: "prod_adult_food",
  quantity: 2
}

// Recalcola cadenceDays automaticamente
```

**Effect**: Recalcola `cadenceDays` con nuovo prodotto

### Skip Next Shipment
**Use Case**: Ho ancora cibo, skip una consegna

```ts
POST /api/subscriptions/{id}/skip-next

Response:
{
  skippedDate: "2025-10-02",
  nextShipAt: "2025-10-30" // +cadenceDays dalla data skippata
}
```

## Payment Management

### Update Payment Method
**Stripe Customer Portal**:
```ts
GET /api/subscriptions/billing-portal

Response:
{
  url: "https://billing.stripe.com/session/xyz..."
}
```

User redirected to Stripe portal → update card → redirect back

### Failed Payment
**Stripe Webhook**: `invoice.payment_failed`

**Retry Logic** (Stripe automatic):
1. Day 0: Charge fails
2. Day 3: Retry 1
3. Day 5: Retry 2
4. Day 7: Retry 3 (final)
5. If still fails → pause subscription + email user

**User Notification**:
```
Subject: Azione richiesta: Aggiorna il metodo di pagamento

Il pagamento per il tuo abbonamento PiùCane è fallito.
Aggiorna la tua carta per evitare interruzioni del servizio.

[Aggiorna Pagamento] → link a Stripe portal
```

## Analytics & Metrics

### Subscription KPIs
- **Active Subscriptions**: Count `status = active`
- **MRR** (Monthly Recurring Revenue): Sum `totalPerShipment * 30 / cadenceDays`
- **Churn Rate**: Cancellations / Active subs (ultimo mese)
- **LTV** (Lifetime Value): Avg revenue per subscriber
- **Retention Rate**: % subs attivi dopo 3/6/12 mesi

### Cohort Analysis
Track retention per cohort (mese attivazione):
```
Cohort Sept 2025: 100 subs
- Mese 1: 100 active (100%)
- Mese 3: 85 active (85%)
- Mese 6: 70 active (70%)
- Mese 12: 60 active (60%)
```

### GA4 Events
```ts
// Subscription started
trackEvent('subscribe_confirmed', {
  subscription_id: sub.id,
  cadence_days: sub.cadenceDays,
  value: sub.totalPerShipment,
  currency: 'EUR'
});

// Subscription paused
trackEvent('subscription_paused', {
  subscription_id: sub.id,
  pause_duration: 60
});

// Subscription cancelled
trackEvent('subscription_cancelled', {
  subscription_id: sub.id,
  reason: 'too_expensive',
  total_shipments: sub.totalShipments,
  ltv: sub.totalShipments * sub.totalPerShipment
});

// Date changed
trackEvent('subscription_date_change', {
  subscription_id: sub.id,
  days_delta: +13
});
```

## Admin Management

**Path**: `/apps/admin/src/modules/subscriptions/`

### Admin Functions
- [ ] View all subscriptions (list + filters)
- [ ] View subscription detail (timeline, payments, shipments)
- [ ] Manual date change (customer support)
- [ ] Manual pause/resume
- [ ] Manual cancellation
- [ ] Refund management
- [ ] Subscription metrics dashboard

### Bulk Operations
```ts
// Bulk pause (es. holiday season)
POST /api/admin/subscriptions/bulk-pause
{
  userIds: ["uid1", "uid2", ...],
  duration: 14,
  reason: "Holiday logistics delay"
}

// Bulk price change (price increase)
POST /api/admin/subscriptions/bulk-price-update
{
  productId: "prod_xyz",
  newPrice: 26.99,
  effectiveDate: "2026-01-01",
  notifyUsers: true
}
```

## Testing

### E2E Tests
```ts
// tests/e2e/subscriptions.spec.ts
test('activate subscription', async ({ page }) => {
  await page.goto('/products/crocchette-adult');
  await page.click('[data-testid="subscribe-button"]');

  // Preview cadence
  await expect(page.locator('[data-testid="cadence-preview"]'))
    .toContainText('Consegna ogni 4 settimane');

  // Stripe test mode checkout
  await page.click('[data-testid="confirm-subscription"]');
  // ... complete Stripe flow

  // Verify subscription created
  await page.goto('/subscriptions');
  await expect(page.locator('[data-testid="subscription-card"]')).toBeVisible();
});

test('change delivery date', async ({ page }) => {
  await page.goto('/subscriptions/SUB-123');
  await page.click('[data-testid="change-date"]');

  // Select new date (calendar)
  await page.click('[data-date="2025-10-15"]');
  await page.click('[data-testid="save-date"]');

  // Verify change
  await expect(page.locator('[data-testid="next-shipment-date"]'))
    .toContainText('15 ottobre 2025');
});
```

### Unit Tests
```ts
// tests/unit/cadence-calculator.spec.ts
describe('Cadence Calculator', () => {
  it('calculates 28 days for 25kg dog with 12kg bag', () => {
    const dog = { weight: 25, bcs: 5, activityLevel: 'moderate' };
    const product = { weightGrams: 12000 };

    const cadence = calculateCadenceDays(dog, product);
    expect(cadence).toBe(28);
  });

  it('rounds to nearest week', () => {
    const dog = { weight: 10, bcs: 5, activityLevel: 'low' };
    const product = { weightGrams: 6000 };

    const cadence = calculateCadenceDays(dog, product);
    expect(cadence % 7).toBe(0); // divisibile per 7
  });

  it('clamps to min 14 max 56 days', () => {
    const tinyDog = { weight: 3, bcs: 5, activityLevel: 'low' };
    const largeBag = { weightGrams: 15000 };

    const cadence = calculateCadenceDays(tinyDog, largeBag);
    expect(cadence).toBe(56); // capped at max
  });
});
```

## Resources
- [Stripe Subscriptions Guide](https://stripe.com/docs/billing/subscriptions/overview)
- [Subscription Business Metrics](https://www.profitwell.com/recur/all/subscription-metrics)
- [Churn Reduction Strategies](https://www.chargebee.com/blog/reduce-churn/)