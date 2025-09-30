import { Request, Response } from 'express';
import { auth, db } from '../../config/firebase';
import { AuthenticatedRequest } from '../../middleware/auth';
import { logger } from '../../utils/logger';
import {
  RegisterUserSchema,
  LoginUserSchema,
  UpdateProfileSchema,
  GDPRExportSchema,
  GDPRConsentSchema,
  UserAnalyticsEvents,
  UserCTARegistry
} from './types';
import { z } from 'zod';
import { trackEvent } from '../../utils/analytics';

/**
 * Register new user with Firebase Auth and Firestore profile
 */
export const registerUser = async (req: Request, res: Response) => {
  try {
    // Validate request data
    const validatedData = RegisterUserSchema.parse(req.body);
    const { email, password, name, phone, gdprConsent, termsAccepted, privacyAccepted, marketingConsent } = validatedData;

    // Create Firebase Auth user
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: false
    });

    const userId = userRecord.uid;

    // Create user profile in Firestore
    const userProfile = {
      email,
      name,
      phone: phone || null,
      preferences: {
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        marketingEmails: marketingConsent,
        language: 'it',
        currency: 'EUR'
      },
      role: 'user',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      termsAcceptedAt: new Date(),
      privacyAcceptedAt: new Date()
    };

    await db.collection('users').doc(userId).set(userProfile);

    // Store GDPR consent
    const consentData = {
      ...gdprConsent,
      userId,
      consentDate: new Date(),
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown'
    };

    await db.collection('consentManagement').doc(userId).set(consentData);

    // Track analytics event
    await trackEvent({
      event: UserAnalyticsEvents.USER_REGISTER,
      userId,
      properties: {
        email,
        registrationMethod: 'email',
        marketingConsent,
        timestamp: new Date().toISOString()
      }
    });

    logger.info('User registered successfully', { userId, email });

    res.status(201).json({
      success: true,
      message: 'Utente registrato con successo',
      userId,
      user: {
        id: userId,
        email,
        name,
        role: 'user'
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Dati non validi',
        details: error.errors
      });
    }

    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({
        success: false,
        error: 'Email già registrata'
      });
    }

    logger.error('Error registering user:', error);
    res.status(500).json({
      success: false,
      error: 'Errore durante la registrazione'
    });
  }
};

/**
 * Login user with Firebase Auth
 */
export const loginUser = async (req: Request, res: Response) => {
  try {
    // Validate request data
    const validatedData = LoginUserSchema.parse(req.body);
    const { email } = validatedData;

    // Note: Firebase Auth login is handled client-side
    // This endpoint is for getting user data after Firebase Auth
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token di autenticazione richiesto'
      });
    }

    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get user profile from Firestore
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Profilo utente non trovato'
      });
    }

    const userData = userDoc.data();

    // Track analytics event
    await trackEvent({
      event: UserAnalyticsEvents.USER_LOGIN,
      userId,
      properties: {
        email: userData?.email,
        loginMethod: 'firebase_auth',
        timestamp: new Date().toISOString()
      }
    });

    logger.info('User logged in successfully', { userId, email: userData?.email });

    res.json({
      success: true,
      user: {
        id: userId,
        ...userData
      },
      token // Return the same token for client storage
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Dati non validi',
        details: error.errors
      });
    }

    logger.error('Error during login:', error);
    res.status(500).json({
      success: false,
      error: 'Errore durante l\'accesso'
    });
  }
};

/**
 * Get current user profile
 */
export const getUserProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Utente non autenticato'
      });
    }

    const userDoc = await db.collection('users').doc(req.user.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Profilo utente non trovato'
      });
    }

    const userData = userDoc.data();

    // Get GDPR consent data
    const consentDoc = await db.collection('consentManagement').doc(req.user.uid).get();
    const consentData = consentDoc.exists ? consentDoc.data() : null;

    res.json({
      success: true,
      user: {
        id: userDoc.id,
        ...userData,
        gdprConsent: consentData
      }
    });

  } catch (error) {
    logger.error('Error getting user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Errore nel caricamento del profilo'
    });
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Utente non autenticato'
      });
    }

    // Validate request data
    const validatedData = UpdateProfileSchema.parse(req.body);

    const updateData = {
      ...validatedData,
      updatedAt: new Date()
    };

    await db.collection('users').doc(req.user.uid).update(updateData);

    // Track analytics event
    await trackEvent({
      event: UserAnalyticsEvents.PROFILE_UPDATE,
      userId: req.user.uid,
      properties: {
        fieldsUpdated: Object.keys(validatedData),
        timestamp: new Date().toISOString()
      }
    });

    logger.info('User profile updated', { userId: req.user.uid });

    res.json({
      success: true,
      message: 'Profilo aggiornato con successo'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Dati non validi',
        details: error.errors
      });
    }

    logger.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Errore nell\'aggiornamento del profilo'
    });
  }
};

