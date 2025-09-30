# CRM & Customer Lifecycle — Index
**Owner:** Backend + Marketing Team • **Ultimo aggiornamento:** 2025-09-29 • **Versione doc:** v1.0

## Scopo
Documentazione del sistema CRM (Customer Relationship Management) e gestione del customer lifecycle: segmentazione utenti, customer journeys automatizzati, retention campaigns.

## Contenuti
- [segments.md](./segments.md) — Segmentazione automatica utenti
- [journeys.md](./journeys.md) — Customer journeys automatizzati (onboarding 30d, winback, etc.)

## Architettura CRM

### 1. Segmentazione Utenti
**Engine**: `/api/src/modules/crm/segmentation.ts`

Segmenti automatici:
- **New Users**: Registrati <7 giorni, no ordini
- **First Purchase**: 1 ordine, no abbonamento
- **Subscribers**: Abbonamento attivo
- **Churned**: Abbonamento cancellato >30 giorni
- **Silent**: Nessun login >60 giorni, abbonamento attivo
- **VIP**: LTV >€500 o >10 ordini
- **At Risk**: Abbonamento in scadenza entro 15 giorni

### 2. Customer Journeys
**Engine**: `/api/src/modules/crm/journey-engine.ts`

Journey automatici:
- **Onboarding 30 giorni**: Welcome, tips, product discovery
- **Winback silenti**: Re-engagement utenti inattivi
- **Subscription renewal**: Reminder rinnovo abbonamento
- **Birthday campaign**: Auguri compleanno cane + sconto

### 3. Communication Orchestrator
**Path**: `/packages/lib/messaging/orchestrator.ts`

Gestisce:
- Best channel selection (email/push/whatsapp/inapp)
- Quiet hours respect (no notifiche 22:00-08:00)
- Rate limiting (max 3 email/settimana)
- A/B testing variants

### 4. Inbox Persistenza
**Rule**: Ogni messaggio inviato crea **sempre** copia in `inbox/{uid}/messages`

Permette:
- Storico comunicazioni
- Re-read messaggi
- Multi-canale unificato

## Firestore Collections

### `users/{uid}`
```json
{
  "segment": "subscribers",
  "ltv": 245.50,
  "orderCount": 5,
  "lastOrderAt": "2025-09-15",
  "lastLoginAt": "2025-09-28",
  "preferredChannel": "email",
  "quietHours": { "start": "22:00", "end": "08:00" }
}
```

### `journeys/{journeyId}`
```json
{
  "name": "Onboarding 30 giorni",
  "trigger": "user.created",
  "steps": [
    {
      "delay": 0,
      "templateId": "welcome",
      "channel": "email"
    },
    {
      "delay": 86400,
      "templateId": "onboarding_day2",
      "channel": "auto"
    }
  ]
}
```

### `journeyEnrollments/{uid}/{journeyId}`
```json
{
  "enrolledAt": "2025-09-01T10:00:00Z",
  "currentStep": 2,
  "status": "active",
  "completedSteps": [0, 1]
}
```

## API Endpoints

### Segmentation
- `GET /api/crm/segments` — Lista segmenti disponibili
- `GET /api/crm/segments/{segmentId}/users` — Utenti in segmento
- `POST /api/crm/segments/refresh` — Ricalcola segmenti (cron job)

### Journeys
- `GET /api/crm/journeys` — Lista journeys attivi
- `POST /api/crm/journeys/{journeyId}/enroll` — Enroll utente manualmente
- `DELETE /api/crm/journeys/{journeyId}/enrollments/{uid}` — Stop journey

### Analytics
- `GET /api/crm/analytics/ltv` — LTV distribution
- `GET /api/crm/analytics/churn-rate` — Churn rate mensile
- `GET /api/crm/analytics/engagement` — Engagement metrics

## Cloud Scheduler Jobs

### Daily Segmentation Refresh
```yaml
schedule: "0 2 * * *" # 02:00 ogni giorno
endpoint: /api/crm/segments/refresh
```

### Journey Step Processor
```yaml
schedule: "*/15 * * * *" # Ogni 15 minuti
endpoint: /api/crm/journeys/process-steps
```

### Winback Campaign
```yaml
schedule: "0 10 * * 1" # Lunedì alle 10:00
endpoint: /api/crm/campaigns/winback
```

## Admin Backoffice

**Path**: `/apps/admin/src/modules/crm/`

