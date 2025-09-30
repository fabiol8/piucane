import express from 'express';
import { authMiddleware } from '../../middleware/auth';
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  updateGDPRConsent,
  exportUserData,
  deleteUserAccount,
  createUser // Legacy compatibility
} from './controller';

const router = express.Router();

// Authentication endpoints
router.post('/register', registerUser);
router.post('/login', loginUser);

// User profile endpoints (require authentication)
router.get('/profile', authMiddleware, getUserProfile);
router.put('/profile', authMiddleware, updateUserProfile);

// GDPR compliance endpoints
router.put('/consent', authMiddleware, updateGDPRConsent);
router.post('/export', authMiddleware, exportUserData);
router.delete('/account', authMiddleware, deleteUserAccount);

// Legacy endpoint for backward compatibility
router.post('/users', createUser);

export default router;