/**
 * Pet Service API Routes
 * Comprehensive pet management, health tracking, and veterinary care routes
 */

import { Router } from 'express';
import {
  createPet,
  getPetProfile,
  updatePetProfile,
  getUserPets,
  addHealthCondition,
  addAllergy,
  addVaccination,
  addVeterinarian,
  assignVeterinarianToPet,
  createPetRoutine,
  getPetHealthSummary,
  getPetAnalytics
} from '../modules/pets/controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// ===============================
// Pet Profile Management Routes
// ===============================

/**
 * @route   POST /api/pets
 * @desc    Create new pet profile
 * @access  Private
 * @body    CreatePetRequest
 */
router.post('/', createPet);

/**
 * @route   GET /api/pets
 * @desc    Get all pets for authenticated user
 * @access  Private
 */
router.get('/', getUserPets);

/**
 * @route   GET /api/pets/:petId
 * @desc    Get specific pet profile with health summary
 * @access  Private
 * @params  petId: string (UUID)
 */
router.get('/:petId', getPetProfile);

/**
 * @route   PUT /api/pets/:petId
 * @desc    Update pet profile
 * @access  Private
 * @params  petId: string (UUID)
 * @body    UpdatePetRequest
 */
router.put('/:petId', updatePetProfile);

// ===============================
// Health Management Routes
// ===============================

/**
 * @route   POST /api/pets/:petId/health/conditions
 * @desc    Add health condition to pet
 * @access  Private
 * @params  petId: string (UUID)
 * @body    CreateHealthConditionRequest
 */
router.post('/:petId/health/conditions', addHealthCondition);

/**
 * @route   POST /api/pets/:petId/health/allergies
 * @desc    Add allergy to pet
 * @access  Private
 * @params  petId: string (UUID)
 * @query   type: 'food' | 'environmental'
 * @body    FoodAllergyRequest | EnvironmentalAllergyRequest
 */
router.post('/:petId/health/allergies', addAllergy);

/**
 * @route   POST /api/pets/:petId/health/vaccinations
 * @desc    Add vaccination record to pet
 * @access  Private
 * @params  petId: string (UUID)
 * @body    CreateVaccinationRequest
 */
router.post('/:petId/health/vaccinations', addVaccination);

/**
 * @route   GET /api/pets/:petId/health/summary
 * @desc    Get comprehensive health summary for pet
 * @access  Private
 * @params  petId: string (UUID)
 */
router.get('/:petId/health/summary', getPetHealthSummary);

// ===============================
// Veterinarian Management Routes
// ===============================

/**
 * @route   POST /api/pets/veterinarians
 * @desc    Add new veterinarian to user's directory
 * @access  Private
 * @body    VeterinarianRequest
 */
router.post('/veterinarians', addVeterinarian);

/**
 * @route   POST /api/pets/:petId/veterinarians/:veterinarianId
 * @desc    Assign veterinarian to specific pet
 * @access  Private
 * @params  petId: string (UUID), veterinarianId: string (UUID)
 * @body    DogVeterinarianRequest
 */
router.post('/:petId/veterinarians/:veterinarianId', assignVeterinarianToPet);

// ===============================
// Routine Management Routes
// ===============================

/**
 * @route   POST /api/pets/:petId/routines
 * @desc    Create routine for pet
 * @access  Private
 * @params  petId: string (UUID)
 * @body    PetRoutineRequest
 */
router.post('/:petId/routines', createPetRoutine);

// ===============================
// Analytics & Insights Routes
// ===============================

/**
 * @route   GET /api/pets/:petId/analytics
 * @desc    Get pet analytics and insights
 * @access  Private
 * @params  petId: string (UUID)
 * @query   period: '7d' | '30d' | '90d' | '1y'
 */
router.get('/:petId/analytics', getPetAnalytics);

// ===============================
// Health Data Retrieval Routes
// ===============================

/**
 * @route   GET /api/pets/:petId/health/conditions
 * @desc    Get all health conditions for pet
 * @access  Private
 * @params  petId: string (UUID)
 */
router.get('/:petId/health/conditions', async (req, res) => {
  try {
    const userId = req.user?.uid;
    const { petId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }

    // Import firebase here to avoid circular imports
    const { db } = require('../config/firebase');

    // Verify pet ownership
    const petDoc = await db.collection('pets').doc(petId).get();
    if (!petDoc.exists || petDoc.data()?.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Non autorizzato' });
    }

    const conditionsSnapshot = await db.collection('petHealthConditions')
      .where('dogId', '==', petId)
      .orderBy('createdAt', 'desc')
      .get();

    const conditions = conditionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      conditions
    });

  } catch (error) {
    console.error('Get health conditions failed:', error);
    res.status(500).json({
      success: false,
      error: 'Errore nel recupero delle condizioni di salute'
    });
  }
});

/**
 * @route   GET /api/pets/:petId/health/allergies
 * @desc    Get all allergies for pet
 * @access  Private
 * @params  petId: string (UUID)
 * @query   type?: 'food' | 'environmental'
 */
