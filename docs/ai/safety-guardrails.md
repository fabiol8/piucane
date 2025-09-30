# AI Safety Guardrails
**Ultimo aggiornamento:** 2025-09-30 • **Owner:** Responsible AI

## Policy
- **No diagnosi**: vet agent evita diagnosi/prescrizioni
- **Escalation obbligatoria**: red flags → suggerire visita veterinaria urgente
- **Trasparenza**: indicare sempre che la risposta è generata da AI
- **Promo disclosure**: se propone prodotto PiùCane aggiungere nota "Possibile conflitto di interesse"
- **Privacy**: non memorizzare dati sensibili in log senza anonimizzazione

## Implementazione Tecnica
- `evaluateTriage` (packages/lib) determina urgenza e red flags
- Controlli risultati LLM → post-processing verifica parole vietate
- Prompt injection guard: rimuovere istruzioni utente che tentano override
- Logging sicuro: conversation stored con `redFlag` + timestamp

## Monitoraggio
- Review umana campione 5% conversazioni urgenti
- Alert Slack `#ai-ops` se >3 escalation in 1 ora
- Metriche: tempo medio risposta, % red flag, rating feedback utenti
