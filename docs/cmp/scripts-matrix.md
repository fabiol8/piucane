# Scripts Matrix — Mapping Script → Consent Category

Questo documento mappa ogni script di terze parti alla relativa categoria di consenso, per garantire il **gating corretto** (no load senza consenso).

---

## Categoria: Necessary (Necessari)

Questi script **caricano sempre**, indipendentemente dal consenso (essenziali per funzionamento sito).

| Script | URL/ID | Scopo | Fornitore |
|--------|--------|-------|-----------|
| Firebase Auth | `firebaseapp.com/__/auth/` | Autenticazione utente | Google Firebase |
| Firebase Firestore | `firebaseapp.com/__/firebase/` | Database real-time | Google Firebase |
| Stripe.js | `js.stripe.com/v3/` | Pagamenti sicuri | Stripe |
| CSRF Token Generator | Internal | Protezione CSRF | PiùCane |

**Gating**: ✅ Always load (no consent check).

---

## Categoria: Functional (Funzionali)

Questi script migliorano UX ma **richiedono consenso opt-in**.

| Script | URL/ID | Scopo | Fornitore | Privacy Policy |
|--------|--------|-------|-----------|----------------|
| Intercom Chat | `widget.intercom.io` | Chat supporto clienti | Intercom | [Link](https://www.intercom.com/legal/privacy) |
| Hotjar Heatmaps | `static.hotjar.com/c/hotjar-*.js` | Heatmaps & Session replay | Hotjar | [Link](https://www.hotjar.com/legal/policies/privacy/) |
| Google Maps API | `maps.googleapis.com/maps/api/js` | Mappe veterinari | Google | [Link](https://policies.google.com/privacy) |

**Gating**: ⚠️ Load ONLY if `consent.functional === true`.

**Implementazione**:
```ts
if (userConsent.functional) {
  loadScript('https://static.hotjar.com/c/hotjar-3534567.js', 'functional');
}
```

---

## Categoria: Analytics (Statistiche)

Script per analisi traffico e comportamento utenti. **Consenso opt-in obbligatorio** (GDPR).

| Script | URL/ID | Scopo | Fornitore | Privacy Policy |
|--------|--------|-------|-----------|----------------|
| Google Analytics 4 | `googletagmanager.com/gtag/js?id=G-XXXXXXXXXX` | Web analytics | Google | [Link](https://policies.google.com/privacy) |
| Google Tag Manager | `googletagmanager.com/gtm.js?id=GTM-XXXXXXX` | Tag container | Google | [Link](https://policies.google.com/privacy) |
| Firebase Performance | `firebaseapp.com/__/firebase/performance` | Performance monitoring | Google Firebase | [Link](https://firebase.google.com/support/privacy) |
| Microsoft Clarity | `clarity.ms/tag/*` | Session recordings | Microsoft | [Link](https://privacy.microsoft.com/) |

**Gating**: ⚠️ Load ONLY if `consent.analytics === true`.

**Google Consent Mode**:
```js
gtag('consent', 'update', {
  'analytics_storage': userConsent.analytics ? 'granted' : 'denied'
});
```

Se `denied`: GA4 invia solo dati aggregati **ping-only** (no user ID, no cookies).

---

## Categoria: Marketing (Pubblicità)

Script per remarketing, conversion tracking, ads personalizzati. **Consenso opt-in obbligatorio**.

| Script | URL/ID | Scopo | Fornitore | Privacy Policy |
|--------|--------|-------|-----------|----------------|
| Meta Pixel | `connect.facebook.net/*/fbevents.js` | Conversion tracking FB/IG | Meta (Facebook) | [Link](https://www.facebook.com/privacy/policy) |
| Google Ads | `googletagmanager.com/gtag/js?id=AW-XXXXXXXXX` | Google Ads conversions | Google | [Link](https://policies.google.com/privacy) |
| Google DoubleClick | `doubleclick.net` | Display ads remarketing | Google | [Link](https://policies.google.com/privacy) |
| TikTok Pixel | `analytics.tiktok.com/i18n/pixel/events.js` | TikTok Ads tracking | TikTok | [Link](https://www.tiktok.com/legal/privacy-policy) |
| Criteo | `static.criteo.net/js/ld/ld.js` | Retargeting ads | Criteo | [Link](https://www.criteo.com/privacy/) |

**Gating**: ⚠️ Load ONLY if `consent.marketing === true`.

**Google Consent Mode**:
```js
gtag('consent', 'update', {
  'ad_storage': userConsent.marketing ? 'granted' : 'denied',
  'ad_user_data': userConsent.marketing ? 'granted' : 'denied',
  'ad_personalization': userConsent.marketing ? 'granted' : 'denied'
});
```

Se `denied`: nessun cookie ads, nessun remarketing personalizzato.

---

## Script Interni PiùCane (First-Party)

Questi sono script **first-party** (dominio piucane.it) che raccolgono dati analitici.

| Script | Path | Categoria | Scopo |
|--------|------|-----------|-------|
| Analytics Wrapper | `/analytics/ga4.js` | Analytics | Wrapper client-side per GA4 |
| CTA Tracker | `/analytics/cta-tracker.js` | Analytics | Track click CTA con data-cta-id |
| Consent Manager | `/consent/manager.js` | Necessary | Gestione consensi CMP |

**Gating**:
- `consent/manager.js` → Always load (Necessary)
- `analytics/*.js` → Load ONLY if `consent.analytics === true`

---

## Script Embedded (iframe, video, maps)

Questi script caricano via `<iframe>` e impostano cookie di terze parti.

| Embed | URL Pattern | Categoria | Gating |
|-------|-------------|-----------|--------|
| YouTube Video | `youtube.com/embed/*` | Marketing | ⚠️ Sostituire con **youtube-nocookie.com** se consent.marketing = false |
| Google Maps Embed | `google.com/maps/embed` | Functional | ⚠️ Load ONLY if consent.functional = true, altrimenti mostrare placeholder |
| Vimeo Video | `player.vimeo.com/video/*` | Functional | ⚠️ Load ONLY if consent.functional = true |

**Implementazione YouTube**:
```tsx
const embedUrl = userConsent.marketing
  ? 'https://www.youtube.com/embed/VIDEO_ID'
  : 'https://www.youtube-nocookie.com/embed/VIDEO_ID';

<iframe src={embedUrl} />
```

**Implementazione Google Maps**:
```tsx
{userConsent.functional ? (
  <iframe src="https://google.com/maps/embed?..." />
) : (
  <div className="map-placeholder">
    <button onClick={enableFunctional}>
      Abilita mappe (richiede consenso funzionale)
    </button>
  </div>
)}
```

---

## Testing Script Gating

### Manual Testing
1. **Clear cookies + localStorage**
2. **Rifiuta tutti i consensi** nel banner
3. **Apri DevTools → Network**
4. **Reload page**
5. **Verifica**: Nessun request a `googletagmanager.com`, `facebook.net`, `hotjar.com`, etc.
6. **Accetta Analytics** nel Preferences Center
7. **Verifica**: GA4 script caricato, Meta Pixel NO
8. **Accetta Marketing**
9. **Verifica**: Meta Pixel caricato

### Automated Testing
```ts
// tests/e2e/cmp-script-gating.spec.ts
import { test, expect } from '@playwright/test';

test('Marketing scripts blocked without consent', async ({ page }) => {
  await page.goto('/');

  // Rifiuta tutto
  await page.click('[data-testid="reject-all"]');

  // Verifica Meta Pixel NON caricato
  const fbRequest = page.waitForRequest(
    (req) => req.url().includes('facebook.net/fbevents.js'),
    { timeout: 5000 }
  ).catch(() => null);

  expect(await fbRequest).toBeNull();
});

test('Analytics scripts load with consent', async ({ page }) => {
  await page.goto('/');

  // Accetta Analytics
  await page.click('[data-testid="customize"]');
  await page.click('[data-testid="analytics-toggle"]');
  await page.click('[data-testid="save-preferences"]');

  // Verifica GA4 caricato
  await page.waitForRequest((req) =>
    req.url().includes('googletagmanager.com/gtag/js')
  );
});
```

---

## Admin CMP Configuration

**Backoffice Path**: `/apps/admin/src/modules/cmp/scripts-config/`

### Interface Script Config
```ts
interface ScriptConfig {
  id: string;
  name: string;
  category: 'necessary' | 'functional' | 'analytics' | 'marketing';
  provider: string;
  url?: string;
  type: 'script' | 'pixel' | 'iframe';
  privacyPolicyUrl: string;
  description: string;
  cookies: string[]; // cookie names set by script
  enabled: boolean;
}
```

### Firestore Collection
`cmpConfig/scripts/{scriptId}`

### CRUD Operations (Admin)
- ✅ Create new script entry
- ✅ Update script config (URL, category, etc.)
- ✅ Enable/Disable script globally
- ✅ View script usage stats (% users consent)

---

## Migration Plan (Existing Scripts)

### Current State
- ❌ GA4 caricato **always** (no consent check) → NON COMPLIANT
- ❌ Meta Pixel caricato **always** → NON COMPLIANT
- ❌ Hotjar caricato **always** → NON COMPLIANT

### Migration Steps

#### 1. Wrap existing scripts with consent check
**Before** (`apps/web/src/app/layout.tsx`):
```tsx
<Script src="https://www.googletagmanager.com/gtag/js?id=G-XXX" />
```

**After**:
```tsx
{userConsent.analytics && (
  <Script src="https://www.googletagmanager.com/gtag/js?id=G-XXX" />
)}
```

#### 2. Implement consent context provider
```tsx
// apps/web/src/contexts/ConsentContext.tsx
export const ConsentProvider = ({ children }) => {
  const [consent, setConsent] = useState<ConsentState>(loadFromStorage());

  return (
    <ConsentContext.Provider value={{ consent, setConsent }}>
      {children}
    </ConsentContext.Provider>
  );
};
```

#### 3. Update all script loads
- ✅ GA4 gated by `consent.analytics`
- ✅ Meta Pixel gated by `consent.marketing`
- ✅ Hotjar gated by `consent.functional`
- ✅ Intercom gated by `consent.functional`

#### 4. Test compliance
- Manual testing checklist (sopra)
- Automated E2E tests
- Privacy audit tools (OneTrust, Cookiebot scanner)

---

## Compliance Checklist

- [ ] Tutti gli script marketing/analytics **gated** by consent
- [ ] Google Consent Mode v2 implementato
- [ ] YouTube embed usa `youtube-nocookie.com` se no consent
- [ ] Google Maps mostra placeholder se no consent functional
- [ ] Meta Pixel non carica se no consent marketing
- [ ] Cookie policy elenca **tutti** i cookie con durata/scopo
- [ ] Admin può aggiungere/rimuovere script senza deploy code
- [ ] Test E2E verificano gating corretto

---

## Resources

- [Google Consent Mode Developer Guide](https://developers.google.com/tag-platform/security/guides/consent)
- [Meta Pixel Advanced Matching](https://developers.facebook.com/docs/meta-pixel/implementation/advanced-matching)
- [IAB TCF v2.2 Specs](https://iabeurope.eu/tcf-2-0/) (se integrato)
- [GDPR Cookie Compliance Guide](https://gdpr.eu/cookies/)

---

**Maintained by**: Legal + Frontend Team
**Last updated**: 2025-09-29
**Next review**: 2026-03-29 (ogni 6 mesi)