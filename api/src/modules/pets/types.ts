/**
 * Pet Service Types & Validation Schemas
 * Comprehensive type definitions for pet management, health tracking, and veterinary care
 */

import { z } from 'zod';

// ===============================
// Core Pet Profile Types
// ===============================

export const PetProfileSchema = z.object({
  id: z.string().uuid('ID deve essere un UUID valido').optional(),
  userId: z.string().uuid('User ID deve essere un UUID valido'),
  name: z.string().min(1, 'Nome è obbligatorio').max(50, 'Nome troppo lungo'),
  breed: z.string().min(1, 'Razza è obbligatoria').max(100),
  isMongrel: z.boolean().default(false),
  gender: z.enum(['maschio', 'femmina'], {
    errorMap: () => ({ message: 'Genere deve essere maschio o femmina' })
  }),
  isNeutered: z.boolean().default(false),
  birthDate: z.string().refine(date => !isNaN(Date.parse(date)), {
    message: 'Data di nascita non valida'
  }),
  weight: z.object({
    current: z.number().min(0.1, 'Peso deve essere positivo').max(200, 'Peso troppo alto'),
    idealMin: z.number().min(0.1).max(200),
    idealMax: z.number().min(0.1).max(200),
    history: z.array(z.object({
      id: z.string().uuid(),
      weight: z.number().min(0.1).max(200),
      date: z.string(),
      notes: z.string().optional()
    })).default([])
  }),
  bodyConditionScore: z.number().min(1).max(9).default(5),
  microchipId: z.string().optional(),
  photos: z.array(z.object({
    id: z.string().uuid(),
    url: z.string().url(),
    thumbnail: z.string().url(),
    caption: z.string().optional(),
    tags: z.array(z.string()).default([]),
    isProfilePicture: z.boolean().default(false),
    createdAt: z.string()
  })).default([]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
}).refine(data => data.weight.idealMin <= data.weight.idealMax, {
  message: 'Peso ideale minimo deve essere minore o uguale al massimo',
  path: ['weight']
});

export const CreatePetSchema = PetProfileSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const UpdatePetSchema = PetProfileSchema.partial().omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true
});

// ===============================
// Health Management Types
// ===============================

export const HealthConditionSchema = z.object({
  id: z.string().uuid().optional(),
  dogId: z.string().uuid('Dog ID deve essere un UUID valido'),
  category: z.enum([
    'dermatologica',
    'articolare',
    'gastrointestinale',
    'renale',
    'cardiaca',
    'neurologica',
    'oftalmologica',
    'respiratoria',
    'altro'
  ]),
  name: z.string().min(1, 'Nome condizione obbligatorio').max(200),
  description: z.string().max(1000).optional(),
  severity: z.enum(['lieve', 'moderata', 'grave'], {
    errorMap: () => ({ message: 'Severità deve essere lieve, moderata o grave' })
  }),
  diagnosedDate: z.string().optional(),
  isActive: z.boolean().default(true),
  veterinarianNotes: z.string().max(2000).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export const CreateHealthConditionSchema = HealthConditionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// ===============================
// Allergy Management Types
// ===============================

export const FoodAllergySchema = z.object({
  id: z.string().uuid().optional(),
  dogId: z.string().uuid('Dog ID deve essere un UUID valido'),
  ingredient: z.string().min(1, 'Ingrediente obbligatorio').max(100),
  category: z.enum(['proteina', 'cereale', 'verdura', 'frutta', 'additivo', 'altro']),
  severity: z.enum(['lieve', 'moderata', 'grave']),
  symptoms: z.array(z.string().max(200)).min(1, 'Almeno un sintomo richiesto'),
  diagnosedDate: z.string().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.string().optional()
});

export const EnvironmentalAllergySchema = z.object({
  id: z.string().uuid().optional(),
  dogId: z.string().uuid('Dog ID deve essere un UUID valido'),
  allergen: z.string().min(1, 'Allergene obbligatorio').max(100),
  category: z.enum(['polline', 'acari', 'polvere', 'muffa', 'erba', 'pelo', 'altro']),
  season: z.enum(['primavera', 'estate', 'autunno', 'inverno', 'tutto_anno']).optional(),
  symptoms: z.array(z.string().max(200)).min(1, 'Almeno un sintomo richiesto'),
  severity: z.enum(['lieve', 'moderata', 'grave']),
  isActive: z.boolean().default(true),
  createdAt: z.string().optional()
});

// ===============================
// Vaccination Management Types
// ===============================

export const VaccinationSchema = z.object({
  id: z.string().uuid().optional(),
  dogId: z.string().uuid('Dog ID deve essere un UUID valido'),
  name: z.string().min(1, 'Nome vaccino obbligatorio').max(200),
  type: z.enum(['core', 'non_core', 'obbligatorio', 'raccomandato']),
  lastDate: z.string().optional(),
  nextDue: z.string().optional(),
  veterinarian: z.string().max(200).optional(),
  batchNumber: z.string().max(100).optional(),
  isCompleted: z.boolean().default(false),
  notes: z.string().max(1000).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export const CreateVaccinationSchema = VaccinationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// ===============================
// Veterinarian Management Types
// ===============================

export const VeterinarianSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Nome veterinario obbligatorio').max(200),
  clinic: z.string().min(1, 'Nome clinica obbligatorio').max(200),
  specialization: z.array(z.string().max(100)).default([]),
  phone: z.string().min(8, 'Numero telefono non valido').max(20),
  email: z.string().email().optional(),
  address: z.object({
    street: z.string().min(1, 'Via obbligatoria').max(200),
    city: z.string().min(1, 'Città obbligatoria').max(100),
    province: z.string().min(2, 'Provincia obbligatoria').max(50),
    zipCode: z.string().min(5, 'CAP non valido').max(10),
    coordinates: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180)
    }).optional()
  }),
  website: z.string().url().optional(),
  isPrimary: z.boolean().default(false),
  notes: z.string().max(1000).optional(),
  createdAt: z.string().optional()
});

