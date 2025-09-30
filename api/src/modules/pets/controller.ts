/**
 * Pet Service Controller
 * Comprehensive pet management, health tracking, and veterinary care
 */

import { Request, Response } from 'express';
import { auth, db } from '../../config/firebase';
import {
  CreatePetSchema,
  UpdatePetSchema,
  CreateHealthConditionSchema,
  FoodAllergySchema,
  EnvironmentalAllergySchema,
  CreateVaccinationSchema,
  VeterinarianSchema,
  DogVeterinarianSchema,
  PetRoutineSchema,
  NutritionalNeedsSchema,
  PET_SERVICE_EVENTS,
  PET_SERVICE_CTA_IDS,
  PetProfile,
  PetHealthSummaryResponse,
  PetAnalyticsData,
  PetServiceError
} from './types';
import { trackAnalyticsEvent } from '../../utils/analytics';

// Simple UUID generator
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ===============================
// Pet Profile Management
// ===============================

export const createPet = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }

    const validatedData = CreatePetSchema.parse(req.body);

    // Ensure userId matches authenticated user
    if (validatedData.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Non autorizzato a creare pets per questo utente' });
    }

    const petId = generateUUID();
    const now = new Date().toISOString();

    const petData: PetProfile = {
      ...validatedData,
      id: petId,
      createdAt: now,
      updatedAt: now
    };

    // Calculate age and nutritional needs
    const birthDate = new Date(validatedData.birthDate);
    const ageInMonths = Math.floor((Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));

    // Store pet profile
    await db.collection('pets').doc(petId).set(petData);

    // Calculate initial nutritional needs
    const nutritionalNeeds = await calculateNutritionalNeeds(petData);
    await db.collection('petNutrition').doc(petId).set(nutritionalNeeds);

    // Track analytics
    await trackAnalyticsEvent(userId, PET_SERVICE_EVENTS.PET_PROFILE_CREATED, {
      petId,
      breed: validatedData.breed,
      age_months: ageInMonths,
      weight_kg: validatedData.weight.current,
      cta_id: PET_SERVICE_CTA_IDS.PET_PROFILE_CREATE
    });

    res.status(201).json({
      success: true,
      pet: petData,
      nutritionalNeeds
    });

  } catch (error: any) {
    console.error('Pet creation failed:', error);

    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Dati non validi',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Errore durante la creazione del profilo pet'
    });
  }
};

export const getPetProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;
    const { petId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }

    const petDoc = await db.collection('pets').doc(petId).get();

    if (!petDoc.exists) {
      return res.status(404).json({ success: false, error: 'Pet non trovato' });
    }

    const petData = petDoc.data() as PetProfile;

    // Check ownership
    if (petData.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Non autorizzato ad accedere a questo pet' });
    }

    // Get health summary
    const healthSummary = await generateHealthSummary(petId);

    // Get nutritional needs
    const nutritionDoc = await db.collection('petNutrition').doc(petId).get();
    const nutritionalNeeds = nutritionDoc.exists ? nutritionDoc.data() : null;

    // Track analytics
    await trackAnalyticsEvent(userId, PET_SERVICE_EVENTS.PET_PROFILE_VIEWED, {
      petId,
      breed: petData.breed,
      health_status: healthSummary.healthStatus,
      cta_id: PET_SERVICE_CTA_IDS.PET_PROFILE_EDIT
    });

    res.json({
      success: true,
      pet: petData,
      healthSummary,
      nutritionalNeeds
    });

  } catch (error) {
    console.error('Get pet profile failed:', error);
    res.status(500).json({
      success: false,
      error: 'Errore nel recupero del profilo pet'
    });
  }
};

