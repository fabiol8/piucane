# PiùCane Documentation — Master Index
**Owner:** Product Engineering • **Ultimo aggiornamento:** 2025-09-28 • **Versione doc:** v1.0

## Scopo
Documentazione tecnica completa per la piattaforma PiùCane, includendo architettura, implementazione, analytics, compliance e deployment.

## Struttura Documentazione

### 📐 **Architettura & Setup**
- [analytics/](./analytics/) — GA4 events, CTA tracking, GTM mapping
- [adr/](./adr/) — Architectural Decision Records
- [cmp/](./cmp/) — Consent Management Platform
- [legal/](./legal/) — Privacy policy, cookie policy, GDPR

### 🚀 **Features & Modules**
- [messaging/](./messaging/) — Orchestratore multicanale, templates, providers
- [gamification/](./gamification/) — Missioni, badge, rewards system
- [onboarding/](./onboarding/) — Form schema, vaccination tracking
- [subscriptions/](./subscriptions/) — Cadence calculation, overrides
- [warehouse/](./warehouse/) — FEFO inventory, pick & pack
- [ai/](./ai/) — Gemini agents, prompts, safety guardrails

### 🔒 **Security & Quality**
- [a11y/](./a11y/) — Accessibility checklist WCAG 2.2 AA
- [security/](./security/) — RBAC, MFA, CSP, Firestore rules
- [qa/](./qa/) — Test checklists, pen testing
- [runbooks/](./runbooks/) — Release procedures, CI/CD

## Convenzioni Documentazione

1. **Ogni directory ha un `index.md`** con overview e contenuti
2. **ADR per decisioni architetturali** in formato `ADR-YYYYMMDD-slug.md`
3. **Aggiornamento obbligatorio** ad ogni PR che tocca l'area
4. **Discovery Log** nel README.md di root per soluzioni tecniche

## Status Compliance PROMPTMASTER.md

✅ **Implementato:**
- Struttura repository
- Firebase hosting multi-site
- Basic UI/UX

🔄 **In Progress:**
- Documentazione completa
- Analytics GA4
- CTA Registry

❌ **Da Implementare:**
- API orchestratore completo
- AI Agents con Gemini
- Gamification system
- Messaging multicanale
- Testing & CI/CD
- Legal & CMP

## Quick Links

- [🏠 Homepage](../README.md)
- [📋 CTA Registry](./cta/registry.json)
- [📊 GA4 Events](./analytics/ga4-events.md)
- [🚀 Release Notes](../CHANGELOG.md)
- [🔧 API Docs](https://api.piucane.it/docs)