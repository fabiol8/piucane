import { Request, Response } from 'express';
import { auth, db } from '../../../config/firebase';
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  updateGDPRConsent,
  exportUserData,
  deleteUserAccount
} from '../controller';
import { trackEvent } from '../../../utils/analytics';
import { AuthenticatedRequest } from '../../../middleware/auth';

// Mock Firebase and external dependencies
jest.mock('../../../config/firebase', () => ({
  auth: {
    createUser: jest.fn(),
    verifyIdToken: jest.fn(),
    deleteUser: jest.fn()
  },
  db: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        set: jest.fn(),
        get: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      })),
      add: jest.fn(),
      where: jest.fn(() => ({
        get: jest.fn()
      }))
    })),
    batch: jest.fn(() => ({
      delete: jest.fn(),
      commit: jest.fn()
    }))
  }
}));

jest.mock('../../../utils/analytics', () => ({
  trackEvent: jest.fn()
}));

jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn()
  }
}));

const mockAuth = auth as jest.Mocked<typeof auth>;
const mockDb = db as any;
const mockTrackEvent = trackEvent as jest.MockedFunction<typeof trackEvent>;

describe('Auth Controller', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let authReq: Partial<AuthenticatedRequest>;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      body: {},
      headers: {},
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent')
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    authReq = {
      ...req,
      user: {
        uid: 'test-user-id',
        email: 'test@example.com',
        role: 'user'
      }
    };
  });

  describe('registerUser', () => {
    const validRegistrationData = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      phone: '+393123456789',
      gdprConsent: {
        necessary: true,
        analytics: false,
        marketing: false,
        personalization: false,
        advertising: false
      },
      termsAccepted: true,
      privacyAccepted: true,
      marketingConsent: false
    };

    it('should register user successfully', async () => {
      req.body = validRegistrationData;

      // Mock Firebase Auth user creation
      mockAuth.createUser.mockResolvedValue({
        uid: 'test-user-id',
        email: 'test@example.com'
      } as any);

      // Mock Firestore operations
      const mockUserDoc = { set: jest.fn().mockResolvedValue(undefined) };
      const mockConsentDoc = { set: jest.fn().mockResolvedValue(undefined) };

      mockDb.collection.mockImplementation((collectionName: string) => {
        if (collectionName === 'users') {
          return { doc: jest.fn().mockReturnValue(mockUserDoc) };
        }
        if (collectionName === 'consentManagement') {
          return { doc: jest.fn().mockReturnValue(mockConsentDoc) };
        }
        return { doc: jest.fn() };
      });

      mockTrackEvent.mockResolvedValue(undefined);

      await registerUser(req as Request, res as Response);

      expect(mockAuth.createUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test User',
        emailVerified: false
      });

      expect(mockUserDoc.set).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          name: 'Test User',
          phone: '+393123456789',
          role: 'user',
          status: 'active'
        })
      );

      expect(mockConsentDoc.set).toHaveBeenCalledWith(
        expect.objectContaining({
          necessary: true,
          analytics: false,
          marketing: false
        })
      );

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'user_register',
          userId: 'test-user-id'
        })
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Utente registrato con successo'
        })
      );
    });

    it('should return error for invalid data', async () => {
      req.body = { email: 'invalid-email' };

      await registerUser(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Dati non validi'
        })
      );
    });

    it('should handle email already exists error', async () => {
      req.body = validRegistrationData;

      mockAuth.createUser.mockRejectedValue({
        code: 'auth/email-already-exists'
      });

      await registerUser(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Email già registrata'
      });
    });
  });

  describe('loginUser', () => {
    it('should login user successfully', async () => {
      req.body = { email: 'test@example.com', password: 'password123' };
      req.headers = { authorization: 'Bearer test-token' };

      mockAuth.verifyIdToken.mockResolvedValue({
        uid: 'test-user-id',
        email: 'test@example.com'
      } as any);

      const mockUserDoc = {
        exists: true,
        data: jest.fn().mockReturnValue({
          email: 'test@example.com',
          name: 'Test User',
          role: 'user'
        })
      };

      mockDb.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockUserDoc)
        })
      });

      mockTrackEvent.mockResolvedValue(undefined);

      await loginUser(req as Request, res as Response);

      expect(mockAuth.verifyIdToken).toHaveBeenCalledWith('test-token');

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'user_login',
          userId: 'test-user-id'
        })
      );

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          user: expect.objectContaining({
            id: 'test-user-id',
            email: 'test@example.com'
          })
        })
      );
    });

    it('should return error when no token provided', async () => {
      req.body = { email: 'test@example.com', password: 'password123' };

      await loginUser(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token di autenticazione richiesto'
      });
    });
  });

  describe('getUserProfile', () => {
    it('should get user profile successfully', async () => {
      const mockUserDoc = {
        id: 'test-user-id',
        exists: true,
        data: jest.fn().mockReturnValue({
          email: 'test@example.com',
          name: 'Test User'
        })
      };

      const mockConsentDoc = {
        exists: true,
        data: jest.fn().mockReturnValue({
          necessary: true,
          analytics: false
        })
      };

      mockDb.collection.mockImplementation((collectionName: string) => {
        if (collectionName === 'users') {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue(mockUserDoc)
            })
          };
        }
        if (collectionName === 'consentManagement') {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue(mockConsentDoc)
            })
          };
        }
        return { doc: jest.fn() };
      });

      await getUserProfile(authReq as AuthenticatedRequest, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          gdprConsent: {
            necessary: true,
            analytics: false
          }
        }
      });
    });

    it('should return error when user not authenticated', async () => {
      delete authReq.user;

      await getUserProfile(authReq as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Utente non autenticato'
      });
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile successfully', async () => {
      authReq.body = {
        name: 'Updated Name',
        phone: '+393987654321'
      };

      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      mockDb.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue({
          update: mockUpdate
        })
      });

      mockTrackEvent.mockResolvedValue(undefined);

      await updateUserProfile(authReq as AuthenticatedRequest, res as Response);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Name',
          phone: '+393987654321',
          updatedAt: expect.any(Date)
        })
      );

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'profile_update',
          userId: 'test-user-id'
        })
      );

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profilo aggiornato con successo'
      });
    });
  });

  describe('updateGDPRConsent', () => {
    it('should update GDPR consent successfully', async () => {
      authReq.body = {
        necessary: true,
        analytics: true,
        marketing: false
      };

      const mockSet = jest.fn().mockResolvedValue(undefined);
      mockDb.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue({
          set: mockSet
        })
      });

      mockTrackEvent.mockResolvedValue(undefined);

      await updateGDPRConsent(authReq as AuthenticatedRequest, res as Response);

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          necessary: true,
          analytics: true,
          marketing: false,
          userId: 'test-user-id'
        }),
        { merge: true }
      );

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Preferenze di consenso aggiornate'
      });
    });
  });

  describe('exportUserData', () => {
    it('should export user data successfully', async () => {
      authReq.body = {
        includeProfile: true,
        includeDogs: true,
        includeOrders: false,
        format: 'json'
      };

      const mockUserDoc = {
        exists: true,
        data: jest.fn().mockReturnValue({ name: 'Test User' })
      };

      const mockConsentDoc = {
        exists: true,
        data: jest.fn().mockReturnValue({ necessary: true })
      };

      const mockDogsSnapshot = {
        docs: [
          {
            id: 'dog1',
            data: jest.fn().mockReturnValue({ name: 'Rex' })
          }
        ]
      };

      mockDb.collection.mockImplementation((collectionName: string) => {
        if (collectionName === 'users') {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue(mockUserDoc)
            })
          };
        }
        if (collectionName === 'consentManagement') {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue(mockConsentDoc)
            })
          };
        }
        if (collectionName === 'dogs') {
          return {
            where: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue(mockDogsSnapshot)
            })
          };
        }
        return { doc: jest.fn() };
      });

      mockTrackEvent.mockResolvedValue(undefined);

      await exportUserData(authReq as AuthenticatedRequest, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Dati esportati con successo',
        data: expect.objectContaining({
          userId: 'test-user-id',
          profile: { name: 'Test User' },
          gdprConsent: { necessary: true },
          dogs: [{ id: 'dog1', name: 'Rex' }]
        })
      });
    });
  });

  describe('deleteUserAccount', () => {
    it('should delete user account successfully', async () => {
      const mockBatch = {
        delete: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined)
      };

      mockDb.batch.mockReturnValue(mockBatch);
      mockDb.collection.mockReturnValue({
        doc: jest.fn(),
        add: jest.fn().mockResolvedValue(undefined)
      });

      mockAuth.deleteUser.mockResolvedValue(undefined);
      mockTrackEvent.mockResolvedValue(undefined);

      await deleteUserAccount(authReq as AuthenticatedRequest, res as Response);

      expect(mockBatch.delete).toHaveBeenCalledTimes(2); // user profile + consent
      expect(mockBatch.commit).toHaveBeenCalled();
      expect(mockAuth.deleteUser).toHaveBeenCalledWith('test-user-id');

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'account_delete',
          userId: 'test-user-id'
        })
      );

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Account eliminato con successo'
      });
    });
  });
});