/**
 * Update GDPR consent preferences
 */
export const updateGDPRConsent = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Utente non autenticato'
      });
    }

    // Validate consent data
    const validatedConsent = GDPRConsentSchema.parse({
      ...req.body,
      consentDate: new Date(),
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown'
    });

    // Update consent in Firestore
    await db.collection('consentManagement').doc(req.user.uid).set({
      ...validatedConsent,
      userId: req.user.uid,
      updatedAt: new Date()
    }, { merge: true });

    // Track analytics event
    await trackEvent({
      event: UserAnalyticsEvents.GDPR_CONSENT_UPDATE,
      userId: req.user.uid,
      properties: {
        consentTypes: Object.keys(req.body),
        timestamp: new Date().toISOString()
      }
    });

    logger.info('GDPR consent updated', { userId: req.user.uid });

    res.json({
      success: true,
      message: 'Preferenze di consenso aggiornate'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Dati di consenso non validi',
        details: error.errors
      });
    }

    logger.error('Error updating GDPR consent:', error);
    res.status(500).json({
      success: false,
      error: 'Errore nell\'aggiornamento del consenso'
    });
  }
};

/**
 * Export user data (GDPR Article 15)
 */
export const exportUserData = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Utente non autenticato'
      });
    }

    const validatedOptions = GDPRExportSchema.parse(req.body);
    const userId = req.user.uid;
    const exportData: any = {
      exportDate: new Date().toISOString(),
      userId,
      format: validatedOptions.format
    };

    // Export user profile
    if (validatedOptions.includeProfile) {
      const userDoc = await db.collection('users').doc(userId).get();
      exportData.profile = userDoc.exists ? userDoc.data() : null;
    }

    // Export consent data
    const consentDoc = await db.collection('consentManagement').doc(userId).get();
    exportData.gdprConsent = consentDoc.exists ? consentDoc.data() : null;

    // Export dogs data if requested
    if (validatedOptions.includeDogs) {
      const dogsSnapshot = await db.collection('dogs').where('ownerId', '==', userId).get();
      exportData.dogs = dogsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    // Export orders if requested
    if (validatedOptions.includeOrders) {
      const ordersSnapshot = await db.collection('orders').where('userId', '==', userId).get();
      exportData.orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    // Export subscriptions if requested
    if (validatedOptions.includeSubscriptions) {
      const subsSnapshot = await db.collection('subscriptions').where('userId', '==', userId).get();
      exportData.subscriptions = subsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    // Track analytics event
    await trackEvent({
      event: UserAnalyticsEvents.GDPR_DATA_EXPORT,
      userId,
      properties: {
        exportOptions: validatedOptions,
        timestamp: new Date().toISOString()
      }
    });

    logger.info('User data exported', { userId, options: validatedOptions });

    res.json({
      success: true,
      message: 'Dati esportati con successo',
      data: exportData
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Opzioni di esportazione non valide',
        details: error.errors
      });
    }

    logger.error('Error exporting user data:', error);
    res.status(500).json({
      success: false,
      error: 'Errore nell\'esportazione dei dati'
    });
  }
};

/**
 * Delete user account (GDPR Article 17 - Right to be forgotten)
 */
export const deleteUserAccount = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Utente non autenticato'
      });
    }

    const userId = req.user.uid;

    // Create audit record before deletion
    await db.collection('auditLogs').add({
      action: 'account_deletion',
      userId,
      timestamp: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Delete user data from Firestore collections
    const batch = db.batch();

    // Delete user profile
    batch.delete(db.collection('users').doc(userId));

    // Delete consent data
    batch.delete(db.collection('consentManagement').doc(userId));

    // Delete user-specific data (dogs, orders, etc. will be handled by cleanup job)
    // Note: Some data might need to be retained for legal/business reasons

    await batch.commit();

    // Delete Firebase Auth user
    await auth.deleteUser(userId);

    // Track analytics event
    await trackEvent({
      event: UserAnalyticsEvents.ACCOUNT_DELETE,
      userId,
      properties: {
        timestamp: new Date().toISOString()
      }
    });

    logger.info('User account deleted', { userId });

    res.json({
      success: true,
      message: 'Account eliminato con successo'
    });

  } catch (error) {
    logger.error('Error deleting user account:', error);
    res.status(500).json({
      success: false,
      error: 'Errore nell\'eliminazione dell\'account'
    });
  }
};

/**
 * Legacy createUser function for backward compatibility
 * @deprecated Use registerUser instead
 */
export const createUser = registerUser;