### Funzionalità Admin
- [ ] **Segments viewer**: Lista utenti per segmento, export CSV
- [ ] **Journey builder**: Visual editor per creare journeys
- [ ] **Campaign manager**: Crea/gestisci campagne one-shot
- [ ] **Analytics dashboard**: LTV, churn, engagement, conversion rates
- [ ] **Template tester**: Preview template con dati fake

## Best Channel Learning

**Algorithm**: `/packages/lib/messaging/orchestrator.ts`

Algoritmo adattivo:
1. **Default**: Email per tutti
2. **Track metrics**: Open rate, click rate, conversion per canale
3. **Learning**: Dopo 5 invii, calcola best channel
4. **Switch**: Usa canale con highest engagement
5. **Re-evaluate**: Ogni 10 invii, re-calcola

Metriche tracciate:
- **Email**: open_rate, click_rate, conversion_rate
- **Push**: open_rate, click_rate
- **WhatsApp**: delivered_rate, read_rate, reply_rate
- **In-app**: view_rate, click_rate

## Testing

### Unit Tests
```ts
// tests/unit/crm/segmentation.spec.ts
describe('User Segmentation', () => {
  it('should identify new users correctly', () => {
    const user = { createdAt: Date.now() - 5 * 86400000, orderCount: 0 };
    expect(getSegment(user)).toBe('new_users');
  });

  it('should identify churned subscribers', () => {
    const user = {
      subscriptionCancelledAt: Date.now() - 45 * 86400000,
      orderCount: 3
    };
    expect(getSegment(user)).toBe('churned');
  });
});
```

### Integration Tests
```ts
// tests/integration/crm/journey-engine.spec.ts
describe('Journey Engine', () => {
  it('should enroll user in onboarding journey', async () => {
    const uid = 'test-user-123';
    await enrollInJourney(uid, 'onboarding-30d');

    const enrollment = await getEnrollment(uid, 'onboarding-30d');
    expect(enrollment.status).toBe('active');
    expect(enrollment.currentStep).toBe(0);
  });

  it('should send step messages on schedule', async () => {
    // Mock time + process journey steps
    await processJourneySteps();

    const messages = await getInboxMessages('test-user-123');
    expect(messages).toHaveLength(1);
    expect(messages[0].templateKey).toBe('onboarding_welcome');
  });
});
```

## Metrics & KPIs

### Engagement
- **MAU** (Monthly Active Users): Utenti con login ultimo 30d
- **DAU** (Daily Active Users): Utenti con login ultimo 1d
- **Stickiness**: DAU / MAU ratio

### Retention
- **D1 Retention**: % utenti che ritornano giorno dopo registrazione
- **D7 Retention**: % utenti che ritornano dopo 7 giorni
- **D30 Retention**: % utenti che ritornano dopo 30 giorni

### Revenue
- **LTV** (Lifetime Value): Revenue totale per utente
- **ARPU** (Average Revenue Per User): Revenue medio per utente attivo
- **Churn Rate**: % abbonamenti cancellati / mese

### Campaigns
- **Open Rate**: % email aperte
- **Click Rate**: % click su CTA email
- **Conversion Rate**: % utenti che completano azione desiderata

## Compliance & Privacy

### GDPR
- ✅ Utente può **opt-out** da comunicazioni marketing
- ✅ Preference center per scegliere canali preferiti
- ✅ Export dati personali (GDPR Art. 20)
- ✅ Delete dati personali (GDPR Art. 17)

### Consent
- **Marketing consent** obbligatorio per email/push promozionali
- **Service messages** (es. conferma ordine) non richiedono consenso

## Roadmap

### Phase 1 (Current)
- ✅ Segmentazione automatica
- ✅ Onboarding journey
- ⏳ Winback campaign

### Phase 2 (Q1 2026)
- [ ] Journey builder visual (admin)
- [ ] A/B testing engine
- [ ] Predictive churn model (ML)

### Phase 3 (Q2 2026)
- [ ] RFM analysis (Recency, Frequency, Monetary)
- [ ] Lookalike audiences
- [ ] CDP integration (Customer Data Platform)

## Resources
- [Customer Lifecycle Management Best Practices](https://www.hubspot.com/customer-lifecycle)
- [RFM Analysis Guide](https://www.putler.com/rfm-analysis/)
- [Retention Rate Calculator](https://www.retentionscience.com/retention-rate-calculator/)