router.get('/:petId/health/allergies', async (req, res) => {
  try {
    const userId = req.user?.uid;
    const { petId } = req.params;
    const { type } = req.query;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }

    // Import firebase here to avoid circular imports
    const { db } = require('../config/firebase');

    // Verify pet ownership
    const petDoc = await db.collection('pets').doc(petId).get();
    if (!petDoc.exists || petDoc.data()?.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Non autorizzato' });
    }

    let allergies: any = {};

    if (!type || type === 'food') {
      const foodAllergiesSnapshot = await db.collection('petFoodAllergies')
        .where('dogId', '==', petId)
        .where('isActive', '==', true)
        .orderBy('createdAt', 'desc')
        .get();

      allergies.food = foodAllergiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }

    if (!type || type === 'environmental') {
      const envAllergiesSnapshot = await db.collection('petEnvironmentalAllergies')
        .where('dogId', '==', petId)
        .where('isActive', '==', true)
        .orderBy('createdAt', 'desc')
        .get();

      allergies.environmental = envAllergiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }

    res.json({
      success: true,
      allergies
    });

  } catch (error) {
    console.error('Get allergies failed:', error);
    res.status(500).json({
      success: false,
      error: 'Errore nel recupero delle allergie'
    });
  }
});

/**
 * @route   GET /api/pets/:petId/health/vaccinations
 * @desc    Get all vaccinations for pet
 * @access  Private
 * @params  petId: string (UUID)
 * @query   status?: 'completed' | 'pending' | 'all'
 */
router.get('/:petId/health/vaccinations', async (req, res) => {
  try {
    const userId = req.user?.uid;
    const { petId } = req.params;
    const { status = 'all' } = req.query;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }

    // Import firebase here to avoid circular imports
    const { db } = require('../config/firebase');

    // Verify pet ownership
    const petDoc = await db.collection('pets').doc(petId).get();
    if (!petDoc.exists || petDoc.data()?.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Non autorizzato' });
    }

    let query = db.collection('petVaccinations').where('dogId', '==', petId);

    if (status === 'completed') {
      query = query.where('isCompleted', '==', true);
    } else if (status === 'pending') {
      query = query.where('isCompleted', '==', false);
    }

    const vaccinationsSnapshot = await query.orderBy('createdAt', 'desc').get();

    const vaccinations = vaccinationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      vaccinations
    });

  } catch (error) {
    console.error('Get vaccinations failed:', error);
    res.status(500).json({
      success: false,
      error: 'Errore nel recupero delle vaccinazioni'
    });
  }
});

/**
 * @route   GET /api/pets/:petId/veterinarians
 * @desc    Get all veterinarians assigned to pet
 * @access  Private
 * @params  petId: string (UUID)
 */
router.get('/:petId/veterinarians', async (req, res) => {
  try {
    const userId = req.user?.uid;
    const { petId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }

    // Import firebase here to avoid circular imports
    const { db } = require('../config/firebase');

    // Verify pet ownership
    const petDoc = await db.collection('pets').doc(petId).get();
    if (!petDoc.exists || petDoc.data()?.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Non autorizzato' });
    }

    // Get pet-veterinarian assignments
    const assignmentsSnapshot = await db.collection('petVeterinarians')
      .where('dogId', '==', petId)
      .get();

    const assignments = assignmentsSnapshot.docs.map(doc => doc.data());

    // Get veterinarian details
    const veterinarians = await Promise.all(
      assignments.map(async (assignment) => {
        const vetDoc = await db.collection('veterinarians').doc(assignment.veterinarianId).get();
        return {
          ...vetDoc.data(),
          assignment: {
            relationship: assignment.relationship,
            firstVisitDate: assignment.firstVisitDate,
            lastVisitDate: assignment.lastVisitDate,
            notes: assignment.notes
          }
        };
      })
    );

    res.json({
      success: true,
      veterinarians
    });

  } catch (error) {
    console.error('Get pet veterinarians failed:', error);
    res.status(500).json({
      success: false,
      error: 'Errore nel recupero dei veterinari'
    });
  }
});

/**
 * @route   GET /api/pets/:petId/routines
 * @desc    Get all routines for pet
 * @access  Private
 * @params  petId: string (UUID)
 * @query   active?: boolean
 */
router.get('/:petId/routines', async (req, res) => {
  try {
    const userId = req.user?.uid;
    const { petId } = req.params;
    const { active } = req.query;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }

    // Import firebase here to avoid circular imports
    const { db } = require('../config/firebase');

    // Verify pet ownership
    const petDoc = await db.collection('pets').doc(petId).get();
    if (!petDoc.exists || petDoc.data()?.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Non autorizzato' });
    }

    let query = db.collection('petRoutines').where('dogId', '==', petId);

    if (active !== undefined) {
      query = query.where('isActive', '==', active === 'true');
    }

    const routinesSnapshot = await query.orderBy('createdAt', 'desc').get();

    const routines = routinesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      routines
    });

  } catch (error) {
    console.error('Get pet routines failed:', error);
    res.status(500).json({
      success: false,
      error: 'Errore nel recupero delle routine'
    });
  }
});

export default router;