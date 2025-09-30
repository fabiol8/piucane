# Consent Management Platform (CMP) — Index
**Owner:** Legal + Frontend Team • **Ultimo aggiornamento:** 2025-09-29 • **Versione doc:** v1.0
**Stato:** ✅ **IMPLEMENTATO** (Phase 1 + Phase 2 complete)

## Scopo
Documentazione completa del sistema di gestione consensi (CMP) per compliance GDPR e privacy regulations. Include banner, preferences center, cookie policy e gating script terzi.

## ✅ Stato Implementazione

### Componenti Completati
- ✅ **ConsentBanner** - Banner GDPR completo con 3 modalità (banner/onboarding/settings)
- ✅ **ConsentManager** - Sistema avanzato con 5 categorie granulari
- ✅ **consent-manager.tsx** - Widget per account settings
- ✅ **useConsent** - Hook React per accesso stato consensi
- ✅ **ScriptGate** - Component per script gating con consent
- ✅ **GTMContainer** - Google Tag Manager + Consent Mode v2
- ✅ **analytics/consent.ts** - Google Consent Mode v2 integration

### Funzionalità Attive
- ✅ Banner consensi su primo accesso (2s delay)
- ✅ Persistenza localStorage + re-consenso 13 mesi
- ✅ Google Consent Mode v2 (default denied → update on consent)
- ✅ Script gating per GA4, Google Ads, Meta Pixel, Hotjar, Intercom, LinkedIn
- ✅ GTM integration con consent mode
- ✅ Preferences center con toggle granulari
- ✅ Export dati consensi (GDPR Art. 15)

## Contenuti
- [cookie-policy.md](./cookie-policy.md) — Cookie policy completa e categorie
- [scripts-matrix.md](./scripts-matrix.md) — Mapping script → categoria consenso
- Implementazione tecnica del CMP (vedi sotto)

## Requisiti GDPR
- ✅ **Consenso esplicito** per cookie marketing/analytics
- ✅ **Granularità**: categorie separate (necessari, funzionali, analytics, marketing)
- ✅ **Revocabilità**: utente può modificare consensi in ogni momento
- ✅ **Persistenza**: registro consensi con timestamp
- ✅ **Versioning**: re-consenso se policy/CMP cambia versione
- ✅ **Pre-consent blocking**: script terzi non caricati senza consenso

## Architettura CMP

### 1. Banner Consensi (First Visit)
- Modale full-screen o bottom banner
- Pulsanti: "Accetta tutto", "Rifiuta tutto", "Personalizza"
- Link a Cookie Policy e Privacy Policy
- Non dismissible (blocking) fino a scelta

### 2. Preferences Center
- Gestione granulare per categoria
- Descrizione categoria + lista script/cookie
- Toggle per categoria (necessari = sempre on, disabled)
- Save preferences button

### 3. Consent Storage
**Firestore**: `consents/{uid}/history/{consentId}`
```json
{
  "version": "1.0",
  "timestamp": "2025-09-29T10:00:00Z",
  "categories": {
    "necessary": true,
    "functional": true,
    "analytics": false,
    "marketing": false
  },
  "ip": "anonymized",
  "userAgent": "truncated"
}
```

### 4. Script Gating
**Wrapper**: `apps/web/src/lib/consent/script-loader.ts`
```ts
loadScript(scriptUrl: string, category: ConsentCategory): Promise<void>
```
- Check consent status before inject
- Queue script if consent pending
- Load immediately if consent granted

## Categorie Consenso

### Necessary (Necessari) — Always ON
- Session cookies
- Authentication tokens
- Cart persistence
- Security (CSRF tokens)

### Functional (Funzionali) — Opt-in
- Language preference
- UI preferences
- Chat persistence

### Analytics (Statistiche) — Opt-in
- Google Analytics 4 (GA4)
- Hotjar / Microsoft Clarity
- Firebase Performance Monitoring

### Marketing (Marketing) — Opt-in
- Google Ads / Meta Pixel
- Criteo / TikTok Pixel
- Remarketing tags

## Google Consent Mode v2

**Implementazione**: `apps/web/src/analytics/consent.ts`

Default state (prima del consenso):
```js
gtag('consent', 'default', {
  'ad_storage': 'denied',
  'ad_user_data': 'denied',
  'ad_personalization': 'denied',
  'analytics_storage': 'denied',
  'functionality_storage': 'denied',
  'personalization_storage': 'denied',
  'security_storage': 'granted' // sempre granted
});
```

