# GTM Mapping — PiuCane
**Ultimo aggiornamento:** 2025-09-30 • **Owner:** Marketing Analytics

## Container
- **ID**: `GTM-XXXXXXX`
- **Ambienti**: sviluppo, staging, produzione
- **Consent Mode v2**: attivo — tag caricati solo con `analytics_storage='granted'`

## Trigger Principali
| Trigger | Descrizione | Evento GA4 | CTA collegati |
|---------|-------------|------------|--------------|
| `cta-interaction` | Listener data-cta-id globale | `navigation_click`, `add_to_cart`, `checkout_step` | `home.*`, `cart.*`, `checkout.*` |
| `begin_checkout` | Dispatch custom event da `trackCTA` | `begin_checkout` | `checkout.started` |
| `purchase` | Dispatch custom event da `trackCTA` | `purchase` | `checkout.order.submitted` |
| `cart_update` | CTA cart | `cart_update` | `cart.quantity.updated` |

## Variabili Custom
- `cta_id` — data attribute esposto dal listener
- `user_journey_stage` — valorizzato da `trackEvent`
- `is_subscription` — flag per acquisti ricorrenti (item scope)
- `consent.marketing` — stato CMP (localStorage)

## Mapping Campi GA4
| Campo GA4 | Origine GTM | Note |
|-----------|-------------|------|
| `page_location` | Variabile integrata | Aggiornato su `history change` |
| `cta_id` | Data layer (`event.cta_id`) | Normalizzato lowercase |
| `item_id` | `event.items[].item_id` | Deriva da `trackCTA`/`trackEvent` |
| `subscription_frequency` | `event.subscription_frequency` | Popolato per `cart.subscription.updated` |

## QA Checklist
1. Verifica anteprima GTM: CTA `checkout.step.next`
2. DebugView GA4: evento `checkout_step` con parametri `from_step`, `to_step`
3. Consent Mode: blocco eventi marketing con `analytics_storage='denied'`
4. CTA registry sync: script `npm run cta:check` deve risultare 0 errori
