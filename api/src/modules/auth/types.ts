import { z } from 'zod';

// User Profile Schema
export const UserProfileSchema = z.object({
  email: z.string().email('Email non valida'),
  name: z.string().min(2, 'Nome deve essere almeno 2 caratteri').max(50, 'Nome troppo lungo'),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().default('IT')
  }).optional(),
  preferences: z.object({
    emailNotifications: z.boolean().default(true),
    pushNotifications: z.boolean().default(true),
    smsNotifications: z.boolean().default(false),
    marketingEmails: z.boolean().default(false),
    language: z.enum(['it', 'en']).default('it'),
    currency: z.enum(['EUR', 'USD']).default('EUR')
  }).optional(),
  role: z.enum(['user', 'admin', 'super_admin']).default('user'),
  status: z.enum(['active', 'inactive', 'suspended']).default('active'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export const GDPRConsentSchema = z.object({
  necessary: z.boolean().default(true), // Always true for app functionality
  analytics: z.boolean().default(false),
  marketing: z.boolean().default(false),
  personalization: z.boolean().default(false),
  advertising: z.boolean().default(false),
  consentDate: z.date(),
  ipAddress: z.string(),
  userAgent: z.string(),
  version: z.string().default('1.0')
});

export const RegisterUserSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(8, 'Password deve essere almeno 8 caratteri'),
  name: z.string().min(2, 'Nome deve essere almeno 2 caratteri'),
  phone: z.string().optional(),
  gdprConsent: GDPRConsentSchema,
  termsAccepted: z.boolean().refine(val => val === true, 'Devi accettare i termini e condizioni'),
  privacyAccepted: z.boolean().refine(val => val === true, 'Devi accettare la privacy policy'),
  marketingConsent: z.boolean().optional().default(false)
});

export const LoginUserSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(1, 'Password richiesta')
});

export const UpdateProfileSchema = UserProfileSchema.partial().omit({
  email: true,
  role: true,
  createdAt: true
});

export const GDPRExportSchema = z.object({
  includeProfile: z.boolean().default(true),
  includeDogs: z.boolean().default(true),
  includeOrders: z.boolean().default(true),
  includeSubscriptions: z.boolean().default(true),
  includeMessages: z.boolean().default(true),
  includeAnalytics: z.boolean().default(false),
  format: z.enum(['json', 'csv']).default('json')
});

// Types
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type GDPRConsent = z.infer<typeof GDPRConsentSchema>;
export type RegisterUser = z.infer<typeof RegisterUserSchema>;
export type LoginUser = z.infer<typeof LoginUserSchema>;
export type UpdateProfile = z.infer<typeof UpdateProfileSchema>;
export type GDPRExport = z.infer<typeof GDPRExportSchema>;

// Analytics Events
export const UserAnalyticsEvents = {
  USER_REGISTER: 'user_register',
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  PROFILE_UPDATE: 'profile_update',
  GDPR_CONSENT_UPDATE: 'gdpr_consent_update',
  GDPR_DATA_EXPORT: 'gdpr_data_export',
  ACCOUNT_DELETE: 'account_delete'
} as const;

// CTA Registry
export const UserCTARegistry = {
  AUTH_LOGIN_BUTTON_CLICK: 'auth.login.button.click',
  AUTH_REGISTER_BUTTON_CLICK: 'auth.register.button.click',
  AUTH_LOGOUT_BUTTON_CLICK: 'auth.logout.button.click',
  PROFILE_EDIT_BUTTON_CLICK: 'profile.edit.button.click',
  PROFILE_SAVE_BUTTON_CLICK: 'profile.save.button.click',
  GDPR_CONSENT_UPDATE_CLICK: 'gdpr.consent.update.click',
  GDPR_EXPORT_REQUEST_CLICK: 'gdpr.export.request.click',
  ACCOUNT_DELETE_REQUEST_CLICK: 'account.delete.request.click'
} as const;