Update after consent:
```js
gtag('consent', 'update', {
  'analytics_storage': userConsent.analytics ? 'granted' : 'denied',
  'ad_storage': userConsent.marketing ? 'granted' : 'denied',
  // ...
});
```

## CMP Admin Configuration

**Backoffice**: `/apps/admin/src/modules/cmp/`

### Funzionalità Admin
- [ ] **Banner editor**: testi, colori, layout
- [ ] **Categorie config**: nome, descrizione, scripts associati
- [ ] **Scripts registry**: URL, categoria, tipo (JS/pixel/iframe)
- [ ] **Policy editor**: cookie policy, privacy policy (WYSIWYG)
- [ ] **Version management**: bump versione → forza re-consenso
- [ ] **Analytics dashboard**: consent rate per categoria, retention

## Componenti Frontend Implementati

### 1. ConsentBanner Component (486 lines)
**Path**: `apps/web/src/components/privacy/ConsentBanner.tsx`

**Funzionalità**:
- Banner bottom con 3 pulsanti: "Rifiuta tutto", "Personalizza", "Accetta tutto"
- Modal settings con toggle granulari per 5 categorie
- Re-consent automatico dopo 13 mesi
- Integrazione Google Consent Mode v2
- Custom event `piucane_consent_updated` per listener

**Usage**:
```tsx
// Già integrato in apps/web/src/app/layout.tsx
<ConsentBanner />
```

**Props**: Nessuna (standalone component)

**Categorie supportate**:
- `necessary` (sempre true, non disabilitabile)
- `analytics` (Google Analytics, Hotjar)
- `marketing` (Facebook Pixel, Google Ads, LinkedIn)
- `personalization` (contenuti personalizzati)
- `functional` (chat widgets, preferenze UI)

### 2. ConsentManager Component (628 lines)
**Path**: `apps/web/src/components/privacy/ConsentManager.tsx`

**Funzionalità**:
- Sistema avanzato con 5 categorie dettagliate
- Visualizzazione finalità del trattamento (lawful basis, retention, conseguenze)
- Lista tipi di dati trattati
- Terze parti coinvolte con garanzie (SCC, Privacy Shield)
- Cronologia consensi con timestamp
- Export dati consensi (JSON download)
- 3 modalità: `onboarding`, `settings`, `cookie_banner`

**Usage**:
```tsx
<ConsentManager
  userId={user.uid}
  mode="settings"
  onConsentChange={(consents) => console.log(consents)}
  onComplete={() => router.push('/dashboard')}
/>
```

### 3. consent-manager.tsx Widget (379 lines)
**Path**: `apps/web/src/components/ui/consent-manager.tsx`

Versione semplificata per account settings page.

### 4. useConsent Hook
**Path**: `apps/web/src/hooks/useConsent.ts`

**API**:
```tsx
const {
  consent,              // Current consent state
  isLoading,            // Loading from localStorage
  hasGivenConsent,      // User has made a choice
  hasConsent,           // (category) => boolean
  updateConsent,        // (category, granted) => void
  acceptAll,            // Grant all consents
  rejectAll,            // Only necessary consents
  revokeConsent         // Clear all consents
} = useConsent();

// Example: Check consent before loading analytics
if (hasConsent('analytics')) {
  initializeGA4();
}
```

**Additional Hooks**:
```tsx
// Gate loading based on consent
const { isAllowed, isLoading } = useConsentGate('marketing');

// Get Google Consent Mode config
const consentMode = useConsentMode();
// Returns: { analytics_storage: 'granted'|'denied', ... }
```

### 5. ScriptGate Component
**Path**: `apps/web/src/components/privacy/ScriptGate.tsx`

**Usage**:
```tsx
// Generic script gating
<ScriptGate
  src="https://example.com/script.js"
  requiredConsent="analytics"
  strategy="afterInteractive"
  onLoad={() => console.log('Script loaded')}
  onConsentDenied={() => console.log('Blocked by consent')}
/>

// Pre-configured components
<GoogleAnalyticsScript measurementId="G-XXXXXXXXX" />
<GoogleAdsScript conversionId="AW-XXXXXXXXX" />
<MetaPixelScript pixelId="123456789" />
<HotjarScript hjid={123456} hjsv={6} />
<LinkedInInsightScript partnerId="123456" />
<IntercomScript appId="abc123" />
```

