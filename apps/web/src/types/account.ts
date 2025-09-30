/**
 * Account and User Profile Types for PiùCane Platform
 */

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  dateOfBirth?: string;
  address: UserAddress;
  preferences: UserPreferences;
  loyaltyPoints: number;
  membershipTier: 'basic' | 'silver' | 'gold' | 'platinum';
  createdAt: string;
  updatedAt: string;
}

export interface UserAddress {
  id: string;
  type: 'home' | 'work' | 'other';
  isDefault: boolean;
  firstName: string;
  lastName: string;
  company?: string;
  street: string;
  streetNumber: string;
  city: string;
  province: string;
  zipCode: string;
  country: string;
  phone?: string;
  notes?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface UserPreferences {
  language: 'it' | 'en' | 'es' | 'fr';
  currency: 'EUR' | 'USD' | 'GBP';
  timezone: string;
  units: {
    weight: 'kg' | 'lb';
    temperature: 'celsius' | 'fahrenheit';
  };
  communications: CommunicationPreferences;
  accessibility: AccessibilityPreferences;
  privacy: PrivacySettings;
}

export interface CommunicationPreferences {
  email: {
    newsletters: boolean;
    promotions: boolean;
    orderUpdates: boolean;
    healthReminders: boolean;
    productRecommendations: boolean;
    veterinaryNotifications: boolean;
  };
  push: {
    enabled: boolean;
    orderUpdates: boolean;
    healthReminders: boolean;
    missionsUpdates: boolean;
    chatNotifications: boolean;
    emergencyAlerts: boolean;
  };
  sms: {
    enabled: boolean;
    orderUpdates: boolean;
    emergencyAlerts: boolean;
    reminderAlerts: boolean;
  };
  whatsapp: {
    enabled: boolean;
    orderUpdates: boolean;
    healthReminders: boolean;
    customerService: boolean;
  };
}

export interface AccessibilityPreferences {
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  contrast: 'normal' | 'high';
  reducedMotion: boolean;
  screenReaderMode: boolean;
  keyboardNavigation: boolean;
  colorBlindness: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';
}

export interface PrivacySettings {
  dataProcessing: {
    essential: boolean; // always true, cannot be disabled
    analytics: boolean;
    marketing: boolean;
    personalization: boolean;
    thirdParty: boolean;
  };
  profileVisibility: 'private' | 'friends' | 'public';
  dataSharing: {
    veterinarians: boolean;
    partners: boolean;
    research: boolean;
  };
  cookies: {
    essential: boolean; // always true
    analytics: boolean;
    marketing: boolean;
    preferences: boolean;
  };
  dataRetention: {
    accountData: 'indefinite' | '1year' | '3years' | '5years';
    healthData: 'indefinite' | '1year' | '3years' | '5years';
    communicationData: 'indefinite' | '6months' | '1year' | '2years';
  };
}

export interface NotificationSettings {
  id: string;
  userId: string;
  categories: {
    orders: NotificationCategory;
    health: NotificationCategory;
    missions: NotificationCategory;
    social: NotificationCategory;
    marketing: NotificationCategory;
    system: NotificationCategory;
  };
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string; // HH:mm format
    timezone: string;
  };
  frequency: {
    digest: 'never' | 'daily' | 'weekly' | 'monthly';
    immediate: boolean;
    batched: boolean;
  };
  updatedAt: string;
}

export interface NotificationCategory {
  email: boolean;
  push: boolean;
  sms: boolean;
  whatsapp: boolean;
  inApp: boolean;
}

export interface SecuritySettings {
  id: string;
  userId: string;
  twoFactorAuth: {
    enabled: boolean;
    method: 'sms' | 'email' | 'app';
    backupCodes: string[];
    lastUsed?: string;
  };
  sessions: UserSession[];
  loginAlerts: boolean;
  passwordLastChanged: string;
  securityQuestions: SecurityQuestion[];
  trustedDevices: TrustedDevice[];
  dataDownloads: DataDownload[];
  updatedAt: string;
}

export interface UserSession {
  id: string;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  browser: string;
  os: string;
  ip: string;
  location?: string;
  isActive: boolean;
  lastActivity: string;
  createdAt: string;
}

export interface SecurityQuestion {
  id: string;
  question: string;
  answerHash: string; // hashed answer
  isActive: boolean;
  createdAt: string;
}

export interface TrustedDevice {
  id: string;
  name: string;
  type: 'mobile' | 'desktop' | 'tablet';
  fingerprint: string;
  lastUsed: string;
  isActive: boolean;
  createdAt: string;
}

export interface DataDownload {
  id: string;
  type: 'full' | 'profile' | 'orders' | 'health' | 'communications';
  status: 'requested' | 'processing' | 'ready' | 'downloaded' | 'expired';
  requestedAt: string;
  readyAt?: string;
  downloadUrl?: string;
  expiresAt?: string;
  fileSize?: number;
  format: 'json' | 'csv' | 'pdf';
}

export interface AccountStats {
  userId: string;
  joinDate: string;
  totalOrders: number;
  totalSpent: number;
  loyaltyPoints: {
    current: number;
    lifetime: number;
    redeemed: number;
  };
  dogsRegistered: number;
  subscriptionsActive: number;
  missionsCompleted: number;
  reviewsWritten: number;
  referralsSent: number;
  lastActivity: string;
}

// Form interfaces for settings updates
export interface ProfileUpdateForm {
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  avatar?: File;
}

export interface AddressUpdateForm {
  type: 'home' | 'work' | 'other';
  firstName: string;
  lastName: string;
  company?: string;
  street: string;
  streetNumber: string;
  city: string;
  province: string;
  zipCode: string;
  country: string;
  phone?: string;
  notes?: string;
  isDefault: boolean;
}

export interface PasswordUpdateForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface PreferencesUpdateForm {
  language?: 'it' | 'en' | 'es' | 'fr';
  currency?: 'EUR' | 'USD' | 'GBP';
  timezone?: string;
  units?: {
    weight: 'kg' | 'lb';
    temperature: 'celsius' | 'fahrenheit';
  };
}

// API response types
export interface AccountResponse {
  user: UserProfile;
  stats: AccountStats;
  security: SecuritySettings;
  notifications: NotificationSettings;
}

export interface AccountUpdateResponse {
  success: boolean;
  message: string;
  updatedFields: string[];
  user?: UserProfile;
}