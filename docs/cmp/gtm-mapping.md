# GTM Tags Mapping — Consent Requirements
**Owner:** Analytics Team • **Ultimo aggiornamento:** 2025-09-29 • **Versione:** v1.0

## Overview

Mapping completo di tutti i tag GTM configurati per PiùCane, con requisiti di consenso per GDPR compliance.

## Tag Categories

### 🟢 Category 1: Necessary (No Consent Required)

Tags che non richiedono consenso esplicito perché essenziali per il funzionamento del sito.

| Tag Name | Type | Purpose | Consent Required | Fire On |
|----------|------|---------|------------------|---------|
| **Security Headers** | Custom HTML | Set security headers | None | All Pages |
| **Error Tracking** | Custom JavaScript | Log errors to Sentry | None | JavaScript Error |
| **CSRF Token** | Custom HTML | Anti-CSRF protection | None | All Pages |

**GTM Configuration**:
- **Consent Settings**: No additional consent requirements
- **Trigger**: All Pages (immediate)

---

### 🔵 Category 2: Functional (Requires functional_storage)

Tags per funzionalità avanzate come chat, video player, etc.

| Tag Name | Type | Purpose | Consent Required | Fire On |
|----------|------|---------|------------------|---------|
| **Intercom Chat** | Custom HTML | Live chat widget | `functionality_storage` | All Pages (consented) |
| **YouTube Player** | Custom HTML | Embedded video player | `functionality_storage` | Video Page |
| **Zendesk Widget** | Custom JavaScript | Support widget | `functionality_storage` | Support Section |

**GTM Configuration**:
```javascript
// Trigger: Custom Event = consent_update
// Condition: Consent State - Functionality Storage equals "granted"
```

**Example Tag: Intercom**
```html
<!-- Intercom Chat Widget -->
<script>
  window.intercomSettings = {
    api_base: "https://api-iam.intercom.io",
    app_id: "{{ Intercom App ID }}"
  };
  (function(){var w=window;var ic=w.Intercom;if(typeof ic==="function"){ic('reattach_activator');ic('update',w.intercomSettings);}else{var d=document;var i=function(){i.c(arguments);};i.q=[];i.c=function(args){i.q.push(args);};w.Intercom=i;var l=function(){var s=d.createElement('script');s.type='text/javascript';s.async=true;s.src='https://widget.intercom.io/widget/{{ Intercom App ID }}';var x=d.getElementsByTagName('script')[0];x.parentNode.insertBefore(s,x);};if(document.readyState==='complete'){l();}else if(w.attachEvent){w.attachEvent('onload',l);}else{w.addEventListener('load',l,false);}}})();
</script>
```

---

### 📊 Category 3: Analytics (Requires analytics_storage)

Tags per analisi del traffico e comportamento utenti.

| Tag Name | Type | Purpose | Consent Required | Fire On |
|----------|------|---------|------------------|---------|
| **GA4 Configuration** | Google Analytics: GA4 Configuration | Base GA4 tracking | `analytics_storage` | All Pages |
| **GA4 Events** | Google Analytics: GA4 Event | Custom events tracking | `analytics_storage` | Custom Events |
| **Hotjar Tracking** | Custom HTML | Heatmaps & recordings | `analytics_storage` | All Pages (consented) |
| **Microsoft Clarity** | Custom HTML | Session replay | `analytics_storage` | All Pages (consented) |
| **Firebase Performance** | Custom JavaScript | Performance monitoring | `analytics_storage` | All Pages (consented) |

**GTM Configuration - GA4 Config Tag**:
```javascript
// Tag Type: Google Analytics: GA4 Configuration
// Measurement ID: {{ GA4 Measurement ID }} (variable)
// Trigger: Consent Initialization - All Pages
// Consent Settings:
//   - Require: Analytics Storage
//   - Behavior: No additional consent required (Consent Mode handles it)
```

**GTM Configuration - Hotjar**:
```html
<!-- Hotjar Tracking Code -->
<script>
  (function(h,o,t,j,a,r){
    h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
    h._hjSettings={hjid:{{ Hotjar ID }},hjsv:6};
    a=o.getElementsByTagName('head')[0];
    r=o.createElement('script');r.async=1;
    r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
    a.appendChild(r);
  })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
</script>
```

**Trigger**:
- Type: Custom Event
- Event name: `consent_update`
- Condition: `Consent State - Analytics Storage` equals `granted`

---

### 🎯 Category 4: Marketing (Requires ad_storage + ad_user_data)

Tags per remarketing, conversioni, e pubblicità personalizzata.

