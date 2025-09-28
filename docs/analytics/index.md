# Analytics — Index
**Owner:** Engineering Team • **Ultimo aggiornamento:** 2024-01-01 • **Versione doc:** v1.0

## Scopo
Sistema di analytics e tracking per misurare performance, comportamento utenti e KPI business.

## Contenuti
- [ga4-events.md](./ga4-events.md) — Eventi Google Analytics 4 tracciati
- [gtm-mapping.md](./gtm-mapping.md) — Configurazione Google Tag Manager
- [consent-mode.md](./consent-mode.md) — Gestione consensi per analytics

## Architettura Analytics

```
User Action → CTA (data-cta-id) → GTM → GA4
                     ↓
              Consent Check → Event Sent/Blocked
```

## Stack Tecnologico

- **Google Analytics 4**: Analytics principale
- **Google Tag Manager**: Gestione tag e eventi
- **Consent Mode v2**: Gestione consensi GDPR
- **Custom Events**: Eventi business specifici

## Setup & Configuration

1. **GA4 Property**: Configurata per app.piucane.it
2. **GTM Container**: Gestione centralizzata tag
3. **Consent Integration**: Rispetto automatico consensi CMP
4. **Custom Dimensions**: Dimensioni business specifiche

## KPI Tracciati

### Business Metrics
- Conversion rate abbonamenti
- Customer lifetime value
- Retention rate
- Revenue per user

### User Engagement
- Session duration
- Page views per session
- Feature adoption
- AI agent usage

### E-commerce
- Cart abandonment rate
- Average order value
- Purchase frequency
- Category performance

## Privacy & Compliance

- Tutti gli eventi rispettano Consent Mode v2
- Nessun PII negli eventi analytics
- IP anonimizzazione attiva
- Data retention policy configurata