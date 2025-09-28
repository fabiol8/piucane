# GA4 Events - PiùCane

## 📊 Panoramica Eventi

Questo documento descrive tutti gli eventi GA4 implementati nell'applicazione PiùCane, mappati con i CTA del registry.

### 🎯 Categorie Eventi

- **🔄 Lifecycle Events**: Onboarding, registrazione, login
- **🛒 E-commerce Events**: Visualizzazione prodotti, acquisti, carrello
- **🎮 Engagement Events**: Gamification, AI chat, navigazione
- **👤 User Events**: Gestione profilo, cani, abbonamenti
- **🔧 Admin Events**: Gestione backend, analytics

## 📋 Mapping Completo Eventi

### 🔄 Lifecycle Events

| Evento GA4 | CTA ID | Descrizione | Parametri |
|------------|--------|-------------|-----------|
| `onboarding_started` | `onboarding-start` | Inizio processo onboarding | `user_id`, `cta_id` |
| `onboarding_step_completed` | `onboarding-next-step` | Step onboarding completato | `step_number`, `step_name`, `cta_id` |
| `onboarding_completed` | `onboarding-complete` | Onboarding completato | `user_id`, `completion_time`, `cta_id` |
| `login_started` | `login-start` | Inizio processo login | `method`, `cta_id` |
| `login_google` | `login-google` | Login con Google | `cta_id` |
| `register_started` | `register-start` | Inizio registrazione | `method`, `cta_id` |
| `logout` | `logout` | Logout utente | `session_duration`, `cta_id` |

### 🐕 Dog Management Events

| Evento GA4 | CTA ID | Descrizione | Parametri |
|------------|--------|-------------|-----------|
| `dog_add_started` | `add-dog` | Inizio aggiunta cane | `user_id`, `cta_id` |
| `dog_profile_saved` | `dog-profile-save` | Profilo cane salvato | `dog_id`, `dog_breed`, `cta_id` |
| `vaccination_added` | `vaccination-add` | Vaccinazione aggiunta | `dog_id`, `vaccine_type`, `cta_id` |
| `veterinarian_selected` | `vet-select` | Veterinario selezionato | `vet_id`, `dog_id`, `cta_id` |

### 🛒 E-commerce Events

| Evento GA4 | CTA ID | Descrizione | Parametri Standard |
|------------|--------|-------------|-------------------|
| `view_item` | `product-view` | Visualizzazione prodotto | `item_id`, `item_name`, `item_category`, `value`, `currency` |
| `add_to_cart` | `add-to-cart` | Aggiunta al carrello | `item_id`, `item_name`, `quantity`, `value`, `currency` |
| `view_cart` | `cart-view` | Visualizzazione carrello | `value`, `currency`, `items` |
| `begin_checkout` | `checkout-start` | Inizio checkout | `value`, `currency`, `items`, `coupon` |
| `purchase` | `checkout-complete` | Acquisto completato | `transaction_id`, `value`, `currency`, `items`, `shipping` |

### 🔄 Subscription Events

| Evento GA4 | CTA ID | Descrizione | Parametri |
|------------|--------|-------------|-----------|
| `subscription_started` | `subscription-start` | Abbonamento iniziato | `subscription_id`, `plan_type`, `value`, `currency` |
| `subscription_manage_clicked` | `subscription-manage` | Gestione abbonamento | `subscription_id`, `action_type` |
| `subscription_paused` | `subscription-pause` | Abbonamento sospeso | `subscription_id`, `pause_reason` |
| `subscription_cancelled` | `subscription-cancel` | Abbonamento cancellato | `subscription_id`, `cancel_reason` |

### 🎮 Gamification Events

| Evento GA4 | CTA ID | Descrizione | Parametri |
|------------|--------|-------------|-----------|
| `mission_started` | `mission-start` | Missione iniziata | `mission_id`, `mission_type`, `difficulty` |
| `mission_completed` | `mission-complete` | Missione completata | `mission_id`, `completion_time`, `points_earned` |
| `badge_claimed` | `badge-claim` | Badge rivendicato | `badge_id`, `badge_category`, `unlock_date` |
| `reward_redeemed` | `reward-redeem` | Ricompensa riscattata | `reward_id`, `points_spent`, `reward_type` |

### 🤖 AI Events

| Evento GA4 | CTA ID | Descrizione | Parametri |
|------------|--------|-------------|-----------|
| `ai_chat_started` | `ai-chat-start` | Chat AI iniziata | `agent_type`, `conversation_id` |
| `ai_vet_selected` | `ai-vet-select` | AI Veterinario selezionato | `conversation_id`, `user_tier` |
| `ai_educator_selected` | `ai-educator-select` | AI Educatore selezionato | `conversation_id`, `user_tier` |
| `ai_groomer_selected` | `ai-groomer-select` | AI Groomer selezionato | `conversation_id`, `user_tier` |
| `ai_message_sent` | `ai-message-send` | Messaggio AI inviato | `agent_type`, `message_length`, `safety_flag` |

