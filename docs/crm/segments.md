# User Segmentation — Automatic Segments

Documentazione dei segmenti utente automatici e criteri di appartenenza.

## Segmenti Predefiniti

### 1. New Users (Nuovi Utenti)
**Criteri**:
- Registrato da ≤7 giorni
- `orderCount === 0`
- Profilo cane completato

**Use cases**:
- Onboarding journey 30 giorni
- Welcome discount (10% primo ordine)
- Product education content

**Firestore Query**:
```ts
const newUsers = await db.collection('users')
  .where('createdAt', '>=', sevenDaysAgo)
  .where('orderCount', '==', 0)
  .get();
```

---

### 2. First Purchase (Primo Acquisto)
**Criteri**:
- `orderCount === 1`
- No abbonamento attivo
- Registrato da ≥7 giorni

**Use cases**:
- Upsell abbonamento (sconto 20% primo mese)
- Richiesta review primo ordine
- Cross-sell prodotti complementari

---

### 3. Subscribers (Abbonati Attivi)
**Criteri**:
- `subscriptions.active === true`
- `subscriptions.status === 'active'`
- `subscriptions.nextShipAt` presente

**Use cases**:
- Reminder cambio data consegna
- Upsell addons (snack, integratori)
- Loyalty program communication

**Sub-segmenti**:
- **New Subscribers**: Abbonamento attivato <30 giorni
- **Loyal Subscribers**: Abbonamento attivo >180 giorni
- **Multi-Dog Subscribers**: >1 abbonamento attivo

---

### 4. Churned (Abbonamenti Cancellati)
**Criteri**:
- `subscriptions.cancelledAt` presente
- Cancellato da >30 giorni
- `subscriptions.status === 'cancelled'`

**Use cases**:
- Winback campaign (sconto rientro 30%)
- Survey cancellazione (perché hai cancellato?)
- Retargeting ads

---

### 5. Silent Users (Utenti Silenti)
**Criteri**:
- `lastLoginAt` >60 giorni fa
- Abbonamento attivo O orderCount >0
- No ordini ultimi 90 giorni

**Use cases**:
- Re-engagement campaign
- "Ti manca il tuo amico?" message
- Reminder app features (missioni, chat consulente)

---

### 6. VIP Customers
**Criteri**:
- `ltv >= 500` EUR **OR** `orderCount >= 10`
- Rating medio reviews ≥4.5

**Use cases**:
- Early access nuovi prodotti
- VIP support (priorità tickets)
- Exclusive discounts
- Birthday special gift

---

### 7. At Risk (Abbonamento a Rischio)
**Criteri**:
- Abbonamento attivo
- `subscriptions.nextShipAt` entro 15 giorni
- Payment method scaduto O ultimo pagamento fallito

**Use cases**:
- Reminder aggiornamento carta pagamento
- Assistenza proattiva
- Retention discount (5% rinnovo)

---

### 8. High Engagement
**Criteri**:
- Login ultimi 7 giorni
- ≥3 sessioni ultima settimana
- ≥1 interazione missioni/chat/inbox

**Use cases**:
- Feature announcements
- Beta testing nuove funzionalità
- Community building (UGC campaigns)

---

### 9. Low Engagement
**Criteri**:
- Registrato da >30 giorni
- <2 login ultimo mese
- No ordini ultimi 60 giorni

**Use cases**:
- Win-back discount aggressive (25%)
- Survey: "Cosa possiamo migliorare?"
- Educazione valore app (tips, use cases)

---

### 10. Multi-Dog Owners
**Criteri**:
- `dogs.length >= 2`
- ≥1 profilo cane attivo

**Use cases**:
- Bundle discounts (ordini multi-cane)
- Content "gestire più cani"
- Upsell abbonamenti aggiuntivi

---

## Dynamic Segments (Custom)

Admin può creare **segmenti custom** con query builder:

**Interface**:
```ts
interface SegmentRule {
  field: string;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'not-in' | 'contains';
  value: any;
}

interface CustomSegment {
  id: string;
  name: string;
  description: string;
  rules: SegmentRule[];
  logic: 'AND' | 'OR';
  createdAt: Timestamp;
  createdBy: string; // admin UID
}
```

**Esempio: "Cani senior con abbonamento"**:
```json
{
  "name": "Cani Senior Abbonati",
  "rules": [
    { "field": "dogs.ageMonths", "operator": ">=", "value": 84 },
    { "field": "subscriptions.active", "operator": "==", "value": true }
  ],
  "logic": "AND"
}
```

---

## Segment Refresh Schedule

**Cloud Scheduler Job**:
```yaml
name: segment-refresh
schedule: "0 2 * * *" # 02:00 ogni giorno
endpoint: /api/crm/segments/refresh
timeout: 300s
```