export const updatePetProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;
    const { petId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }

    const validatedUpdates = UpdatePetSchema.parse(req.body);

    const petDoc = await db.collection('pets').doc(petId).get();

    if (!petDoc.exists) {
      return res.status(404).json({ success: false, error: 'Pet non trovato' });
    }

    const petData = petDoc.data() as PetProfile;

    // Check ownership
    if (petData.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Non autorizzato a modificare questo pet' });
    }

    const now = new Date().toISOString();
    const updatedData = {
      ...validatedUpdates,
      updatedAt: now
    };

    // Update pet profile
    await db.collection('pets').doc(petId).update(updatedData);

    // If weight was updated, recalculate nutritional needs
    if (validatedUpdates.weight) {
      const newPetData = { ...petData, ...updatedData };
      const nutritionalNeeds = await calculateNutritionalNeeds(newPetData);
      await db.collection('petNutrition').doc(petId).update(nutritionalNeeds);

      // Track weight update
      await trackAnalyticsEvent(userId, PET_SERVICE_EVENTS.PET_WEIGHT_UPDATED, {
        petId,
        old_weight: petData.weight.current,
        new_weight: validatedUpdates.weight?.current,
        cta_id: PET_SERVICE_CTA_IDS.PET_WEIGHT_UPDATE
      });
    }

    // Track analytics
    await trackAnalyticsEvent(userId, PET_SERVICE_EVENTS.PET_PROFILE_UPDATED, {
      petId,
      fields_updated: Object.keys(validatedUpdates),
      cta_id: PET_SERVICE_CTA_IDS.PET_PROFILE_SAVE
    });

    res.json({
      success: true,
      message: 'Profilo pet aggiornato con successo'
    });

  } catch (error: any) {
    console.error('Pet update failed:', error);

    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Dati non validi',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Errore durante l\'aggiornamento del profilo pet'
    });
  }
};

export const getUserPets = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }

    const petsSnapshot = await db.collection('pets')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    const pets = petsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Get health summaries for all pets
    const petsWithHealth = await Promise.all(
      pets.map(async (pet) => {
        const healthSummary = await generateHealthSummary(pet.id);
        return {
          ...pet,
          healthSummary
        };
      })
    );

    res.json({
      success: true,
      pets: petsWithHealth
    });

  } catch (error) {
    console.error('Get user pets failed:', error);
    res.status(500).json({
      success: false,
      error: 'Errore nel recupero dei pets'
    });
  }
};

// ===============================
// Health Management
// ===============================

export const addHealthCondition = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;
    const { petId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }

    // Verify pet ownership
    const petDoc = await db.collection('pets').doc(petId).get();
    if (!petDoc.exists || petDoc.data()?.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Non autorizzato' });
    }

    const validatedData = CreateHealthConditionSchema.parse(req.body);

    if (validatedData.dogId !== petId) {
      return res.status(400).json({ success: false, error: 'Pet ID non corrispondente' });
    }

    const conditionId = generateUUID();
    const now = new Date().toISOString();

    const conditionData = {
      ...validatedData,
      id: conditionId,
      createdAt: now,
      updatedAt: now
    };

    await db.collection('petHealthConditions').doc(conditionId).set(conditionData);

    // Track analytics
    await trackAnalyticsEvent(userId, PET_SERVICE_EVENTS.HEALTH_CONDITION_ADDED, {
      petId,
      condition_category: validatedData.category,
      severity: validatedData.severity,
      cta_id: PET_SERVICE_CTA_IDS.HEALTH_CONDITION_ADD
    });

    res.status(201).json({
      success: true,
      condition: conditionData
    });

  } catch (error: any) {
    console.error('Add health condition failed:', error);

    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Dati non validi',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Errore durante l\'aggiunta della condizione di salute'
    });
  }
};