### 🧭 Navigation Events

| Evento GA4 | CTA ID | Descrizione | Parametri |
|------------|--------|-------------|-----------|
| `nav_home_clicked` | `nav-home` | Navigazione home | `source_page`, `cta_id` |
| `nav_dogs_clicked` | `nav-dogs` | Navigazione cani | `source_page`, `cta_id` |
| `nav_shop_clicked` | `nav-shop` | Navigazione shop | `source_page`, `cta_id` |
| `nav_missions_clicked` | `nav-missions` | Navigazione missioni | `source_page`, `cta_id` |
| `nav_ai_clicked` | `nav-ai` | Navigazione AI | `source_page`, `cta_id` |

### 🔧 Admin Events

| Evento GA4 | CTA ID | Descrizione | Parametri |
|------------|--------|-------------|-----------|
| `admin_login` | `admin-login` | Login amministratore | `admin_role`, `cta_id` |
| `admin_product_created` | `admin-product-create` | Prodotto creato (admin) | `product_id`, `category`, `cta_id` |
| `admin_user_managed` | `admin-user-manage` | Utente gestito (admin) | `target_user_id`, `action_type`, `cta_id` |
| `admin_analytics_viewed` | `admin-analytics-view` | Analytics visualizzate | `report_type`, `date_range`, `cta_id` |

## 🏗️ Implementazione Tecnica

### Tracking Function

```typescript
// packages/lib/analytics/ga4.ts
export function trackGA4Event(
  eventName: string,
  parameters: Record<string, any> = {}
) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, {
      ...parameters,
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
      page_url: window.location.href,
      page_title: document.title
    });
  }
}
```

### CTA Implementation

```typescript
// Esempio implementazione CTA con tracking
<button
  data-cta-id="add-to-cart"
  onClick={() => {
    handleAddToCart(product);
    trackGA4Event('add_to_cart', {
      item_id: product.id,
      item_name: product.name,
      item_category: product.category,
      value: product.price,
      currency: 'EUR',
      cta_id: 'add-to-cart'
    });
  }}
>
  Aggiungi al Carrello
</button>
```

### Enhanced E-commerce Events

#### Purchase Event (Complete)
```typescript
trackGA4Event('purchase', {
  transaction_id: order.id,
  value: order.total,
  currency: 'EUR',
  items: order.items.map(item => ({
    item_id: item.productId,
    item_name: item.name,
    item_category: item.category,
    quantity: item.quantity,
    price: item.price
  })),
  shipping: order.shippingCost,
  tax: order.tax,
  cta_id: 'checkout-complete'
});
```

#### Subscription Events
```typescript
trackGA4Event('subscription_started', {
  subscription_id: subscription.id,
  plan_type: subscription.planType,
  value: subscription.monthlyValue,
  currency: 'EUR',
  billing_cycle: subscription.cadence,
  cta_id: 'subscription-start'
});
```

## 📊 Custom Dimensions & Metrics

### Custom Dimensions
- `user_tier`: Free, Premium, VIP
- `dog_breed`: Razza del cane principale
- `subscription_status`: Active, Paused, Cancelled
- `ai_usage_tier`: Low, Medium, High
- `gamification_level`: Livello utente

### Custom Metrics
- `points_balance`: Punti gamification disponibili
- `missions_completed`: Missioni completate totali
- `ai_messages_sent`: Messaggi AI inviati questo mese
- `subscription_value`: Valore abbonamento mensile

## 🔍 Event Validation

### Validation Rules
1. Ogni evento deve avere parametro `cta_id`
2. E-commerce events devono avere `currency` e `value`
3. AI events devono avere `agent_type`
4. Admin events devono avere `admin_role`

### Validation Script
```bash
npm run validate:ga4
```

## 📈 Conversion Goals

### Primary Goals
- `onboarding_completed`: Onboarding completion rate
- `purchase`: E-commerce conversion
- `subscription_started`: Subscription conversion

### Secondary Goals
- `dog_profile_saved`: Profile completion
- `ai_chat_started`: AI engagement
- `mission_completed`: Gamification engagement

## 🎯 Audience Segments

### Behavioral Segments
- **High Engagers**: Users with >10 AI messages/month
- **Subscription Users**: Active subscription holders
- **Gamification Users**: Users with completed missions
- **Premium Users**: Users with premium features access

### Demographic Segments
- **New Users**: First session in last 7 days
- **Returning Users**: Multiple sessions
- **Power Users**: Daily active users

## 📋 Implementation Checklist

- [ ] Tutti gli eventi mappati nel CTA registry
- [ ] Enhanced e-commerce implementato
- [ ] Custom dimensions configurate
- [ ] Validation script funzionante
- [ ] Privacy compliance (GDPR)
- [ ] Debug mode per testing
- [ ] Documentation aggiornata

---

**🎯 IMPORTANTE**: Tutti gli eventi devono rispettare la privacy GDPR e includere consenso utente appropriato.