export const DogVeterinarianSchema = z.object({
  id: z.string().uuid().optional(),
  dogId: z.string().uuid('Dog ID deve essere un UUID valido'),
  veterinarianId: z.string().uuid('Veterinarian ID deve essere un UUID valido'),
  relationship: z.enum(['primario', 'specialista', 'emergenza']),
  firstVisitDate: z.string().optional(),
  lastVisitDate: z.string().optional(),
  notes: z.string().max(1000).optional(),
  createdAt: z.string().optional()
});

// ===============================
// Routine Management Types
// ===============================

export const PetRoutineSchema = z.object({
  id: z.string().uuid().optional(),
  dogId: z.string().uuid('Dog ID deve essere un UUID valido'),
  type: z.enum([
    'pappa',
    'passeggiata',
    'integratore',
    'farmaco',
    'toelettatura',
    'gioco',
    'controllo',
    'altro'
  ]),
  name: z.string().min(1, 'Nome routine obbligatorio').max(200),
  frequency: z.object({
    type: z.enum(['giornaliera', 'settimanale', 'mensile', 'personalizzata']),
    times: z.number().min(1, 'Frequenza deve essere almeno 1').max(50),
    days: z.array(z.string()).optional(),
    hours: z.array(z.string()).optional()
  }),
  notifications: z.object({
    push: z.boolean().default(true),
    email: z.boolean().default(false),
    whatsapp: z.boolean().default(false),
    reminderMinutes: z.number().min(1).max(1440).default(30)
  }),
  isActive: z.boolean().default(true),
  notes: z.string().max(1000).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

// ===============================
// Nutritional Management Types
// ===============================

export const NutritionalNeedsSchema = z.object({
  dogId: z.string().uuid('Dog ID deve essere un UUID valido'),
  dailyCalories: z.number().min(100, 'Calorie troppo basse').max(5000, 'Calorie troppo alte'),
  dailyAmount: z.object({
    dry: z.number().min(0).max(2000), // grams
    wet: z.number().min(0).max(2000)  // grams
  }),
  recommendedProducts: z.array(z.string().uuid()).default([]),
  supplementsNeeded: z.array(z.string()).default([]),
  allergensToAvoid: z.array(z.string()).default([]),
  notes: z.array(z.string()).default([])
});

// ===============================
// Analytics & CTA Constants
// ===============================

export const PET_SERVICE_EVENTS = {
  // Pet Profile Events
  PET_PROFILE_CREATED: 'pet_profile_created',
  PET_PROFILE_UPDATED: 'pet_profile_updated',
  PET_PROFILE_VIEWED: 'pet_profile_viewed',
  PET_PHOTO_UPLOADED: 'pet_photo_uploaded',
  PET_WEIGHT_UPDATED: 'pet_weight_updated',

  // Health Management Events
  HEALTH_CONDITION_ADDED: 'health_condition_added',
  HEALTH_CONDITION_UPDATED: 'health_condition_updated',
  ALLERGY_ADDED: 'pet_allergy_added',
  VACCINATION_SCHEDULED: 'vaccination_scheduled',
  VACCINATION_COMPLETED: 'vaccination_completed',

  // Veterinarian Events
  VETERINARIAN_ADDED: 'veterinarian_added',
  VETERINARIAN_ASSIGNED: 'veterinarian_assigned',
  VET_APPOINTMENT_SCHEDULED: 'vet_appointment_scheduled',

  // Routine Events
  ROUTINE_CREATED: 'pet_routine_created',
  ROUTINE_COMPLETED: 'pet_routine_completed',
  ROUTINE_SKIPPED: 'pet_routine_skipped',

  // Nutrition Events
  NUTRITION_CALCULATED: 'pet_nutrition_calculated',
  FOOD_RECOMMENDATION_VIEWED: 'food_recommendation_viewed'
} as const;

export const PET_SERVICE_CTA_IDS = {
  // Pet Profile CTA IDs
  PET_PROFILE_CREATE: 'pet.profile.create',
  PET_PROFILE_EDIT: 'pet.profile.edit',
  PET_PROFILE_SAVE: 'pet.profile.save',
  PET_PHOTO_UPLOAD: 'pet.photo.upload',
  PET_WEIGHT_ADD: 'pet.weight.add',
  PET_WEIGHT_UPDATE: 'pet.weight.update',

  // Health Management CTA IDs
  HEALTH_CONDITION_ADD: 'pet.health.condition.add',
  HEALTH_CONDITION_EDIT: 'pet.health.condition.edit',
  ALLERGY_ADD: 'pet.allergy.add',
  ALLERGY_EDIT: 'pet.allergy.edit',
  VACCINATION_ADD: 'pet.vaccination.add',
  VACCINATION_COMPLETE: 'pet.vaccination.complete',

  // Veterinarian CTA IDs
  VETERINARIAN_ADD: 'pet.veterinarian.add',
  VETERINARIAN_ASSIGN: 'pet.veterinarian.assign',
  VET_APPOINTMENT_SCHEDULE: 'pet.veterinarian.appointment.schedule',

  // Routine CTA IDs
  ROUTINE_CREATE: 'pet.routine.create',
  ROUTINE_EDIT: 'pet.routine.edit',
  ROUTINE_COMPLETE: 'pet.routine.complete',
  ROUTINE_SKIP: 'pet.routine.skip',

  // Nutrition CTA IDs
  NUTRITION_CALCULATE: 'pet.nutrition.calculate',
  FOOD_RECOMMENDATION_VIEW: 'pet.food.recommendation.view'
} as const;

// ===============================
// API Request/Response Types
// ===============================

export interface CreatePetRequest {
  pet: z.infer<typeof CreatePetSchema>;
}

export interface UpdatePetRequest {
  petId: string;
  updates: z.infer<typeof UpdatePetSchema>;
}

export interface PetHealthSummaryResponse {
  petId: string;
  healthStatus: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  activeConditions: number;
  pendingVaccinations: number;
  weightStatus: 'sottopeso' | 'peso_ideale' | 'sovrappeso' | 'obeso';
  lastCheckup: string | null;
  nextCheckup: string | null;
  healthScore: number; // 0-100
}

export interface PetAnalyticsData {
  petId: string;
  period: '7d' | '30d' | '90d' | '1y';
  weightTrend: 'increasing' | 'decreasing' | 'stable';
  routineCompletionRate: number; // 0-100
  vaccinationCompliance: number; // 0-100
  healthIncidents: number;
  vetVisits: number;
}

// ===============================
// Error Types
// ===============================

export interface PetServiceError {
  code: 'PET_NOT_FOUND' | 'UNAUTHORIZED_PET_ACCESS' | 'INVALID_WEIGHT_DATA' |
        'VACCINATION_CONFLICT' | 'HEALTH_CONDITION_EXISTS' | 'VETERINARIAN_NOT_FOUND';
  message: string;
  details?: Record<string, any>;
}

// ===============================
// Type Exports
// ===============================

export type PetProfile = z.infer<typeof PetProfileSchema>;
export type CreatePet = z.infer<typeof CreatePetSchema>;
export type UpdatePet = z.infer<typeof UpdatePetSchema>;
export type HealthCondition = z.infer<typeof HealthConditionSchema>;
export type FoodAllergy = z.infer<typeof FoodAllergySchema>;
export type EnvironmentalAllergy = z.infer<typeof EnvironmentalAllergySchema>;
export type Vaccination = z.infer<typeof VaccinationSchema>;
export type Veterinarian = z.infer<typeof VeterinarianSchema>;
export type DogVeterinarian = z.infer<typeof DogVeterinarianSchema>;
export type PetRoutine = z.infer<typeof PetRoutineSchema>;
export type NutritionalNeeds = z.infer<typeof NutritionalNeedsSchema>;