**Process**:
1. Loop tutti i segmenti attivi
2. Esegui query per ogni segmento
3. Aggiorna `userSegments/{uid}` con array segmenti attuali
4. Trigger eventi `segment.entered` / `segment.exited`
5. Log metrics (segment size, growth rate)

**Firestore Document**:
```ts
// userSegments/{uid}
{
  segments: ['subscribers', 'vip', 'high_engagement'],
  lastUpdated: Timestamp,
  history: [
    { segment: 'new_users', exitedAt: '2025-09-15' },
    { segment: 'first_purchase', enteredAt: '2025-09-20' }
  ]
}
```

---

## Segment Analytics

### Metrics per Segment
- **Size**: Numero utenti nel segmento
- **Growth rate**: Variazione % ultimo mese
- **Conversion rate**: % utenti che completano azione target
- **LTV**: LTV medio utenti in segmento
- **Churn rate**: % utenti che escono da segmento/mese

### Dashboard Admin
**Path**: `/apps/admin/src/modules/crm/analytics/segments`

Visualizza:
- Pie chart distribuzione utenti per segmento
- Line chart growth trend (ultimo trimestre)
- Table segment size + key metrics
- Cohort analysis per segmento

---

## Segment-Based Campaigns

### Esempio: Winback Churned Users
```ts
// api/src/modules/crm/campaigns/winback.ts
export async function runWinbackCampaign() {
  const churned = await getSegment('churned');

  for (const user of churned) {
    const templateKey = 'winback_discount_30';
    const channel = user.preferredChannel || 'email';

    await sendMessage({
      uid: user.uid,
      templateKey,
      channel,
      data: {
        firstName: user.firstName,
        discountCode: generateCode('WELCOME_BACK_30'),
        dogName: user.dogs[0].name
      }
    });
  }

  // Log campaign
  await logCampaign({
    name: 'Winback Churned Q4 2025',
    segment: 'churned',
    sent: churned.length,
    templateKey: 'winback_discount_30'
  });
}
```

---

## RFM Segmentation (Future)

**RFM** = Recency, Frequency, Monetary

Classifica utenti su 3 dimensioni:
- **Recency**: Giorni dall'ultimo ordine
- **Frequency**: Numero ordini totali
- **Monetary**: LTV (€)

Ogni dimensione score 1-5 → 125 micro-segmenti (5³)

**Top RFM segments**:
- **555 Champions**: Recency alta, Frequency alta, Monetary alto → VIP
- **155 Promising**: Recency alta, low freq/monetary → Nurture
- **511 At Risk**: Low recency, alta freq/monetary → Retention campaign

**Implementation**: Phase 3 roadmap (Q2 2026)

---

## Cohort Analysis

**Definizione**: Gruppo utenti con caratteristica comune (es. registrati stesso mese).

**Use case**: Analizzare retention rate per coorte registrazione.

**Esempio Query**:
```ts
// Coorte registrati Settembre 2025
const sept2025 = await db.collection('users')
  .where('createdAt', '>=', new Date('2025-09-01'))
  .where('createdAt', '<', new Date('2025-10-01'))
  .get();

// Calcola D7, D30 retention
const d7Retained = sept2025.filter(u => u.lastLoginAt >= u.createdAt + 7d);
const retentionD7 = (d7Retained.length / sept2025.length) * 100;
```

---

## Privacy & Compliance

### GDPR Considerations
- ✅ Segmentazione basata su **dati comportamentali**, non sensibili
- ✅ Utente può **opt-out** da segmenti marketing (preference center)
- ✅ Export segmenti include solo UID (no PII leak)
- ✅ Delete utente rimuove da tutti i segmenti

### Consent Required
- **Marketing segments** (VIP, Churned, etc.) → Require marketing consent
- **Service segments** (At Risk payment) → No consent required (legittimo interesse)

---

## Testing

```ts
// tests/unit/crm/segments.spec.ts
describe('Segmentation Engine', () => {
  it('identifies VIP customers correctly', () => {
    const user = { ltv: 600, orderCount: 12 };
    expect(getSegments(user)).toContain('vip');
  });

  it('identifies churned subscribers', () => {
    const user = {
      subscriptions: {
        status: 'cancelled',
        cancelledAt: new Date(Date.now() - 45 * 86400000)
      }
    };
    expect(getSegments(user)).toContain('churned');
  });

  it('handles multi-segment membership', () => {
    const user = {
      ltv: 600,
      subscriptions: { active: true },
      lastLoginAt: Date.now() - 86400000
    };
    const segments = getSegments(user);
    expect(segments).toContain('vip');
    expect(segments).toContain('subscribers');
    expect(segments).toContain('high_engagement');
  });
});
```

---

## Resources
- [RFM Analysis Guide](https://www.putler.com/rfm-analysis/)
- [Cohort Analysis Best Practices](https://mixpanel.com/topics/what-is-cohort-analysis/)
- [Customer Segmentation Strategies](https://www.optimove.com/resources/learning-center/customer-segmentation)