# ADR (Architectural Decision Records) — Index
**Owner:** Engineering Team • **Ultimo aggiornamento:** 2025-09-29 • **Versione doc:** v1.0

## Scopo
Repository di decisioni architetturali significative (ADR) per tracciare il "perché" delle scelte tecnologiche e strutturali del progetto PiùCane.

## Formato ADR

Ogni ADR segue template:
```
# ADR-YYYYMMDD-[slug]

## Status
[Proposed | Accepted | Deprecated | Superseded]

## Context
Descrizione problema/contesto che richiede decisione

## Decision
Decisione presa (cosa abbiamo scelto)

## Consequences
### Positive
- Pro 1
- Pro 2

### Negative
- Contro 1
- Contro 2

## Alternatives Considered
1. Alternativa A: descrizione + perché scartata
2. Alternativa B: descrizione + perché scartata

## Related ADRs
- Supersedes: ADR-XYZ (se applicable)
- Related: ADR-ABC (se applicable)
```

## ADR List (Chronological)

### Infrastructure & Platform
- **[ADR-20250929-firebase-platform](./ADR-20250929-firebase-platform.md)** — Scelta Firebase come platform principale (Firestore, Auth, Hosting, Functions)
- **[ADR-20250929-monorepo-structure](./ADR-20250929-monorepo-structure.md)** — Monorepo con Turborepo per gestione multi-app
- **[ADR-20250929-multi-site-hosting](./ADR-20250929-multi-site-hosting.md)** — Firebase multi-site hosting per app/admin/docs separati

### Frontend
- **[ADR-20250929-nextjs-framework](./ADR-20250929-nextjs-framework.md)** — Next.js 14 App Router come framework React
- **[ADR-20250929-tailwind-styling](./ADR-20250929-tailwind-styling.md)** — Tailwind CSS per styling + design system
- **[ADR-20250929-pwa-approach](./ADR-20250929-pwa-approach.md)** — PWA con Service Worker per offline-first experience

### Backend & API
- **[ADR-20250929-express-api](./ADR-20250929-express-api.md)** — Express.js per API REST (vs Cloud Functions HTTP)
- **[ADR-20250929-firestore-database](./ADR-20250929-firestore-database.md)** — Firestore NoSQL (vs Cloud SQL PostgreSQL)

### Payments & Subscriptions
- **[ADR-20250929-stripe-payments](./ADR-20250929-stripe-payments.md)** — Stripe per pagamenti e subscriptions management
- **[ADR-20250929-subscription-cadence](./ADR-20250929-subscription-cadence.md)** — Cadenza abbonamenti calcolata automaticamente da profilo cane

### AI & Content
- **[ADR-20250929-gemini-ai](./ADR-20250929-gemini-ai.md)** — Google Gemini per AI agents (Vet, Educatore, Groomer)

### Communication
- **[ADR-20250929-sendgrid-email](./ADR-20250929-sendgrid-email.md)** — SendGrid come email provider principale
- **[ADR-20250929-fcm-push](./ADR-20250929-fcm-push.md)** — Firebase Cloud Messaging per push notifications
- **[ADR-20250929-mjml-templates](./ADR-20250929-mjml-templates.md)** — MJML per email templates responsive

### Analytics & Tracking
- **[ADR-20250929-ga4-analytics](./ADR-20250929-ga4-analytics.md)** — Google Analytics 4 per analytics (vs Mixpanel)
- **[ADR-20250929-cta-tracking](./ADR-20250929-cta-tracking.md)** — CTA registry con data-cta-id per tracking granulare

### Testing & Quality
- **[ADR-20250929-jest-unit-testing](./ADR-20250929-jest-unit-testing.md)** — Jest per unit e integration tests
- **[ADR-20250929-playwright-e2e](./ADR-20250929-playwright-e2e.md)** — Playwright per E2E tests (vs Cypress)

## Naming Convention

**Format**: `ADR-YYYYMMDD-[slug].md`

**Examples**:
- `ADR-20250929-firebase-platform.md`
- `ADR-20251015-migrate-to-cloud-run.md`

**Slug**: kebab-case, max 5 parole, descrittivo