export const addAllergy = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;
    const { petId } = req.params;
    const { type } = req.query; // 'food' or 'environmental'

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }

    // Verify pet ownership
    const petDoc = await db.collection('pets').doc(petId).get();
    if (!petDoc.exists || petDoc.data()?.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Non autorizzato' });
    }

    let validatedData;
    let collection: string;

    if (type === 'food') {
      validatedData = FoodAllergySchema.parse(req.body);
      collection = 'petFoodAllergies';
    } else if (type === 'environmental') {
      validatedData = EnvironmentalAllergySchema.parse(req.body);
      collection = 'petEnvironmentalAllergies';
    } else {
      return res.status(400).json({ success: false, error: 'Tipo di allergia non valido' });
    }

    if (validatedData.dogId !== petId) {
      return res.status(400).json({ success: false, error: 'Pet ID non corrispondente' });
    }

    const allergyId = generateUUID();
    const now = new Date().toISOString();

    const allergyData = {
      ...validatedData,
      id: allergyId,
      createdAt: now
    };

    await db.collection(collection).doc(allergyId).set(allergyData);

    // Track analytics
    await trackAnalyticsEvent(userId, PET_SERVICE_EVENTS.ALLERGY_ADDED, {
      petId,
      allergy_type: type,
      category: validatedData.category,
      severity: validatedData.severity,
      cta_id: PET_SERVICE_CTA_IDS.ALLERGY_ADD
    });

    res.status(201).json({
      success: true,
      allergy: allergyData
    });

  } catch (error: any) {
    console.error('Add allergy failed:', error);

    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Dati non validi',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Errore durante l\'aggiunta dell\'allergia'
    });
  }
};

export const addVaccination = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;
    const { petId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }

    // Verify pet ownership
    const petDoc = await db.collection('pets').doc(petId).get();
    if (!petDoc.exists || petDoc.data()?.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Non autorizzato' });
    }

    const validatedData = CreateVaccinationSchema.parse(req.body);

    if (validatedData.dogId !== petId) {
      return res.status(400).json({ success: false, error: 'Pet ID non corrispondente' });
    }

    const vaccinationId = generateUUID();
    const now = new Date().toISOString();

    const vaccinationData = {
      ...validatedData,
      id: vaccinationId,
      createdAt: now,
      updatedAt: now
    };

    await db.collection('petVaccinations').doc(vaccinationId).set(vaccinationData);

    // Track analytics
    const eventType = validatedData.isCompleted
      ? PET_SERVICE_EVENTS.VACCINATION_COMPLETED
      : PET_SERVICE_EVENTS.VACCINATION_SCHEDULED;

    await trackAnalyticsEvent(userId, eventType, {
      petId,
      vaccination_name: validatedData.name,
      vaccination_type: validatedData.type,
      is_completed: validatedData.isCompleted,
      cta_id: validatedData.isCompleted
        ? PET_SERVICE_CTA_IDS.VACCINATION_COMPLETE
        : PET_SERVICE_CTA_IDS.VACCINATION_ADD
    });

    res.status(201).json({
      success: true,
      vaccination: vaccinationData
    });

  } catch (error: any) {
    console.error('Add vaccination failed:', error);

    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Dati non validi',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Errore durante l\'aggiunta della vaccinazione'
    });
  }
};

// ===============================
// Veterinarian Management
// ===============================

export const addVeterinarian = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }

    const validatedData = VeterinarianSchema.parse(req.body);

    const vetId = generateUUID();
    const now = new Date().toISOString();

    const vetData = {
      ...validatedData,
      id: vetId,
      createdAt: now
    };

    await db.collection('veterinarians').doc(vetId).set(vetData);

    // Track analytics
    await trackAnalyticsEvent(userId, PET_SERVICE_EVENTS.VETERINARIAN_ADDED, {
      veterinarian_id: vetId,
      specializations: validatedData.specialization,
      is_primary: validatedData.isPrimary,
      cta_id: PET_SERVICE_CTA_IDS.VETERINARIAN_ADD
    });

    res.status(201).json({
      success: true,
      veterinarian: vetData
    });

  } catch (error: any) {
    console.error('Add veterinarian failed:', error);

    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Dati non validi',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Errore durante l\'aggiunta del veterinario'
    });
  }
};

