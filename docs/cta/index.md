# CTA & Interaction Tracking — Index
**Owner:** Engineering Team • **Ultimo aggiornamento:** 2024-01-01 • **Versione doc:** v1.0

## Scopo
Sistema di tracciamento delle Call-to-Action (CTA) per misurare interazioni utente e conversioni.

## Contenuti
- [registry.json](./registry.json) — Registro completo CTA ID e mappature
- [guidelines.md](./guidelines.md) — Linee guida per implementazione CTA

## Sistema CTA

### Convenzione Naming
Formato: `pagina.sezione.elemento.azione`

Esempi:
- `pdp.abbonati.button.click`
- `account.inbox.message.open`
- `checkout.payment.submit`

### Implementazione
```tsx
<button
  data-cta-id="pdp.abbonati.button.click"
  onClick={handleSubscribe}
>
  Abbonati Ora
</button>
```

### Tracking Automatico
1. GTM rileva `data-cta-id`
2. Lookup in registry per evento GA4
3. Invio evento con parametri configurati
4. Rispetto automatic consensi CMP

## Registry Structure

```json
{
  "id": "unique.cta.identifier",
  "ga4_event": "corresponding_ga4_event",
  "params": ["param1", "param2"]
}
```

## Validation & CI

- Script automatico verifica CTA nel codice vs registry
- CI fallisce se CTA non registrate
- Lint rule per enforcing `data-cta-id` su elementi interattivi

## Best Practices

1. **Univocità**: Ogni CTA ha ID unico
2. **Semantica**: ID descrittivo della funzione
3. **Consistenza**: Seguire convenzione naming
4. **Documentazione**: Ogni CTA nel registry
5. **Testing**: Verificare eventi in GA DebugView