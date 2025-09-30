import request from 'supertest';
import app from '../../../index';
import { auth, db } from '../../../config/firebase';

// Integration tests that work with Firebase emulators
describe('Auth Integration Tests', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // Wait for Firebase emulators to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    // Cleanup test data
    if (userId) {
      try {
        await auth.deleteUser(userId);
        await db.collection('users').doc(userId).delete();
        await db.collection('consentManagement').doc(userId).delete();
      } catch (error) {
        console.log('Cleanup error:', error);
      }
    }
  });

  describe('User Registration Flow', () => {
    const registrationData = {
      email: 'integration-test@example.com',
      password: 'password123',
      name: 'Integration Test User',
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

    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Utente registrato con successo',
        userId: expect.any(String),
        user: {
          id: expect.any(String),
          email: registrationData.email,
          name: registrationData.name,
          role: 'user'
        }
      });

      userId = response.body.userId;
    });

    it('should not register user with existing email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Email già registrata'
      });
    });

    it('should validate registration data', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123', // Too short
        name: 'A', // Too short
        gdprConsent: {
          necessary: true
          // Missing required fields
        },
        termsAccepted: false, // Should be true
        privacyAccepted: false // Should be true
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Dati non validi',
        details: expect.any(Array)
      });
    });
  });

  describe('User Authentication Flow', () => {
    beforeAll(async () => {
      // Create a test user first if not already created
      if (!userId) {
        // Sign in to get a token
        const userCredential = await auth.signInWithEmailAndPassword(
          'integration-test@example.com',
          'password123'
        );
        authToken = await userCredential.user.getIdToken();
        userId = userCredential.user.uid;
      } else {
        // Get fresh token
        const userRecord = await auth.getUser(userId);
        authToken = await auth.createCustomToken(userId);
      }
    });

    it('should authenticate user and return profile', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'integration-test@example.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        user: {
          id: userId,
          email: 'integration-test@example.com',
          name: 'Integration Test User'
        },
        token: expect.any(String)
      });
    });

    it('should get user profile', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        user: {
          id: userId,
          email: 'integration-test@example.com',
          name: 'Integration Test User',
          gdprConsent: expect.any(Object)
        }
      });
    });

    it('should update user profile', async () => {
      const updateData = {
        name: 'Updated Integration Test User',
        phone: '+393987654321',
        preferences: {
          emailNotifications: false,
          language: 'en'
        }
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Profilo aggiornato con successo'
      });

      // Verify the update
      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(profileResponse.body.user.name).toBe('Updated Integration Test User');
      expect(profileResponse.body.user.phone).toBe('+393987654321');
    });

    it('should update GDPR consent', async () => {
      const consentData = {
        necessary: true,
        analytics: true,
        marketing: false,
        personalization: true,
        advertising: false
      };

      const response = await request(app)
        .put('/api/auth/consent')
        .set('Authorization', `Bearer ${authToken}`)
        .send(consentData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Preferenze di consenso aggiornate'
      });

      // Verify the consent update
      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(profileResponse.body.user.gdprConsent).toMatchObject({
        analytics: true,
        personalization: true
      });
    });

    it('should export user data', async () => {
      const exportOptions = {
        includeProfile: true,
        includeDogs: false,
        includeOrders: false,
        includeSubscriptions: false,
        format: 'json'
      };

      const response = await request(app)
        .post('/api/auth/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send(exportOptions)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Dati esportati con successo',
        data: {
          exportDate: expect.any(String),
          userId: userId,
          format: 'json',
          profile: expect.any(Object),
          gdprConsent: expect.any(Object)
        }
      });
    });

    it('should require authentication for protected endpoints', async () => {
      // Test without token
      await request(app)
        .get('/api/auth/profile')
        .expect(401);

      await request(app)
        .put('/api/auth/profile')
        .send({ name: 'Test' })
        .expect(401);

      await request(app)
        .put('/api/auth/consent')
        .send({ analytics: true })
        .expect(401);

      await request(app)
        .post('/api/auth/export')
        .send({})
        .expect(401);

      await request(app)
        .delete('/api/auth/account')
        .expect(401);
    });
  });

  describe('Account Deletion Flow', () => {
    it('should delete user account successfully', async () => {
      const response = await request(app)
        .delete('/api/auth/account')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Account eliminato con successo'
      });

      // Verify user is deleted from Firestore
      const userDoc = await db.collection('users').doc(userId).get();
      expect(userDoc.exists).toBe(false);

      // Verify consent data is deleted
      const consentDoc = await db.collection('consentManagement').doc(userId).get();
      expect(consentDoc.exists).toBe(false);

      // Try to authenticate with deleted user
      await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401);

      // Clear userId to prevent cleanup attempts
      userId = '';
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON in request body', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Dati non validi'
      });
    });

    it('should handle invalid Firebase tokens', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });
});