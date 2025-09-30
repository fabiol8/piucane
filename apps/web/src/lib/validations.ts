/**
 * Validation schemas and utility functions using Zod
 */

import { z } from 'zod';

// Common field validations
export const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 format
export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const pecRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.pec\.it$/;
export const italianVatRegex = /^IT[0-9]{11}$/;
export const italianTaxCodeRegex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
export const postalCodeRegex = /^[0-9]{5}$/;

// Base types
export const dogBreeds = [
  'Labrador Retriever', 'Golden Retriever', 'Pastore Tedesco', 'Bulldog Francese',
  'Beagle', 'Border Collie', 'Yorkshire Terrier', 'Chihuahua', 'Boxer', 'Rottweiler',
  'Siberian Husky', 'Dalmata', 'Shih Tzu', 'Boston Terrier', 'Pomerania',
  'Australian Shepherd', 'Dobermann', 'Schnauzer', 'Cocker Spaniel', 'Meticcio'
] as const;

export const allergens = [
  'chicken', 'beef', 'pork', 'lamb', 'fish', 'dairy', 'eggs', 'wheat', 'corn',
  'soy', 'rice', 'carrots', 'potatoes', 'peas', 'environmental_dust',
  'environmental_pollen', 'environmental_mites'
] as const;

export const healthConditions = [
  'dermatitis', 'joint_issues', 'kidney_disease', 'gastrointestinal',
  'diabetes', 'heart_condition', 'allergies', 'anxiety', 'none'
] as const;

// User validations
export const userProfileSchema = z.object({
  firstName: z.string().min(2, 'Nome troppo breve').max(50, 'Nome troppo lungo'),
  lastName: z.string().min(2, 'Cognome troppo breve').max(50, 'Cognome troppo lungo'),
  email: z.string().regex(emailRegex, 'Email non valida'),
  phone: z.string().regex(phoneRegex, 'Telefono non valido').optional(),
  locale: z.enum(['it-IT', 'en-US']).default('it-IT'),
  timezone: z.string().default('Europe/Rome'),
});

export const notificationPrefsSchema = z.object({
  channels: z.object({
    email: z.boolean(),
    push: z.boolean(),
    whatsapp: z.boolean(),
    sms: z.boolean(),
  }),
  categories: z.object({
    orders: z.boolean(),
    health: z.boolean(),
    missions: z.boolean(),
    promos: z.boolean(),
  }),
  quietHours: z.object({
    start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato ora non valido'),
    end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato ora non valido'),
    timezone: z.string(),
  }),
});

export const consentSchema = z.object({
  marketing: z.boolean(),
  transactional: z.boolean(),
  profiling: z.boolean(),
  aiTraining: z.boolean(),
  policyVersion: z.string(),
  timestamp: z.number(),
});

// Address validations
export const addressSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, 'Etichetta richiesta').max(30, 'Etichetta troppo lunga'),
  recipient: z.string().min(2, 'Nome destinatario richiesto').max(100, 'Nome troppo lungo'),
  street: z.string().min(5, 'Indirizzo troppo breve').max(200, 'Indirizzo troppo lungo'),
  zip: z.string().regex(postalCodeRegex, 'CAP non valido'),
  city: z.string().min(2, 'Città richiesta').max(100, 'Nome città troppo lungo'),
  region: z.string().min(2, 'Provincia richiesta').max(50, 'Nome provincia troppo lungo'),
  country: z.string().default('IT'),
  phone: z.string().regex(phoneRegex, 'Telefono non valido').optional(),
  isDefault: z.boolean().default(false),
});

export const billingSchema = z.object({
  name: z.string().min(2, 'Nome richiesto').max(100, 'Nome troppo lungo'),
  vatId: z.string().regex(italianVatRegex, 'P.IVA non valida').optional(),
  taxCode: z.string().regex(italianTaxCodeRegex, 'Codice fiscale non valido').optional(),
  pec: z.string().regex(pecRegex, 'PEC non valida').optional(),
  sdi: z.string().length(7, 'Codice SDI deve essere di 7 caratteri').optional(),
  street: z.string().min(5, 'Indirizzo richiesto').max(200, 'Indirizzo troppo lungo'),
  zip: z.string().regex(postalCodeRegex, 'CAP non valido'),
  city: z.string().min(2, 'Città richiesta').max(100, 'Nome città troppo lungo'),
  region: z.string().min(2, 'Provincia richiesta').max(50, 'Nome provincia troppo lungo'),
  country: z.string().default('IT'),
});

