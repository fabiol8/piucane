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
| `sign_up` | `auth.register.button.click` | Registrazione utente | `method`, `user_id`, `cta_id` |
| `login` | `auth.login.button.click` | Login utente | `method`, `user_id`, `cta_id` |
| `logout` | `auth.logout.button.click` | Logout utente | `user_id`, `session_duration`, `cta_id` |

### 👤 User Management Events

| Evento GA4 | CTA ID | Descrizione | Parametri |
|------------|--------|-------------|-----------|
| `profile_edit_start` | `user.profile.edit.start` | Inizio modifica profilo | `section`, `user_id`, `cta_id` |
| `profile_update` | `user.profile.save` | Aggiornamento profilo | `fields_updated`, `user_id`, `cta_id` |
| `gdpr_consent_update` | `user.gdpr.consent.update` | Aggiornamento consensi GDPR | `consent_types`, `granted`, `user_id`, `cta_id` |
| `gdpr_data_export` | `user.gdpr.export.request` | Richiesta export dati GDPR | `export_format`, `data_types`, `user_id`, `cta_id` |
| `account_delete_intent` | `user.account.delete.request` | Intenzione eliminazione account | `user_id`, `reason`, `feedback`, `cta_id` |
| `user_profile_view` | `user.profile.view` | Visualizzazione profilo utente | `user_id`, `profile_section`, `cta_id` |
| `profile_photo_upload` | `user.profile.photo.upload` | Upload foto profilo | `file_size`, `file_type`, `user_id`, `cta_id` |
| `preferences_update` | `user.preferences.update` | Aggiornamento preferenze utente | `preference_type`, `new_value`, `user_id`, `cta_id` |
| `notification_settings_update` | `user.notifications.update` | Aggiornamento impostazioni notifiche | `notification_types`, `enabled`, `user_id`, `cta_id` |
| `language_change` | `user.language.change` | Cambio lingua interfaccia | `from_language`, `to_language`, `user_id`, `cta_id` |
| `gdpr_consent_view` | `user.gdpr.consent.view` | Visualizzazione pannello consensi | `user_id`, `cta_id` |
| `gdpr_data_export_request` | `user.gdpr.export.request` | Richiesta export dati GDPR | `export_format`, `data_types`, `user_id`, `cta_id` |
| `gdpr_data_export_download` | `user.gdpr.export.download` | Download dati esportati | `file_size`, `export_id`, `user_id`, `cta_id` |
| `account_delete_request` | `user.account.delete.request` | Richiesta eliminazione account | `user_id`, `reason`, `feedback`, `cta_id` |
| `account_delete_confirm` | `user.account.delete.confirm` | Conferma eliminazione account | `user_id`, `verification_method`, `cta_id` |
| `account_delete_cancel` | `user.account.delete.cancel` | Annullamento eliminazione account | `user_id`, `step`, `cta_id` |
| `password_change_request` | `user.password.change.request` | Richiesta cambio password | `user_id`, `trigger_source`, `cta_id` |
| `password_change_success` | `user.password.change.success` | Cambio password completato | `user_id`, `cta_id` |
| `email_change_request` | `user.email.change.request` | Richiesta cambio email | `user_id`, `new_email_domain`, `cta_id` |
| `email_verification_sent` | `user.email.verification.sent` | Invio email di verifica | `user_id`, `email_type`, `cta_id` |
| `email_verification_success` | `user.email.verification.success` | Verifica email completata | `user_id`, `verification_token`, `cta_id` |
| `two_factor_enable` | `user.2fa.enable` | Attivazione autenticazione a due fattori | `user_id`, `method`, `cta_id` |
| `two_factor_disable` | `user.2fa.disable` | Disattivazione autenticazione a due fattori | `user_id`, `reason`, `cta_id` |

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
| `add_to_cart` | `cart.item.added` | Aggiunta al carrello | `item_id`, `item_name`, `quantity`, `value`, `currency` |
| `view_cart` | `cart-view` | Visualizzazione carrello | `value`, `currency`, `items` |
| `begin_checkout` | `checkout.started` | Inizio checkout | `value`, `currency`, `items`, `coupon` |
| `checkout_step` | `checkout.step.next` | Avanzamento step checkout | `from_step`, `to_step`, `step_id` |
| `purchase` | `checkout.order.submitted` | Acquisto completato | `transaction_id`, `value`, `currency`, `items`, `shipping` |

### 🧺 Cart Events

| Evento GA4 | CTA ID | Descrizione | Parametri |
|------------|--------|-------------|-----------|
| `cart_update` | `cart.quantity.updated` | Quantità articolo aggiornata | `product_id`, `new_quantity` |
| `remove_from_cart` | `cart.item.removed` | Articolo rimosso dal carrello | `product_id`, `format_id` |
| `cart_clear` | `cart.cleared` | Carrello svuotato | `previous_item_count` |
| `subscription_change` | `cart.subscription.updated` | Frequenza abbonamento modificata | `product_id`, `subscription_frequency` |
| `dosage_personalized` | `cart.dosage.updated` | Dosaggio personalizzato | `product_id`, `daily_amount`, `duration_days` |

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
| `navigation_click` | `home.header.login.click` | CTA login header | `link_text`, `source_page` |
| `navigation_click` | `home.hero.start.click` | CTA inizia onboarding | `link_text`, `source_page` |
| `navigation_click` | `home.hero.demo.click` | CTA guarda demo | `link_text`, `source_page` |
| `navigation_click` | `home.nav.ai_chat.click` | Nav AI Chat | `link_text`, `section`, `link_url` |
| `navigation_click` | `home.nav.missions.click` | Nav Missioni | `link_text`, `section`, `link_url` |
| `navigation_click` | `home.nav.shop.click` | Nav Shop | `link_text`, `section`, `link_url` |
| `navigation_click` | `home.nav.account.click` | Nav Account | `link_text`, `section`, `link_url` |
| `navigation_click` | `home.header.settings.click` | Menu impostazioni rapido | `link_text`, `source_page` |

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
