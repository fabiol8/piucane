# Onboarding & Dog Profile — Index
**Owner:** Product + Backend Team • **Ultimo aggiornamento:** 2025-09-29 • **Versione doc:** v1.0

## Scopo
Sistema onboarding utenti e creazione profilo cane completo: dati anagrafici, salute, preferenze alimentari, vaccini, veterinario.

## Contenuti
- [form-schema.md](./form-schema.md) — Schema form editabile da admin
- [vaccines.md](./vaccines.md) — Libretto vaccinale digitale

## Onboarding Flow

### User Journey
```
1. Registrazione (email/password o OAuth)
2. Welcome step: "Benvenuto in PiùCane!"
3. Aggiungi primo cane (form multi-step)
4. Completa profilo cane
5. Raccomandazioni prodotti personalizzate
6. CTA: Esplora shop / Attiva abbonamento
```

### Multi-Step Form
**Steps**:
1. **Anagrafica Base**: Nome, razza, età, sesso
2. **Caratteristiche Fisiche**: Peso, taglia, BCS (Body Condition Score)
3. **Salute**: Allergie, condizioni mediche, farmaci
4. **Stile di Vita**: Attività fisica, ambiente, socializzazione
5. **Alimentazione**: Preferenze, restrizioni, goal (weight loss/gain/maintenance)
6. **Veterinario**: Nome clinica, contatto
7. **Foto**: Upload foto profilo cane

## Dog Profile Schema

```ts
// dogs/{dogId}
interface DogProfile {
  id: string;
  userId: string;

  // Anagrafica
  name: string;
  breed: string; // da lista razze standard
  breedMix?: string[]; // se meticcio
  birthDate: Date;
  sex: 'male' | 'female';
  neutered: boolean;

  // Fisico
  weight: number; // kg
  size: 'small' | 'medium' | 'large'; // auto da breed + weight
  bodyConditionScore: number; // 1-9 (5 = ideale)
  coatType: 'short' | 'medium' | 'long' | 'curly' | 'hairless';
  coatColor: string;

  // Salute
  allergies: string[]; // es. ["pollo", "grano"]
  medicalConditions: string[]; // es. ["displasia anca", "diabete"]
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
  }>;

  // Stile vita
  activityLevel: 'low' | 'moderate' | 'high';
  environment: 'apartment' | 'house_with_yard' | 'farm';
  socialization: {
    withDogs: 'good' | 'cautious' | 'aggressive';
    withPeople: 'friendly' | 'shy' | 'fearful';
    withChildren: boolean;
  };

  // Alimentazione
  currentFood: {
    brand?: string;
    type: 'dry' | 'wet' | 'raw' | 'mixed';
    dailyAmount: number; // grammi
  };
  foodGoal: 'weight_loss' | 'weight_gain' | 'maintenance' | 'muscle_gain';
  dietRestrictions: string[]; // es. ["grain-free", "hypoallergenic"]

  // Veterinario
  veterinarian?: {
    clinicName: string;
    doctorName: string;
    phone: string;
    email: string;
    address: Address;
  };

  // Vaccini (vedi vaccines.md)
  vaccinationRecords: VaccinationRecord[];
  nextVaccinesDue: Array<{
    vaccine: string;
    dueDate: Date;
  }>;

  // Media
  profilePhoto?: string; // Firebase Storage URL
  photos: string[];

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isActive: boolean; // per soft delete
}
```

## Form Schema (Editable by Admin)

Vedi [form-schema.md](./form-schema.md) per dettagli completi.

### Dynamic Form Config
Form onboarding configurabile da backoffice admin per aggiungere/rimuovere campi senza deploy.

**Firestore**: `onboardingFormConfig/current`
```json
{
  "version": "1.2",
  "steps": [
    {
      "id": "step_1_basic",
      "title": "Informazioni di base",
      "fields": [
        {
          "id": "name",
          "label": "Nome del cane",
          "type": "text",
          "required": true,
          "validation": { "minLength": 2, "maxLength": 50 }
        },
        {
          "id": "breed",
          "label": "Razza",
          "type": "select",
          "required": true,
          "options": "breeds" // ref to breeds collection
        },
        {
          "id": "birthDate",
          "label": "Data di nascita",
          "type": "date",
          "required": true,
          "validation": { "maxDate": "today", "minDate": "1990-01-01" }
        }
      ]
    }
  ]
}
```

### Field Types Supported
- `text`: Input testo
- `textarea`: Multiline text
- `number`: Input numerico (con min/max)
- `select`: Dropdown (opzioni statiche o da collection)
- `multiselect`: Checkbox multipli
- `radio`: Radio buttons
- `date`: Date picker
- `file`: Upload file (foto)
- `slider`: Range slider (es. BCS 1-9)
- `autocomplete`: Typeahead (es. breed search)

## Breed Database

**Firestore**: `breeds/{breedId}`
```json
{
  "id": "labrador_retriever",
  "name": "Labrador Retriever",
  "nameIT": "Labrador Retriever",
  "group": "Sporting",
  "size": "large",
  "avgWeight": { "male": [29, 36], "female": [25, 32] },
  "lifespan": [10, 12],
  "temperament": ["friendly", "active", "outgoing"],
  "commonHealthIssues": ["hip dysplasia", "obesity"],
  "imageUrl": "https://..."
}
```

**Total breeds**: ~350 razze FCI riconosciute

## Vaccination Records

Vedi [vaccines.md](./vaccines.md) per schema completo.

