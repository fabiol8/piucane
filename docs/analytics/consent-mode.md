# Consent Mode v2 — PiuCane
**Ultimo aggiornamento:** 2025-09-30 • **Owner:** Privacy Engineering

## Strategia
- CMP personalizzato (`docs/cmp/index.md`) raccoglie consensi per **analytics**, **advertising**, **functional**
- `initGA4` imposta default `denied` per storage marketing; aggiornamento tramite `updateConsent`
- GTM utilizza `analytics_storage` / `ad_storage` per gating tag

## Flusso
1. Banner CMP → scelta utente → salvataggio in `localStorage` (`piucane_cmp`)
2. Metodo `setConsent` del CMP → invoca `updateConsent`
3. GA4/GTM ricevono aggiornamento → sbloccano eventi marketing solo con `granted`

## Mapping Consent
| CMP flag | analytics.consent | marketing.consent | Funzione |
|----------|------------------|-------------------|----------|
| `essential` | `granted` | `denied` | Carica solo tag funzionali |
| `analytics` | `granted` | `denied` | Abilita GA4 base |
| `marketing` | `granted` | `granted` | Abilita remarketing/ads |

## QA
- Modalità debug CMP in staging (`?cmpDebug=true`)
- Console `window.gtag('consent', 'default', ...)` = denied finché utente non accetta
- Test Playwright `privacy-consent.spec.ts` verifica toggles e dataLayer

## Incidenti & Logging
- Log opt-in/out in Firestore `consents/{uid}` per audit GDPR
- Alert Slack `#privacy` se opt-out rate > 55% per 7 giorni