export const billingInfoSchema = z.object({
  type: z.enum(['personal', 'business']),
  firstName: z.string().min(2, 'Nome troppo breve').max(50, 'Nome troppo lungo').optional(),
  lastName: z.string().min(2, 'Cognome troppo breve').max(50, 'Cognome troppo lungo').optional(),
  companyName: z.string().min(2, 'Ragione sociale troppo breve').max(200, 'Ragione sociale troppo lunga').optional(),
  vatNumber: z.string().regex(italianVatRegex, 'P.IVA non valida').optional(),
  taxCode: z.string().regex(italianTaxCodeRegex, 'Codice fiscale non valido'),
  pecEmail: z.string().regex(pecRegex, 'Email PEC non valida').optional(),
  sdiCode: z.string().length(7, 'Codice SDI deve essere 7 caratteri').toUpperCase().optional(),
  address: z.object({
    street: z.string().min(5, 'Indirizzo troppo breve').max(200, 'Indirizzo troppo lungo'),
    city: z.string().min(2, 'Città troppo breve').max(100, 'Città troppo lunga'),
    state: z.string().length(2, 'Provincia deve essere 2 caratteri').toUpperCase(),
    postalCode: z.string().regex(postalCodeRegex, 'CAP non valido'),
    country: z.string().length(2, 'Codice paese non valido').default('IT'),
  }),
  invoiceFormat: z.enum(['pdf', 'xml']).default('pdf'),
  autoInvoicing: z.boolean().default(true),
}).superRefine((data, ctx) => {
  if (data.type === 'personal') {
    if (!data.firstName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Nome richiesto per persona fisica',
        path: ['firstName'],
      });
    }
    if (!data.lastName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Cognome richiesto per persona fisica',
        path: ['lastName'],
      });
    }
  } else if (data.type === 'business') {
    if (!data.companyName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ragione sociale richiesta per azienda',
        path: ['companyName'],
      });
    }
    if (!data.vatNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'P.IVA richiesta per azienda',
        path: ['vatNumber'],
      });
    }
  }

  // PEC or SDI code required for business electronic invoicing
  if (data.type === 'business' && data.invoiceFormat === 'xml') {
    if (!data.pecEmail && !data.sdiCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Email PEC o Codice SDI richiesto per fatturazione elettronica',
        path: ['pecEmail'],
      });
    }
  }
});

// Dog validations
export const dogProfileSchema = z.object({
  name: z.string().min(2, 'Nome troppo breve').max(30, 'Nome troppo lungo'),
  breed: z.enum(dogBreeds, { errorMap: () => ({ message: 'Razza non valida' }) }),
  isMixed: z.boolean().default(false),
  birthDate: z.date().max(new Date(), 'Data di nascita non può essere futura'),
  sex: z.enum(['male', 'female'], { errorMap: () => ({ message: 'Sesso richiesto' }) }),
  neutered: z.boolean(),
  weightKg: z.number().min(0.5, 'Peso minimo 0.5kg').max(120, 'Peso massimo 120kg'),
  bcs: z.number().int().min(1, 'BCS minimo 1').max(5, 'BCS massimo 5'),
  health: z.object({
    conditions: z.array(z.enum(healthConditions)).default([]),
    notes: z.string().max(500, 'Note troppo lunghe').optional(),
  }),
  allergies: z.object({
    food: z.array(z.enum(allergens)).default([]),
    environmental: z.array(z.enum(allergens)).default([]),
  }),
  habits: z.object({
    mealsPerDay: z.number().int().min(1, 'Minimo 1 pasto').max(5, 'Massimo 5 pasti'),
    walkFrequency: z.enum(['daily', 'twice_daily', 'multiple_daily', 'few_times_week']),
    activityLevel: z.enum(['low', 'moderate', 'high']),
  }),
  photos: z.array(z.string().url()).max(10, 'Massimo 10 foto').default([]),
});

// Vaccine validations
export const vaccineTypes = [
  'core_puppy', 'core_adult', 'rabies', 'kennel_cough', 'lyme', 'leptospirosis',
  'parainfluenza', 'coronavirus', 'giardia'
] as const;

export const vaccineSchema = z.object({
  type: z.enum(vaccineTypes),
  lastDate: z.date().optional(),
  nextDue: z.date().optional(),
  veterinarianId: z.string().optional(),
  notes: z.string().max(300, 'Note troppo lunghe').optional(),
});

// Vet validations
export const vetSchema = z.object({
  name: z.string().min(2, 'Nome richiesto').max(100, 'Nome troppo lungo'),
  clinicName: z.string().min(2, 'Nome clinica richiesto').max(100, 'Nome troppo lungo'),
  phone: z.string().regex(phoneRegex, 'Telefono non valido'),
  email: z.string().regex(emailRegex, 'Email non valida').optional(),
  address: z.string().min(5, 'Indirizzo richiesto').max(200, 'Indirizzo troppo lungo'),
  city: z.string().min(2, 'Città richiesta').max(100, 'Nome città troppo lungo'),
  specialties: z.array(z.string()).default([]),
});

export const dogVetLinkSchema = z.object({
  dogId: z.string(),
  vetId: z.string(),
  role: z.enum(['primary', 'specialist', 'emergency']),
  notes: z.string().max(300, 'Note troppo lunghe').optional(),
});

// Subscription validations
export const subscriptionSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().min(1),
    cadenceDays: z.number().int().min(7).max(90),
    priceType: z.enum(['full', 'subscription']),
  })),
  shippingAddressId: z.string(),
  paymentMethodId: z.string(),
});

