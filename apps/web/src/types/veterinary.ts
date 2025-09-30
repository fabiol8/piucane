// Veterinary System Types - Complete Data Model

export interface Address {
  street: string
  zip: string
  city: string
  province: string
  region: string
  country: string
}

export interface GeoLocation {
  lat: number
  lng: number
  geohash?: string
}

export interface ContactInfo {
  label: string
  value: string
}

export interface OpeningHours {
  [day: string]: Array<{
    start: string // HH:mm format
    end: string
  }>
}

// Specialties Dictionary
export interface Specialty {
  key: string
  name: string
  description?: string
  icon?: string
}

export const SPECIALTIES: Record<string, Specialty> = {
  'internal_medicine': {
    key: 'internal_medicine',
    name: 'Medicina Interna',
    description: 'Diagnosi e cura delle malattie interne',
    icon: '🩺'
  },
  'orthopedics': {
    key: 'orthopedics',
    name: 'Ortopedia',
    description: 'Ossa, articolazioni e apparato locomotore',
    icon: '🦴'
  },
  'cardiology': {
    key: 'cardiology',
    name: 'Cardiologia',
    description: 'Cuore e sistema cardiovascolare',
    icon: '❤️'
  },
  'dermatology': {
    key: 'dermatology',
    name: 'Dermatologia',
    description: 'Pelle, pelo e allergie',
    icon: '🧴'
  },
  'ophthalmology': {
    key: 'ophthalmology',
    name: 'Oftalmologia',
    description: 'Occhi e vista',
    icon: '👁️'
  },
  'dentistry': {
    key: 'dentistry',
    name: 'Odontoiatria',
    description: 'Denti e igiene orale',
    icon: '🦷'
  },
  'surgery': {
    key: 'surgery',
    name: 'Chirurgia',
    description: 'Interventi chirurgici',
    icon: '🏥'
  },
  'emergency': {
    key: 'emergency',
    name: 'Pronto Soccorso',
    description: 'Emergenze e urgenze',
    icon: '🚑'
  },
  'diagnostics': {
    key: 'diagnostics',
    name: 'Diagnostica',
    description: 'Esami e diagnosi strumentale',
    icon: '🔬'
  },
  'nutrition': {
    key: 'nutrition',
    name: 'Nutrizione',
    description: 'Alimentazione e diete terapeutiche',
    icon: '🥗'
  },
  'behavior': {
    key: 'behavior',
    name: 'Comportamento',
    description: 'Educazione e problemi comportamentali',
    icon: '🐕‍🦺'
  },
  'reproduction': {
    key: 'reproduction',
    name: 'Riproduzione',
    description: 'Gravidanza, parto e sterilizzazione',
    icon: '👶'
  }
}

// Clinic Types
export interface ClinicType {
  key: string
  name: string
}

export const CLINIC_TYPES: Record<string, ClinicType> = {
  'clinic': { key: 'clinic', name: 'Ambulatorio' },
  'hospital': { key: 'hospital', name: 'Clinica' },
  'emergency': { key: 'emergency', name: 'Pronto Soccorso' },
  'university': { key: 'university', name: 'Università' },
  'lab': { key: 'lab', name: 'Laboratorio' }
}

// Clinic/Structure Model
export interface Clinic {
  id: string
  legalName: string
  displayName: string
  typeRef: string
  parentClinicId?: string
  branches?: string[]
  address: Address
  geo: GeoLocation
  phones: ContactInfo[]
  emails: ContactInfo[]
  website?: string
  openingHours?: OpeningHours
  emergency24h: boolean
  services: string[] // specialty keys
  acceptsNewPatients?: boolean
  accessibility?: {
    parking: boolean
    stepFree: boolean
    publicTransport?: boolean
  }
  rating?: {
    avg: number
    count: number
  }
  verified: boolean
  status: 'active' | 'closed' | 'pending'
  lastSyncedAt?: Date
  createdAt: Date
  updatedAt: Date
}

// Veterinarian Model
export interface Veterinarian {
  id: string
  firstName: string
  lastName: string
  fullName: string
  registrationNumber?: string
  specialties: string[] // specialty keys
  languages?: string[]
  contacts?: {
    phoneE164?: string
    email?: string
    website?: string
  }
  bio?: string
  experience?: {
    yearsOfPractice?: number
    education?: string[]
    certifications?: string[]
  }
  profileImage?: string
  notes?: string
  status: 'active' | 'retired' | 'suspended'
  createdAt: Date
  updatedAt: Date
}