export const assignVeterinarianToPet = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;
    const { petId, veterinarianId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }

    // Verify pet ownership
    const petDoc = await db.collection('pets').doc(petId).get();
    if (!petDoc.exists || petDoc.data()?.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Non autorizzato' });
    }

    // Verify veterinarian exists
    const vetDoc = await db.collection('veterinarians').doc(veterinarianId).get();
    if (!vetDoc.exists) {
      return res.status(404).json({ success: false, error: 'Veterinario non trovato' });
    }

    const validatedData = DogVeterinarianSchema.parse({
      ...req.body,
      dogId: petId,
      veterinarianId
    });

    const assignmentId = generateUUID();
    const now = new Date().toISOString();

    const assignmentData = {
      ...validatedData,
      id: assignmentId,
      createdAt: now
    };

    await db.collection('petVeterinarians').doc(assignmentId).set(assignmentData);

    // Track analytics
    await trackAnalyticsEvent(userId, PET_SERVICE_EVENTS.VETERINARIAN_ASSIGNED, {
      petId,
      veterinarian_id: veterinarianId,
      relationship: validatedData.relationship,
      cta_id: PET_SERVICE_CTA_IDS.VETERINARIAN_ASSIGN
    });

    res.status(201).json({
      success: true,
      assignment: assignmentData
    });

  } catch (error: any) {
    console.error('Assign veterinarian failed:', error);

    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Dati non validi',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Errore durante l\'assegnazione del veterinario'
    });
  }
};

// ===============================
// Pet Routine Management
// ===============================

export const createPetRoutine = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;
    const { petId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }

    // Verify pet ownership
    const petDoc = await db.collection('pets').doc(petId).get();
    if (!petDoc.exists || petDoc.data()?.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Non autorizzato' });
    }

    const validatedData = PetRoutineSchema.parse({
      ...req.body,
      dogId: petId
    });

    const routineId = generateUUID();
    const now = new Date().toISOString();

    const routineData = {
      ...validatedData,
      id: routineId,
      createdAt: now,
      updatedAt: now
    };

    await db.collection('petRoutines').doc(routineId).set(routineData);

    // Track analytics
    await trackAnalyticsEvent(userId, PET_SERVICE_EVENTS.ROUTINE_CREATED, {
      petId,
      routine_type: validatedData.type,
      frequency_type: validatedData.frequency.type,
      frequency_times: validatedData.frequency.times,
      cta_id: PET_SERVICE_CTA_IDS.ROUTINE_CREATE
    });

    res.status(201).json({
      success: true,
      routine: routineData
    });

  } catch (error: any) {
    console.error('Create pet routine failed:', error);

    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Dati non validi',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Errore durante la creazione della routine'
    });
  }
};

// ===============================
// Health Analytics & Summary
// ===============================

export const getPetHealthSummary = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;
    const { petId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }

    // Verify pet ownership
    const petDoc = await db.collection('pets').doc(petId).get();
    if (!petDoc.exists || petDoc.data()?.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Non autorizzato' });
    }

    const healthSummary = await generateHealthSummary(petId);

    res.json({
      success: true,
      healthSummary
    });

  } catch (error) {
    console.error('Get pet health summary failed:', error);
    res.status(500).json({
      success: false,
      error: 'Errore nel recupero del riassunto salute'
    });
  }
};

export const getPetAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;
    const { petId } = req.params;
    const { period = '30d' } = req.query;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }

    // Verify pet ownership
    const petDoc = await db.collection('pets').doc(petId).get();
    if (!petDoc.exists || petDoc.data()?.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Non autorizzato' });
    }

    const analytics = await generatePetAnalytics(petId, period as string);

    res.json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('Get pet analytics failed:', error);
    res.status(500).json({
      success: false,
      error: 'Errore nel recupero delle analytics'
    });
  }
};

