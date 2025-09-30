/**
 * AI Recommendations Routes
 * RESTful API endpoints for intelligent product recommendations
 */

import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import {
  getRecommendations,
  submitFeedback,
  getHomepageRecommendations,
  getCartRecommendations,
  getTrendingRecommendations,
  updateModel,
  getAnalytics
} from './controller';

const router = Router();

// Core recommendation endpoints
router.post('/generate', authMiddleware, getRecommendations);
router.post('/feedback', authMiddleware, submitFeedback);

// Context-specific recommendations
router.get('/homepage', authMiddleware, getHomepageRecommendations);
router.post('/cart', authMiddleware, getCartRecommendations);
router.get('/trending', getTrendingRecommendations);

// Model management (admin only)
router.put('/models/:modelId', authMiddleware, updateModel);

// Analytics and metrics
router.get('/analytics', authMiddleware, getAnalytics);

export default router;