| Tag Name | Type | Purpose | Consent Required | Fire On |
|----------|------|---------|------------------|---------|
| **Google Ads Conversion** | Google Ads Conversion Tracking | Track conversions | `ad_storage`, `ad_user_data` | Purchase, Subscribe |
| **Google Ads Remarketing** | Google Ads Remarketing | Remarketing audiences | `ad_storage`, `ad_user_data`, `ad_personalization` | All Pages (consented) |
| **Meta Pixel (Facebook)** | Custom HTML | FB conversion tracking | `ad_storage`, `ad_user_data` | All Pages, Purchase |
| **LinkedIn Insight Tag** | Custom HTML | LinkedIn tracking | `ad_storage`, `ad_user_data` | All Pages (consented) |
| **TikTok Pixel** | Custom HTML | TikTok ads tracking | `ad_storage`, `ad_user_data` | All Pages (consented) |
| **Criteo OneTag** | Custom HTML | Retargeting | `ad_storage`, `ad_user_data`, `ad_personalization` | Product View, Purchase |

**GTM Configuration - Google Ads Conversion**:
```javascript
// Tag Type: Google Ads Conversion Tracking
// Conversion ID: AW-XXXXXXXXX
// Conversion Label: {{ Conversion Label }} (variable)
// Trigger: Custom Event = "purchase"
// Consent Settings:
//   - Require: Ad Storage, Ad User Data
//   - Behavior: Do not fire tag if consent not granted
```

**GTM Configuration - Meta Pixel**:
```html
<!-- Meta Pixel Code -->
<script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '{{ Facebook Pixel ID }}');
  fbq('track', 'PageView');
</script>
```

**Trigger - Meta Pixel Base**:
- Type: Custom Event
- Event name: `consent_update`
- Condition: `Consent State - Ad Storage` equals `granted` AND `Consent State - Ad User Data` equals `granted`

**Trigger - Meta Pixel Purchase**:
- Type: Custom Event
- Event name: `purchase`
- Condition: Same as above + event exists

---

### 🎨 Category 5: Personalization (Requires personalization_storage + ad_personalization)

Tags per personalizzazione contenuti e annunci.

| Tag Name | Type | Purpose | Consent Required | Fire On |
|----------|------|---------|------------------|---------|
| **Dynamic Content** | Custom JavaScript | Personalized content | `personalization_storage` | All Pages (consented) |
| **Product Recommendations** | Custom HTML | Recommendation engine | `personalization_storage` | Product Pages |
| **Google Ads Personalization** | Google Ads Remarketing | Personalized ads | `ad_personalization` | All Pages (consented) |

---

## GTM Variables

### Consent State Variables (Built-in)

| Variable Name | Type | Purpose |
|---------------|------|---------|
| `Consent State - Analytics Storage` | Consent State | Check analytics consent |
| `Consent State - Ad Storage` | Consent State | Check ad consent |
| `Consent State - Ad User Data` | Consent State | Check ad user data consent |
| `Consent State - Ad Personalization` | Consent State | Check ad personalization consent |
| `Consent State - Functionality Storage` | Consent State | Check functionality consent |

### Custom Variables

| Variable Name | Type | Value | Purpose |
|---------------|------|-------|---------|
| `GA4 Measurement ID` | Constant | `G-XXXXXXXXX` | GA4 tracking ID |
| `Google Ads Conversion ID` | Constant | `AW-XXXXXXXXX` | Ads conversion tracking |
| `Facebook Pixel ID` | Constant | `123456789` | Meta Pixel ID |
| `Hotjar ID` | Constant | `123456` | Hotjar site ID |
| `Intercom App ID` | Constant | `abc123` | Intercom workspace |
| `User ID` | Data Layer Variable | `user.uid` | Logged-in user ID |
| `Order Value` | Data Layer Variable | `ecommerce.value` | Transaction value |
| `Product SKU` | Data Layer Variable | `ecommerce.items.0.item_id` | Product identifier |

---

## GTM Triggers

### Consent-Based Triggers

| Trigger Name | Type | Fires On | Conditions |
|--------------|------|----------|------------|
| **Consent - Analytics Granted** | Custom Event | `consent_update` | Analytics Storage = granted |
| **Consent - Marketing Granted** | Custom Event | `consent_update` | Ad Storage = granted AND Ad User Data = granted |
| **Consent - Personalization Granted** | Custom Event | `consent_update` | Ad Personalization = granted |
| **Consent - Functional Granted** | Custom Event | `consent_update` | Functionality Storage = granted |

### E-commerce Triggers

