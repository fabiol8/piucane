import { Request, Response } from 'express';
import { db } from '../../config/firebase';
import { AuthenticatedRequest } from '../../middleware/auth';
import { logger } from '../../utils/logger';
import { z } from 'zod';

// Onboarding schema validation
const onboardingSchema = z.object({
  user: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(10),
    address: z.object({
      street: z.string().min(5),
      city: z.string().min(2),
      zipCode: z.string().min(5),
      country: z.string().default('Italia')
    })
  }),
  dog: z.object({
    name: z.string().min(1),
    breed: z.string().min(1),
    birthDate: z.string(),
    gender: z.enum(['male', 'female']),
    weight: z.number().min(0.5).max(100),
    activityLevel: z.enum(['low', 'medium', 'high']),
    size: z.string(),
    isNeutered: z.boolean(),
    photos: z.array(z.string()).optional()
  }),
  health: z.object({
    allergies: z.array(z.string()).default([]),
    conditions: z.array(z.string()).default([]),
    medications: z.array(z.string()).default([]),
    lastVetVisit: z.string().optional(),
    vaccinations: z.array(z.object({
      name: z.string(),
      date: z.string(),
      nextDue: z.string()
    })).default([])
  }),
  goals: z.object({
    primary: z.array(z.string()),
    weightGoal: z.enum(['maintain', 'lose', 'gain']),
    specialNeeds: z.array(z.string()).default([])
  }),
  veterinarian: z.object({
    name: z.string().optional(),
    clinic: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    address: z.string().optional()
  }).optional()
});

