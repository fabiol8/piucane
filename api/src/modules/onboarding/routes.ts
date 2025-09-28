import express from 'express';
import { authMiddleware } from '../../middleware/auth';
import { completeOnboarding, getOnboardingSchema, updateOnboardingSchema } from './controller';

const router = express.Router();

router.post('/complete', authMiddleware, completeOnboarding);
router.get('/schema', getOnboardingSchema);
router.put('/schema', authMiddleware, updateOnboardingSchema);

export default router;