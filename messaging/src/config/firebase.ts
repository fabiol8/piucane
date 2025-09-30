import admin from 'firebase-admin';
import { logger } from '../utils/logger';

let db: admin.firestore.Firestore;

export async function initializeFirebase() {
  try {
    if (!admin.apps.length) {
      // Initialize with service account key or default credentials
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: process.env.FIREBASE_DATABASE_URL
        });
      } else {
        // Use default credentials (for Cloud Run, etc.)
        admin.initializeApp();
      }
    }

    db = admin.firestore();
    logger.info('Firebase initialized successfully');
  } catch (error) {
    logger.error('Error initializing Firebase:', error);
    throw error;
  }
}

export { db };
export const messaging = admin.messaging();
export const auth = admin.auth();