export const completeOnboarding = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const validatedData = onboardingSchema.parse(req.body);

    // Start transaction
    const batch = db.batch();

    // Update user profile
    const userRef = db.collection('users').doc(userId);
    batch.set(userRef, {
      ...validatedData.user,
      onboardingCompleted: true,
      completedAt: new Date(),
      updatedAt: new Date()
    }, { merge: true });

    // Create dog profile
    const dogRef = db.collection('dogs').doc();
    const dogData = {
      ...validatedData.dog,
      ownerId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      profileComplete: true
    };
    batch.set(dogRef, dogData);

    // Create health record
    if (validatedData.health) {
      const healthRef = db.collection('healthRecords').doc();
      batch.set(healthRef, {
        ...validatedData.health,
        dogId: dogRef.id,
        ownerId: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // Create goals
    const goalsRef = db.collection('userGoals').doc();
    batch.set(goalsRef, {
      ...validatedData.goals,
      dogId: dogRef.id,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Create veterinarian info if provided
    if (validatedData.veterinarian && validatedData.veterinarian.name) {
      const vetRef = db.collection('veterinarians').doc();
      batch.set(vetRef, {
        ...validatedData.veterinarian,
        dogId: dogRef.id,
        userId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // Create initial user progress for gamification
    const progressRef = db.collection('userProgress').doc(userId);
    batch.set(progressRef, {
      userId,
      dogId: dogRef.id,
      level: 1,
      xp: 100, // Bonus for completing onboarding
      totalPoints: 100,
      missionsCompleted: 0,
      badgesEarned: ['onboarding_complete'],
      achievements: {
        onboarding_complete: {
          unlockedAt: new Date(),
          xpEarned: 100
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Calculate initial nutrition plan
    const nutritionPlan = await calculateNutritionPlan(dogData, validatedData.goals);
    const nutritionRef = db.collection('nutritionPlans').doc();
    batch.set(nutritionRef, {
      ...nutritionPlan,
      dogId: dogRef.id,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Commit transaction
    await batch.commit();

    // Log successful onboarding
    logger.info('Onboarding completed', {
      userId,
      dogId: dogRef.id,
      breed: validatedData.dog.breed,
      goals: validatedData.goals.primary
    });

    // Send welcome message
    await sendWelcomeMessage(userId, validatedData.user.name, validatedData.dog.name);

    res.status(201).json({
      success: true,
      dogId: dogRef.id,
      message: 'Onboarding completato con successo',
      nutritionPlan,
      nextSteps: [
        'Esplora i prodotti consigliati',
        'Inizia la prima missione',
        'Chatta con il nostro veterinario AI'
      ]
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Dati non validi',
        details: error.errors
      });
    }

    logger.error('Error completing onboarding:', error);
    res.status(500).json({ error: 'Errore nel completare l\'onboarding' });
  }
};

export const getOnboardingSchema = async (req: Request, res: Response) => {
  try {
    // Get dynamic schema from admin configuration
    const schemaDoc = await db.collection('config').doc('onboardingSchema').get();

    const defaultSchema = {
      version: '1.0',
      lastUpdated: new Date(),
      steps: [
        {
          id: 'welcome',
          title: 'Benvenuto',
          description: 'Introduzione a PiuCane',
          fields: []
        },
        {
          id: 'user-info',
          title: 'I tuoi dati',
          description: 'Informazioni personali',
          fields: [
            { name: 'name', type: 'text', required: true, label: 'Nome completo' },
            { name: 'email', type: 'email', required: true, label: 'Email' },
            { name: 'phone', type: 'tel', required: true, label: 'Telefono' },
            { name: 'address.street', type: 'text', required: true, label: 'Indirizzo' },
            { name: 'address.city', type: 'text', required: true, label: 'Città' },
            { name: 'address.zipCode', type: 'text', required: true, label: 'CAP' }
          ]
        },
        {
          id: 'dog-profile',
          title: 'Profilo del cane',
          description: 'Informazioni sul tuo cane',
          fields: [
            { name: 'name', type: 'text', required: true, label: 'Nome del cane' },
            { name: 'breed', type: 'select', required: true, label: 'Razza', options: 'breeds' },
            { name: 'birthDate', type: 'date', required: true, label: 'Data di nascita' },
            { name: 'gender', type: 'radio', required: true, label: 'Sesso', options: ['male', 'female'] },
            { name: 'weight', type: 'number', required: true, label: 'Peso (kg)' },
            { name: 'activityLevel', type: 'select', required: true, label: 'Livello di attività', options: ['low', 'medium', 'high'] }
          ]
        }
      ]
    };

    const schema = schemaDoc.exists ? schemaDoc.data() : defaultSchema;

    res.json(schema);
  } catch (error) {
    logger.error('Error getting onboarding schema:', error);
    res.status(500).json({ error: 'Errore nel recuperare lo schema' });
  }
};

export const updateOnboardingSchema = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;

    // Check if user has admin role
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData || userData.role !== 'admin') {
      return res.status(403).json({ error: 'Accesso negato' });
    }

    const schema = req.body;

    await db.collection('config').doc('onboardingSchema').set({
      ...schema,
      lastUpdated: new Date(),
      updatedBy: userId
    });

    logger.info('Onboarding schema updated', { updatedBy: userId });

    res.json({ success: true, message: 'Schema aggiornato con successo' });
  } catch (error) {
    logger.error('Error updating onboarding schema:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornare lo schema' });
  }
};

// Helper functions
async function calculateNutritionPlan(dogData: any, goals: any) {
  // Calculate daily caloric needs based on weight, age, activity level
  const baseCalories = calculateBaseCalories(dogData.weight, dogData.activityLevel);

  // Adjust for goals
  let adjustedCalories = baseCalories;
  if (goals.weightGoal === 'lose') {
    adjustedCalories *= 0.8;
  } else if (goals.weightGoal === 'gain') {
    adjustedCalories *= 1.2;
  }

  // Calculate macronutrients
  const protein = Math.round(adjustedCalories * 0.25 / 4); // 25% protein (4 cal/g)
  const fat = Math.round(adjustedCalories * 0.15 / 9); // 15% fat (9 cal/g)
  const carbs = Math.round((adjustedCalories - (protein * 4) - (fat * 9)) / 4); // Remaining carbs

  return {
    dailyCalories: Math.round(adjustedCalories),
    macronutrients: {
      protein: `${protein}g`,
      fat: `${fat}g`,
      carbohydrates: `${carbs}g`
    },
    recommendedProducts: await getRecommendedProducts(dogData, goals),
    feedingSchedule: calculateFeedingSchedule(dogData.age, adjustedCalories),
    notes: generateNutritionNotes(dogData, goals)
  };
}

function calculateBaseCalories(weight: number, activityLevel: string): number {
  // RER (Resting Energy Requirement) = 70 * (weight in kg)^0.75
  const rer = 70 * Math.pow(weight, 0.75);

  // Activity multipliers
  const multipliers = {
    low: 1.2,
    medium: 1.6,
    high: 2.0
  };

  return rer * multipliers[activityLevel as keyof typeof multipliers];
}

async function getRecommendedProducts(dogData: any, goals: any): Promise<string[]> {
  // Query products based on dog characteristics
  const productsQuery = db.collection('products')
    .where('category', '==', 'dog-food')
    .where('targetSize', 'array-contains', dogData.size)
    .limit(3);

  const productsSnapshot = await productsQuery.get();
  return productsSnapshot.docs.map(doc => doc.id);
}

function calculateFeedingSchedule(age: string, dailyCalories: number) {
  const isPuppy = age.includes('mesi') && parseInt(age) < 12;

  if (isPuppy) {
    // Puppies need more frequent meals
    return {
      mealsPerDay: 3,
      mealCalories: Math.round(dailyCalories / 3),
      schedule: ['08:00', '13:00', '18:00']
    };
  } else {
    // Adult dogs
    return {
      mealsPerDay: 2,
      mealCalories: Math.round(dailyCalories / 2),
      schedule: ['08:00', '18:00']
    };
  }
}

function generateNutritionNotes(dogData: any, goals: any): string[] {
  const notes = [];

  if (dogData.size === 'large' || dogData.size === 'giant') {
    notes.push('Le taglie grandi necessitano di cibo specifico per supportare articolazioni e crescita controllata');
  }

  if (goals.weightGoal === 'lose') {
    notes.push('Piano di dimagrimento graduale con controllo delle porzioni');
  }

  if (goals.specialNeeds?.includes('sensitive-stomach')) {
    notes.push('Consigliati alimenti facilmente digeribili con ingredienti limitati');
  }

  return notes;
}

async function sendWelcomeMessage(userId: string, userName: string, dogName: string) {
  try {
    // Create welcome message in inbox
    await db.collection('inbox').doc(userId).collection('messages').add({
      type: 'welcome',
      title: `Benvenuto in PiuCane, ${userName}!`,
      content: `Ciao ${userName}! Siamo entusiasti di iniziare questo percorso con te e ${dogName}. Il profilo è stato creato con successo e abbiamo preparato un piano nutrizionale personalizzato. Esplora l'app per scoprire tutti i servizi disponibili!`,
      read: false,
      channel: 'system',
      templateKey: 'welcome_onboarding',
      metadata: {
        dogName,
        ctaButtons: [
          { text: 'Vedi Piano Nutrizionale', action: '/nutrition' },
          { text: 'Inizia Prima Missione', action: '/missions' }
        ]
      },
      createdAt: new Date()
    });

    logger.info('Welcome message sent', { userId, userName, dogName });
  } catch (error) {
    logger.error('Error sending welcome message:', error);
  }
}