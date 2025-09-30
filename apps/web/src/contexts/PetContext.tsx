'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

// Import types from the shared types file
import {
  DogProfile,
  HealthCondition,
  FoodAllergy,
  EnvironmentalAllergy,
  Vaccination,
  Veterinarian,
  DogVeterinarian,
  DogRoutine,
  DogNutritionalNeeds,
  WeightStatus
} from '../types/dogs';

interface PetHealthSummary {
  petId: string;
  healthStatus: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  activeConditions: number;
  pendingVaccinations: number;
  weightStatus: 'sottopeso' | 'peso_ideale' | 'sovrappeso' | 'obeso';
  lastCheckup: string | null;
  nextCheckup: string | null;
  healthScore: number;
}

interface PetAnalytics {
  petId: string;
  period: '7d' | '30d' | '90d' | '1y';
  weightTrend: 'increasing' | 'decreasing' | 'stable';
  routineCompletionRate: number;
  vaccinationCompliance: number;
  healthIncidents: number;
  vetVisits: number;
}

interface CreatePetData {
  name: string;
  breed: string;
  isMongrel: boolean;
  gender: 'maschio' | 'femmina';
  isNeutered: boolean;
  birthDate: string;
  weight: {
    current: number;
    idealMin: number;
    idealMax: number;
  };
  bodyConditionScore?: number;
  microchipId?: string;
}

interface PetContextType {
  // State
  pets: DogProfile[];
  currentPet: DogProfile | null;
  healthSummaries: { [petId: string]: PetHealthSummary };
  nutritionalNeeds: { [petId: string]: DogNutritionalNeeds };
  loading: boolean;
  error: string | null;

  // Pet Management
  createPet: (petData: CreatePetData) => Promise<{ success: boolean; error?: string }>;
  updatePet: (petId: string, updates: Partial<DogProfile>) => Promise<{ success: boolean; error?: string }>;
  deletePet: (petId: string) => Promise<{ success: boolean; error?: string }>;
  setCurrentPet: (pet: DogProfile | null) => void;
  refreshPets: () => Promise<void>;
  getPetProfile: (petId: string) => Promise<DogProfile | null>;

  // Health Management
  addHealthCondition: (petId: string, condition: Omit<HealthCondition, 'id' | 'createdAt' | 'updatedAt'>) => Promise<{ success: boolean; error?: string }>;
  updateHealthCondition: (conditionId: string, updates: Partial<HealthCondition>) => Promise<{ success: boolean; error?: string }>;
  getHealthConditions: (petId: string) => Promise<HealthCondition[]>;

  // Allergy Management
  addFoodAllergy: (petId: string, allergy: Omit<FoodAllergy, 'id' | 'createdAt'>) => Promise<{ success: boolean; error?: string }>;
  addEnvironmentalAllergy: (petId: string, allergy: Omit<EnvironmentalAllergy, 'id' | 'createdAt'>) => Promise<{ success: boolean; error?: string }>;
  getAllergies: (petId: string) => Promise<{ food: FoodAllergy[]; environmental: EnvironmentalAllergy[] }>;

  // Vaccination Management
  addVaccination: (petId: string, vaccination: Omit<Vaccination, 'id' | 'createdAt' | 'updatedAt'>) => Promise<{ success: boolean; error?: string }>;
  updateVaccination: (vaccinationId: string, updates: Partial<Vaccination>) => Promise<{ success: boolean; error?: string }>;
  getVaccinations: (petId: string, status?: 'completed' | 'pending' | 'all') => Promise<Vaccination[]>;

  // Veterinarian Management
  addVeterinarian: (veterinarian: Omit<Veterinarian, 'id' | 'createdAt'>) => Promise<{ success: boolean; veterinarian?: Veterinarian; error?: string }>;
  assignVeterinarianToPet: (petId: string, veterinarianId: string, relationship: 'primario' | 'specialista' | 'emergenza') => Promise<{ success: boolean; error?: string }>;
  getPetVeterinarians: (petId: string) => Promise<(Veterinarian & { assignment: DogVeterinarian })[]>;

  // Routine Management
  createRoutine: (petId: string, routine: Omit<DogRoutine, 'id' | 'createdAt' | 'updatedAt'>) => Promise<{ success: boolean; error?: string }>;
  updateRoutine: (routineId: string, updates: Partial<DogRoutine>) => Promise<{ success: boolean; error?: string }>;
  getRoutines: (petId: string, activeOnly?: boolean) => Promise<DogRoutine[]>;

  // Analytics & Health Summary
  getHealthSummary: (petId: string) => Promise<PetHealthSummary | null>;
  getAnalytics: (petId: string, period?: '7d' | '30d' | '90d' | '1y') => Promise<PetAnalytics | null>;

