# Google Consent Mode v2 — Implementation Guide
**Owner:** Analytics Team • **Ultimo aggiornamento:** 2025-09-29 • **Versione:** v1.0

## Overview

Google Consent Mode v2 è un framework che permette di comunicare lo stato dei consensi GDPR a Google Analytics, Google Ads e altri servizi Google, permettendo tracking rispettoso della privacy.

## Consent Mode v2 vs v1

### Novità v2 (2024)
- ✅ **`ad_user_data`**: consenso per invio dati utente a Google per pubblicità
- ✅ **`ad_personalization`**: consenso per personalizzazione annunci
- ⚠️ **Obbligatorio da Marzo 2024** per UE/EEA

### Parametri Consent Mode v2

| Parametro | Descrizione | Default | Categoria CMP |
|-----------|-------------|---------|---------------|
| `analytics_storage` | Storage cookie analytics (GA4) | `denied` | Analytics |
| `ad_storage` | Storage cookie advertising | `denied` | Marketing |
| `ad_user_data` | Invio dati utente per ads | `denied` | Marketing |
| `ad_personalization` | Personalizzazione ads | `denied` | Marketing/Personalization |
| `functionality_storage` | Storage cookie funzionali | `denied` | Functional |
| `personalization_storage` | Storage cookie personalizzazione | `denied` | Personalization |
| `security_storage` | Storage cookie sicurezza | `granted` | Necessary (always) |

## Implementation PiùCane

### 1. Default Consent (Page Load - BEFORE gtag.js)

**File**: `apps/web/src/analytics/ga4.ts` (lines 39-46)

```typescript
// Configure Consent Mode v2 before initialization
window.gtag('consent', 'default', {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  functionality_storage: 'granted',
  security_storage: 'granted'
});
```

⚠️ **CRITICAL**: Questo deve essere chiamato **PRIMA** del caricamento di `gtag.js` o GTM.

### 2. Consent Update (After User Choice)

**File**: `apps/web/src/hooks/useConsent.ts` (lines 103-115)

```typescript
if (window.gtag) {
  window.gtag('consent', 'update', {
    analytics_storage: newConsent.analytics ? 'granted' : 'denied',
    ad_storage: newConsent.marketing ? 'granted' : 'denied',
    ad_user_data: newConsent.marketing ? 'granted' : 'denied',
    ad_personalization: newConsent.personalization ? 'granted' : 'denied',
    functionality_storage: newConsent.functional ? 'granted' : 'denied',
    personalization_storage: newConsent.personalization ? 'granted' : 'denied'
  });
}
```

### 3. GTM Integration

**File**: `apps/web/src/components/analytics/GTMContainer.tsx` (lines 35-41)

```typescript
// Push consent mode configuration BEFORE GTM loads
(window as any)[dataLayerName].push({
  event: 'consent_default',
  ...consentMode
});
```

**GTM dataLayer events**:
- `consent_default` - Initial consent state (on page load)
- `consent_update` - When user changes consent preferences

## Consent Modeling (Analytics Senza Consenso)

### Ping su Denied
Anche con `analytics_storage: denied`, GA4 invia **ping cookieless**:
- ❌ No cookie impostati
- ❌ No Client ID persistente
- ✅ Ping aggregati anonimi
- ✅ Conversion modeling (stima conversioni)

### Behavioral Modeling
Google usa machine learning per stimare conversioni mancanti:
- **Conversion modeling**: stima conversioni da utenti senza consenso
- **Behavioral modeling**: stima comportamenti aggregati

⚠️ **Accuracy**: ~70-80% (fonte: Google)

## Testing

### 1. Manual Testing (Chrome DevTools)

```javascript
// Check current consent state
window.gtag('get', 'G-XXXXXXXXX', 'consent', (consent) => {
  console.log('Current consent:', consent);
});

// Expected output:
{
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  functionality_storage: 'granted',
  security_storage: 'granted'
}
```

### 2. GA4 Debug Mode

**Enable**: `apps/web/src/analytics/ga4.ts` (line 54)
```typescript
debug_mode: process.env.NODE_ENV === 'development'
```

