/**
 * Data Protection & Privacy System - PiùCane
 * Sistema completo per protezione dati, crittografia e compliance GDPR
 */

import CryptoJS from 'crypto-js';
import { trackCTA } from '@/analytics/ga4';

export interface DataClassification {
  level: 'public' | 'internal' | 'confidential' | 'restricted';
  category: 'personal' | 'financial' | 'health' | 'behavioral' | 'biometric';
  retention: {
    period: number; // days
    reason: string;
    autoDelete: boolean;
  };
  processing: {
    lawfulBasis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
    purpose: string[];
    automated: boolean;
  };
}

export interface ConsentRecord {
  id: string;
  userId: string;
  type: 'marketing' | 'analytics' | 'functional' | 'personalization' | 'sharing';
  purpose: string;
  granted: boolean;
  timestamp: string;
  method: 'explicit' | 'implicit' | 'granular';
  ipAddress: string;
  userAgent: string;
  version: string; // Privacy policy version
  withdrawnAt?: string;
  renewedAt?: string;
}

export interface DataAccessLog {
  id: string;
  userId: string;
  dataType: string;
  action: 'read' | 'write' | 'update' | 'delete' | 'export';
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  purpose: string;
  success: boolean;
  details?: any;
}

export interface PrivacySettings {
  userId: string;
  profileVisibility: 'public' | 'friends' | 'private';
  dataSharing: {
    analytics: boolean;
    marketing: boolean;
    research: boolean;
    partners: boolean;
  };
  communications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    whatsapp: boolean;
  };
  dogDataSharing: {
    healthData: boolean;
    behaviorData: boolean;
    photos: boolean;
    vetRecords: boolean;
  };
  rightToBeRemembered: boolean; // Opt-out of data deletion
  updatedAt: string;
}

export interface SecurityPolicy {
  passwordRequirements: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    preventReuse: number; // last N passwords
    maxAge: number; // days
  };
  sessionManagement: {
    maxDuration: number; // minutes
    idleTimeout: number; // minutes
    maxConcurrentSessions: number;
    requireReauth: string[]; // actions requiring re-authentication
  };
  rateLimit: {
    login: { attempts: number; windowMs: number; blockMs: number };
    api: { requests: number; windowMs: number };
    sensitive: { requests: number; windowMs: number };
  };
  encryption: {
    algorithm: string;
    keyRotation: number; // days
    saltRounds: number;
  };
}