export const subscriptionUpdateSchema = z.object({
  nextShipAt: z.date().min(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), 'Data minima T+3'),
  shippingOverride: z.object({
    addressId: z.string(),
    oneTime: z.boolean().default(true),
  }).optional(),
});

// Reminder validations
export const reminderTypes = ['meal', 'supplement', 'vaccine', 'parasite', 'walk', 'vet_visit'] as const;
export const reminderChannels = ['push', 'email', 'whatsapp', 'sms'] as const;

export const reminderSchema = z.object({
  dogId: z.string(),
  type: z.enum(reminderTypes),
  title: z.string().min(1, 'Titolo richiesto').max(100, 'Titolo troppo lungo'),
  description: z.string().max(300, 'Descrizione troppo lunga').optional(),
  dueAt: z.date(),
  repeat: z.object({
    enabled: z.boolean(),
    interval: z.enum(['daily', 'weekly', 'monthly', 'custom']),
    customDays: z.number().int().min(1).optional(),
  }).optional(),
  channel: z.enum(reminderChannels),
  enabled: z.boolean().default(true),
});

// Chat validations
export const chatMessageSchema = z.object({
  text: z.string().min(1, 'Messaggio richiesto').max(2000, 'Messaggio troppo lungo'),
  attachments: z.array(z.object({
    type: z.enum(['image', 'document']),
    url: z.string().url(),
    name: z.string(),
    size: z.number(),
  })).max(5, 'Massimo 5 allegati').default([]),
});

// Onboarding validations
export const onboardingStepSchema = z.object({
  step: z.number().int().min(1).max(7),
  data: z.record(z.any()),
  completed: z.boolean().default(false),
});

// Order issue validations
export const orderIssueSchema = z.object({
  type: z.enum(['delivery_late', 'package_damaged', 'wrong_product', 'missing_items', 'quality_issue', 'other']),
  description: z.string().min(10, 'Descrizione troppo breve').max(1000, 'Descrizione troppo lunga'),
  photos: z.array(z.string().url()).max(5, 'Massimo 5 foto').default([]),
  requestRefund: z.boolean().default(false),
  requestReplacement: z.boolean().default(false),
});

// Validation utility functions
export const validateAge = (birthDate: Date): string | null => {
  const now = new Date();
  const ageInMonths = (now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);

  if (ageInMonths < 0) return 'Data di nascita non può essere futura';
  if (ageInMonths > 300) return 'Età non realistica per un cane';

  return null;
};

export const validateWeightChange = (currentWeight: number, previousWeight: number, daysSinceLast: number): string | null => {
  if (daysSinceLast < 1) return null;

  const percentageChange = Math.abs((currentWeight - previousWeight) / previousWeight) * 100;
  const changePerMonth = (percentageChange / daysSinceLast) * 30;

  if (changePerMonth > 20) {
    return 'Variazione di peso significativa. Consulta il veterinario.';
  }

  return null;
};

export const validateQuietHours = (start: string, end: string): string | null => {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);

  if (startMinutes === endMinutes) {
    return 'Orario di inizio e fine non possono essere uguali';
  }

  // Allow overnight quiet hours (e.g., 22:00 to 08:00)
  return null;
};

export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export const normalizeAllergens = (allergens: string[]): string[] => {
  return allergens
    .map(a => a.toLowerCase().trim())
    .filter((a, index, self) => self.indexOf(a) === index) // Remove duplicates
    .filter(a => allergens.includes(a as any)); // Ensure valid allergens
};

export const computeCadenceDays = (dogWeightKg: number, productSizeGrams: number, dailyDosePerKg: number): number => {
  const dailyDoseGrams = dogWeightKg * dailyDosePerKg;
  const daysFromBag = productSizeGrams / dailyDoseGrams;
  const daysWithBuffer = daysFromBag * 0.9; // 10% buffer

  // Round to standard cadences: 7, 14, 21, 28, 35, 42, 56, 70, 84 days
  const standardCadences = [7, 14, 21, 28, 35, 42, 56, 70, 84];

  return standardCadences.find(cadence => cadence >= daysWithBuffer) || 84;
};

// Export types
export type UserProfile = z.infer<typeof userProfileSchema>;
export type NotificationPrefs = z.infer<typeof notificationPrefsSchema>;
export type Consent = z.infer<typeof consentSchema>;
export type Address = z.infer<typeof addressSchema>;
export type Billing = z.infer<typeof billingSchema>;
export type DogProfile = z.infer<typeof dogProfileSchema>;
export type Vaccine = z.infer<typeof vaccineSchema>;
export type Vet = z.infer<typeof vetSchema>;
export type DogVetLink = z.infer<typeof dogVetLinkSchema>;
export type Subscription = z.infer<typeof subscriptionSchema>;
export type SubscriptionUpdate = z.infer<typeof subscriptionUpdateSchema>;
export type Reminder = z.infer<typeof reminderSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type OnboardingStep = z.infer<typeof onboardingStepSchema>;
export type OrderIssue = z.infer<typeof orderIssueSchema>;