### Vaccine Schema
```ts
interface VaccinationRecord {
  id: string;
  vaccineType: 'rabies' | 'dhpp' | 'bordetella' | 'leptospirosis' | 'lyme' | 'other';
  vaccineName: string; // brand/nome commerciale
  dateAdministered: Date;
  expiryDate?: Date;
  lotNumber?: string;
  veterinarianName: string;
  clinic: string;
  nextDueDate?: Date; // calculated based on vaccine protocol
  certificate?: string; // PDF/image URL
}
```

### Vaccine Protocol (Standard)
- **Rabbia**: Obbligatorio, rinnovo annuale o triennale
- **DHPP** (Cimurro, Epatite, Parvovirosi, Parainfluenza): Puppy 8/12/16 settimane, richiamo annuale
- **Leptospirosi**: Annuale
- **Bordetella**: 6-12 mesi (se cane socializza molto)

### Reminders
**Cloud Scheduler**: Giornaliero, verifica vaccini in scadenza entro 30 giorni → invia reminder.

```ts
// api/src/jobs/vaccine-reminders.ts
export async function sendVaccineReminders() {
  const thirtyDaysFromNow = addDays(new Date(), 30);

  const dueDogs = await db.collection('dogs')
    .where('nextVaccinesDue', 'array-contains', { dueDate: '<=', thirtyDaysFromNow })
    .get();

  for (const dog of dueDogs.docs) {
    const dogData = dog.data();
    await sendMessage({
      uid: dogData.userId,
      templateKey: 'vaccine_reminder',
      channel: 'email',
      data: {
        dogName: dogData.name,
        vaccines: dogData.nextVaccinesDue,
        veterinarian: dogData.veterinarian
      }
    });
  }
}
```

## Recommendations Engine

### After Onboarding
Utente vede **prodotti raccomandati** basati su profilo cane:

```ts
function getRecommendations(dog: DogProfile): Product[] {
  let products = [];

  // 1. Food recommendations
  const foodProducts = filterProducts({
    category: 'food',
    suitableFor: {
      ageGroup: getAgeGroup(dog.birthDate),
      size: dog.size,
      breed: dog.breed
    }
  });

  // 2. Apply dietary restrictions
  const filteredFood = foodProducts.filter(p => {
    if (dog.allergies.includes('chicken') && p.ingredients.includes('chicken')) {
      return false;
    }
    if (dog.dietRestrictions.includes('grain-free') && !p.isGrainFree) {
      return false;
    }
    return true;
  });

  // 3. Supplements based on medical conditions
  if (dog.medicalConditions.includes('joint issues')) {
    products.push(...getSupplements(['glucosamine', 'chondroitin']));
  }

  // 4. Grooming products based on coat
  if (dog.coatType === 'long') {
    products.push(...getGroomingProducts(['brush', 'detangler']));
  }

  return products;
}
```

## BCS (Body Condition Score)

### Visual Guide
```
1-3: Underweight (ribs very visible, no fat cover)
4-5: Ideal (ribs palpable, slight fat cover, visible waist)
6-7: Overweight (ribs hard to palpate, no waist definition)
8-9: Obese (heavy fat deposits, no ribs palpable)
```

### Impact on Recommendations
- BCS 1-3 → High-calorie food, weight gain goal
- BCS 4-5 → Maintenance food
- BCS 6-9 → Low-calorie food, weight loss goal, increase exercise suggestions

## Admin Features

**Path**: `/apps/admin/src/modules/onboarding/`

### Admin Functions
- [ ] Form builder (drag-drop fields, validation rules)
- [ ] Breed database manager (CRUD breeds)
- [ ] Vaccine protocol editor
- [ ] User onboarding analytics (completion rate, drop-off steps)

## Analytics & Tracking

### GA4 Events
```ts
// Onboarding started
trackEvent('onboarding_start', { step: 'welcome' });

// Step completed
trackEvent('onboarding_step_complete', { step: 'basic_info' });

// Dog profile created
trackEvent('dog_created', {
  dog_id: dog.id,
  breed: dog.breed,
  age_group: getAgeGroup(dog.birthDate),
  size: dog.size
});

// Onboarding completed
trackEvent('onboarding_complete', {
  duration_seconds: elapsed,
  steps_completed: 7
});
```

### Completion Rate Funnel
```
100% - Start onboarding
 85% - Complete step 1 (basic info)
 75% - Complete step 2 (physical)
 65% - Complete step 3 (health)
 60% - Complete step 4 (lifestyle)
 55% - Complete step 5 (food)
 50% - Complete step 6 (vet)
 45% - Complete step 7 (photo)
```

**Target**: >60% completion rate

## Testing

```ts
// tests/e2e/onboarding.spec.ts
test('complete dog profile onboarding', async ({ page }) => {
  await page.goto('/onboarding');

  // Step 1: Basic
  await page.fill('[name="name"]', 'Rex');
  await page.selectOption('[name="breed"]', 'labrador_retriever');
  await page.fill('[name="birthDate"]', '2022-03-15');
  await page.click('[data-testid="next-step"]');

  // Step 2: Physical
  await page.fill('[name="weight"]', '25');
  await page.click('[data-bcs="5"]'); // BCS slider
  await page.click('[data-testid="next-step"]');

  // ... continue all steps

  // Final step: Complete
  await page.click('[data-testid="complete-onboarding"]');

  // Verify redirect to dashboard with recommendations
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('[data-testid="recommendations"]')).toBeVisible();
});
```

## Resources
- [Dog Breeds Database (AKC)](https://www.akc.org/dog-breeds/)
- [BCS Visual Guide (WSAVA)](https://wsava.org/global-guidelines/body-condition-score/)
- [Vaccination Guidelines (AAHA)](https://www.aaha.org/aaha-guidelines/vaccination-canine/)