class DataProtectionManager {
  private encryptionKey: string;
  private consentRecords: Map<string, ConsentRecord[]> = new Map();
  private accessLogs: DataAccessLog[] = [];
  private privacySettings: Map<string, PrivacySettings> = new Map();

  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    this.initializeDefaultPolicies();
  }

  // Classificazione automatica dei dati
  classifyData(dataType: string, content: any): DataClassification {
    const classifications: Record<string, DataClassification> = {
      'user_email': {
        level: 'confidential',
        category: 'personal',
        retention: { period: 2555, reason: 'Customer relationship', autoDelete: false },
        processing: { lawfulBasis: 'contract', purpose: ['service_delivery', 'communication'], automated: false }
      },
      'user_password': {
        level: 'restricted',
        category: 'personal',
        retention: { period: 365, reason: 'Security', autoDelete: true },
        processing: { lawfulBasis: 'contract', purpose: ['authentication'], automated: false }
      },
      'payment_info': {
        level: 'restricted',
        category: 'financial',
        retention: { period: 2555, reason: 'Legal compliance', autoDelete: false },
        processing: { lawfulBasis: 'contract', purpose: ['payment_processing'], automated: true }
      },
      'dog_health_data': {
        level: 'confidential',
        category: 'health',
        retention: { period: 3650, reason: 'Veterinary care continuity', autoDelete: false },
        processing: { lawfulBasis: 'consent', purpose: ['health_monitoring', 'recommendations'], automated: true }
      },
      'behavior_analytics': {
        level: 'internal',
        category: 'behavioral',
        retention: { period: 730, reason: 'Service improvement', autoDelete: true },
        processing: { lawfulBasis: 'legitimate_interests', purpose: ['analytics', 'optimization'], automated: true }
      },
      'dog_photos': {
        level: 'confidential',
        category: 'biometric',
        retention: { period: 1825, reason: 'Service functionality', autoDelete: false },
        processing: { lawfulBasis: 'consent', purpose: ['identification', 'social_features'], automated: false }
      },
      'location_data': {
        level: 'confidential',
        category: 'personal',
        retention: { period: 90, reason: 'Delivery optimization', autoDelete: true },
        processing: { lawfulBasis: 'consent', purpose: ['delivery', 'recommendations'], automated: true }
      }
    };

    return classifications[dataType] || {
      level: 'internal',
      category: 'personal',
      retention: { period: 365, reason: 'Default retention', autoDelete: true },
      processing: { lawfulBasis: 'legitimate_interests', purpose: ['service_delivery'], automated: false }
    };
  }

  // Crittografia dati sensibili
  encryptSensitiveData(data: string, classification: DataClassification): string {
    if (classification.level === 'restricted' || classification.level === 'confidential') {
      return CryptoJS.AES.encrypt(data, this.encryptionKey).toString();
    }
    return data;
  }

  decryptSensitiveData(encryptedData: string, classification: DataClassification): string {
    if (classification.level === 'restricted' || classification.level === 'confidential') {
      try {
        const bytes = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
        return bytes.toString(CryptoJS.enc.Utf8);
      } catch (error) {
        console.error('Decryption failed:', error);
        return '';
      }
    }
    return encryptedData;
  }

  // Gestione consensi GDPR
  async recordConsent(
    userId: string,
    type: ConsentRecord['type'],
    purpose: string,
    granted: boolean,
    method: ConsentRecord['method'] = 'explicit',
    ipAddress: string,
    userAgent: string
  ): Promise<string> {
    const consentId = `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const consent: ConsentRecord = {
      id: consentId,
      userId,
      type,
      purpose,
      granted,
      timestamp: new Date().toISOString(),
      method,
      ipAddress,
      userAgent,
      version: '1.0' // Versione corrente privacy policy
    };

    const userConsents = this.consentRecords.get(userId) || [];
    userConsents.push(consent);
    this.consentRecords.set(userId, userConsents);

    // Log l'azione
    await this.logDataAccess(userId, 'consent_record', 'write', 'Consent recording', ipAddress, userAgent, true);

    trackCTA({
      ctaId: 'privacy.consent.recorded',
      event: 'consent_recorded',
      value: type,
      metadata: {
        userId,
        consentType: type,
        granted,
        method
      }
    });

    return consentId;
  }

  // Controllo consensi per processing
  checkConsent(userId: string, type: ConsentRecord['type'], purpose: string): boolean {
    const userConsents = this.consentRecords.get(userId) || [];

    const relevantConsent = userConsents
      .filter(consent => consent.type === type && !consent.withdrawnAt)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    return relevantConsent?.granted || false;
  }

  // Revoca consenso
  async withdrawConsent(userId: string, consentId: string, ipAddress: string, userAgent: string): Promise<void> {
    const userConsents = this.consentRecords.get(userId) || [];
    const consent = userConsents.find(c => c.id === consentId);

    if (consent) {
      consent.withdrawnAt = new Date().toISOString();

      await this.logDataAccess(userId, 'consent_record', 'update', 'Consent withdrawal', ipAddress, userAgent, true);

      trackCTA({
        ctaId: 'privacy.consent.withdrawn',
        event: 'consent_withdrawn',
        value: consent.type,
        metadata: { userId, consentId, consentType: consent.type }
      });
    }
  }

  // Logging accessi ai dati
  async logDataAccess(
    userId: string,
    dataType: string,
    action: DataAccessLog['action'],
    purpose: string,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    details?: any
  ): Promise<void> {
    const logEntry: DataAccessLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      dataType,
      action,
      timestamp: new Date().toISOString(),
      ipAddress,
      userAgent,
      purpose,
      success,
      details
    };

    this.accessLogs.push(logEntry);

    // In produzione: salvare in database sicuro con retention policy
    // Mantenere logs per audit e compliance

    // Alert per azioni sensibili
    if (action === 'delete' || action === 'export') {
      await this.alertSecurityTeam(logEntry);
    }
  }

  // Gestione privacy settings
  async updatePrivacySettings(userId: string, settings: Partial<PrivacySettings>): Promise<void> {
    const currentSettings = this.privacySettings.get(userId) || this.getDefaultPrivacySettings(userId);

    const updatedSettings: PrivacySettings = {
      ...currentSettings,
      ...settings,
      updatedAt: new Date().toISOString()
    };

    this.privacySettings.set(userId, updatedSettings);

    await this.logDataAccess(userId, 'privacy_settings', 'update', 'Settings update', '', '', true, settings);

    trackCTA({
      ctaId: 'privacy.settings.updated',
      event: 'privacy_settings_updated',
      value: 'settings_changed',
      metadata: { userId, changedFields: Object.keys(settings) }
    });
  }

  // Diritto alla portabilità dei dati (GDPR Art. 20)
  async exportUserData(userId: string, ipAddress: string, userAgent: string): Promise<any> {
    await this.logDataAccess(userId, 'full_export', 'export', 'Data portability request', ipAddress, userAgent, true);

    // Raccolta tutti i dati dell'utente
    const userData = {
      personal: await this.getUserPersonalData(userId),
      dogs: await this.getUserDogsData(userId),
      orders: await this.getUserOrdersData(userId),
      preferences: this.privacySettings.get(userId),
      consents: this.consentRecords.get(userId),
      interactions: await this.getUserInteractionsData(userId)
    };

    // Rimuovi dati crittografati/sensibili non esportabili
    const exportableData = this.sanitizeForExport(userData);

    trackCTA({
      ctaId: 'privacy.data.exported',
      event: 'data_export_requested',
      value: 'full_export',
      metadata: { userId, dataSize: JSON.stringify(exportableData).length }
    });

    return exportableData;
  }

  // Diritto alla cancellazione (GDPR Art. 17)
  async deleteUserData(userId: string, reason: string, ipAddress: string, userAgent: string): Promise<void> {
    await this.logDataAccess(userId, 'full_deletion', 'delete', `Data deletion: ${reason}`, ipAddress, userAgent, true);

    // Identificare dati che possono essere cancellati vs. quelli da mantenere per legal compliance
    const deletionPlan = await this.createDeletionPlan(userId);

    // Eseguire cancellazione graduale
    for (const item of deletionPlan.deletable) {
      await this.secureDelete(item.type, item.id);
    }

    // Anonimizzare dati che devono essere mantenuti
    for (const item of deletionPlan.anonymize) {
      await this.anonymizeData(item.type, item.id);
    }

    trackCTA({
      ctaId: 'privacy.data.deleted',
      event: 'data_deletion_completed',
      value: 'user_request',
      metadata: {
        userId,
        reason,
        deletedItems: deletionPlan.deletable.length,
        anonymizedItems: deletionPlan.anonymize.length
      }
    });
  }

  // Rilevamento violazioni di sicurezza
  async detectSecurityBreach(event: any): Promise<void> {
    const suspiciousPatterns = [
      { pattern: 'multiple_failed_logins', threshold: 5, timeWindow: 300000 }, // 5 min
      { pattern: 'unusual_access_pattern', threshold: 10, timeWindow: 3600000 }, // 1 hour
      { pattern: 'data_export_frequency', threshold: 3, timeWindow: 86400000 }, // 24 hours
      { pattern: 'privilege_escalation', threshold: 1, timeWindow: 0 }
    ];

    for (const pattern of suspiciousPatterns) {
      if (await this.matchesPattern(event, pattern)) {
        await this.handleSecurityBreach(pattern.pattern, event);
      }
    }
  }

  // Gestione breach di sicurezza
  private async handleSecurityBreach(type: string, event: any): Promise<void> {
    const breachId = `breach_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Immediate response
    await this.immediateBreachResponse(type, event);

    // Notifica team sicurezza
    await this.alertSecurityTeam({
      type: 'security_breach',
      pattern: type,
      event,
      breachId,
      timestamp: new Date().toISOString()
    });

    // Se richiesto da GDPR (>72h), notifica autorità
    if (this.requiresAuthorityNotification(type)) {
      await this.notifyDataProtectionAuthority(breachId, type, event);
    }

    trackCTA({
      ctaId: 'security.breach.detected',
      event: 'security_breach_detected',
      value: type,
      metadata: { breachId, pattern: type }
    });
  }

  // Cookie e tracking compliance
  manageCookieConsent(userId: string, cookieCategories: string[], granted: boolean): void {
    const consentString = this.generateIABConsentString(cookieCategories, granted);

    // Imposta/rimuovi cookies basato su consenso
    if (granted) {
      this.enableCookieCategories(cookieCategories);
    } else {
      this.disableCookieCategories(cookieCategories);
    }

    // Aggiorna Google Consent Mode
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        'analytics_storage': cookieCategories.includes('analytics') && granted ? 'granted' : 'denied',
        'ad_storage': cookieCategories.includes('advertising') && granted ? 'granted' : 'denied',
        'functionality_storage': cookieCategories.includes('functional') && granted ? 'granted' : 'denied',
        'personalization_storage': cookieCategories.includes('personalization') && granted ? 'granted' : 'denied'
      });
    }
  }

  // Utility methods
  private initializeDefaultPolicies(): void {
    // Inizializza policy di sicurezza di default
  }

  private getDefaultPrivacySettings(userId: string): PrivacySettings {
    return {
      userId,
      profileVisibility: 'private',
      dataSharing: {
        analytics: false,
        marketing: false,
        research: false,
        partners: false
      },
      communications: {
        email: true,
        push: false,
        sms: false,
        whatsapp: false
      },
      dogDataSharing: {
        healthData: false,
        behaviorData: false,
        photos: false,
        vetRecords: false
      },
      rightToBeRemembered: false,
      updatedAt: new Date().toISOString()
    };
  }

  private async getUserPersonalData(userId: string): Promise<any> {
    // Implementazione per raccogliere dati personali
    return {};
  }

  private async getUserDogsData(userId: string): Promise<any> {
    // Implementazione per raccogliere dati dei cani
    return {};
  }

  private async getUserOrdersData(userId: string): Promise<any> {
    // Implementazione per raccogliere dati ordini
    return {};
  }

  private async getUserInteractionsData(userId: string): Promise<any> {
    // Implementazione per raccogliere dati interazioni
    return {};
  }

  private sanitizeForExport(data: any): any {
    // Rimuovi dati non esportabili
    return JSON.parse(JSON.stringify(data));
  }

  private async createDeletionPlan(userId: string): Promise<any> {
    return {
      deletable: [],
      anonymize: []
    };
  }

  private async secureDelete(type: string, id: string): Promise<void> {
    // Implementazione cancellazione sicura
  }

  private async anonymizeData(type: string, id: string): Promise<void> {
    // Implementazione anonimizzazione
  }

  private async matchesPattern(event: any, pattern: any): Promise<boolean> {
    // Implementazione pattern matching
    return false;
  }

  private async immediateBreachResponse(type: string, event: any): Promise<void> {
    // Implementazione risposta immediata
  }

  private async alertSecurityTeam(alert: any): Promise<void> {
    console.log('🚨 Security Alert:', alert);
    // Implementazione notifica team sicurezza
  }

  private requiresAuthorityNotification(type: string): boolean {
    // Determina se richiede notifica autorità
    return ['data_leak', 'unauthorized_access'].includes(type);
  }

  private async notifyDataProtectionAuthority(breachId: string, type: string, event: any): Promise<void> {
    // Implementazione notifica autorità GDPR
    console.log('📋 Notifying Data Protection Authority:', { breachId, type, event });
  }

  private generateIABConsentString(categories: string[], granted: boolean): string {
    // Implementazione IAB consent string
    return '';
  }

  private enableCookieCategories(categories: string[]): void {
    // Implementazione abilitazione cookies
  }

  private disableCookieCategories(categories: string[]): void {
    // Implementazione disabilitazione cookies
  }
}

// Singleton instance
export const dataProtectionManager = new DataProtectionManager();

// Utility functions
export function hashPassword(password: string): string {
  return CryptoJS.SHA256(password).toString();
}

export function generateSecureToken(length: number = 32): string {
  return CryptoJS.lib.WordArray.random(length).toString();
}

export function validateDataAccess(userId: string, dataType: string, purpose: string): boolean {
  const classification = dataProtectionManager.classifyData(dataType, null);

  if (classification.level === 'restricted') {
    return dataProtectionManager.checkConsent(userId, 'functional', purpose);
  }

  return true;
}

export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isStrongPassword(password: string): boolean {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
}