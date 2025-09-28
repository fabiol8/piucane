import express from 'express';
import { authMiddleware } from '../../middleware/auth';
import { createUser, getUserProfile, updateUserProfile } from './controller';

const router = express.Router();

router.post('/register', createUser);
router.get('/profile', authMiddleware, getUserProfile);
router.put('/profile', authMiddleware, updateUserProfile);

export default router;