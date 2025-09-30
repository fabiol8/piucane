# Customer Journeys — Automated Flows

Documentazione dei customer journeys automatizzati: sequenze multi-step di comunicazioni triggered da eventi utente.

## Journey Engine Architecture

**Path**: `/api/src/modules/crm/journey-engine.ts`

**Core concepts**:
- **Trigger**: Evento che inizia journey (user.created, subscription.cancelled, etc.)
- **Steps**: Sequenza di azioni (send email, wait X days, check condition, etc.)
- **Enrollment**: Utente iscritto a journey con stato corrente
- **Completion**: Journey terminato (success o exit prematura)

---

## Journey 1: Onboarding 30 Giorni

**Trigger**: `user.created` + profilo cane completato

**Obiettivo**: Educare utente, incrementare engagement, convertire a primo ordine/abbonamento

**Durata**: 30 giorni

### Steps

#### Day 0 (Immediate)
**Template**: `onboarding_welcome`
**Channel**: Email
**Content**:
- Benvenuto in PiùCane
- Cosa puoi fare con l'app (shop, consulenti AI, missioni)
- CTA: "Scopri prodotti per [NomeCane]"
- Sconto 10% primo ordine (code: WELCOME10)

#### Day 1 (+24h)
**Template**: `onboarding_profile`
**Channel**: Push (fallback email)
**Content**:
- "Completa il profilo di [NomeCane] per raccomandazioni personalizzate"
- CTA: App deeplink `/dogs/[dogId]/profile`

#### Day 3 (+72h)
**Template**: `onboarding_ai_agents`
**Channel**: In-app notification
**Content**:
- "Hai domande su [NomeCane]? Chiedi ai nostri consulenti AI!"
- CTA: Apri chat con Vet/Educatore/Groomer

#### Day 7 (+168h)
**Template**: `onboarding_missions`
**Channel**: Email
**Content**:
- "Completa missioni e sblocca ricompense"
- Lista 3 missioni facili (completare profilo, primo ordine, prima chat)
- CTA: "Inizia le missioni"

#### Day 14 (+336h)
**Condition**: Se `orderCount === 0`
**Template**: `onboarding_discount_reminder`
**Channel**: Email + Push
**Content**:
- "Il tuo sconto WELCOME10 scade tra 16 giorni!"
- Highlight prodotti consigliati per razza/età cane
- CTA: "Usa il tuo sconto"

#### Day 21 (+504h)
**Condition**: Se `orderCount >= 1` AND no abbonamento
**Template**: `onboarding_subscription_upsell`
**Channel**: Email
**Content**:
- "Passa all'abbonamento e risparmia 20%"
- Calcolo risparmio annuale
- Testimonianze clienti
- CTA: "Attiva abbonamento"

#### Day 30 (+720h)
**Template**: `onboarding_complete`
**Channel**: Email
**Content**:
- "Grazie per essere parte della famiglia PiùCane!"
- Recap achievements (ordini, missioni, XP)
- Invito a seguire social, lasciare review
- CTA: "Condividi la tua esperienza"

### Exit Conditions
- Utente **deletes account** → stop journey
- Utente **unsubscribes** da marketing emails → stop journey
- Journey completo (day 30) → mark completed

### Metrics
- **Enrollment rate**: % new users che entrano nel journey
- **Completion rate**: % utenti che completano tutti gli step
- **Conversion rate**: % utenti che fanno primo ordine entro 30d
- **Drop-off**: Step con maggior abbandono

---

## Journey 2: Winback Silenti (Re-engagement)

**Trigger**: `user.lastLoginAt` >60 giorni + (`subscriptions.active` OR `orderCount > 0`)

**Obiettivo**: Riportare utente inattivo nell'app/sito

**Durata**: 21 giorni

### Steps

#### Day 0
**Template**: `winback_miss_you`
**Channel**: Email
**Content**:
- "[Nome], ti manca [NomeCane]? Noi sì!"
- Novità prodotti/features dall'ultimo accesso
- CTA: "Torna su PiùCane" (deeplink app o web)

#### Day 7
**Condition**: Se no login dopo primo messaggio
**Template**: `winback_discount`
**Channel**: Email + Push
**Content**:
- "Torna da noi e ricevi 15% sul prossimo ordine"
- Sconto code: COMEBACK15
- CTA: "Riscatta il tuo sconto"

#### Day 14
**Condition**: Se ancora no login
**Template**: `winback_survey`
**Channel**: Email
**Content**:
- "Cosa possiamo migliorare? Aiutaci con 2 minuti"
- Link a survey Google Forms / Typeform
- Incentivo: 10€ voucher per chi completa survey

#### Day 21
**Condition**: Se ancora no login
**Template**: `winback_final`
**Channel**: Email
**Content**:
- "Ultimo promemoria: il tuo sconto scade domani"
- Offerta finale: 20% + spedizione gratis
- CTA: "Non perdere questa occasione"

### Success Criteria
- Utente fa **login** → journey success, exit
- Utente fa **ordine** → journey success, exit + trigger "re-activated" event

