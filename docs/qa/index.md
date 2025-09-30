# Quality Assurance — Index
**Owner:** QA Engineering • **Ultimo aggiornamento:** 2025-09-30

## Scopo
Garantire che ogni release della piattaforma PiùCane rispetti gli standard di qualità definiti in PROMPTMASTER.md: copertura test ≥80%, tracciamento analytics integro, performance PWA e accessibilità WCAG 2.2 AA.

## Documenti
- [test-plan.md](./test-plan.md) — Strategia di test end-to-end, responsabilità e check-list
- [perf-budgets.md](./perf-budgets.md) — Budget prestazionali e KPI monitorati in Lighthouse/CI

## Pillar QA
1. **Automazione completa**: jest unit/integration, playwright e2e/a11y, lighthouse CI
2. **Observability**: report JUnit + coverage pubblicati come artifact CI
3. **Shift-left**: test contrattuali API e validazione CTA/GA in fase build
4. **Release gating**: pipeline bloccante su coverage <80%, audit security high, axe serious

## Routine QA
- Smoke test quotidiano ambienti staging (checkout, onboarding, AI chat)
- Review settimanale analytics (CTA coverage + GA DebugView)
- Regression a sprint: matrice test manuali + synthetic monitoring
- Incident post-mortem documentati in `docs/runbooks/incident.md`