## When to Create ADR

Crea un ADR quando:
- ✅ Scelta tecnologica significativa (framework, database, provider)
- ✅ Decisione architetturale che impatta struttura sistema
- ✅ Trade-off importanti valutati (performance vs costo, etc.)
- ✅ Cambio direzione tecnica (migrate to X)
- ✅ Standard/pattern adottato team-wide

**Non serve ADR per**:
- ❌ Scelte minori (naming convention variabile)
- ❌ Bug fix o refactoring locale
- ❌ Aggiunta feature standard senza decisioni architetturali

## Lifecycle ADR

### Proposed
Nuova proposta, in discussione team

### Accepted
Decisione approvata, implementata o in corso implementazione

### Deprecated
Decisione obsoleta ma ancora in uso (non più raccomanda per nuovo codice)

### Superseded
Decisione sostituita da ADR più recente (indicare quale ADR sostituisce)

## Review Process

1. **Author**: Crea ADR draft (status: Proposed)
2. **Review**: Team review + discussion (GitHub PR)
3. **Decision**: Approvazione o rigetto
4. **Update**: Status → Accepted
5. **Implementation**: Implementa decisione
6. **Update docs**: Aggiorna documentazione rilevante

## ADR Template File

Disponibile in: `/docs/adr/ADR-TEMPLATE.md`

```markdown
# ADR-YYYYMMDD-[slug]

**Date**: YYYY-MM-DD
**Status**: [Proposed | Accepted | Deprecated | Superseded]
**Author**: [Nome]
**Reviewers**: [Lista]

## Context

[Descrivi il problema o la situazione che richiede una decisione.
Includi vincoli, requisiti, obiettivi.]

## Decision

[Descrivi la decisione presa. Sii specifico e chiaro.]

## Consequences

### Positive
- [Pro 1]
- [Pro 2]
- [Pro 3]

### Negative
- [Contro 1]
- [Contro 2]

### Risks
- [Rischio 1 + mitigazione]
- [Rischio 2 + mitigazione]

## Alternatives Considered

### Alternative 1: [Nome]
**Description**: [Descrizione breve]
**Pros**: [Vantaggi]
**Cons**: [Svantaggi]
**Why rejected**: [Motivo]

### Alternative 2: [Nome]
**Description**: [Descrizione breve]
**Pros**: [Vantaggi]
**Cons**: [Svantaggi]
**Why rejected**: [Motivo]

## Implementation Notes

[Note tecniche per implementazione, se applicable]

## Related ADRs

- Supersedes: [ADR-XYZ](./ADR-XYZ.md)
- Related: [ADR-ABC](./ADR-ABC.md)
- Depends on: [ADR-DEF](./ADR-DEF.md)

## References

- [Link documentazione]
- [Link discussion]
- [Link benchmark/research]
```

## Best Practices

### Writing
- ✅ **Conciso**: 1-2 pagine max
- ✅ **Specifico**: Decisione chiara, no ambiguità
- ✅ **Completo**: Context, decision, consequences, alternatives
- ✅ **Timestamped**: Data decisione importante per contesto futuro

### Maintenance
- ✅ Update status quando decisione cambia
- ✅ Link ADR nuovo se supersede uno vecchio
- ✅ Non cancellare ADR deprecated (history importante)
- ✅ Review ADR ogni 6-12 mesi (still valid?)

## Resources

- [ADR GitHub Org](https://adr.github.io/)
- [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [ADR Tools](https://github.com/npryce/adr-tools)

## Index by Category

### Platform (4)
- Firebase Platform
- Monorepo Structure
- Multi-site Hosting
- Express API

### Frontend (3)
- Next.js Framework
- Tailwind CSS
- PWA Approach

### Data (1)
- Firestore Database

### Payments (2)
- Stripe Payments
- Subscription Cadence

### AI (1)
- Gemini AI Agents

### Communication (3)
- SendGrid Email
- FCM Push
- MJML Templates

### Analytics (2)
- GA4 Analytics
- CTA Tracking

### Testing (2)
- Jest Unit Testing
- Playwright E2E

**Total ADRs**: 18 (as of 2025-09-29)