// Vet-Clinic Affiliation Model
export interface VetAffiliation {
  id: string
  vetId: string
  clinicId: string
  roleAtClinic: 'staff' | 'owner' | 'external' | 'consultant'
  specialtiesAtClinic: string[]
  openingHours?: OpeningHours
  telemedicine?: boolean
  acceptsNewPatients?: boolean
  consultationFee?: {
    min?: number
    max?: number
    currency: string
  }
  notes?: string
  active: boolean
  startDate?: Date
  endDate?: Date
  createdAt: Date
  updatedAt: Date
}

// Dog-Vet Link Model (the relationship between a dog and a vet/clinic)
export interface DogVetLink {
  id: string
  dogId: string
  vetId?: string // optional for emergency-only links
  clinicId: string
  role: 'primary' | 'specialist' | 'emergency'
  specialtyId?: string // required if role='specialist'
  startAt?: Date
  endAt?: Date
  isPreferred?: boolean // for multiple specialists in same specialty
  notes?: string
  addedBy?: string // userId who added this link
  createdAt: Date
  updatedAt: Date
}

// Visit Model (Digital Health Record)
export interface DogVisit {
  id: string
  dogId: string
  date: Date
  clinicId: string
  vetId?: string
  specialtyId?: string
  type: 'checkup' | 'vaccination' | 'emergency' | 'surgery' | 'followup' | 'consultation' | 'diagnostic'
  summary: string
  diagnosis?: string
  treatment?: string
  medications?: Array<{
    name: string
    dosage?: string
    frequency?: string
    duration?: string
    notes?: string
  }>
  nextVisitDue?: Date
  attachments?: Array<{
    id: string
    fileName: string
    originalName: string
    mimeType: string
    size: number
    storagePath: string
    category: 'report' | 'xray' | 'blood_test' | 'prescription' | 'invoice' | 'photo' | 'other'
    uploadedAt: Date
  }>
  cost?: {
    consultation?: number
    procedures?: number
    medications?: number
    total: number
    currency: string
    paid: boolean
    paidAt?: Date
  }
  weight?: number // weight at time of visit
  temperature?: number
  heartRate?: number
  respirationRate?: number
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  createdAt: Date
  updatedAt: Date
}

// Appointment Model
export interface Appointment {
  id: string
  dogId: string
  vetId?: string
  clinicId: string
  specialtyId?: string
  dateStart: Date
  dateEnd?: Date
  type: 'checkup' | 'control' | 'followup' | 'exam' | 'vaccination' | 'surgery' | 'emergency'
  title?: string
  notes?: string
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  reminders: Array<{
    channel: 'push' | 'email' | 'whatsapp' | 'sms'
    offset: string // e.g., '-24h', '-2h', '-30m'
    sent?: boolean
    sentAt?: Date
  }>
  reminderSettings?: {
    enabled: boolean
    channels: ('push' | 'email' | 'whatsapp' | 'sms')[]
    offsets: string[]
  }
  createdBy?: string // userId
  createdAt: Date
  updatedAt: Date
}

// Clinic Offers Model (for promotions and discounts)
export interface ClinicOffer {
  id: string
  clinicId: string
  title: string
  description: string
  promoType: 'discount' | 'coupon' | 'package' | 'free_service'
  value: {
    percentage?: number
    fixed?: number
    couponCode?: string
    currency?: string
  }
  serviceTargets?: string[] // specialty keys
  conditions?: {
    firstVisitOnly?: boolean
    newPatientsOnly?: boolean
    minAge?: number
    maxAge?: number
    breeds?: string[]
  }
  validFrom: Date
  validTo: Date
  maxRedemptions?: number
  currentRedemptions?: number
  termsUrl?: string
  priorityOrganicBoost?: number // 0-1 boost for organic ranking
  status: 'draft' | 'active' | 'paused' | 'expired'
  createdBy?: string
  createdAt: Date
  updatedAt: Date
}

// Ad Campaign Model (for paid advertising)
export interface AdCampaign {
  id: string
  advertiserType: 'clinic' | 'network' | 'corporate'
  clinicId?: string
  campaignName: string
  target: {
    geo: {
      regions?: string[]
      provinces?: string[]
      cities?: string[]
      radiusKm?: number
      center?: GeoLocation
    }
    specialties?: string[]
    keywords?: string[]
    demographics?: {
      dogAgeMin?: number
      dogAgeMax?: number
      breeds?: string[]
    }
  }
  bidCpc: number // cost per click in euros
  dailyBudget: number
  totalBudget?: number
  maxCpm?: number
  startAt: Date
  endAt: Date
  schedule?: {
    daysOfWeek: number[] // 1-7, Monday=1
    hours: Array<{ start: string; end: string }>
  }
  creative: {
    headline: string
    body: string
    badge: string // usually "Sponsorizzato"
    imageUrl?: string
    ctaText?: string
    deeplink?: string
  }
  landingClinicId: string
  status: 'active' | 'paused' | 'exhausted' | 'ended' | 'rejected'
  pacing: 'even' | 'asap'
  performance?: {
    impressions: number
    clicks: number
    spend: number
    ctr: number
    avgCpc: number
    conversions: number
  }
  approvedAt?: Date
  createdBy?: string
  createdAt: Date
  updatedAt: Date
}

