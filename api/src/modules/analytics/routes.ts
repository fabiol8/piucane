/**
 * Advanced Analytics Routes
 * RESTful API endpoints for comprehensive analytics and insights
 */

import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import {
  executeQuery,
  getBusinessIntelligence,
  getRealTimeAnalytics,
  createDashboard,
  getDashboards,
  getCohortAnalysis,
  getFunnelAnalysis,
  getPredictiveAnalytics
} from './controller';

const router = Router();

// Core analytics endpoints
router.post('/query', authMiddleware, executeQuery);
router.post('/business-intelligence', authMiddleware, getBusinessIntelligence);
router.get('/real-time', authMiddleware, getRealTimeAnalytics);

// Advanced analytics
router.post('/cohort', authMiddleware, getCohortAnalysis);
router.post('/funnel', authMiddleware, getFunnelAnalysis);
router.post('/predictive', authMiddleware, getPredictiveAnalytics);

// Dashboard management
router.post('/dashboards', authMiddleware, createDashboard);
router.get('/dashboards', authMiddleware, getDashboards);

export default router;