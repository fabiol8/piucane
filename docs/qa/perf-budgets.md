# Performance Budgets — PiùCane
**Ultimo aggiornamento:** 2025-09-30 • **Owner:** QA Performance

## Metriche Chiave
| Pagina | LCP (ms) | TTI (ms) | CLS | Note |
|--------|----------|---------|-----|------|
| `/` (Home) | ≤ 2200 | ≤ 2800 | ≤ 0.08 | Hero + CTA principali |
| `/shop` | ≤ 2500 | ≤ 3200 | ≤ 0.1 | Catalogo con filtri dinamici |
| `/checkout` | ≤ 2600 | ≤ 3200 | ≤ 0.05 | Stepper multi-form |
| `/subscriptions` | ≤ 2400 | ≤ 3000 | ≤ 0.08 | Stato abbonamenti |
| `/inbox` | ≤ 2300 | ≤ 3000 | ≤ 0.08 | Messaggistica multicanale |

## Budget Tecnici
- **Bundle JS iniziale**: ≤ 180KB gz (PWA) — monitor `next build` output
- **API response time**: P95 < 400ms (`/api/ecommerce`, `/api/subscriptions`)
- **Web Vitals**: FID < 100ms, INP < 200ms (Chrome UX Report)
- **Images**: WebP obbligatorio, lazy loading default, `next/image`

## Monitoraggio
- Lighthouse CI (`apps/web/lighthouseci/lighthouserc.json`)
- WebPageTest (mensile) profili mobile 4G emulati
- Firebase Performance SDK (runtime) — alert Slack #perf se LCP > budget per 3 giorni

## Azioni Correttive
1. Se LCP > budget → verifica critical CSS + ottimizzazione immagini
2. Se TTI > budget → analizza bundle con `npx next build --profile`
3. CLS sopra soglia → audit layout shift (lazy loaded components)
4. API > 400ms → profiler Firestore query + caching layer Redis

## Reporting
- Dashboard Looker Studio “PiùCane Web Vitals” aggiornata giornalmente
- Sintesi nel release note (CHANGELOG) con trend LCP/TTI/CLS
