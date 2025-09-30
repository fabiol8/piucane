# CTA Guidelines — PiuCane
**Ultimo aggiornamento:** 2025-09-30 • **Owner:** Product Design

## Naming Convention
`pagina.sezione.elemento.azione`
- Minuscole, separatore punto
- Evitare caratteri speciali / spazi
- Action: `click`, `change`, `submit`, `view`

## Implementazione
- Ogni CTA interattiva deve avere `data-cta-id`
- Utilizzare `trackCTA` per eventi custom + `trackEvent` per GA4 standard
- Aggiornare `docs/cta/registry.json` con `ga4Event`, `parameters`, `priority`

## Priorità
| Livello | Descrizione | SLA bugfix |
|---------|-------------|------------|
| Critical | Impatta revenue/conversione (es. checkout) | immediate (stesso giorno) |
| High | Funzioni core (es. cart, onboarding) | < 24h |
| Medium | Funzioni di supporto (es. preferenze) | < 3 giorni |
| Low | Navigazione o tool interni | inserire backlog |

## QA Steps
1. `npm run cta:check` → nessun CTA non registrato
2. GA DebugView → evento con `cta_id` corretto
3. Verifica `docs/analytics/ga4-events.md` aggiornato
4. Includere CTA nuovi nel changelog
