# AI & Chatbot — Index
**Owner:** Engineering Team • **Ultimo aggiornamento:** 2024-01-01 • **Versione doc:** v1.0

## Scopo
Sistema AI con tre agenti specializzati per consulenza veterinaria, educazione canina e grooming.

## Contenuti
- [prompts.md](./prompts.md) — Template prompt per agenti AI
- [safety-guardrails.md](./safety-guardrails.md) — Guardrail di sicurezza

## Agenti AI

### 1. Vet Agent
- **Scopo**: Triage sintomi, consigli generali salute
- **Guardrail**: NO diagnosi, sempre consigliare veterinario
- **Tool Access**: `getDogProfile`, `logAdverseEvent`

### 2. Educator Agent
- **Scopo**: Missioni SMART, training comportamentale
- **Guardrail**: Metodi positivi, no violenza
- **Tool Access**: `createMission`, `getDogProfile`

### 3. Groomer Agent
- **Scopo**: Routine mantello, prodotti specifici
- **Guardrail**: Sicurezza prodotti, allergie
- **Tool Access**: `suggestProducts`, `getDogProfile`

## Tecnologia

- **LLM**: Google Gemini Pro
- **Framework**: Function calling per tool use
- **Safety**: Content filtering e prompt injection protection
- **Monitoring**: Log conversations per QA

## Integration

```typescript
const aiResponse = await callAI({
  agent: 'vet',
  conversation: messages,
  dogProfile: userDogData,
  tools: ['getDogProfile', 'logAdverseEvent']
});
```

## Quality Assurance

- Tag conversations: `urgent`, `promo`
- Human review per red flags
- Feedback loop per miglioramento prompts