### 6. GTMContainer Component
**Path**: `apps/web/src/components/analytics/GTMContainer.tsx`

**Usage**:
```tsx
// In app/layout.tsx
<GTMContainer
  gtmId="GTM-XXXXXX"
  config={{
    debug: process.env.NODE_ENV === 'development'
  }}
/>
<GTMConsentSync /> {/* Auto-sync consent updates to GTM */}

// Push custom events
const pushEvent = useGTMEvent();
pushEvent({
  event: 'button_click',
  button_name: 'subscribe',
  value: 29.99
});

// Set user properties
const setUserProperties = useGTMUserProperties();
setUserProperties({
  user_id: 'user-123',
  subscription_tier: 'premium'
});

// E-commerce events
GTMEcommerce.viewItem({ item_id: 'prod-123', item_name: 'Premium Food', price: 29.99 });
GTMEcommerce.addToCart({ item_id: 'prod-123', item_name: 'Premium Food', price: 29.99, quantity: 1 });
GTMEcommerce.purchase({ transaction_id: 'order-456', value: 29.99, items: [...] });
```

### Cookie Policy Page
**Path**: `apps/web/src/app/cookie-policy/page.tsx`
- Tabella cookie con: Nome, Categoria, Durata, Scopo, Provider
- Auto-generata da config CMP (admin)

## Testing

### Manual Testing
1. Clear cookies + localStorage
2. Reload app → banner appare
3. Rifiuta tutto → verifica GA4/pixels non caricati
4. Accetta solo Analytics → verifica GA4 caricato, ads no
5. Modifica preferences → verify update

### Automated Testing
```ts
// tests/e2e/cmp.spec.ts
test('CMP blocks scripts without consent', async ({ page }) => {
  await page.goto('/');
  // Verify GA4 script NOT loaded
  const gaScript = page.locator('script[src*="googletagmanager"]');
  await expect(gaScript).toHaveCount(0);
});
```

## Legal Compliance

### GDPR Requirements
- ✅ Art. 6: Lawful basis (consent)
- ✅ Art. 7: Conditions for consent (explicit, informed, revocable)
- ✅ Art. 12: Transparent information
- ✅ Art. 13-14: Information to data subject
- ✅ Art. 21: Right to object (opt-out)

### Cookie Law (ePrivacy)
- ✅ Prior consent for non-essential cookies
- ✅ Clear information on purpose
- ✅ Easy to refuse

### Data Retention
- Consent record: **3 anni** dalla data raccolta
- Cookie max duration:
  - Necessary: session o max 1 anno
  - Others: max 13 mesi (raccomandato)

## Rollout Plan

### Phase 1: MVP ✅ COMPLETATO
- ✅ Banner con 3 pulsanti (Accetta/Rifiuta/Personalizza)
- ✅ Consent storage in localStorage (Firestore pending backend)
- ✅ Script gating per GA4, Ads, Meta Pixel, Hotjar, LinkedIn, Intercom
- ✅ useConsent hook + useConsentGate

### Phase 2: Full ✅ COMPLETATO
- ✅ Preferences center granulare (5 categorie dettagliate)
- ✅ Dettagli finalità trattamento + terze parti
- ✅ Cronologia consensi + export dati (GDPR Art. 15)
- ✅ Google Consent Mode v2 integration
- ✅ GTM Container + Consent Sync

### Phase 3: Advanced ⏳ TODO
- [ ] Firestore backend per consent records (attualmente solo localStorage)
- [ ] Admin CMP module per configurazione banner/scripts
- [ ] Cookie policy page auto-generata da config
- [ ] A/B testing banner variants (Optimizely/Firebase Remote Config)
- [ ] Analytics dashboard consent rate (Admin dashboard)

## Monitoring

### Metrics da trackare
- **Consent rate** per categoria (% users che accettano)
- **Banner interaction**: accept-all, reject-all, customize
- **Time to decision**: tempo medio prima di click
- **Re-consent rate**: utenti che modificano preferences

### Alerts
- 🚨 Consent rate analytics <30% → investigate banner UX
- 🚨 Script loaded senza consenso → bug critico

## Resources
- [GDPR Official Text](https://gdpr-info.eu/)
- [IAB TCF v2.2](https://iabeurope.eu/tcf-2-0/) (se usato)
- [Google Consent Mode](https://support.google.com/analytics/answer/9976101)
- [Garante Privacy Italia](https://www.garanteprivacy.it/)