// Search Result Model
export interface ClinicSearchResult {
  clinicId: string
  displayName: string
  address: Address
  distanceKm?: number
  services: string[]
  emergency24h: boolean
  openNow: boolean
  rating?: {
    avg: number
    count: number
  }
  verified: boolean
  badge?: string // e.g., "Sponsorizzato"
  offer?: {
    title: string
    description?: string
    validTo: Date
  }
  rankScore: number
  contact: {
    phone?: string
    website?: string
  }
  // Computed fields
  availableVets?: Array<{
    vetId: string
    fullName: string
    specialties: string[]
  }>
}

// Search Filters
export interface SearchFilters {
  location?: {
    lat: number
    lng: number
    radiusKm?: number
  } | {
    city?: string
    province?: string
    region?: string
  }
  services?: string[]
  emergency24h?: boolean
  openNow?: boolean
  acceptsNewPatients?: boolean
  verified?: boolean
  hasOffers?: boolean
  sort?: 'rank' | 'distance' | 'rating' | 'alphabetical'
  limit?: number
  cursor?: string
}

// Analytics Events
export interface VeterinaryAnalyticsEvents {
  vet_search: {
    query?: string
    lat?: number
    lng?: number
    radius?: number
    filters?: string[]
    results_count: number
  }
  vet_result_view: {
    clinic_id: string
    position: number
    sponsored?: boolean
    distance_km?: number
  }
  vet_result_click: {
    clinic_id: string
    sponsored?: boolean
    action: 'details' | 'call' | 'directions' | 'website'
  }
  vet_linked: {
    dog_id: string
    vet_id?: string
    clinic_id: string
    role: 'primary' | 'specialist' | 'emergency'
    specialty?: string
  }
  emergency_open: {
    clinic_id: string
    distance_km?: number
    response_time?: 'immediate' | 'call_first'
  }
  appointment_created: {
    dog_id: string
    clinic_id: string
    vet_id?: string
    specialty?: string
    appointment_type: string
    days_in_advance: number
  }
  visit_added: {
    visit_id: string
    clinic_id: string
    specialty?: string
    attachments_count: number
    has_cost_info: boolean
  }
  offer_view: {
    offer_id: string
    clinic_id: string
    offer_type: string
  }
  offer_redeem_click: {
    offer_id: string
    clinic_id: string
    dog_id: string
  }
}

// API Response Types
export interface SearchResponse {
  results: ClinicSearchResult[]
  total: number
  hasMore: boolean
  nextCursor?: string
  searchTime: number
  filters: SearchFilters
}

export interface DogVetsResponse {
  primary?: {
    link: DogVetLink
    vet?: Veterinarian
    clinic: Clinic
    affiliation?: VetAffiliation
  }
  specialists: Array<{
    link: DogVetLink
    vet?: Veterinarian
    clinic: Clinic
    affiliation?: VetAffiliation
    specialty: Specialty
  }>
  emergency: Array<{
    link: DogVetLink
    vet?: Veterinarian
    clinic: Clinic
  }>
}

// Complex Search Query Builder
export interface SearchQueryBuilder {
  nearMe(lat: number, lng: number, radiusKm?: number): SearchQueryBuilder
  inCity(city: string): SearchQueryBuilder
  inProvince(province: string): SearchQueryBuilder
  withService(service: string): SearchQueryBuilder
  withServices(services: string[]): SearchQueryBuilder
  emergencyOnly(): SearchQueryBuilder
  openNow(): SearchQueryBuilder
  acceptingNewPatients(): SearchQueryBuilder
  verifiedOnly(): SearchQueryBuilder
  withOffers(): SearchQueryBuilder
  sortBy(sort: 'rank' | 'distance' | 'rating'): SearchQueryBuilder
  limit(count: number): SearchQueryBuilder
  build(): SearchFilters
}

// Utility Types
export type ClinicRole = 'primary' | 'specialist' | 'emergency'
export type VisitType = 'checkup' | 'vaccination' | 'emergency' | 'surgery' | 'followup' | 'consultation' | 'diagnostic'
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
export type VetStatus = 'active' | 'retired' | 'suspended'
export type ClinicStatus = 'active' | 'closed' | 'pending'