### Failure
- Nessun login entro 21 giorni → mark "failed", move to "lost customers" segment

---

## Journey 3: Subscription Renewal Reminder

**Trigger**: `subscriptions.nextShipAt` - 7 giorni

**Obiettivo**: Reminder prossima consegna, offrire modifiche, ridurre churn

**Durata**: 7 giorni

### Steps

#### Day -7 (7 giorni prima)
**Template**: `subscription_renewal_reminder`
**Channel**: Email + Push
**Content**:
- "Il tuo ordine per [NomeCane] arriva tra 7 giorni!"
- Dettagli ordine (prodotti, quantità, data)
- CTA: "Modifica data/indirizzo" (se necessario)

#### Day -3 (3 giorni prima)
**Template**: `subscription_last_chance_modify`
**Channel**: Push
**Content**:
- "Ultima possibilità per modificare l'ordine di [NomeCane]"
- CTA: App deeplink `/subscriptions/[id]/edit`

#### Day 0 (Giorno spedizione)
**Template**: `subscription_shipped`
**Channel**: Email + In-app
**Content**:
- "Il tuo ordine è in viaggio! 📦"
- Tracking number + link corriere
- CTA: "Traccia la spedizione"

### Exit Conditions
- Abbonamento **cancellato** → stop journey
- Utente **modifica data** consegna → reschedule journey per nuova data

---

## Journey 4: Birthday Dog Campaign

**Trigger**: `dogs[].birthDate` anniversary - 7 giorni

**Obiettivo**: Auguri compleanno cane + incentivo ordine special treat

**Durata**: 14 giorni

### Steps

#### Day -7
**Template**: `dog_birthday_reminder`
**Channel**: Email
**Content**:
- "Il compleanno di [NomeCane] è tra 7 giorni! 🎉"
- Suggerimenti regalo (snack premium, giochi)
- CTA: "Scopri regali compleanno"

#### Day 0
**Template**: `dog_birthday_wishes`
**Channel**: Email + Push + In-app
**Content**:
- "Buon compleanno [NomeCane]! 🎂🐕"
- Sconto speciale 25% prodotti birthday (snack, giochi)
- Badge speciale "Birthday Pup" nell'app
- CTA: "Festeggia con PiùCane"

#### Day +7
**Condition**: Se no ordine birthday products
**Template**: `dog_birthday_last_chance`
**Channel**: Email
**Content**:
- "Ultima settimana sconto compleanno [NomeCane]"
- Sconto esteso a 20%
- CTA: "Riscatta ora"

### Personalization
- Età cane dinamica: "Oggi [NomeCane] compie [X] anni!"
- Product recs basate su età (es. senior dog → joint supplements)

---

## Journey 5: Subscription Cancellation (Save)

**Trigger**: `subscription.cancellation_requested`

**Obiettivo**: Ridurre churn, offrire alternative, raccogliere feedback

**Durata**: 3 giorni

### Steps

#### Day 0 (Immediate)
**Template**: `subscription_cancel_save`
**Channel**: Email + In-app modal
**Content**:
- "Ci dispiace che tu voglia andare via 😢"
- Survey: "Perché vuoi cancellare?" (prezzo, qualità, quantità, etc.)
- Offerte retention:
  - 🎁 Pausa abbonamento 30/60/90 giorni
  - 💰 Sconto 20% prossimi 3 mesi
  - 📦 Cambia frequenza consegna (più/meno frequente)
  - 🔄 Cambia prodotto
- CTA: "Rimani con noi" vs "Procedi con cancellazione"

#### Day 1
**Condition**: Se non risposto a survey
**Template**: `subscription_cancel_survey`
**Channel**: Email
**Content**:
- "Aiutaci a migliorare: 2 minuti di feedback"
- Link survey dettagliato
- Incentivo: 15€ voucher per prossimo ordine (anche se cancellato)

#### Day 3
**Condition**: Se cancellazione confermata
**Template**: `subscription_cancelled_final`
**Channel**: Email
**Content**:
- "Cancellazione confermata. Speriamo di rivederti presto!"
- Recap servizio (ordini consegnati, risparmio totale)
- Offerta "Re-activate anytime" (no re-enroll fee)
- CTA: "Potremmo rimanere amici?" (follow social)

### Success Metric
- **Save rate**: % abbonamenti salvati (non cancellati dopo journey)
- Target: >30%

---

## Journey Builder (Admin)

**Path**: `/apps/admin/src/modules/crm/journey-builder/`

### Visual Editor Features
- [ ] **Drag & drop** step builder (canvas Flowchart)
- [ ] **Step types**: Email, Push, Wait, Condition, Exit, Webhook
- [ ] **Branching logic**: If/Then/Else con visual branches
- [ ] **Template selector**: Dropdown template disponibili
- [ ] **Delay config**: Minutes/Hours/Days con calendar picker
- [ ] **Preview mode**: Simulate journey per test user
- [ ] **Version control**: Draft vs Published, rollback versioni
- [ ] **A/B testing**: Variant creation per split test