| Trigger Name | Type | Fires On | Used By |
|--------------|------|----------|---------|
| **Purchase Complete** | Custom Event | `purchase` | GA4 Purchase, Ads Conversion, FB Purchase |
| **Add to Cart** | Custom Event | `add_to_cart` | GA4 Add to Cart, FB AddToCart |
| **Begin Checkout** | Custom Event | `begin_checkout` | GA4 Begin Checkout, FB InitiateCheckout |
| **View Product** | Custom Event | `view_item` | GA4 View Item, Criteo Product View |

### Engagement Triggers

| Trigger Name | Type | Fires On | Used By |
|--------------|------|----------|---------|
| **Scroll Depth** | Scroll Depth | 25%, 50%, 75%, 90% | GA4 Scroll Event |
| **Video Engagement** | YouTube Video | Start, 25%, 50%, 75%, Complete | GA4 Video Event |
| **Form Submit** | Form Submission | All Forms | GA4 Form Submit, Lead Conversions |
| **CTA Click** | Click - All Elements | data-cta-id exists | GA4 CTA Event |

---

## DataLayer Events

### Consent Events

```javascript
// Consent default (on page load)
dataLayer.push({
  event: 'consent_default',
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  functionality_storage: 'granted',
  security_storage: 'granted'
});

// Consent update (after user choice)
dataLayer.push({
  event: 'consent_update',
  analytics_storage: 'granted',
  ad_storage: 'granted',
  ad_user_data: 'granted',
  ad_personalization: 'granted',
  functionality_storage: 'granted'
});
```

### E-commerce Events

```javascript
// Purchase
dataLayer.push({
  event: 'purchase',
  ecommerce: {
    transaction_id: 'T_12345',
    value: 29.99,
    currency: 'EUR',
    tax: 4.50,
    shipping: 5.00,
    items: [{
      item_id: 'SKU_12345',
      item_name: 'Premium Dog Food 5kg',
      price: 29.99,
      quantity: 1,
      item_category: 'Food',
      item_brand: 'PiùCane'
    }]
  }
});
```

---

## Testing Checklist

### Manual Testing

- [ ] **Clear all cookies** and reload page
- [ ] **Reject all consent** → Verify no analytics/marketing tags fire
- [ ] **Accept analytics only** → Verify GA4 fires, ads don't
- [ ] **Accept marketing only** → Verify ads fire, analytics don't
- [ ] **Accept all** → Verify all tags fire
- [ ] **Check Network tab** → No tags before consent
- [ ] **Check Cookies** → No marketing cookies before consent
- [ ] **Test consent update** → Change preferences, verify tags update

### GTM Preview Mode

1. Enable GTM Preview Mode
2. Navigate to site
3. Check "Tags Fired" for each scenario:
   - ✅ Necessary tags fire immediately
   - ✅ Consent-gated tags wait for consent
   - ✅ Tags respect consent categories
   - ❌ No tags fire before consent for non-necessary

### Automated Testing

```typescript
// tests/e2e/gtm-consent.spec.ts
test('GTM respects consent mode', async ({ page }) => {
  await page.goto('/');

  // Verify GA4 not loaded without consent
  const gaRequests = [];
  page.on('request', req => {
    if (req.url().includes('google-analytics.com')) {
      gaRequests.push(req);
    }
  });

  await page.waitForTimeout(2000);
  expect(gaRequests.length).toBe(0);

  // Accept analytics consent
  await page.click('[data-testid="consent-accept-analytics"]');
  await page.waitForTimeout(1000);

  // Verify GA4 now loads
  expect(gaRequests.length).toBeGreaterThan(0);
});
```

---

## Rollout Checklist

- [ ] **GTM Container created** for production
- [ ] **All tags configured** with consent requirements
- [ ] **Variables created** for IDs and consent states
- [ ] **Triggers configured** for consent events
- [ ] **Preview mode tested** with all consent scenarios
- [ ] **Published to production** (with version notes)
- [ ] **Monitored for 24h** → Check tag fire rates
- [ ] **Consent rate tracked** → Baseline metrics captured

---

## Resources

- [GTM Consent Mode Setup](https://developers.google.com/tag-platform/security/guides/consent?consentmode=advanced)
- [GTM DataLayer Reference](https://developers.google.com/tag-platform/tag-manager/datalayer)
- [GA4 Consent Mode](https://support.google.com/analytics/answer/9976101)
- [Meta Pixel + Consent Mode](https://developers.facebook.com/docs/meta-pixel/implementation/gdpr/)

## Changelog

- **2025-09-29**: Initial GTM mapping documentation
- **TODO**: Add server-side GTM tags
- **TODO**: Add TikTok Pixel configuration