# Test Plan — PiùCane
**Versione:** 2025-09-30 • **Owner:** QA Engineering

## Obiettivi
- Copertura funzionale dei flussi critici (onboarding, checkout, abbonamenti, messaging)
- Prevenire regressioni su tracciamenti GA4/CTA e su regole business e-commerce
- Validare contratti REST e payload webhook esterni (Stripe)

## Scope
| Area | Stack | Automazione |
|------|-------|-------------|
| Frontend PWA | Next.js 14, React 18 | Jest unit (`apps/web/src/__tests__`), Playwright e2e/a11y, Lighthouse CI |
| API Orchestrator | Express, Firebase Admin | Jest integration (`api/src/__tests__/integration`), contract `openapi-contract.spec.ts`, emulator-only tests |
| Shared Libraries | packages/lib | Jest unit (triage, messaging renderer) |

## Suite & Responsabilità
- **Unit**: sviluppatori feature (PR blocking)
- **Integration**: QA + backend (Stripe, Firestore mock)
- **Contract**: QA (supertest + schema expectations)
- **E2E**: QA automation (Playwright matrix desktop/mobile)
- **A11y**: QA accessibility (axe via Playwright)
- **Performance**: QA performance (Lighthouse budgets)

## Copertura Attuale
- ✅ `computeCadenceDays` — calcolo cadence abbonamenti
- ✅ Stripe webhook handler — validazione firma / ack eventi payment
- ✅ Endpoint `/health` — schema risposta
- ✅ `evaluateTriage` — scoring urgenze AI Vet
- ✅ Rendering email MJML — snapshot semantico HTML

## Regressioni Da Monitorare
1. Checkout stepper: validazione form, analytics CTA `checkout.step.next`
2. Cart engine: sincronizzazione quantità, calcolo totale, eventi `cart_*`
3. GA4 tagging: nuovi CTA `home.*`, `checkout.*` registrati
4. API orchestrator: webhooks Stripe e rotte subscription
5. PWA performance: LCP < 2.5s (mobile), TTI < 3.5s

## Processi
- **Pre-merge**: `npm run lint`, `npm run test:unit`, `npm run test:e2e --project=chromium`, `npm run cta:check`, `npm run ga4:check`
- **Nightly**: full Playwright matrix + Lighthouse + axe
- **Release**: smoke manuale (checkout → ordine demo) + GA DebugView + monitor errori Sentry

## Deliverable
- Report JUnit (unit, integration, e2e)
- Coverage `coverage/lcov.info` ≥80%
- Lighthouse report JSON
- Playwright traces (solo failure)

## Risk & Mitigazioni
| Rischio | Mitigazione |
|---------|-------------|
| Flaky Playwright | Retry=1 su CI + `test.fixme` entro 48h |
| Webhook reali Stripe | Mock `constructEvent`, emulator Firestore |
| CTA mancanti | `scripts/validate/cta-registry.ts` bloccante CI |
| Performance regressions | `perf-budgets.md` + alert Slack Lighthouse |
