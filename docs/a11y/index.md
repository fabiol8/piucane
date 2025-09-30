# Accessibility — Index
**Owner:** Frontend Team • **Ultimo aggiornamento:** 2025-09-29 • **Versione doc:** v1.0

## Scopo
Documentazione completa delle pratiche, checklist e linee guida per garantire l'accessibilità WCAG 2.2 AA in tutte le interfacce utente della piattaforma PiùCane.

## Contenuti
- [checklist.md](./checklist.md) — Checklist WCAG 2.2 AA per audit accessibilità
- [components-a11y.md](./components-a11y.md) — Documentazione accessibilità componenti UI
- Test automatici con axe-core e Playwright (vedi `/tests/accessibility/`)

## Standard di riferimento
- **WCAG 2.2 Level AA** compliance obbligatoria
- **ARIA 1.2** patterns per componenti interattivi
- **Keyboard navigation** completa
- **Screen reader** compatibility (NVDA, JAWS, VoiceOver)

## Strumenti di testing
- `@axe-core/playwright` — Test automatici A11y
- Lighthouse CI — Audit accessibilità (soglia ≥90)
- Manual testing con screen reader

## Gate CI/CD
- ❌ **Blocca merge** se test axe falliscono su issue **serious/critical**
- ⚠️ **Warning** su issue moderate/minor (da risolvere entro sprint)

## Responsabilità
- **Frontend Team**: Implementazione componenti accessibili
- **Design Team**: Design system con pattern WCAG-compliant
- **QA Team**: Testing manuale con screen reader

## Link utili
- [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Playwright A11y testing docs](https://playwright.dev/docs/accessibility-testing)