**Verify in Console**:
```
[GA4] Consent Mode initialized: { analytics_storage: 'denied', ... }
[GA4] Consent updated: { analytics_storage: 'granted', ... }
```

### 3. Google Tag Assistant

1. Install **Tag Assistant Legacy** Chrome extension
2. Navigate to site
3. Check "Consent Mode" section:
   - ✅ Default consent set before tags
   - ✅ Update consent called after user choice
   - ✅ No tags fire before consent (if denied)

### 4. Network Tab Verification

**Consent Denied** (analytics_storage: denied):
```
https://www.google-analytics.com/g/collect?...&gcs=G100
```
- `gcs=G100` = All consent denied (cookieless ping)

**Consent Granted** (analytics_storage: granted):
```
https://www.google-analytics.com/g/collect?...&gcs=G111&_ga=...
```
- `gcs=G111` = All consent granted
- `_ga` cookie present

## GTM Consent Mode Triggers

### Built-in Variables (GTM)
Enable in GTM > Variables > Built-in Variables:
- ☑️ Consent State - Analytics Storage
- ☑️ Consent State - Ad Storage
- ☑️ Consent State - Ad User Data
- ☑️ Consent State - Ad Personalization

### Example Trigger: "Fire Only If Consent"

**Type**: Custom Event
**Event name**: `.*` (regex)
**Fire on**: Some Custom Events
**Condition**: `Consent State - Analytics Storage` equals `granted`

### Example Tag: GA4 Config (Consent-aware)

```javascript
// GA4 Configuration Tag
// Trigger: All Pages
// Built-in Consent: Require consent for Analytics Storage

// Tag will:
// - Wait for consent_default
// - Fire immediately if granted
// - Fire cookieless ping if denied
// - Update when consent_update fires
```

## Region-Based Consent

### URL Parameters for Testing

```
?gtm_debug=1&gcs=G100  # Force all consent denied
?gtm_debug=1&gcs=G111  # Force all consent granted
```

### Geo-based Consent (Advanced)

```typescript
// apps/web/src/analytics/consent.ts
export const getDefaultConsentByRegion = (region: string) => {
  // EEA/UK: Require explicit consent (denied by default)
  if (['EU', 'UK'].includes(region)) {
    return {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    };
  }

  // Other regions: Opt-out model (granted by default)
  return {
    analytics_storage: 'granted',
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted'
  };
};
```

⚠️ **Not implemented yet** - Currently all regions use EEA/UK strict model.

## Compliance Checklist

- ✅ **Consent Mode set before gtag.js load**
- ✅ **Default state = denied** (except security_storage)
- ✅ **Update called after user consent**
- ✅ **No cookies set before consent** (verify with Storage tab)
- ✅ **GTM configured with Consent Mode triggers**
- ✅ **All tags respect consent requirements**

## Troubleshooting

### Issue: Tags fire before consent
**Cause**: `consent('default')` called after GTM/gtag.js loaded
**Fix**: Move `consent('default')` to `<head>` inline script BEFORE gtag.js

### Issue: Consent not updating in GTM
**Cause**: Missing `consent_update` dataLayer push
**Fix**: Verify `window.gtag('consent', 'update', ...)` is called in useConsent hook

### Issue: GA4 not tracking after consent granted
**Cause**: Page needs refresh for _ga cookie to be set
**Fix**: This is expected behavior. Next pageview will track normally.

### Issue: Too many consent_update events
**Cause**: Multiple components calling updateConsent
**Fix**: Use centralized consent state management (useConsent hook)

## Resources

- [Google Consent Mode v2 Official Docs](https://support.google.com/analytics/answer/9976101)
- [GTM Consent Mode Guide](https://developers.google.com/tag-platform/security/guides/consent)
- [Consent Mode Testing](https://developers.google.com/tag-platform/security/guides/consent?hl=en&consentmode=advanced#testing)
- [GDPR + Consent Mode](https://support.google.com/analytics/answer/9976101?hl=en&ref_topic=2919631)

## Changelog

- **2025-09-29**: Initial implementation con Consent Mode v2
- **TODO**: Region-based consent (EEA vs other)
- **TODO**: Consent Mode Admin dashboard (consent rate by region)