### Interface
```ts
interface JourneyStep {
  id: string;
  type: 'message' | 'wait' | 'condition' | 'exit' | 'webhook';
  delay?: number; // seconds
  templateKey?: string;
  channel?: 'email' | 'push' | 'whatsapp' | 'inapp' | 'auto';
  condition?: {
    field: string;
    operator: string;
    value: any;
  };
  branches?: {
    true: JourneyStep[];
    false: JourneyStep[];
  };
}

interface Journey {
  id: string;
  name: string;
  description: string;
  trigger: {
    event: string; // 'user.created', 'subscription.cancelled', etc.
    filters?: any;
  };
  steps: JourneyStep[];
  status: 'draft' | 'active' | 'paused' | 'archived';
  version: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## Processing Engine

**Cloud Scheduler**: `*/15 * * * *` (ogni 15 minuti)

**Process**:
```ts
// api/src/jobs/journey-processor.ts
export async function processJourneySteps() {
  const now = Date.now();

  // Get enrollments con next step schedulato <= now
  const dueEnrollments = await db.collection('journeyEnrollments')
    .where('nextStepAt', '<=', now)
    .where('status', '==', 'active')
    .get();

  for (const enrollment of dueEnrollments) {
    const journey = await getJourney(enrollment.journeyId);
    const step = journey.steps[enrollment.currentStep];

    // Execute step
    if (step.type === 'message') {
      await sendMessage({
        uid: enrollment.uid,
        templateKey: step.templateKey,
        channel: step.channel || 'auto'
      });
    } else if (step.type === 'condition') {
      const conditionMet = await evaluateCondition(step.condition, enrollment.uid);
      const nextSteps = conditionMet ? step.branches.true : step.branches.false;
      // Continue with branch...
    }

    // Update enrollment
    await updateEnrollment(enrollment.id, {
      currentStep: enrollment.currentStep + 1,
      nextStepAt: now + (step.delay || 0) * 1000,
      lastProcessedAt: now
    });

    // Check completion
    if (enrollment.currentStep + 1 >= journey.steps.length) {
      await completeJourney(enrollment.id);
    }
  }
}
```

---

## Testing Journeys

### Manual Testing (Admin)
1. **Journey Builder** → Create test journey
2. **Select test user** (dev account)
3. **Trigger manually** (button "Enroll test user")
4. **Fast-forward time** (admin panel: "Process next step immediately")
5. **Verify**: Inbox messages, email sent, push received

### Automated Testing
```ts
// tests/integration/journeys/onboarding.spec.ts
describe('Onboarding Journey', () => {
  it('should send welcome email immediately', async () => {
    const uid = 'test-user-123';
    await triggerEvent('user.created', { uid });

    // Check enrollment
    const enrollment = await getEnrollment(uid, 'onboarding-30d');
    expect(enrollment).toBeDefined();

    // Check message sent
    const messages = await getInboxMessages(uid);
    expect(messages[0].templateKey).toBe('onboarding_welcome');
  });

  it('should complete full journey in 30 days', async () => {
    const uid = 'test-user-456';
    await enrollInJourney(uid, 'onboarding-30d');

    // Fast-forward 30 days (mock time)
    for (let day = 0; day <= 30; day++) {
      await advanceTime(86400); // +1 day
      await processJourneySteps();
    }

    const enrollment = await getEnrollment(uid, 'onboarding-30d');
    expect(enrollment.status).toBe('completed');
  });
});
```

---

## Analytics Dashboard

**Metrics per Journey**:
- **Active enrollments**: Utenti attualmente nel journey
- **Completion rate**: % utenti che completano journey
- **Drop-off funnel**: % utenti che escono a ogni step
- **Conversion rate**: % utenti che raggiungono obiettivo (es. primo ordine)
- **Revenue attributed**: Revenue totale generato da journey

**Visualization**:
- Funnel chart (enrollments → step 1 → step 2 → ... → completed)
- Line chart (enrollments over time)
- Heatmap (drop-off per step)

---

## Best Practices

### Timing
- ⏰ **Respect quiet hours**: No push/email 22:00-08:00 (timezone utente)
- 📅 **Weekday preference**: Email marketing meglio Tue-Thu (higher open rate)
- 🚫 **Rate limiting**: Max 1 message/giorno per journey

### Content
- 🎯 **Personalization**: Nome utente + nome cane sempre
- 💬 **Tone of voice**: Friendly, conversational, empatico
- 📱 **Mobile-first**: 80% utenti aprono email su mobile
- ✅ **Clear CTA**: Single primary action per message

### Optimization
- 🧪 **A/B testing**: Test subject lines, CTA copy, send times
- 📊 **Monitor metrics**: Weekly review open/click/conversion rates
- 🔄 **Iterate**: Rimuovi step con basso engagement, aggiungi step high-performing

---

## Resources
- [Lifecycle Marketing Guide](https://www.klaviyo.com/marketing-resources/lifecycle-marketing-guide)
- [Email Automation Best Practices](https://www.mailchimp.com/resources/email-automation-best-practices/)
- [Customer Journey Mapping](https://www.nngroup.com/articles/customer-journey-mapping/)