  // Weight Management
  addWeightEntry: (petId: string, weight: number, notes?: string) => Promise<{ success: boolean; error?: string }>;
  getWeightStatus: (pet: DogProfile) => WeightStatus;

  // Utility functions
  calculateAge: (birthDate: string) => { years: number; months: number };
  clearError: () => void;
}

const PetContext = createContext<PetContextType | undefined>(undefined);

export const usePets = () => {
  const context = useContext(PetContext);
  if (context === undefined) {
    throw new Error('usePets must be used within a PetProvider');
  }
  return context;
};

export const PetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [pets, setPets] = useState<DogProfile[]>([]);
  const [currentPet, setCurrentPet] = useState<DogProfile | null>(null);
  const [healthSummaries, setHealthSummaries] = useState<{ [petId: string]: PetHealthSummary }>({});
  const [nutritionalNeeds, setNutritionalNeeds] = useState<{ [petId: string]: DogNutritionalNeeds }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load pets when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      refreshPets();
    } else {
      // Clear pets when user logs out
      setPets([]);
      setCurrentPet(null);
      setHealthSummaries({});
      setNutritionalNeeds({});
    }
  }, [isAuthenticated, user]);

  // Set first pet as current when pets load
  useEffect(() => {
    if (pets.length > 0 && !currentPet) {
      setCurrentPet(pets[0]);
    }
  }, [pets, currentPet]);

  const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
    if (!user) {
      throw new Error('Utente non autenticato');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Errore di rete');
    }

    return response.json();
  };

  const createPet = async (petData: CreatePetData): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      setError(null);

      const result = await makeAuthenticatedRequest('/api/pets', {
        method: 'POST',
        body: JSON.stringify({
          ...petData,
          userId: user?.id
        })
      });

      if (result.success) {
        await refreshPets();

        // Track analytics
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'pet_profile_created', {
            pet_breed: petData.breed,
            pet_gender: petData.gender,
            cta_id: 'pet.profile.create'
          });
        }

        return { success: true };
      }

      return { success: false, error: result.error };
    } catch (error: any) {
      const errorMessage = error.message || 'Errore durante la creazione del pet';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const updatePet = async (petId: string, updates: Partial<DogProfile>): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      setError(null);

      const result = await makeAuthenticatedRequest(`/api/pets/${petId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });

      if (result.success) {
        await refreshPets();

        // Update current pet if it's the one being updated
        if (currentPet?.id === petId) {
          const updatedPet = pets.find(p => p.id === petId);
          if (updatedPet) {
            setCurrentPet({ ...updatedPet, ...updates });
          }
        }

        // Track analytics
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'pet_profile_updated', {
            pet_id: petId,
            fields_updated: Object.keys(updates),
            cta_id: 'pet.profile.save'
          });
        }

        return { success: true };
      }

      return { success: false, error: result.error };
    } catch (error: any) {
      const errorMessage = error.message || 'Errore durante l\'aggiornamento del pet';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const refreshPets = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const result = await makeAuthenticatedRequest('/api/pets');

      if (result.success) {
        setPets(result.pets);

        // Update health summaries
        const summaries: { [petId: string]: PetHealthSummary } = {};
        result.pets.forEach((pet: any) => {
          if (pet.healthSummary) {
            summaries[pet.id] = pet.healthSummary;
          }
        });
        setHealthSummaries(summaries);
      }
    } catch (error: any) {
      setError(error.message || 'Errore nel caricamento dei pets');
    } finally {
      setLoading(false);
    }
  };

  const getPetProfile = async (petId: string): Promise<DogProfile | null> => {
    try {
      const result = await makeAuthenticatedRequest(`/api/pets/${petId}`);

      if (result.success) {
        // Update health summary and nutritional needs
        if (result.healthSummary) {
          setHealthSummaries(prev => ({ ...prev, [petId]: result.healthSummary }));
        }
        if (result.nutritionalNeeds) {
          setNutritionalNeeds(prev => ({ ...prev, [petId]: result.nutritionalNeeds }));
        }

        return result.pet;
      }

      return null;
    } catch (error: any) {
      setError(error.message || 'Errore nel recupero del profilo pet');
      return null;
    }
  };

  const addHealthCondition = async (petId: string, condition: Omit<HealthCondition, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await makeAuthenticatedRequest(`/api/pets/${petId}/health/conditions`, {
        method: 'POST',
        body: JSON.stringify({ ...condition, dogId: petId })
      });

      if (result.success) {
        // Refresh health summary
        await getHealthSummary(petId);

        // Track analytics
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'health_condition_added', {
            pet_id: petId,
            condition_category: condition.category,
            severity: condition.severity,
            cta_id: 'pet.health.condition.add'
          });
        }

        return { success: true };
      }

      return { success: false, error: result.error };
    } catch (error: any) {
      return { success: false, error: error.message || 'Errore durante l\'aggiunta della condizione di salute' };
    }
  };

  const addVaccination = async (petId: string, vaccination: Omit<Vaccination, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await makeAuthenticatedRequest(`/api/pets/${petId}/health/vaccinations`, {
        method: 'POST',
        body: JSON.stringify({ ...vaccination, dogId: petId })
      });

      if (result.success) {
        // Refresh health summary
        await getHealthSummary(petId);

        // Track analytics
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', vaccination.isCompleted ? 'vaccination_completed' : 'vaccination_scheduled', {
            pet_id: petId,
            vaccination_name: vaccination.name,
            vaccination_type: vaccination.type,
            cta_id: vaccination.isCompleted ? 'pet.vaccination.complete' : 'pet.vaccination.add'
          });
        }

        return { success: true };
      }

      return { success: false, error: result.error };
    } catch (error: any) {
      return { success: false, error: error.message || 'Errore durante l\'aggiunta della vaccinazione' };
    }
  };

  const getHealthSummary = async (petId: string): Promise<PetHealthSummary | null> => {
    try {
      const result = await makeAuthenticatedRequest(`/api/pets/${petId}/health/summary`);

      if (result.success) {
        setHealthSummaries(prev => ({ ...prev, [petId]: result.healthSummary }));
        return result.healthSummary;
      }

      return null;
    } catch (error: any) {
      setError(error.message || 'Errore nel recupero del riassunto salute');
      return null;
    }
  };

  const getWeightStatus = (pet: DogProfile): WeightStatus => {
    const { current, idealMin, idealMax } = pet.weight;

    if (current < idealMin * 0.9) {
      return {
        status: 'sottopeso',
        color: 'red',
        message: 'Il tuo cane è sottopeso',
        recommendation: 'Consulta il veterinario per un piano alimentare appropriato'
      };
    }

    if (current > idealMax * 1.2) {
      return {
        status: 'obeso',
        color: 'red',
        message: 'Il tuo cane è obeso',
        recommendation: 'È importante consultare immediatamente il veterinario'
      };
    }

    if (current > idealMax) {
      return {
        status: 'sovrappeso',
        color: 'orange',
        message: 'Il tuo cane è leggermente sovrappeso',
        recommendation: 'Considera di ridurre le porzioni e aumentare l\'esercizio'
      };
    }

    return {
      status: 'peso_ideale',
      color: 'green',
      message: 'Il tuo cane ha un peso ideale',
      recommendation: 'Continua con la routine attuale'
    };
  };

  const calculateAge = (birthDate: string): { years: number; months: number } => {
    const birth = new Date(birthDate);
    const now = new Date();

    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();

    if (months < 0) {
      years--;
      months += 12;
    }

    return { years, months };
  };

  const addWeightEntry = async (petId: string, weight: number, notes?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const pet = pets.find(p => p.id === petId);
      if (!pet) {
        return { success: false, error: 'Pet non trovato' };
      }

      const weightEntry = {
        id: `weight_${Date.now()}`,
        weight,
        date: new Date().toISOString(),
        notes: notes || ''
      };

      const updatedWeight = {
        ...pet.weight,
        current: weight,
        history: [...pet.weight.history, weightEntry]
      };

      return await updatePet(petId, { weight: updatedWeight });
    } catch (error: any) {
      return { success: false, error: error.message || 'Errore durante l\'aggiunta del peso' };
    }
  };

  // Placeholder implementations for remaining functions
  const deletePet = async (petId: string): Promise<{ success: boolean; error?: string }> => {
    // Would implement DELETE /api/pets/:petId
    return { success: false, error: 'Non implementato' };
  };

  const updateHealthCondition = async (conditionId: string, updates: Partial<HealthCondition>): Promise<{ success: boolean; error?: string }> => {
    // Would implement PUT /api/pets/health/conditions/:conditionId
    return { success: false, error: 'Non implementato' };
  };

  const getHealthConditions = async (petId: string): Promise<HealthCondition[]> => {
    try {
      const result = await makeAuthenticatedRequest(`/api/pets/${petId}/health/conditions`);
      return result.success ? result.conditions : [];
    } catch (error) {
      return [];
    }
  };

  const addFoodAllergy = async (petId: string, allergy: Omit<FoodAllergy, 'id' | 'createdAt'>): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await makeAuthenticatedRequest(`/api/pets/${petId}/health/allergies?type=food`, {
        method: 'POST',
        body: JSON.stringify({ ...allergy, dogId: petId })
      });
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const addEnvironmentalAllergy = async (petId: string, allergy: Omit<EnvironmentalAllergy, 'id' | 'createdAt'>): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await makeAuthenticatedRequest(`/api/pets/${petId}/health/allergies?type=environmental`, {
        method: 'POST',
        body: JSON.stringify({ ...allergy, dogId: petId })
      });
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const getAllergies = async (petId: string): Promise<{ food: FoodAllergy[]; environmental: EnvironmentalAllergy[] }> => {
    try {
      const result = await makeAuthenticatedRequest(`/api/pets/${petId}/health/allergies`);
      return result.success ? result.allergies : { food: [], environmental: [] };
    } catch (error) {
      return { food: [], environmental: [] };
    }
  };

  const updateVaccination = async (vaccinationId: string, updates: Partial<Vaccination>): Promise<{ success: boolean; error?: string }> => {
    return { success: false, error: 'Non implementato' };
  };

  const getVaccinations = async (petId: string, status?: 'completed' | 'pending' | 'all'): Promise<Vaccination[]> => {
    try {
      const url = `/api/pets/${petId}/health/vaccinations${status ? `?status=${status}` : ''}`;
      const result = await makeAuthenticatedRequest(url);
      return result.success ? result.vaccinations : [];
    } catch (error) {
      return [];
    }
  };

  const addVeterinarian = async (veterinarian: Omit<Veterinarian, 'id' | 'createdAt'>): Promise<{ success: boolean; veterinarian?: Veterinarian; error?: string }> => {
    try {
      const result = await makeAuthenticatedRequest('/api/pets/veterinarians', {
        method: 'POST',
        body: JSON.stringify(veterinarian)
      });
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const assignVeterinarianToPet = async (petId: string, veterinarianId: string, relationship: 'primario' | 'specialista' | 'emergenza'): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await makeAuthenticatedRequest(`/api/pets/${petId}/veterinarians/${veterinarianId}`, {
        method: 'POST',
        body: JSON.stringify({ relationship })
      });
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const getPetVeterinarians = async (petId: string): Promise<(Veterinarian & { assignment: DogVeterinarian })[]> => {
    try {
      const result = await makeAuthenticatedRequest(`/api/pets/${petId}/veterinarians`);
      return result.success ? result.veterinarians : [];
    } catch (error) {
      return [];
    }
  };

  const createRoutine = async (petId: string, routine: Omit<DogRoutine, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await makeAuthenticatedRequest(`/api/pets/${petId}/routines`, {
        method: 'POST',
        body: JSON.stringify({ ...routine, dogId: petId })
      });
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const updateRoutine = async (routineId: string, updates: Partial<DogRoutine>): Promise<{ success: boolean; error?: string }> => {
    return { success: false, error: 'Non implementato' };
  };

  const getRoutines = async (petId: string, activeOnly?: boolean): Promise<DogRoutine[]> => {
    try {
      const url = `/api/pets/${petId}/routines${activeOnly !== undefined ? `?active=${activeOnly}` : ''}`;
      const result = await makeAuthenticatedRequest(url);
      return result.success ? result.routines : [];
    } catch (error) {
      return [];
    }
  };

  const getAnalytics = async (petId: string, period: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<PetAnalytics | null> => {
    try {
      const result = await makeAuthenticatedRequest(`/api/pets/${petId}/analytics?period=${period}`);
      return result.success ? result.analytics : null;
    } catch (error) {
      return null;
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    // State
    pets,
    currentPet,
    healthSummaries,
    nutritionalNeeds,
    loading,
    error,

    // Pet Management
    createPet,
    updatePet,
    deletePet,
    setCurrentPet,
    refreshPets,
    getPetProfile,

    // Health Management
    addHealthCondition,
    updateHealthCondition,
    getHealthConditions,

    // Allergy Management
    addFoodAllergy,
    addEnvironmentalAllergy,
    getAllergies,

    // Vaccination Management
    addVaccination,
    updateVaccination,
    getVaccinations,

    // Veterinarian Management
    addVeterinarian,
    assignVeterinarianToPet,
    getPetVeterinarians,

    // Routine Management
    createRoutine,
    updateRoutine,
    getRoutines,

    // Analytics & Health Summary
    getHealthSummary,
    getAnalytics,

    // Weight Management
    addWeightEntry,
    getWeightStatus,

    // Utility functions
    calculateAge,
    clearError
  };

  return (
    <PetContext.Provider value={value}>
      {children}
    </PetContext.Provider>
  );
};