// ===============================
// Helper Functions
// ===============================

async function calculateNutritionalNeeds(pet: PetProfile): Promise<any> {
  const birthDate = new Date(pet.birthDate);
  const ageInMonths = Math.floor((Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
  const weight = pet.weight.current;

  // Simplified calculation - in real app, this would be more sophisticated
  let caloriesPerKg;
  if (ageInMonths < 12) {
    caloriesPerKg = 88; // Puppy
  } else if (ageInMonths > 84) {
    caloriesPerKg = 65; // Senior
  } else {
    caloriesPerKg = 70; // Adult
  }

  const dailyCalories = Math.round(weight * caloriesPerKg);
  const dailyDryFood = Math.round(dailyCalories / 3.5); // ~3.5 cal/gram for dry food
  const dailyWetFood = Math.round(dailyCalories / 1.2); // ~1.2 cal/gram for wet food

  return {
    dogId: pet.id,
    dailyCalories,
    dailyAmount: {
      dry: dailyDryFood,
      wet: dailyWetFood
    },
    recommendedProducts: [],
    supplementsNeeded: [],
    allergensToAvoid: [],
    notes: [`Calculated for ${weight}kg ${ageInMonths < 12 ? 'puppy' : ageInMonths > 84 ? 'senior' : 'adult'} dog`]
  };
}

async function generateHealthSummary(petId: string): Promise<PetHealthSummaryResponse> {
  try {
    // Get active health conditions
    const conditionsSnapshot = await db.collection('petHealthConditions')
      .where('dogId', '==', petId)
      .where('isActive', '==', true)
      .get();

    // Get pending vaccinations
    const vaccinationsSnapshot = await db.collection('petVaccinations')
      .where('dogId', '==', petId)
      .where('isCompleted', '==', false)
      .get();

    // Get pet weight data
    const petDoc = await db.collection('pets').doc(petId).get();
    const petData = petDoc.data() as PetProfile;

    const activeConditions = conditionsSnapshot.size;
    const pendingVaccinations = vaccinationsSnapshot.size;

    // Calculate weight status
    const weightStatus = calculateWeightStatus(petData.weight);

    // Calculate health score (0-100)
    let healthScore = 100;
    healthScore -= activeConditions * 15; // -15 per active condition
    healthScore -= pendingVaccinations * 10; // -10 per pending vaccination
    if (weightStatus !== 'peso_ideale') healthScore -= 20;
    healthScore = Math.max(0, healthScore);

    // Determine overall health status
    let healthStatus: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    if (healthScore >= 90) healthStatus = 'excellent';
    else if (healthScore >= 75) healthStatus = 'good';
    else if (healthScore >= 60) healthStatus = 'fair';
    else if (healthScore >= 40) healthStatus = 'poor';
    else healthStatus = 'critical';

    return {
      petId,
      healthStatus,
      activeConditions,
      pendingVaccinations,
      weightStatus,
      lastCheckup: null, // Would need vet visit tracking
      nextCheckup: null, // Would calculate based on last visit
      healthScore
    };

  } catch (error) {
    console.error('Generate health summary failed:', error);
    throw error;
  }
}

async function generatePetAnalytics(petId: string, period: string): Promise<PetAnalyticsData> {
  // This would implement comprehensive analytics
  // For now, returning mock data structure
  return {
    petId,
    period: period as any,
    weightTrend: 'stable',
    routineCompletionRate: 85,
    vaccinationCompliance: 95,
    healthIncidents: 2,
    vetVisits: 1
  };
}

function calculateWeightStatus(weight: any): 'sottopeso' | 'peso_ideale' | 'sovrappeso' | 'obeso' {
  const { current, idealMin, idealMax } = weight;

  if (current < idealMin * 0.9) return 'sottopeso';
  if (current > idealMax * 1.2) return 'obeso';
  if (current > idealMax) return 'sovrappeso';
  return 'peso_ideale';
}