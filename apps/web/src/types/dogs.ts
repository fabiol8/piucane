export interface DogProfile {
  id: string;
  userId: string;
  name: string;
  breed: string;
  isMongrrel: boolean;
  gender: 'maschio' | 'femmina';
  isNeutered: boolean;
  birthDate: string;
  weight: {
    current: number;
    idealMin: number;
    idealMax: number;
    history: WeightEntry[];
  };
  bodyConditionScore: number; // 1-9 scale
  microchipId?: string;
  photos: DogPhoto[];
  createdAt: string;
  updatedAt: string;
}

export interface WeightEntry {
  id: string;
  weight: number;
  date: string;
  notes?: string;
}

export interface DogPhoto {
  id: string;
  url: string;
  thumbnail: string;
  caption?: string;
  tags: string[];
  isProfilePicture: boolean;
  createdAt: string;
}

export interface HealthCondition {
  id: string;
  dogId: string;
  category: 'dermatologica' | 'articolare' | 'gastrointestinale' | 'renale' | 'cardiaca' | 'altro';
  name: string;
  description?: string;
  severity: 'lieve' | 'moderata' | 'grave';
  diagnosedDate?: string;
  isActive: boolean;
  veterinarianNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FoodAllergy {
  id: string;
  dogId: string;
  ingredient: string;
  category: 'proteina' | 'cereale' | 'verdura' | 'additivo' | 'altro';
  severity: 'lieve' | 'moderata' | 'grave';
  symptoms: string[];
  diagnosedDate?: string;
  isActive: boolean;
  createdAt: string;
}

export interface EnvironmentalAllergy {
  id: string;
  dogId: string;
  allergen: string;
  category: 'polline' | 'acari' | 'polvere' | 'muffa' | 'altro';
  season?: 'primavera' | 'estate' | 'autunno' | 'inverno' | 'tutto_anno';
  symptoms: string[];
  severity: 'lieve' | 'moderata' | 'grave';
  isActive: boolean;
  createdAt: string;
}

export interface Vaccination {
  id: string;
  dogId: string;
  name: string;
  type: 'core' | 'non_core' | 'obbligatorio' | 'raccomandato';
  lastDate?: string;
  nextDue?: string;
  veterinarian?: string;
  batchNumber?: string;
  isCompleted: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DogRoutine {
  id: string;
  dogId: string;
  type: 'pappa' | 'passeggiata' | 'integratore' | 'farmaco' | 'toelettatura' | 'altro';
  name: string;
  frequency: {
    type: 'giornaliera' | 'settimanale' | 'mensile' | 'personalizzata';
    times: number;
    days?: string[]; // for weekly routines
    hours?: string[]; // for daily routines
  };
  notifications: {
    push: boolean;
    email: boolean;
    whatsapp: boolean;
    reminderMinutes: number;
  };
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Veterinarian {
  id: string;
  name: string;
  clinic: string;
  specialization: string[];
  phone: string;
  email?: string;
  address: {
    street: string;
    city: string;
    province: string;
    zipCode: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  website?: string;
  isPrimary: boolean;
  notes?: string;
  createdAt: string;
}

export interface DogVeterinarian {
  id: string;
  dogId: string;
  veterinarianId: string;
  relationship: 'primario' | 'specialista' | 'emergenza';
  firstVisitDate?: string;
  lastVisitDate?: string;
  notes?: string;
  createdAt: string;
}

export interface DogMission {
  id: string;
  dogId: string;
  missionId: string;
  status: 'attiva' | 'completata' | 'fallita' | 'pausata';
  progress: number; // 0-100
  startDate: string;
  endDate?: string;
  completedDate?: string;
  targetValue?: number;
  currentValue?: number;
  customParameters?: Record<string, any>;
  rewards: {
    points: number;
    badges: string[];
    coupons: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface DogSubscription {
  id: string;
  dogId: string;
  productId: string;
  status: 'attivo' | 'pausato' | 'cancellato' | 'scaduto';
  frequency: 'settimanale' | 'bisettimanale' | 'mensile' | 'bimestrale';
  nextDelivery: string;
  quantity: number;
  customizations: {
    dosage?: number;
    preferences?: string[];
    notes?: string;
  };
  addressOverride?: {
    street: string;
    city: string;
    province: string;
    zipCode: string;
  };
  priceOverride?: number;
  discountCode?: string;
  autoRenew: boolean;
  createdAt: string;
  updatedAt: string;
}

// Utility types
export type DogProfileTab = 'info' | 'salute' | 'libretto' | 'routine' | 'veterinari' | 'album' | 'missioni';

export interface DogDashboardStats {
  totalDogs: number;
  activeSubscriptions: number;
  pendingVaccinations: number;
  completedMissions: number;
  healthAlerts: number;
}

export interface DogNutritionalNeeds {
  dogId: string;
  dailyCalories: number;
  dailyAmount: {
    dry: number; // grams
    wet: number; // grams
  };
  recommendedProducts: string[];
  supplementsNeeded: string[];
  allergensToAvoid: string[];
  notes: string[];
}

export interface WeightStatus {
  status: 'sottopeso' | 'peso_ideale' | 'sovrappeso' | 'obeso';
  color: 'red' | 'green' | 'yellow' | 'orange';
  message: string;
  recommendation?: string;
}